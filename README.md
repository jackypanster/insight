# Insight

AI-powered legacy code documentation generator that automatically analyzes codebases and generates comprehensive, multi-dimensional documentation.

## 🚀 Quick Start

### 1分钟快速开始

```bash
# 克隆项目
git clone <repository-url>
cd insight

# 设置 API Key
cp .env.example .env
# 编辑 .env 添加 OPENROUTER_API_KEY

# 一键启动（推荐使用Docker）
pnpm docker:dev
```

访问 http://localhost:3000 查看生成的文档！

### 基本使用

```bash
# 分析 Python 项目（在 Docker 容器中运行）
docker exec insight-dev pnpm dev analyze ./examples

# 启动文档服务器（Web 界面自动可用）
# 访问 http://localhost:3000

# 查看帮助
docker exec insight-dev pnpm dev --help

# 或者使用容器分离的架构（推荐）
./insight-cli.sh ~/my-project        # 分析容器：代码分析和生成文档
./insight-viewer.sh --open           # 查看容器：轻量级文档服务器
```

> **🐳 完整部署指南**: 详细的安装、配置和故障排除请参考 **[部署文档](docs/deployment.md)**

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

### 🌐 **Web Documentation Server** (Phase 5) ✅
- **Interactive Preview**: Browse generated documentation in your browser
- **RESTful API**: Programmatic access to documentation data
- **Real-time Updates**: Instantly view documentation changes
- **Mobile Responsive**: Works seamlessly on all devices
- **GitHub Integration**: Mermaid diagrams render natively in GitHub and web interface

### 📊 **Enhanced Mermaid Visualization** (Iteration 1) ✅
- **Interactive Diagrams**: 7+ diagram types with zoom, pan, and download (SVG/PNG)
- **Architecture Analysis**: Class inheritance, module dependencies, and data flow
- **Method Interactions**: Sequence diagrams showing method call chains
- **State Machines**: Automatic detection and visualization of state-based classes
- **Container Separation**: Lightweight viewer container optimized for documentation serving
- **Enhanced Backend**: Improved diagram generation with architectural analysis

## Usage Examples

### 基本分析
```bash
# 确保 Docker 开发环境正在运行
pnpm docker:dev

# 分析整个 Python 项目
docker exec insight-dev pnpm dev analyze ./examples

# 分析特定目录并限制文件数量
docker exec insight-dev pnpm dev analyze ./examples --max-files 5 --verbose

# 生成详细错误报告
docker exec insight-dev pnpm dev analyze ./examples --error-report
```

### 配置管理
```bash
# 初始化项目配置（在容器中）
docker exec insight-dev pnpm dev init

# 使用自定义输出目录
docker exec insight-dev pnpm dev analyze ./examples --output ./custom-docs

# 指定特定模型（设置环境变量）
docker exec -e MODEL=google/gemini-2.0-flash-lite-001 insight-dev pnpm dev analyze ./examples
```

### 容器分离架构（Iteration 1 新功能）
```bash
# 🔍 分析容器：重型计算任务
./insight-cli.sh ~/my-python-project \
  --output ./my-docs \
  --verbose

# 🌐 查看容器：轻量级Web服务
./insight-viewer.sh \
  --docs-dir ./my-docs \
  --port 3000 \
  --open

# ✨ 功能特点
# - 分析容器：包含所有分析工具、LLM集成、AST解析
# - 查看容器：仅包含Web服务器和Mermaid渲染
# - 独立部署：可以单独运行查看容器服务多个项目
# - 资源优化：查看容器仅20MB，分析容器按需使用
```

### 文档服务
```bash
# Web 服务器在 Docker 环境启动时自动运行
# 直接访问 http://localhost:3000

# 检查服务状态
curl http://localhost:3000/api/health

# 查看可用的 API 端点
curl http://localhost:3000/api/docs
```

## 📊 输出文档结构

生成的文档保存在 `insight-docs/` 目录：

```
insight-docs/
├── README.md           # 项目概览和统计信息
├── ARCHITECTURE.md     # 架构分析和Mermaid图表
├── STATISTICS.json     # 详细指标和复杂度分析
└── files/             # 各文件详细文档
    └── *.md           # 每个文件的分析结果
```

## ⚙️ 环境要求

### 🐳 Docker 方式（强烈推荐）
- **Docker**: 20.x+ 
- **Docker Compose**: 2.x+
- **API Key**: OpenRouter 或 Anthropic/OpenAI
- **分析项目**: Python 3.6+

### 📦 本地安装方式
- **Node.js**: 20+
- **pnpm**: 8.0+
- **系统依赖**: C++ 编译工具（用于 tree-sitter）
- **⚠️ 注意**: 可能遇到原生模块编译问题

> **💡 为什么推荐 Docker**: 避免 tree-sitter 原生模块编译问题，确保一致的运行环境

详细的安装和配置步骤请参考 **[部署文档](docs/deployment.md)**

## 🔑 API 配置

在 [openrouter.ai](https://openrouter.ai) 获取 OpenRouter API Key，支持多个 LLM 提供商。

也支持直接 API：
- `ANTHROPIC_API_KEY` - Claude 直接访问
- `OPENAI_API_KEY` - OpenAI 直接访问

详细配置方法请参考 [部署文档](docs/deployment.md#配置管理)。

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

## 📚 文档和支持

- 🚀 [快速开始 - 部署指南](docs/deployment.md)
- 🧪 [测试指南](docs/testing-guide.md)
- 🔧 [已知问题](docs/known-issues.md)
- 📖 [完整文档](./docs/)
- 🐛 [问题反馈](https://github.com/your-org/insight/issues)
- 💬 [讨论交流](https://github.com/your-org/insight/discussions)

---

*Built with ❤️ for developers struggling with undocumented legacy code.*