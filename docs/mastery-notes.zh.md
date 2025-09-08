# Insight 项目掌握笔记（Mastery Notes）

本笔记面向新/现有贡献者，快速建立对 Insight（AI 驱动的遗留代码文档生成器）的系统理解与实践路径。

## 一、核心认知（从 0 到 1）
- 技术栈：Node.js + TypeScript；MVP 以 Python 代码分析为先（Tree‑sitter）。
- 主流程：CLI → 扫描（Scanner）→ 语法/语义分析（Analyzer）→ LLM 生成（OpenRouter）→ 文档生成 + 图表（Generator + Mermaid）→ 本地服务预览（Serve）。
- 关键目录：
  - `src/cli`: CLI 入口与 `init/analyze/serve` 子命令
  - `src/core`: `scanner/`、`analyzer/`、`llm/`、`generator/`、`diagrams/`、`server/`
  - `tests/`: unit/integration/edge 用 Vitest
  - 配置：`insight.config.json`、`.eslintrc.json`、`vitest.config.ts`

## 二、常用命令（本地开发）
- 安装：`pnpm install`（Node ≥ 20, pnpm ≥ 8）
- 开发运行：`pnpm dev`（直接执行 `src/cli/index.ts`）
- 质量基线：`pnpm quality`（lint + type‑check + 覆盖率）
- 生成文档：
  - 初始化：`insight init`（交互写入 `insight.config.json`）
  - 分析：`insight analyze <path> [-v --max-files 10 --include ".py" --exclude "tests/**"]`
  - 预览：`insight serve -o [-p 3000 -h localhost -d insight-docs]`
- 测试：`pnpm test` / `pnpm test:unit` / `pnpm test:integration`

## 三、配置与环境
- 模型/提供商：默认 OpenRouter；需要 `OPENROUTER_API_KEY`。可用 `MODEL` 环境变量临时覆写主模型。
- 扫描：`scanning.includeExtensions` 默认 `['.py']`；文件大小上限 `maxFileSize`；忽略规则支持配置 + `.gitignore`（暂不支持 `!` 否定规则）。
- 缓存：磁盘 + 内存，默认 24h（`.insight-cache/`）。变更文件内容/模型会失效重算。

## 四、关键数据结构（简表）
- `FileInfo`：`{ path, size, hash, language, lastModified }`
- `AnalysisResult`（Python）：函数/类/导入/全局变量/复杂度/行数/框架提示/设计模式/`analysisStatus`（success|partial|failed）
- `LLMAnalysis`：`summary`、`documentation[]`、`architecture{}`、`quality{}`
- 生成产物：`insight-docs/` 下 `README.md`、`ARCHITECTURE.md`、`files/*.md`、`STATISTICS.json`

## 五、易错点与排障
- 未设置 `OPENROUTER_API_KEY`：LLM 调用报错；代码会回退到 fallback/静态分析。
- 仅支持 Python 解析：扩大语言需扩展 `includeExtensions` 与 Analyzer 语言支持。
- `.gitignore` 不支持否定模式：复杂忽略请放入 `scanning.ignorePaths`。
- 大文件/语法错误：Analyzer 超时 30s；`--continue-on-error` 建议默认开启并生成 `insight-errors.json`。
- 端口占用：`insight serve --port 3001`。

## 六、上手练习（建议 30–60 分钟）
1) `insight init` → 选择 OpenRouter，输出目录 `insight-docs`。
2) `insight analyze ./examples -v --max-files 5` → 观察扫描统计、错误报告与缓存命中信息。
3) `insight serve -o` → 浏览首页、`/api/docs`、`/api/docs/:file`、`/api/health`。
4) 修改某个 Python 文件后重跑 analyze → 验证缓存失效与生成差异。
5) 新增模板目录 `templates/` 并放入自定义 `.hbs` → 查看生成变化。

## 七、扩展点（如何贡献高价值改进）
- 语言扩展：为 Analyzer 接入更多 Tree‑sitter 语言；调整 `scanner` 的 `includeExtensions`；确保生成与图表兼容。
- 扫描改进：实现 `.gitignore` 否定规则；更细粒度 include/exclude；符号链接策略。
- Prompt/解析：优化 `OpenRouterService` 的 prompt 与响应解析器，提升结构化文档质量。
- 模板/图表：新增 Handlebars 模板与 Mermaid 图表（例如依赖分层、调用图）。
- 稳定性：在 `ErrorCollector` 中扩展分类/上下文；增加恢复策略与更详细的总结输出。

## 八、质量与基线
- Lint：`pnpm lint[:fix]`；格式化：`pnpm format[:check]`；类型检查：`pnpm type-check`。
- 覆盖率门槛：见 `vitest.config.ts`（全局约 ≥ 80%，关键模块更高）。
- PR 要求：Conventional Commits、`pnpm quality` 通过、补充测试与文档（必要时截图/示例）。

