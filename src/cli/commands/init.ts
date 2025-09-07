import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import { logger } from '@/utils/logger.js';
import { loadConfig, saveConfig } from '@/utils/config.js';
import type { InsightConfig, CliOptions } from '@/types/index.js';

export function createInitCommand(): Command {
  const command = new Command('init');

  command
    .description('Initialize Insight configuration in current directory')
    .option('-c, --config <path>', 'Path to save configuration file')
    .option('--force', 'Overwrite existing configuration')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async (options: CliOptions & { force?: boolean }) => {
      try {
        if (options.verbose) {
          logger.setLevel(0); // DEBUG level
        }

        const configPath = options.config || 'insight.config.json';
        const resolvedPath = path.resolve(process.cwd(), configPath);

        // Check if config already exists
        if (await fs.pathExists(resolvedPath)) {
          if (!options.force) {
            const { overwrite } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'overwrite',
                message: `Configuration file already exists at ${configPath}. Overwrite?`,
                default: false,
              },
            ]);

            if (!overwrite) {
              logger.info('Initialization cancelled');
              return;
            }
          }
        }

        // Load current config or defaults
        const currentConfig = await loadConfig();

        // Interactive configuration
        const answers = await inquirer.prompt([
          {
            type: 'list',
            name: 'llmProvider',
            message: 'Choose your LLM provider:',
            choices: [
              { name: 'OpenRouter (recommended)', value: 'openrouter' },
              { name: 'Anthropic Claude', value: 'anthropic' },
              { name: 'OpenAI', value: 'openai' },
            ],
            default: currentConfig.llm.provider,
          },
          {
            type: 'input',
            name: 'primaryModel',
            message: 'Primary model for analysis:',
            default: currentConfig.llm.models.primary,
            validate: (input: string) =>
              input.length > 0 || 'Model name is required',
          },
          {
            type: 'input',
            name: 'outputDir',
            message: 'Output directory for documentation:',
            default: currentConfig.generation.outputDir,
          },
          {
            type: 'checkbox',
            name: 'ignorePaths',
            message: 'Select paths to ignore during scanning:',
            choices: [
              { name: 'node_modules', checked: true },
              { name: '.git', checked: true },
              { name: 'dist', checked: true },
              { name: 'build', checked: true },
              { name: '__pycache__', checked: true },
              { name: '.pytest_cache', checked: true },
            ],
          },
          {
            type: 'confirm',
            name: 'enableCache',
            message: 'Enable caching to reduce API costs?',
            default: currentConfig.cache.enabled,
          },
        ]);

        // Update configuration with answers
        const updatedConfig: InsightConfig = {
          ...currentConfig,
          llm: {
            ...currentConfig.llm,
            provider: answers.llmProvider,
            models: {
              primary: answers.primaryModel,
              fallback: currentConfig.llm.models.fallback,
            },
          },
          generation: {
            ...currentConfig.generation,
            outputDir: answers.outputDir,
          },
          scanning: {
            ...currentConfig.scanning,
            ignorePaths: answers.ignorePaths,
          },
          cache: {
            ...currentConfig.cache,
            enabled: answers.enableCache,
          },
        };

        // Save configuration
        await saveConfig(updatedConfig, resolvedPath);

        logger.success(`Configuration saved to: ${configPath}`);
        logger.info('');
        logger.info('Next steps:');
        logger.info('1. Set up your API key:');

        switch (answers.llmProvider) {
          case 'openrouter':
            logger.info('   export OPENROUTER_API_KEY="your-key-here"');
            break;
          case 'anthropic':
            logger.info('   export ANTHROPIC_API_KEY="your-key-here"');
            break;
          case 'openai':
            logger.info('   export OPENAI_API_KEY="your-key-here"');
            break;
        }

        logger.info('2. Run: insight analyze <your-project-path>');
      } catch (error) {
        logger.error('Failed to initialize configuration:', error);
        process.exit(1);
      }
    });

  return command;
}