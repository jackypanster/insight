import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { FileScanner } from '../../src/core/scanner/FileScanner.js';
import { FileFilter } from '../../src/core/scanner/FileFilter.js';
describe('FileScanner', () => {
    const testDir = path.join(__dirname, '../../test-fixtures/scanner');
    const config = {
        version: '0.1.0',
        llm: {
            provider: 'openrouter',
            models: { primary: 'claude-3.5-sonnet', fallback: 'gpt-3.5-turbo' },
            maxTokens: 4000,
            temperature: 0.3,
        },
        scanning: {
            ignorePaths: ['__pycache__', '*.pyc', 'venv', '.git'],
            includeExtensions: ['.py'],
            maxFileSize: '1MB',
        },
        analysis: { chunkSize: 1500, overlapSize: 200, preserveBoundaries: true },
        generation: { outputDir: 'test-output', format: 'markdown', templates: 'templates/' },
        cache: { enabled: true, location: '.test-cache', ttl: 86400 },
    };
    beforeAll(async () => {
        // Create test directory structure
        await fs.ensureDir(testDir);
        await fs.ensureDir(path.join(testDir, 'src'));
        await fs.ensureDir(path.join(testDir, '__pycache__'));
        await fs.ensureDir(path.join(testDir, 'venv/lib'));
        // Create test files
        await fs.writeFile(path.join(testDir, 'main.py'), 'def main():\n    print("Hello, World!")\n');
        await fs.writeFile(path.join(testDir, 'src/utils.py'), 'def helper():\n    return "helper"\n');
        await fs.writeFile(path.join(testDir, 'src/app.js'), 'console.log("JavaScript file - should be ignored");');
        await fs.writeFile(path.join(testDir, '__pycache__/main.cpython-39.pyc'), 'compiled python file');
        await fs.writeFile(path.join(testDir, 'venv/lib/something.py'), 'virtual env file');
        // Create .gitignore
        await fs.writeFile(path.join(testDir, '.gitignore'), '*.log\n__pycache__/\nvenv/\n');
    });
    afterAll(async () => {
        // Clean up test directory
        await fs.remove(testDir);
    });
    describe('FileScanner.scan()', () => {
        it('should find Python files', async () => {
            const scanner = new FileScanner(config);
            const result = await scanner.scan(testDir);
            expect(result.files).toHaveLength(2);
            const filePaths = result.files.map(f => path.basename(f.path));
            expect(filePaths).toContain('main.py');
            expect(filePaths).toContain('utils.py');
            expect(result.totalFiles).toBe(2);
            expect(result.totalSize).toBeGreaterThan(0);
        });
        it('should exclude files in __pycache__', async () => {
            const scanner = new FileScanner(config);
            const result = await scanner.scan(testDir);
            const pycacheFiles = result.files.filter(f => f.path.includes('__pycache__'));
            expect(pycacheFiles).toHaveLength(0);
        });
        it('should exclude files in venv directory', async () => {
            const scanner = new FileScanner(config);
            const result = await scanner.scan(testDir);
            const venvFiles = result.files.filter(f => f.path.includes('venv'));
            expect(venvFiles).toHaveLength(0);
        });
        it('should exclude non-Python files', async () => {
            const scanner = new FileScanner(config);
            const result = await scanner.scan(testDir);
            const jsFiles = result.files.filter(f => f.path.endsWith('.js'));
            expect(jsFiles).toHaveLength(0);
        });
        it('should generate correct file info', async () => {
            const scanner = new FileScanner(config);
            const result = await scanner.scan(testDir);
            const mainFile = result.files.find(f => path.basename(f.path) === 'main.py');
            expect(mainFile).toBeDefined();
            expect(mainFile.language).toBe('python');
            expect(mainFile.size).toBeGreaterThan(0);
            expect(mainFile.hash).toHaveLength(16);
            expect(mainFile.lastModified).toBeInstanceOf(Date);
        });
        it('should calculate statistics correctly', async () => {
            const scanner = new FileScanner(config);
            const result = await scanner.scan(testDir);
            const stats = scanner.getStats(result);
            expect(stats.totalFiles).toBe(2);
            expect(stats.languages.python).toBe(2);
            expect(stats.extensions['.py']).toBe(2);
            expect(stats.excludedCount).toBeGreaterThan(0);
        });
    });
});
describe('FileFilter', () => {
    const testDir = path.join(__dirname, '../../test-fixtures/filter');
    const config = {
        ignorePaths: ['test*', '*.temp'],
        includeExtensions: ['.py', '.js'],
        maxFileSize: '100B', // Very small for testing
    };
    beforeAll(async () => {
        await fs.ensureDir(testDir);
        // Create test files
        await fs.writeFile(path.join(testDir, 'valid.py'), 'print("valid")');
        await fs.writeFile(path.join(testDir, 'large.py'), 'x'.repeat(200)); // Too large
        await fs.writeFile(path.join(testDir, 'test.py'), 'print("test")'); // Should be ignored
        await fs.writeFile(path.join(testDir, 'file.temp'), 'temp'); // Should be ignored
        await fs.writeFile(path.join(testDir, 'valid.js'), 'console.log("valid")');
        await fs.writeFile(path.join(testDir, 'invalid.txt'), 'text'); // Wrong extension
    });
    afterAll(async () => {
        await fs.remove(testDir);
    });
    describe('FileFilter.shouldProcess()', () => {
        it('should accept valid Python files', async () => {
            const filter = new FileFilter(config);
            const result = await filter.shouldProcess(path.join(testDir, 'valid.py'), testDir);
            expect(result).toBe(true);
        });
        it('should reject files that are too large', async () => {
            const filter = new FileFilter(config);
            const result = await filter.shouldProcess(path.join(testDir, 'large.py'), testDir);
            expect(result).toBe(false);
        });
        it('should reject files matching ignore patterns', async () => {
            const filter = new FileFilter(config);
            const result = await filter.shouldProcess(path.join(testDir, 'test.py'), testDir);
            expect(result).toBe(false);
        });
        it('should reject files with wrong extension', async () => {
            const filter = new FileFilter(config);
            const result = await filter.shouldProcess(path.join(testDir, 'invalid.txt'), testDir);
            expect(result).toBe(false);
        });
        it('should accept valid JS files', async () => {
            const filter = new FileFilter(config);
            const result = await filter.shouldProcess(path.join(testDir, 'valid.js'), testDir);
            expect(result).toBe(true);
        });
    });
    describe('FileFilter.testPattern()', () => {
        it('should match simple patterns', () => {
            const filter = new FileFilter(config);
            expect(filter.testPattern('test.py', 'test*')).toBe(true);
            expect(filter.testPattern('main.py', 'test*')).toBe(false);
        });
        it('should match extension patterns', () => {
            const filter = new FileFilter(config);
            expect(filter.testPattern('file.temp', '*.temp')).toBe(true);
            expect(filter.testPattern('file.py', '*.temp')).toBe(false);
        });
    });
});
//# sourceMappingURL=scanner.test.js.map