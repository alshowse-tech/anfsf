# ANFSF 文档体系审计报告

> **日期**: 2026-06-17  
> **审计类型**: 文档自洽性检查 + 交叉验证  
> **涉及文档**: `REFACTOR-FIX.md` · `AUDIT-REPORT.md` · `BLUEPRINT.md` · `DEVELOPMENT-PATH.md` · `COST-MANAGEMENT-FIX.md` · `ARCHITECTURE.md` · `claude-code-review.md`  

---

## 一、审计方法

对 7 份核心文档进行三项检查：

1. **数据一致性**: 同一指标在不同文档中的引用是否一致
2. **代码验证**: 文档声称的"已完成修复"是否在源码中存在对应实现
3. **逻辑自洽**: 文档内的结论与文档间的结论是否一致

---

## 二、数据一致性检查

### 2.1 代码量

| 文档 | 声称值 | 实际值（2026-06-17） | 一致性 |
|------|--------|---------------------|--------|
| `REFACTOR-FIX.md:17` | 65,551 行 | 57,665 行 | ❌ **不一致** — 差 7,886 行 |
| `REFACTOR-FIX.md:18` | 185 个 .ts 文件 | 211 个 .ts 文件 | ❌ **不一致** — 差 26 个文件 |

**根因**: `REFACTOR-FIX.md` 发布于 2026-06-16，使用的可能是更早期的数据快照，但声称"当前系统真实状态的唯一真相来源"。两个指标均已过期。当前工作区新增了 26 个文件，可能是成本修复分支的产物。

**修复**: `REFACTOR-FIX.md` 需更新代码行数和文件数，或者在文档头部声明"此统计数据基于 2026-06-16 git 快照"。

### 2.2 运行时接入率

| 文档 | 声称值 | 验证结果 |
|------|--------|---------|
| `REFACTOR-FIX.md:5` | 约 35% | ⚠️ 定性正确 — 13 步工作流中 Step 1-5 部分覆盖，Step 6-13 几乎空白 |
| `BLUEPRINT.md:16` | 约 45% 的端到端流程覆盖 | ❌ **与 REFACTOR-FIX.md 矛盾** — 35% vs 45% |

**根因**: `BLUEPRINT.md` 的 45% 是基于"文件存在＋测试通过"的计算方式，而 `REFACTOR-FIX.md` 的 35% 是基于"真正接入运行时"。两个数字用不同方法计算同一概念，造成混淆。

**修复**: `BLUEPRINT.md` 应统一使用 35% 运行时接入率，并在旁边标注"代码编写完成度 45%"作为辅助指标。

### 2.3 Agent Loop 变体状态

| 文档 | 声称 | 实际验证 |
|------|------|---------|
| `REFACTOR-FIX.md` GAP-01 | AgentLoop 抽象基类已完成 | ✅ `agent-loop-base.ts` 214 行，3 个子类 |
| `REFACTOR-FIX.md` GAP-01 | DevFixLoop 存在 | ✅ `dev-fix-loop.ts` 435 行，但**未接入运行时** |
| `REFACTOR-FIX.md` GAP-01 | TestGenLoop 存在 | ✅ `test-gen-loop.ts` 280+ 行，但**未接入运行时** |
| `DEVELOPMENT-PATH.md` | "AgentLoop 变体不足" 仍是核心缺口 | ⚠️ 矛盾 — 代码已存在但未接入，不算"不足" |

**结论**: 文档间对"已完成"的定义不一致 —— 有时指"代码存在"（BLUEPRINT），有时指"运行时可用"（REFACTOR-FIX）。这导致同一个模块在不同文档中既有"✅ 已完成"也有"❌ 未接入"。

---

## 三、代码验证：AUDIT-REPORT.md 的修复声称

### 3.1 P0 级别（必须立即修复）

| 编号 | 声称修复 | 代码验证 | 状态 |
|------|---------|---------|------|
| P0-1 | API 密钥已轮换 | `.env` 中仍存在 `sk-865b6777e...` | ❌ **密钥未清理** |
| P0-2 | synthesize 路由已添加 `.catch()` | `synthesize.ts:338` 存在 `})().catch(e => ...)` | ✅ 已修复 |
| P0-3 | L1 解析失败检测 | `synthesize.ts:189` 存在 `triggerGuidedMode` 检查 | ✅ 已修复 |
| P0-4 | 单步超时保护 | `product-pipeline.ts:37-54` 存在 `STEP_TIMEOUT_MS` 16 步骤 + `withStepTimeout()` | ✅ 已修复 |

**严重发现**: P0-1 声称"已完成"但 `.env` 中**仍然包含真实的 API 密钥**。这是一个安全漏洞，且文档进行了错误报告。如果此 KEY 已被轮换（即新 KEY 已经注册而旧 KEY 已失效），则风险降低，但密钥仍然在 Git 历史中可被追溯。

