import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { FileScanner } from '../../src/core/scanner/FileScanner.js';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import { OpenRouterService } from '../../src/core/llm/OpenRouterService.js';
import { DocumentationGenerator } from '../../src/core/generator/DocumentationGenerator.js';
describe.skip('Full Pipeline Integration', () => {
    const testDir = path.join(__dirname, '../../test-fixtures/full-pipeline');
    const outputDir = path.join(testDir, 'output');
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
        generation: { outputDir, format: 'markdown', templates: 'templates/' },
        cache: { enabled: true, location: '.test-cache', ttl: 86400 },
    };
    beforeAll(async () => {
        // Set up API key
        process.env.OPENROUTER_API_KEY = 'test-api-key';
        await fs.ensureDir(testDir);
        await fs.ensureDir(outputDir);
        // Create a comprehensive test Python file
        await fs.writeFile(path.join(testDir, 'calculator.py'), `#!/usr/bin/env python3
"""
A comprehensive calculator module for testing Insight.

This module demonstrates various Python constructs including:
- Classes with inheritance
- Methods with different signatures
- Async functions
- Import statements
- Global variables
"""

import math
import asyncio
from typing import List, Optional, Union


# Global configuration
DEFAULT_PRECISION = 2
MAX_HISTORY_SIZE = 100


class BaseCalculator:
    """Base calculator with basic functionality."""
    
    def __init__(self, precision: int = DEFAULT_PRECISION):
        """Initialize calculator with precision.
        
        Args:
            precision: Number of decimal places for results
        """
        self.precision = precision
        self.history: List[str] = []
    
    def add(self, a: Union[int, float], b: Union[int, float]) -> float:
        """Add two numbers.
        
        Args:
            a: First number
            b: Second number
        
        Returns:
            Sum of a and b
        """
        result = round(a + b, self.precision)
        self._record_operation(f"{a} + {b} = {result}")
        return result
    
    def subtract(self, a: Union[int, float], b: Union[int, float]) -> float:
        """Subtract b from a."""
        result = round(a - b, self.precision)
        self._record_operation(f"{a} - {b} = {result}")
        return result
    
    def _record_operation(self, operation: str) -> None:
        """Record an operation in history."""
        self.history.append(operation)
        if len(self.history) > MAX_HISTORY_SIZE:
            self.history.pop(0)
    
    def get_history(self) -> List[str]:
        """Get calculation history."""
        return self.history.copy()
    
    def clear_history(self) -> None:
        """Clear calculation history."""
        self.history.clear()


class ScientificCalculator(BaseCalculator):
    """Scientific calculator with advanced functions."""
    
    def __init__(self, precision: int = DEFAULT_PRECISION, use_radians: bool = True):
        """Initialize scientific calculator.
        
        Args:
            precision: Number of decimal places
            use_radians: Whether to use radians for trigonometric functions
        """
        super().__init__(precision)
        self.use_radians = use_radians
    
    def power(self, base: float, exponent: float) -> float:
        """Calculate base raised to the power of exponent."""
        result = round(math.pow(base, exponent), self.precision)
        self._record_operation(f"{base}^{exponent} = {result}")
        return result
    
    def sqrt(self, x: float) -> float:
        """Calculate square root."""
        if x < 0:
            raise ValueError("Cannot calculate square root of negative number")
        result = round(math.sqrt(x), self.precision)
        self._record_operation(f"sqrt({x}) = {result}")
        return result
    
    def sin(self, x: float) -> float:
        """Calculate sine."""
        angle = x if self.use_radians else math.radians(x)
        result = round(math.sin(angle), self.precision)
        self._record_operation(f"sin({x}) = {result}")
        return result


async def calculate_complex_formula(
    values: List[float], 
    operations: List[str],
    calculator: Optional[BaseCalculator] = None
) -> float:
    """Calculate complex formula asynchronously.
    
    Args:
        values: List of numeric values
        operations: List of operations to perform
        calculator: Calculator instance to use
    
    Returns:
        Final calculation result
    """
    if calculator is None:
        calculator = BaseCalculator()
    
    result = values[0]
    
    for i, operation in enumerate(operations):
        if i + 1 >= len(values):
            break
        
        # Simulate async processing
        await asyncio.sleep(0.01)
        
        if operation == "add":
            result = calculator.add(result, values[i + 1])
        elif operation == "subtract":
            result = calculator.subtract(result, values[i + 1])
        else:
            raise ValueError(f"Unsupported operation: {operation}")
    
    return result


def factorial(n: int) -> int:
    """Calculate factorial of n.
    
    Args:
        n: Non-negative integer
    
    Returns:
        Factorial of n
    
    Raises:
        ValueError: If n is negative
    """
    if n < 0:
        raise ValueError("Factorial is undefined for negative numbers")
    
    if n == 0 or n == 1:
        return 1
    
    result = 1
    for i in range(2, n + 1):
        result *= i
    
    return result


def validate_input(value: Union[str, int, float]) -> float:
    """Validate and convert input to float.
    
    Args:
        value: Input value to validate
    
    Returns:
        Validated float value
    
    Raises:
        ValueError: If input cannot be converted to float
    """
    try:
        return float(value)
    except (ValueError, TypeError):
        raise ValueError(f"Invalid input: {value}")


if __name__ == "__main__":
    # Demo usage
    calc = ScientificCalculator(precision=3)
    
    # Basic operations
    print(f"Addition: {calc.add(10.5, 20.3)}")
    print(f"Power: {calc.power(2, 8)}")
    print(f"Square root: {calc.sqrt(16)}")
    
    # History
    print(f"History: {calc.get_history()}")
    
    # Factorial
    print(f"5! = {factorial(5)}")
    
    # Input validation
    try:
        valid_num = validate_input("42.5")
        print(f"Validated: {valid_num}")
    except ValueError as e:
        print(f"Validation error: {e}")
`);
        // Note: This test will use real API if OPENROUTER_API_KEY is configured
        // Otherwise it will use fallback analysis
    });
    afterAll(async () => {
        await fs.remove(testDir);
        delete process.env.OPENROUTER_API_KEY;
    });
    it.skip('should complete full documentation pipeline with real API', async () => {
        // Skip if no real API key is configured
        if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'test-api-key') {
            console.log('Skipping full pipeline test - no API key configured');
            return;
        }
        // Step 1: Scan files
        const scanner = new FileScanner(config);
        const scanResult = await scanner.scan(testDir);
        expect(scanResult.files).toHaveLength(1);
        expect(scanResult.files[0].language).toBe('python');
        expect(scanResult.files[0].path).toContain('calculator.py');
        // Step 2: Analyze AST
        const analyzer = new ASTAnalyzer();
        const analyses = [];
        for (const fileInfo of scanResult.files) {
            const analysis = await analyzer.analyzeFile(fileInfo);
            analyses.push(analysis);
        }
        expect(analyses).toHaveLength(1);
        const analysis = analyses[0];
        expect(analysis.classes.length).toBeGreaterThanOrEqual(2); // BaseCalculator, ScientificCalculator
        expect(analysis.functions.length).toBeGreaterThanOrEqual(3); // calculate_complex_formula, factorial, validate_input
        expect(analysis.imports.length).toBeGreaterThanOrEqual(2); // math, asyncio, typing
        // Step 3: Generate LLM analysis
        const llmService = new OpenRouterService(config.llm);
        const llmAnalyses = [];
        for (let i = 0; i < analyses.length; i++) {
            const context = {
                filePath: analyses[i].filePath,
                language: analyses[i].language,
                content: await fs.readFile(scanResult.files[i].path, 'utf8'),
                ast: analyses[i],
            };
            const llmAnalysis = await llmService.analyzeCode(context);
            llmAnalyses.push(llmAnalysis);
        }
        expect(llmAnalyses).toHaveLength(1);
        const llmAnalysis = llmAnalyses[0];
        expect(llmAnalysis.summary).toBeDefined();
        expect(llmAnalysis.documentation).toBeDefined();
        expect(llmAnalysis.architecture).toBeDefined();
        // Step 4: Generate documentation
        const generator = new DocumentationGenerator(config);
        const documentation = await generator.generate(scanResult, analyses, llmAnalyses);
        expect(documentation.overview).toContain('Project Overview');
        expect(documentation.architecture).toContain('Architecture');
        expect(documentation.files).toHaveLength(1);
        expect(documentation.statistics.totalFiles).toBe(1);
        expect(documentation.statistics.totalClasses).toBeGreaterThanOrEqual(2);
        expect(documentation.statistics.totalFunctions).toBeGreaterThanOrEqual(3);
        // Step 5: Verify output files
        const readmePath = path.join(outputDir, 'README.md');
        const archPath = path.join(outputDir, 'ARCHITECTURE.md');
        const statsPath = path.join(outputDir, 'STATISTICS.json');
        const filesDir = path.join(outputDir, 'files');
        expect(await fs.pathExists(readmePath)).toBe(true);
        expect(await fs.pathExists(archPath)).toBe(true);
        expect(await fs.pathExists(statsPath)).toBe(true);
        expect(await fs.pathExists(filesDir)).toBe(true);
        // Verify content
        const readme = await fs.readFile(readmePath, 'utf8');
        expect(readme).toContain('Project Overview');
        expect(readme).toContain('1 files');
        const architecture = await fs.readFile(archPath, 'utf8');
        expect(architecture).toContain('Architecture');
        const stats = JSON.parse(await fs.readFile(statsPath, 'utf8'));
        expect(stats.totalFiles).toBe(1);
        expect(stats.languageBreakdown.python).toBe(1);
        // Verify file documentation
        const calculatorDocPath = path.join(filesDir, 'calculator.md');
        expect(await fs.pathExists(calculatorDocPath)).toBe(true);
        const fileDoc = await fs.readFile(calculatorDocPath, 'utf8');
        expect(fileDoc).toContain('# calculator.py');
        expect(fileDoc).toContain('BaseCalculator');
        expect(fileDoc).toContain('ScientificCalculator');
        expect(fileDoc).toContain('calculate_complex_formula');
        console.log('Full pipeline completed successfully!');
        console.log('Documentation generated with:');
        console.log(`- Classes: ${documentation.statistics.totalClasses}`);
        console.log(`- Functions: ${documentation.statistics.totalFunctions}`);
        console.log(`- Lines: ${documentation.statistics.totalLines}`);
        console.log(`- Average complexity: ${documentation.statistics.averageComplexity}`);
    }, 60000); // 60 second timeout for full pipeline test with real API
});
//# sourceMappingURL=full-pipeline.test.js.map