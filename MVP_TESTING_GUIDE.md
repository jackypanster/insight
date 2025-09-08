# MVP 测试指南 (MVP Testing Guide)

本指南旨在帮助用户快速上手 Insight MVP，进行全面测试，并识别需要改进的地方。

## 测试前准备 (Pre-Testing Setup)

### 环境要求 (Requirements)
- Node.js ≥ 20.0.0
- pnpm ≥ 8.0.0  
- OpenRouter API Key

### 安装步骤 (Installation)
```bash
# 1. 安装 pnpm
npm install -g pnpm

# 2. 验证版本
node -v  # 应该显示 v20.x.x 或更高
pnpm -v  # 应该显示 8.x.x 或更高

# 3. 安装项目依赖
pnpm install

# 4. 检查环境变量
cat .env  # 确保 OPENROUTER_API_KEY 已设置
```

## 核心功能测试 (Core Functionality Tests)

### 测试 1: CLI 基础功能
```bash
# 验证 CLI 工具可用
pnpm dev --version
pnpm dev --help

# 验证子命令
pnpm dev init --help
pnpm dev analyze --help
pnpm dev serve --help
```

**预期结果**: 所有命令都应该显示帮助信息，无错误输出。

### 测试 2: 配置初始化
```bash
# 初始化配置
pnpm dev init

# 检查生成的配置文件
cat insight.config.json
```

**预期结果**: 
- [ ] 生成 `insight.config.json` 文件
- [ ] 配置包含 LLM 设置、扫描选项、生成选项
- [ ] 输出目录设置为 `insight-docs`

### 测试 3: 基础代码分析
```bash
# 分析示例文件
pnpm dev analyze ./examples --verbose --max-files 5

# 检查输出
ls -la insight-docs/
```

**预期结果**:
- [ ] 成功扫描并分析 Python 文件
- [ ] 生成文档目录结构：
  - [ ] `README.md` (项目概览)
  - [ ] `ARCHITECTURE.md` (架构分析)  
  - [ ] `STATISTICS.json` (统计信息)
  - [ ] `files/` 目录 (单个文件文档)
- [ ] 显示进度条和缓存信息
- [ ] 无致命错误

### 测试 4: Web 服务器功能
```bash
# 启动 Web 服务器
pnpm dev serve --open
```

**Web 界面测试**:
- [ ] 浏览器自动打开 http://localhost:3000
- [ ] 主页显示项目概览和统计信息
- [ ] 可以导航到不同的文档页面
- [ ] Mermaid 图表正确渲染

**API 端点测试**:
```bash
# 在另一个终端测试 API
curl http://localhost:3000/api/health
curl http://localhost:3000/api/docs
curl "http://localhost:3000/api/docs/sample.py"
```

**预期结果**:
- [ ] `/api/health` 返回健康状态
- [ ] `/api/docs` 返回文档列表
- [ ] `/api/docs/:file` 返回具体文件文档
- [ ] 所有响应格式为有效 JSON

### 测试 5: 缓存机制
```bash
# 第二次运行同样的分析
pnpm dev analyze ./examples --verbose --max-files 5
```

**预期结果**:
- [ ] 显示 "Cache hit" 信息
- [ ] 执行时间显著缩短 (接近 0 秒)
- [ ] 生成相同的文档内容

## 高级功能测试 (Advanced Feature Tests)

### 测试 6: 复杂 Python 项目
```bash
# 分析项目本身的 Python 文件
pnpm dev analyze ./test_enhanced.py --verbose

# 或分析更大的项目
git clone https://github.com/calmjs/calmjs /tmp/calmjs
pnpm dev analyze /tmp/calmjs --max-files 20
```

**预期结果**:
- [ ] 正确识别 Python 框架和模式
- [ ] 生成详细的架构分析
- [ ] Mermaid 图表包含类继承和依赖关系

### 测试 7: 错误处理
```bash
# 创建有语法错误的 Python 文件进行测试
echo "def broken_function(" > /tmp/broken.py
pnpm dev analyze /tmp/broken.py --error-report
```

**预期结果**:
- [ ] 程序不会崩溃
- [ ] 显示错误统计信息
- [ ] 生成 `insight-errors.json` 错误报告
- [ ] 错误分类正确 (syntax_error)

