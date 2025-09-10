# 目录级 AGENTS 索引

面向贡献者的目录级总结文档（AGENTS.md），用于快速理解各模块的职责、数据流、扩展点与验证方式。

- src/cli — 入口与子命令
  - ./src/cli/AGENTS.md
- src/core/scanner — 文件扫描与过滤
  - ./src/core/scanner/AGENTS.md
- src/core/analyzer — AST 分析（Python）
  - ./src/core/analyzer/AGENTS.md
- src/core/llm — LLM 集成与缓存
  - ./src/core/llm/AGENTS.md
- src/core/generator — 文档与图表生成
  - ./src/core/generator/AGENTS.md
- src/core/server — 文档 Web 服务
  - ./src/core/server/AGENTS.md
- src/services/cache — 缓存管理
  - ./src/services/cache/AGENTS.md
- src/services/errors — 错误采集
  - ./src/services/errors/AGENTS.md
- src/utils — 配置与日志工具
  - ./src/utils/AGENTS.md
- src/types — 类型定义
  - ./src/types/AGENTS.md

建议：阅读顺序遵循执行链路 — CLI → scanner → analyzer → llm → generator → server，再补充 services/utils/types 以完善全局认知。若需全局优先级与节奏，请参阅：
- ./docs/architecture-overview.zh.md（架构总览与流程图）
- ./docs/priority-optimization.zh.md（全局优化优先级与路线图）
- RFC（P0）：
  - ./docs/rfc-llm-structured-json.zh.md（LLM 输出结构化 JSON）
  - ./docs/rfc-cache-versioning-telemetry.zh.md（缓存键版本化与遥测）

维护建议：
- 当实现发生结构性变化（接口/数据/协议）时，优先更新对应目录的 AGENTS.md，其次更新全局架构与优先级文档。
- 建议每次合并前执行一次“文档巡检”，确保示例命令与配置片段可运行。
