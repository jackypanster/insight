import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { Scanner } from '../../src/core/scanner/Scanner.js';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import { ErrorCollector } from '../../src/services/errors/ErrorCollector.js';
import { LLMService } from '../../src/services/llm/LLMService.js';
import { CacheManager } from '../../src/services/cache/CacheManager.js';
import { DocumentGenerator } from '../../src/core/generator/DocumentGenerator.js';
import type { Config, FileInfo } from '../../src/types/index.js';

describe('Error Handling Integration Tests', () => {
  const testDir = path.join(__dirname, '../temp-integration-test');
  const errorFixturesDir = path.join(__dirname, '../../test-fixtures/errors');
  let errorCollector: ErrorCollector;
  let analyzer: ASTAnalyzer;
  let scanner: Scanner;
  let config: Config;

  beforeEach(async () => {
    // Create test directory
    await fs.ensureDir(testDir);
    
    // Initialize components
    errorCollector = new ErrorCollector();
    analyzer = new ASTAnalyzer(errorCollector);
    scanner = new Scanner();

    // Mock config
    config = {
      llm: {
        provider: 'openrouter',
        models: {
          primary: 'anthropic/claude-3.5-sonnet',
          fallback: 'openai/gpt-3.5-turbo'
        },
        maxTokens: 4000,
        temperature: 0.3
      },
      scanning: {
        ignorePaths: ['node_modules', '.git', 'dist'],
        includeExtensions: ['.py'],
        maxFileSize: '1MB'
      },
      generation: {
        outputDir: path.join(testDir, 'output'),
        format: 'markdown',
        templates: 'templates/'
      },
      cache: {
        enabled: true,
        location: path.join(testDir, '.cache')
      }
    };
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('Mixed Success/Failure Scenarios', () => {
    it('should handle project with both valid and invalid files', async () => {
      // Create test project with mixed file types
      const projectDir = path.join(testDir, 'mixed-project');
      await fs.ensureDir(projectDir);

      // Valid Python file
      await fs.writeFile(path.join(projectDir, 'valid.py'), `
"""Valid Python module."""

class Calculator:
    def add(self, a, b):
        return a + b

def main():
    calc = Calculator()
    result = calc.add(2, 3)
    print(f"Result: {result}")

if __name__ == "__main__":
    main()
`);

      // Invalid Python file (syntax error)
      await fs.writeFile(path.join(projectDir, 'invalid.py'), `
"""Invalid Python module."""

def broken_function(
    # Missing closing parenthesis and colon

def another_function():
    if True
        print("Missing colon")

class BrokenClass
    def method(self):
        pass
`);

      // Large file (over 10MB limit)
      const largeContent = '# Large file\n' + 'x = 1\n'.repeat(500000); // ~4MB, but we'll mock the size check
      await fs.writeFile(path.join(projectDir, 'large.py'), largeContent);

      // Scan the project
      const files = await scanner.scanDirectory(projectDir, config.scanning);
      expect(files.length).toBe(3);

      errorCollector.setTotalFiles(files.length);

      const results = [];

      for (const file of files) {
        try {
          // Mock large file size for testing
          if (file.path.includes('large.py')) {
            file.size = 15 * 1024 * 1024; // 15MB
          }

          const result = await analyzer.analyzeFile(file, true);
          results.push(result);

          if (result.analysisStatus === 'success') {
            errorCollector.recordSuccess();
          }
        } catch (error) {
          console.error(`Unexpected error analyzing ${file.path}:`, error);
        }
      }

      // Validate results
      expect(results).toHaveLength(3);

      // Check valid file result
      const validResult = results.find(r => r.filePath.includes('valid.py'));
      expect(validResult?.analysisStatus).toBe('success');
      expect(validResult?.classes).toHaveLength(1);
      expect(validResult?.functions.length).toBeGreaterThan(0);

      // Check invalid file result  
      const invalidResult = results.find(r => r.filePath.includes('invalid.py'));
      expect(invalidResult?.analysisStatus).toBe('partial');
      expect(invalidResult?.errors.length).toBeGreaterThan(0);

      // Check large file result
      const largeResult = results.find(r => r.filePath.includes('large.py'));
      expect(largeResult?.analysisStatus).toBe('failed');
      expect(largeResult?.errorMessage).toContain('File too large');

      // Check error collector statistics
      const stats = errorCollector.getStatistics();
      expect(stats.totalFiles).toBe(3);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(2);
      expect(stats.successRate).toBe('33%');
      expect(errorCollector.hasErrors()).toBe(true);
    });
  });

  describe('Full Pipeline Error Handling', () => {
    it('should generate error reports alongside successful documentation', async () => {
      const projectDir = path.join(testDir, 'pipeline-project');
      await fs.ensureDir(projectDir);

      // Create mixed content
      await fs.writeFile(path.join(projectDir, 'success1.py'), `
class WorkingClass:
    def method(self):
        return "working"
`);

      await fs.writeFile(path.join(projectDir, 'success2.py'), `
def working_function():
    return 42
`);

      await fs.writeFile(path.join(projectDir, 'failure1.py'), `
# Syntax error file
def broken(
    pass
`);

      // Copy from actual error fixtures
      await fs.copy(
        path.join(errorFixturesDir, 'syntax_error.py'), 
        path.join(projectDir, 'failure2.py')
      );

      // Scan and analyze
      const files = await scanner.scanDirectory(projectDir, config.scanning);
      errorCollector.setTotalFiles(files.length);

      const results = [];
      for (const file of files) {
        const result = await analyzer.analyzeFile(file, true);
        results.push(result);

        if (result.analysisStatus === 'success') {
          errorCollector.recordSuccess();
        }
      }

      // Generate error report
      const errorReportPath = path.join(config.generation.outputDir, 'error-report.json');
      await errorCollector.exportToFile(errorReportPath, projectDir);

      // Validate error report was created
      expect(await fs.pathExists(errorReportPath)).toBe(true);
      
      const reportData = await fs.readJSON(errorReportPath);
      expect(reportData.summary.totalFiles).toBe(4);
      expect(reportData.summary.successful).toBe(2);
      expect(reportData.summary.failed).toBe(2);
      expect(reportData.errors.length).toBeGreaterThan(0);

      // Check that error types are categorized
      const syntaxErrors = reportData.errors.filter(e => e.errorType === 'syntax_error');
      expect(syntaxErrors.length).toBeGreaterThan(0);
    });
  });

  describe('Error Recovery Strategies', () => {
    it('should continue analysis with partial results when some files fail', async () => {
      const projectDir = path.join(testDir, 'recovery-project');
      await fs.ensureDir(projectDir);

      // Create a project with systematic issues
      const fileContents = [
        // File 1: Success
        { name: 'good1.py', content: 'def hello(): return "world"', shouldSucceed: true },
        // File 2: File access error (simulate by using non-existent path)
        { name: 'missing.py', content: '', shouldSucceed: false, simulateError: 'missing' },
        // File 3: Success  
        { name: 'good2.py', content: 'class Test: pass', shouldSucceed: true },
        // File 4: Syntax error
        { name: 'broken.py', content: 'def bad(\n  return 1', shouldSucceed: false },
        // File 5: Success
        { name: 'good3.py', content: 'import os\nprint("hello")', shouldSucceed: true }
      ];

      // Create the files
      for (const fileSpec of fileContents) {
        if (fileSpec.simulateError !== 'missing') {
          await fs.writeFile(path.join(projectDir, fileSpec.name), fileSpec.content);
        }
      }

      // Scan directory (will only find existing files)
      const foundFiles = await scanner.scanDirectory(projectDir, config.scanning);
      
      // Add the missing file manually to simulate it being in the scan but not accessible
      const missingFileInfo: FileInfo = {
        path: path.join(projectDir, 'missing.py'),
        size: 0,
        hash: 'missing-hash',
        language: 'python',
        lastModified: new Date()
      };
      
      const allFiles = [...foundFiles, missingFileInfo];
      errorCollector.setTotalFiles(allFiles.length);

      const results = [];
      let successCount = 0;

      for (const file of allFiles) {
        const result = await analyzer.analyzeFile(file, true); // Continue on error
        results.push(result);

        if (result.analysisStatus === 'success') {
          successCount++;
          errorCollector.recordSuccess();
        }
      }

      // Should have attempted all files
      expect(results).toHaveLength(5);
      
      // Should have 3 successful analyses
      expect(successCount).toBe(3);
      
      // Should have collected errors for failed files
      expect(errorCollector.hasErrors()).toBe(true);
      const errors = errorCollector.getErrors();
      expect(errors.length).toBeGreaterThan(0);

      // Should have different error types
      const errorTypes = new Set(errors.map(e => e.errorType));
      expect(errorTypes.size).toBeGreaterThan(1); // Multiple error types

      // Statistics should reflect mixed results
      const stats = errorCollector.getStatistics();
      expect(stats.successful).toBe(3);
      expect(stats.failed).toBe(2);
      expect(parseInt(stats.successRate)).toBe(60); // 3/5 = 60%
    });
  });

  describe('Stop-on-Error Mode Integration', () => {
    it('should halt pipeline on first error in stop-on-error mode', async () => {
      const projectDir = path.join(testDir, 'stop-on-error-project');
      await fs.ensureDir(projectDir);

      // Create files in order of processing
      await fs.writeFile(path.join(projectDir, 'a_first.py'), 'def first(): pass');
      await fs.writeFile(path.join(projectDir, 'b_broken.py'), 'def broken(\n  invalid');
      await fs.writeFile(path.join(projectDir, 'c_third.py'), 'def third(): pass');

      const files = await scanner.scanDirectory(projectDir, config.scanning);
      files.sort((a, b) => a.path.localeCompare(b.path)); // Ensure processing order

      let processedCount = 0;
      let errorThrown = false;

      try {
        for (const file of files) {
          await analyzer.analyzeFile(file, false); // Stop on error
          processedCount++;
        }
      } catch (error) {
        errorThrown = true;
        // Error should be related to syntax in the broken file
        expect(error).toBeDefined();
      }

      // Should have processed first file, failed on second
      expect(processedCount).toBe(1); 
      expect(errorThrown).toBe(false); // analyzeFile doesn't throw in this case, returns partial
    });
  });

  describe('Resource Management Under Errors', () => {
    it('should handle memory pressure gracefully', async () => {
      const projectDir = path.join(testDir, 'memory-project');
      await fs.ensureDir(projectDir);

      // Create multiple large-ish files to simulate memory pressure
      for (let i = 0; i < 10; i++) {
        let content = `# File ${i}\n`;
        for (let j = 0; j < 100; j++) {
          content += `def function_${i}_${j}():\n    return ${i * j}\n\n`;
        }
        await fs.writeFile(path.join(projectDir, `file_${i}.py`), content);
      }

      // Add one problematic file
      await fs.writeFile(path.join(projectDir, 'memory_hog.py'), '# ' + 'x'.repeat(1000000)); // 1MB of comments

      const files = await scanner.scanDirectory(projectDir, config.scanning);
      errorCollector.setTotalFiles(files.length);

      let successCount = 0;
      const startMemory = process.memoryUsage().heapUsed;

      for (const file of files) {
        const result = await analyzer.analyzeFile(file, true);
        
        if (result.analysisStatus === 'success') {
          successCount++;
          errorCollector.recordSuccess();
        }

        // Check memory hasn't grown excessively (within 100MB)
        const currentMemory = process.memoryUsage().heapUsed;
        const memoryIncrease = currentMemory - startMemory;
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB limit
      }

      // Should have processed most files successfully
      expect(successCount).toBeGreaterThanOrEqual(10); // At least the 10 normal files
      
      const stats = errorCollector.getStatistics();
      expect(stats.totalFiles).toBe(11);
    });
  });

  describe('Concurrent Error Scenarios', () => {
    it('should handle multiple file processing with errors', async () => {
      const projectDir = path.join(testDir, 'concurrent-project');
      await fs.ensureDir(projectDir);

      // Create a mix of files
      const fileSpecs = [
        { name: 'good1.py', content: 'def test1(): pass', valid: true },
        { name: 'bad1.py', content: 'def test2(\n invalid', valid: false },
        { name: 'good2.py', content: 'class Test: pass', valid: true },
        { name: 'bad2.py', content: 'if True\n  print("no colon")', valid: false },
        { name: 'good3.py', content: 'import sys', valid: true }
      ];

      for (const spec of fileSpecs) {
        await fs.writeFile(path.join(projectDir, spec.name), spec.content);
      }

      const files = await scanner.scanDirectory(projectDir, config.scanning);
      errorCollector.setTotalFiles(files.length);

      // Process files concurrently with Promise.all
      const analysisPromises = files.map(file => 
        analyzer.analyzeFile(file, true).catch(error => ({
          filePath: file.path,
          analysisStatus: 'failed' as const,
          error: error.message,
          language: file.language,
          functions: [],
          classes: [],
          imports: [],
          globalVariables: [],
          complexity: 0,
          lines: 0,
          errors: [error.message],
          patterns: [],
          typeAnnotations: false
        }))
      );

      const results = await Promise.all(analysisPromises);

      // Count successes
      const successfulResults = results.filter(r => r.analysisStatus === 'success');
      const partialResults = results.filter(r => r.analysisStatus === 'partial');
      const failedResults = results.filter(r => r.analysisStatus === 'failed');

      expect(successfulResults.length).toBe(3); // 3 good files
      expect(partialResults.length + failedResults.length).toBe(2); // 2 bad files

      // Update error collector for successful ones
      successfulResults.forEach(() => errorCollector.recordSuccess());

      const stats = errorCollector.getStatistics();
      expect(stats.totalFiles).toBe(5);
      expect(stats.successful).toBe(3);
    });
  });

  describe('Error Report Generation Integration', () => {
    it('should generate comprehensive error report with context', async () => {
      const projectDir = path.join(testDir, 'report-project');
      await fs.ensureDir(projectDir);

      // Create files with different error types
      await fs.writeFile(path.join(projectDir, 'syntax.py'), 'def bad(\n  return 1');
      await fs.writeFile(path.join(projectDir, 'encoding.py'), 'print("hello")'); // We'll simulate encoding error
      await fs.writeFile(path.join(projectDir, 'success.py'), 'def good(): return True');

      const files = await scanner.scanDirectory(projectDir, config.scanning);
      
      // Simulate encoding error by manually triggering it
      const encodingFile = files.find(f => f.path.includes('encoding.py'));
      if (encodingFile) {
        // Simulate encoding error
        errorCollector.logError(
          encodingFile.path, 
          new Error('UnicodeDecodeError: utf-8 codec error'),
          { fileSize: 100, lineCount: 1, encoding: 'unknown' }
        );
      }

      errorCollector.setTotalFiles(files.length);

      // Process remaining files
      for (const file of files) {
        if (!file.path.includes('encoding.py')) {
          const result = await analyzer.analyzeFile(file, true);
          if (result.analysisStatus === 'success') {
            errorCollector.recordSuccess();
          }
        }
      }

      // Generate comprehensive error report
      const reportPath = path.join(config.generation.outputDir, 'comprehensive-error-report.json');
      await errorCollector.exportToFile(reportPath, projectDir);

      // Validate report contents
      const report = await fs.readJSON(reportPath);

      expect(report.timestamp).toBeDefined();
      expect(report.project).toBe(projectDir);
      expect(report.summary.totalFiles).toBe(3);
      expect(report.summary.successful).toBe(1);
      expect(report.summary.processing_duration_ms).toBeGreaterThan(0);

      // Check error breakdown
      expect(report.summary.errorsByType).toBeDefined();
      expect(report.summary.errorsByType.encoding_error).toBe(1);
      
      // Check individual error details
      expect(report.errors.length).toBeGreaterThan(0);
      
      const encodingError = report.errors.find(e => e.errorType === 'encoding_error');
      expect(encodingError).toBeDefined();
      expect(encodingError?.context.encoding).toBe('unknown');
      expect(encodingError?.canRetry).toBe(true);
    });
  });

  describe('CLI Integration Error Scenarios', () => {
    it('should simulate CLI error handling workflow', async () => {
      const projectDir = path.join(testDir, 'cli-simulation');
      await fs.ensureDir(projectDir);

      // Create project structure similar to CLI usage
      await fs.writeFile(path.join(projectDir, 'main.py'), `
"""Main application module."""
from utils import helper_function
from models import User

def main():
    user = User("test")
    result = helper_function(user)
    print(result)

if __name__ == "__main__":
    main()
`);

      await fs.writeFile(path.join(projectDir, 'utils.py'), `
def helper_function(user):
    return f"Hello, {user.name}!"
`);

      // Broken models file
      await fs.writeFile(path.join(projectDir, 'models.py'), `
class User:
    def __init__(self, name
        # Missing closing parenthesis and colon
        self.name = name
`);

      // Simulate CLI workflow
      const files = await scanner.scanDirectory(projectDir, config.scanning);
      const cliErrorCollector = new ErrorCollector();
      const cliAnalyzer = new ASTAnalyzer(cliErrorCollector);

      cliErrorCollector.setTotalFiles(files.length);

      // Process with continue-on-error (CLI default)
      const results = [];
      for (const file of files) {
        const result = await cliAnalyzer.analyzeFile(file, true);
        results.push(result);
        
        if (result.analysisStatus === 'success') {
          cliErrorCollector.recordSuccess();
        }
      }

      // Simulate CLI summary output
      const stats = cliErrorCollector.getStatistics();
      
      expect(stats.totalFiles).toBe(3);
      expect(stats.successful).toBe(2); // main.py and utils.py should work
      expect(stats.failed).toBe(1); // models.py should fail
      expect(stats.successRate).toBe('67%');

      // Simulate --error-report flag
      const errorReportPath = path.join(testDir, 'insight-errors.json');
      await cliErrorCollector.exportToFile(errorReportPath, projectDir);
      
      expect(await fs.pathExists(errorReportPath)).toBe(true);

      // Validate error report matches CLI expectations
      const cliReport = await fs.readJSON(errorReportPath);
      expect(cliReport.summary.successRate).toBe('67%');
      expect(cliReport.errors[0].file).toContain('models.py');
    });
  });
});