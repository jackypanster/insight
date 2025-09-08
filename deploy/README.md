# 🐳 Docker 部署文档

本目录包含 Insight 项目的完整 Docker 解决方案，解决了原生环境的兼容性问题，确保在所有开发环境中的一致性。

## 🚀 快速开始

### 1. 最简单的启动方式

```bash
# 从项目根目录
./deploy/scripts/docker-dev.sh
```

就这么简单！脚本会自动：
- 检查 Docker 运行状态
- 创建 .env 文件（如果不存在）
- 启动开发环境
- 提供访问地址

### 2. 使用 docker-compose

```bash
# 启动开发环境
docker compose -f deploy/docker/docker-compose.yml up insight-dev

# 后台运行
docker compose -f deploy/docker/docker-compose.yml up insight-dev -d

# 生产环境
docker compose -f deploy/docker/docker-compose.yml up insight
```

## 📁 目录结构

```
deploy/
├── docker/
│   ├── Dockerfile              # 生产环境镜像
│   ├── Dockerfile.dev         # 开发环境镜像
│   ├── docker-compose.yml    # Docker Compose 配置
│   └── .dockerignore          # Docker 忽略文件
├── scripts/
│   ├── docker-dev.sh          # 开发环境启动（推荐）
│   ├── docker-build.sh        # 镜像构建
│   ├── docker-test.sh         # 测试运行
│   └── docker-clean.sh        # 环境清理
└── README.md                   # 本文档
```

## 🛠️ 便捷脚本使用

### 开发环境

```bash
# 启动开发环境（交互模式）
./deploy/scripts/docker-dev.sh

# 后台启动
./deploy/scripts/docker-dev.sh --background

# 重建镜像并启动
./deploy/scripts/docker-dev.sh --rebuild

# 清理后重新启动
./deploy/scripts/docker-dev.sh --clean
```

### 构建镜像

```bash
# 构建生产镜像
./deploy/scripts/docker-build.sh

# 构建开发镜像
./deploy/scripts/docker-build.sh --dev

# 无缓存构建
./deploy/scripts/docker-build.sh --no-cache

# 构建并推送到仓库
./deploy/scripts/docker-build.sh --push --tag insight:v1.0.0
```

### 运行测试

```bash
# 运行所有测试
./deploy/scripts/docker-test.sh

# 运行特定类型测试
./deploy/scripts/docker-test.sh --unit
./deploy/scripts/docker-test.sh --integration
./deploy/scripts/docker-test.sh --edge

# 生成覆盖率报告
./deploy/scripts/docker-test.sh --coverage

# 监听模式
./deploy/scripts/docker-test.sh --watch
```

### 环境清理

```bash
# 停止并删除容器
./deploy/scripts/docker-clean.sh --containers

# 清理镜像
./deploy/scripts/docker-clean.sh --images

# 清理所有（包括数据卷）
./deploy/scripts/docker-clean.sh --all

# 强制清理（跳过确认）
./deploy/scripts/docker-clean.sh --all --force
```

## 🎯 服务配置

### Development Service (`insight-dev`)

- **端口**: 3000 (Web), 9229 (Debug)
- **特性**: 热重载、调试支持、完整开发工具
- **数据卷**: 代码目录挂载、持久化 node_modules
- **环境**: Node.js 20 + Python 3 + 构建工具

### Production Service (`insight`)

- **端口**: 3000
- **特性**: 多阶段构建、安全优化、健康检查
- **数据卷**: 只挂载必要的输出目录
- **环境**: 最小化运行时环境

### Test Service (`insight-test`)

- **用途**: 自动化测试、CI/CD
- **特性**: 独立环境、测试工具齐全
- **启动**: 按需启动（profile: test）

## 🔧 环境变量

主要环境变量配置（通过 `.env` 文件）：

```bash
# 必需
OPENROUTER_API_KEY=your-api-key

# 可选
INSIGHT_LOG_LEVEL=debug          # 日志级别
INSIGHT_CACHE_DIR=/app/.insight-cache  # 缓存目录
INSIGHT_MAX_WORKERS=4            # 最大并发数
HOST_PROJECT_PATH=./examples     # 要分析的项目路径
```

## 📊 数据持久化

### 开发环境持久化卷

- `node_modules_dev`: 开发依赖缓存
- `pnpm_store_dev`: pnpm 存储缓存
- `insight_cache_dev`: 分析缓存
- `insight_docs_dev`: 生成的文档

### 生产环境持久化卷

- `insight_docs`: 生成的文档
- `insight_cache`: 分析缓存

## 🐛 故障排除

### 常见问题

1. **Docker 未运行**
   ```bash
   # 启动 Docker Desktop 或 Docker 守护进程
   ```

2. **端口占用**
   ```bash
   # 检查端口占用
   lsof -i :3000
   
   # 使用不同端口
   docker run -p 3001:3000 insight:dev
   ```

3. **权限问题**
   ```bash
   # 确保脚本可执行
   chmod +x deploy/scripts/*.sh
   ```

4. **镜像构建失败**
   ```bash
   # 清理 Docker 缓存
   docker system prune -a
   
   # 无缓存重建
   ./deploy/scripts/docker-build.sh --no-cache
   ```

### 日志查看

```bash
# 查看开发环境日志
docker logs -f insight-dev

# 查看所有服务日志
docker compose -f deploy/docker/docker-compose.yml logs -f

# 查看特定服务日志
docker compose -f deploy/docker/docker-compose.yml logs insight-dev
```

## 🔗 集成开发环境

### VS Code Dev Containers

创建 `.devcontainer/devcontainer.json`：

```json
{
  "name": "Insight Development",
  "dockerComposeFile": "../deploy/docker/docker-compose.yml",
  "service": "insight-dev",
  "workspaceFolder": "/app",
  "extensions": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss"
  ],
  "settings": {
    "terminal.integrated.shell.linux": "/bin/bash"
  }
}
```

### GitHub Actions CI

```yaml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Tests
        run: |
          ./deploy/scripts/docker-build.sh --dev
          ./deploy/scripts/docker-test.sh --coverage
```

## 📈 性能优化

### 构建优化

1. **多阶段构建**: 减少最终镜像大小
2. **层缓存**: 优化 Dockerfile 层顺序
3. **.dockerignore**: 排除不必要文件

### 运行优化

1. **卷挂载**: 避免文件系统性能损失
2. **内存限制**: 适当设置容器资源限制
3. **网络模式**: 使用适当的网络配置

## 🚀 生产部署

### Docker Compose 部署

```bash
# 生产环境部署
docker compose -f deploy/docker/docker-compose.yml up insight -d

# 扩容（如果支持）
docker compose -f deploy/docker/docker-compose.yml up --scale insight=3 insight
```

### Kubernetes 部署

可以基于生成的镜像创建 Kubernetes 部署配置。

---

## 💡 为什么选择 Docker？

1. **环境一致性**: 开发、测试、生产完全一致
2. **依赖隔离**: 不污染主机环境
3. **快速启动**: 新开发者零配置开始
4. **问题解决**: 彻底解决 tree-sitter 编译问题
5. **可扩展性**: 便于 CI/CD 和生产部署

Docker 方案让我们专注于功能开发，而不是环境配置! 🎯