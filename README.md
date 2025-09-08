# Insight

AI-powered legacy code documentation generator that automatically analyzes codebases and generates comprehensive, multi-dimensional documentation.

## 🐳 Quick Start (Docker - 推荐)

使用 Docker 一键启动，无需担心环境配置问题：

```bash
# 克隆项目
git clone <repository-url>
cd insight

# 设置 API Key
cp .env.example .env
# 编辑 .env 添加 OPENROUTER_API_KEY

# 一键启动开发环境
pnpm docker:dev

# 或直接使用脚本
./deploy/scripts/docker-dev.sh
```

**就这么简单！** Docker 环境会自动：
- 解决所有原生模块编译问题
- 提供一致的 Node.js 20 + Python 3 环境
- 支持热重载和调试
- 在 http://localhost:3000 提供 Web 界面

## 📦 传统安装方式

如果您偏好本地环境：

```bash
# Install dependencies
npm install -g pnpm
pnpm install

# Set up API key
export OPENROUTER_API_KEY="your-openrouter-key-here"

# Initialize configuration
pnpm dev init

# Analyze a Python codebase
pnpm dev analyze ./your-python-project

# Preview documentation in browser
pnpm dev serve --open
```

> **注意**: 本地安装可能遇到 tree-sitter 编译问题，建议使用 Docker 方案。

## Features

### 🧠 **Enhanced Python Intelligence** (Phase 4)
- **Advanced Code Analysis**: Tree-sitter AST parsing with deep Python 3.6+ feature support (async/await, type annotations, decorators)
- **Framework Detection**: Automatically detects Django, Flask, FastAPI, Data Science stack and tailors documentation
- **Design Pattern Recognition**: Identifies 23+ patterns including Singleton, Factory, Observer, Context Manager
- **Modern Python Support**: Focused on Python 3.6+ for maximum compatibility with current projects

### 📊 **Visual Documentation** (Phase 4)
- **Mermaid Diagram Generation**: Class inheritance, module dependency, and architecture diagrams
- **GitHub-Native Rendering**: Diagrams render directly in GitHub markdown for seamless viewing
- **Multi-Dimensional Views**: Architecture overview, component classification, dependency analysis

### ⚡ **Performance & Intelligence**
- **AI-Powered Documentation**: Leverages OpenRouter API (Claude, GPT, Gemini) for natural language documentation
- **Smart Caching**: SHA-256 content-based caching with 24-hour TTL, reducing API costs by up to 100%
- **Real-time Progress**: Detailed progress indicators with ETA and performance metrics
- **Model Flexibility**: Override LLM model via environment variable for cost/quality tradeoffs
- **Intelligent Recommendations**: Code quality suggestions based on complexity and architecture analysis

### 🛡️ **Error Resilience** (Phase 5)
- **Skip & Log Strategy**: Continues analysis when files fail to parse, maintaining detailed error logs
- **Error Categorization**: Automatically categorizes errors (syntax, encoding, timeout, memory, file access)
- **Smart Recovery**: Provides partial results even when some analysis steps fail
- **Detailed Reporting**: Generates comprehensive error reports with retry recommendations
- **Configurable Behavior**: Choose between continuing on errors (default) or stopping at first failure

### 🌐 **Web Documentation Server** (Phase 5)
- **Interactive Preview**: Browse generated documentation in your browser
- **RESTful API**: Programmatic access to documentation data
- **Real-time Updates**: Instantly view documentation changes
- **Mobile Responsive**: Works seamlessly on all devices
- **GitHub Integration**: Mermaid diagrams render natively in GitHub and web interface

## Installation

### Prerequisites
- Node.js 20+
- pnpm package manager
- OpenRouter API key
- **Python 3.6+** projects (Python 2 is not supported)

