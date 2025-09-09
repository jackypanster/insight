# Mermaid 图表测试文档

这个文档用于测试Insight WebServer的Mermaid图表渲染功能。

## 1. 流程图 (Flowchart)

```mermaid
graph TD
    A[开始分析代码] --> B{检查文件类型}
    B -->|Python| C[使用Tree-sitter解析]
    B -->|JavaScript| D[使用JS解析器]
    B -->|其他| E[跳过文件]
    C --> F[提取AST信息]
    D --> F
    F --> G[生成文档]
    G --> H[结束]
    E --> H
    
    style A fill:#e1f5fe
    style G fill:#fff3e0
    style H fill:#f3e5f5
```

## 2. 时序图 (Sequence Diagram)

```mermaid
sequenceDiagram
    participant User as 用户
    participant CLI as 命令行工具
    participant Scanner as 文件扫描器
    participant Analyzer as 分析引擎
    participant LLM as OpenRouter API
    participant Generator as 文档生成器
    
    User->>CLI: insight analyze /path/to/project
    CLI->>Scanner: 扫描项目文件
    Scanner-->>CLI: 返回文件列表
    
    loop 对每个文件
        CLI->>Analyzer: 分析文件内容
        Analyzer->>LLM: 发送分析请求
        LLM-->>Analyzer: 返回分析结果
        Analyzer-->>CLI: 返回结构化数据
    end
    
    CLI->>Generator: 生成文档
    Generator-->>User: 输出Markdown文档
```

## 3. 类图 (Class Diagram)

```mermaid
classDiagram
    class WebServer {
        -app: express.Application
        -server: any
        -options: WebServerOptions
        +start() void
        +stop() void
        +setupMiddleware() void
        +setupRoutes() void
        -processMermaidBlocks(markdown: string) string
    }
    
    class WebServerOptions {
        +port: number
        +host: string
        +docsDir: string
        +verbose?: boolean
    }
    
    class MermaidProcessor {
        +processMermaidBlocks(content: string) string
        +addDiagramControls() void
        +downloadDiagram(index: number, format: string) void
    }
    
    WebServer --> WebServerOptions
    WebServer --> MermaidProcessor
```

## 4. 状态图 (State Diagram)

```mermaid
stateDiagram-v2
    [*] --> 未初始化
    未初始化 --> 初始化中 : 执行insight init
    初始化中 --> 已配置 : 配置完成
    已配置 --> 分析中 : 执行analyze命令
    分析中 --> 分析完成 : 分析成功
    分析中 --> 分析失败 : 出现错误
    分析失败 --> 已配置 : 重试
    分析完成 --> 服务运行 : 执行serve命令
    服务运行 --> 分析中 : 重新分析
    服务运行 --> [*] : 停止服务
```

## 5. 甘特图 (Gantt Chart)

```mermaid
gantt
    title Insight 可视化路线图
    dateFormat  YYYY-MM-DD
    section 迭代1: Mermaid增强
    研究现有实现           :done, research, 2025-01-09, 1d
    集成Mermaid.js        :active, mermaid, 2025-01-09, 2d
    添加交互功能          :interact, after mermaid, 2d
    
    section 迭代2: 复杂度热力图
    设计热力图UI          :heatmap-design, 2025-01-14, 3d
    后端复杂度分析        :complexity-backend, 2025-01-15, 4d
    前端可视化实现        :heatmap-frontend, after complexity-backend, 3d
    
    section 迭代3: API文档
    API路由分析          :api-analysis, 2025-01-25, 4d
    Swagger UI集成       :swagger, after api-analysis, 3d
    测试和优化           :api-test, after swagger, 2d
```

## 6. ER图 (Entity Relationship)

```mermaid
erDiagram
    USER {
        int id PK
        string name
        string email
        datetime created_at
    }
    
    PROJECT {
        int id PK
        string name
        string repository_url
        int user_id FK
        datetime analyzed_at
    }
    
    ANALYSIS_RESULT {
        int id PK
        int project_id FK
        string file_path
        json ast_data
        json metrics
        datetime created_at
    }
    
    DOCUMENTATION {
        int id PK
        int project_id FK
        string doc_type
        text content
        datetime generated_at
    }
    
    USER ||--o{ PROJECT : owns
    PROJECT ||--o{ ANALYSIS_RESULT : contains
    PROJECT ||--o{ DOCUMENTATION : generates
```

## 7. 饼图 (Pie Chart)

```mermaid
pie title 项目文件类型分布
    "Python 文件" : 45
    "JavaScript 文件" : 25
    "TypeScript 文件" : 15
    "配置文件" : 10
    "其他文件" : 5
```

## 测试说明

以上图表应该在Insight的Web服务器中正确渲染，并提供以下功能：

1. ✅ 自动识别mermaid代码块
2. ✅ 使用统一的主题色彩方案（#007acc）
3. ✅ 提供SVG/PNG下载功能
4. ✅ 支持缩放和重置功能
5. ✅ 响应式设计适配移动端

每个图表都应该有对应的控制按钮出现在图表下方。