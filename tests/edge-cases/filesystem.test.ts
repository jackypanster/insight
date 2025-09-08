import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import { ErrorCollector } from '../../src/services/errors/ErrorCollector.js';
import type { FileInfo } from '../../src/types/index.js';

describe('Filesystem Edge Cases', () => {
  const testDir = path.join(__dirname, '../temp-filesystem-test');
  let analyzer: ASTAnalyzer;
  let errorCollector: ErrorCollector;

  beforeEach(async () => {
    await fs.ensureDir(testDir);
    errorCollector = new ErrorCollector();
    analyzer = new ASTAnalyzer(errorCollector);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('File Access Issues', () => {
    it('should handle completely missing files gracefully', async () => {
      const nonExistentFile = path.join(testDir, 'does-not-exist.py');

      const fileInfo: FileInfo = {
        path: nonExistentFile,
        size: 0,
        hash: 'missing-file-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toContain('ENOENT');
      expect(result.filePath).toBe(nonExistentFile);
      expect(result.language).toBe('python');
      
      // Should log error with proper context
      const errors = errorCollector.getErrors();
      expect(errors.length).toBeGreaterThan(0);
      const fileError = errors.find(e => e.errorType === 'file_access_error');
      expect(fileError).toBeDefined();
      expect(fileError?.canRetry).toBe(true);
    });

    it('should handle directory instead of file', async () => {
      const dirPath = path.join(testDir, 'directory-not-file');
      await fs.ensureDir(dirPath);

      const fileInfo: FileInfo = {
        path: dirPath,
        size: 0,
        hash: 'directory-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toBeDefined();
      
      const errors = errorCollector.getErrors();
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should handle empty files', async () => {
      const emptyFile = path.join(testDir, 'empty.py');
      await fs.writeFile(emptyFile, '');

      const fileInfo: FileInfo = {
        path: emptyFile,
        size: 0,
        hash: 'empty-file-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions).toHaveLength(0);
      expect(result.classes).toHaveLength(0);
      expect(result.imports).toHaveLength(0);
      expect(result.lines).toBe(1); // Empty file still counts as 1 line
    });

    it('should handle files with only whitespace', async () => {
      const whitespaceFile = path.join(testDir, 'whitespace.py');
      const content = '\n\n   \n\t\t\n    \n\n';
      await fs.writeFile(whitespaceFile, content);

      const fileInfo: FileInfo = {
        path: whitespaceFile,
        size: content.length,
        hash: 'whitespace-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions).toHaveLength(0);
      expect(result.classes).toHaveLength(0);
      expect(result.lines).toBe(content.split('\n').length);
    });
  });

  describe('File Path Edge Cases', () => {
    it('should handle very long file paths', async () => {
      // Create nested directories for long path
      let longPath = testDir;
      const segments = ['very', 'long', 'nested', 'directory', 'structure', 'for', 'testing', 'purposes'];
      
      for (const segment of segments) {
        longPath = path.join(longPath, segment);
        await fs.ensureDir(longPath);
      }
      
      const longFilePath = path.join(longPath, 'file-with-very-long-path.py');
      const content = `# File with very long path
def test_function():
    return "works with long paths"
`;
      
      await fs.writeFile(longFilePath, content);

      const fileInfo: FileInfo = {
        path: longFilePath,
        size: content.length,
        hash: 'long-path-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('test_function');
    });

    it('should handle files with special characters in path', async () => {
      const specialCharsDir = path.join(testDir, 'special chars & symbols!');
      await fs.ensureDir(specialCharsDir);
      
      const specialFilePath = path.join(specialCharsDir, 'file with spaces & symbols!.py');
      const content = `# File with special characters in path
class SpecialPathClass:
    def method(self):
        return "special characters work"
`;
      
      await fs.writeFile(specialFilePath, content);

      const fileInfo: FileInfo = {
        path: specialFilePath,
        size: content.length,
        hash: 'special-chars-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.classes).toHaveLength(1);
      expect(result.classes[0].name).toBe('SpecialPathClass');
    });

    it('should handle Unicode characters in file paths', async () => {
      const unicodeDir = path.join(testDir, 'тест测试テスト');
      await fs.ensureDir(unicodeDir);
      
      const unicodeFilePath = path.join(unicodeDir, '文件名_ファイル_файл.py');
      const content = `# File with Unicode path
def unicode_path_function():
    return "Unicode paths work"
`;
      
      await fs.writeFile(unicodeFilePath, content);

      const fileInfo: FileInfo = {
        path: unicodeFilePath,
        size: content.length,
        hash: 'unicode-path-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions).toHaveLength(1);
      expect(result.functions[0].name).toBe('unicode_path_function');
    });

    it('should handle relative paths correctly', async () => {
      const nestedDir = path.join(testDir, 'nested');
      await fs.ensureDir(nestedDir);
      
      const filePath = path.join(nestedDir, 'nested_file.py');
      const content = `def nested_function():
    return "in nested directory"
`;
      
      await fs.writeFile(filePath, content);

      // Test with relative path
      const relativePath = path.relative(process.cwd(), filePath);
      const fileInfo: FileInfo = {
        path: relativePath,
        size: content.length,
        hash: 'relative-path-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions).toHaveLength(1);
      expect(result.filePath).toBe(relativePath);
    });
  });

  describe('File Permission Issues', () => {
    it('should handle files that become unavailable during processing', async () => {
      const tempFile = path.join(testDir, 'disappearing.py');
      const content = `def test_function():
    return "temporary file"
`;
      
      await fs.writeFile(tempFile, content);

      // Mock fs.readFile to simulate file disappearing
      const originalReadFile = fs.readFile;
      const readFileSpy = vi.spyOn(fs, 'readFile');
      
      readFileSpy.mockImplementationOnce(async () => {
        throw new Error('ENOENT: no such file or directory');
      });

      const fileInfo: FileInfo = {
        path: tempFile,
        size: content.length,
        hash: 'disappearing-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toContain('ENOENT');
      
      readFileSpy.mockRestore();
    });

    // Note: Actual permission tests are platform-specific and may not work in all environments
    it('should handle simulated permission denied errors', async () => {
      const restrictedFile = path.join(testDir, 'restricted.py');
      const content = `def restricted_function():
    return "restricted"
`;
      
      await fs.writeFile(restrictedFile, content);

      // Mock fs.readFile to simulate permission error
      const readFileSpy = vi.spyOn(fs, 'readFile');
      
      readFileSpy.mockImplementationOnce(async () => {
        const error = new Error('EACCES: permission denied') as NodeJS.ErrnoException;
        error.code = 'EACCES';
        error.errno = -13;
        throw error;
      });

      const fileInfo: FileInfo = {
        path: restrictedFile,
        size: content.length,
        hash: 'restricted-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toContain('EACCES');
      
      const errors = errorCollector.getErrors();
      const accessError = errors.find(e => e.errorType === 'file_access_error');
      expect(accessError).toBeDefined();
      expect(accessError?.canRetry).toBe(true);
      
      readFileSpy.mockRestore();
    });
  });

  describe('File Locking Issues', () => {
    it('should handle files that are being written to', async () => {
      const lockedFile = path.join(testDir, 'locked.py');
      
      // Mock fs.readFile to simulate file being locked
      const readFileSpy = vi.spyOn(fs, 'readFile');
      
      readFileSpy.mockImplementationOnce(async () => {
        const error = new Error('EBUSY: resource busy or locked') as NodeJS.ErrnoException;
        error.code = 'EBUSY';
        error.errno = -16;
        throw error;
      });

      const fileInfo: FileInfo = {
        path: lockedFile,
        size: 1000,
        hash: 'locked-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toContain('EBUSY');
      
      readFileSpy.mockRestore();
    });
  });

  describe('Network File Systems', () => {
    it('should handle network timeout errors', async () => {
      const networkFile = path.join(testDir, 'network.py');
      
      // Mock fs.readFile to simulate network timeout
      const readFileSpy = vi.spyOn(fs, 'readFile');
      
      readFileSpy.mockImplementationOnce(async () => {
        const error = new Error('ETIMEDOUT: operation timed out') as NodeJS.ErrnoException;
        error.code = 'ETIMEDOUT';
        error.errno = -110;
        throw error;
      });

      const fileInfo: FileInfo = {
        path: networkFile,
        size: 500,
        hash: 'network-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toContain('ETIMEDOUT');
      
      const errors = errorCollector.getErrors();
      const timeoutError = errors.find(e => e.errorType === 'timeout_error');
      expect(timeoutError).toBeDefined();
      expect(timeoutError?.canRetry).toBe(true);
      
      readFileSpy.mockRestore();
    });

    it('should handle network disconnection errors', async () => {
      const disconnectedFile = path.join(testDir, 'disconnected.py');
      
      // Mock fs.readFile to simulate network disconnection
      const readFileSpy = vi.spyOn(fs, 'readFile');
      
      readFileSpy.mockImplementationOnce(async () => {
        const error = new Error('ENETUNREACH: network is unreachable') as NodeJS.ErrnoException;
        error.code = 'ENETUNREACH';
        error.errno = -101;
        throw error;
      });

      const fileInfo: FileInfo = {
        path: disconnectedFile,
        size: 750,
        hash: 'disconnected-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toContain('ENETUNREACH');
      
      readFileSpy.mockRestore();
    });
  });

  describe('Filesystem Corruption', () => {
    it('should handle corrupted file data gracefully', async () => {
      const corruptedFile = path.join(testDir, 'corrupted.py');
      
      // Create file with mixed binary and text data
      const corruptedData = Buffer.concat([
        Buffer.from('# Start of Python file\n'),
        Buffer.from([0x00, 0xFF, 0x00, 0xFF]), // Binary garbage
        Buffer.from('def function():\n'),
        Buffer.from([0xDE, 0xAD, 0xBE, 0xEF]), // More binary garbage
        Buffer.from('    return "corrupted"\n')
      ]);
      
      await fs.writeFile(corruptedFile, corruptedData);

      const fileInfo: FileInfo = {
        path: corruptedFile,
        size: corruptedData.length,
        hash: 'corrupted-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should handle corrupted data gracefully
      expect(['success', 'partial', 'failed']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'failed') {
        const errors = errorCollector.getErrors();
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it('should handle files with inconsistent line endings', async () => {
      const mixedLineEndingsFile = path.join(testDir, 'mixed_line_endings.py');
      
      // Create file with mixed line endings (Unix \n, Windows \r\n, Mac \r)
      const content = [
        '# Mixed line endings file',
        'def unix_ending():',
        '    return "unix"',
        '',
        'def windows_ending():',
        '    return "windows"',
        '',
        'def mac_ending():',
        '    return "mac"'
      ];
      
      const mixedContent = content[0] + '\n' +  // Unix
                          content[1] + '\r\n' + // Windows  
                          content[2] + '\n' +   // Unix
                          content[3] + '\r' +   // Mac
                          content[4] + '\r\n' + // Windows
                          content[5] + '\n' +   // Unix
                          content[6] + '\r' +   // Mac
                          content[7] + '\r\n' + // Windows
                          content[8] + '\n';    // Unix
      
      await fs.writeFile(mixedLineEndingsFile, mixedContent);

      const fileInfo: FileInfo = {
        path: mixedLineEndingsFile,
        size: mixedContent.length,
        hash: 'mixed-endings-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('success');
      expect(result.functions.length).toBe(3);
      
      const functions = result.functions.map(f => f.name).sort();
      expect(functions).toEqual(['mac_ending', 'unix_ending', 'windows_ending']);
    });
  });

  describe('Concurrent File Access', () => {
    it('should handle files being modified during analysis', async () => {
      const concurrentFile = path.join(testDir, 'concurrent.py');
      const originalContent = `def original_function():
    return "original"
`;
      
      await fs.writeFile(concurrentFile, originalContent);

      // Mock fs.stat to return different size than actual content
      const statSpy = vi.spyOn(fs, 'stat');
      const readFileSpy = vi.spyOn(fs, 'readFile');
      
      statSpy.mockImplementationOnce(async (filePath) => {
        const realStat = await fs.stat(filePath);
        // Return stat with different size to simulate file being modified
        return {
          ...realStat,
          size: realStat.size + 100 // Pretend file is larger
        };
      });

      const fileInfo: FileInfo = {
        path: concurrentFile,
        size: originalContent.length,
        hash: 'concurrent-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should still work despite size mismatch
      expect(['success', 'partial']).toContain(result.analysisStatus);
      
      statSpy.mockRestore();
      readFileSpy.mockRestore();
    });
  });

  describe('Symlinks and Aliases', () => {
    it('should handle symbolic links to files', async () => {
      const originalFile = path.join(testDir, 'original.py');
      const symlinkFile = path.join(testDir, 'symlink.py');
      
      const content = `def symlinked_function():
    return "accessed via symlink"
`;
      
      await fs.writeFile(originalFile, content);
      
      try {
        await fs.symlink(originalFile, symlinkFile);
        
        const fileInfo: FileInfo = {
          path: symlinkFile,
          size: content.length,
          hash: 'symlink-test',
          language: 'python',
          lastModified: new Date(),
        };

        const result = await analyzer.analyzeFile(fileInfo, true);

        expect(result.analysisStatus).toBe('success');
        expect(result.functions).toHaveLength(1);
        expect(result.functions[0].name).toBe('symlinked_function');
      } catch (error) {
        // Skip test if symlinks aren't supported on this platform
        if (error.code === 'EPERM' || error.code === 'ENOENT') {
          console.log('Skipping symlink test - not supported on this platform');
          return;
        }
        throw error;
      }
    });
  });
});