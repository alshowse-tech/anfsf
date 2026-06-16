# ANFSF 重构修复方案

> **版本**: 1.1 | **日期**: 2026-06-16 | **状态**: 基准文档（当前系统真实状态的唯一真相来源）
> **基准**: IMPLEMENTATION-PLAN.md (25/25 任务标记完成) + UI-REFACTOR-PLAN.md (Phase A-C 完成)
> **结论**: 文件存在 + 单元测试完成度极高，但运行时接入度约 35%，前端验收 70%
>
> ⚠️ **本文档是所有其他文档的状态基准**。如果其他文档与此文档冲突，以此文档为准。

---

## 一、审查发现总结

### 1.1 后端核心问题

| 维度 | 数据 |
|------|------|
| 总代码行 | 65,551 行 |
| 实现文件 | 185 个 .ts |
| 测试文件 | 109 个 |
| 测试通过 | 1478/1541 (95.9%) |
| **真正接入运行时** | **约 35%** |

**活跃运行时链路**（`POST /api/v1/synthesize` 实际走的路径）：

```
synthesize.ts → runAgentPipeline()
  → PipelineStateMachine (仅 stage1_parsing → stage1_done)
  → AINativePRDParser (LLM)
  → CodeGenerationLoop (generate → verify → fix)
    → VerificationRunner → CompileValidator (唯一起作用的验证)
  → TaskGenerator (TASK.md)
  → GiteaClient.push (best effort)
```

**未接入的关键模块**：

| 类别 | 总数 | 接入运行时 | 死代码/孤立 |
|------|------|-----------|------------|
| Core 模块 | ~50 | 1 (`compile-validator`) | ~49 |
| Skills | 18 | 0-1 (`retrospective-engine` 经 feedback 路由) | 17 |
| Harnesses | 9 | 0 | 9 |
| Pipeline 阶段 | 6 (0-5) | 1 (Stage 1 部分) | 5 |
| Server 路由 | 9 | 9 | 0 |

**根因**：

1. **IMPLEMENTATION-PLAN 把"文件存在+测试通过"视为"完成"**，但接入运行时才是真正的完成
2. **17 层架构 + 68 技能的设计**，在切换到 Agent Loop 后，大部分模块变成了孤立代码
3. **`skills-registration.ts` 是 no-op**——18 个 Skill 从未在服务器启动时被注册
4. **旧 `ProductPipeline`(703行)** 仍然存在，只贡献 `PipelineStep` 类型
5. **5 个 Pipeline 阶段只走了 2 个状态转换**（`stage1_parsing` → `stage1_done`）

### 1.2 前端核心问题

| 维度 | 数据 |
|------|------|
| 组件总数 | 24 |
| 接入真实 API | 22/24 (92%) |
| UI-REFACTOR-PLAN 验收标准 | 3✅ + 2⚠️ + 2❌ (70%) |

**关键缺陷**：

| 严重度 | 问题 | 影响 |
|--------|------|------|
| 🔴 严重 | `/progress` 路由不存在 | RunList 点击后 404 |
| 🔴 严重 | Token 存储 `sessionStorage` vs `localStorage` 不一致 | 刷新后丢失认证 |
| 🔴 严重 | `RequirementReview` 完整构建但未接入路由 | P-002 验收不通过 |
| 🔴 严重 | `SkillsRegistry` 注册函数为空 | 18 个 Skill 从未运行 |
| 🟡 中 | `ProjectDashboard` 有 API 但无路由 | P-005 验收不通过 |
| 🟡 中 | 导航 7 项（计划 5 项） | P-006 验收不通过 |
| 🟡 中 | 多个组件不发送 Authorization 头 | 后端启用 auth 后 401 |
| 🟡 中 | `useSSE.ts` 86 行死代码 | 维护负担 |
| 🟢 轻 | `DeveloperWorkspace` 旧版未删 | 冗余 |
| 🟢 轻 | `ProductPipeline` 703 行旧代码 | 冗余 |

### 1.3 验收标准逐项确认