### Setup
```bash
# Clone the repository
git clone <repository-url>
cd insight

# Install pnpm globally
npm install -g pnpm

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY

# Optional: Set preferred model (default: anthropic/claude-3.5-sonnet)
export MODEL="google/gemini-2.0-flash-lite-001"  # For faster, cheaper analysis
```

## Usage

### Initialize Project Configuration
```bash
pnpm dev init
```
This creates an `insight.config.json` file with your preferences for LLM provider, output directory, and scanning options.

### Analyze a Codebase
```bash
# Basic analysis
pnpm dev analyze /path/to/your/python/project

# With options
pnpm dev analyze ./src --verbose --output ./documentation

# Limit number of files (useful for testing)
pnpm dev analyze ./src --max-files 10

# Error handling options
pnpm dev analyze ./src --continue-on-error  # Continue when files fail (default)
pnpm dev analyze ./src --stop-on-error      # Stop at first error
pnpm dev analyze ./src --error-report       # Generate detailed error report

# Get help
pnpm dev analyze --help
```

### Preview Documentation
```bash
# Start web server and open browser
pnpm dev serve --open

# Custom port and host
pnpm dev serve --port 3001 --host 0.0.0.0

# Serve specific documentation directory
pnpm dev serve --docs-dir ./my-custom-docs

# API endpoints available:
# GET /                    - Home page with documentation overview
# GET /api/docs           - List all documentation files
# GET /api/docs/:file     - Get specific file content
# GET /api/health         - Health check endpoint
```

### Error Handling

Insight is designed to be resilient when analyzing real-world codebases that may contain problematic files:

```bash
# Default behavior - continue on errors with summary
pnpm dev analyze ./legacy-project

# Generate detailed error report
pnpm dev analyze ./legacy-project --error-report

# Stop immediately if any file fails to parse  
pnpm dev analyze ./critical-project --stop-on-error
```

#### Error Categories
- **Syntax Errors**: Invalid Python syntax, missing colons, indentation issues
- **Encoding Issues**: Non-UTF8 files or character encoding problems
- **File Access**: Permission denied, file locked, or network file system issues
- **Resource Limits**: Files too large (>10MB) or parsing timeouts (>30s)
- **Parsing Errors**: Complex syntax that tree-sitter cannot handle

#### Error Report Format
Error reports are saved as `insight-errors.json` with detailed information:
```json
{
  "summary": {
    "total_files": 100,
    "successful": 95,
    "failed": 5,
    "success_rate": "95%"
  },
  "errors": [
    {
      "file": "complex/advanced_script.py",
      "error_type": "syntax_error", 
      "message": "invalid syntax at line 45",
      "can_retry": false,
      "context": {
        "file_size": 1024,
        "line_count": 50,
        "encoding": "utf-8"
      }
    }
  ]
}
```

### Performance

With intelligent caching, subsequent analyses are near-instantaneous:
- **First run**: Full API analysis (e.g., 89s for 5 files)
- **Cached run**: 0s with 100% cache hit rate
- **Cache location**: `.insight-cache/` (configurable)

### Output Structure
Generated documentation will be saved to `insight-docs/` (configurable):
```
insight-docs/
├── README.md           # Project overview with statistics and framework detection
├── ARCHITECTURE.md     # Enhanced architecture with Mermaid diagrams and patterns
│                      # • Class inheritance diagrams
│                      # • Module dependency graphs
│                      # • Component classification
│                      # • Design pattern analysis
├── STATISTICS.json     # Detailed metrics with complexity distribution
└── files/             # Per-file detailed documentation
    ├── main.md        # Main module with framework-aware analysis
    └── *.md           # Each file with pattern recognition and recommendations
```

## Configuration

Edit `insight.config.json` to customize:

```json
{
  "llm": {
    "provider": "openrouter",
    "models": {
      "primary": "anthropic/claude-3.5-sonnet",
      "fallback": "openai/gpt-3.5-turbo"
    }
  },
  "scanning": {
    "includeExtensions": [".py"],
    "ignorePaths": ["__pycache__", ".git", "venv"]
  },
  "generation": {
    "outputDir": "insight-docs"
  }
}
```

