import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { FileScanner } from '../../src/core/scanner/FileScanner.js';
import { ASTAnalyzer } from '../../src/core/analyzer/ASTAnalyzer.js';
import type { InsightConfig } from '../../src/types/index.js';

describe('Scanner + Analyzer Integration', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/integration');
  const config: InsightConfig = {
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
    await fs.ensureDir(testDir);

    // Create a simple Python file
    await fs.writeFile(
      path.join(testDir, 'simple.py'),
      `#!/usr/bin/env python3

class Calculator:
    def __init__(self):
        self.result = 0

    def add(self, x, y):
        return x + y

def hello():
    return "Hello World"

if __name__ == "__main__":
    calc = Calculator()
    print(calc.add(1, 2))
`
    );
  });

  afterAll(async () => {
    await fs.remove(testDir);
  });

  it('should scan and analyze Python files', async () => {
    const scanner = new FileScanner(config);
    const analyzer = new ASTAnalyzer();

    // Step 1: Scan files
    const scanResult = await scanner.scan(testDir);
    expect(scanResult.files).toHaveLength(1);
    expect(scanResult.files[0].language).toBe('python');

    // Step 2: Analyze the scanned file
    const fileInfo = scanResult.files[0];
    const analysisResult = await analyzer.analyzeFile(fileInfo);

    // Verify basic analysis results
    expect(analysisResult.filePath).toBe(fileInfo.path);
    expect(analysisResult.language).toBe('python');
    expect(analysisResult.lines).toBeGreaterThan(0);
    expect(analysisResult.complexity).toBeGreaterThan(1);
    
    // Should extract classes and functions
    expect(analysisResult.classes.length).toBeGreaterThanOrEqual(1);
    expect(analysisResult.functions.length).toBeGreaterThanOrEqual(1);
    
    // Check class name
    const calculatorClass = analysisResult.classes.find(c => c.name === 'Calculator');
    expect(calculatorClass).toBeDefined();

    // Check function name
    const helloFunction = analysisResult.functions.find(f => f.name === 'hello');
    expect(helloFunction).toBeDefined();
    
    console.log('Analysis completed successfully:', {
      classes: analysisResult.classes.length,
      functions: analysisResult.functions.length,
      imports: analysisResult.imports.length,
      variables: analysisResult.globalVariables.length,
      complexity: analysisResult.complexity
    });
  });

  it('should generate statistics from multiple analyses', async () => {
    const scanner = new FileScanner(config);
    const analyzer = new ASTAnalyzer();

    const scanResult = await scanner.scan(testDir);
    const analyses = [];

    for (const fileInfo of scanResult.files) {
      const result = await analyzer.analyzeFile(fileInfo);
      analyses.push(result);
    }

    const stats = analyzer.getAnalysisStats(analyses);
    expect(stats.totalFiles).toBe(scanResult.files.length);
    expect(stats.languages.python).toBeGreaterThan(0);
    expect(stats.averageComplexity).toBeGreaterThan(1);
  });
});