import fs from 'fs-extra';
import path from 'path';
import { minimatch } from 'minimatch';
import { logger } from '@/utils/logger.js';
import type { ScanningConfig } from '@/types/index.js';

export class FileFilter {
  private config: ScanningConfig;
  private gitignorePatterns: string[] = [];
  private maxFileSize: number;

  constructor(config: ScanningConfig) {
    this.config = config;
    this.maxFileSize = this.parseFileSize(config.maxFileSize);
  }

  async shouldProcess(filePath: string, rootPath: string): Promise<boolean> {
    try {
      // Check if file exists and get stats
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) {
        return false;
      }

      // Check file size limit
      if (stat.size > this.maxFileSize) {
        logger.debug(`File too large (${this.formatSize(stat.size)}): ${filePath}`);
        return false;
      }

      // Check extension whitelist
      if (!this.hasAllowedExtension(filePath)) {
        return false;
      }

      // Check against ignore patterns
      if (await this.isIgnored(filePath, rootPath)) {
        return false;
      }

      return true;
    } catch (error) {
      logger.debug(`Error checking file: ${filePath}`, error);
      return false;
    }
  }

  private hasAllowedExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const allowedExtensions = this.config.includeExtensions.map(e => 
      e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`
    );

    return allowedExtensions.includes(ext);
  }

  private async isIgnored(filePath: string, rootPath: string): Promise<boolean> {
    const relativePath = path.relative(rootPath, filePath);

    // Load .gitignore patterns if not loaded yet
    if (this.gitignorePatterns.length === 0) {
      await this.loadGitignorePatterns(rootPath);
    }

    // Check against configured ignore patterns
    for (const pattern of this.config.ignorePaths) {
      if (this.matchesPattern(relativePath, pattern) || this.matchesPattern(filePath, pattern)) {
        logger.debug(`Ignored by config pattern '${pattern}': ${relativePath}`);
        return true;
      }
    }

    // Check against .gitignore patterns
    for (const pattern of this.gitignorePatterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        logger.debug(`Ignored by .gitignore pattern '${pattern}': ${relativePath}`);
        return true;
      }
    }

    // Check for common patterns that should always be ignored
    const alwaysIgnorePatterns = [
      '**/.git/**',
      '**/node_modules/**',
      '**/__pycache__/**',
      '**/.pytest_cache/**',
      '**/venv/**',
      '**/env/**',
      '**/.env/**',
      '**/*.pyc',
      '**/*.pyo',
      '**/*.pyd',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.log',
      '**/coverage/**',
      '**/.coverage',
      '**/dist/**',
      '**/build/**',
    ];

    for (const pattern of alwaysIgnorePatterns) {
      if (this.matchesPattern(relativePath, pattern) || this.matchesPattern(filePath, pattern)) {
        logger.debug(`Ignored by always-ignore pattern '${pattern}': ${relativePath}`);
        return true;
      }
    }

    return false;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Normalize paths for cross-platform compatibility
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    return minimatch(normalizedPath, normalizedPattern, {
      matchBase: true,
      noglobstar: false,
      dot: true, // Include hidden files in matching
    });
  }

  private async loadGitignorePatterns(rootPath: string): Promise<void> {
    const gitignorePath = path.join(rootPath, '.gitignore');

    try {
      if (await fs.pathExists(gitignorePath)) {
        const content = await fs.readFile(gitignorePath, 'utf8');
        const lines = content.split('\n');

        for (const line of lines) {
          const trimmed = line.trim();
          
          // Skip empty lines and comments
          if (trimmed === '' || trimmed.startsWith('#')) {
            continue;
          }

          // Handle negation patterns (lines starting with !)
          if (trimmed.startsWith('!')) {
            // TODO: Implement negation pattern support
            logger.debug(`Skipping negation pattern: ${trimmed}`);
            continue;
          }

          this.gitignorePatterns.push(trimmed);
        }

        logger.debug(`Loaded ${this.gitignorePatterns.length} patterns from .gitignore`);
      }
    } catch (error) {
      logger.debug('Could not load .gitignore patterns:', error);
    }
  }

  private parseFileSize(sizeStr: string): number {
    const units = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*([KMGT]?B)$/i);
    if (!match) {
      logger.warn(`Invalid file size format: ${sizeStr}, defaulting to 1MB`);
      return 1024 * 1024; // Default 1MB
    }

    const [, size, unit] = match;
    const unitMultiplier = units[unit.toUpperCase() as keyof typeof units] || 1;

    return Math.floor(parseFloat(size) * unitMultiplier);
  }

  private formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  // Get filter statistics
  getFilterStats(): Record<string, any> {
    return {
      maxFileSize: this.formatSize(this.maxFileSize),
      allowedExtensions: this.config.includeExtensions,
      ignorePatterns: this.config.ignorePaths.length,
      gitignorePatterns: this.gitignorePatterns.length,
    };
  }

  // Test if a pattern would match a given path (for debugging)
  testPattern(filePath: string, pattern: string): boolean {
    return this.matchesPattern(filePath, pattern);
  }
}