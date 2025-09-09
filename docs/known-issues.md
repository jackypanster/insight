# Known Issues

This document tracks current limitations and known issues with the Insight documentation generator running in Docker.

## Current Version: v0.3.1 (Docker-based)

### Docker-Specific Issues

#### Container Environment
- **Port Conflicts**: Default port 3000 may conflict with other services
  - **Solution**: Use `--port` flag or modify `docker-compose.yml`
- **Volume Mounting**: Large projects may have slow file I/O on some Docker setups
  - **Impact**: Affects analysis speed on Windows/macOS with large codebases
- **Memory Limits**: Docker Desktop default memory limits may be insufficient
  - **Recommended**: Set Docker to use at least 4GB RAM for large projects

#### Platform-Specific Docker Issues

**Windows**
- **Path Mounting**: Windows path formats may cause volume mounting issues
  - **Workaround**: Use forward slashes in paths or WSL2
- **Performance**: File watching slower due to Windows file system translation

**macOS**
- **File Permissions**: Some macOS security settings may block container access
- **Performance**: Large projects may be slow due to macOS Docker file system

**Linux**
- **User Permissions**: Container user ID may not match host user
  - **Solution**: Use `USER_ID` and `GROUP_ID` environment variables

### Analysis Quality Issues

#### Python Analysis Limitations
- **Dynamic Code**: Cannot analyze dynamically generated classes/functions
- **Complex Decorators**: Advanced decorator patterns may not be fully analyzed  
- **Metaclasses**: Limited support for complex metaclass patterns
- **Import Resolution**: Complex import paths in large projects may be missed

#### Framework Detection Accuracy
- **Django Projects**: May miss non-standard Django project structures
- **FastAPI Detection**: Relies on import patterns, may miss dynamic imports
- **Data Science**: Only detects common packages (pandas, numpy, jupyter)

#### AST Analysis Edge Cases
- **Very Large Files**: Files >10MB are skipped (configurable)
- **Deeply Nested Code**: Extremely deep class hierarchies may timeout
- **Unicode Issues**: Non-UTF8 files may cause parsing errors

### LLM Integration Issues

#### API Reliability
- **Rate Limiting**: OpenRouter API may throttle requests on large projects
- **Network Issues**: Container network problems can cause API failures
- **Token Limits**: Very large files may exceed model context windows
- **Cost Management**: No built-in cost tracking or limits

#### Documentation Quality
- **Context Loss**: Large files may lose important context in analysis
- **Inconsistencies**: AI-generated docs may vary in style between files
- **Technical Accuracy**: Generated documentation should be manually reviewed

### Performance Constraints

#### Resource Usage
- **Memory**: High memory usage on projects with 1000+ files
- **CPU**: AST parsing is CPU-intensive for complex Python code
- **Disk I/O**: Frequent cache reads/writes may impact performance
- **Network**: API calls add latency to analysis pipeline

#### Timeouts and Limits
- **Per-file timeout**: 30 seconds for analysis (configurable)
- **Maximum file size**: 10MB (configurable but may cause memory issues)
- **Concurrent processing**: Limited by container resources

## Workarounds

### For Large Projects
```bash
# Use file limits and exclusion patterns
docker run -v $(pwd):/workspace insight \
  analyze /workspace --max-files 50 --exclude "**/tests/**"

# Process in batches
docker run -v $(pwd):/workspace insight \
  analyze /workspace/src --max-files 20
```

### For Performance Issues
```bash
# Increase Docker memory allocation
# In Docker Desktop: Settings > Resources > Memory: 8GB

# Use local cache volume for better performance
docker run -v insight-cache:/cache -v $(pwd):/workspace insight \
  analyze /workspace --cache-dir /cache
```

### For API Cost Management
```bash
# Use cache aggressively
docker run -v insight-cache:/cache -v $(pwd):/workspace insight \
  analyze /workspace --cache-dir /cache --max-files 10

# Use cheaper models
docker run -e MODEL=openai/gpt-3.5-turbo \
  -v $(pwd):/workspace insight analyze /workspace
```

## Docker Deployment Best Practices

### Resource Allocation
- **Memory**: Minimum 2GB, recommended 4GB+ for large projects
- **CPU**: No specific limits, but analysis is CPU-bound
- **Storage**: Ensure adequate space for cache and generated docs

### Volume Strategy
```yaml
version: '3.8'
services:
  insight:
    volumes:
      - ./:/workspace:ro          # Mount source code read-only
      - ./insight-docs:/docs      # Mount output directory
      - insight-cache:/cache      # Use named volume for cache
      - insight-config:/config    # Persist configuration
```

### Environment Configuration
```bash
# Essential environment variables
OPENROUTER_API_KEY=your_key_here
INSIGHT_CACHE_DIR=/cache
INSIGHT_LOG_LEVEL=info
NODE_ENV=production
```

## Current Limitations vs Roadmap

### Version 0.3.2 (Next Release)
- [ ] Better Docker resource management
- [ ] Improved error handling for container environments  
- [ ] Enhanced caching strategies
- [ ] Multi-stage analysis for large projects

### Version 0.4.0 (Future)
- [ ] Kubernetes deployment support
- [ ] Distributed processing across containers
- [ ] Real-time analysis with file watching
- [ ] Web interface improvements

### Version 0.5.0 (Long-term)
- [ ] Multi-language support (JavaScript, Go, Java)
- [ ] Plugin architecture for custom analyzers
- [ ] Advanced caching with Redis
- [ ] CI/CD pipeline integration

## Reporting Docker-Specific Issues

When reporting issues, include:

### Environment Details
```bash
# Docker information
docker --version
docker-compose --version
docker system info

# Container logs
docker logs <container_id>

# Host system
uname -a  # Linux/macOS
systeminfo  # Windows
```

### Issue Template
```markdown
**Environment:**
- Host OS: [e.g., macOS 14.1, Ubuntu 22.04, Windows 11]
- Docker version: [e.g., 24.0.6]
- Docker Compose version: [e.g., 2.21.0]
- Available Memory: [e.g., 8GB]
- Project size: [e.g., 150 files, 50K lines]

**Docker Command:**
```bash
docker run -v $(pwd):/workspace insight analyze /workspace --verbose
```

**Container Logs:**
[Paste relevant container output]

**Expected vs Actual:**
[Describe what you expected vs what happened]
```

## Contributing

To help resolve these issues:

1. **Test on Different Platforms**: Help test on Windows/Linux/macOS
2. **Performance Profiling**: Identify bottlenecks in container environments
3. **Documentation**: Improve Docker setup and troubleshooting guides
4. **Error Handling**: Better graceful degradation when resources are limited

---

*Last updated: 2025-01-09*  
*Docker-based deployment - Installation issues resolved*  
*For deployment guide, see [docs/deployment.md](deployment.md)*