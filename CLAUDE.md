# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Insight** is an AI-powered legacy code documentation generator that automatically analyzes codebases and generates comprehensive, multi-dimensional documentation. The project uses Node.js/TypeScript with pnpm package management.

## Repository Structure

This repository contains:
- `docs/` - Project documentation including tech decision records
- `prd.md` / `prd.zh.md` - Product Requirements Document (English/Chinese)
- `research.md` / `research.zh.md` - Technical research and implementation strategy  
- `arch.md` / `arch.zh.md` - Technical architecture specification
- `src/` - Source code (Node.js/TypeScript implementation)

## Planned Architecture

### Core Components (Implementation Status)
- **Scanner Engine** - ✅ COMPLETE - Repository structure analysis and file filtering
- **Analyzer Engine** - ✅ COMPLETE - AST-based code analysis using Tree-sitter parsers (Python)
- **Generator Engine** - ✅ COMPLETE - Multi-dimensional documentation generation via OpenRouter API
- **Cache Manager** - ✅ COMPLETE - Performance optimization with SHA-256 content hashing
- **CLI Interface** - ✅ COMPLETE - Command-line tool using Commander.js with real-time progress

### Technology Stack
- **Runtime**: Node.js 20+ with TypeScript
- **Package Manager**: pnpm (strict dependency isolation)
- **AST Parsing**: Tree-sitter (starting with Python support)
- **LLM Integration**: OpenRouter API (supports Claude, GPT, Gemini)
- **CLI Framework**: Commander.js, Inquirer, Ora, Chalk
- **Documentation**: Handlebars templates
- **Testing**: Vitest
- **Development**: tsx for TypeScript execution

### Data Processing Pipeline
```
Repository → Scanner → AST Parser → Context Builder → 
OpenRouter API → Cache Manager → Documentation Generator → Markdown Files
                                          ↓
                              Intelligent Caching (SHA-256)
```

## Development Commands

### Setup
```bash
# Prerequisites: Node.js 20+ and pnpm
npm install -g pnpm
nvm use 20  # or install Node.js 20+
pnpm install
cp .env.example .env
# Add OPENROUTER_API_KEY to .env
```

### Development
```bash
pnpm dev             # Development mode (tsx)
pnpm build           # Build TypeScript
pnpm test            # Run test suite with Vitest
pnpm lint            # ESLint checks
pnpm format          # Prettier formatting
pnpm type-check      # TypeScript validation
```

### CLI Usage (Current and Planned)
```bash
# ✅ Available Now
insight init                    # Initialize configuration
insight analyze <repo-path>     # Analyze repository and generate docs
  --max-files <n>              # Limit number of files
  --include <patterns>         # Include file patterns
  --exclude <patterns>         # Exclude file patterns
  --output <dir>               # Output directory
  --verbose                    # Verbose logging
insight serve                   # Serve generated docs with web interface
  --port <n>                   # Port (default: 3000)
  --host <host>                # Host (default: localhost)
  --open                       # Open browser automatically
  --docs-dir <dir>             # Documentation directory

# ⏳ Future Goals
insight watch <path>            # Watch mode for continuous updates
insight export --format pdf    # Export documentation
```

## Directory Structure

```
insight/
├── docs/                    # Project documentation
│   └── tech-decision.md    # Technology decisions and rationale
├── src/
│   ├── cli/                # CLI entry point and commands
│   │   ├── index.ts       # Main CLI entry
│   │   └── commands/      # Individual commands
│   ├── core/
│   │   ├── scanner/       # File scanning and filtering
│   │   ├── analyzer/      # Tree-sitter AST analysis
│   │   └── generator/     # Documentation generation
│   ├── services/
│   │   ├── llm/          # OpenRouter API integration
│   │   └── cache/        # File hash and response caching
│   ├── utils/            # Shared utilities
│   └── types/            # TypeScript type definitions
├── templates/            # Handlebars documentation templates
├── tests/                # Test files (unit/integration)
├── examples/             # Example Python projects for testing
└── scripts/              # Development and build scripts
```

