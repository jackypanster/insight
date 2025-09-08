/**
 * Test setup file for Vitest
 * This file runs before all tests and sets up the testing environment
 */

import { beforeAll, afterAll, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';

// Global test configuration
const TEST_TIMEOUT = 30000;
const TEMP_DIR = path.join(__dirname, 'temp');

// Set global test timeout
vi.setConfig({ testTimeout: TEST_TIMEOUT });

// Global setup - runs once before all tests
beforeAll(async () => {
  // Ensure temp directory exists for test files
  await fs.ensureDir(TEMP_DIR);
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.DEBUG = 'false'; // Disable debug mode in tests unless specifically needed
  
  // Mock external dependencies that shouldn't be called during tests
  vi.mock('ora', () => ({
    default: () => ({
      start: vi.fn(),
      stop: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      text: '',
      color: 'blue',
    }),
  }));
  
  // Mock chalk for consistent output in tests
  vi.mock('chalk', () => ({
    default: {
      blue: (text: string) => text,
      green: (text: string) => text,
      red: (text: string) => text,
      yellow: (text: string) => text,
      gray: (text: string) => text,
      bold: (text: string) => text,
      dim: (text: string) => text,
    },
  }));
  
  // Suppress console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  }
  
  console.log('🧪 Test environment initialized');
});

// Global cleanup - runs once after all tests
afterAll(async () => {
  // Clean up temp directory
  try {
    await fs.remove(TEMP_DIR);
  } catch (error) {
    console.warn('Failed to clean up temp directory:', error);
  }
  
  // Restore all mocks
  vi.restoreAllMocks();
  
  console.log('🧹 Test environment cleaned up');
});

// Export utilities for tests
export const testUtils = {
  TEMP_DIR,
  TEST_TIMEOUT,
  
  /**
   * Create a temporary directory for a test
   */
  async createTempDir(testName: string): Promise<string> {
    const tempDir = path.join(TEMP_DIR, testName);
    await fs.ensureDir(tempDir);
    return tempDir;
  },
  
  /**
   * Clean up a temporary directory
   */
  async cleanupTempDir(dirPath: string): Promise<void> {
    try {
      await fs.remove(dirPath);
    } catch (error) {
      console.warn(`Failed to clean up ${dirPath}:`, error);
    }
  },
  
  /**
   * Create a test file with content
   */
  async createTestFile(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf8');
  },
  
  /**
   * Wait for a specified amount of time
   */
  async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  },
  
  /**
   * Generate a random test string
   */
  randomString(length: number = 10): string {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  /**
   * Mock environment variables for a test
   */
  mockEnv(vars: Record<string, string>): () => void {
    const originalEnv = { ...process.env };
    
    Object.assign(process.env, vars);
    
    // Return cleanup function
    return () => {
      process.env = originalEnv;
    };
  }
};

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in tests at:', promise, 'reason:', reason);
  // Don't exit the process during tests, just log the error
});

// Global error handler for uncaught exceptions in tests
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in tests:', error);
  // Don't exit the process during tests, just log the error
});

export default testUtils;