| # | 验收项 | 状态 | 说明 |
|---|--------|------|------|
| 1 | PRD 提交后立即看到质量评分 | ✅ 通过 | PRDForm.client-side `quickQualityCheck()` |
| 2 | 需求确认页结构化需求 + 置信度 | ❌ 未通过 | RequirementReview 未接入路由 |
| 3 | 执行页 3 步骤 + token + Gitea | ✅ 通过 | PipelineProgress 完整 |
| 4 | 代码产出页文件树 + 预览 | ✅ 通过 | ResultView 完整 |
| 5 | 项目看板真实数据 | ⚠️ 部分 | ProjectDashboard 有 API 无路由 |
| 6 | 导航 5 项 | ❌ 未通过 | 实际 7 项 |
| 7 | 所有组件接 API 无硬编码 | ⚠️ 部分 | 2 个组件未集成 |

---

## 二、修复原则

```
原则1：接入优先于新建 — 已有 65K 行代码，优先让现有模块跑起来
原则2：端到端贯通优先于单模块完善 — 先让主流程跑通，再逐步接入能力
原则3：每一步修复后必须可验证 — 通过 curl 或前端能看到变化
原则4：删除死代码 — 不接入的模块，先标记再决定保留/删除
```

---

## 三、Phase 0：紧急修复（~30 分钟）

> 目标：修复阻塞性缺陷，让现有流程完全可用

### 0-1 修复 `/progress` 路由断链

**问题**：`RunList.tsx` 链接到 `/progress?runId=xxx`，但 App.tsx 无此路由，点击后 404。

**文件**：`web/src/components/RunList.tsx`

**改动**：
```diff
- to={`/progress?runId=${run.id}`}
+ to={`/require?runId=${run.id}`}
```

### 0-2 统一 Token 存储到 localStorage

**问题**：`ApiTokenSettings` 写 `sessionStorage`，其他 10+ 组件读 `localStorage`，导致刷新后丢失认证。

**文件**：`web/src/components/ApiTokenSettings.tsx`

**改动**：所有 `sessionStorage` 引用改为 `localStorage`。

### 0-3 接入 RequirementReview 到路由

**问题**：P-002 组件完整但被孤立，无路由、无 API fetcher。

**改动**：

1. `web/src/components/RequirementReview.tsx`：添加内部 `useEffect` 从 `GET /api/v1/pipeline/:id/status` 获取 requirements 数据
2. `web/src/App.tsx`：添加路由 `/confirm?runId=:id` → `RequirementReview`

### 0-4 删除死代码

| 文件 | 原因 |
|------|------|
| `web/src/hooks/useSSE.ts` | 86 行，0 消费者 |
| `web/src/components/DeveloperWorkspace.tsx` | 旧版，已被 DevWorkspaceV2 替代 |
| `web/src/App.tsx` 中 `ApiTokenSettings` import | 未使用（SettingsModal 替代） |

---

## 四、Phase 1：核心接入（~3 天）

> 目标：让 Agent Loop 验证链从 1 个检查扩展到 4 个，接入 Stage 2-3

### 1-1 Agent Loop 验证链扩展

**当前**：
```
CodeGenerationLoop → VerificationRunner → CompileValidator (tsc)
```

**目标**：
```
CodeGenerationLoop → VerificationRunner
  ├── CompileValidator (tsc --noEmit)           [已有]
  ├── CodeQualityGuardTool (静态+语义四维检查)     [新增]
  ├── HallucinationGuardTool (幻觉三分类检测)      [新增]
  └── SecurityAuditorTool (OWASP + CWE 检查)      [新增]
```

**改动文件**：`src/agents/verification-runner.ts`

**改动内容**：新增 3 个 VerificationTool 实现，分别调用 `skills/code-quality-guard-skill.ts`、`skills/hallucination-guard-skill.ts`、`skills/security-auditor-skill.ts`。

注意事项：
- VerificationRunner 已支持工具注册机制，新增即可
- 每个工具需要 `codePath` 参数，SecurityAuditor 可能需要额外配置
- 并行执行 4 个工具，总超时不应超过 60 秒
- CodeQualityGuard 和 HallucinationGuard 的 `execute` 方法需要适配 `VerificationTool.run(codePath)` 接口

