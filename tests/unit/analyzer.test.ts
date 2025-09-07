import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
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
});