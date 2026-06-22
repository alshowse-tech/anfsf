# ANFSF 成本管理体系修复报告

> 日期: 2026-06-17  
> 分支: `master`  
> 审阅发现: 17 层架构成本管理 + Agent Loop 集成缺陷  

---

## 一、背景

在"ANFSF 成本管理方案专家审视"中，发现六个深层问题，其中两个致命级。本次修复解决了这些问题并完成了成本管理体系在 Agent Loop 中的全面集成。

### 发现的问题

| # | 严重度 | 问题 | 根因 |
|---|--------|------|------|
| 1 | ❌ 致命 | PRD 解析层 Token 消费未被纳入 | TokenBudget 只能管控 AgentLoop，PRDParser 不走预算 |
| 2 | ❌ 致命 | `llm-client.ts` 和 `token-budget.ts` 两套定价表互相矛盾（相差 3-7 倍） | 各自维护 MODEL_PRICING，无统一来源 |
| 3 | ⚠️ 严重 | 模型选择器的经济逻辑方向正确但缺历史数据支撑 | 按预算比例选模型，未考虑生成质量→修复成本 |
| 4 | ⚠️ 严重 | `isEssential('fix')` 无条件放行，预算形同虚设 | 修复操作完全绕过 blockThreshold |
| 5 | ⚠️ 严重 | 纯内存计数，并发/重启丢数据 | TokenBudget 无持久化机制 |
| 6 | ℹ️ 中等 | 实际成本瓶颈在 PRD 解析层 | synthesize 链路中 PRD 解析 token 消耗 > AgentLoop |

---

## 二、修复方案

### 架构：三层防线

```text
Layer 1: LLMClient 层 (底层拦截，无漏网之鱼)
├─ budgetGuard 回调 — 每次 chat() 调用前检查
├─ 统一 MODEL_PRICING 常量 (单一事实来源)
├─ estimateCost() 统一出口（货币感知）
└─ onSuccess() 中注册累计 token

Layer 2: TokenBudget 层 (预算核心)
├─ 三级阈值: warn(70%) / block(90%) / hardBlock(135%)
├─ preEvaluate() — LLM 调用前预估，不消耗实际 budget
├─ consume() → ConsumeResult — 三级阈值决策
├─ 持久化钩子: BudgetPersistence 接口 (restore/save)
├─ export/import — 调用方可自行持久化
└─ used getter — 公共查询接口

Layer 3: Agent Loop 层 (业务语义)
├─ budget 参数传入构造函数
├─ generate()/fix() 中 preEvaluate + consumeSync
├─ BudgetExhaustedError — 语义化异常
├─ AgentLoopResult.budgetExhausted + budgetReport
└─ synthesize.ts 全链路集成 (PRD parse → AgentLoop)
```

---

## 三、修改文件清单

### 1. `src/integrations/llm-client.ts` — 统一定价 + budgetGuard

**定价统一**（致命问题 #2）：
- `MODEL_PRICING` 从 `const` 升级为 `export const`
- 新增 `ModelPricingEntry` 接口（含 `currency` 字段）
- 新增 `getBudgetModelPricing()` 导出，供 `token-budget.ts` 导入
- `estimateCost()` 的 `currency` 字段从硬编码 `'USD'` 改为从定价表读取

**budgetGuard 回调**（致命问题 #1 的底层防线）：
- `LLMClientConfig` 新增 `budgetGuard?: (estimatedTokens, model, context) => { allowed, reason? }`
- `chat()` 方法在 circuit breaker 检查之后、网络调用之前，执行 budgetGuard 检查
- 返回格式 `{ allowed: boolean, reason?: string }`

**类型修复**：
- `DEFAULT_CONFIG` 类型从 `Required<LLMClientConfig>` 改为 `Omit<Required<LLMClientConfig>, 'budgetGuard'>`

### 2. `src/pipeline/token-budget.ts` — 完全重写