### 测试 8: 配置选项
```bash
# 测试不同的命令行选项
pnpm dev serve --port 3001 --host 0.0.0.0
pnpm dev analyze ./examples --output ./custom-docs --include "*.py"
```

**预期结果**:
- [ ] Web 服务器在指定端口启动
- [ ] 文档输出到自定义目录
- [ ] 文件过滤按预期工作

## 性能测试 (Performance Tests)

### 测试 9: 大文件处理
```bash
# 测试大文件处理能力
python3 -c "
with open('/tmp/large_file.py', 'w') as f:
    f.write('# Large Python file\n')
    for i in range(1000):
        f.write(f'def function_{i}(): pass\n')
"

pnpm dev analyze /tmp/large_file.py --verbose
```

**预期结果**:
- [ ] 成功处理大文件 (不超时)
- [ ] 内存使用保持合理
- [ ] 生成相应的文档

### 测试 10: 并发文件分析
```bash
# 创建多个 Python 文件
mkdir -p /tmp/multi-files
for i in {1..10}; do
    cat > /tmp/multi-files/file_$i.py << EOF
"""Module $i"""
class Class$i:
    def method$i(self):
        return $i
EOF
done

pnpm dev analyze /tmp/multi-files --verbose
```

**预期结果**:
- [ ] 正确处理多个文件
- [ ] 显示处理进度
- [ ] 生成综合架构分析

## 边界条件测试 (Edge Case Tests)

### 测试 11: 空项目和无效路径
```bash
# 测试空目录
mkdir -p /tmp/empty-dir
pnpm dev analyze /tmp/empty-dir

# 测试不存在的路径
pnpm dev analyze /nonexistent/path
```

**预期结果**:
- [ ] 空目录处理优雅，有适当提示
- [ ] 无效路径有清晰的错误信息

### 测试 12: 网络和 API 问题
```bash
# 临时设置无效的 API key
export OPENROUTER_API_KEY="invalid-key"
pnpm dev analyze ./examples --max-files 1
```

**预期结果**:
- [ ] 有清晰的 API 认证错误信息
- [ ] 程序不会崩溃
- [ ] 建议检查 API key 设置

## 用户体验测试 (UX Tests)

### 测试 13: 新用户流程
模拟完全新的用户环境:
```bash
# 重命名配置文件测试初始化流程
mv insight.config.json insight.config.json.backup 2>/dev/null || true

# 新用户完整流程
pnpm dev init
pnpm dev analyze ./examples
pnpm dev serve --open
```

### 测试 14: 帮助和错误信息质量
```bash
# 测试各种帮助信息
pnpm dev
pnpm dev init --help
pnpm dev analyze
pnpm dev serve --invalid-option
```

**预期结果**:
- [ ] 帮助信息清晰详尽
- [ ] 错误信息具有指导性
- [ ] 命令提示符合直觉

## 测试结果记录 (Test Results)

### 发现的问题 (Issues Found)
请记录测试中发现的问题:

1. **安装和环境问题**:
   - [ ] pnpm 未预装，需要明确安装指导
   - [ ] 

2. **功能问题**:
   - [ ] 
   - [ ] 

3. **性能问题**:
   - [ ] 
   - [ ] 

4. **用户体验问题**:
   - [ ] 
   - [ ] 

### 改进建议 (Improvement Suggestions)

#### 高优先级 (High Priority)
- [ ] 

#### 中优先级 (Medium Priority)  
- [ ] 

#### 低优先级 (Low Priority)
- [ ] 

## 测试完成确认 (Test Completion Checklist)

- [ ] 所有核心功能测试通过
- [ ] 高级功能测试完成
- [ ] 性能测试结果记录
- [ ] 边界条件测试完成  
- [ ] 用户体验问题记录
- [ ] 改进建议整理完毕

## 下一步行动 (Next Steps)

基于测试结果，建议的优化优先级:

1. **立即修复**: 阻塞基本功能的问题
2. **短期改进**: 影响用户体验的问题
3. **长期优化**: 性能和扩展性问题

---

**测试完成时间**: ________________  
**测试人员**: ________________  
**测试环境**: ________________