# CLI 子系统指南（src/cli）

## 职责与结构
- 入口：`index.ts` 使用 Commander 注册 `init`、`analyze`、`serve` 三个子命令，并统一处理未捕获错误与信号。
- 命令目录：`src/cli/commands/`（`analyze.ts`、`init.ts`、`serve.ts`）。每个文件导出 `createXxxCommand()` 并在 `index.ts` 汇总。

## 数据流（命令级）
- `analyze <path>`
  - 读取配置(`utils/config`) → `FileScanner.scan()` → `ASTAnalyzer.analyzeFile()`（按文件）→ `OpenRouterService.analyzeCode()`（命中缓存则跳过请求）→ `DocumentationGenerator.generate()` 写入 `insight-docs/` → 输出统计与错误摘要；`--error-report` 可导出 JSON。
- `serve`
  - 解析 `--port/--host/--docs-dir` → 创建 `WebServer` 提供 `/`、`/api/docs`、`/api/health`，在空目录场景提供友好引导页，支持 `--open` 自动打开浏览器。
- `init`
  - 交互式生成/覆盖 `insight.config.json`：选择 LLM 提供商、主模型、输出目录、忽略路径、是否启用缓存等。

## 常用选项（节选）
- `analyze`: `--output`、`--max-files`、`--include/--exclude`、`--verbose`、`--continue-on-error | --stop-on-error`、`--error-report`。
- `serve`: `--port`、`--host`、`--docs-dir`、`--open`、`--verbose`。

## 约定与扩展
- 新增命令：在 `src/cli/commands/new-cmd.ts` 导出 `createNewCmdCommand()`，于 `index.ts` 调用 `program.addCommand(...)` 注册；保持与现有命令一致的错误处理与日志风格（`utils/logger`）。
- 输出稳定性：CI/容器环境下 `serve` 已降级 ora 为日志输出，避免 ANSI 干扰。
- 配置优先级：`insight.config.json` < 环境变量（如 `MODEL`） < 命令行选项。

## 验证建议
- 开发期先用小集 `--max-files` 与 `--verbose` 观察扫描/AST/LLM 命中情况。
- 变更 CLI 参数或默认值时，更新 `README.md` 与 `docs/deployment.md` 的用法片段。
- 若新增选项与配置项关联，请同步更新 `insight.config.json` 与类型 `src/types`。
