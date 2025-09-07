import { describe, it, expect, beforeAll, vi } from 'vitest';
import { OpenRouterService } from '../../src/core/llm/OpenRouterService.js';
import type { LLMConfig } from '../../src/types/index.js';
import type { CodeContext } from '../../src/core/llm/OpenRouterService.js';

// Mock fetch for testing
const mockFetch = vi.fn();
global.fetch = mockFetch;

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
    it('should analyze code successfully with primary model', async () => {
      const mockResponse = {
        choices: [
          {
            message: {
              content: `# Summary
This file contains a simple hello function.

## Classes and Functions
### Function: hello
Returns a greeting message.

## Quality Assessment
- Low complexity
- Easy to maintain
- Testable code
`,
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const service = new OpenRouterService(config);
      const result = await service.analyzeCode(mockContext);

      expect(result).toBeDefined();
      expect(result.summary).toContain('hello');
      expect(result.documentation).toHaveLength(1); // One function
      expect(result.quality.complexity).toBe(1);

      // Check API call
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should fallback to secondary model on primary failure', async () => {
      const mockPrimaryResponse = {
        ok: false,
        status: 400,
        text: async () => 'Model not available',
      };

      const mockFallbackResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '# Summary\nFallback analysis of the code.',
              },
            },
          ],
        }),
      };

      mockFetch
        .mockResolvedValueOnce(mockPrimaryResponse)
        .mockResolvedValueOnce(mockFallbackResponse);

      const service = new OpenRouterService(config);
      const result = await service.analyzeCode(mockContext);

      expect(result).toBeDefined();
      expect(result.summary).toContain('analysis');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should generate fallback analysis when both models fail', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      const service = new OpenRouterService(config);
      const result = await service.analyzeCode(mockContext);

      expect(result).toBeDefined();
      expect(result.summary).toContain('analysis');
      expect(result.documentation).toHaveLength(1);
      expect(result.architecture.recommendations).toContain('Add comprehensive documentation');
    });
  });

  describe('testConnection', () => {
    it('should return true for successful connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Connection successful',
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(config);
      const result = await service.testConnection();

      expect(result).toBe(true);
    });

    it('should return false for failed connection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const service = new OpenRouterService(config);
      const result = await service.testConnection();

      expect(result).toBe(false);
    });
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
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Test response',
              },
            },
          ],
        }),
      });

      const service = new OpenRouterService(config);
      
      const startTime = Date.now();
      await service.analyzeCode(mockContext);
      await service.analyzeCode(mockContext);
      const endTime = Date.now();

      // Should take at least 100ms due to rate limiting
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });
});