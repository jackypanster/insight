# Insight

AI-powered legacy code documentation generator that automatically analyzes codebases and generates comprehensive, multi-dimensional documentation.

## Quick Start

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
```

## Features

- **Intelligent Code Analysis**: Uses Tree-sitter AST parsing for accurate code understanding
- **AI-Powered Documentation**: Leverages OpenRouter API (Claude, GPT, Gemini) for natural language documentation
- **Multi-Modal Output**: Generates comprehensive markdown documentation with different perspectives
- **Smart Caching**: SHA-256 content-based caching with 24-hour TTL, reducing API costs by up to 100%
- **Real-time Progress**: Detailed progress indicators with ETA and performance metrics
- **Model Flexibility**: Override LLM model via environment variable for cost/quality tradeoffs
- **Python Focus**: MVP specifically optimized for Python codebases

## Installation

### Prerequisites
- Node.js 20+
- pnpm package manager
- OpenRouter API key

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

# Get help
pnpm dev analyze --help
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
├── README.md           # Project overview with statistics
├── ARCHITECTURE.md     # System architecture and complexity analysis
├── STATISTICS.json     # Detailed metrics and analysis data
└── files/             # Per-file detailed documentation
    ├── main.md        # Main module documentation
    └── *.md           # Documentation for each analyzed file
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

### Commands
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

### Planned Features
- JavaScript/TypeScript language support
- Real-time documentation updates via file watching
- Web UI for documentation viewing
- Integration with popular IDEs (VSCode, IntelliJ)
- Support for additional languages (Go, Java, C++)
- Incremental analysis for large codebases
- Custom documentation templates

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