## Development

### 🐳 Docker Commands (推荐)
```bash
# 开发环境
pnpm docker:dev              # 启动开发环境
pnpm docker:dev:bg           # 后台启动开发环境
pnpm docker:dev:rebuild      # 重建并启动开发环境

# 构建镜像
pnpm docker:build            # 构建生产镜像
pnpm docker:build:dev        # 构建开发镜像

# 测试
pnpm docker:test             # 运行所有测试
pnpm docker:test --unit      # 运行单元测试
pnpm docker:test --coverage  # 生成覆盖率报告

# 清理
pnpm docker:clean            # 清理容器
pnpm docker:clean --all      # 清理所有 Docker 资源
```

### 📦 传统 Commands
```bash
pnpm dev              # Run in development mode
pnpm build            # Build TypeScript
pnpm test             # Run tests
pnpm lint             # Check code style
pnpm format           # Format code
```

### Project Structure
```
src/
├── cli/              # CLI commands
├── core/             # Core analysis logic
├── services/         # External service integrations
├── utils/            # Shared utilities
└── types/            # TypeScript definitions
```

## API Keys

Get your OpenRouter API key at [openrouter.ai](https://openrouter.ai). OpenRouter provides access to multiple LLM providers through a single API.

Alternative direct API support:
- `ANTHROPIC_API_KEY` for direct Claude API access
- `OPENAI_API_KEY` for direct OpenAI API access

## Roadmap

### Phase 1-2 (Complete) ✅
- ✅ CLI framework with Commander.js
- ✅ Configuration management with interactive init
- ✅ Project structure with TypeScript and pnpm
- ✅ Tree-sitter Python AST analysis
- ✅ File scanning with intelligent filtering

### Phase 3 (Complete) ✅
- ✅ OpenRouter API integration with multiple models
- ✅ Smart caching system (SHA-256 based, 24hr TTL)
- ✅ Documentation generation pipeline
- ✅ Real-time progress indicators with ETA
- ✅ Performance metrics and cache statistics
- ✅ Multi-file project support

### Phase 4 (Complete) ✅ **Deep Python MVP Optimization**
- ✅ Enhanced Python AST analysis with advanced features
- ✅ Framework detection (Django, Flask, FastAPI, Data Science)
- ✅ Design pattern recognition (23+ patterns)
- ✅ Mermaid diagram generation (4 diagram types)
- ✅ Architecture analysis with component classification
- ✅ Python version detection and feature analysis
- ✅ Intelligent code quality recommendations

### Phase 5: Error Resilience & Production Polish (Complete) ✅
- ✅ **Error Resilience**: Skip & log strategy with comprehensive error handling
- ✅ **Error Categorization**: Automatic classification of parsing and analysis failures  
- ✅ **Error Reporting**: Detailed JSON reports with retry recommendations
- ✅ **Testing Infrastructure**: Comprehensive test suite with real-world scenarios
- ✅ **Web Documentation Server**: Interactive browser interface with REST API
- ✅ **Performance Optimization**: Memory management and timeout protection for large codebases

### Phase 6: Language Expansion & Enterprise Features (Next)
- 👁️ Real-time documentation updates via file watching  
- 🟨 JavaScript/TypeScript language support
- 🔍 Full-text search in web documentation
- 📤 Export functionality (PDF, HTML, JSON)
- 🔧 Integration with popular IDEs (VSCode, IntelliJ)
- 📦 Support for additional languages (Go, Java, C++)
- ⚡ Distributed processing for enterprise-scale projects

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📖 [Documentation](./docs/)
- 🐛 [Issues](https://github.com/your-org/insight/issues)
- 💬 [Discussions](https://github.com/your-org/insight/discussions)

---

*Built with ❤️ for developers struggling with undocumented legacy code.*