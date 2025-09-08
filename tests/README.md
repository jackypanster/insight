# Testing Infrastructure

This document describes the comprehensive testing infrastructure for the Insight project, implemented as part of Phase 5 Iteration 2: Testing Infrastructure.

## Overview

The testing suite is designed to ensure production-ready quality with comprehensive coverage of error resilience features implemented in Phase 5 Iteration 1.

## Test Structure

```
tests/
├── setup.ts                    # Global test configuration and utilities
├── unit/                       # Unit tests for individual components
│   ├── analyzer.test.ts        # ASTAnalyzer tests (enhanced for error resilience)
│   ├── errorCollector.test.ts  # ErrorCollector comprehensive tests
│   ├── llm.test.ts            # LLM service tests
│   └── scanner.test.ts        # File scanner tests
├── integration/                # End-to-end integration tests
│   ├── error-handling.test.ts  # Error handling pipeline tests
│   ├── full-pipeline.test.ts  # Complete analysis pipeline
│   └── scanner-analyzer.test.ts # Scanner + analyzer integration
└── edge-cases/                 # Real-world edge case tests
    ├── encoding.test.ts        # Unicode and encoding edge cases
    ├── filesystem.test.ts      # File system edge cases
    ├── performance.test.ts     # Performance and timeout edge cases
    └── syntax.test.ts          # Complex syntax error patterns
```

## Test Categories

### Unit Tests
- **ErrorCollector**: Complete coverage of all 6 error categories, statistics, and reporting
- **ASTAnalyzer**: Enhanced with error resilience testing (timeout protection, file size limits, error modes)
- **Scanner**: File discovery and filtering logic
- **LLM Service**: API integration and caching

### Integration Tests
- **End-to-End Error Handling**: Full pipeline with mixed success/failure scenarios
- **CLI Simulation**: Command-line interface error handling workflows
- **Resource Management**: Memory and performance testing under error conditions

### Edge Case Tests
- **Encoding Issues**: Unicode, BOM, mixed encodings, binary content
- **Filesystem Problems**: Missing files, permissions, long paths, special characters
- **Performance Limits**: Large files, deeply nested structures, memory pressure
- **Syntax Variations**: Modern Python features, malformed code, incomplete files

## Test Fixtures

Expanded test fixtures in `test-fixtures/errors/`:

- `syntax_error.py` - Basic syntax errors for parser testing
- `complex_syntax_error.py` - Mixed valid/invalid code patterns
- `encoding_issues.py` - Files with encoding challenges
- `timeout_inducing.py` - Complex structures that may cause timeouts
- `memory_intensive.py` - Large data structures for memory testing
- `mixed_valid_invalid.py` - Real-world mixed validity scenarios
- `circular_import.py` - Circular dependency patterns
- `huge_file.py` - File size limit testing

## Running Tests

### Basic Test Commands

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run specific test suites
pnpm test:unit          # Unit tests only
pnpm test:integration   # Integration tests only
pnpm test:edge         # Edge case tests only

# Development commands
pnpm test:watch        # Watch mode for development
pnpm test:ui          # Visual test runner
pnpm test:debug       # Verbose output without coverage
```

### Advanced Commands

```bash
# CI/CD pipeline testing
pnpm test:ci          # Full test suite with coverage for CI

# Coverage analysis
pnpm test:coverage:open    # Generate and open coverage report

