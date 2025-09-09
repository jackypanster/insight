# Docker MVP Testing Guide

This guide helps you quickly test the Insight MVP using Docker, eliminating installation issues and providing a consistent testing environment.

## Quick Start Testing

### Prerequisites
- Docker Desktop or Docker Engine
- Docker Compose (usually included with Desktop)
- Any Python project to analyze

### Verify Docker Installation
```bash
docker --version          # Should show Docker 20.x or higher
docker-compose --version  # Should show Compose 2.x or higher
```

## Core Functionality Tests

### Test 1: CLI Framework & Help
```bash
# Test basic CLI functionality
docker run --rm insight:dev --version
docker run --rm insight:dev --help

# Test subcommands
docker run --rm insight:dev init --help
docker run --rm insight:dev analyze --help
docker run --rm insight:dev serve --help
```

**Expected Results**:
- [ ] Version shows correct format (e.g., v0.3.1)
- [ ] Help text displays available commands
- [ ] No error messages or container crashes

### Test 2: Configuration Initialization
```bash
# Initialize configuration in current directory
docker run --rm -v $(pwd):/workspace insight:dev init

# Verify configuration file
cat insight.config.json
```

**Expected Results**:
- [ ] `insight.config.json` created with proper structure
- [ ] Contains LLM settings, scanning options, generation settings
- [ ] Default output directory set to `insight-docs`

### Test 3: Basic Python Analysis
```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY="your_key_here"

# Analyze a Python project (use examples or your own)
docker run --rm \
  -v $(pwd):/workspace \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace/examples --verbose --max-files 3

# Check generated documentation
ls -la insight-docs/
```

**Expected Results**:
- [ ] Analysis completes without fatal errors
- [ ] Progress indicators show during processing
- [ ] Generated files include:
  - [ ] `index.md` (project overview)
  - [ ] `arch.md` (architecture analysis)
  - [ ] Individual file documentation in subdirectories
- [ ] Cache information displayed (hit/miss statistics)

### Test 4: Web Documentation Server
```bash
# Start the web server with generated docs
docker run --rm \
  -v $(pwd)/insight-docs:/docs \
  -p 3000:3000 \
  insight:dev serve --docs-dir /docs --host 0.0.0.0

# In another terminal, test API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/docs
```

**Web Interface Tests**:
- [ ] Open http://localhost:3000 in browser
- [ ] Homepage loads with project statistics
- [ ] Navigation menu works properly
- [ ] Individual file documentation renders correctly
- [ ] Mermaid diagrams display properly (if generated)

**API Tests**:
- [ ] `/api/health` returns healthy status
- [ ] `/api/docs` returns list of available documentation
- [ ] Individual file endpoints return proper JSON responses

## Docker Compose Testing

### Test 5: Full Stack with Docker Compose
```bash
# Create environment file
echo "OPENROUTER_API_KEY=your_key_here" > .env

# Start development environment
docker-compose -f deploy/docker/docker-compose.yml up insight-dev

# Access the web interface (should auto-start with examples)
open http://localhost:3000
```

**Expected Results**:
- [ ] Container starts automatically
- [ ] Web server runs on port 3000
- [ ] Sample documentation is pre-loaded and accessible
- [ ] Logs show successful startup without errors

### Test 6: Production Build Testing
```bash
# Build production image
docker build -t insight:prod .

# Test production container
docker run --rm \
  -v $(pwd)/examples:/workspace \
  -e OPENROUTER_API_KEY \
  insight:prod analyze /workspace --max-files 2
```

## Performance & Edge Case Tests

### Test 7: Large File Handling
```bash
# Create a test file with many functions
python3 << 'EOF'
with open('/tmp/large_test.py', 'w') as f:
    f.write('"""Large Python file for testing"""\n')
    for i in range(500):
        f.write(f'''
class TestClass{i}:
    """Test class {i}"""
    def method_{i}(self):
        return {i}
''')
EOF

# Test analysis with timeout monitoring
timeout 60 docker run --rm \
  -v /tmp:/workspace \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace/large_test.py --verbose
```

**Expected Results**:
- [ ] Analysis completes within reasonable time (<60s)
- [ ] No memory-related container crashes
- [ ] Generated documentation is coherent

### Test 8: Error Handling & Recovery
```bash
# Test with invalid Python syntax
echo "def broken_function(" > /tmp/broken.py

docker run --rm \
  -v /tmp:/workspace \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace/broken.py --error-report
```

**Expected Results**:
- [ ] Container doesn't crash on syntax errors
- [ ] Error report is generated with proper categorization
- [ ] Helpful error messages are displayed

