# Insight 测试指南

本指南提供 Insight 功能验证和测试的完整方法，帮助开发者和用户验证各项功能是否正常工作。

> **📋 部署环境**: 如需安装和部署说明，请参考 [部署文档](deployment.md)

## 🎯 测试目标

本测试指南涵盖以下功能验证：
- ✅ CLI 命令和参数解析
- ✅ Python 代码分析准确性
- ✅ 文档生成质量
- ✅ Web 服务器功能
- ✅ 错误处理和恢复
- ✅ 性能和缓存效果
- ✅ 多平台兼容性

## 🧪 测试环境准备

### 基本要求
- 已部署的 Insight 环境（Docker 或本地）
- 配置好的 API Key
- 测试用的 Python 项目

### 快速验证环境
```bash
# 验证基本功能
pnpm dev --version
pnpm dev --help

# 验证API配置
echo $OPENROUTER_API_KEY  # 或检查 .env 文件
```

## 🔧 核心功能测试

### 测试 1: CLI 框架和帮助
```bash
# 测试基本 CLI 功能
pnpm dev --version
pnpm dev --help

# 测试子命令
pnpm dev init --help
pnpm dev analyze --help
pnpm dev serve --help
```

**预期结果**:
- [ ] 版本显示正确格式 (例如: v0.3.1)
- [ ] 帮助文本显示所有可用命令
- [ ] 无错误信息或程序崩溃

### 测试 2: 配置初始化
```bash
# 在当前目录初始化配置
pnpm dev init

# 验证配置文件
cat insight.config.json
```

**预期结果**:
- [ ] `insight.config.json` 创建且结构正确
- [ ] 包含 LLM 设置、扫描选项、生成设置
- [ ] 默认输出目录设置为 `insight-docs`

### 测试 3: Python 代码分析
```bash
# 验证环境变量配置
cat .env | grep OPENROUTER_API_KEY

# 分析 Python 项目（使用示例或自己的项目）
pnpm dev analyze ./examples --verbose --max-files 3

# 检查生成的文档
ls -la insight-docs/
cat insight-docs/README.md
```

**预期结果**:
- [ ] 分析完成无致命错误
- [ ] 显示处理进度指示器
- [ ] 生成的文件包含:
  - [ ] `README.md` (项目概览)
  - [ ] `ARCHITECTURE.md` (架构分析)
  - [ ] `files/` 目录中的详细文件文档
- [ ] 显示缓存信息 (命中/未命中统计)

### 测试 4: Web 文档服务器
```bash
# 启动文档服务器
pnpm dev serve --docs-dir ./insight-docs --host 0.0.0.0

# 在另一个终端测试 API 端点
curl http://localhost:3000/api/health
curl http://localhost:3000/api/docs
```

**Web 界面测试**:
- [ ] 在浏览器中打开 http://localhost:3000
- [ ] 首页加载并显示项目统计信息
- [ ] 导航菜单正常工作
- [ ] 各文件文档正确渲染
- [ ] Mermaid 图表正确显示（如已生成）

**API 测试**:
- [ ] `/api/health` 返回健康状态
- [ ] `/api/docs` 返回可用文档列表
- [ ] 各文件端点返回正确的 JSON 响应

## 🚀 集成功能测试

### 测试 5: 端到端完整流程
```bash
# 完整流程测试：配置 → 分析 → 服务
pnpm dev init
pnpm dev analyze ./examples --max-files 5
pnpm dev serve --port 3001 --open

# 验证完整工作流
curl http://localhost:3001/api/health
curl http://localhost:3001/api/docs
```

**预期结果**:
- [ ] 配置文件成功创建
- [ ] 分析过程完成且生成文档
- [ ] Web 服务器启动并可访问
- [ ] API 端点响应正常

### 测试 6: 缓存功能验证
```bash
# 第一次运行（应创建缓存）
time pnpm dev analyze ./examples --max-files 3 --verbose

# 第二次运行（应使用缓存）
time pnpm dev analyze ./examples --max-files 3 --verbose

# 检查缓存目录
ls -la .insight-cache/
```

**预期结果**:
- [ ] 第一次运行显示 "Cache miss"
- [ ] 第二次运行显示 "Cache hit" 且更快完成
- [ ] 缓存目录包含相应文件

## 🧪 高级功能测试

### 测试 7: 大文件处理
```bash
# 创建一个包含多个类的测试文件
python3 -c "
with open('/tmp/large_test.py', 'w') as f:
    f.write('\"\"\"Large Python file for testing\"\"\"\n')
    for i in range(100):
        f.write(f'''
class TestClass{i}:
    \"\"\"Test class {i}\"\"\"
    def method_{i}(self):
        return {i}
''')
"

# 分析大文件
timeout 60 pnpm dev analyze /tmp/large_test.py --verbose
```

**预期结果**:
- [ ] 分析在合理时间内完成 (<60s)
- [ ] 没有内存相关的崩溃
- [ ] 生成的文档内容连贯

### 测试 8: 错误处理和恢复
```bash
# 测试语法错误文件
echo "def broken_function(" > /tmp/broken.py

# 分析语法错误文件
pnpm dev analyze /tmp/broken.py --error-report --verbose
```