### 1-2 PipelineStateMachine Stage 2-3 接入

**当前**：synthesize 路由只转换 `stage1_parsing → stage1_done`。

**目标**：
```
Stage 1: parsing → generating → done      [已有]
Stage 2: dev (代码开发阶段，当前空转)       [新增]
Stage 3: verifying → passed               [新增：验证链扩展结果写入]
```

**改动文件**：`src/server/routes/synthesize.ts`

**改动**：在 Agent Loop 完成后，依次转换：
```typescript
await sm.transition('stage2_dev');    // 预留，当前空转
await sm.transition('stage3_verifying');
// 运行扩展验证链的结果写入 store
await sm.transition('stage3_passed');
```

### 1-3 后端 API 补充

#### B-001：synthesize 响应增加 requirements 字段

**文件**：`src/server/routes/synthesize.ts`

**改动**：在 `updateRun` 的 result 对象中增加 `requirements` 字段，数据来自 `AINativePRDParser.parse()` 的输出。

#### B-002：PipelineStatus 响应增加扩展字段

**文件**：`src/server/routes/pipeline.ts`

**改动**：status 响应增加：
- `rounds`: Agent Loop 轮数
- `tokenUsage`: Token 使用明细
- `giteaUrl`: Gitea 仓库链接

#### B-003：confirm 路由触发 Agent Loop

**文件**：`src/server/routes/phase1-routes.ts`

**改动**：`PUT /api/v1/pipeline/:id/requirements/confirm` 路由接入 `CodeGenerationLoop.generate()`。

---

## 五、Phase 2：能力层接入（~5 天）

> 目标：让已实现的 Skills 和 Core 模块通过 Harness 编排真正运行

### 2-1 实现 Skills 注册（修复 no-op）

**当前**：
```typescript
// src/harness/skills-registration.ts line 39-41
export function registerFusionSkillsToHarnesses() {
  // 空函数体
}
```

**目标**：服务器启动时注册 18 个 Skill 到 SkillsRegistry。

**改动文件**：
- `src/harness/skills-registration.ts`：实现真正注册逻辑
- `src/server/index.ts`：启动时调用 `registerFusionSkillsToHarnesses()`

### 2-2 治理 Harness 接入 synthesize 流程

**目标**：在 synthesize 流程中的关键节点调用治理检查。

```
stage1_parsing 之前 → InputGovernance.check()
stage1_done 之后 → GovernanceHarness.synthesize()
```

**改动文件**：
- `src/server/routes/synthesize.ts`：在 PRD 解析前调用输入治理，在生成完成后调用治理合成

### 2-3 ProjectDashboard 接入路由

**文件**：
- `web/src/App.tsx`：添加 `/dashboard` route
- `web/src/components/ProjectDashboard.tsx`：从路由参数获取 runId

### 2-4 导航收敛到 5 项

**当前** (7 项)：
```
Home | Requirements | Development | Verification | Testing | Release | Evolution
```

**目标** (5 项)：
```
Home | Requirements | Result | History | Dashboard
```

**文件**：`web/src/components/StageTabs.tsx`

**对应路由调整**：
```
/            → HomeDashboard (首页概览)
/require     → PRDForm / PipelineProgress / RequirementReview
/result      → ResultView (代码产出)
/history     → RunList (历史记录)
/dashboard   → ProjectDashboard (项目看板)
辅助页面（右上角齿轮）：
  /verify     → VerifyPanel
  /release    → ReleaseGate
  /evolve     → EvolutionPanel
  /llm        → LLMPlayground
```

---

## 六、Phase 3：死代码清理与收敛（~2 天）

> 目标：移除不再需要的旧代码，减少维护负担

### 3-1 删除旧 ProductPipeline

**文件**：`src/pipeline/product-pipeline.ts` (703 行)

**步骤**：
1. 从 `synthesize.ts` 中移除 `PipelineStep` 类型导入，改用本地类型定义
2. 搜索所有 `product-pipeline` 引用，确认无其他依赖
3. 删除 `product-pipeline.ts`
4. 删除 `__tests__/product-pipeline.test.ts`（如果存在）
5. 运行全量测试确认无破坏

