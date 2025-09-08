# Changelog

All notable changes to the Insight documentation generator will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive error handling with skip & log strategy
- Error statistics reporting and console summary
- Detailed error logs in JSON format with categorization
- `--continue-on-error` CLI flag (default: true)
- `--error-report` CLI flag for detailed error logging
- `--stop-on-error` CLI flag for strict error handling
- Timeout protection for AST parsing (30 seconds per file)
- File size limits (10MB default) with clear error messages
- Color-coded progress indicators showing success/partial/failed status
- Error categorization (syntax, encoding, timeout, memory, etc.)
- Retry recommendations for different error types

### Changed
- Analyzer now continues on parsing errors instead of stopping
- Progress output shows success/failure statistics in real-time
- Analysis results include status field ('success', 'partial', 'failed')
- AST field in AnalysisResult is now optional for failed analyses
- Improved error messages with context (file size, line count, encoding)
- Enhanced console output with error breakdown and recommendations

### Fixed
- Analyzer no longer crashes on invalid Python syntax
- Memory management improved for large files
- Timeout handling prevents infinite parsing loops
- Error logging preserves stack traces in debug mode
- File access errors are handled gracefully

## [0.3.0] - 2024-12-XX

### Added
- Enhanced Python AST analysis with advanced features
- Framework detection for Django, Flask, FastAPI, Data Science stack
- Design pattern recognition (23+ patterns)
- Mermaid diagram generation (4 diagram types)
- Architecture analysis with component classification
- Python version detection (2.7 vs 3.x with feature identification)
- Intelligent code quality recommendations
- Multi-dimensional documentation generation
- GitHub-compatible Mermaid diagram rendering

### Enhanced
- Documentation generation now framework-aware
- Architecture analysis with visual diagrams
- Statistics include complexity distribution and quality metrics
- Progress indicators show pattern detection status
- Cache system handles new analysis dimensions
- Error handling for complex framework scenarios

### Performance
- Maintained sub-second cached analysis time
- 100% cache hit rate benefits preserved
- API cost optimization continues
- Multi-file project support enhanced

## [0.2.0] - 2024-11-XX

### Added
- Complete pipeline integration (Scanner → AST → LLM → Documentation)
- Real OpenRouter API integration with multiple LLM models
- Multi-file support for entire Python projects
- Intelligent caching system with SHA-256 content hashing
- 24-hour TTL with configurable duration
- Smart cache invalidation when files change
- Real-time progress indicators with ETA calculations
- Performance metrics and cache statistics
- MODEL environment variable for LLM override
- Comprehensive test suite with multi-file Python project

### Performance Improvements
- 89s → 0s for cached runs (100% speed improvement)
- Up to 100% API cost reduction with caching
- Dramatic performance gains on repeated analyses

### Fixed
- Removed all mock data from tests
- Fixed TypeScript compilation issues
- Improved error handling in LLM service
- Better fallback mechanisms

## [0.1.0] - 2024-10-XX

### Added
- Initial CLI framework with Commander.js
- Configuration management with interactive `init` command
- Project structure with TypeScript and pnpm
- Tree-sitter Python AST analysis foundation
- File scanning with intelligent filtering
- Basic documentation generation templates
- Core service architecture (Scanner, Analyzer, Generator)
- Support for `.env` configuration
- Basic Python code analysis

### Developer Experience
- Development scripts and build system
- ESLint and Prettier configuration
- TypeScript strict mode
- Modular architecture for extensibility

---

## Version Numbering Strategy

- **Major (x.0.0)**: Breaking changes, major new features
- **Minor (0.x.0)**: New features, enhancements, backward compatible
- **Patch (0.0.x)**: Bug fixes, small improvements, documentation updates

## Contributing

When contributing changes, please:

1. Update this CHANGELOG.md with your changes
2. Follow the existing format and categories
3. Include the change type (Added/Changed/Fixed/Deprecated/Removed/Security)
4. Reference any related GitHub issues
5. Update version numbers appropriately

## Categories

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for security improvements