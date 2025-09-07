import fs from 'fs-extra';
import { logger } from '@/utils/logger.js';
import type { LLMConfig } from '@/types/index.js';
import type { AnalysisResult } from '../analyzer/ASTAnalyzer.js';

export interface CodeContext {
  filePath: string;
  language: string;
  content: string;
  ast: AnalysisResult;
  relatedFiles?: string[];
}

export interface DocumentationChunk {
  type: 'overview' | 'function' | 'class' | 'module';
  title: string;
  content: string;
  source: {
    filePath: string;
    startLine: number;
    endLine: number;
  };
  metadata: Record<string, any>;
}

export interface LLMAnalysis {
  summary: string;
  documentation: DocumentationChunk[];
  architecture: {
    patterns: string[];
    dependencies: string[];
    recommendations: string[];
  };
  quality: {
    complexity: number;
    maintainability: number;
    testability: number;
    issues: string[];
  };
}

export class OpenRouterService {
  private config: LLMConfig;
  private baseURL = 'https://openrouter.ai/api/v1';
  private requestCount = 0;
  private lastRequestTime = 0;

  constructor(config: LLMConfig) {
    this.config = config;
    
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY environment variable is required');
    }
  }

  async analyzeCode(context: CodeContext): Promise<LLMAnalysis> {
    const startTime = Date.now();
    logger.info(`Analyzing code with LLM: ${context.filePath}`);

    try {
      // Rate limiting
      await this.enforceRateLimit();

      const prompt = this.buildAnalysisPrompt(context);
      const response = await this.makeRequest(prompt, {
        model: this.config.models.primary,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      const analysis = this.parseAnalysisResponse(response, context);
      
      const duration = Date.now() - startTime;
      logger.info(`LLM analysis completed for ${context.filePath}: ${duration}ms`);
      
      return analysis;
    } catch (error) {
      logger.error(`LLM analysis failed for ${context.filePath}:`, error);
      
      // Try fallback model if primary fails
      if (this.config.models.fallback) {
        logger.info(`Trying fallback model: ${this.config.models.fallback}`);
        return this.analyzeCodeWithFallback(context);
      }
      
      throw error;
    }
  }

  private async analyzeCodeWithFallback(context: CodeContext): Promise<LLMAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(context);
      const response = await this.makeRequest(prompt, {
        model: this.config.models.fallback!,
        temperature: this.config.temperature,
        max_tokens: Math.min(this.config.maxTokens, 2048), // Fallback models often have lower limits
      });

      return this.parseAnalysisResponse(response, context);
    } catch (error) {
      logger.error('Fallback model also failed:', error);
      
      // Return basic analysis if LLM fails
      return this.generateFallbackAnalysis(context);
    }
  }

  private buildAnalysisPrompt(context: CodeContext): string {
    const { ast, filePath, language, content } = context;
    
    return `You are an expert software architect analyzing a codebase to generate comprehensive documentation.

## File Information
- **Path**: ${filePath}
- **Language**: ${language}
- **Lines**: ${ast.lines}
- **Complexity**: ${ast.complexity}
- **Functions**: ${ast.functions.length}
- **Classes**: ${ast.classes.length}

## AST Analysis
### Classes Found:
${ast.classes.map(cls => `- **${cls.name}**: ${cls.methods.length} methods, inherits from [${cls.baseClasses.join(', ') || 'None'}]`).join('\n')}

### Functions Found:
${ast.functions.map(fn => `- **${fn.name}**: ${fn.parameters.length} parameters${fn.isAsync ? ' (async)' : ''}`).join('\n')}

### Imports:
${ast.imports.map(imp => `- ${imp.isFrom ? 'from ' : ''}${imp.module}${imp.isFrom ? ' import ' + imp.items.join(', ') : ''}`).join('\n')}

## Source Code
\`\`\`${language}
${content.slice(0, 4000)}${content.length > 4000 ? '\n... (truncated)' : ''}
\`\`\`

## Documentation Requirements

Generate comprehensive documentation with these sections:

### 1. Summary
Provide a concise overview of the file's purpose and main functionality.

### 2. Architecture
- Design patterns used
- Key architectural decisions
- Integration points and dependencies

### 3. Classes and Functions
For each class/function, provide:
- Purpose and responsibility
- Parameters and return values
- Usage examples where helpful
- Edge cases and error handling

### 4. Quality Assessment
- Code complexity analysis
- Maintainability concerns
- Testing recommendations
- Potential improvements

Format your response as structured markdown with clear sections and subsections.`;
  }

  private async makeRequest(prompt: string, options: {
    model: string;
    temperature: number;
    max_tokens: number;
  }): Promise<string> {
    const url = `${this.baseURL}/chat/completions`;
    
    const body = {
      model: options.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature,
      max_tokens: options.max_tokens,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/insight-tool/insight',
        'X-Title': 'Insight - AI Documentation Generator',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Unexpected response format from OpenRouter API');
    }

    this.requestCount++;
    return data.choices[0].message.content;
  }

  private parseAnalysisResponse(response: string, context: CodeContext): LLMAnalysis {
    // Parse the structured markdown response
    const lines = response.split('\n');
    let currentSection = '';
    let summary = '';
    const documentation: DocumentationChunk[] = [];
    const architecture = { patterns: [], dependencies: [], recommendations: [] };
    const quality = { complexity: 0, maintainability: 0, testability: 0, issues: [] };

    // Simple parsing logic - in production, this would be more robust
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('# ') || line.startsWith('## ')) {
        currentSection = line.replace(/^#+\s*/, '').toLowerCase();
      }
      
      if (currentSection === 'summary' && line && !line.startsWith('#')) {
        summary += line + ' ';
      }
    }

    // Generate documentation chunks based on AST
    for (const cls of context.ast.classes) {
      documentation.push({
        type: 'class',
        title: `Class: ${cls.name}`,
        content: `Class ${cls.name} with ${cls.methods.length} methods.`,
        source: {
          filePath: context.filePath,
          startLine: cls.startPosition.row,
          endLine: cls.endPosition.row,
        },
        metadata: {
          methods: cls.methods.length,
          baseClasses: cls.baseClasses,
        },
      });
    }

    for (const fn of context.ast.functions) {
      documentation.push({
        type: 'function',
        title: `Function: ${fn.name}`,
        content: `Function ${fn.name} with ${fn.parameters.length} parameters.`,
        source: {
          filePath: context.filePath,
          startLine: fn.startPosition.row,
          endLine: fn.endPosition.row,
        },
        metadata: {
          parameters: fn.parameters.length,
          isAsync: fn.isAsync,
        },
      });
    }

    return {
      summary: summary.trim() || `Analysis of ${context.filePath}`,
      documentation,
      architecture: {
        patterns: ['Object-Oriented Programming'], // Default patterns
        dependencies: context.ast.imports.map(imp => imp.module),
        recommendations: ['Add unit tests', 'Add type hints'],
      },
      quality: {
        complexity: Math.min(context.ast.complexity, 10), // Normalize to 1-10
        maintainability: Math.max(10 - Math.floor(context.ast.complexity / 2), 1),
        testability: context.ast.functions.length > 0 ? 8 : 3,
        issues: context.ast.errors,
      },
    };
  }

  private generateFallbackAnalysis(context: CodeContext): LLMAnalysis {
    logger.warn(`Generating fallback analysis for ${context.filePath}`);
    
    const documentation: DocumentationChunk[] = [];
    
    // Generate basic documentation from AST
    documentation.push({
      type: 'overview',
      title: 'File Overview',
      content: `This file contains ${context.ast.classes.length} classes and ${context.ast.functions.length} functions.`,
      source: {
        filePath: context.filePath,
        startLine: 1,
        endLine: context.ast.lines,
      },
      metadata: {
        generated: 'fallback',
      },
    });

    return {
      summary: `Static analysis of ${context.filePath} - ${context.ast.classes.length} classes, ${context.ast.functions.length} functions`,
      documentation,
      architecture: {
        patterns: context.ast.classes.length > 0 ? ['Object-Oriented'] : ['Functional'],
        dependencies: context.ast.imports.map(imp => imp.module),
        recommendations: [
          'Add comprehensive documentation',
          'Consider adding unit tests',
          'Review code complexity',
        ],
      },
      quality: {
        complexity: Math.min(context.ast.complexity, 10),
        maintainability: Math.max(10 - Math.floor(context.ast.complexity / 2), 1),
        testability: 5,
        issues: context.ast.errors,
      },
    };
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minInterval = 100; // Minimum 100ms between requests

    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  // Get service statistics
  getStats(): Record<string, any> {
    return {
      requestCount: this.requestCount,
      primaryModel: this.config.models.primary,
      fallbackModel: this.config.models.fallback,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    };
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        'Test message. Please respond with "Connection successful".',
        {
          model: this.config.models.primary,
          temperature: 0,
          max_tokens: 10,
        }
      );
      
      return response.toLowerCase().includes('successful') || response.length > 0;
    } catch (error) {
      logger.error('OpenRouter connection test failed:', error);
      return false;
    }
  }
}