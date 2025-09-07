import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';
import crypto from 'crypto';
import { logger } from '@/utils/logger.js';
import { FileFilter } from './FileFilter.js';
import type { FileInfo, InsightConfig } from '@/types/index.js';

export interface ScanResult {
  files: FileInfo[];
  totalFiles: number;
  totalSize: number;
  scannedPaths: string[];
  excludedPaths: string[];
}

export class FileScanner {
  private fileFilter: FileFilter;
  private config: InsightConfig;

  constructor(config: InsightConfig) {
    this.config = config;
    this.fileFilter = new FileFilter(config.scanning);
  }

  async scan(rootPath: string): Promise<ScanResult> {
    const startTime = Date.now();
    logger.info(`Starting file scan of: ${rootPath}`);

    // Validate root path
    if (!(await fs.pathExists(rootPath))) {
      throw new Error(`Path does not exist: ${rootPath}`);
    }

    const stat = await fs.stat(rootPath);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${rootPath}`);
    }

    const result: ScanResult = {
      files: [],
      totalFiles: 0,
      totalSize: 0,
      scannedPaths: [],
      excludedPaths: [],
    };

    try {
      // Build glob patterns for supported extensions
      const extensions = this.config.scanning.includeExtensions;
      const patterns = extensions.map(ext => {
        // Remove leading dot if present
        const cleanExt = ext.startsWith('.') ? ext.slice(1) : ext;
        return path.join(rootPath, `**/*.${cleanExt}`);
      });

      logger.debug('Glob patterns:', patterns);

      // Find all matching files
      const allFiles = await this.findFiles(patterns);
      logger.debug(`Found ${allFiles.length} potential files`);

      // Process each file
      for (const filePath of allFiles) {
        try {
          const shouldInclude = await this.fileFilter.shouldProcess(filePath, rootPath);

          if (shouldInclude) {
            const fileInfo = await this.createFileInfo(filePath);
            result.files.push(fileInfo);
            result.totalSize += fileInfo.size;
            result.scannedPaths.push(filePath);
          } else {
            result.excludedPaths.push(filePath);
          }
        } catch (error) {
          logger.warn(`Failed to process file: ${filePath}`, error);
          result.excludedPaths.push(filePath);
        }
      }

      result.totalFiles = result.files.length;

      const duration = Date.now() - startTime;
      logger.info(
        `Scan completed: ${result.totalFiles} files, ${this.formatSize(result.totalSize)}, ${duration}ms`
      );

      return result;
    } catch (error) {
      logger.error('File scan failed:', error);
      throw error;
    }
  }

  private async findFiles(patterns: string[]): Promise<string[]> {
    const allFiles: string[] = [];

    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, {
          nodir: true,
          follow: false, // Don't follow symlinks
          maxDepth: 10, // Prevent infinite recursion
        });

        allFiles.push(...files);
      } catch (error) {
        logger.warn(`Failed to process pattern: ${pattern}`, error);
      }
    }

    // Remove duplicates and sort
    return [...new Set(allFiles)].sort();
  }

  private async createFileInfo(filePath: string): Promise<FileInfo> {
    const stat = await fs.stat(filePath);
    const content = await fs.readFile(filePath, 'utf8');

    // Generate content hash for change detection
    const hash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex')
      .slice(0, 16); // Use first 16 characters

    // Detect language from extension
    const ext = path.extname(filePath).toLowerCase();
    const language = this.detectLanguage(ext);

    return {
      path: filePath,
      size: stat.size,
      hash,
      language,
      lastModified: stat.mtime,
    };
  }

  private detectLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      '.py': 'python',
      '.js': 'javascript',
      '.ts': 'typescript',
      '.go': 'go',
      '.java': 'java',
      '.c': 'c',
      '.cpp': 'cpp',
      '.h': 'c',
      '.hpp': 'cpp',
    };

    return languageMap[extension] || 'unknown';
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

  // Get file statistics
  getStats(result: ScanResult): Record<string, any> {
    const languageStats: Record<string, number> = {};
    const extensionStats: Record<string, number> = {};

    for (const file of result.files) {
      languageStats[file.language] = (languageStats[file.language] || 0) + 1;

      const ext = path.extname(file.path);
      extensionStats[ext] = (extensionStats[ext] || 0) + 1;
    }

    return {
      totalFiles: result.totalFiles,
      totalSize: this.formatSize(result.totalSize),
      averageFileSize: this.formatSize(result.totalSize / result.totalFiles || 0),
      languages: languageStats,
      extensions: extensionStats,
      excludedCount: result.excludedPaths.length,
    };
  }
}