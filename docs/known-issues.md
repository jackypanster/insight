# Insight 已知问题

本文档记录 Insight 文档生成器的当前限制和已知问题。

> **📋 部署问题**: 如遇到安装或配置问题，请参考 [部署文档](deployment.md)

## 当前版本: v0.3.1

### 核心功能限制

#### Python 分析限制
- **动态代码**: 无法分析动态生成的类和函数
- **复杂装饰器**: 高级装饰器模式可能无法完全分析
- **元类**: 对复杂元类模式支持有限
- **导入解析**: 大型项目中复杂的导入路径可能被遗漏

#### 框架检测准确性
- **Django 项目**: 可能遗漏非标准的 Django 项目结构
- **FastAPI 检测**: 依赖导入模式，可能遗漏动态导入
- **数据科学**: 仅检测常见包（pandas, numpy, jupyter）

#### AST 分析边界情况  
- **超大文件**: >10MB 的文件会被跳过（可配置）
- **深层嵌套**: 极深的类层次结构可能超时
- **编码问题**: 非 UTF-8 文件可能导致解析错误

### LLM 集成问题

#### API 可靠性
- **速率限制**: OpenRouter API 可能在大项目中限制请求
- **网络问题**: 网络连接问题可能导致 API 调用失败
- **Token 限制**: 非常大的文件可能超出模型上下文窗口
- **成本管理**: 没有内置成本跟踪或限制

#### 文档质量
- **上下文丢失**: 大文件可能在分析中丢失重要上下文
- **风格不一致**: AI 生成的文档在不同文件间可能风格不同
- **技术准确性**: 生成的文档应当人工审查

### 性能限制

#### 资源使用
- **内存**: 1000+ 文件的项目内存使用较高
- **CPU**: AST 解析对复杂 Python 代码是 CPU 密集型
- **磁盘 I/O**: 频繁的缓存读写可能影响性能
- **网络**: API 调用为分析管道增加延迟

#### 超时和限制
- **单文件超时**: 分析超时 30 秒（可配置）
- **最大文件大小**: 10MB（可配置，但可能导致内存问题）
- **并发处理**: 受系统资源限制

## 🔧 解决方案和最佳实践

### 大型项目处理
```bash
# 使用文件限制和排除模式
pnpm dev analyze ./large-project --max-files 50 --exclude "**/tests/**"

# 分批处理
pnpm dev analyze ./src --max-files 20
pnpm dev analyze ./lib --max-files 15
```

### 性能优化
```bash
# 使用更多 worker 进程（适合多核机器）
export INSIGHT_MAX_WORKERS=8
pnpm dev analyze ./project --max-files 30

# 使用更快的模型
export MODEL=google/gemini-2.0-flash-lite-001
pnpm dev analyze ./project
```

### API 成本管理  
```bash
# 积极使用缓存
pnpm dev analyze ./project --max-files 10  # 首次运行
pnpm dev analyze ./project --max-files 10  # 缓存命中，成本为零

# 使用成本更低的模型
export MODEL=openai/gpt-3.5-turbo
pnpm dev analyze ./project
```

### 错误处理最佳实践
```bash
# 继续处理错误文件（默认）
pnpm dev analyze ./legacy-project --continue-on-error

# 生成详细错误报告
pnpm dev analyze ./problematic-project --error-report

# 在第一个错误处停止（严格模式）
pnpm dev analyze ./critical-project --stop-on-error
```

## 🗓️ 发展路线图

### 版本 0.3.2 (下一个版本)
- [ ] 改进的错误处理和恢复机制
- [ ] 增强的缓存策略和性能优化
- [ ] 大项目多阶段分析支持
- [ ] 更好的资源管理

### 版本 0.4.0 (未来版本)
- [ ] JavaScript/TypeScript 语言支持
- [ ] 实时文件监控和增量更新
- [ ] Web 界面功能改进
- [ ] 分布式处理支持

### 版本 0.5.0 (长期目标)
- [ ] 多语言支持 (Go, Java, C++)
- [ ] 插件架构和自定义分析器
- [ ] 高级缓存（Redis 支持）
- [ ] CI/CD 管道集成

## 📝 问题报告

### 报告模板
```markdown
**环境信息:**
- 操作系统: [例如: macOS 14.1, Ubuntu 22.04, Windows 11]
- Node.js 版本: [例如: v20.10.0]
- 部署方式: [Docker/本地]
- 项目规模: [例如: 150 文件, 50K 行代码]

**复现步骤:**
1. [具体操作步骤]
2. [包含使用的命令]
3. [相关配置]

**预期行为:**
[描述您期望发生什么]

**实际行为:**
[描述实际发生了什么]

**日志输出:**
[粘贴相关的错误信息或日志]
```

### 调试信息收集
```bash
# 收集系统信息
pnpm dev --version
node --version

# 启用详细日志
export INSIGHT_LOG_LEVEL=debug
pnpm dev analyze ./project --verbose

# 检查配置文件
cat .env | grep -v "KEY"  # 隐藏敏感信息
cat insight.config.json
```

## 🤝 贡献指南

帮助解决这些问题的方式：

1. **跨平台测试**: 在不同操作系统上测试功能
2. **性能分析**: 识别性能瓶颈和优化机会
3. **文档改进**: 完善部署和故障排除指南
4. **错误处理**: 改进资源受限时的优雅降级

---

## 🔗 相关文档

- 🚀 **部署问题**: 请参考 [部署文档](deployment.md)
- 🧪 **功能测试**: 查看 [测试指南](testing-guide.md)
- 📖 **使用说明**: 查看 [项目 README](../README.md)

---

*最后更新: 2025-01-09*  
*专注问题和解决方案 - 部署配置请参考部署文档*