import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import { ErrorCollector } from '../../src/services/errors/ErrorCollector.js';
import type { FileInfo } from '../../src/types/index.js';

describe('Performance Edge Cases', () => {
  const testDir = path.join(__dirname, '../temp-performance-test');
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

  describe('File Size Limits', () => {
    it('should reject files exactly at 10MB limit', async () => {
      const hugefile = path.join(testDir, 'exactly_10mb.py');
      
      // Create exactly 10MB file
      const tenMB = 10 * 1024 * 1024;
      let content = '# Exactly 10MB Python file\n';
      
      // Fill to exactly 10MB
      const remainingBytes = tenMB - Buffer.byteLength(content, 'utf8');
      content += 'x = "' + 'a'.repeat(remainingBytes - 10) + '"\n';
      
      await fs.writeFile(hugefile, content);
      const actualSize = (await fs.stat(hugefile)).size;
      
      expect(actualSize).toBeGreaterThanOrEqual(tenMB);

      const fileInfo: FileInfo = {
        path: hugefile,
        size: actualSize,
        hash: '10mb-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      expect(result.analysisStatus).toBe('failed');
      expect(result.errorMessage).toContain('File too large');
    });

    it('should handle files just under 10MB limit', async () => {
      const largefile = path.join(testDir, 'just_under_10mb.py');
      
      // Create file just under 10MB (9.9MB)
      const almostTenMB = 9.9 * 1024 * 1024;
      let content = '# Large Python file just under 10MB\n\n';
      
      // Add functions to fill the space
      let functionCount = 0;
      while (Buffer.byteLength(content, 'utf8') < almostTenMB - 1000) {
        content += `def function_${functionCount}():
    """Function ${functionCount} for size testing."""
    return ${functionCount}

`;
        functionCount++;
      }

      await fs.writeFile(largefile, content);
      const actualSize = (await fs.stat(largefile)).size;
      
      expect(actualSize).toBeLessThan(10 * 1024 * 1024);

      const fileInfo: FileInfo = {
        path: largefile,
        size: actualSize,
        hash: 'under-10mb-test',
        language: 'python',
        lastModified: new Date(),
      };

      const startTime = Date.now();
      const result = await analyzer.analyzeFile(fileInfo, true);
      const duration = Date.now() - startTime;

      expect(result.analysisStatus).toBe('success');
      expect(result.functions.length).toBeGreaterThan(100);
      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });
  });

  describe('Parsing Timeouts', () => {
    it('should handle deeply nested structures that might cause timeouts', async () => {
      const deepFile = path.join(testDir, 'deeply_nested.py');
      
      // Create deeply nested structure that might stress the parser
      let content = `# Deeply nested Python structures
def deeply_nested_function():
    """Function with deeply nested structures."""
`;

      // Create deeply nested if statements
      const nestingDepth = 50;
      for (let i = 0; i < nestingDepth; i++) {
        content += '    ' + '    '.repeat(i) + `if True:  # Level ${i}\n`;
      }
      
      // Close all the nesting
      for (let i = nestingDepth - 1; i >= 0; i--) {
        content += '    ' + '    '.repeat(i) + `    pass  # End level ${i}\n`;
      }

      // Add complex class with nested methods
      content += `

class DeeplyNestedClass:
    """Class with deeply nested methods."""
    
    def complex_method(self):
        """Method with complex nested logic."""
        data = {}
        
        for i in range(10):
            for j in range(10):
                for k in range(10):
                    if i > 5:
                        if j > 5:
                            if k > 5:
                                try:
                                    data[f"{i}_{j}_{k}"] = {
                                        'i': i,
                                        'j': j, 
                                        'k': k,
                                        'nested': {
                                            'deep': {
                                                'deeper': {
                                                    'deepest': i * j * k
                                                }
                                            }
                                        }
                                    }
                                except Exception as e:
                                    if isinstance(e, ValueError):
                                        continue
                                    elif isinstance(e, KeyError):
                                        break
                                    else:
                                        raise
        return data
`;

      await fs.writeFile(deepFile, content);

      const fileInfo: FileInfo = {
        path: deepFile,
        size: content.length,
        hash: 'deep-nested-test',
        language: 'python',
        lastModified: new Date(),
      };

      const startTime = Date.now();
      const result = await analyzer.analyzeFile(fileInfo, true);
      const duration = Date.now() - startTime;

      // Should either succeed or timeout gracefully
      expect(['success', 'partial', 'failed']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'failed' && result.errorMessage?.includes('timeout')) {
        // If it timed out, should be within reasonable bounds
        expect(duration).toBeLessThan(35000); // 30s timeout + 5s buffer
      } else if (result.analysisStatus === 'success') {
        // If it succeeded, should have extracted the structures
        expect(result.functions.length).toBeGreaterThan(0);
        expect(result.classes.length).toBe(1);
      }
    });

    it('should handle files with extremely complex expressions', async () => {
      const complexFile = path.join(testDir, 'complex_expressions.py');
      
      let content = `# File with complex expressions that might stress parser

def complex_arithmetic():
    """Function with complex arithmetic expressions."""
    # Generate a very complex mathematical expression
    result = (`;
      
      // Create deeply nested arithmetic
      for (let i = 0; i < 100; i++) {
        content += `((${i} + ${i * 2}) * (${i * 3} - ${i / 2})) + `;
      }
      content = content.slice(0, -3); // Remove last " + "
      
      for (let i = 0; i < 100; i++) {
        content += ')';
      }
      
      content += `
    return result

def complex_data_structure():
    """Function that builds complex nested data structures."""
    return {
`;

      // Create complex nested dictionary
      for (let i = 0; i < 20; i++) {
        content += `        'key_${i}': {
            'nested_${i}': [
                {
                    'deep_${j}': {
                        'value': ${i * j},
                        'computed': ${i} * ${j} + (${i} if ${j} > 5 else ${j}),
                        'expression': (${i} + ${j}) * (${i} - ${j}) if ${i} != ${j} else 0
                    } for j in range(10)
                }
            ]
        },
`;
      }
      
      content += `    }

class ComplexLogicClass:
    """Class with very complex logical operations."""
    
    def complex_conditions(self, a, b, c, d, e):
        """Method with complex conditional logic."""
        return (
            (a > b and b > c and c > d and d > e) or
            (a < b and b < c and c < d and d < e) or
            (a == b and b != c and c == d and d != e) or
            (a != b and b == c and c != d and d == e) or
            ((a + b) > (c + d) and (c * d) > (a * b)) or
            ((a ** 2 + b ** 2) == (c ** 2 + d ** 2)) or
            (abs(a - b) < abs(c - d) and abs(c - e) > abs(a - e))
        )
`;

      await fs.writeFile(complexFile, content);

      const fileInfo: FileInfo = {
        path: complexFile,
        size: content.length,
        hash: 'complex-expressions-test',
        language: 'python',
        lastModified: new Date(),
      };

      const result = await analyzer.analyzeFile(fileInfo, true);

      // Should handle complex expressions without crashing
      expect(['success', 'partial']).toContain(result.analysisStatus);
      
      if (result.analysisStatus === 'success') {
        expect(result.functions.length).toBeGreaterThanOrEqual(2);
        expect(result.classes.length).toBe(1);
      }
    });
  });

  describe('Memory Pressure', () => {
    it('should handle files with many large strings without memory issues', async () => {
      const memoryFile = path.join(testDir, 'memory_intensive.py');
      
      let content = `# Memory intensive Python file
"""Module with many large string literals."""

`;

      // Create many functions with large string literals
      for (let i = 0; i < 200; i++) {
        const largeString = 'x'.repeat(1000); // 1KB string per function
        content += `def function_${i}():
    """Function ${i} with large string literal."""
    data = """${largeString}"""
    return data.upper().lower().strip().replace('x', 'y')

`;
      }

      // Add class with large constants
      content += `
class MemoryIntensiveClass:
    """Class with large constants."""
    
`;

      for (let i = 0; i < 50; i++) {
        const hugeString = 'data'.repeat(500); // 2KB string per constant
        content += `    CONSTANT_${i} = "${hugeString}"\n`;
      }

      await fs.writeFile(memoryFile, content);

      const fileInfo: FileInfo = {
        path: memoryFile,
        size: content.length,
        hash: 'memory-test',
        language: 'python',
        lastModified: new Date(),
      };

      // Monitor memory usage
      const initialMemory = process.memoryUsage().heapUsed;
      
      const result = await analyzer.analyzeFile(fileInfo, true);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(result.analysisStatus).toBe('success');
      expect(result.functions.length).toBe(200);
      expect(result.classes.length).toBe(1);
      
      // Should not consume excessive memory (under 50MB increase)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should handle files with many classes and methods efficiently', async () => {
      const manyClassesFile = path.join(testDir, 'many_classes.py');
      
      let content = `# File with many classes for performance testing
"""Module with numerous classes and methods."""

`;

      // Generate many classes
      for (let i = 0; i < 100; i++) {
        content += `class Class${i}:
    """Class number ${i}."""
    
    def __init__(self):
        self.value = ${i}
        self.data = [x for x in range(${i * 10})]
    
`;

        // Add methods to each class
        for (let j = 0; j < 10; j++) {
          content += `    def method_${j}(self, param1=None, param2=${j}):
        """Method ${j} of class ${i}."""
        if param1 is None:
            param1 = self.value * ${j}
        return param1 + param2 + self.value
    
`;
        }
      }

      await fs.writeFile(manyClassesFile, content);

      const fileInfo: FileInfo = {
        path: manyClassesFile,
        size: content.length,
        hash: 'many-classes-test',
        language: 'python',
        lastModified: new Date(),
      };

      const startTime = Date.now();
      const result = await analyzer.analyzeFile(fileInfo, true);
      const duration = Date.now() - startTime;

      expect(result.analysisStatus).toBe('success');
      expect(result.classes.length).toBe(100);
      
      // Each class should have 10 methods + __init__
      const totalExpectedMethods = 100 * 11;
      const actualMethodCount = result.classes.reduce((sum, cls) => sum + cls.methods.length, 0);
      expect(actualMethodCount).toBe(totalExpectedMethods);
      
      // Should process efficiently even with many classes
      expect(duration).toBeLessThan(15000); // Should complete in under 15 seconds
    });
  });

  describe('Resource Cleanup', () => {
    it('should properly cleanup resources after processing large files', async () => {
      const resourceFile = path.join(testDir, 'resource_cleanup.py');
      
      // Create a substantial file
      let content = `# Resource cleanup test
import os
import sys
from typing import List, Dict, Optional, Union

`;

      // Add many imports and functions
      const modules = ['json', 'csv', 'sqlite3', 'requests', 'pandas', 'numpy', 'matplotlib'];
      modules.forEach(mod => {
        content += `try:\n    import ${mod}\nexcept ImportError:\n    ${mod} = None\n\n`;
      });

      for (let i = 0; i < 50; i++) {
        content += `def resource_function_${i}(data: List[Dict[str, Union[str, int]]]) -> Optional[Dict]:
    """Function ${i} that processes data with type hints."""
    if not data:
        return None
    
    processed = {}
    for item in data:
        key = f"processed_{i}_{item.get('id', 0)}"
        value = {
            'original': item,
            'processed_at': '2024-01-01',
            'processed_by': f'function_{i}',
            'metadata': {
                'version': '1.0',
                'type': 'processed',
                'extra': [x for x in range(10)]
            }
        }
        processed[key] = value
    
    return processed

`;
      }

      await fs.writeFile(resourceFile, content);

      const fileInfo: FileInfo = {
        path: resourceFile,
        size: content.length,
        hash: 'resource-cleanup-test',
        language: 'python',
        lastModified: new Date(),
      };

      // Process the file multiple times to test resource cleanup
      const results = [];
      const memorySnapshots = [];
      
      for (let iteration = 0; iteration < 5; iteration++) {
        const beforeMemory = process.memoryUsage();
        const result = await analyzer.analyzeFile(fileInfo, true);
        const afterMemory = process.memoryUsage();
        
        results.push(result);
        memorySnapshots.push({
          before: beforeMemory.heapUsed,
          after: afterMemory.heapUsed,
          increase: afterMemory.heapUsed - beforeMemory.heapUsed
        });

        // All results should be successful
        expect(result.analysisStatus).toBe('success');
      }

      // Memory usage should be relatively stable across iterations
      const memoryIncreases = memorySnapshots.map(s => s.increase);
      const averageIncrease = memoryIncreases.reduce((a, b) => a + b, 0) / memoryIncreases.length;
      
      // Each iteration shouldn't consistently increase memory usage significantly
      expect(averageIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB per iteration
      
      // Results should be consistent
      expect(results.every(r => r.functions.length === results[0].functions.length)).toBe(true);
    });
  });

  describe('Concurrent Processing Limits', () => {
    it('should handle processing multiple large files sequentially without issues', async () => {
      const files = [];
      
      // Create multiple substantial files
      for (let fileIndex = 0; fileIndex < 5; fileIndex++) {
        const fileName = `concurrent_${fileIndex}.py`;
        const filePath = path.join(testDir, fileName);
        
        let content = `# Concurrent processing test file ${fileIndex}

`;

        for (let i = 0; i < 30; i++) {
          content += `class File${fileIndex}_Class${i}:
    """Class ${i} in file ${fileIndex}."""
    
    def process_data_${i}(self, data_size: int = ${i * 100}):
        """Process data method ${i}."""
        data = list(range(data_size))
        return [x * ${fileIndex} + ${i} for x in data if x % 2 == 0]
    
    def analyze_results_${i}(self):
        """Analyze results method ${i}.""" 
        results = self.process_data_${i}()
        return {
            'count': len(results),
            'sum': sum(results),
            'avg': sum(results) / len(results) if results else 0,
            'max': max(results) if results else 0,
            'min': min(results) if results else 0
        }

`;
        }

        await fs.writeFile(filePath, content);
        
        files.push({
          path: filePath,
          size: content.length,
          hash: `concurrent-${fileIndex}`,
          language: 'python' as const,
          lastModified: new Date(),
        });
      }

      // Process all files sequentially
      const results = [];
      let totalProcessingTime = 0;
      
      for (const fileInfo of files) {
        const startTime = Date.now();
        const result = await analyzer.analyzeFile(fileInfo, true);
        const duration = Date.now() - startTime;
        
        results.push({ result, duration });
        totalProcessingTime += duration;

        expect(result.analysisStatus).toBe('success');
        expect(result.classes.length).toBe(30);
      }

      // All files should be processed successfully
      expect(results.length).toBe(5);
      expect(results.every(r => r.result.analysisStatus === 'success')).toBe(true);
      
      // Total processing time should be reasonable
      expect(totalProcessingTime).toBeLessThan(30000); // Under 30 seconds total
      
      // Individual file processing times should be consistent
      const durations = results.map(r => r.duration);
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      
      // No file should take more than 3x longer than the fastest
      expect(maxDuration / minDuration).toBeLessThan(3);
    });
  });
});