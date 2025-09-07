#!/usr/bin/env node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { createAnalyzeCommand } from './commands/analyze.js';
import { createInitCommand } from './commands/init.js';
import { logger } from '@/utils/logger.js';

// Load environment variables
dotenv.config();

const program = new Command();

program
  .name('insight')
  .description('AI-powered legacy code documentation generator')
  .version('0.1.0');

// Register commands
program.addCommand(createInitCommand());
program.addCommand(createAnalyzeCommand());

// Global error handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  logger.info('\nOperation cancelled by user');
  process.exit(0);
});

// Parse command line arguments
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}