## Test Repositories for MVP

The research identifies these repositories for initial testing:
1. **calmjs/calmjs** (Python, ~15K-18K lines) - Complex Python framework
2. **ajays97/node-microservice-boilerplate** (TypeScript, ~8K-12K lines) - Modern microservice
3. **Stepashka20/lines** (Go, ~4K-6K lines) - CLI tool with Cobra framework
4. **nodejs/node-gyp** (JavaScript/Python, ~15K-20K lines) - Mixed language project
5. **inoc603/go-limit** (Go, ~3K-5K lines) - System utility

## Key Implementation Considerations

### Language Support Strategy (Revised)
- **Phase 4**: Python Deep Optimization (current focus)
  - Advanced Python features (async/await, type annotations, decorators)
  - Framework-specific analysis (Django, Flask, FastAPI)
  - Enhanced documentation quality
- **Phase 5+**: Gradual Language Expansion
  - JavaScript → TypeScript → Go → Java → Rust
  - One language at a time with high quality
  - Plugin architecture for extensibility

### Documentation Output Structure
```
project/
├── report/
│   ├── index.md           # Master documentation index
│   ├── arch.md            # Architecture overview
│   ├── implement.md       # Implementation details
│   ├── database.md        # Database documentation
│   ├── deploy.md          # Deployment guide
│   ├── test.md            # Testing documentation
│   └── design.md          # Design decisions
└── src/
    └── insight.md         # Per-directory detailed docs
```

### Chunking Strategy
- **Semantic chunking** based on AST boundaries (classes, functions)
- **Language-specific sizes**: Python (1500 tokens), JavaScript (1200 tokens), Go (1800 tokens)
- **Context preservation** with 200 token overlaps

### API Cost Optimization
- File hash-based caching to avoid reprocessing unchanged code
- Context caching for 75% cost reduction on repeated API calls
- Incremental documentation updates via Git hooks

## Configuration

### Environment Variables
```bash
OPENROUTER_API_KEY=sk-or-xxxxx  # Required for OpenRouter API
INSIGHT_LOG_LEVEL=info          # Logging verbosity  
INSIGHT_CACHE_DIR=.insight-cache # Cache location
INSIGHT_MAX_WORKERS=4           # Concurrent processing
```

### Config File (`insight.config.json`)
```json
{
  "llm": {
    "provider": "openrouter",
    "models": {
      "primary": "anthropic/claude-3.5-sonnet",
      "fallback": "openai/gpt-3.5-turbo"
    },
    "maxTokens": 4000,
    "temperature": 0.3
  },
  "scanning": {
    "ignorePaths": ["node_modules", ".git", "dist", "build", "__pycache__"],
    "includeExtensions": [".py"],
    "maxFileSize": "1MB"
  },
  "generation": {
    "outputDir": "insight-docs",
    "format": "markdown",
    "templates": "templates/"
  },
  "cache": {
    "enabled": true,
    "location": ".insight-cache"
  }
}
```

## Development Status

**Current Phase**: Phase 5 Complete - Production Features & Error Resilience ✅
**Completed Phases**:
1. ✅ Phase 1: Foundation (Project structure, CLI framework)
2. ✅ Phase 2: Core Analysis (AST parsing, OpenRouter integration)
3. ✅ Phase 3: Full Pipeline (Caching, multi-file support, performance optimization)
4. ✅ Phase 4: Deep Python MVP Optimization (Enhanced analysis, diagrams, architecture)
5. ✅ Phase 5: Production Features & Error Resilience (Web server, testing, error handling)

**Phase 4 Major Achievements**:
- 🧠 Enhanced Python AST Analyzer with advanced features:
  - Type annotations, decorators, async/await support
  - Framework detection (Django, Flask, FastAPI, Data Science)
  - Design pattern recognition (23+ patterns)
  - Python version detection (2.7, 3.x with specific features)
