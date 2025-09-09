# Insight 部署指南

本文档提供 Insight 项目的完整部署和运行指南，整合了所有环境配置、Docker 使用和故障排除信息。

## 📋 目录

- [快速开始](#快速开始)
- [环境要求](#环境要求)
- [Docker 部署（推荐）](#docker-部署推荐)
- [本地部署](#本地部署)
- [开发环境](#开发环境)
- [生产环境](#生产环境)
- [配置管理](#配置管理)
- [故障排除](#故障排除)
- [性能优化](#性能优化)
- [最佳实践](#最佳实践)

## 🚀 快速开始

### 5分钟快速启动

```bash
# 1. 克隆项目
git clone <repository-url>
cd insight

# 2. 设置 API Key
cp .env.example .env
# 编辑 .env 文件，添加 OPENROUTER_API_KEY=sk-or-your-key-here

# 3. 一键启动（推荐）
pnpm docker:dev

# 4. 访问 Web 界面
open http://localhost:3000
```

就这么简单！Docker 会自动处理所有依赖和环境问题。

## 📦 环境要求

### Docker 部署要求（推荐）
- **Docker**: 20.x 或更高版本
- **Docker Compose**: 2.x 或更高版本（通常随 Docker Desktop 提供）
- **内存**: 至少 2GB，推荐 4GB+
- **磁盘**: 至少 1GB 可用空间

### 本地部署要求
- **Node.js**: 20+ (推荐使用 nvm)
- **pnpm**: 8.0+ （`npm install -g pnpm`）
- **Python**: 3.6+ (仅限支持的项目分析)
- **系统**: macOS、Linux、Windows (需要 WSL2)

### API 服务要求
- **OpenRouter API Key**: 在 [openrouter.ai](https://openrouter.ai) 获取
- **网络**: 需要访问外部 API 服务
- **可选**: Anthropic、OpenAI 直接 API Key

### 验证环境
```bash
# 检查 Docker 环境
docker --version          # 应显示 Docker 20.x+
docker compose --version  # 应显示 Compose 2.x+
docker info               # 检查 Docker 是否正常运行

# 检查本地环境（如需要）
node --version            # 应显示 v20.x+
pnpm --version            # 应显示 8.x+
```

## 🐳 Docker 部署（推荐）

### 为什么选择 Docker？

- ✅ **零配置问题**: 避免 tree-sitter 原生模块编译问题
- ✅ **一致环境**: 在所有平台上提供相同的运行环境
- ✅ **快速启动**: 一条命令即可启动完整环境
- ✅ **易于维护**: 容器化管理，便于更新和回滚

### 开发模式

```bash
# 启动交互式开发环境（推荐）
pnpm docker:dev

# 后台启动开发环境
pnpm docker:dev:bg

# 重建镜像并启动（代码更新后）
pnpm docker:dev:rebuild

# 清理环境并重新开始
pnpm docker:clean && pnpm docker:dev
```

#### 开发模式特性
- **热重载**: 代码变更自动反映到容器中
- **调试端口**: 9229 端口用于 Node.js 调试
- **持久化数据**: 缓存和生成的文档会持久保存
- **源码挂载**: 实时编辑无需重建镜像

### 生产模式

```bash
# 构建生产镜像
pnpm docker:build

# 启动生产环境
docker compose -f deploy/docker/docker-compose.yml up insight

# 后台运行生产环境
docker compose -f deploy/docker/docker-compose.yml up insight -d
```

#### 生产模式特性
- **优化镜像**: 多阶段构建，最小化镜像大小
- **健康检查**: 自动监控服务状态
- **重启策略**: 自动重启失败的容器
- **资源限制**: 内存和 CPU 使用限制

### Docker 命令参考

```bash
# 构建相关
pnpm docker:build         # 构建生产镜像
pnpm docker:build:dev     # 构建开发镜像

# 运行相关  
pnpm docker:dev           # 启动开发环境
pnpm docker:dev:bg        # 后台启动开发环境
pnpm docker:dev:rebuild   # 重建并启动

# 测试相关
pnpm docker:test          # 运行所有测试
pnpm docker:test --unit   # 运行单元测试

# 清理相关
pnpm docker:clean         # 清理容器和卷
pnpm docker:clean --all   # 清理所有Docker资源
```

## 🏠 本地部署

### 安装步骤

```bash
# 1. 安装 Node.js 和 pnpm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
npm install -g pnpm

# 2. 克隆和安装
git clone <repository-url>
cd insight
pnpm install

# 3. 环境配置
cp .env.example .env
# 编辑 .env 添加 OPENROUTER_API_KEY

# 4. 初始化配置
pnpm dev init

# 5. 测试运行
pnpm dev analyze ./examples
```

### 本地开发命令

```bash
# 开发相关
pnpm dev              # 启动开发模式
pnpm build            # 构建 TypeScript
pnpm dev analyze      # 分析代码库
pnpm dev serve        # 启动文档服务器

# 代码质量
pnpm test             # 运行测试
pnpm lint             # 检查代码风格
pnpm format           # 格式化代码
pnpm type-check       # TypeScript 类型检查
```

### 原生模块问题解决

如果遇到 tree-sitter 编译问题：

```bash
# macOS
xcode-select --install
brew install python3

# Ubuntu/Debian
sudo apt-get install build-essential python3-dev

# Windows (建议使用 WSL2 或 Docker)
# 安装 Visual Studio Build Tools
```

## 🔧 开发环境

### 环境变量配置

创建 `.env` 文件：

```bash
# 必需配置
OPENROUTER_API_KEY=sk-or-your-key-here

# 可选配置
MODEL=google/gemini-2.0-flash-lite-001  # 更快更便宜的模型
INSIGHT_LOG_LEVEL=debug                  # 开发时使用 debug
INSIGHT_CACHE_DIR=.insight-cache         # 缓存目录
INSIGHT_MAX_WORKERS=4                    # 并发处理数量

# 直接API支持（可选）
ANTHROPIC_API_KEY=sk-ant-your-key-here
OPENAI_API_KEY=sk-your-key-here
```

### 项目配置文件

运行 `pnpm dev init` 生成 `insight.config.json`:

```json
{
  "llm": {
    "provider": "openrouter",
    "models": {
      "primary": "anthropic/claude-3.5-sonnet",
      "fallback": "google/gemini-2.0-flash-lite-001"
    },
    "maxTokens": 4000,
    "temperature": 0.3
  },
  "scanning": {
    "includeExtensions": [".py"],
    "ignorePaths": ["__pycache__", ".git", "venv", "node_modules"],
    "maxFileSize": "1MB"
  },
  "generation": {
    "outputDir": "insight-docs",
    "format": "markdown"
  },
  "cache": {
    "enabled": true,
    "location": ".insight-cache",
    "ttl": 86400
  }
}
```

### 开发工作流

```bash
# 1. 启动开发环境
pnpm docker:dev

# 2. 修改代码（热重载自动生效）

# 3. 测试更改
pnpm dev analyze ./examples --verbose

# 4. 运行测试
pnpm test

# 5. 检查代码质量
pnpm lint && pnpm type-check

# 6. 提交前格式化
pnpm format
```

## 🏭 生产环境

### 生产部署准备

```bash
# 1. 构建生产镜像
docker build -t insight:prod .

# 2. 准备生产配置
cp .env.example .env.production
# 编辑 .env.production 配置生产环境变量

# 3. 启动生产服务
docker run -d \
  --name insight-prod \
  -p 3000:3000 \
  --env-file .env.production \
  -v $(pwd)/projects:/app/projects:ro \
  -v insight_docs:/app/insight-docs \
  -v insight_cache:/app/.insight-cache \
  --restart unless-stopped \
  insight:prod
```

### 生产环境配置

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  insight:
    image: insight:prod
    container_name: insight-prod
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
    volumes:
      - ./projects:/app/projects:ro
      - insight_docs:/app/insight-docs
      - insight_cache:/app/.insight-cache
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  insight_docs:
  insight_cache:
```

### 资源要求

#### 最小配置
- **CPU**: 1 核心
- **内存**: 2GB
- **磁盘**: 5GB

#### 推荐配置（大型项目）
- **CPU**: 4 核心
- **内存**: 8GB
- **磁盘**: 20GB SSD

### 监控和日志

```bash
# 查看容器状态
docker ps
docker stats insight-prod

# 查看日志
docker logs -f insight-prod

# 健康检查
curl http://localhost:3000/api/health

# 监控资源使用
docker exec insight-prod sh -c "ps aux && df -h"
```

## ⚙️ 配置管理

### 环境变量优先级

1. **运行时环境变量**: `export OPENROUTER_API_KEY=...`
2. **`.env` 文件**: 项目根目录的 `.env` 文件
3. **配置文件**: `insight.config.json` 中的配置
4. **默认值**: 应用程序内置默认值

### 模型配置

支持的模型提供商：

```bash
# OpenRouter (推荐，支持多个模型)
MODEL=anthropic/claude-3.5-sonnet        # 高质量，较贵
MODEL=google/gemini-2.0-flash-lite-001   # 快速，便宜
MODEL=openai/gpt-4o                      # OpenAI 最新
MODEL=mistralai/mixtral-8x7b-instruct    # 开源替代

# 直接 API (需要对应的 API Key)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

### 缓存配置

```bash
# 缓存设置
INSIGHT_CACHE_DIR=.insight-cache    # 缓存目录
CACHE_TTL=86400                     # 缓存有效期（秒）
CACHE_MAX_SIZE=1GB                  # 最大缓存大小
```

## 🔧 故障排除

### 常见问题

#### 1. API Key 未加载

**症状**: 警告 "The 'OPENROUTER_API_KEY' variable is not set"

**解决**:
```bash
# 检查 .env 文件
cat .env | grep OPENROUTER_API_KEY

# 重启 Docker 容器
docker restart insight-dev

# 验证环境变量
docker exec insight-dev printenv | grep OPENROUTER
```

#### 2. 端口冲突

**症状**: 端口 3000 已被占用

**解决**:
```bash
# 查找占用端口的进程
lsof -i :3000

# 使用不同端口
docker run -p 3001:3000 insight:dev

# 或停止冲突的服务
pkill -f "port.*3000"
```

#### 3. Docker 权限问题

**症状**: Permission denied 或 文件权限错误

**解决**:
```bash
# Linux: 添加用户到 docker 组
sudo usermod -aG docker $USER
newgrp docker

# macOS: 重启 Docker Desktop

# Windows: 确保使用管理员权限运行
```

#### 4. 内存不足

**症状**: 容器意外退出，OOM 错误

**解决**:
```bash
# 增加 Docker 内存限制
# Docker Desktop: Settings > Resources > Memory: 8GB

# 限制并发处理
export INSIGHT_MAX_WORKERS=2

# 处理大文件时使用文件限制
pnpm dev analyze ./large-project --max-files 10
```

#### 5. 网络连接问题

**症状**: API 调用失败，网络超时

**解决**:
```bash
# 测试网络连接
curl -I https://openrouter.ai

# 检查代理设置
echo $HTTP_PROXY $HTTPS_PROXY

# 容器内测试
docker exec insight-dev curl -I https://openrouter.ai
```

### 日志调试

```bash
# 启用详细日志
export INSIGHT_LOG_LEVEL=debug

# Docker 容器日志
docker logs -f insight-dev

# 应用程序日志
pnpm dev analyze ./project --verbose

# 系统资源监控
docker stats insight-dev
```

### 性能问题诊断

```bash
# 检查缓存命中率
ls -la .insight-cache/
pnpm dev analyze ./project --verbose  # 查看缓存统计

# 分析处理时间
time pnpm dev analyze ./project

# 内存使用情况
docker exec insight-dev sh -c "free -h && ps aux --sort=-%mem | head"
```

## ⚡ 性能优化

### 缓存优化

```bash
# 使用命名卷保存缓存（Docker）
docker volume create insight-cache
docker run -v insight-cache:/app/.insight-cache ...

# 预热缓存（针对大项目）
pnpm dev analyze ./large-project --max-files 5  # 先分析小部分
pnpm dev analyze ./large-project --max-files 20 # 逐步增加
```

### 资源分配

```yaml
# Docker Compose 资源限制
services:
  insight:
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2'
        reservations:
          memory: 2G
          cpus: '1'
```

### 批处理策略

```bash
# 大项目分批处理
pnpm dev analyze ./src --max-files 20 --exclude "**/tests/**"
pnpm dev analyze ./lib --max-files 15
pnpm dev analyze ./utils --max-files 10

# 使用文件过滤
pnpm dev analyze ./project --include "**/*.py" --exclude "**/migrations/**"
```

## 🏆 最佳实践

### 开发环境最佳实践

1. **始终使用 Docker**: 避免环境配置问题
2. **配置 .env 文件**: 统一管理环境变量
3. **使用版本控制**: `.env` 加入 `.gitignore`，使用 `.env.example` 作为模板
4. **定期清理缓存**: 避免过期缓存影响结果
5. **监控资源使用**: 特别是处理大项目时

### 生产环境最佳实践

1. **使用命名卷**: 持久化重要数据
2. **配置健康检查**: 自动监控服务状态
3. **设置资源限制**: 防止单个容器消耗过多资源
4. **备份配置文件**: 定期备份 `.env` 和配置文件
5. **日志轮转**: 防止日志文件无限增长

### 安全最佳实践

1. **保护 API Key**: 
   - 不要将 API Key 写入代码或提交到版本控制
   - 使用环境变量或密钥管理系统
   - 定期轮换 API Key

2. **容器安全**:
   - 使用最新的基础镜像
   - 以非 root 用户运行容器
   - 挂载只读文件系统（除必要的写入目录）

3. **网络安全**:
   - 限制容器网络访问
   - 使用防火墙保护服务端口
   - 配置 HTTPS (生产环境)

### 项目管理最佳实践

```bash
# 项目文件结构建议
your-project/
├── .env                  # 环境配置（不提交）
├── .env.example         # 环境配置模板
├── insight.config.json  # Insight 配置
├── .insight-cache/      # 缓存目录（不提交）
├── insight-docs/        # 生成的文档
└── docker-compose.yml   # Docker 编排（可选）
```

### 团队协作最佳实践

1. **标准化环境**: 所有团队成员使用相同的 Docker 配置
2. **文档更新**: 及时更新部署文档和 README
3. **版本管理**: 使用语义化版本号
4. **代码审查**: 审查配置文件变更
5. **监控告警**: 设置生产环境监控和告警

---

## 📞 获取帮助

- **文档**: [项目文档](../README.md)
- **问题**: [GitHub Issues](https://github.com/your-org/insight/issues)
- **讨论**: [GitHub Discussions](https://github.com/your-org/insight/discussions)
- **测试**: [测试指南](./testing-guide.md)
- **已知问题**: [已知问题](./known-issues.md)

---

*最后更新: 2025-01-09*  
*Docker-first 部署策略 - 简化部署，专注开发*