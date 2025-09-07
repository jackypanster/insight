import { describe, it, expect, beforeAll } from 'vitest';
import { OpenRouterService } from '../../src/core/llm/OpenRouterService.js';
import type { LLMConfig } from '../../src/types/index.js';
import type { CodeContext } from '../../src/core/llm/OpenRouterService.js';

describe('OpenRouterService', () => {
  const config: LLMConfig = {
    provider: 'openrouter',
    models: {
      primary: 'anthropic/claude-3.5-sonnet',
      fallback: 'openai/gpt-3.5-turbo',
    },
    maxTokens: 4000,
    temperature: 0.3,
  };

  const mockContext: CodeContext = {
    filePath: '/test/file.py',
    language: 'python',
    content: 'def hello(): return "Hello World"',
    ast: {
      filePath: '/test/file.py',
      language: 'python',
      ast: {
        type: 'module',
        name: undefined,
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 1, column: 30 },
        text: 'def hello(): return "Hello World"',
        children: [],
      },
      functions: [
        {
          type: 'function',
          name: 'hello',
          startPosition: { row: 0, column: 0 },
          endPosition: { row: 0, column: 30 },
          text: 'def hello(): return "Hello World"',
          children: [],
          parameters: [],
          decorators: [],
          isAsync: false,
        },
      ],
      classes: [],
      imports: [],
      globalVariables: [],
      complexity: 1,
      lines: 1,
      errors: [],
    },
  };

  beforeAll(() => {
    // Set up environment variable for testing
    process.env.OPENROUTER_API_KEY = 'test-api-key';
  });

  describe('constructor', () => {
    it('should initialize with valid config', () => {
      const service = new OpenRouterService(config);
      expect(service).toBeDefined();
    });

    it('should throw error without API key', () => {
      delete process.env.OPENROUTER_API_KEY;
      
      expect(() => {
        new OpenRouterService(config);
      }).toThrow('OPENROUTER_API_KEY environment variable is required');
      
      // Restore for other tests
      process.env.OPENROUTER_API_KEY = 'test-api-key';
    });
  });

  describe('analyzeCode', () => {
    it.skip('should analyze code successfully with real API', async () => {
      // Skip if no API key is available
      if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'test-api-key') {
        console.log('Skipping real API test - no API key configured');
        return;
      }

      const service = new OpenRouterService(config);
      const result = await service.analyzeCode(mockContext);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(result.documentation).toBeDefined();
      expect(result.quality.complexity).toBeGreaterThanOrEqual(0);
    }, 30000); // 30 second timeout for real API

    it('should generate fallback analysis when API unavailable', async () => {
      // Test the fallback mechanism without real API
      const service = new OpenRouterService(config);
      // @ts-ignore - accessing private method for testing
      const result = service.generateFallbackAnalysis(mockContext);

      expect(result).toBeDefined();
      expect(result.summary).toContain('analysis');
      expect(result.documentation).toHaveLength(1);
    });

    it('should handle API errors gracefully', async () => {
      // Test with invalid API key to trigger error handling
      const originalKey = process.env.OPENROUTER_API_KEY;
      process.env.OPENROUTER_API_KEY = 'invalid-key';
      
      const service = new OpenRouterService(config);
      
      try {
        const result = await service.analyzeCode(mockContext);
        // Should return fallback analysis on error
        expect(result).toBeDefined();
        expect(result.documentation).toBeDefined();
      } finally {
        process.env.OPENROUTER_API_KEY = originalKey;
      }
    });
  });

  describe('testConnection', () => {
    it.skip('should test real API connection', async () => {
      // Skip if no API key is available
      if (!process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY === 'test-api-key') {
        console.log('Skipping real API test - no API key configured');
        return;
      }

      const service = new OpenRouterService(config);
      const result = await service.testConnection();

      // Should work with real API key
      expect(result).toBe(true);
    }, 15000);
  });

  describe('getStats', () => {
    it('should return service statistics', () => {
      const service = new OpenRouterService(config);
      const stats = service.getStats();

      expect(stats).toEqual({
        requestCount: 0,
        primaryModel: 'anthropic/claude-3.5-sonnet',
        fallbackModel: 'openai/gpt-3.5-turbo',
        maxTokens: 4000,
        temperature: 0.3,
      });
    });
  });

  describe('rate limiting', () => {
    it('should enforce minimum interval between requests', async () => {
      const service = new OpenRouterService(config);
      
      const startTime = Date.now();
      // Test rate limiting with generateFallbackAnalysis (no API calls)
      // @ts-ignore - accessing private method for testing
      service.generateFallbackAnalysis(mockContext);
      // @ts-ignore - accessing private method for testing  
      await service.enforceRateLimit();
      // @ts-ignore - accessing private method for testing
      await service.enforceRateLimit();
      const endTime = Date.now();

      // Should take at least 100ms due to rate limiting
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });
});