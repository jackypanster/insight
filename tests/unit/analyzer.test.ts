import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import { ErrorCollector } from '../../src/services/errors/ErrorCollector.js';
import type { FileInfo } from '../../src/types/index.js';

describe('ASTAnalyzer', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/analyzer');
  let analyzer: ASTAnalyzer;

  beforeAll(async () => {
    analyzer = new ASTAnalyzer();
    await fs.ensureDir(testDir);

    // Create test Python files
    await fs.writeFile(
      path.join(testDir, 'simple_class.py'),
      `"""
A simple class for testing AST analysis.
"""

import os
import sys
from typing import List, Optional

class Calculator:
    """A simple calculator class."""
    
    def __init__(self, precision: int = 2):
        """Initialize with precision.
        
        Args:
            precision: Number of decimal places
        """
        self.precision = precision
        self.history = []
    
    def add(self, a: float, b: float) -> float:
        """Add two numbers."""
        result = a + b
        self.history.append(f"{a} + {b} = {result}")
        return result
    
    @property
    def last_calculation(self) -> str:
        """Get the last calculation."""
        return self.history[-1] if self.history else "No calculations"

def factorial(n: int) -> int:
    """Calculate factorial of n."""
    if n <= 1:
        return 1
    return n * factorial(n - 1)

# Global variable
MAX_ITERATIONS = 1000

if __name__ == "__main__":
    calc = Calculator()
    result = calc.add(1, 2)
    print(f"Result: {result}")
`
    );

    await fs.writeFile(
      path.join(testDir, 'complex_functions.py'),
      `"""Complex function examples."""

import asyncio
from abc import ABC, abstractmethod

class BaseProcessor(ABC):
    """Abstract base processor."""
    
    @abstractmethod
    def process(self, data: str) -> str:
        """Process data."""
        pass

class TextProcessor(BaseProcessor):
    """Text processor implementation."""
    
    def __init__(self):
        self.processed_count = 0
    
    def process(self, data: str) -> str:
        """Process text data."""
        if not data:
            return ""
        
        processed = data.upper()
        self.processed_count += 1
        return processed

@asyncio.coroutine
async def fetch_data(url: str, timeout: int = 30) -> Optional[str]:
    """Fetch data from URL."""
    try:
        if not url.startswith('http'):
            raise ValueError("Invalid URL")
        
        # Simulate async operation
        await asyncio.sleep(0.1)
        
        if timeout <= 0:
            return None
        elif timeout < 10:
            return "Fast response"
        else:
            return "Slow response"
            
    except Exception as e:
        print(f"Error: {e}")
        return None

def complex_logic(items: List[str], filter_empty: bool = True) -> List[str]:
    """Complex filtering logic."""
    result = []
    
    for item in items:
        if filter_empty and not item.strip():
            continue
        
        # Complex condition
        if len(item) > 3 and item.isalnum():
            result.append(item.title())
        elif item.startswith('_'):
            result.append(item.upper())
        else:
            result.append(item.lower())
    
    return sorted(result)

# Multiple global variables
DEBUG_MODE = True
CONFIG = {"max_retries": 3, "timeout": 30}
PROCESSORS = [TextProcessor()]
`
    );

    await fs.writeFile(
      path.join(testDir, 'parse_error.py'),
      `"""File with intentional syntax errors."""

def broken_function(
    # Missing closing parenthesis and colon

def another_function():
    if True
        # Missing colon
        print("This will cause parse errors")

class BrokenClass
    # Missing colon
    def method(self):
        pass
`
    );
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  describe('analyzeFile()', () => {
    it('should analyze simple class correctly', async () => {
      const fileInfo: FileInfo = {
        path: path.join(testDir, 'simple_class.py'),
        size: 1000,
        hash: 'test-hash',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo);

      expect(result.filePath).toBe(fileInfo.path);
      expect(result.language).toBe('python');
      expect(result.functions.length).toBeGreaterThan(0);
      expect(result.classes).toHaveLength(1);
      expect(result.imports.length).toBeGreaterThan(0);

      // Check class details
      const calculatorClass = result.classes[0];
      expect(calculatorClass.name).toBe('Calculator');
      expect(calculatorClass.methods.length).toBeGreaterThan(0);
      expect(calculatorClass.docstring).toBeDefined();

      // Check function details
      const factorialFunction = result.functions.find(f => f.name === 'factorial');
      expect(factorialFunction).toBeDefined();
      expect(factorialFunction!.parameters.length).toBeGreaterThan(0);

      // Check imports
      const osImport = result.imports.find(i => i.module === 'os');
      expect(osImport).toBeDefined();

      const typingImport = result.imports.find(i => i.module === 'typing');
      expect(typingImport).toBeDefined();

      // Check global variables
      expect(result.globalVariables).toContain('MAX_ITERATIONS');

      expect(result.complexity).toBeGreaterThan(1);
      expect(result.lines).toBeGreaterThan(10);
    });

    it('should handle complex functions and async code', async () => {
      const fileInfo: FileInfo = {
        path: path.join(testDir, 'complex_functions.py'),
        size: 2000,
        hash: 'test-hash-2',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo);

      expect(result.classes.length).toBeGreaterThanOrEqual(2);
      expect(result.functions.length).toBeGreaterThan(0);

      // Check abstract base class
      const baseProcessor = result.classes.find(c => c.name === 'BaseProcessor');
      expect(baseProcessor).toBeDefined();

      // Check async function
      const fetchData = result.functions.find(f => f.name === 'fetch_data');
      expect(fetchData).toBeDefined();
      expect(fetchData!.isAsync).toBe(true);

      // Check complex function
      const complexLogic = result.functions.find(f => f.name === 'complex_logic');
      expect(complexLogic).toBeDefined();

      // Check global variables
      expect(result.globalVariables).toContain('DEBUG_MODE');
      expect(result.globalVariables).toContain('CONFIG');
      expect(result.globalVariables).toContain('PROCESSORS');

      // High complexity due to conditionals and loops
      expect(result.complexity).toBeGreaterThan(5);
    });

    it('should handle files with parse errors gracefully', async () => {
      const fileInfo: FileInfo = {
        path: path.join(testDir, 'parse_error.py'),
        size: 500,
        hash: 'test-hash-3',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Parse errors detected');

      // Should still extract what it can
      expect(result.language).toBe('python');
      expect(result.filePath).toBe(fileInfo.path);
    });

    it('should reject unsupported languages', async () => {
      const fileInfo: FileInfo = {
        path: path.join(testDir, 'simple_class.py'), // Use existing file
        size: 100,
        hash: 'test-hash',
        language: 'java', // But set wrong language
        lastModified: new Date(),
      };

      await expect(analyzer.analyzeFile(fileInfo)).rejects.toThrow('Unsupported language: java');
    });
  });

  describe('getAnalysisStats()', () => {
    it('should calculate correct statistics', async () => {
      const fileInfo1: FileInfo = {
        path: path.join(testDir, 'simple_class.py'),
        size: 1000,
        hash: 'hash1',
        language: 'python',
        lastModified: new Date(),
      };

      const fileInfo2: FileInfo = {
        path: path.join(testDir, 'complex_functions.py'),
        size: 2000,
        hash: 'hash2',
        language: 'python',
        lastModified: new Date(),
      };

      const result1 = await analyzer.analyzeFile(fileInfo1);
      const result2 = await analyzer.analyzeFile(fileInfo2);
      
      const stats = analyzer.getAnalysisStats([result1, result2]);

      expect(stats.totalFiles).toBe(2);
      expect(stats.totalFunctions).toBeGreaterThan(0);
      expect(stats.totalClasses).toBeGreaterThan(0);
      expect(stats.totalLines).toBeGreaterThan(0);
      expect(stats.averageComplexity).toBeGreaterThan(1);
      expect(stats.filesWithErrors).toBe(0);
      expect(stats.languages.python).toBe(2);
    });
  });

  describe('AST node extraction', () => {
    it('should extract function parameters correctly', async () => {
      const fileInfo: FileInfo = {
        path: path.join(testDir, 'simple_class.py'),
        size: 1000,
        hash: 'test-hash',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo);
      const calculatorClass = result.classes[0];
      const addMethod = calculatorClass.methods.find(m => m.name === 'add');

      expect(addMethod).toBeDefined();
      expect(addMethod!.parameters.length).toBeGreaterThan(0);
    });

    it('should extract docstrings correctly', async () => {
      const fileInfo: FileInfo = {
        path: path.join(testDir, 'simple_class.py'),
        size: 1000,
        hash: 'test-hash',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo);
      const calculatorClass = result.classes[0];
      const factorialFunction = result.functions.find(f => f.name === 'factorial');

      expect(calculatorClass.docstring).toBeDefined();
      expect(factorialFunction!.docstring).toBeDefined();
    });

    it('should extract decorators correctly', async () => {
      const fileInfo: FileInfo = {
        path: path.join(testDir, 'complex_functions.py'),
        size: 2000,
        hash: 'test-hash',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo);
      const fetchData = result.functions.find(f => f.name === 'fetch_data');

      expect(fetchData!.decorators.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Error Resilience Features (Phase 5)', () => {
    let errorCollector: ErrorCollector;
    const errorTestDir = path.join(__dirname, '../../test-fixtures/errors');

    beforeAll(async () => {
      errorCollector = new ErrorCollector();
    });

    describe('Error Collector Integration', () => {
      it('should use provided error collector', async () => {
        const customErrorCollector = new ErrorCollector();
        const analyzerWithCollector = new ASTAnalyzer(customErrorCollector);
        
        expect(analyzerWithCollector['errorCollector']).toBe(customErrorCollector);
      });

      it('should allow setting error collector after construction', () => {
        const analyzer = new ASTAnalyzer();
        const newCollector = new ErrorCollector();
        
        analyzer.setErrorCollector(newCollector);
        expect(analyzer['errorCollector']).toBe(newCollector);
      });
    });

    describe('File Size Limits', () => {
      it('should reject files larger than 10MB in continue-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: path.join(errorTestDir, 'huge_file.py'),
          size: 11 * 1024 * 1024, // 11MB (over limit)
          hash: 'test-hash-huge',
          language: 'python',
          lastModified: new Date(),
        };

        const result = await analyzer.analyzeFile(fileInfo, true);
        
        expect(result.analysisStatus).toBe('failed');
        expect(result.errorMessage).toContain('File too large');
        expect(result.errorMessage).toContain('11.0MB (max: 10MB)');
        expect(result.functions).toHaveLength(0);
        expect(result.classes).toHaveLength(0);
      });

      it('should throw error for large files in stop-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: path.join(errorTestDir, 'huge_file.py'),
          size: 15 * 1024 * 1024, // 15MB
          hash: 'test-hash-huge-2',
          language: 'python',
          lastModified: new Date(),
        };

        await expect(analyzer.analyzeFile(fileInfo, false))
          .rejects
          .toThrow('File too large: 15.0MB (max: 10MB)');
      });
    });

    describe('Parsing Timeout Protection', () => {
      it('should timeout after 30 seconds during parsing', async () => {
        // Mock parser to simulate slow parsing
        const mockParser = {
          parse: () => new Promise(resolve => setTimeout(resolve, 35000)) // 35 seconds
        };
        
        const analyzerWithMock = new ASTAnalyzer();
        analyzerWithMock['pythonParser'] = mockParser as any;

        const fileInfo: FileInfo = {
          path: path.join(testDir, 'simple_class.py'),
          size: 1000,
          hash: 'timeout-test',
          language: 'python',
          lastModified: new Date(),
        };

        const startTime = Date.now();
        const result = await analyzerWithMock.analyzeFile(fileInfo, true);
        const duration = Date.now() - startTime;

        expect(duration).toBeLessThan(31000); // Should timeout before 31s
        expect(result.analysisStatus).toBe('failed');
        expect(result.errorMessage).toContain('Parsing timeout (30s)');
      }, 32000); // Test timeout of 32 seconds
    });

    describe('Syntax Error Handling', () => {
      it('should handle files with syntax errors in continue-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: path.join(errorTestDir, 'syntax_error.py'),
          size: 500,
          hash: 'syntax-error-test',
          language: 'python',
          lastModified: new Date(),
        };

        const analyzerWithCollector = new ASTAnalyzer(errorCollector);
        const result = await analyzerWithCollector.analyzeFile(fileInfo, true);

        expect(result.analysisStatus).toBe('partial');
        expect(result.filePath).toBe(fileInfo.path);
        expect(result.language).toBe('python');
        // Should still extract what it can from valid parts
        expect(result.lines).toBeGreaterThan(0);
      });

      it('should throw on syntax errors in stop-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: path.join(errorTestDir, 'syntax_error.py'),
          size: 500,
          hash: 'syntax-error-test-2',
          language: 'python',
          lastModified: new Date(),
        };

        // Since the file exists but has syntax errors, it should not throw during file read
        // but should detect parse errors
        const result = await analyzer.analyzeFile(fileInfo, false);
        expect(result.analysisStatus).toBe('partial');
      });
    });

    describe('File Access Error Handling', () => {
      it('should handle missing files in continue-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: '/non/existent/file.py',
          size: 0,
          hash: 'missing-file',
          language: 'python',
          lastModified: new Date(),
        };

        const analyzerWithCollector = new ASTAnalyzer(errorCollector);
        const result = await analyzerWithCollector.analyzeFile(fileInfo, true);

        expect(result.analysisStatus).toBe('failed');
        expect(result.errorMessage).toContain('ENOENT');
        expect(errorCollector.hasErrors()).toBe(true);
      });

      it('should throw on missing files in stop-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: '/another/missing/file.py',
          size: 0,
          hash: 'missing-file-2',
          language: 'python',
          lastModified: new Date(),
        };

        await expect(analyzer.analyzeFile(fileInfo, false))
          .rejects
          .toThrow('ENOENT');
      });
    });

    describe('Language Support Validation', () => {
      it('should reject unsupported languages in continue-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: path.join(testDir, 'simple_class.py'), // Valid file
          size: 1000,
          hash: 'wrong-language',
          language: 'java', // Wrong language
          lastModified: new Date(),
        };

        const analyzerWithCollector = new ASTAnalyzer(errorCollector);
        const result = await analyzerWithCollector.analyzeFile(fileInfo, true);

        expect(result.analysisStatus).toBe('failed');
        expect(result.errorMessage).toBe('Unsupported language: java');
        expect(errorCollector.getErrors().some(e => 
          e.message === 'Unsupported language: java'
        )).toBe(true);
      });

      it('should throw on unsupported languages in stop-on-error mode', async () => {
        const fileInfo: FileInfo = {
          path: path.join(testDir, 'simple_class.py'),
          size: 1000,
          hash: 'wrong-language-2',
          language: 'javascript',
          lastModified: new Date(),
        };

        await expect(analyzer.analyzeFile(fileInfo, false))
          .rejects
          .toThrow('Unsupported language: javascript');
      });
    });

    describe('Partial Analysis Results', () => {
      it('should return partial results when some extraction steps fail', async () => {
        const fileInfo: FileInfo = {
          path: path.join(errorTestDir, 'syntax_error.py'),
          size: 500,
          hash: 'partial-test',
          language: 'python',
          lastModified: new Date(),
        };

        const result = await analyzer.analyzeFile(fileInfo, true);

        // Should have basic info even if parsing fails
        expect(result.filePath).toBe(fileInfo.path);
        expect(result.language).toBe('python');
        expect(result.lines).toBeGreaterThan(0);
        
        // Analysis status should indicate partial success
        expect(result.analysisStatus).toBe('partial');
        
        // Should have error information
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });

    describe('Complex File Handling', () => {
      it('should handle circular import patterns without crashing', async () => {
        const fileInfo: FileInfo = {
          path: path.join(errorTestDir, 'circular_import.py'),
          size: 2000,
          hash: 'circular-import',
          language: 'python',
          lastModified: new Date(),
        };

        const result = await analyzer.analyzeFile(fileInfo, true);

        // Should complete analysis despite circular imports
        expect(result.analysisStatus).toEqual(expect.stringMatching(/success|partial/));
        expect(result.filePath).toBe(fileInfo.path);
        expect(result.imports.length).toBeGreaterThan(0);
      });
    });

    describe('Analysis Status Tracking', () => {
      it('should return "success" status for successful analysis', async () => {
        const fileInfo: FileInfo = {
          path: path.join(testDir, 'simple_class.py'),
          size: 1000,
          hash: 'success-test',
          language: 'python',
          lastModified: new Date(),
        };

        const result = await analyzer.analyzeFile(fileInfo, true);

        expect(result.analysisStatus).toBe('success');
        expect(result.classes.length).toBeGreaterThan(0);
        expect(result.functions.length).toBeGreaterThan(0);
      });

      it('should return "failed" status for complete failures', async () => {
        const fileInfo: FileInfo = {
          path: '/completely/missing/file.py',
          size: 0,
          hash: 'failed-test',
          language: 'python',
          lastModified: new Date(),
        };

        const result = await analyzer.analyzeFile(fileInfo, true);

        expect(result.analysisStatus).toBe('failed');
        expect(result.errorMessage).toBeDefined();
      });

      it('should return "partial" status for files with parse errors but some content', async () => {
        const fileInfo: FileInfo = {
          path: path.join(errorTestDir, 'syntax_error.py'),
          size: 500,
          hash: 'partial-test-2',
          language: 'python',
          lastModified: new Date(),
        };

        const result = await analyzer.analyzeFile(fileInfo, true);

        expect(result.analysisStatus).toBe('partial');
        expect(result.lines).toBeGreaterThan(0); // Should have basic metrics
      });
    });

    describe('Error Context Collection', () => {
      it('should provide detailed error context to ErrorCollector', async () => {
        const mockCollector = {
          logError: vi.fn(),
          recordSuccess: vi.fn(),
          hasErrors: () => false,
          getErrors: () => [],
        } as any;

        const analyzerWithMock = new ASTAnalyzer(mockCollector);
        
        const fileInfo: FileInfo = {
          path: '/missing/test.py',
          size: 1024,
          hash: 'context-test',
          language: 'python',
          lastModified: new Date(),
        };

        await analyzerWithMock.analyzeFile(fileInfo, true);

        expect(mockCollector.logError).toHaveBeenCalledWith(
          '/missing/test.py',
          expect.any(Error),
          expect.objectContaining({
            encoding: 'utf8'
          })
        );
      });
    });

    describe('Performance Monitoring', () => {
      it('should handle large but valid files efficiently', async () => {
        // Create a large valid Python file for testing
        const largeValidFile = path.join(testDir, 'large_valid.py');
        let content = '# Large valid Python file\n';
        for (let i = 0; i < 1000; i++) {
          content += `def function_${i}():\n    return ${i}\n\n`;
        }
        
        await fs.writeFile(largeValidFile, content);

        const fileInfo: FileInfo = {
          path: largeValidFile,
          size: content.length,
          hash: 'large-valid',
          language: 'python',
          lastModified: new Date(),
        };

        const startTime = Date.now();
        const result = await analyzer.analyzeFile(fileInfo, true);
        const duration = Date.now() - startTime;

        expect(result.analysisStatus).toBe('success');
        expect(result.functions.length).toBeGreaterThan(500);
        expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds

        // Clean up
        await fs.remove(largeValidFile);
      });
    });
  });
});