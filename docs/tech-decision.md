# 技術決策記錄：Insight MVP 實施方案

## 決策摘要

**決策日期：** 2024-12-07  
**決策者：** 開發團隊  
**狀態：** 已採用  

**核心決策：**
- **實施語言：** Node.js + TypeScript
- **包管理器：** pnpm
- **LLM API：** OpenRouter（統一接口，支持多模型）
- **AST 解析：** Tree-sitter
- **MVP 範圍：** 僅支持 Python 代碼分析

## 語言選型分析

### 候選方案對比

| 評估維度 | Python | Node.js/TypeScript | 權重 | 說明 |
|---------|--------|-------------------|------|------|
| 多語言支持 | 3/5 | 5/5 | 25% | Tree-sitter Node.js 綁定支持 40+ 語言 |
| 開發效率 | 5/5 | 3/5 | 20% | Python 原型開發更快，但 TS 長期維護性好 |
| CLI 體驗 | 3/5 | 5/5 | 20% | Node.js CLI 工具生態更成熟 |
| 分發部署 | 3/5 | 5/5 | 15% | npm 安裝比 Python 環境設置簡單 |
| 生態系統 | 4/5 | 4/5 | 10% | 兩者都有豐富的生態 |
| 性能表現 | 4/5 | 4/5 | 10% | I/O 密集型應用性能差異不大 |
| **加權總分** | **3.6/5** | **4.4/5** | 100% | Node.js 在 MVP 階段優勢明顯 |

### 最終選擇：Node.js + TypeScript

**關鍵決策因素：**

1. **長期擴展性優先**
   - Tree-sitter 的 Node.js 綁定最成熟，支持多語言擴展
   - 從 Python-only MVP 擴展到多語言支持路徑清晰

2. **用戶體驗導向**
   - `npm install -g insight` 一行命令安裝，用戶門檻最低
   - CLI 工具生態成熟（Commander, Inquirer, Chalk 等）

3. **市場標準**
   - 現代開發工具（ESLint, Prettier, Webpack）都是 Node.js 實現
   - 開發者熟悉度高，降低採用阻力

4. **技術債務考量**
   - TypeScript 提供靜態類型檢查，降低重構成本
   - 異步處理天然支持，適合 I/O 密集型操作

## 包管理器選擇：pnpm

### pnpm vs npm vs yarn 對比

| 特性 | pnpm | npm | yarn classic | yarn berry |
|------|------|-----|-------------|------------|
| 依賴隔離 | ✅ 嚴格 | ❌ 扁平化 | ❌ 扁平化 | ✅ PnP |
| 安裝速度 | ✅ 很快 | ❌ 較慢 | ✅ 快 | ✅ 很快 |
| 磁盤使用 | ✅ 節省70% | ❌ 重複 | ❌ 重複 | ✅ Zero-install |
| 兼容性 | ✅ 優秀 | ✅ 標準 | ✅ 優秀 | ❌ 問題較多 |
| Monorepo | ✅ 內建 | ❌ 需要工具 | ❌ 需要工具 | ✅ 內建 |

**選擇 pnpm 的理由：**
1. **嚴格依賴管理** - 避免幽靈依賴，類似 Python uv 的理念
2. **空間效率** - 硬鏈接共享，節省磁盤空間
3. **性能優勢** - 並行安裝，速度快於 npm
4. **未來擴展** - Monorepo 支持優秀，適合後續擴展

## LLM API 策略：OpenRouter

### 選擇 OpenRouter 而非直接 Claude API

**優勢：**
1. **模型靈活性** - 統一接口，支持 Claude、GPT、Gemini 等
2. **成本優化** - 自動路由到最優價格/性能比的模型
3. **風險分散** - 避免單一供應商依賴
4. **實驗友好** - 可以輕鬆測試不同模型效果

**實施策略：**
```javascript
// 模型分層使用
{
  critical: 'anthropic/claude-3.5-sonnet',    // 關鍵文檔生成
  bulk: 'anthropic/claude-3-haiku',           // 批量處理  
  fallback: 'openai/gpt-3.5-turbo'          // 降級方案
}
```

## MVP 技術棧確定