**预期结果**:
- [ ] 程序不会因语法错误而崩溃
- [ ] 生成错误报告且分类正确
- [ ] 显示有用的错误信息

### 测试 9: API 和网络问题
```bash
# 测试无 API Key 情况
OPENROUTER_API_KEY="" pnpm dev analyze ./examples/simple.py

# 测试无效 API Key
OPENROUTER_API_KEY="invalid-key" pnpm dev analyze ./examples/simple.py
```

**预期结果**:
- [ ] 显示关于缺失/无效 API Key 的清晰错误信息
- [ ] 提供修复配置的建议
- [ ] 程序正常退出

## 🌐 跨平台兼容性测试

### 测试 10: 不同操作系统
```bash
# macOS/Linux
pnpm dev analyze ./examples --max-files 3

# Windows (PowerShell)
pnpm dev analyze .\examples --max-files 3

# 验证路径处理
pnpm dev analyze ./examples/nested/path --verbose
```

**预期结果**:
- [ ] 所有操作系统上命令执行成功
- [ ] 路径解析正确处理
- [ ] 生成相同质量的文档

## 📊 性能和负载测试

### 测试 11: 资源使用监控
```bash
# 监控内存和CPU使用
pnpm dev analyze ./examples --max-files 10 --verbose &
ANALYSIS_PID=$!

# 在另一个终端监控资源
top -p $ANALYSIS_PID   # Linux
# 或 Activity Monitor 查看进程 (macOS)

wait $ANALYSIS_PID
```

**预期结果**:
- [ ] 内存使用保持在合理范围内 (<2GB)
- [ ] CPU 使用正常，不会100%占用
- [ ] 没有内存泄漏

### 测试 12: 并发处理能力
```bash
# 测试多文件并发分析
pnpm dev analyze ./examples --max-files 20 --verbose

# 监控并发worker数量
export INSIGHT_MAX_WORKERS=2
pnpm dev analyze ./examples --max-files 10 --verbose

export INSIGHT_MAX_WORKERS=8
pnpm dev analyze ./examples --max-files 10 --verbose
```

**预期结果**:
- [ ] 多文件分析正常完成
- [ ] 不同worker配置都能正常工作
- [ ] 性能随worker数量合理变化

## 🔧 调试和故障排除测试

### 测试 13: 详细日志和调试
```bash
# 启用详细日志
export INSIGHT_LOG_LEVEL=debug
pnpm dev analyze ./examples --verbose

# 分析日志内容
grep -i "error\|warning" ~/.insight-cache/logs/* || echo "No error logs found"
```

**预期结果**:
- [ ] 详细日志信息有助于问题诊断
- [ ] 警告信息清晰明确
- [ ] 错误信息提供解决建议

## 📋 测试结果记录

### 测试检查清单

#### 核心功能 ✅
- [ ] 测试 1: CLI 框架和帮助
- [ ] 测试 2: 配置初始化  
- [ ] 测试 3: Python 代码分析
- [ ] 测试 4: Web 文档服务器

#### 集成功能 ✅  
- [ ] 测试 5: 端到端完整流程
- [ ] 测试 6: 缓存功能验证

#### 高级功能 ✅
- [ ] 测试 7: 大文件处理
- [ ] 测试 8: 错误处理和恢复
- [ ] 测试 9: API 和网络问题

#### 兼容性和性能 ✅
- [ ] 测试 10: 跨平台兼容性
- [ ] 测试 11: 资源使用监控
- [ ] 测试 12: 并发处理能力
- [ ] 测试 13: 调试和故障排除

### 问题报告模板

```markdown
## 测试问题报告 - [日期]

### 环境信息
- 操作系统: [macOS/Linux/Windows]
- Node.js 版本: [版本]
- 测试方式: [Docker/本地]

### 问题描述
- **测试项**: [测试编号和名称]
- **严重程度**: [高/中/低]
- **问题现象**: [具体错误信息或异常行为]
- **重现步骤**: [详细步骤]
- **临时解决方法**: [如有]

### 环境差异
- **预期行为**: [应该如何工作]
- **实际行为**: [实际发生什么]
- **影响范围**: [影响哪些功能]
```

## ✅ 发布标准

### MVP 发布就绪标准
所有核心测试 (测试 1-6) 必须在以下环境中通过:
- ✅ macOS (Docker/本地)
- ✅ Linux (Docker/本地)  
- ✅ Windows (Docker + WSL2)

### 测试后续步骤
1. **记录问题**: 使用问题报告模板记录所有发现
2. **优先级排序**: 优先解决阻塞性问题
3. **更新文档**: 反映发现的限制或注意事项
4. **性能基线**: 记录性能指标用于回归测试

---

## 🔗 相关文档

- 🚀 **部署问题**: 请参考 [部署文档](deployment.md)
- 🔧 **已知问题**: 查看 [已知问题文档](known-issues.md) 
- 📖 **功能说明**: 查看 [项目 README](../README.md)

---

*最后更新: 2025-01-09*  
*专注功能测试验证 - 部署配置请参考部署文档*