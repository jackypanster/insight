import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { WebServer, type WebServerOptions } from '../../src/core/server/WebServer.js';
import { testUtils } from '../setup.js';

describe('WebServer', () => {
  let webServer: WebServer;
  let testDocsDir: string;
  const testPort = 3333; // Use non-standard port for testing

  beforeEach(async () => {
    testDocsDir = await testUtils.createTempDir('webserver-test');
  });

  afterEach(async () => {
    if (webServer) {
      try {
        await webServer.stop();
      } catch (error) {
        // Server may not be running
      }
    }
    await testUtils.cleanupTempDir(testDocsDir);
  });

  describe('Initialization', () => {
    it('should create WebServer with valid options', () => {
      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir,
        verbose: false
      };

      webServer = new WebServer(options);
      expect(webServer).toBeDefined();
    });

    it('should handle verbose mode', () => {
      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir,
        verbose: true
      };

      webServer = new WebServer(options);
      expect(webServer).toBeDefined();
    });
  });

  describe('Documentation Structure', () => {
    it('should handle empty documentation directory', async () => {
      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Access private method for testing
      const getDocsStructure = (webServer as any).getDocsStructure.bind(webServer);
      const structure = await getDocsStructure();

      expect(structure.files).toEqual([]);
      expect(structure.directories).toEqual([]);
      expect(structure.totalFiles).toBe(0);
      expect(structure.lastModified).toBeNull();
    });

    it('should scan documentation structure with files', async () => {
      // Create test documentation files
      await testUtils.createTestFile(
        path.join(testDocsDir, 'README.md'),
        '# Test Documentation\n\nThis is a test file.'
      );
      
      await testUtils.createTestFile(
        path.join(testDocsDir, 'ARCHITECTURE.md'),
        '# Architecture\n\nSystem architecture overview.'
      );

      await fs.ensureDir(path.join(testDocsDir, 'files'));
      await testUtils.createTestFile(
        path.join(testDocsDir, 'files', 'module1.md'),
        '# Module 1\n\nModule documentation.'
      );

      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Access private method for testing
      const getDocsStructure = (webServer as any).getDocsStructure.bind(webServer);
      const structure = await getDocsStructure();

      expect(structure.totalFiles).toBe(3);
      expect(structure.files).toHaveLength(2); // README.md and ARCHITECTURE.md
      expect(structure.directories).toHaveLength(1); // files directory
      
      // Check files structure
      const readmeFile = structure.files.find((f: any) => f.name === 'README.md');
      expect(readmeFile).toBeDefined();
      expect(readmeFile.type).toBe('md');
      expect(readmeFile.size).toBeGreaterThan(0);

      // Check directories structure
      const filesDir = structure.directories[0];
      expect(filesDir.name).toBe('files');
      expect(filesDir.totalFiles).toBe(1);
      expect(filesDir.files).toHaveLength(1);
      expect(filesDir.files[0].name).toBe('module1.md');
    });

    it('should handle nested directory structure', async () => {
      // Create nested structure
      await fs.ensureDir(path.join(testDocsDir, 'deep', 'nested'));
      await testUtils.createTestFile(
        path.join(testDocsDir, 'deep', 'nested', 'deep.md'),
        '# Deep Documentation'
      );

      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Access private method for testing
      const getDocsStructure = (webServer as any).getDocsStructure.bind(webServer);
      const structure = await getDocsStructure();

      expect(structure.totalFiles).toBe(1);
      expect(structure.directories).toHaveLength(1);
      
      const deepDir = structure.directories[0];
      expect(deepDir.name).toBe('deep');
      expect(deepDir.totalFiles).toBe(1);
      expect(deepDir.directories).toHaveLength(1);
      
      const nestedDir = deepDir.directories[0];
      expect(nestedDir.name).toBe('nested');
      expect(nestedDir.files).toHaveLength(1);
      expect(nestedDir.files[0].name).toBe('deep.md');
    });
  });

  describe('HTML Generation', () => {
    it('should wrap markdown in HTML properly', () => {
      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Access private method for testing
      const wrapMarkdownInHTML = (webServer as any).wrapMarkdownInHTML.bind(webServer);
      const markdown = '# Test\n\nThis is a test.';
      const html = wrapMarkdownInHTML(markdown, 'Test Title');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Test Title - Insight Documentation</title>');
      expect(html).toContain('# Test');
      expect(html).toContain('This is a test.');
      expect(html).toContain('font-family:');
      expect(html).toContain('/api/docs');
      expect(html).toContain('/api/health');
    });

    it('should create proper 404 page', () => {
      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Access private method for testing
      const create404Page = (webServer as any).create404Page.bind(webServer);
      const html = create404Page();

      expect(html).toContain('404 - Documentation Not Found');
      expect(html).toContain('insight analyze');
      expect(html).toContain('insight serve');
      expect(html).toContain(testDocsDir);
      expect(html).toContain('/api/health');
      expect(html).toContain('/api/docs');
    });
  });

  describe('Server Lifecycle', () => {
    it('should start server successfully on available port', async () => {
      const options: WebServerOptions = {
        port: testPort,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Should not throw
      await expect(webServer.start()).resolves.toBeUndefined();
    }, 10000); // 10 second timeout for server start

    it('should stop server gracefully', async () => {
      const options: WebServerOptions = {
        port: testPort + 1, // Different port
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      await webServer.start();
      
      // Should not throw
      await expect(webServer.stop()).resolves.toBeUndefined();
    }, 10000);

    it('should handle port already in use error', async () => {
      const options: WebServerOptions = {
        port: testPort + 2,
        host: 'localhost',
        docsDir: testDocsDir
      };

      const webServer1 = new WebServer(options);
      const webServer2 = new WebServer(options);

      await webServer1.start();

      // Second server should fail with port in use
      await expect(webServer2.start()).rejects.toThrow(/Port .* is already in use/);

      await webServer1.stop();
    }, 15000);

    it('should handle stop when server not running', async () => {
      const options: WebServerOptions = {
        port: testPort + 3,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Should not throw even if server is not running
      await expect(webServer.stop()).resolves.toBeUndefined();
    });
  });

  describe('Server Integration', () => {
    it('should serve documentation when available', async () => {
      // Create test documentation
      await testUtils.createTestFile(
        path.join(testDocsDir, 'README.md'),
        '# Test Documentation\n\nThis is integration test documentation.'
      );

      const options: WebServerOptions = {
        port: testPort + 4,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      await webServer.start();

      // Test would require actual HTTP requests which might be complex in unit tests
      // This test validates the server can start with real documentation
      expect(webServer).toBeDefined();

      await webServer.stop();
    }, 10000);

    it('should handle missing documentation directory', async () => {
      const nonExistentDir = path.join(testDocsDir, 'non-existent');
      
      const options: WebServerOptions = {
        port: testPort + 5,
        host: 'localhost',
        docsDir: nonExistentDir
      };

      webServer = new WebServer(options);
      
      // Should still start, but serve 404 for documentation
      await expect(webServer.start()).resolves.toBeUndefined();
      
      await webServer.stop();
    }, 10000);
  });

  describe('Directory Structure Edge Cases', () => {
    it('should handle permission errors gracefully', async () => {
      const options: WebServerOptions = {
        port: testPort + 6,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Mock fs.readdir to simulate permission error
      const originalReaddir = fs.readdir;
      vi.spyOn(fs, 'readdir').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      try {
        // Access private method for testing
        const getDirectoryStructure = (webServer as any).getDirectoryStructure.bind(webServer);
        const structure = await getDirectoryStructure('/fake/path');
        
        expect(structure.files).toEqual([]);
        expect(structure.directories).toEqual([]);
        expect(structure.totalFiles).toBe(0);
      } finally {
        fs.readdir = originalReaddir;
      }
    });

    it('should handle symbolic links', async () => {
      // Create a real file
      const realFile = path.join(testDocsDir, 'real.md');
      await testUtils.createTestFile(realFile, '# Real File');

      // Create symbolic link (if supported)
      const linkFile = path.join(testDocsDir, 'link.md');
      try {
        await fs.symlink(realFile, linkFile);
      } catch (error) {
        // Skip test if symlinks not supported (e.g., Windows without admin)
        console.log('Symlink test skipped:', error);
        return;
      }

      const options: WebServerOptions = {
        port: testPort + 7,
        host: 'localhost',
        docsDir: testDocsDir
      };

      webServer = new WebServer(options);
      
      // Access private method for testing
      const getDocsStructure = (webServer as any).getDocsStructure.bind(webServer);
      const structure = await getDocsStructure();

      // Should handle both real file and symlink
      expect(structure.totalFiles).toBe(2);
      expect(structure.files).toHaveLength(2);
      
      const fileNames = structure.files.map((f: any) => f.name);
      expect(fileNames).toContain('real.md');
      expect(fileNames).toContain('link.md');
    });
  });
});