# Quality assurance
pnpm quality          # Full quality check (lint + type + test + coverage)
pnpm quality:fix      # Auto-fix issues where possible
```

## Coverage Requirements

The test infrastructure enforces strict coverage thresholds:

### Global Coverage Requirements
- **Statements**: 80% minimum
- **Branches**: 75% minimum  
- **Functions**: 80% minimum
- **Lines**: 80% minimum

### Critical Module Requirements
- **ErrorCollector** (`src/services/errors/`): 90% statements, 85% branches
- **ASTAnalyzer** (`src/core/analyzer/`): 85% statements, 80% branches

## Test Configuration

### Vitest Configuration (`vitest.config.ts`)
- **Coverage Provider**: V8 for accurate coverage reporting
- **Reporters**: Text, JSON, HTML, and LCOV formats
- **Timeouts**: 30s test timeout, 10s hook timeout
- **Parallel Execution**: Multi-threaded with 1-4 threads
- **CI Integration**: GitHub Actions reporter support

### Test Setup (`tests/setup.ts`)
- **Global Test Environment**: Consistent test environment setup
- **Mock Management**: Automatic mocking of CLI output and external dependencies
- **Utility Functions**: Helper functions for temp directories, file creation, environment mocking
- **Error Handling**: Proper cleanup and error handling for tests

## Error Resilience Testing

The testing infrastructure specifically validates the error resilience features:

### Error Categories Tested
1. **Syntax Errors**: Missing colons, brackets, indentation issues
2. **Encoding Errors**: Non-UTF8, BOM, mixed encodings
3. **Timeout Errors**: Complex parsing that may exceed 30s limit
4. **Memory Errors**: Large files and memory-intensive operations
5. **File Access Errors**: Missing files, permissions, network issues
6. **Parsing Errors**: Tree-sitter parsing failures

### Error Mode Testing
- **Continue-on-Error Mode**: Validates partial analysis results
- **Stop-on-Error Mode**: Ensures proper error propagation
- **Error Context Collection**: Validates error metadata and categorization
- **Error Reporting**: Tests JSON report generation and CLI output

## Performance Testing

### Timeout Protection
- Tests ensure parsing operations complete within 30-second limit
- Validates graceful timeout handling without crashes
- Confirms partial results are returned on timeout

### Memory Management
- Tests with large files (approaching 10MB limit)
- Validates memory cleanup after processing
- Ensures no memory leaks in error conditions

### File Size Limits
- Tests exact 10MB boundary conditions
- Validates proper error messages for oversized files
- Confirms size checking happens before parsing

## CI/CD Integration

### GitHub Actions Workflow (`.github/workflows/ci.yml`)
- **Multi-Platform Testing**: Ubuntu, Windows, macOS
- **Multi-Version Testing**: Node.js 18, 20, 22
- **Quality Gates**: All tests must pass before merge
- **Security Auditing**: Dependency vulnerability scanning
- **Performance Testing**: CLI startup and analysis performance

### Pre-Commit Hooks (`scripts/pre-commit.sh`)
- **Type Checking**: Ensures TypeScript compliance
- **Linting**: ESLint with auto-fix capabilities
- **Formatting**: Prettier auto-formatting
- **Unit Testing**: Fast unit test execution
- **Build Validation**: Ensures code compiles successfully

## Best Practices

### Writing Tests
1. **Use Real-World Scenarios**: Test fixtures represent actual problematic code
2. **Test Error Paths**: Ensure error conditions are thoroughly tested
3. **Validate Partial Results**: Test that valid code is extracted despite errors
4. **Performance Awareness**: Include timeout and memory considerations
5. **Clear Assertions**: Use descriptive test names and clear expectations

### Test Organization
1. **Single Responsibility**: Each test file focuses on one component
2. **Logical Grouping**: Related tests grouped in describe blocks
3. **Setup/Teardown**: Proper resource management in tests
4. **Isolation**: Tests don't depend on each other
5. **Documentation**: Clear comments explaining complex test scenarios

## Debugging Tests

### Common Issues and Solutions

**Tests Timing Out**:
```bash
# Run with extended timeout
pnpm test:debug --testTimeout=60000
```

**Coverage Issues**:
```bash
# Generate detailed coverage report
pnpm test:coverage
open coverage/index.html
```

**Flaky Tests**:
```bash
# Run specific test multiple times
pnpm vitest run tests/unit/errorCollector.test.ts --repeat=10
```

### Debug Utilities
- Use `testUtils.wait(ms)` for timing-sensitive tests
- Use `testUtils.createTempDir()` for isolated file system tests
- Enable debug logging with `DEBUG=true pnpm test`
- Use `console.log` in tests (mocked by default, enable with DEBUG)

## Metrics and Monitoring

### Coverage Tracking
- Coverage reports generated in `coverage/` directory
- LCOV format for CI integration
- HTML reports for detailed analysis
- JSON format for programmatic processing

### Performance Metrics
- Test execution time monitoring
- Memory usage tracking during tests
- File processing speed benchmarks
- Error handling performance validation

## Future Enhancements

### Planned Improvements
1. **Mutation Testing**: Add mutation testing for quality validation
2. **Property-Based Testing**: Add property-based tests for edge case discovery
3. **Performance Benchmarking**: Automated performance regression testing
4. **Visual Regression**: Add visual testing for CLI output
5. **Contract Testing**: API contract testing for external services

### Test Expansion
- **Browser Testing**: Add browser environment tests for future web UI
- **E2E Testing**: Full end-to-end testing with real repositories
- **Load Testing**: High-volume file processing tests
- **Security Testing**: Input validation and security vulnerability tests

This testing infrastructure ensures that Insight maintains production-ready quality while continuing to evolve with new features and improvements.