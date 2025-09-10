# RFC-P0-001：LLM 输出结构化 JSON（Schema + 校验 + 回退）

## 背景与目标
- 现状：LLM 输出为 Markdown，解析器基于启发式，易受模型风格漂移影响。
- 目标：统一输出为严格 JSON，先校验再使用；失败时自动回退，保证链路稳定与可观测。
- 成果：稳定性↑、可解析度↑、二次处理（统计/比对/审计）成本↓。

## 范围
- 仅影响 `src/core/llm/OpenRouterService.ts`（提示词、请求、解析、回退、日志）。
- 对外类型仍为 `LLMAnalysis`；不改动上游/下游调用方接口。

## 提案
1) 强化提示词（Prompt）
- “输出必须为 JSON；不得包含 Markdown/解释文本”。
- 附带最简示例与字段含义；限制最大长度；失败重试时提示“仅输出 JSON”。
- 若 OpenRouter/模型支持结构化响应（如 `response_format: { type: 'json_object' }`），优先开启。

2) JSON Schema（对齐 LLMAnalysis）
```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "LLMAnalysis",
  "type": "object",
  "required": ["summary","documentation","architecture","quality"],
  "properties": {
    "summary": {"type": "string"},
    "documentation": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["type","title","content","source","metadata"],
        "properties": {
          "type": {"type": "string", "enum": ["overview","function","class","module"]},
          "title": {"type": "string"},
          "content": {"type": "string"},
          "source": {
            "type": "object",
            "required": ["filePath","startLine","endLine"],
            "properties": {
              "filePath": {"type": "string"},
              "startLine": {"type": "integer","minimum": 0},
              "endLine": {"type": "integer","minimum": 0}
            }
          },
          "metadata": {"type": "object"}
        }
      }
    },
    "architecture": {
      "type": "object",
      "required": ["patterns","dependencies","recommendations"],
      "properties": {
        "patterns": {"type": "array", "items": {"type": "string"}},
        "dependencies": {"type": "array", "items": {"type": "string"}},
        "recommendations": {"type": "array", "items": {"type": "string"}}
      }
    },
    "quality": {
      "type": "object",
      "required": ["complexity","maintainability","testability","issues"],
      "properties": {
        "complexity": {"type": "number"},
        "maintainability": {"type": "number"},
        "testability": {"type": "number"},
        "issues": {"type": "array","items": {"type": "string"}}
      }
    }
  }
}
```

3) 解析策略
- 首选：`JSON.parse()`；失败→正则提取首个大括号 JSON 片段再 parse；再失败→降级到当前 Markdown 解析器；仍失败→`generateFallbackAnalysis()`。
- 校验：用轻量 Schema 校验器（可自写或选用 zod/ajv）在 parse 后校验；不合法→触发降级。

4) 回退与特性开关
- 环境变量：`LLM_JSON_STRICT=1` 开启严格模式；灰度阶段默认关闭（或只在 CI/预发打开）。
- 失败回退：主模型失败→fallback 模型；仍失败→本地 fallback 文档；全程记录事件。

5) 日志与指标
- 打点：请求时长、parse 成功率、schema 校验失败次数、降级次数；模型与版本。
- CLI Summary 中新增“LLM JSON 成功率/降级次数”。

## 触点与改动点
- `buildAnalysisPrompt()`：追加“仅输出 JSON”与示例；必要时将 AST/源码片段进一步结构化。
- `makeRequest()`：若支持，添加 `response_format: json_object`；否则保持现状。
- `parseAnalysisResponse()`：改为 `parseJSONResponse()` + 校验 + 多级回退；保留旧解析以兼容。

## 推进节奏
- Week1：实现+单测+小样本验证；`LLM_JSON_STRICT=0`。
- Week2：在内部/预发开启严格模式；收集 parse/校验/降级指标。
- Week3：默认开启；保留环境变量禁用通道，观察 1 周。

## 风险与缓解
- 模型不遵循 JSON：通过严格提示+重试；必要时降级。
- 响应过长触发截断：缩小片段/上下文切片；回退保底路径存在。
- 依赖 ajv/zod 体积：优先轻量实现或懒加载。

