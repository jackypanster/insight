# RFC-P0-002：缓存键版本化与遥测（命中率/时延/成本）

## 背景与目标
- 现状：缓存键由“内容+上下文”散列生成；当提示词/解析器/模型版本变化时，可能出现“伪命中/伪未命中”。
- 目标：引入“键版本化”与“核心指标遥测”，在一致性不破坏的前提下降低成本、提升可观测与可运维性。

## 范围
- 主要影响 `OpenRouterService.analyzeCode()` 与 `CacheManager.generateKey()` 调用处；CacheManager 本身不破坏性变更。

## 提案
1) 键版本化（Key Versioning）
- 统一在 LLM 分析构造缓存键时加入：
  - `promptVersion`: 提示词/协议版本（手动维护常量，如 `v1`）。
  - `modelVersion`: 模型别名或版本号（如 `anthropic/claude-3.5-sonnet@2025-01-01`）。
  - `parserVersion`: 解析器/Schema 版本（如 `schema_v1`）。
- 规范：键上下文字段按固定顺序序列化（避免字典序不稳导致的哈希漂移）。
- 迁移：不删除旧值；新键生成与旧键并存，命不中则再走请求路径；可提供“清理旧版本”命令。

2) 遥测（Telemetry）
- 指标：
  - cache: `requests`, `hits`, `hitRate`, `avgLookupMs`。
  - llm: `calls`, `avgLatencyMs`, `fallbackCalls`, `jsonParseFail`, `schemaFail`。
- 来源：在 `OpenRouterService` 内部计数与计时；CacheManager 暴露命中/未命中的次数与耗时。
- 汇聚：
  - CLI Summary 打印核心指标。
  - 可选写入 `.insight-cache/metrics.json`（按 session 累计），方便后续图表化。

3) 配置与开关
- `insight.config.json` 增加 `telemetry: { enabled: true }`；环境变量 `INSIGHT_TELEMETRY=0/1` 覆盖。
- 键版本常量在 `OpenRouterService` 内定义（如 `PROMPT_VERSION='v1'`, `SCHEMA_VERSION='v1'`）。

## 实施细节
- 代码触点
  - OpenRouterService.analyzeCode():
    - 组装缓存上下文时，加入 `promptVersion/modelVersion/parserVersion`；
    - 在请求前记录开始时间；返回后记录耗时、是否 fallback；更新遥测计数器；
    - 输出 CLI Summary 时展示指标。
  - CacheManager：无需改动签名，只要调用方传入更丰富 context 即可。
- 输出格式（metrics.json 示例）
```json
{
  "sessionId": "2025-01-09T10:00:00Z-abc123",
  "cache": {"requests": 42, "hits": 31, "hitRate": 0.74, "avgLookupMs": 3.2},
  "llm": {"calls": 11, "avgLatencyMs": 820, "fallbackCalls": 2, "jsonParseFail": 1, "schemaFail": 0}
}
```

## 推进节奏
- Week1：实现键版本化；CLI Summary 显示 cache 请求/命中/命中率；可选 metrics.json 落盘。
- Week2：扩充 LLM 遥测（延时/降级/JSON 校验失败数）；对比开启前后命中率与成本变化。

## 风险与缓解
- 键上下文过大：序列化/哈希成本升高 → 仅保留摘要字段；必要时截断。
- 指标噪声：短会话下命中率方差大 → 支持跨会话聚合或以分钟窗口聚合。

## 验收
- 命中率可见且稳定；键版本调整时无“伪命中”。
- CLI Summary 可读；metrics.json（若开启）格式稳定可供后续可视化。

---

## 最小实现改动清单（MVP）
- 键版本化（只改调用方）
  - 在 `src/core/llm/OpenRouterService.analyzeCode()` 构造 cacheKey 时，context 增加：
    - `promptVersion='v1'`（与 RFC-P0-001 对齐）
    - `modelVersion=config.models.primary`（原样或带日期标签）
    - `parserVersion='schema_v1'`
  - CacheManager 本身无需改动。
- 遥测计数器（最小集）
  - OpenRouterService 内部：`llm.calls`、`llm.avgLatencyMs`、`llm.fallbackCalls`、`llm.jsonParseFail/schemaFail`（与 RFC-P0-001 复用）。
  - Cache 层计数：在 OpenRouterService 侧围绕 `cache.get/set` 增加 `cache.requests/hits` 与 `avgLookupMs`（以时间戳差值统计）。
- 输出与落盘（可选）
  - CLI Summary：在 analyze 收尾打印命中率、平均 LLM 延时与降级次数。
  - metrics.json：当 `INSIGHT_TELEMETRY=1` 时，写入 `.insight-cache/metrics.json`（追加或覆盖可选，MVP 可覆盖）。

## 开关布点
- 配置与环境变量
  - `telemetry.enabled`（insight.config.json，可选；默认 true）
  - `INSIGHT_TELEMETRY=0|1` 覆盖配置
  - `INSIGHT_METRICS_PATH`（可选，默认 `.insight-cache/metrics.json`）

## 代码触点与伪码
- 文件：`src/core/llm/OpenRouterService.ts`
  - analyzeCode(context):
    ```ts
    const t0 = Date.now();
    const cacheKey = cache.generateKey(content, {
      model: config.models.primary,
      filePath, language,
      astHash: {...},
      promptVersion: 'v1',
      modelVersion: config.models.primary,
      parserVersion: 'schema_v1'
    });

    incr(cache.requests);
    const tLookup0 = Date.now();
    const cached = await cache.get(cacheKey);
    add(cache.lookupMs, Date.now()-tLookup0);
    if (cached) { incr(cache.hits); return cached; }

    const result = await callLLM();
    add(llm.latencyMs, Date.now()-t0);
    await cache.set(cacheKey, result, 86400);
    return result;
    ```
  - getStats()：
    ```ts
    return { ...existing, telemetry: { cache: {...}, llm: {...} } }
    ```
- 文件：`src/cli/commands/analyze.ts`
  - 在流程末尾（成功/失败摘要后）打印：命中率、avg latency、fallback 次数（从 OpenRouterService.getStats() 读取）。
- 文件（可选）：`src/utils/config.ts` / `src/types/index.ts`
  - 新增 `telemetry` 配置类型（enabled: boolean），并在 loadConfig 合并；环境变量覆盖。

## 测试计划
- 单元测试
  - cacheKey：同一内容但不同 promptVersion → key 不同；相同 promptVersion → key 相同。
  - 计数器：模拟命中/未命中/回退，验证计数与平均值计算。
- 集成测试
  - 双次 analyze：第二次命中率应显著提升；CLI Summary 打印命中率与平均时延。
  - `INSIGHT_TELEMETRY=1`：生成 metrics.json，结构字段齐备。
- 端到端
  - 中等规模样本：观察“请求数/命中率/平均延时/回退数”，评估性能变化。

## 回滚策略
- 关闭遥测：`INSIGHT_TELEMETRY=0` 或配置关闭；不再写 metrics.json，CLI Summary 仅保留基础统计。
- 键版本：将 promptVersion/parserVersion 回退为旧值（或移除），兼容历史缓存；可提供“清理旧键版本”的一次性脚本（后续）。