**三级阈值**（严重问题 #4）：
- `TokenBudgetConfig` 新增 `hardBlockThreshold` 字段（默认 1.35 = 135%）
- `consume()` → 返回 `ConsumeResult { allowed, threshold, reason? }`
- 新增 `consumeSync()` — 同步版本（无持久化等待）
- 阈值逻辑：`ok → warn(记录+警告) → block(仅允许 essential) → hardBlock(全部拒绝)`
- essential 操作在 block 带仍可通过，hardBlock 带无例外

**preEvaluate 预评估**（严重问题 #3 的基础）：
- `preEvaluate(estimatedTokens)` — 计算如果消耗后的阈值带，不修改实际状态
- 返回 `PreEvaluateResult { allowed, projectedRate, warning?, band }`

**持久化**（严重问题 #5）：
- `BudgetPersistence` 接口：`restore()` / `save()`
- 构造函数接受可选 `persistence` 参数
- `consume()` 自动触发 save（fire-and-forget）
- `export()` / `importState()` — 调用方自行持久化的备选方案
- `used` getter — 公共 `totalUsed` 查询
- `recordCount` / `getRecords()` — 分页查询消费记录

**定价统一**（致命问题 #2）：
- 删除 `DEFAULT_PRICING` 常量
- `getReport().estimatedCost` 使用 `llm-client.ts` 的 `MODEL_PRICING`
- 成本汇报 `breakdown: { model, cost, currency }[]` — 多模型混合项目正确处理各模型货币

### 3. `src/agents/agent-loop-base.ts` — AgentLoop 预算感知

**AgentLoopResult 扩展**：
- `budgetExhausted: boolean` — 是否因预算耗尽终止
- `budgetReport?: { used, total, usageRate, remaining }` — 预算快照

**预算错误类型**：
- `BudgetExhaustedError` — 语义化异常，携带 `usageRate` 和 `remainingBudget`

**基类集成**：
- `protected budget?: TokenBudget` — 预算追踪器
- `protected estimateFixTokens()` — 子类可覆写修复 token 预估
- `run()` 在修复循环前调用 `preEvaluate()`
- `successResult()` / `budgetExhaustedResult()` — 填充 budgetReport

### 4. `src/agents/code-generation-loop.ts` — 预算注入

**构造函数**：
- 新增 `budget?: TokenBudget` 参数（第三个位置，向后兼容）
- `setBudget()` — 构造后设置预算

**generate() 预算检查**：
1. `preEvaluate(maxTokens)` → hardBlock 则抛 `BudgetExhaustedError`
2. LLM 调用后 `consumeSync()` 记录实际 token
3. hardBlock 检查（安全网）

**fix() 预算检查**：
1. `preEvaluate(maxTokens)` → hardBlock 则抛异常
2. LLM 调用后 `consumeSync()` 记录

**declare 预算字段**：
- 使用 `declare protected budget?` 与父类 protected 字段一致，避免 TS2415 错误

### 5. `src/pipeline/skeleton-generator.ts` — 预算传递

- `CodeGenerationLoop` 构造时传入 `budget`
- `consumeSync()` 替代旧的 `consume()`，使用 `hardBlock` 三级阈值检查

### 6. `src/server/routes/synthesize.ts` — 全链路集成（致命问题 #1）

**PRD 解析纳入预算**：
- 创建 `TokenBudget(jobId, config)` 在 PRD 解析之前
- PRD 解析后调用 `budget.consumeSync()` 记录 token 消耗
- `evaluatePRDQuality()` 的 token 消耗也在估算范围内

**Agent Loop 预算连接**：
- 删除 "intentionally not wired" 注释
- `new CodeGenerationLoop(llm, config, budget)` — 传入 budget
- 环境变量 `TOKEN_BUDGET` 控制总预算（默认 5M）

**结果持久化**：
- `runResult` 中新增 `budgetExhausted` 和 `budget` 对象（含 estimatedCost）

### 7. `src/server/routes/metrics.ts` — Prometheus 预算指标

**新增指标**：
```
anfsf_token_budget_allocated_total     — 总预算分配
anfsf_token_budget_used_total          — 总消耗
anfsf_token_budget_usage_ratio         — 聚合使用率
anfsf_token_budget_exhausted_total     — 预算耗尽次数
anfsf_token_budget_estimated_cost      — 估算 LLM 花费
anfsf_token_budget_run_usage{run_id}   — 单次运行使用率
anfsf_token_budget_threshold_config    — 阈值配置
```