## 验收
- 成功率：严格 JSON 成功率≥95%，降级率≤5%。
- 体验：CLI Summary 展示指标；异常时输出定界清晰。
- 回滚：一键关闭 `LLM_JSON_STRICT` 即可回退旧行为。

---

## 最小实现改动清单（MVP）
- 常量与开关
  - 在 `src/core/llm/OpenRouterService.ts` 增加常量：`PROMPT_VERSION='v1'`、`SCHEMA_VERSION='v1'`。
  - 读取环境变量：`LLM_JSON_STRICT`（严格解析开关，默认 0）、`LLM_RESPONSE_FORMAT_JSON`（尝试请求端启用 JSON 响应格式，默认 0）。
- Prompt 强化（最低改动）
  - `buildAnalysisPrompt()` 末尾追加：
    - “仅输出 JSON，不要包含 Markdown 或额外文字”。
    - 附最小 JSON 示例（与 Schema 对齐）。
- 解析路径新增
  - 新增私有方法：`parseJSONResponse(raw: string): LLMAnalysis | null`。
    - 尝试 `JSON.parse`；失败则截取第一个完整 `{...}` 片段再 parse。
    - 进行“轻量形状校验”（字段存在性与类型检查）。
  - 在 `analyzeCode()` 中：若 `LLM_JSON_STRICT=1` 则优先走 `parseJSONResponse`；失败则降级到旧的 `parseAnalysisResponse()`；仍失败走 `generateFallbackAnalysis()`。
- 请求端可选 JSON 格式
  - `makeRequest()` 中当 `LLM_RESPONSE_FORMAT_JSON=1` 时，尝试附加 `response_format: { type: 'json_object' }`（若 API 支持）。
- 遥测（与 RFC-P0-002 协同）
  - 计数：`jsonParseSuccess`、`jsonParseFail`、`schemaFail`、`markdownFallback`。

## 开关布点
- 环境变量（优先于配置文件）：
  - `LLM_JSON_STRICT=0|1`
  - `LLM_RESPONSE_FORMAT_JSON=0|1`
- CLI 层（可选后续）：`--llm-json-strict`（默认继承环境变量）。

## 代码触点与伪码
- 文件：`src/core/llm/OpenRouterService.ts`
  - analyzeCode(context):
    ```ts
    const raw = await this.makeRequest(prompt, opts);
    if (strictJSON) {
      const json = this.parseJSONResponse(raw);
      if (json) { incr(jsonParseSuccess); return json; }
      incr(jsonParseFail);
    }
    try { const md = this.parseAnalysisResponse(raw); return md; }
    catch { incr(markdownFallback); return this.generateFallbackAnalysis(context); }
    ```
  - parseJSONResponse(raw):
    ```ts
    try { const obj = JSON.parse(raw); }
    catch { const snippet = extractFirstJSON(raw); const obj = JSON.parse(snippet); }
    if (!shapeOK(obj)) { incr(schemaFail); return null; }
    return toLLMAnalysis(obj);
    ```
  - makeRequest():
    ```ts
    const body:any = { model, messages, temperature, max_tokens };
    if (process.env.LLM_RESPONSE_FORMAT_JSON === '1') {
      body.response_format = { type: 'json_object' };
    }
    ```

## 测试计划
- 单元测试（建议 vitest mocks）
  - parseJSONResponse：
    - 纯 JSON → 通过；
    - JSON 前后有文本 → 截取片段后通过；
    - 缺少字段/类型不符 → schemaFail；
    - 非法 JSON → 返回 null。
  - buildAnalysisPrompt：包含“仅输出 JSON”的约束与示例。
- 集成测试
  - mock makeRequest 返回 JSON/Markdown/非法 → 验证多级回退与计数器。
  - 严格开关：`LLM_JSON_STRICT=1` 时优先 JSON；`=0` 时兼容旧逻辑。
- 端到端测试
  - `LLM_JSON_STRICT=1 insight dev analyze ./examples --max-files 1`：生成文档成功；日志显示 JSON 成功率与降级数（与 RFC-P0-002 遥测联动）。

## 回滚策略
- 紧急回滚：设置 `LLM_JSON_STRICT=0` 立刻恢复旧行为。
- 安全网：保留旧的 Markdown 解析器路径；保底 `generateFallbackAnalysis()` 始终可用。
