# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Insight** is an AI-powered legacy code documentation generator that automatically analyzes codebases and generates comprehensive, multi-dimensional documentation. The project is currently in the planning/design phase with no implementation yet.

## Repository Structure

This repository contains planning and research documentation:
- `prd.md` / `prd.zh.md` - Product Requirements Document (English/Chinese)
- `research.md` / `research.zh.md` - Technical research and implementation strategy  
- `arch.md` / `arch.zh.md` - Technical architecture specification
- Planning documents for a TypeScript/Node.js CLI tool

## Planned Architecture

### Core Components (Not Yet Implemented)
- **Scanner Engine** - Repository structure analysis and file filtering
- **Analyzer Engine** - AST-based code analysis using Tree-sitter parsers
- **Generator Engine** - Multi-dimensional documentation generation via Claude API
- **Cache Manager** - Performance optimization and incremental updates
- **CLI Interface** - Command-line tool using Commander.js

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **AST Parsing**: Tree-sitter (Python, JavaScript, TypeScript, Go, Java)
- **LLM Integration**: Claude API (@anthropic-ai/sdk)
- **CLI Framework**: Commander.js, Inquirer, Ora, Chalk
- **Documentation**: Handlebars templates, Mermaid diagrams
- **Testing**: Vitest

### Data Processing Pipeline
```
Repository → Scanner → AST Parser → Chunk Manager → 
Context Builder → Claude API → Template Processor → Markdown Files
```

## Development Commands (When Implementation Begins)

### Setup
```bash
# Prerequisites: Node.js 18+
npm install
cp .env.example .env
# Add CLAUDE_API_KEY to .env
```

### Development
```bash
npm run dev          # Development mode
npm run build        # Build TypeScript
npm run test         # Run test suite
npm run lint         # ESLint checks
npm run type-check   # TypeScript validation
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

## Planned Directory Structure

```
src/
├── cli/                 # CLI commands and interface
├── scanner/            # Repository scanning (RepositoryScanner, FileFilter)
├── analyzer/           # AST analysis (ASTAnalyzer, ChunkManager)
├── generator/          # Documentation generation (DocumentGenerator, DiagramGenerator)
├── cache/              # Caching system (FileHashCache, LLMResponseCache)
├── llm/                # Claude API integration (ClaudeService)
└── utils/              # Shared utilities and types

tests/                  # Unit and integration tests
templates/              # Handlebars documentation templates
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
- **P0**: Python, JavaScript, TypeScript, Go (primary MVP languages)
- **P1**: Java, C/C++ (secondary languages)
- **P2**: Legacy languages (COBOL, Fortran) for enterprise market

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
CLAUDE_API_KEY=sk-ant-xxxxx     # Required for Claude API
INSIGHT_LOG_LEVEL=info          # Logging verbosity
INSIGHT_CACHE_DIR=.insight-cache # Cache location
INSIGHT_MAX_WORKERS=4           # Concurrent processing
```

### Config File (`insight.config.json`)
```json
{
  "llm": {
    "provider": "claude",
    "model": "claude-3-sonnet-20240229",
    "maxTokens": 4000,
    "temperature": 0.3
  },
  "scanning": {
    "ignorePaths": ["node_modules", ".git", "dist", "build"],
    "includeExtensions": [".js", ".ts", ".py", ".go", ".java"]
  },
  "generation": {
    "outputDir": "report",
    "includeDiagrams": true,
    "diagramFormat": "mermaid"
  }
}
```

## Development Status

**Current Phase**: Pre-implementation planning  
**Next Steps**:
1. Initialize Node.js/TypeScript project structure
2. Implement basic CLI framework with Commander.js
3. Add Claude API integration with caching
4. Create Tree-sitter AST analysis for Python/JavaScript
5. Build MVP with identified test repositories

## Performance Requirements

- Process 100K lines of code in <10 minutes
- Support repositories up to 10GB
- Incremental updates in <1 minute
- >80% cache hit rate for cost efficiency