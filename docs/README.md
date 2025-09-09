# Documentation Directory

This directory contains all project documentation for the Insight MVP.

## Documentation Structure

### Project Documentation
- **[arch.md](arch.md)** - Technical architecture specification (English)
- **[arch.zh.md](arch.zh.md)** - Technical architecture specification (Chinese)
- **[prd.md](prd.md)** - Product Requirements Document (English)
- **[prd.zh.md](prd.zh.md)** - Product Requirements Document (Chinese)
- **[research.md](research.md)** - Technical research and implementation strategy (English)
- **[research.zh.md](research.zh.md)** - Technical research and implementation strategy (Chinese)

### Technical Documentation
- **[tech-decision.md](tech-decision.md)** - Technology decisions and rationale
- **[caching.md](caching.md)** - Caching system design and implementation

### Operations & Testing
- **[known-issues.md](known-issues.md)** - Docker-specific known issues and limitations
- **[testing-guide.md](testing-guide.md)** - Docker-based MVP testing guide
- **[mastery-notes.zh.md](mastery-notes.zh.md)** - Learning notes and insights (Chinese)

## Docker-First Approach

As of January 2025, this project uses a **Docker-first deployment strategy**:

- ✅ **No local installation issues** - All dependencies containerized
- ✅ **Consistent environments** - Same behavior across all platforms  
- ✅ **Easy testing** - Follow the [testing-guide.md](testing-guide.md)
- ✅ **Production ready** - Multi-stage builds with optimized layers

### Quick Start
```bash
# Development mode with auto-reload
docker-compose -f deploy/docker/docker-compose.yml up insight-dev

# Production analysis  
docker run -v $(pwd):/workspace -e OPENROUTER_API_KEY insight analyze /workspace
```

## Documentation Updates

### Removed Documents
- `INSTALLATION_ISSUES.md` - Obsolete with Docker deployment
  - Tree-sitter compilation issues no longer relevant
  - Native module dependencies handled in container

### Updated Documents  
- `KNOWN_ISSUES.md` → `known-issues.md` - Updated for Docker deployment
- `MVP_TESTING_GUIDE.md` → `testing-guide.md` - Docker-based testing procedures

## Getting Help

1. **For deployment**: See main [README.md](../README.md)
2. **For testing**: Follow [testing-guide.md](testing-guide.md)  
3. **For issues**: Check [known-issues.md](known-issues.md)
4. **For architecture**: Review [arch.md](arch.md)

---

*Documentation reorganized: January 2025*  
*Docker-first deployment eliminates installation complexity*