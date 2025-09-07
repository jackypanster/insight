# CLAUDE.md - Insight MVP 技术架构指南

## 项目概述

**项目:** Insight - AI 驱动的遗留代码文档生成器  
**版本:** 1.0.0-MVP  
**最后更新:** 2024年12月  
**技术栈:** Node.js/TypeScript, Claude API, Tree-sitter, MCP  

Insight 自动分析代码库，并为遗留系统生成全面、多维度的文档。本文档是 MVP 实现的技术基础。

## 系统架构

### 高层架构

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI 交互界面                          │
│                     (insight-cli/index.ts)                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                        编排层                                │
│                  (src/orchestrator/*.ts)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  扫描器  │  │  分析器  │  │  生成器  │  │  缓存    │   │
│  │  引擎    │  │  引擎    │  │  引擎    │  │  管理器  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                      核心服务                                │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │   AST 解析器 (Tree-   │  │    LLM 服务             │    │
│  │   sitter 绑定)        │  │   (Claude/OpenAI)       │    │
│  └──────────────────────┘  └──────────────────────────┘    │
│  ┌──────────────────────┐  ┌──────────────────────────┐    │
│  │   文件系统           │  │   模板引擎               │    │
│  │   处理器             │  │   (Handlebars)          │    │
│  └──────────────────────┘  └──────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 核心组件

#### 1. 扫描器引擎 (`src/scanner/`)
- **目的:** 遍历并分析代码库结构
- **关键类:**
  - `RepositoryScanner`: 主要的扫描协调器
  - `FileFilter`: 智能文件过滤 (忽略 node_modules 等)
  - `DependencyMapper`: 映射文件间的依赖关系
  - `MetadataExtractor`: 提取 git 历史、文件统计信息

#### 2. 分析器引擎 (`src/analyzer/`)
- **目的:** 使用 AST 和 LLM 进行深度代码分析
- **关键类:**
  - `ASTAnalyzer`: 基于 Tree-sitter 的解析
  - `ChunkManager`: 智能代码分块
  - `ContextBuilder`: 为 LLM 调用构建上下文
  - `SemanticAnalyzer`: 提取语义信息

#### 3. 生成器引擎 (`src/generator/`)
- **目的:** 生成多维度文档
- **关键类:**
  - `DocumentGenerator`: 主要的生成协调器
  - `MarkdownBuilder`: 结构化 Markdown 生成
  - `DiagramGenerator`: Mermaid/PlantUML 图表
  - `TemplateProcessor`: 处理文档模板

#### 4. 缓存管理器 (`src/cache/`)
- **目的:** 优化 API 调用和性能
- **关键类:**
  - `FileHashCache`: 跟踪文件变更
  - `DocumentationCache`: 存储生成的文档
  - `LLMResponseCache`: 缓存 LLM 响应
  - `IncrementalProcessor`: 处理增量更新

## 技术栈

### 核心技术

```typescript
// package.json 核心依赖
{
  "dependencies": {
    // CLI 框架
    "commander": "^11.0.0",
    "chalk": "^5.3.0",
    "ora": "^7.0.1",
    "inquirer": "^9.2.0",
    
    // AST 解析
    "tree-sitter": "^0.20.6",
    "tree-sitter-python": "^0.20.4",
    "tree-sitter-javascript": "^0.20.3",
    "tree-sitter-typescript": "^0.20.3",
    "tree-sitter-go": "^0.20.0",
    "tree-sitter-java": "^0.20.2",
    
    // LLM 集成
    "@anthropic-ai/sdk": "^0.20.0",
    "openai": "^4.28.0",
    
    // MCP 协议
    "@modelcontextprotocol/sdk": "^0.5.0",
    
    // 文件系统 & Git
    "glob": "^10.3.0",
    "simple-git": "^3.20.0",
    "chokidar": "^3.5.3",
    "ignore": "^5.3.0",
    
    // 文档生成
    "handlebars": "^4.7.8",
    "marked": "^9.1.0",
    "mermaid": "^10.6.0",
    "@mermaid-js/mermaid-cli": "^10.6.0",
    
    // 缓存 & 存储
    "level": "^8.0.0",
    "crypto-js": "^4.2.0",
    
    // 工具库
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

### 语言支持矩阵

| 语言 | 解析器 | 分块大小 | 优先级 |
|----------|--------|------------|----------|
| Python | tree-sitter-python | 1500 tokens | P0 |
| JavaScript | tree-sitter-javascript | 1200 tokens | P0 |
| TypeScript | tree-sitter-typescript | 1200 tokens | P0 |
| Go | tree-sitter-go | 1800 tokens | P0 |
| Java | tree-sitter-java | 2000 tokens | P1 |

## 实现模块

### 模块 1: 代码库扫描器

```typescript
// src/scanner/RepositoryScanner.ts
export class RepositoryScanner {
  private fileFilter: FileFilter;
  private metadataExtractor: MetadataExtractor;
  
  async scan(repoPath: string): Promise<ScanResult> {
    // 1. 验证代码库
    // 2. 构建文件树
    // 3. 提取元数据
    // 4. 识别入口点
    // 5. 映射依赖关系
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
    // 智能过滤逻辑
  }
}
```

### 模块 2: 基于 AST 的分析器

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
    // 提取类、函数、导入、导出
    // 构建语义结构
  }
}

// src/analyzer/ChunkManager.ts
export class ChunkManager {
  private readonly DEFAULT_CHUNK_SIZE = 1500;
  private readonly OVERLAP_SIZE = 200;
  
  async createChunks(ast: ASTNode, code: string): Promise<CodeChunk[]> {
    // 基于 AST 的语义分块
    // 保留上下文和关系
    // 维持函数/类的边界
  }
}
```

### 模块 3: LLM 集成层

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
    分析以下代码并生成全面的文档：
    
    ## 代码结构:
    ${context.structure}
    
    ## 源代码:
    ${context.code}
    
    ## 要求:
    1. 函数/方法的文档，包括参数和返回值
    2. 类关系和依赖
    3. 业务逻辑解释
    4. 潜在问题或技术债务
    5. 改进建议
    
    以 Markdown 格式生成文档。
    `;
  }
}
```

### 模块 4: 文档生成器

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
# 架构概览

## 系统组件
{{#each components}}
### {{name}}
{{description}}

**职责:**
{{#each responsibilities}}
- {{this}}
{{/each}}

**依赖:**
{{#each dependencies}}
- {{this}}
{{/each}}
{{/each}}

## 架构图
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
    // 生成 Mermaid 图表
    return `
graph TB
    subgraph "前端"
        A[React 应用]
    end
    subgraph "后端"
        B[API 服务器]
        C[数据库]
    end
    A --> B
    B --> C
    `;
  }
}
```

### 模块 5: MCP 集成

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
      // 处理代码分析请求
      const { filePath, language } = request.params;
      const analysis = await this.analyzeFile(filePath, language);
      return { analysis };
    });
    
    this.server.setRequestHandler('generateDocs', async (request) => {
      // 处理文档生成请求
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

## 数据流与处理管道

### 阶段 1: 扫描
```
代码库路径 → 文件过滤器 → 文件树 → 依赖图 → 扫描结果
```

### 阶段 2: 分析
```
扫描结果 → AST 解析器 → 分块管理器 → 上下文构建器 → LLM 服务 → 分析结果
```

### 阶段 3: 生成
```
分析结果 → 模板处理器 → 图表生成器 → Markdown 构建器 → 文档
```

### 阶段 4: 输出
```
文档 → 文件写入器 → report/ 目录结构
```

## 提示工程策略

### 核心提示模板

```typescript
const ANALYSIS_PROMPT = `
你是一位专业的软件架构师，正在分析一个代码库以生成全面的文档。

## 上下文
项目类型: {{projectType}}
语言: {{language}}
框架: {{framework}}

## 待分析代码
\`\`\`{{language}}
{{code}}
\`\`\`

## 分析要求

### 1. 功能分析
- 每个函数/方法的目标和职责
- 输入参数的类型和描述
- 返回值的类型和含义
- 副作用和状态变更
- 错误处理方法

### 2. 架构分析
- 使用的设计模式
- 模块关系
- 数据流模式
- 外部依赖

### 3. 业务逻辑
- 实现的核心业务规则
- 代表的领域概念
- 验证逻辑
- 业务约束

### 4. 技术债务与改进
- 代码质量问题
- 性能瓶颈
- 安全隐患
- 重构机会

请以 Markdown 格式生成结构清晰、包含示例的文档。
`;
```

### 分块策略

```typescript
export class ChunkingStrategy {
  // 用于分块的语义边界
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
    
    // 遍历 AST 并在语义边界处创建分块
    this.traverse(ast, (node) => {
      if (boundaries.includes(node.type)) {
        chunks.push(this.createChunk(node));
      }
    });
    
    return this.optimizeChunks(chunks);
  }
}
```

## 缓存与优化

### 缓存策略

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

### 性能优化

1. **并行处理**: 并发处理多个文件
2. **增量更新**: 仅重新处理变更的文件
3. **智能缓存**: 在多个层面进行缓存 (文件、AST、LLM、文档)
4. **批量 API 调用**: 在可能的情况下对 LLM 请求进行分组
5. **渐进式增强**: 首先生成基础文档，然后迭代增强

## 配置

### 配置文件 (`insight.config.json`)

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

### 环境变量

```bash
# .env
CLAUDE_API_KEY=sk-ant-xxxxx
OPENAI_API_KEY=sk-xxxxx
INSIGHT_LOG_LEVEL=info
INSIGHT_CACHE_DIR=.insight-cache
INSIGHT_MAX_WORKERS=4
INSIGHT_TIMEOUT=300000
```

## CLI 命令

### 基本命令

```bash
# 初始化项目
insight init

# 配置 API 密钥和设置
insight configure

# 分析代码库
insight analyze <path> [options]
  --language <lang>     # 指定主要语言
  --depth <level>       # 分析深度 (1-5)
  --include <pattern>   # 包含的文件模式
  --exclude <pattern>   # 排除的文件模式

# 生成文档
insight generate [options]
  --full               # 完整的文档套件
  --arch               # 仅架构
  --implement          # 仅实现细节
  --incremental        # 增量更新

# 启动文档服务
insight serve [options]
  --port <port>        # 服务器端口 (默认: 3000)
  --open               # 在浏览器中打开

# 监视模式以实现持续更新
insight watch <path> [options]
  --interval <ms>      # 监视间隔
```

## 错误处理与日志记录

```typescript
// src/utils/Logger.ts
export class Logger {
  private level: LogLevel;
  
  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }
  
  info(message: string, meta?: any) {
    console.log(chalk.blue('[信息]'), message, meta || '');
  }
  
  error(message: string, error?: Error) {
    console.error(chalk.red('[错误]'), message, error?.stack || '');
  }
  
  debug(message: string, data?: any) {
    if (this.level <= Log.DEBUG) {
      console.log(chalk.gray('[调试]'), message, data || '');
    }
  }
}

// src/utils/ErrorHandler.ts
export class ErrorHandler {
  static handle(error: Error): void {
    if (error instanceof APIError) {
      console.error('API 错误:', error.message);
      console.error('请尝试检查您的 API 密钥或速率限制');
    } else if (error instanceof ParseError) {
      console.error('解析错误:', error.message);
      console.error('文件可能包含语法错误');
    } else {
      console.error('意外错误:', error.message);
    }
    
    process.exit(1);
  }
}
```

## 测试策略

### 单元测试

```typescript
// tests/analyzer/ASTAnalyzer.test.ts
import { describe, it, expect } from 'vitest';
import { ASTAnalyzer } from '../../src/analyzer/ASTAnalyzer';

describe('ASTAnalyzer', () => {
  it('应该能正确解析 Python 函数', async () => {
    const analyzer = new ASTAnalyzer();
    const ast = await analyzer.analyzeFile('test-files/sample.py');
    
    expect(ast.functions).toHaveLength(3);
    expect(ast.functions[0].name).toBe('calculate_sum');
    expect(ast.functions[0].parameters).toHaveLength(2);
  });
});
```

### 集成测试

```typescript
// tests/integration/full-pipeline.test.ts
describe('完整流程', () => {
  it('应该能为一个小型代码库生成文档', async () => {
    const result = await insight.analyze('test-repos/small-project');
    const docs = await insight.generate(result);
    
    expect(docs.architecture).toContain('## 系统组件');
    expect(docs.implementation).toBeDefined();
    expect(docs.index).toContain('# 项目文档');
  });
});
```

## 部署与分发

### NPM 包结构

```
insight/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE
├── bin/
│   └── insight.js          # CLI 入口点
├── dist/                   # 编译后的 TypeScript
├── src/
│   ├── cli/
│   ├── scanner/
│   ├── analyzer/
│   ├── generator/
│   ├── llm/
│   ├── cache/
│   ├── mcp/
│   └── utils/
├── templates/             # 文档模板
└── tests/
```

### 构建与发布

```bash
# 构建
npm run build

# 测试
npm run test

# 发布到 NPM
npm publish

# Docker 镜像
docker build -t insight:latest .
docker push insight:latest
```

## 性能基准

| 指标 | 目标 | 当前 |
|--------|--------|---------|
| 1万行代码处理时间 | <2 分钟 | - |
| 10万行代码处理时间 | <10 分钟 | - |
| 内存使用 (10万行代码) | <2GB | - |
| API 调用 (每千行代码) | <5 | - |
| 缓存命中率 | >80% | - |
| 文档准确率 | >90% | - |

## 安全考量

1. **API 密钥管理**: 使用环境变量，切勿提交密钥
2. **文件系统访问**: 验证路径，防止目录遍历攻击
3. **代码执行**: 切勿执行被分析的代码
4. **速率限制**: 为 API 调用实施退避策略
5. **数据隐私**: 提供排除敏感文件/模式的选项

## 路线图与里程碑

### 第 1-2 周: 基础构建
- [x] 项目设置和结构
- [ ] 基础 CLI 框架
- [ ] 文件系统扫描器
- [ ] AST 解析器集成

### 第 3-4 周: 核心分析
- [ ] Claude API 集成
- [ ] 分块系统
- [ ] 上下文构建器
- [ ] 基础提示模板

### 第 5-6 周: 文档生成
- [ ] 模板引擎
- [ ] Markdown 生成器
- [ ] 图表生成
- [ ] 输出文件结构

### 第 7-8 周: 优化与完善
- [ ] 缓存系统
- [ ] 增量更新
- [ ] 错误处理
- [ ] 测试套件
- [ ] 文档

## 贡献指南

1. **代码风格**: 遵循 TypeScript 最佳实践
2. **测试**: 保持 >80% 的代码覆盖率
3. **文档**: 架构变更时更新 CLAUDE.md
4. **提交**: 使用约定式提交格式
5. **拉取请求**: 包含测试和文档

## 支持与资源

- **文档**: https://github.com/your-org/insight/docs
- **问题**: https://github.com/your-org/insight/issues
- **Discord**: https://discord.gg/insight-community
- **邮箱**: support@insight-tool.dev

---

*此 CLAUDE.md 作为 Insight MVP 的动态技术规范。请随架构演进更新此文档。*
