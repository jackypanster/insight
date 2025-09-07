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
- **Smart Caching**: Avoids reprocessing unchanged files to minimize API costs
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

# Get help
pnpm dev analyze --help
```

### Output Structure
Generated documentation will be saved to `insight-docs/` (configurable):
```
insight-docs/
├── README.md           # Overview and index
├── architecture.md     # System architecture
├── implementation.md   # Implementation details
├── api.md             # API documentation
└── modules/           # Per-file detailed docs
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

### Current (MVP)
- ✅ CLI framework with basic commands
- ✅ Configuration management
- ✅ Project structure and tooling
- 🔄 Tree-sitter Python AST analysis
- ⏳ OpenRouter API integration
- ⏳ Documentation generation pipeline

### Planned
- JavaScript/TypeScript language support
- Real-time documentation updates
- Web UI for documentation viewing
- Integration with popular IDEs
- Support for additional languages (Go, Java, C++)

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