### 3.2 P1 级别（高优先级）

| 编号 | 声称修复 | 代码验证 | 状态 |
|------|---------|---------|------|
| P1-6 | 框架选择逻辑已修复 | `product-pipeline.ts:454`: `uiFramework === 'vue' ? 'react' : ... ? 'react' : 'react'` — 仅添加了注释 `// FrontendArchitect only supports React for now`，**逻辑本身未修复** | ⚠️ **标注不准确** — 是"文档化现状"而非"修复" |
| P1-7 | L7 失败时下游跳过 | `product-pipeline.ts`: L7 section **无** `catch` 或 `continue` 逻辑 | ❌ **未验证到此修复** |
| P1-8 | 核心模块 `any` 类型替换 | `graph-engine.ts` 仍有 9 个 `: any` | ⚠️ **部分修复** — 原声称"7 个参数→明确接口"，但 `build()` 函数签名**仍包含参数无类型** |
| P1-11 | LLM Playground 限制 | `llm-playground.ts:14-15`: `MAX_TOKENS=4096`, `MAX_HISTORY=10` | ✅ 已修复 |
| P1-12 | 移除 Redis | `docker-compose.yml`: **无 Redis 服务** | ✅ 已修复 |
| P1-13 | 结构化日志 | `synthesize.ts` 导入了 `runWithTrace`，`product-pipeline.ts` 导入了 `createLogger` | ⚠️ 取决于"接入"的定义 |

### 3.3 P2 级别（中优先级）

| 编号 | 声称修复 | 代码验证 | 状态 |
|------|---------|---------|------|
| P2-14 | CSP 通配符 | `index.ts` CSP `connectSrc`: 无 `*`（使用 `baseUrl ?? []` 展开） | ✅ 已修复 |
| P2-15 | 前端 token 存储 | 无法验证前端编译后产物 | ⚠️ 未验证 |
| P2-17 | Metrics 缓存 | `metrics.ts` 存在 `METRICS_CACHE_TTL_MS = 15000` | ✅ 已修复 |
| P2-20 | 确认/反馈端点认证 | 标记为 `[ ]` 待修复 | ✅ 状态如实 |

---

## 四、逻辑自洽性检查

### 4.1 "35% 运行时接入率"的含义

`REFACTOR-FIX.md` 的 35% 结论基于以下推理：

- 活跃运行时链路只是 `synthesize.ts → AINativePRDParser → CodeGenerationLoop → GiteaClient.push`
- 未接入: 49 个 core 模块中的 48 个，18 个 Skills 中的 17 个，9 个 Harness 全部

**自洽性**: ✅ 此推理正确。synthesize.ts 导入的模块中：
```
core/      : 0 个导入
skills/    : 0 个导入
harness/   : 0 个导入
agents/    : 1 个导入 (CodeGenerationLoop)
pipeline/  : 4 个导入 (product-pipeline 仅用 PipelineStep 类型, TaskGenerator, PipelineStateMachine, TokenBudget)
```

State Machine 实际上也只使用了 2 个状态转换（`stage1_parsing → stage1_done`），而非设计的 5 阶段。

### 4.2 13 步工作流覆盖

`BLUEPRINT.md` 定义的 13 步工作流在 `synthesize.ts` 中的实际覆盖：

| Step | 运行时覆盖 | 已验证 |
|------|-----------|--------|
| 1 (PRD 输入) | ✅ sanitization + injection detection | ✅ |
| 2 (质量建议) | ✅ evaluatePRDQuality + triggerGuidedMode | ✅ |
| 3 (确认锁定) | ⚠️ PipelineStateMachine 存在但未串联确认路由 | ⚠️ |
| 4 (生成代码+任务) | ✅ PRDParser + CodeGenerationLoop + TaskGenerator | ✅ |
| 5 (开发者工作台) | ⚠️ Gitea push 是 best effort | ⚠️ |
| 6 (自动化测试) | ❌ 无 CommitVerifier/ContractWatcher 调用 | ❌ |
| 7 (自动修复) | ❌ 无 FixEngine/FixExecutor 调用 | ❌ |
| 8 (发布测试版本) | ❌ 无 ReleaseCheck/CanaryDeployer 调用 | ❌ |
| 9-11 (反馈→修复→发布) | ❌ 完全未实现 | ❌ |
| 12 (归档) | ❌ 无 Archiver 调用 | ❌ |
| 13 (自进化) | ❌ 无 Evolution 调用 | ❌ |

**自洽性**: ✅ BLUEPRINT.md 和 REFACTOR-FIX.md 在此维度一致。

### 4.3 AUDIT-REPORT.md 的日期问题