### 核心依賴
```json
{
  "dependencies": {
    "commander": "^11.1.0",        // CLI 框架
    "chalk": "^5.3.0",             // 彩色輸出
    "ora": "^7.0.1",               // 進度指示器
    "inquirer": "^9.2.0",          // 交互式提示
    "tree-sitter": "^0.20.6",      // AST 解析
    "tree-sitter-python": "^0.20.4", // Python 語言支持
    "openai": "^4.28.0",           // OpenRouter API (兼容 OpenAI)
    "dotenv": "^16.3.1",           // 環境變量
    "glob": "^10.3.0",             // 文件匹配
    "fs-extra": "^11.2.0"          // 文件系統增強
  },
  "devDependencies": {
    "typescript": "^5.3.0",        // TypeScript 支持
    "@types/node": "^20.10.0",     // Node.js 類型
    "tsx": "^4.6.0",               // TypeScript 執行器
    "eslint": "^8.56.0",           // 代碼檢查
    "prettier": "^3.1.1",          // 代碼格式化
    "vitest": "^1.0.0"             // 測試框架
  }
}
```

### 項目結構
```
insight/
├── docs/                          # 項目文檔
│   ├── tech-decision.md          # 本文檔
│   └── api-design.md             # API 設計
├── src/
│   ├── cli/                      # CLI 入口和命令
│   │   ├── index.ts             # 主入口
│   │   └── commands/            # 各子命令
│   ├── core/
│   │   ├── scanner/             # 文件掃描和過濾
│   │   ├── analyzer/            # Tree-sitter AST 分析
│   │   └── generator/           # 文檔生成引擎
│   ├── services/
│   │   ├── llm/                 # OpenRouter 集成
│   │   └── cache/               # 文件哈希緩存
│   ├── utils/                   # 通用工具函數
│   └── types/                   # TypeScript 類型定義
├── templates/                    # Handlebars 模板
├── tests/                        # 測試文件
├── examples/                     # 示例 Python 項目
└── scripts/                      # 開發和構建腳本
```

## MVP 實施路線圖

### Week 1: 基礎框架 (12/7 - 12/14)
- [x] 項目初始化和配置
- [ ] 基礎 CLI 框架實現
- [ ] Tree-sitter Python 解析器集成
- [ ] OpenRouter API 基礎調用

### Week 2: 核心功能 (12/15 - 12/21)  
- [ ] 代碼掃描和文件過濾
- [ ] AST 分析和語義提取
- [ ] 文檔生成管道
- [ ] 簡單文件緩存

### Week 3: 測試驗證 (12/22 - 12/28)
- [ ] 在 calmjs/calmjs 項目上測試
- [ ] 優化 prompt 和輸出質量
- [ ] 性能優化和錯誤處理
- [ ] 文檔和示例完善

### Week 4: 發布準備 (12/29 - 1/4)
- [ ] npm package 配置
- [ ] CI/CD 設置
- [ ] 用戶文檔編寫
- [ ] 0.1.0 版本發布

## 風險評估與應對

### 技術風險
1. **Tree-sitter Python 綁定兼容性**
   - 風險：Node.js 版本兼容問題
   - 應對：使用穩定版本，準備降級到 Python AST 方案

2. **OpenRouter API 穩定性**
   - 風險：服務不穩定或價格變化
   - 應對：實現多提供商支持，準備直接 Claude API 方案

3. **TypeScript 學習曲線**
   - 風險：開發效率降低
   - 應對：先用基礎 TS 功能，逐步提升類型覆蓋

### 業務風險
1. **市場接受度**
   - 風險：Node.js 工具被 Python 開發者拒絕
   - 應對：重點強調易用性，提供 Python 項目優秀示例

2. **競爭對手**
   - 風險：大廠推出類似工具
   - 應對：專注特定場景（遺留系統），建立差異化優勢

## 決策影響

### 正面影響
1. **開發效率提升** - 成熟的 Node.js 工具鏈
2. **用戶體驗優化** - 簡單的安裝和使用流程
3. **技術可擴展性** - Tree-sitter 多語言支持
4. **社區接受度** - 符合現代開發工具標準

### 負面影響
1. **初期學習成本** - 團隊需要熟悉 TypeScript 和 Tree-sitter
2. **依賴複雜度** - 相比 Python 單體方案依賴更多
3. **打包體積** - Node.js 應用分發體積較大

## 後續評估

**評估週期：** 每兩週  
**評估指標：**
- 開發進度是否符合預期
- API 成本是否可控
- 用戶反饋和採用率
- 技術債務累積情況

**調整觸發條件：**
- 如果 Tree-sitter 兼容性問題嚴重，考慮切換到 Python AST
- 如果 OpenRouter 成本過高，切換到直接 Claude API
- 如果用戶反饋 Node.js 工具接受度低，考慮 Python 重寫

---

*本文檔將隨著項目進展持續更新，確保決策過程的可追溯性和透明度。*