### 3-2 标记未接入模块

对 Phase 1-2 完成后仍未接入的模块，在文件头部添加标准化注释：

```typescript
/**
 * @status standby - module implemented but not integrated into active runtime
 * @integration-point Can be wired via SkillsRegistry / Harness orchestration
 * @see ANFSF-REFACTOR-FIX.md for integration plan
 */
```

### 3-3 清理 App.tsx 死引用

| 清理项 | 说明 |
|--------|------|
| `ConfirmationReview` import | 如果不在路由中则移除 |
| `ApiTokenSettings` import | 已被 SettingsModal 替代 |
| `DeveloperWorkspace` (旧) | 已被 DevWorkspaceV2 替代 |
| `RunResult` | 与 ResultView 重复，保留更完整的那个 |

---

## 七、Phase 4：端到端验证（~2 天）

> 目标：全流程跑通 + 验收标准全部通过

### 4-1 端到端集成测试脚本

```bash
# 测试脚本（手动或 CI）
# 1. 提交 PRD
RESULT=$(curl -s -X POST http://localhost:3000/api/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{"prdText":"构建一个任务管理应用"}')
JOB_ID=$(echo $RESULT | jq -r '.jobId')

# 2. 轮询等待完成
while true; do
  STATUS=$(curl -s http://localhost:3000/api/v1/pipeline/$JOB_ID/status | jq -r '.status')
  if [ "$STATUS" = "done" ] || [ "$STATUS" = "failed" ]; then break; fi
  sleep 2
done

# 3. 验证结果
FILES=$(curl -s http://localhost:3000/api/v1/pipeline/$JOB_ID/status | jq -r '.result.files | length')
echo "Generated $FILES files"
[ "$FILES" -gt 0 ] || exit 1

# 4. 验证 Stage 转换
STAGES=$(curl -s http://localhost:3000/api/v1/pipeline/$JOB_ID/status | jq -r '.steps[].name')
echo "Stages: $STAGES"
```

### 4-2 验收标准逐项确认

| # | 验收项 | Phase | 预期状态 |
|---|--------|-------|---------|
| 1 | PRD 提交后看到质量评分 | Phase 0 | ✅ |
| 2 | 需求确认页结构化需求 + 置信度 | Phase 0 | ✅ |
| 3 | 执行页 3 步骤 + token + Gitea | 现有 | ✅ |
| 4 | 代码产出页文件树 + 预览 | 现有 | ✅ |
| 5 | 项目看板真实数据 | Phase 2 | ✅ |
| 6 | 导航 5 项 | Phase 2 | ✅ |
| 7 | 所有组件接 API 无硬编码 | Phase 0+2 | ✅ |

### 4-3 性能基准

| 基准 | 目标 | 当前 |
|------|------|------|
| 单次 PRD → 骨架代码生成 | < 120 秒 | ~90 秒 (实测) |
| 验证链 (tsc + quality + hallucination + security) | < 30 秒 | 待测 |
| 前端首屏加载 | < 3 秒 | 待测 |

---

## 八、修复后目标架构

```
用户提交 PRD
  ↓
RequirementReview (置信度标注，🟢明确/🟡推断/🔴补充)     ← Phase 0 新增
  ↓
PipelineStateMachine
  Stage 1: parsing → generating → done                   ← 已有
  Stage 2: dev (代码开发阶段，预留空转)                   ← Phase 1 新增
  Stage 3: verifying → passed                             ← Phase 1 新增
  Stage 4: testing (预留空转)                             ← Phase 2 预留
  Stage 5: release → done                                ← Phase 2 预留
  ↓
CodeGenerationLoop + VerificationRunner
  ├── CompileValidator (tsc --noEmit)                    ← 已有
  ├── CodeQualityGuard (静态+语义+性能+策略四维)            ← Phase 1 新增
  ├── HallucinationGuard (自洽性+来源验证+GraphRAG)        ← Phase 1 新增
  └── SecurityAuditor (OWASP + CWE 检查)                  ← Phase 1 新增
  ↓
TaskGenerator (TASK.md)
  ↓
GiteaClient.push (best effort)
  ↓
前端 5 页面: Home / Requirements / Result / History / Dashboard
后端 全 9+ 路由: 全部活跃
```

