import fs from 'fs-extra';
import path from 'path';
import { logger } from '@/utils/logger.js';

export interface ErrorContext {
  fileSize?: number;
  lineCount?: number;
  encoding?: string;
}

export interface AnalysisError {
  file: string;
  errorType: ErrorCategory;
  message: string;
  context: ErrorContext;
  canRetry: boolean;
  timestamp: string;
  stackTrace?: string;
}

export interface ErrorStatistics {
  totalFiles: number;
  successful: number;
  failed: number;
  successRate: string;
  errorsByType: Record<ErrorCategory, number>;
  processing_duration_ms: number;
}

export interface ErrorReport {
  timestamp: string;
  project: string;
  summary: ErrorStatistics;
  errors: AnalysisError[];
}

export type ErrorCategory = 
  | 'parsing_error'
  | 'syntax_error' 
  | 'encoding_error'
  | 'timeout_error'
  | 'memory_error'
  | 'file_access_error'
  | 'unknown_error';

export class ErrorCollector {
  private errors: AnalysisError[] = [];
  private totalFiles: number = 0;
  private successfulFiles: number = 0;
  private startTime: number = Date.now();

  /**
   * Log an error that occurred during analysis
   */
  logError(
    filePath: string, 
    error: Error, 
    context: ErrorContext = {}
  ): void {
    const analysisError: AnalysisError = {
      file: path.relative(process.cwd(), filePath),
      errorType: this.categorizeError(error),
      message: error.message,
      context,
      canRetry: this.isRetryable(error),
      timestamp: new Date().toISOString(),
      stackTrace: process.env.DEBUG ? error.stack : undefined
    };

    this.errors.push(analysisError);
    
    logger.warn(
      `Analysis failed for ${analysisError.file}: ${analysisError.errorType} - ${analysisError.message}`
    );
    
    if (process.env.DEBUG) {
      logger.debug(`Stack trace:`, error.stack);
    }
  }

  /**
   * Record a successful file analysis
   */
  recordSuccess(): void {
    this.successfulFiles++;
  }

  /**
   * Set total number of files to be processed
   */
  setTotalFiles(count: number): void {
    this.totalFiles = count;
  }

  /**
   * Get current error statistics
   */
  getStatistics(): ErrorStatistics {
    const failed = this.errors.length;
    const successful = this.successfulFiles;
    const total = this.totalFiles;
    
    const successRate = total > 0 
      ? `${Math.round((successful / total) * 100)}%`
      : '0%';

    const errorsByType = this.errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    return {
      totalFiles: total,
      successful,
      failed,
      successRate,
      errorsByType,
      processing_duration_ms: Date.now() - this.startTime
    };
  }

  /**
   * Check if there are any errors
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  /**
   * Get all errors
   */
  getErrors(): AnalysisError[] {
    return [...this.errors];
  }

  /**
   * Export error report to file
   */
  async exportToFile(outputPath: string, projectPath: string): Promise<void> {
    const report: ErrorReport = {
      timestamp: new Date().toISOString(),
      project: path.resolve(projectPath),
      summary: this.getStatistics(),
      errors: this.errors
    };

    try {
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeJSON(outputPath, report, { spaces: 2 });
      logger.info(`Error report saved to ${outputPath}`);
    } catch (error) {
      logger.error(`Failed to save error report: ${error}`);
      throw error;
    }
  }

  /**
   * Print summary to console
   */
  printSummary(): void {
    const stats = this.getStatistics();
    
    console.log('\n📊 Analysis Summary:');
    console.log(`   Total files: ${stats.totalFiles}`);
    console.log(`   ✅ Successful: ${stats.successful}`);
    console.log(`   ❌ Failed: ${stats.failed}`);
    console.log(`   📈 Success rate: ${stats.successRate}`);
    
    if (stats.failed > 0) {
      console.log('\n❌ Error breakdown:');
      Object.entries(stats.errorsByType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`);
      });
      console.log(`\n💡 Run with --error-report to generate detailed error log`);
    }
    
    console.log(`\n⏱️  Processing time: ${(stats.processing_duration_ms / 1000).toFixed(1)}s`);
  }

  /**
   * Categorize error based on error message and type
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();

    if (message.includes('syntax') || message.includes('unexpected token')) {
      return 'syntax_error';
    }
    
    if (message.includes('encoding') || message.includes('utf-8') || message.includes('decode')) {
      return 'encoding_error';
    }
    
    if (message.includes('timeout') || message.includes('time out')) {
      return 'timeout_error';
    }
    
    if (message.includes('memory') || message.includes('heap')) {
      return 'memory_error';
    }
    
    if (message.includes('enoent') || message.includes('access') || message.includes('permission')) {
      return 'file_access_error';
    }
    
    if (message.includes('parse') || message.includes('tree-sitter')) {
      return 'parsing_error';
    }

    return 'unknown_error';
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Syntax errors are not retryable
    if (message.includes('syntax')) {
      return false;
    }
    
    // Timeout and memory errors might be retryable with different settings
    if (message.includes('timeout') || message.includes('memory')) {
      return true;
    }
    
    // File access errors might be retryable
    if (message.includes('access') || message.includes('permission')) {
      return true;
    }
    
    // Parsing errors might be retryable with updated parsers
    return true;
  }
}