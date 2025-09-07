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

### Core Components (Not Yet Implemented)
- **Scanner Engine** - Repository structure analysis and file filtering
- **Analyzer Engine** - AST-based code analysis using Tree-sitter parsers
- **Generator Engine** - Multi-dimensional documentation generation via Claude API
- **Cache Manager** - Performance optimization and incremental updates
- **CLI Interface** - Command-line tool using Commander.js

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
Repository → Scanner → AST Parser → Chunk Manager → 
Context Builder → OpenRouter API → Template Processor → Markdown Files
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

### CLI Usage (Planned)
```bash
insight init                    # Initialize configuration
insight analyze <repo-path>     # Analyze repository structure
insight generate --full         # Generate complete documentation suite
insight generate --arch         # Architecture documentation only
insight serve --port 3000       # Serve generated docs
insight watch <path>            # Watch mode for continuous updates
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

### Language Support Priority
- **MVP**: Python only (using Tree-sitter Python parser)
- **P1**: JavaScript, TypeScript (expand Tree-sitter support)
- **P2**: Go, Java, C/C++ (additional languages)
- **P3**: Legacy languages (COBOL, Fortran) for enterprise market

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

**Current Phase**: Project initialization (Week 1)
**Next Steps**:
1. ✅ Create project structure and configuration
2. 🔄 Initialize pnpm project with dependencies  
3. ⏳ Implement basic CLI framework with Commander.js
4. ⏳ Add OpenRouter API integration
5. ⏳ Create Tree-sitter AST analysis for Python
6. ⏳ Build MVP with calmjs test repository

## Performance Requirements

- Process 100K lines of code in <10 minutes
- Support repositories up to 10GB
- Incremental updates in <1 minute
- >80% cache hit rate for cost efficiency