---

## 九、风险与缓解

| 风险 | 概率 | 缓解 |
|------|------|------|
| 接入 Skills 后验证链变慢 | 中 | VerificationRunner 改为并行执行，加超时 |
| Stage 2-3 接入后状态机转换失败 | 低 | Phase 1 只添加空转，不阻塞主流程 |
| 删除 ProductPipeline 破坏测试 | 中 | 先注释类型导出，确认无引用后删除 |
| 前端导航收敛影响使用习惯 | 低 | 增加 `/history` 到导航栏 |
| Skill execute 接口与 VerificationTool 不兼容 | 中 | 创建适配器层包装 Skill 为 VerificationTool |

---

## 十、执行跟踪

| Phase | 任务 | 状态 | 日期 |
|-------|------|------|------|
| 0-1 | 修复 /progress 路由 | ⬜ 待执行 | |
| 0-2 | 统一 Token 存储 | ⬜ 待执行 | |
| 0-3 | 接入 RequirementReview | ⬜ 待执行 | |
| 0-4 | 删除死代码 | ⬜ 待执行 | |
| 1-1 | 验证链扩展 (3 个新 Tool) | ⬜ 待执行 | |
| 1-2 | Stage 2-3 接入 | ⬜ 待执行 | |
| 1-3 | 后端 API 补充 (B-001/002/003) | ⬜ 待执行 | |
| 2-1 | Skills 注册实现 | ⬜ 待执行 | |
| 2-2 | 治理 Harness 接入 | ⬜ 待执行 | |
| 2-3 | ProjectDashboard 路由 | ⬜ 待执行 | |
| 2-4 | 导航收敛到 5 项 | ⬜ 待执行 | |
| 3-1 | 删除旧 ProductPipeline | ⬜ 待执行 | |
| 3-2 | 标记未接入模块 | ⬜ 待执行 | |
| 3-3 | 清理 App.tsx 死引用 | ⬜ 待执行 | |
| 4-1 | 端到端集成测试 | ⬜ 待执行 | |
| 4-2 | 验收标准逐项确认 | ⬜ 待执行 | |
| 4-3 | 性能基准 | ⬜ 待执行 | |

---

## 附录 A：未接入模块清单

以下模块已实现但未接入活跃运行时，按优先级排列：

### P1 优先接入（验证链 + 核心编排）

| 模块 | 文件 | 行数 | 接入点 |
|------|------|------|--------|
| CodeQualityGuardSkill | skills/code-quality-guard-skill.ts | 314 | VerificationRunner |
| HallucinationGuardSkill | skills/hallucination-guard-skill.ts | 405 | VerificationRunner |
| SecurityAuditorSkill | skills/security-auditor-skill.ts | 365 | VerificationRunner |
| GovernanceHarness | harness/governance-harness.ts | 220 | synthesize.ts |
| InputGovernance | input-governance/governance.ts | 430 | synthesize.ts |

### P2 后续接入（编排 + 进化）

| 模块 | 文件 | 行数 | 接入点 |
|------|------|------|--------|
| DeepReasoningSkill | skills/deep-reasoning-skill.ts | 456 | PRD 解析后 |
| RequirementCompilerSkill | skills/requirement-compiler-skill.ts | 364 | 骨架生成前 |
| EvolutionHarness | harness/evolution-harness.ts | 431 | KPI 优化循环 |
| KPIDashboard | harness/kpi-dashboard.ts | 150 | 运行时监控 |
| A/B Test Runner | harness/ab-test-runner.ts | 164 | 进化验证 |
| OrchestrationHarness | harness/orchestration-harness.ts | 251 | 多 Harness 编排 |
| AgentHarness | harness/agent-harness.ts | 764 | 金丝雀部署 |

### P3 远期接入（架构生成 + 契约引擎）

