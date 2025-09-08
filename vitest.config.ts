import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    includeSource: ['src/**/*.{js,ts}'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8', // Use V8 coverage provider
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage',
      
      // Coverage thresholds to maintain quality
      thresholds: {
        global: {
          branches: 75,
          functions: 80,
          lines: 80,
          statements: 80
        },
        // Specific thresholds for critical modules
        'src/core/analyzer/': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85
        },
        'src/services/errors/': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90
        }
      },
      
      // Include/exclude patterns
      include: ['src/**/*.{js,ts}'],
      exclude: [
        'src/types/**',
        'src/**/*.d.ts',
        'src/**/index.ts',
        'node_modules/',
        'tests/',
        'dist/',
        '*.config.{js,ts}',
        'scripts/'
      ],
      
      // Ensure all files are included in coverage
      all: true,
      
      // Skip coverage for files with no tests
      skipFull: false,
    },
    
    // Test timeouts for long-running tests
    testTimeout: 30000, // 30 seconds
    hookTimeout: 10000, // 10 seconds
    
    // Better error reporting
    bail: process.env.CI ? 1 : 0, // Stop on first failure in CI
    reporter: process.env.CI ? ['verbose', 'github-actions'] : ['verbose'],
    
    // Test file patterns
    include: [
      'tests/**/*.{test,spec}.{js,ts}',
      'src/**/*.{test,spec}.{js,ts}'
    ],
    
    // Setup files
    setupFiles: ['./tests/setup.ts'],
    
    // Mock configuration
    deps: {
      inline: ['@vitest/utils']
    },
    
    // Pool options for better performance
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/cli': path.resolve(__dirname, './src/cli'),
      '@/core': path.resolve(__dirname, './src/core'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
    },
  },
});