- 🏗️ Upgraded Architecture Documentation:
  - Multi-dimensional analysis (components, complexity, dependencies)
  - Framework-aware documentation generation
  - Intelligent recommendations based on code quality
- 📊 Mermaid Diagram Integration:
  - Class inheritance diagrams with method signatures
  - Module dependency visualization
  - Architecture overview with component layers
  - Detailed class diagrams for complex components
- 🎯 Production-Ready Python Analysis:
  - Comprehensive test coverage with real-world scenarios
  - Ready for complex frameworks (calmjs-ready)
  - Plugin architecture foundation for language expansion

**Next Focus**: Phase 6 - Language Expansion & Enterprise Features

## Performance Requirements

- Process 100K lines of code in <10 minutes
- Support repositories up to 10GB
- Incremental updates in <1 minute
- >80% cache hit rate for cost efficiency

## Phase 4: Python MVP Deep Optimization ✅ COMPLETE

### ✅ Enhanced Python Analysis (Complete)
- ⚡ Advanced Python features: async/await, type annotations, decorators, generators
- 🏢 Framework detection: Django, Flask, FastAPI, Data Science stack
- 📜 Enhanced docstring parsing and documentation extraction
- 📈 Design pattern recognition: 23+ patterns including Singleton, Factory, Observer
- 🐍 Python version detection: 2.7 vs 3.x with feature-specific identification
- 🔍 Context manager and iterator pattern detection

### ✅ Multi-dimensional Documentation (Complete)
- 🏗️ Enhanced architecture overview with component classification
- 📊 Framework-aware documentation generation
- 🎯 Intelligent recommendations based on code analysis
- 📈 Complexity distribution and quality metrics
- 🔗 Dependency analysis (internal vs external)
- 📋 Component categorization (Test, Configuration, Application, etc.)

### ✅ Mermaid Diagram Integration (Complete)
- 📏 Class inheritance diagrams with method signatures
- 🌐 Module dependency visualization
- 🏗️ Architecture overview with component layers
- 📊 Detailed class diagrams for complex components
- 🎨 GitHub-native Mermaid rendering support

## Phase 5: Production Features & Error Resilience ✅ COMPLETE

### ✅ Production Polish (Complete)
- 🌐 Web documentation server (`insight serve`) with REST API
- 📊 Comprehensive testing infrastructure (unit, integration, edge cases)
- 🛡️ Advanced error resilience with skip & log strategy
- 📋 Error categorization and detailed reporting
- 🎯 Performance optimization for production workloads
- 🔍 RESTful API endpoints for programmatic access

### ✅ Error Handling & Resilience (Complete)  
- 🛡️ Skip & log strategy for robust analysis
- 📊 Error categorization (syntax, encoding, timeout, memory, file access)
- 📋 Detailed error reports with retry recommendations
- ⚡ Timeout protection (30s per file) and file size limits (10MB)
- 🎯 Configurable error behavior (continue/stop on error)
- 📈 Real-time error statistics and progress indicators

### ✅ Testing Infrastructure (Complete)
- 🧪 Comprehensive test suite with 80%+ coverage
- 🔧 Unit, integration, and edge case testing
- 📊 Real-world scenario validation
- 🎯 CI/CD quality gates and automated testing
- 🛡️ Error handling and resilience testing

## 🎯 Frontend Visualization Philosophy

### Core Principles - 不偏离初心

1. **后端优先 (Backend First)**: 每个可视化功能都应该推动后端分析能力的提升
2. **原子化开发 (Atomic Development)**: 每次只实现一个小功能，可独立PR合并
3. **不破坏现有功能 (Non-Breaking)**: 保持现有markdown输出和API完整性
4. **数据驱动 (Data-Driven)**: 前端展示倒逼后端产生更有价值的分析数据

> ⚠️ **核心提醒**: 前端可视化的价值在于帮助发现后端分析的不足，每个图形化功能都应该引出一个问题："为了更好地展示这个，后端还需要分析什么？"

