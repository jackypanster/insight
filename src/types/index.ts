// Core configuration types
export interface InsightConfig {
  version: string;
  llm: LLMConfig;
  scanning: ScanningConfig;
  analysis: AnalysisConfig;
  generation: GenerationConfig;
  cache: CacheConfig;
}

export interface LLMConfig {
  provider: 'openrouter' | 'anthropic' | 'openai';
  models: {
    primary: string;
    fallback: string;
  };
  maxTokens: number;
  temperature: number;
}

export interface ScanningConfig {
  ignorePaths: string[];
  includeExtensions: string[];
  maxFileSize: string;
}

export interface AnalysisConfig {
  chunkSize: number;
  overlapSize: number;
  preserveBoundaries: boolean;
}

export interface GenerationConfig {
  outputDir: string;
  format: string;
  templates: string;
}

export interface CacheConfig {
  enabled: boolean;
  location: string;
  ttl: number;
}

// Analysis result types
export interface FileInfo {
  path: string;
  size: number;
  hash: string;
  language: string;
  lastModified: Date;
}

export interface ASTNode {
  type: string;
  name?: string;
  startPosition: Position;
  endPosition: Position;
  children: ASTNode[];
  text?: string;
}

export interface Position {
  row: number;
  column: number;
}

export interface CodeChunk {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  type: 'function' | 'class' | 'module' | 'misc';
  context?: string;
}

export interface AnalysisResult {
  file: FileInfo;
  ast: ASTNode;
  chunks: CodeChunk[];
  documentation: string;
}

// CLI types
export interface CliOptions {
  verbose?: boolean;
  output?: string;
  config?: string;
}

export interface AnalyzeOptions extends CliOptions {
  language?: string;
  maxFiles?: number;
  include?: string[];
  exclude?: string[];
}