- 文档标记审计时间为 2026-05-21，状态更新为 2026-06-16
- 但描述的架构是 "17 层处理"，这与 REFACTOR-FIX.md 的"切换到了五阶段状态机 + Agent Loop"结论不一致
- 文档中 P0-4 描述的"16 个步骤各有时间预算"针对的是旧的 `product-pipeline.ts`（703 行），而非当前的 `synthesis.ts` → `CodeGenerationLoop` 路径

**结论**: `AUDIT-REPORT.md` 的架构描述停留在旧架构上。synthsize.ts 主路径**不使用** `product-pipeline.ts` 的超时保护机制——它只导入 `PipelineStep` **类型**。这是一处关键的不自洽。

---

## 五、综合评估

### 文档质量矩阵

| 文档 | 数据准确性 | 代码验证通过率 | 逻辑自洽 | 时效性 | 综合 |
|------|-----------|--------------|---------|--------|------|
| `REFACTOR-FIX.md` | ⚠️ 代码量/文件数过期 | — (是基准文档) | ✅ 高 | ✅ 最新 | **8/10** |
| `AUDIT-REPORT.md` | ❌ P0-1 声称修复但密钥存在 | 9/18 项完全验证 | ❌ 描述旧架构 | ⚠️ 部分更新 | **5/10** |
| `BLUEPRINT.md` | ❌ 45% vs 35% 矛盾 | — | ✅ 高 | ✅ 最新 | **7/10** |
| `DEVELOPMENT-PATH.md` | ✅ | ✅ | ⚠️ "变体不足"已过时 | ✅ 最新 | **7/10** |
| `COST-MANAGEMENT-FIX.md` | ✅ | ✅ | ✅ 高 | ✅ 最新 | **9/10** |
| `ARCHITECTURE.md` | ✅ | — | ✅ | ✅ 最新 | **8/10** |
| `claude-code-review.md` | ✅ | ✅ | ✅ | ⚠️ 2026-06-15 | **8/10** |

### 发现的矛盾清单

| # | 严重度 | 矛盾描述 |
|---|--------|---------|
| D1 | 🔴严重 | `AUDIT-REPORT.md` P0-1 声称 API 密钥已清理，但 `.env` 中密钥仍存在 |
| D2 | 🔴严重 | `AUDIT-REPORT.md` 描述的是 17 层旧架构，与 `REFACTOR-FIX` 的五阶段+AgentLoop 结论矛盾 |
| D3 | 🟠重要 | `BLUEPRINT.md:16` 声称 45% 覆盖率 vs `REFACTOR-FIX.md:5` 声称 35% |
| D4 | 🟠重要 | `AUDIT-REPORT.md` P1-8 声称 any 类型已被替换，但 graph-engine.ts 仍有 9 处 `: any` |
| D5 | 🟠重要 | `REFACTOR-FIX.md` 代码行数/文件数与当前工作区不一致（65,551 vs 57,665 / 185 vs 211） |
| D6 | 🟡中等 | `AUDIT-REPORT.md` P1-6 声称框架选择逻辑"已修复"，实际只添加了注释 |
| D7 | 🟡中等 | `AUDIT-REPORT.md` P1-7 声称 L7 失败时下游跳过，但 `product-pipeline.ts` L7 段无 catch/continue |
| D8 | 🟡中等 | `DEVELOPMENT-PATH.md` GAP-01 说"Agent Loop 变体不足"，但 DevFixLoop 和 TestGenLoop 代码已存在 |

---

## 六、修复建议

### 立即行动

1. **`.env` 中 API 密钥立即轮换** — 即使旧 KEY 已失效，应彻底从 Git 历史中移除或使用 `.env.example` 模式
2. **更新 `AUDIT-REPORT.md` 的架构描述** — 反映当前五阶段+Agent Loop 架构，标注哪些修复项针对旧 `product-pipeline.ts`（未在当前主路径中使用）
3. **更新 `REFACTOR-FIX.md` 统计数据** — 代码行数更新为 57,665，文件数更新为 211

### 短期行动

4. **统一"完成"的定义** — 在所有文档中使用一致的三元组标注：`文件存在 | 测试通过 | 运行时接入`
5. **`BLUEPRINT.md`** 开头增加警告框与 REFACTOR-FIX 的 35% 数据对齐
6. **`AUDIT-REPORT.md`** P1-8 重标为 "部分修复/待完成"

### 长期行动

7. 引入自动化文档一致性检查：CI 中运行 `tsc --noEmit` + `grep` 关键模式校验文档声称的修复项
8. 将所有文档中的路径引用（`/root/.openclaw/workspace-main/src/`）统一为当前 Windows 路径（`src/`）
9. 固定文档版本号与 git commit SHA 绑定，避免"数据快照"级别的矛盾
