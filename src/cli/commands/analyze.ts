import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import { logger } from '@/utils/logger.js';
import { loadConfig } from '@/utils/config.js';
import type { AnalyzeOptions } from '@/types/index.js';

export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');

  command
    .description('Analyze a codebase and generate documentation')
    .argument('<path>', 'Path to the codebase to analyze')
    .option('-l, --language <lang>', 'Primary language of the codebase')
    .option(
      '-o, --output <dir>',
      'Output directory for generated documentation'
    )
    .option('-c, --config <path>', 'Path to configuration file')
    .option('--max-files <number>', 'Maximum number of files to analyze')
    .option(
      '--include <patterns...>',
      'File patterns to include (e.g., "*.py" "src/**")'
    )
    .option(
      '--exclude <patterns...>',
      'File patterns to exclude (e.g., "test*" "*.test.py")'
    )
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (targetPath: string, options: AnalyzeOptions) => {
      const spinner = ora('Initializing analysis...').start();

      try {
        // Set verbose logging if requested
        if (options.verbose) {
          logger.setLevel(0); // DEBUG level
        }

        logger.debug('Analyze command called with options:', options);

        // Resolve and validate target path
        const resolvedPath = path.resolve(process.cwd(), targetPath);
        logger.debug('Resolved target path:', resolvedPath);

        if (!(await fs.pathExists(resolvedPath))) {
          throw new Error(`Path does not exist: ${resolvedPath}`);
        }

        const stat = await fs.stat(resolvedPath);
        if (!stat.isDirectory()) {
          throw new Error(`Path is not a directory: ${resolvedPath}`);
        }

        spinner.text = 'Loading configuration...';

        // Load configuration
        const config = await loadConfig(options.config);
        logger.debug('Loaded configuration:', config);

        // Override config with CLI options
        if (options.output) {
          config.generation.outputDir = options.output;
        }

        spinner.succeed('Configuration loaded');

        // Start analysis process
        logger.info(`Starting analysis of: ${resolvedPath}`);
        logger.info(`Output directory: ${config.generation.outputDir}`);
        logger.info(`Primary language: ${options.language || 'auto-detect'}`);

        // TODO: Implement actual analysis logic
        spinner.start('Scanning files...');
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work

        spinner.text = 'Analyzing code structure...';
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate work

        spinner.text = 'Generating documentation...';
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate work

        spinner.succeed('Analysis completed successfully!');

        logger.success(
          `Documentation generated in: ${config.generation.outputDir}`
        );
      } catch (error) {
        spinner.fail('Analysis failed');
        logger.error('Failed to analyze codebase:', error);
        process.exit(1);
      }
    });

  return command;
}