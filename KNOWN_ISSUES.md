# Known Issues

This document tracks current limitations and known issues with the Insight documentation generator.

## Current Version: v0.3.1

### Error Handling

#### Parsing Limitations  
- **Python 3.6+ Only**: Only supports Python 3.6 and later (Python 2 is not supported)
- **Invalid Syntax**: Files with syntax errors are skipped and logged rather than attempting partial analysis
- **Encoding Issues**: Files not encoded in UTF-8 may fail to parse correctly
- **Complex Syntax**: Very advanced or experimental Python syntax may not parse correctly

#### Performance Constraints
- **File Size Limits**: 
  - Maximum file size: 10MB (configurable but may cause memory issues beyond this)
  - Files larger than this limit are skipped with a warning
- **Parsing Timeouts**: 
  - Analysis timeout per file: 30 seconds
  - Very complex files may timeout during AST parsing
- **Memory Usage**: 
  - High memory usage on projects with 1000+ large files
  - Recommended: 4GB+ RAM for large codebases

#### Framework Detection Accuracy
- **Django Detection**: 
  - May miss Django projects that don't follow standard structure
  - Custom Django configurations might not be detected
- **FastAPI Detection**: 
  - Relies on import patterns, may miss dynamically imported modules
- **Data Science Detection**: 
  - Currently only detects common packages (pandas, numpy, jupyter)
  - Custom ML frameworks may not be recognized

### Analysis Quality

#### AST Analysis Limitations
- **Dynamic Code**: Cannot analyze dynamically generated classes/functions
- **Metaclasses**: Limited support for complex metaclass patterns
- **Decorators**: Complex decorator chains may not be fully analyzed
- **Context Managers**: Some custom context managers may not be detected

#### Design Pattern Recognition
- **False Positives**: May incorrectly identify patterns in complex codebases
- **Singleton Detection**: Only detects common singleton patterns
- **Observer Pattern**: Limited to standard implementations
- **Factory Patterns**: May miss abstract factory variations

#### Dependency Analysis
- **Circular Imports**: Detection is limited to static analysis
- **Dynamic Imports**: `importlib` and `__import__` usage not tracked
- **Conditional Imports**: Try/except import blocks may confuse dependency graphs

### LLM Integration Issues

#### API Reliability
- **Rate Limiting**: OpenRouter API rate limits may cause delays
- **Token Limits**: Large files may exceed model context windows
- **API Failures**: Network issues can cause analysis failures
- **Cost Accumulation**: Large projects can generate significant API costs

#### Documentation Quality
- **Context Loss**: Very large files may lose context in analysis
- **Technical Accuracy**: AI-generated documentation may contain inaccuracies
- **Inconsistent Style**: Documentation style may vary between files

### Platform-Specific Issues

#### Windows
- **Path Handling**: Long file paths may cause issues on Windows
- **File Permissions**: Some enterprise antivirus may block file access

#### macOS
- **Permission Prompts**: May require permission for accessing certain directories
- **Case Sensitivity**: File system case sensitivity may affect imports

#### Linux
- **Memory Constraints**: Lower memory systems may struggle with large projects
- **File System**: Some network file systems may cause performance issues

## Workarounds

### For Unsupported Python Versions
1. **Upgrade to Python 3.6+**: The recommended approach for all projects
2. **Use `--continue-on-error`**: Skip problematic files and continue with supported ones

### For Large Projects
1. **Use `--max-files`**: Limit analysis to most important files first
2. **Incremental Analysis**: Analyze subdirectories separately
3. **Exclude Patterns**: Use `--exclude` to skip test files, generated code

### For Memory Issues
1. **Increase Swap**: Ensure adequate swap space is available
2. **Close Applications**: Free up system memory before analysis
3. **Use Smaller Batches**: Process files in smaller batches

### For API Cost Management
1. **Use Caching**: Leverage cache system for repeated analyses
2. **Choose Cheaper Models**: Use `MODEL` environment variable for cost-effective models
3. **Limit Scope**: Use include/exclude patterns to focus analysis

## Planned Improvements

### Version 0.3.2 (Next)
- [ ] Better memory management for large files
- [ ] Enhanced framework detection algorithms
- [ ] More granular error categorization
- [ ] Improved parsing for complex Python 3.10+ syntax

### Version 0.4.0 (Future)
- [ ] JavaScript/TypeScript support
- [ ] Real-time analysis updates
- [ ] Web-based documentation viewer
- [ ] Improved pattern recognition

### Version 0.5.0 (Long-term)
- [ ] Multiple language support (Go, Java, Rust)
- [ ] Distributed processing for large projects
- [ ] Advanced caching with Redis
- [ ] VSCode extension integration

## Reporting Issues

If you encounter issues not listed here:

1. **Check Logs**: Review console output and error logs
2. **Enable Debug**: Use `--verbose` for detailed logging
3. **Generate Error Report**: Use `--error-report` to create detailed error log
4. **Create Issue**: Report at [GitHub Issues](https://github.com/jackypanster/insight/issues)

### Issue Template
```
**Environment:**
- OS: [e.g., macOS 14.1]
- Node.js version: [e.g., 20.10.0]
- Python version in project: [e.g., 3.11]
- Project size: [e.g., 150 files, 50K lines]

**Command Used:**
```bash
pnpm dev analyze ./my-project --verbose
```

**Error Output:**
[Paste error messages and logs]

**Expected Behavior:**
[What you expected to happen]

**Additional Context:**
[Project type, frameworks used, etc.]
```

## Contribution Guidelines

Want to help fix these issues?

1. **Pick an Issue**: Choose from the known issues above
2. **Create Branch**: `git checkout -b fix/issue-description`
3. **Write Tests**: Add tests that reproduce the issue
4. **Implement Fix**: Ensure all tests pass
5. **Update Documentation**: Update this file and other docs
6. **Submit PR**: Include detailed description of changes

---

*Last updated: 2025-01-08*
*For the most current status, check the [project roadmap](ROADMAP.md)*