| 模块 | 文件 | 行数 | 接入点 |
|------|------|------|--------|
| BackendArchitect | core/evolution/backend-architect.ts | 534 | 骨架生成 |
| FrontendArchitect | core/evolution/frontend-architect.ts | 409 | 骨架生成 |
| ASTBackwriteEngine | core/evolution/ast-backwrite-engine.ts | 491 | 代码修改 |
| APIContractEngine | core/contract/api-contract-engine.ts | 237 | 契约检查 |
| DiffOpenAPI | core/contract/diff-openapi.ts | 407 | 契约变更检测 |
| DiffDBSchema | core/contract/diff-dbschema.ts | 551 | 数据库变更检测 |
| RequirementGraph | req-graph/graph-engine.ts | 1029 | 需求图构建 |
| OwnershipGates | core/ownership/gates.ts | 383 | 变更权限 |
| TaskDAGEngine | core/task-dag/task-dag-engine.ts | 667 | 任务编排 |

### Standby（保留但暂不接入）

| 模块 | 原因 |
|------|------|
| ContextCompressorSkill | Agent Loop 当前单轮，无需上下文压缩 |
| MemoryConsolidationSkill | 无持久化记忆存储，无法接入 |
| PolicyGuardSkill | 无治理编排调用方 |
| SafeTrendScanner | 无 KPI 数据源 |
| UiuxHarness | 前端生成未接入 |
| SkillRegistration | 当前 no-op，Phase 2 实现 |

---

## 附录 B：测试基线

| 测试套件 | 通过 | 失败 | 失败原因 |
|----------|------|------|---------|
| code-generation-loop | 13/13 | 0 | — |
| skeleton-generator | 5/5 | 0 | — |
| 全量测试 | 1478/1541 | 63 | better-sqlite3 版本不匹配/LLM_API_KEY 未配置 |
| 类型检查 | 通过 | 0 | — |

修复 Phase 0-4 后应保持基线不变，新增模块同步增加测试。

---

## 附录 C：文件变更清单（按 Phase）

### Phase 0

| 文件 | 改动类型 |
|------|---------|
| web/src/components/RunList.tsx | 修改：路由链接修复 |
| web/src/components/ApiTokenSettings.tsx | 修改：sessionStorage → localStorage |
| web/src/components/RequirementReview.tsx | 修改：添加内部 API fetcher |
| web/src/App.tsx | 修改：添加 /confirm 路由 + 删除死引用 |
| web/src/hooks/useSSE.ts | 删除 |
| web/src/components/DeveloperWorkspace.tsx | 删除 |

### Phase 1

| 文件 | 改动类型 |
|------|---------|
| src/agents/verification-runner.ts | 修改：新增 3 个 VerificationTool |
| src/server/routes/synthesize.ts | 修改：Stage 2-3 转换 + requirements 字段 |
| src/server/routes/pipeline.ts | 修改：status 响应增加 rounds/tokenUsage/giteaUrl |
| src/server/routes/phase1-routes.ts | 修改：confirm 路由接入 CodeGenerationLoop |

### Phase 2

| 文件 | 改动类型 |
|------|---------|
| src/harness/skills-registration.ts | 修改：实现真正注册逻辑 |
| src/server/index.ts | 修改：启动时调用 Skills 注册 |
| src/server/routes/synthesize.ts | 修改：治理检查接入 |
| web/src/App.tsx | 修改：添加 /dashboard route |
| web/src/components/ProjectDashboard.tsx | 修改：从路由获取 runId |
| web/src/components/StageTabs.tsx | 修改：收敛到 5 项 |

### Phase 3

| 文件 | 改动类型 |
|------|---------|
| src/pipeline/product-pipeline.ts | 删除（703 行） |
| 多个未接入模块文件 | 修改：添加 @status standby 注释 |
| web/src/components/DeveloperWorkspace.tsx | 已在 Phase 0 删除 |

### Phase 4

| 文件 | 改动类型 |
|------|---------|
| e2e/full-pipeline.integration.test.ts | 新增：端到端测试 |
| 无新文件 | 验证 + 性能基准 |