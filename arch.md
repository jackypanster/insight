# CLAUDE.md - Insight MVP Technical Architecture Guide

## Project Overview

**Project:** Insight - AI-Powered Legacy Code Documentation Generator  
**Version:** 1.0.0-MVP  
**Last Updated:** December 2024  
**Tech Stack:** Node.js/TypeScript, Claude API, Tree-sitter, MCP  

Insight automatically analyzes codebases and generates comprehensive, multi-dimensional documentation for legacy systems. This document serves as the technical foundation for the MVP implementation.

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Interface                         │
│                     (insight-cli/index.ts)                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                    Orchestration Layer                       │
│                  (src/orchestrator/*.ts)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Scanner  │  │ Analyzer │  │Generator │  │  Cache   │   │
│  │ Engine   │  │  Engine  │  │  Engine  │  │ Manager  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                      Core Services                           │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │   AST Parser (Tree-   │  │    LLM Service          │    │
│  │   sitter Bindings)    │  │   (Claude/OpenAI)       │    │
│  └──────────────────────┘  └──────────────────────────┘    │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │   File System        │  │   Template Engine        │    │
│  │   Handler            │  │   (Handlebars)          │    │
│  └──────────────────────┘  └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Scanner Engine (`src/scanner/`)
- **Purpose:** Traverse and analyze repository structure
- **Key Classes:**
  - `RepositoryScanner`: Main scanning orchestrator
  - `FileFilter`: Intelligent file filtering (ignore node_modules, etc.)
  - `DependencyMapper`: Map inter-file dependencies
  - `MetadataExtractor`: Extract git history, file stats

#### 2. Analyzer Engine (`src/analyzer/`)
- **Purpose:** Deep code analysis using AST and LLM
- **Key Classes:**
  - `ASTAnalyzer`: Tree-sitter based parsing
  - `ChunkManager`: Intelligent code chunking
  - `ContextBuilder`: Build context for LLM calls
  - `SemanticAnalyzer`: Extract semantic meaning

#### 3. Generator Engine (`src/generator/`)
- **Purpose:** Generate multi-dimensional documentation
- **Key Classes:**
  - `DocumentGenerator`: Main generation orchestrator
  - `MarkdownBuilder`: Structured markdown generation
  - `DiagramGenerator`: Mermaid/PlantUML diagrams
  - `TemplateProcessor`: Process documentation templates

#### 4. Cache Manager (`src/cache/`)
- **Purpose:** Optimize API calls and performance
- **Key Classes:**
  - `FileHashCache`: Track file changes
  - `DocumentationCache`: Store generated docs
  - `LLMResponseCache`: Cache LLM responses
  - `IncrementalProcessor`: Handle incremental updates

## Technology Stack

### Core Technologies

```typescript
// package.json core dependencies
{
  "dependencies": {
    // CLI Framework
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.1",
    "inquirer": "^9.2.0",
    
    // AST Parsing
    "tree-sitter": "^0.20.6",
    "tree-sitter-python": "^0.20.4",
    "tree-sitter-javascript": "^0.20.3",
    "tree-sitter-typescript": "^0.20.3",
    "tree-sitter-go": "^0.20.0",
    "tree-sitter-java": "^0.20.2",
    
    // LLM Integration
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.28.0",
    
    // MCP Protocol
    "@modelcontextprotocol/sdk": "^0.5.0",
    
    // File System & Git
    "glob": "^10.3.0",
    "simple-git": "^3.20.0",
    "chokidar": "^3.5.3",
    "ignore": "^5.3.0",
    
    // Documentation Generation
    "handlebars": "^4.7.8",
    "marked": "^9.1.0",
    "mermaid": "^10.6.0",
    "@mermaid-js/mermaid-cli": "^10.6.0",
    
    // Caching & Storage
    "level": "^8.0.0",
    "crypto-js": "^4.2.0",
    
    // Utilities
    "lodash": "^4.17.21",
    "p-limit": "^5.0.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "vitest": "^1.0.0",
    "@typescript-eslint/eslint-plugin": "^6.13.0"
  }
}
```

### Language Support Matrix

| Language | Parser | Chunk Size | Priority |
|----------|--------|------------|----------|
| Python | tree-sitter-python | 1500 tokens | P0 |
| JavaScript | tree-sitter-javascript | 1200 tokens | P0 |
| TypeScript | tree-sitter-typescript | 1200 tokens | P0 |
| Go | tree-sitter-go | 1800 tokens | P0 |
| Java | tree-sitter-java | 2000 tokens | P1 |

## Implementation Modules

### Module 1: Repository Scanner

```typescript
// src/scanner/RepositoryScanner.ts
export class RepositoryScanner {
  private fileFilter: FileFilter;
  private metadataExtractor: MetadataExtractor;
  
  async scan(repoPath: string): Promise<ScanResult> {
    // 1. Validate repository
    // 2. Build file tree
    // 3. Extract metadata
    // 4. Identify entry points
    // 5. Map dependencies
    return scanResult;
  }
}

// src/scanner/FileFilter.ts
export class FileFilter {
  private ignorePatterns = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    '*.min.js',
    'coverage/**'
  ];
  
  shouldProcess(filePath: string): boolean {
    // Intelligent filtering logic
  }
}
```

### Module 2: AST-Based Analyzer

```typescript
// src/analyzer/ASTAnalyzer.ts
import Parser from 'tree-sitter';

export class ASTAnalyzer {
  private parsers: Map<string, Parser>;
  
  constructor() {
    this.initializeParsers();
  }
  
  async analyzeFile(filePath: string): Promise<ASTNode> {
    const language = this.detectLanguage(filePath);
    const parser = this.parsers.get(language);
    const sourceCode = await fs.readFile(filePath, 'utf8');
    
    const tree = parser.parse(sourceCode);
    return this.extractStructure(tree.rootNode);
  }
  
  private extractStructure(node: Parser.SyntaxNode): ASTNode {
    // Extract classes, functions, imports, exports
    // Build semantic structure
  }
}

// src/analyzer/ChunkManager.ts
export class ChunkManager {
  private readonly DEFAULT_CHUNK_SIZE = 1500;
  private readonly OVERLAP_SIZE = 200;
  
  async createChunks(ast: ASTNode, code: string): Promise<CodeChunk[]> {
    // Semantic chunking based on AST
    // Preserve context and relationships
    // Maintain function/class boundaries
  }
}
```

### Module 3: LLM Integration Layer

```typescript
// src/llm/ClaudeService.ts
import Anthropic from '@anthropic-ai/sdk';

export class ClaudeService {
  private client: Anthropic;
  private cache: LLMResponseCache;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
    this.cache = new LLMResponseCache();
  }
  
  async analyzeCode(context: CodeContext): Promise<Analysis> {
    const cacheKey = this.generateCacheKey(context);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const prompt = this.buildPrompt(context);
    const response = await this.client.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
      metadata: { user_id: 'insight-mvp' }
    });
    
    const analysis = this.parseResponse(response);
    this.cache.set(cacheKey, analysis);
    
    return analysis;
  }
  
  private buildPrompt(context: CodeContext): string {
    return `
    Analyze the following code and generate comprehensive documentation:
    
    ## Code Structure:
    ${context.structure}
    
    ## Source Code:
    ${context.code}
    
    ## Requirements:
    1. Function/method documentation with parameters and returns
    2. Class relationships and dependencies
    3. Business logic explanation
    4. Potential issues or technical debt
    5. Suggested improvements
    
    Generate documentation in Markdown format.
    `;
  }
}
```

### Module 4: Documentation Generator

```typescript
// src/generator/DocumentGenerator.ts
export class DocumentGenerator {
  private templateEngine: TemplateEngine;
  private diagramGenerator: DiagramGenerator;
  
  async generate(analysis: ProjectAnalysis): Promise<Documentation> {
    const docs: Documentation = {
      insights: await this.generateInsights(analysis),
      architecture: await this.generateArchitecture(analysis),
      implementation: await this.generateImplementation(analysis),
      database: await this.generateDatabase(analysis),
      deployment: await this.generateDeployment(analysis),
      testing: await this.generateTesting(analysis),
      design: await this.generateDesign(analysis),
      index: await this.generateIndex(analysis)
    };
    
    return docs;
  }
  
  private async generateArchitecture(analysis: ProjectAnalysis): Promise<string> {
    const template = `
# Architecture Overview

## System Components
{{#each components}}
### {{name}}
{{description}}

**Responsibilities:**
{{#each responsibilities}}
- {{this}}
{{/each}}

**Dependencies:**
{{#each dependencies}}
- {{this}}
{{/each}}
{{/each}}

## Architecture Diagram
\`\`\`mermaid
{{architectureDiagram}}
\`\`\`
    `;
    
    return this.templateEngine.render(template, analysis);
  }
}

// src/generator/DiagramGenerator.ts
export class DiagramGenerator {
  async generateArchitectureDiagram(components: Component[]): Promise<string> {
    // Generate Mermaid diagram
    return `
graph TB
    subgraph "Frontend"
        A[React App]
    end
    subgraph "Backend"
        B[API Server]
        C[Database]
    end
    A --> B
    B --> C
    `;
  }
}
```

### Module 5: MCP Integration

```typescript
// src/mcp/MCPServer.ts
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

export class InsightMCPServer {
  private server: Server;
  
  constructor() {
    this.server = new Server(
      {
        name: 'insight-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );
    
    this.setupHandlers();
  }
  
  private setupHandlers() {
    this.server.setRequestHandler('analyzeCode', async (request) => {
      // Handle code analysis requests
      const { filePath, language } = request.params;
      const analysis = await this.analyzeFile(filePath, language);
      return { analysis };
    });
    
    this.server.setRequestHandler('generateDocs', async (request) => {
      // Handle documentation generation
      const { projectPath } = request.params;
      const docs = await this.generateProjectDocs(projectPath);
      return { docs };
    });
  }
  
  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }
}
```

## Data Flow & Processing Pipeline

### Phase 1: Scanning
```
Repository Path → FileFilter → FileTree → DependencyMap → ScanResult
```

### Phase 2: Analysis
```
ScanResult → ASTParser → ChunkManager → ContextBuilder → LLMService → Analysis
```

### Phase 3: Generation
```
Analysis → TemplateProcessor → DiagramGenerator → MarkdownBuilder → Documentation
```

### Phase 4: Output
```
Documentation → FileWriter → report/ directory structure
```

## Prompt Engineering Strategy

### Core Prompt Template

```typescript
const ANALYSIS_PROMPT = `
You are an expert software architect analyzing a codebase to generate comprehensive documentation.

## Context
Project Type: {{projectType}}
Language: {{language}}
Framework: {{framework}}

## Code to Analyze
\`\`\`{{language}}
{{code}}
\`\`\`

## Analysis Requirements

### 1. Functional Analysis
- Purpose and responsibility of each function/method
- Input parameters with types and descriptions
- Return values with types and meanings
- Side effects and state changes
- Error handling approach

### 2. Architectural Analysis
- Design patterns used
- Module relationships
- Data flow patterns
- External dependencies

### 3. Business Logic
- Core business rules implemented
- Domain concepts represented
- Validation logic
- Business constraints

### 4. Technical Debt & Improvements
- Code quality issues
- Performance bottlenecks
- Security concerns
- Refactoring opportunities

Generate structured documentation in Markdown format with clear sections and examples.
`;
```

### Chunking Strategy

```typescript
export class ChunkingStrategy {
  // Semantic boundaries for chunking
  private readonly CHUNK_BOUNDARIES = {
    python: ['class', 'def', 'async def'],
    javascript: ['class', 'function', 'const', 'let', 'var'],
    typescript: ['class', 'interface', 'function', 'const'],
    go: ['func', 'type', 'struct', 'interface'],
    java: ['class', 'interface', 'enum', 'method']
  };
  
  chunk(ast: ASTNode, language: string): CodeChunk[] {
    const boundaries = this.CHUNK_BOUNDARIES[language];
    const chunks: CodeChunk[] = [];
    
    // Traverse AST and create chunks at semantic boundaries
    this.traverse(ast, (node) => {
      if (boundaries.includes(node.type)) {
        chunks.push(this.createChunk(node));
      }
    });
    
    return this.optimizeChunks(chunks);
  }
}
```

## Caching & Optimization

### Cache Strategy

```typescript
// src/cache/CacheManager.ts
export class CacheManager {
  private fileHashCache: Map<string, string>;
  private llmResponseCache: LRUCache<string, any>;
  private documentationCache: Map<string, Documentation>;
  
  async shouldReprocess(filePath: string): Promise<boolean> {
    const currentHash = await this.computeFileHash(filePath);
    const cachedHash = this.fileHashCache.get(filePath);
    
    return currentHash !== cachedHash;
  }
  
  async getCachedResponse(prompt: string): Promise<any | null> {
    const promptHash = this.hashPrompt(prompt);
    return this.llmResponseCache.get(promptHash);
  }
  
  private async computeFileHash(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
```

### Performance Optimizations

1. **Parallel Processing**: Process multiple files concurrently
2. **Incremental Updates**: Only reprocess changed files
3. **Smart Caching**: Cache at multiple levels (file, AST, LLM, documentation)
4. **Batch API Calls**: Group LLM requests when possible
5. **Progressive Enhancement**: Generate basic docs first, enhance iteratively

## Configuration

### Configuration File (`insight.config.json`)

```json
{
  "version": "1.0.0",
  "llm": {
    "provider": "claude",
    "model": "claude-3-sonnet-20240229",
    "apiKey": "${CLAUDE_API_KEY}",
    "maxTokens": 4000,
    "temperature": 0.3
  },
  "scanning": {
    "ignorePaths": ["node_modules", ".git", "dist", "build"],
    "includeExtensions": [".js", ".ts", ".py", ".go", ".java"],
    "maxFileSize": "10MB",
    "followSymlinks": false
  },
  "chunking": {
    "strategy": "semantic",
    "maxChunkSize": 1500,
    "overlapSize": 200,
    "preserveBoundaries": true
  },
  "generation": {
    "outputDir": "report",
    "format": "markdown",
    "includeDiagrams": true,
    "diagramFormat": "mermaid",
    "generateIndex": true
  },
  "cache": {
    "enabled": true,
    "ttl": 86400,
    "maxSize": "1GB",
    "location": ".insight-cache"
  },
  "incremental": {
    "enabled": true,
    "watchMode": false,
    "gitHooks": false
  }
}
```

### Environment Variables

```bash
# .env
CLAUDE_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
INSIGHT_LOG_LEVEL=info
INSIGHT_CACHE_DIR=.insight-cache
INSIGHT_MAX_WORKERS=4
INSIGHT_TIMEOUT=300000
```

## CLI Commands

### Basic Commands

```bash
# Initialize project
insight init

# Configure API keys and settings
insight configure

# Analyze repository
insight analyze <path> [options]
  --language <lang>     # Specify primary language
  --depth <level>       # Analysis depth (1-5)
  --include <pattern>   # Include file patterns
  --exclude <pattern>   # Exclude file patterns

# Generate documentation
insight generate [options]
  --full               # Full documentation suite
  --arch               # Architecture only
  --implement          # Implementation only
  --incremental        # Incremental update

# Serve documentation
insight serve [options]
  --port <port>        # Server port (default: 3000)
  --open               # Open in browser

# Watch mode for continuous updates
insight watch <path> [options]
  --interval <ms>      # Watch interval
```

## Error Handling & Logging

```typescript
// src/utils/Logger.ts
export class Logger {
  private level: LogLevel;
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  
  info(message: string, meta?: any) {
    console.log(chalk.blue('[INFO]'), message, meta || '');
  }
  
  error(message: string, error?: Error) {
    console.error(chalk.red('[ERROR]'), message, error?.stack || '');
  }
  
  debug(message: string, data?: any) {
    if (this.level <= LogLevel.DEBUG) {
      console.log(chalk.gray('[DEBUG]'), message, data || '');
    }
  }
}

// src/utils/ErrorHandler.ts
export class ErrorHandler {
  static handle(error: Error): void {
    if (error instanceof APIError) {
      console.error('API Error:', error.message);
      console.error('Try checking your API key or rate limits');
    } else if (error instanceof ParseError) {
      console.error('Parse Error:', error.message);
      console.error('File may contain syntax errors');
    } else {
      console.error('Unexpected error:', error.message);
    }
    
    process.exit(1);
  }
}
```

## Testing Strategy

### Unit Tests

```typescript
// tests/analyzer/ASTAnalyzer.test.ts
import { describe, it, expect } from 'vitest';
import { ASTAnalyzer } from '../../src/analyzer/ASTAnalyzer';

describe('ASTAnalyzer', () => {
  it('should parse Python functions correctly', async () => {
    const analyzer = new ASTAnalyzer();
    const ast = await analyzer.analyzeFile('test-files/sample.py');
    
    expect(ast.functions).toHaveLength(3);
    expect(ast.functions[0].name).toBe('calculate_sum');
    expect(ast.functions[0].parameters).toHaveLength(2);
  });
});
```

### Integration Tests

```typescript
// tests/integration/full-pipeline.test.ts
describe('Full Pipeline', () => {
  it('should generate documentation for a small repository', async () => {
    const result = await insight.analyze('test-repos/small-project');
    const docs = await insight.generate(result);
    
    expect(docs.architecture).toContain('## System Components');
    expect(docs.implementation).toBeDefined();
    expect(docs.index).toContain('# Project Documentation');
  });
});
```

## Deployment & Distribution

### NPM Package Structure

```
insight/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── bin/
│   └── insight.js          # CLI entry point
├── dist/                   # Compiled TypeScript
├── src/
│   ├── cli/
│   ├── scanner/
│   ├── analyzer/
│   ├── generator/
│   ├── llm/
│   ├── cache/
│   ├── mcp/
│   └── utils/
├── templates/             # Documentation templates
└── tests/
```

### Build & Release

```bash
# Build
npm run build

# Test
npm run test

# Publish to NPM
npm publish

# Docker image
docker build -t insight:latest .
docker push insight:latest
```

## Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| 10K LOC Processing | <2 min | - |
| 100K LOC Processing | <10 min | - |
| Memory Usage (100K LOC) | <2GB | - |
| API Calls (per 1K LOC) | <5 | - |
| Cache Hit Rate | >80% | - |
| Documentation Accuracy | >90% | - |

## Security Considerations

1. **API Key Management**: Use environment variables, never commit keys
2. **File System Access**: Validate paths, prevent directory traversal
3. **Code Execution**: Never execute analyzed code
4. **Rate Limiting**: Implement backoff strategies for API calls
5. **Data Privacy**: Option to exclude sensitive files/patterns

## Roadmap & Milestones

### Week 1-2: Foundation
- [x] Project setup and structure
- [ ] Basic CLI framework
- [ ] File system scanner
- [ ] AST parser integration

### Week 3-4: Core Analysis
- [ ] Claude API integration
- [ ] Chunking system
- [ ] Context builder
- [ ] Basic prompt templates

### Week 5-6: Documentation Generation
- [ ] Template engine
- [ ] Markdown generators
- [ ] Diagram generation
- [ ] Output file structure

### Week 7-8: Optimization & Polish
- [ ] Caching system
- [ ] Incremental updates
- [ ] Error handling
- [ ] Testing suite
- [ ] Documentation

## Contributing Guidelines

1. **Code Style**: Follow TypeScript best practices
2. **Testing**: Maintain >80% code coverage
3. **Documentation**: Update CLAUDE.md for architectural changes
4. **Commits**: Use conventional commit format
5. **Pull Requests**: Include tests and documentation

## Support & Resources

- **Documentation**: https://github.com/your-org/insight/docs
- **Issues**: https://github.com/your-org/insight/issues
- **Discord**: https://discord.gg/insight-community
- **Email**: support@insight-tool.dev

---

*This CLAUDE.md serves as the living technical specification for Insight MVP. Update this document as the architecture evolves.*