**LLM 指标修复**：
- `anfsf_llm_cost_usd` → `anfsf_llm_cost`（添加 `currency` label）

### 8. `src/pipeline/__tests__/token-budget.test.ts` — 重写测试

26 个测试覆盖：
- 初始化（含 hardBlockThreshold 默认值）
- consumeSync（三级阈值、block vs hardBlock 区别）
- preEvaluate（预估不消耗、阈值带）
- 阈值检查（warn/block/hardBlock/exhausted）
- 汇报（unified pricing、breakdown）
- export/import 往返
- budget update 重新计算阈值

### 9. `src/agents/__tests__/code-generation-loop.test.ts` — 扩展测试

新增 4 个预算集成测试：
- `should accept TokenBudget in constructor`
- `should return budgetExhausted when hard block reached`
- `should track budget usage in result when budget is configured`
- `should work without budget (backward compatible)`

---

## 四、关键设计决策

### 4.1 为什么是三级阈值而非二级？

原始设计：warn(70%) + block(90%)。block 后 `isEssential('fix')` 完全绕过。

问题：如果 LLM 生成的代码有 15 个编译错误，每次 fix 调用都绕过预算限制，可以无限消耗。

解决：
- **block(90%)**: 阻止非 essential（generation、analysis），允许 fix
- **hardBlock(135%)**: 阻止一切，包括 fix

修复操作在 90%-135% 之间有缓冲，但超过 135% 硬阻断。

### 4.2 为什么预算挂钩选择 CodeGenerationLoop 而非 LLMClient？

两个层次各司其职：
- **LLMClient.budgetGuard** — 全局底层安全网，防止意外的无预算调用
- **CodeGenerationLoop.budget** — 业务语义层，记录 context + stage，生成 budgetReport

实际使用：`synthesize.ts` 中创建 `TokenBudget(jobId)`，传给 `CodeGenerationLoop`。LLMClient 的 budgetGuard 作为可选的安全网保留。

### 4.3 为什么定价表的 currency 改为动态？

原硬编码 `'USD'` 对 Qwen 模型（实际定价为 CNY）产生误导。

修复后：
- `MODEL_PRICING` 每个条目自带 `currency: 'CNY' | 'USD'`
- `estimateCost()` 返回正确的货币标签
- Prometheus 指标 `anfsf_llm_cost{currency="..."}` 带货币 label
- `TokenBudget.getReport()` 的 breakdown 按模型分别标注货币

注意：多货币混合项目（如同时使用 DeepSeek + Qwen）的总成本是各货币分别汇总，暂不做汇率换算。

### 4.4 持久化为什么是接口而非硬编码 SQLite？

`BudgetPersistence` 接口允许不同部署环境选择不同存储：
- 开发环境：无持久化（默认）
- 生产环境：SQLite（通过 `AnfsfStore` 实现 `BudgetPersistence`）
- 云部署：Postgres（通过 `PostgresPipelineRunStore`）

`export()` / `importState()` 作为轻量备选——调用方自己决定何时/如何序列化。

---

## 五、测试结果

```
PASS src/pipeline/__tests__/token-budget.test.ts (26 tests)
PASS src/pipeline/__tests__/skeleton-generator.test.ts (5 tests)
PASS src/agents/__tests__/code-generation-loop.test.ts (17 tests)

总计: 48 tests, 48 passed
TypeScript: npx tsc --noEmit — 零错误
```

---

## 六、环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TOKEN_BUDGET` | `5000000` | 每项目 token 总预算 |

---

## 七、后续工作（未包含在本次修复）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P1 | 模型选择器基于预期总消耗 | 需要至少 50 次运行数据计算首次生成质量→修复轮次分布 |
| P2 | BudgetPersistence SQLite 实现 | 基于 AnfsfStore 实现 restore/save |
| P3 | 前端预算仪表盘 | 展示 usageRate、estimatedCost、阶段分解 |
