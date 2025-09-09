# Documentation Directory

This directory contains all project documentation for the Insight MVP.

## Documentation Structure

### 核心用户文档
- **[deployment.md](deployment.md)** - 🆕 **完整部署指南** - Docker、本地安装、配置管理、故障排除
- **[testing-guide.md](testing-guide.md)** - 功能测试和验证指南  
- **[known-issues.md](known-issues.md)** - 已知问题和解决方案

### 项目技术文档
- **[arch.md](arch.md)** - 技术架构规范 (English)
- **[arch.zh.md](arch.zh.md)** - 技术架构规范 (Chinese)
- **[prd.md](prd.md)** - 产品需求文档 (English)
- **[prd.zh.md](prd.zh.md)** - 产品需求文档 (Chinese)
- **[research.md](research.md)** - 技术研究和实现策略 (English)
- **[research.zh.md](research.zh.md)** - 技术研究和实现策略 (Chinese)

### 开发者文档
- **[tech-decision.md](tech-decision.md)** - 技术决策和依据
- **[caching.md](caching.md)** - 缓存系统设计和实现
- **[mastery-notes.zh.md](mastery-notes.zh.md)** - 学习笔记和见解 (Chinese)

## Docker-First Approach

As of January 2025, this project uses a **Docker-first deployment strategy**:

- ✅ **No local installation issues** - All dependencies containerized
- ✅ **Consistent environments** - Same behavior across all platforms  
- ✅ **Easy testing** - Follow the [testing-guide.md](testing-guide.md)
- ✅ **Production ready** - Multi-stage builds with optimized layers

### Quick Start
```bash
# 一键启动开发环境
pnpm docker:dev

# 基本使用
pnpm dev analyze ./your-python-project
pnpm dev serve --open
```

> **📋 完整指南**: 详细部署和配置请参考 [deployment.md](deployment.md)

## Documentation Updates

### Removed Documents
- `INSTALLATION_ISSUES.md` - Obsolete with Docker deployment
  - Tree-sitter compilation issues no longer relevant
  - Native module dependencies handled in container

### Updated Documents  
- `KNOWN_ISSUES.md` → `known-issues.md` - Updated for Docker deployment
- `MVP_TESTING_GUIDE.md` → `testing-guide.md` - Docker-based testing procedures

## 📚 快速导航

### 🚀 新用户开始这里
1. **部署和安装**: [deployment.md](deployment.md) - 完整的安装和配置指南
2. **快速开始**: [../README.md](../README.md) - 项目概览和基本使用

### 🔧 遇到问题？
1. **测试验证**: [testing-guide.md](testing-guide.md) - 功能测试和验证
2. **常见问题**: [known-issues.md](known-issues.md) - 已知问题和解决方案
3. **技术架构**: [arch.md](arch.md) - 深入了解系统设计

### 👩‍💻 开发者资源
1. **技术决策**: [tech-decision.md](tech-decision.md) - 了解技术选择
2. **缓存系统**: [caching.md](caching.md) - 性能优化设计
3. **产品规划**: [prd.md](prd.md) / [prd.zh.md](prd.zh.md) - 产品需求和规划

---

*Documentation reorganized: January 2025*  
*Docker-first deployment eliminates installation complexity*