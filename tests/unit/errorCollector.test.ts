import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ErrorCollector, type ErrorContext, type ErrorCategory } from '../../src/services/errors/ErrorCollector.js';

describe('ErrorCollector', () => {
  let errorCollector: ErrorCollector;
  const testOutputDir = path.join(__dirname, '../temp-test-output');

  beforeEach(() => {
    errorCollector = new ErrorCollector();
  });

  afterEach(async () => {
    // Clean up test files
    await fs.remove(testOutputDir);
  });

  describe('Error Logging', () => {
    it('should log syntax errors correctly', () => {
      const syntaxError = new Error('SyntaxError: invalid syntax');
      const context: ErrorContext = {
        fileSize: 1024,
        lineCount: 50,
        encoding: 'utf-8'
      };

      errorCollector.logError('/test/file.py', syntaxError, context);

      const errors = errorCollector.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].errorType).toBe('syntax_error');
      expect(errors[0].message).toBe('SyntaxError: invalid syntax');
      expect(errors[0].canRetry).toBe(false);
      expect(errors[0].file).toBe('test/file.py');
      expect(errors[0].context).toEqual(context);
    });

    it('should log encoding errors correctly', () => {
      const encodingError = new Error('UnicodeDecodeError: utf-8 codec error');
      
      errorCollector.logError('/project/bad_encoding.py', encodingError);

      const errors = errorCollector.getErrors();
      expect(errors[0].errorType).toBe('encoding_error');
      expect(errors[0].canRetry).toBe(true);
    });

    it('should log timeout errors correctly', () => {
      const timeoutError = new Error('Parsing timeout (30s)');
      
      errorCollector.logError('/project/huge_file.py', timeoutError);

      const errors = errorCollector.getErrors();
      expect(errors[0].errorType).toBe('timeout_error');
      expect(errors[0].canRetry).toBe(true);
    });

    it('should log memory errors correctly', () => {
      const memoryError = new Error('JavaScript heap out of memory');
      
      errorCollector.logError('/project/memory_intensive.py', memoryError);

      const errors = errorCollector.getErrors();
      expect(errors[0].errorType).toBe('memory_error');
      expect(errors[0].canRetry).toBe(true);
    });

    it('should log file access errors correctly', () => {
      const accessError = new Error('ENOENT: no such file or directory');
      
      errorCollector.logError('/missing/file.py', accessError);

      const errors = errorCollector.getErrors();
      expect(errors[0].errorType).toBe('file_access_error');
      expect(errors[0].canRetry).toBe(true);
    });

    it('should log parsing errors correctly', () => {
      const parseError = new Error('tree-sitter parsing failed');
      
      errorCollector.logError('/project/complex.py', parseError);

      const errors = errorCollector.getErrors();
      expect(errors[0].errorType).toBe('parsing_error');
      expect(errors[0].canRetry).toBe(true);
    });

    it('should log unknown errors correctly', () => {
      const unknownError = new Error('Something completely unexpected happened');
      
      errorCollector.logError('/project/weird.py', unknownError);

      const errors = errorCollector.getErrors();
      expect(errors[0].errorType).toBe('unknown_error');
      expect(errors[0].canRetry).toBe(true);
    });
  });

  describe('Error Categorization', () => {
    const testCases: Array<{
      message: string;
      expectedCategory: ErrorCategory;
      expectedRetryable: boolean;
    }> = [
      // Syntax errors (not retryable)
      { message: 'SyntaxError: invalid syntax', expectedCategory: 'syntax_error', expectedRetryable: false },
      { message: 'unexpected token at line 15', expectedCategory: 'syntax_error', expectedRetryable: false },
      
      // Encoding errors (retryable)
      { message: 'encoding error in utf-8', expectedCategory: 'encoding_error', expectedRetryable: true },
      { message: 'cannot decode byte sequence', expectedCategory: 'encoding_error', expectedRetryable: true },
      
      // Timeout errors (retryable)
      { message: 'timeout exceeded', expectedCategory: 'timeout_error', expectedRetryable: true },
      { message: 'operation timed out', expectedCategory: 'timeout_error', expectedRetryable: true },
      
      // Memory errors (retryable)
      { message: 'heap out of memory', expectedCategory: 'memory_error', expectedRetryable: true },
      { message: 'memory allocation failed', expectedCategory: 'memory_error', expectedRetryable: true },
      
      // File access errors (retryable)
      { message: 'ENOENT file not found', expectedCategory: 'file_access_error', expectedRetryable: true },
      { message: 'permission denied', expectedCategory: 'file_access_error', expectedRetryable: true },
      { message: 'access denied', expectedCategory: 'file_access_error', expectedRetryable: true },
      
      // Parsing errors (retryable)
      { message: 'parse tree construction failed', expectedCategory: 'parsing_error', expectedRetryable: true },
      { message: 'tree-sitter error occurred', expectedCategory: 'parsing_error', expectedRetryable: true }
    ];

    testCases.forEach(({ message, expectedCategory, expectedRetryable }) => {
      it(`should categorize "${message}" as ${expectedCategory}`, () => {
        const error = new Error(message);
        errorCollector.logError('/test.py', error);

        const errors = errorCollector.getErrors();
        expect(errors[0].errorType).toBe(expectedCategory);
        expect(errors[0].canRetry).toBe(expectedRetryable);
      });
    });
  });

  describe('Success Tracking', () => {
    it('should track successful file analyses', () => {
      errorCollector.setTotalFiles(10);
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();

      const stats = errorCollector.getStatistics();
      expect(stats.successful).toBe(3);
      expect(stats.totalFiles).toBe(10);
      expect(stats.successRate).toBe('30%');
    });

    it('should calculate correct success rate', () => {
      errorCollector.setTotalFiles(5);
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();

      const stats = errorCollector.getStatistics();
      expect(stats.successRate).toBe('80%');
    });

    it('should handle zero total files', () => {
      const stats = errorCollector.getStatistics();
      expect(stats.successRate).toBe('0%');
      expect(stats.totalFiles).toBe(0);
    });
  });

  describe('Statistics Generation', () => {
    it('should generate comprehensive statistics', () => {
      errorCollector.setTotalFiles(10);
      
      // Add some successes
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();
      
      // Add various error types
      errorCollector.logError('/file1.py', new Error('syntax error'));
      errorCollector.logError('/file2.py', new Error('encoding issue'));
      errorCollector.logError('/file3.py', new Error('timeout occurred'));

      const stats = errorCollector.getStatistics();

      expect(stats.totalFiles).toBe(10);
      expect(stats.successful).toBe(2);
      expect(stats.failed).toBe(3);
      expect(stats.successRate).toBe('20%');
      expect(stats.errorsByType.syntax_error).toBe(1);
      expect(stats.errorsByType.encoding_error).toBe(1);
      expect(stats.errorsByType.timeout_error).toBe(1);
      expect(stats.processing_duration_ms).toBeGreaterThan(0);
    });

    it('should group errors by type correctly', () => {
      errorCollector.logError('/file1.py', new Error('syntax problem'));
      errorCollector.logError('/file2.py', new Error('another syntax issue'));
      errorCollector.logError('/file3.py', new Error('encoding problem'));

      const stats = errorCollector.getStatistics();

      expect(stats.errorsByType.syntax_error).toBe(2);
      expect(stats.errorsByType.encoding_error).toBe(1);
      expect(stats.errorsByType.timeout_error).toBeUndefined();
    });
  });

  describe('Error Querying', () => {
    it('should detect when errors exist', () => {
      expect(errorCollector.hasErrors()).toBe(false);

      errorCollector.logError('/test.py', new Error('test error'));

      expect(errorCollector.hasErrors()).toBe(true);
    });

    it('should return immutable copy of errors', () => {
      const originalError = new Error('test error');
      errorCollector.logError('/test.py', originalError);

      const errors1 = errorCollector.getErrors();
      const errors2 = errorCollector.getErrors();

      expect(errors1).not.toBe(errors2); // Different references
      expect(errors1).toEqual(errors2); // Same content

      // Modifying returned array shouldn't affect internal state
      errors1.push({
        file: 'fake.py',
        errorType: 'syntax_error',
        message: 'fake',
        context: {},
        canRetry: false,
        timestamp: new Date().toISOString()
      });

      expect(errorCollector.getErrors()).toHaveLength(1);
    });
  });

  describe('Error Report Export', () => {
    it('should export complete error report to JSON file', async () => {
      const outputPath = path.join(testOutputDir, 'error-report.json');
      const projectPath = '/test/project';

      errorCollector.setTotalFiles(5);
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();
      errorCollector.logError(
        '/test/project/file1.py', 
        new Error('syntax error'),
        { fileSize: 1024, lineCount: 50, encoding: 'utf-8' }
      );
      errorCollector.logError('/test/project/file2.py', new Error('encoding issue'));

      await errorCollector.exportToFile(outputPath, projectPath);

      expect(await fs.pathExists(outputPath)).toBe(true);
      
      const reportData = await fs.readJSON(outputPath);
      
      expect(reportData.project).toBe('/test/project');
      expect(reportData.timestamp).toBeDefined();
      expect(reportData.summary.totalFiles).toBe(5);
      expect(reportData.summary.successful).toBe(2);
      expect(reportData.summary.failed).toBe(2);
      expect(reportData.summary.successRate).toBe('40%');
      expect(reportData.errors).toHaveLength(2);
      
      // Check first error details
      const firstError = reportData.errors[0];
      expect(firstError.file).toBe('test/project/file1.py');
      expect(firstError.errorType).toBe('syntax_error');
      expect(firstError.canRetry).toBe(false);
      expect(firstError.context.fileSize).toBe(1024);
    });

    it('should create output directory if it does not exist', async () => {
      const outputPath = path.join(testOutputDir, 'nested', 'deep', 'report.json');
      
      errorCollector.logError('/test.py', new Error('test'));

      await errorCollector.exportToFile(outputPath, '/project');

      expect(await fs.pathExists(outputPath)).toBe(true);
      expect(await fs.pathExists(path.dirname(outputPath))).toBe(true);
    });

    it('should handle export errors gracefully', async () => {
      const invalidPath = '/root/cannot-write-here.json';
      
      errorCollector.logError('/test.py', new Error('test'));

      await expect(
        errorCollector.exportToFile(invalidPath, '/project')
      ).rejects.toThrow();
    });
  });

  describe('Summary Output', () => {
    it('should print summary without errors', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      errorCollector.setTotalFiles(10);
      for (let i = 0; i < 8; i++) {
        errorCollector.recordSuccess();
      }

      errorCollector.printSummary();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Analysis Summary:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Total files: 10'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Successful: 8'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Failed: 0'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('📈 Success rate: 80%'));
      
      consoleSpy.mockRestore();
    });

    it('should print error breakdown when errors exist', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      errorCollector.setTotalFiles(5);
      errorCollector.recordSuccess();
      errorCollector.recordSuccess();
      errorCollector.logError('/file1.py', new Error('syntax issue'));
      errorCollector.logError('/file2.py', new Error('encoding problem'));
      errorCollector.logError('/file3.py', new Error('another syntax error'));

      errorCollector.printSummary();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('❌ Error breakdown:'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('syntax_error: 2'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('encoding_error: 1'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('💡 Run with --error-report'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Context Handling', () => {
    it('should handle missing context gracefully', () => {
      errorCollector.logError('/test.py', new Error('test error'));

      const errors = errorCollector.getErrors();
      expect(errors[0].context).toEqual({});
    });

    it('should preserve all context fields', () => {
      const context: ErrorContext = {
        fileSize: 2048,
        lineCount: 100,
        encoding: 'utf-8'
      };

      errorCollector.logError('/test.py', new Error('test error'), context);

      const errors = errorCollector.getErrors();
      expect(errors[0].context).toEqual(context);
    });

    it('should handle partial context', () => {
      const context: ErrorContext = {
        fileSize: 1024
        // lineCount and encoding missing
      };

      errorCollector.logError('/test.py', new Error('test error'), context);

      const errors = errorCollector.getErrors();
      expect(errors[0].context.fileSize).toBe(1024);
      expect(errors[0].context.lineCount).toBeUndefined();
      expect(errors[0].context.encoding).toBeUndefined();
    });
  });

  describe('Timestamp and Stack Trace', () => {
    it('should add ISO timestamp to errors', () => {
      const beforeTime = new Date().toISOString();
      
      errorCollector.logError('/test.py', new Error('test error'));
      
      const afterTime = new Date().toISOString();
      const errors = errorCollector.getErrors();
      
      expect(errors[0].timestamp).toBeDefined();
      expect(errors[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(errors[0].timestamp >= beforeTime).toBe(true);
      expect(errors[0].timestamp <= afterTime).toBe(true);
    });

    it('should include stack trace in DEBUG mode', () => {
      const originalEnv = process.env.DEBUG;
      process.env.DEBUG = 'true';
      
      try {
        const error = new Error('test error');
        errorCollector.logError('/test.py', error);

        const errors = errorCollector.getErrors();
        expect(errors[0].stackTrace).toBeDefined();
        expect(errors[0].stackTrace).toContain('Error: test error');
      } finally {
        process.env.DEBUG = originalEnv;
      }
    });

    it('should exclude stack trace in production mode', () => {
      const originalEnv = process.env.DEBUG;
      delete process.env.DEBUG;
      
      try {
        errorCollector.logError('/test.py', new Error('test error'));

        const errors = errorCollector.getErrors();
        expect(errors[0].stackTrace).toBeUndefined();
      } finally {
        process.env.DEBUG = originalEnv;
      }
    });
  });
});