### Test 9: API Key & Network Issues
```bash
# Test without API key
docker run --rm \
  -v $(pwd)/examples:/workspace \
  insight:dev analyze /workspace/simple.py

# Test with invalid API key
docker run --rm \
  -v $(pwd)/examples:/workspace \
  -e OPENROUTER_API_KEY="invalid-key" \
  insight:dev analyze /workspace/simple.py
```

**Expected Results**:
- [ ] Clear error messages about missing/invalid API key
- [ ] Suggestions for fixing configuration
- [ ] Container exits gracefully

## Multi-Platform Testing

### Test 10: Windows (PowerShell)
```powershell
# Windows-specific volume mounting syntax
docker run --rm -v ${PWD}:/workspace -e OPENROUTER_API_KEY insight:dev analyze /workspace/examples
```

### Test 11: Different Docker Environments
```bash
# Test with limited memory
docker run --rm -m 1g \
  -v $(pwd)/examples:/workspace \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace --max-files 2

# Test with read-only filesystem (except output)
docker run --rm --read-only \
  -v $(pwd)/examples:/workspace:ro \
  -v $(pwd)/insight-docs:/docs \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace --output /docs
```

## Cache & Performance Testing

### Test 12: Caching Effectiveness
```bash
# First run (should populate cache)
time docker run --rm \
  -v $(pwd)/examples:/workspace \
  -v insight-cache:/cache \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace --cache-dir /cache

# Second run (should use cache)
time docker run --rm \
  -v $(pwd)/examples:/workspace \
  -v insight-cache:/cache \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace --cache-dir /cache
```

**Expected Results**:
- [ ] First run shows "Cache miss" for new files
- [ ] Second run shows "Cache hit" and completes much faster
- [ ] Generated documentation is identical

## Load Testing

### Test 13: Multiple Concurrent Containers
```bash
# Start multiple analysis containers
for i in {1..3}; do
  docker run --name insight-test-$i -d \
    -v $(pwd)/examples:/workspace \
    -e OPENROUTER_API_KEY \
    insight:dev analyze /workspace --max-files 1 &
done

# Monitor containers
docker logs -f insight-test-1
```

## Troubleshooting Tests

### Test 14: Container Resource Monitoring
```bash
# Monitor resource usage during analysis
docker run --name insight-monitor -d \
  -v $(pwd)/examples:/workspace \
  -e OPENROUTER_API_KEY \
  insight:dev analyze /workspace

# In another terminal
docker stats insight-monitor
```

### Test 15: Debug Mode Testing
```bash
# Enable verbose logging and debug output
docker run --rm \
  -v $(pwd)/examples:/workspace \
  -e OPENROUTER_API_KEY \
  -e DEBUG=1 \
  -e INSIGHT_LOG_LEVEL=debug \
  insight:dev analyze /workspace --verbose
```

## Test Results Documentation

### Issues Found Template
```markdown
## Test Results - [Date]

### Environment
- Host OS: [macOS/Linux/Windows]
- Docker Version: [version]
- Available Memory: [GB]

### Passing Tests
- [ ] CLI Framework (Test 1)
- [ ] Configuration (Test 2)
- [ ] Basic Analysis (Test 3)
- [ ] Web Server (Test 4)
- [ ] Docker Compose (Test 5)
- [ ] Production Build (Test 6)
- [ ] Performance (Test 7-8)
- [ ] Error Handling (Test 9)
- [ ] Caching (Test 12)

### Issues Identified
1. **Issue Description**
   - Test: [Test Number]
   - Severity: [High/Medium/Low]
   - Error: [Error message/behavior]
   - Workaround: [If available]

### Recommendations
- **High Priority**: [Issues that block core functionality]
- **Medium Priority**: [Issues that affect user experience]  
- **Low Priority**: [Minor issues or improvements]
```

## Success Criteria

For MVP release readiness, all core tests (1-6) must pass consistently across:
- [x] macOS with Docker Desktop
- [ ] Linux with Docker Engine
- [ ] Windows with Docker Desktop
- [ ] Windows with WSL2

## Next Steps After Testing

1. **Document Issues**: Record all findings in the issues template
2. **Prioritize Fixes**: Focus on blocking issues first
3. **Update Documentation**: Reflect any discovered limitations
4. **Performance Baseline**: Record performance metrics for regression testing

---

*Last updated: 2025-01-09*  
*Docker-based testing - No local installation required*  
*For deployment instructions, see [README.md](../README.md)*