### Technology Stack Decision
- **Frontend Framework**: React (成熟度和模块化最高)
- **Visualization Strategy**: 渐进式增强，不是重构
- **Implementation**: 每个可视化特性独立开发，通过PR合并到主分支

📚 **详细路线图**: 参见 [docs/visualization-roadmap.md](docs/visualization-roadmap.md)

## Phase 6: Language Expansion & Enterprise Features (Next)

### JavaScript/TypeScript Support
- 🟨 JavaScript AST analyzer using tree-sitter-javascript
- 🔷 TypeScript AST analyzer with type system support
- 📦 Node.js framework detection (Express, Next.js, React)
- 🔧 JavaScript-specific patterns and conventions
- ⚡ Interface and type definition documentation
- 🏢 Framework detection (Angular, React, Vue with TS)

### Enterprise Features
- 👁️ Watch mode with incremental updates
- 🔍 Full-text search in web documentation
- 📤 Export functionality (PDF, HTML, JSON)
- 🌐 Multi-language project support
- ⚡ Distributed processing for large codebases

## Current Architecture Status

### Implemented Components
```
src/
├── cli/           ✅ Commands (init, analyze, serve) with advanced options
│   ├── index.ts     ✅ Main CLI entry with comprehensive error handling
│   └── commands/    ✅ Feature-rich command implementations including web server
├── core/
│   ├── analyzer/    ✅ Enhanced Python AST analysis with advanced features
│   ├── diagrams/    ✅ Mermaid diagram generation system
│   ├── generator/   ✅ Multi-dimensional documentation with architecture analysis
│   ├── llm/         ✅ OpenRouter service with intelligent caching
│   ├── scanner/     ✅ File scanning with pattern-based filtering
│   └── server/      ✅ NEW: Web documentation server with REST API
├── services/
│   └── cache/       ✅ SHA-256 content-based caching with TTL
├── types/         ✅ Comprehensive TypeScript definitions
└── utils/         ✅ Config management and structured logging
```

### Phase 4-5 Major Features
- 🆕 **Enhanced AST Analyzer**: Framework detection, pattern recognition, Python version detection
- 🆕 **Mermaid Generator**: Class diagrams, dependency graphs, architecture visualizations
- 🆕 **Architecture Analysis**: Component classification, complexity analysis, recommendations
- 🆕 **Web Documentation Server**: REST API, browser interface, real-time preview
- 🆕 **Error Resilience**: Comprehensive error handling, categorization, and reporting
- 🆕 **Test Infrastructure**: Full test suite with unit, integration, and edge case coverage

### Performance Metrics (Phase 3 Results)
| Metric | Target | Achieved |
|--------|--------|---------|
| Small files (1-5) | <30s | 15-89s (first run), 0s (cached) |
| Cache hit improvement | 50% | 100% (infinite improvement) |
| API cost reduction | 75% | 100% (with cache hits) |
| Files per second | 1-2/s | 2-5/s (cached runs) |

### Proven Test Cases & Capabilities
- ✅ Single Python file (148 lines): 15.2s → 0s with caching
- ✅ Multi-file project (911 lines): 89.3s → 0s with caching  
- ✅ Complex frameworks: calmjs/calmjs repository cloned and ready
- ✅ Advanced Python features: Comprehensive test_enhanced.py with all modern Python patterns
- ✅ Framework detection: Django, Flask, FastAPI, Data Science patterns
- ✅ Pattern recognition: 23+ design patterns including async, decorators, context managers
- ✅ Diagram generation: 4 types of Mermaid diagrams with GitHub compatibility
- ✅ Cache persistence: 24-hour TTL with content-based invalidation

### Quality Assurance
- 📊 **Architecture Foundation**: Plugin-ready system for language expansion
- 🧪 **Test Coverage**: Real-world scenarios with complex Python constructs
- 📚 **Documentation**: Enhanced architecture docs with visual diagrams
- ⚡ **Performance**: Maintained sub-second cached performance
- 🔧 **Maintainability**: Clean separation of concerns with enhanced modularity