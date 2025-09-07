import fs from 'fs-extra';
import path from 'path';
import { InsightConfig } from '@/types/index.js';

const DEFAULT_CONFIG: InsightConfig = {
  version: '0.1.0',
  llm: {
    provider: 'openrouter',
    models: {
      primary: 'anthropic/claude-3.5-sonnet',
      fallback: 'openai/gpt-3.5-turbo',
    },
    maxTokens: 4000,
    temperature: 0.3,
  },
  scanning: {
    ignorePaths: [
      'node_modules',
      '.git',
      'dist',
      'build',
      '__pycache__',
      '.pytest_cache',
      '.coverage',
      '*.pyc',
    ],
    includeExtensions: ['.py'],
    maxFileSize: '1MB',
  },
  analysis: {
    chunkSize: 1500,
    overlapSize: 200,
    preserveBoundaries: true,
  },
  generation: {
    outputDir: 'insight-docs',
    format: 'markdown',
    templates: 'templates/',
  },
  cache: {
    enabled: true,
    location: '.insight-cache',
    ttl: 86400,
  },
};

export async function loadConfig(configPath?: string): Promise<InsightConfig> {
  const defaultPath = path.resolve(process.cwd(), 'insight.config.json');
  const finalPath = configPath || defaultPath;

  try {
    if (await fs.pathExists(finalPath)) {
      const configData = await fs.readJson(finalPath);
      return { ...DEFAULT_CONFIG, ...configData };
    }
  } catch (error) {
    console.warn(
      `Failed to load config from ${finalPath}, using defaults:`,
      error
    );
  }

  return DEFAULT_CONFIG;
}

export async function saveConfig(
  config: InsightConfig,
  configPath?: string
): Promise<void> {
  const defaultPath = path.resolve(process.cwd(), 'insight.config.json');
  const finalPath = configPath || defaultPath;

  await fs.writeJson(finalPath, config, { spaces: 2 });
}