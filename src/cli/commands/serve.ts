import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import ora from 'ora';
import chalk from 'chalk';
import { logger } from '@/utils/logger.js';
import { loadConfig } from '@/utils/config.js';
import { WebServer } from '@/core/server/WebServer.js';

export interface ServeOptions {
  port?: number;
  host?: string;
  docsDir?: string;
  config?: string;
  verbose?: boolean;
  open?: boolean;
}

export function createServeCommand(): Command {
  const command = new Command('serve');

  command
    .description('Start a web server to view generated documentation')
    .option('-p, --port <number>', 'Port to run the server on', '3000')
    .option('-h, --host <host>', 'Host to bind the server to', 'localhost')
    .option('-d, --docs-dir <dir>', 'Directory containing the documentation')
    .option('-c, --config <path>', 'Path to configuration file')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-o, --open', 'Open browser automatically')
    .action(async (options: ServeOptions) => {
      // Disable spinner in CI/container environments to avoid ANSI issues
      const isCI = process.env.CI || process.env.DOCKER_CONTAINER || !process.stdout.isTTY;
      const spinner = isCI ? { 
        text: '', 
        start: () => spinner, 
        succeed: (msg?: string) => { if (msg) logger.success(msg); return spinner; },
        fail: (msg?: string) => { if (msg) logger.error(msg); return spinner; },
        warn: (msg?: string) => { if (msg) logger.warn(msg); return spinner; }
      } : ora('Starting documentation server...').start();

      try {
        // Set verbose logging if requested
        if (options.verbose) {
          logger.setLevel(0); // DEBUG level
        }

        logger.debug('Serve command called with options:', options);

        // Load configuration
        const config = await loadConfig(options.config);
        
        // Determine documentation directory
        let docsDir = options.docsDir || config.generation.outputDir;
        
        // If docsDir is relative, resolve it from current working directory
        if (!path.isAbsolute(docsDir)) {
          docsDir = path.resolve(process.cwd(), docsDir);
        }

        logger.debug('Documentation directory:', docsDir);

        // Check if documentation directory exists
        if (!(await fs.pathExists(docsDir))) {
          spinner.fail('Documentation directory not found');
          logger.error(`Documentation directory does not exist: ${docsDir}`);
          logger.info('');
          logger.info('💡 Generate documentation first:');
          logger.info(`   insight analyze /path/to/your/project -o ${docsDir}`);
          process.exit(1);
        }

        // Check if directory has any content
        const entries = await fs.readdir(docsDir);
        if (entries.length === 0) {
          spinner.warn('Documentation directory is empty');
          logger.warn(`Documentation directory is empty: ${docsDir}`);
          logger.info('');
          logger.info('💡 Generate documentation first:');
          logger.info(`   insight analyze /path/to/your/project -o ${docsDir}`);
          logger.info('');
          logger.info('📄 Server will start anyway and show a helpful message');
        }

        spinner.text = 'Initializing web server...';

        // Parse port number
        const port = parseInt(options.port?.toString() || '3000', 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error(`Invalid port number: ${options.port}. Must be between 1-65535.`);
        }

        // Create and start web server
        const server = new WebServer({
          port,
          host: options.host || 'localhost',
          docsDir,
          verbose: options.verbose
        });

        await server.start();
        spinner.succeed('Documentation server started successfully!');

        // Display server information
        const baseUrl = `http://${options.host || 'localhost'}:${port}`;
        
        logger.success('\n╔═══════════════════════════════════════════════════════════════╗');
        logger.success('║                📚 Documentation Server Ready                   ║');
        logger.success('╚═══════════════════════════════════════════════════════════════╝');
        logger.info('');
        logger.info(`  🌐 Server URL:        ${chalk.cyan(baseUrl)}`);
        logger.info(`  📁 Documentation:     ${docsDir}`);
        logger.info(`  🖥️  Local Access:      ${chalk.green(baseUrl)}`);
        if (options.host !== 'localhost' && options.host !== '127.0.0.1') {
          logger.info(`  🌍 Network Access:    ${chalk.green(baseUrl)}`);
        }
        logger.info('');
        logger.info('  📋 Available Endpoints:');
        logger.info(`     • ${chalk.blue('GET /')}              - Main documentation page`);
        logger.info(`     • ${chalk.blue('GET /api/docs')}      - Documentation structure API`);
        logger.info(`     • ${chalk.blue('GET /api/docs/:file')} - Individual file content API`);
        logger.info(`     • ${chalk.blue('GET /api/health')}    - Server health check`);
        logger.info('');
        logger.info('  🎯 Quick Links:');
        logger.info(`     • Main Page:       ${chalk.cyan(baseUrl)}`);
        logger.info(`     • API Structure:   ${chalk.cyan(`${baseUrl}/api/docs`)}`);
        logger.info(`     • Health Check:    ${chalk.cyan(`${baseUrl}/api/health`)}`);
        logger.info('');
        logger.info(`  ${chalk.dim('Press Ctrl+C to stop the server')}`);

        // Open browser if requested
        if (options.open) {
          try {
            const { default: open } = await import('open');
            await open(baseUrl);
            logger.info(`🚀 Opened ${baseUrl} in your default browser`);
          } catch (error) {
            logger.warn('Failed to open browser automatically:', error);
            logger.info(`Please open ${baseUrl} manually in your browser`);
          }
        }

        // Graceful shutdown handling
        let isShuttingDown = false;
        
        const shutdown = async (signal: string) => {
          if (isShuttingDown) return;
          isShuttingDown = true;
          
          logger.info(`\n📡 Received ${signal}, shutting down server gracefully...`);
          
          try {
            await server.stop();
            logger.success('✅ Server stopped successfully');
            process.exit(0);
          } catch (error) {
            logger.error('❌ Error during shutdown:', error);
            process.exit(1);
          }
        };

        // Handle shutdown signals
        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        
        // Keep process alive
        process.stdin.resume();

      } catch (error) {
        spinner.fail('Failed to start documentation server');
        
        if (error instanceof Error) {
          if (error.message.includes('EADDRINUSE')) {
            logger.error(`Port ${options.port || 3000} is already in use.`);
            logger.info('💡 Try a different port:');
            logger.info(`   insight serve --port 3001`);
          } else {
            logger.error('Failed to start server:', error.message);
          }
        } else {
          logger.error('An unexpected error occurred:', error);
        }
        
        process.exit(1);
      }
    });

  return command;
}