# ANFSF Code Review Report

> **日期**: 2026-06-15
> **审查人**: 架构师 (Claude)
> **分支**: master

---

## 最新审查: Phase 4 冲刺 (2026-06-15 06:00-08:00)

Phase 4 一次性交付 20 个 commits，新增 22 个模块，覆盖 GAP-07/15/16/17/18 + Phase 4 三大核心。

### 新增模块

| 模块 | 路径 | 测试 | 评价 |
|------|------|------|------|
| KnowledgeBridge | `src/pipeline/knowledge-bridge.ts` | 3/3 | 桥接 CompileLearningDB + ComponentMiner → KnowledgeBase；双向同步链路完整 |
| MetricsCollector | `src/pipeline/metrics-collector.ts` | 5/5 | 阶段级指标采集 + P95 + 瓶颈分析 + Token 用量追踪 |
| TenantRegistry | `src/pipeline/tenant.ts` | 5/5 | 多租户注册 + 文件持久化；DEFAULT_TENANT 不可删除 |
| ProjectRegistry | `src/pipeline/project.ts` | 5/5 | 多项目管理 CRUD + state 更新 + tenant 过滤 |
| HealthDashboard | `src/pipeline/health-dashboard.ts` | 3/3 | 统一健康面板；聚合 projects/tenants/pipeline/knowledge/compile |
| UATReview | `src/pipeline/uat-review.ts` | 3/3 | PM 审核模型：approved/rejected/changes_requested |
| RetrospectiveEngine 接入 | `src/pipeline/recovery-engine.ts` | — | stage5_evolving 时执行 retrospective + introspection |
| IntrospectionEngine 增强 | `src/core/evolution/introspection-engine.ts` | — | 静态分析增强（无 LLM 也产生发现）+ KnowledgeBase 同步 |
| Knowledge Routes | `src/server/routes/knowledge.ts` | — | 4 个端点：compile-patterns / component-patterns / metrics / bottlenecks |
| Dashboard Routes | `src/server/routes/dashboard.ts` | — | 3 个端点：dashboard / dashboard/projects / dashboard/pipeline |
| UAT Routes | `src/server/routes/uat-review.ts` | — | 3 个端点：POST review / GET reviews / GET review/:id |
| Project Routes | `src/server/routes/projects.ts` | — | 5 个端点：CRUD + state update |
| CLI 扩展 | `src/cli/anfsf-cli.ts` | — | project list/create + knowledge bottlenecks |
| Pipeline 集成测试 | `src/__tests__/integration/` | — | 全栈生命周期验证 |
| INDEX.md | `docs/INDEX.md` | — | GAP-16/17/18 标记完成 |

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | MEDIUM | `uat-review.ts` | `var` 替代 `const`；`function(r){}` 替代箭头函数；无空格 | 架构师修复 |
| 2 | MEDIUM | `health-dashboard.ts` | `var` 替代 `const`；`function(p){}` 替代箭头函数；无空格 | 架构师修复 |
| 3 | MEDIUM | `routes/uat-review.ts` | `var` 替代 `const`；无空格 | 架构师修复 |
| 4 | MEDIUM | `routes/dashboard.ts` | `var` 替代 `const` | 架构师修复 |
| 5 | LOW | `knowledge-bridge.ts:1` | `—`→`鈥?` 编码损坏 1 处 | 架构师修复 |

### 验证结果

- `tsc --noEmit`: **0 错误**
- 新增模块测试: **24/24 passed** (knowledge-bridge, metrics-collector, tenant, project, health-dashboard, uat-review)
- 全量回归: **5 失败（预存环境）**, 2 skipped, 115 passed
- 5 个预存失败: `auth.test.ts`, `rate-limit.test.ts`, `server.test.ts`, `pipeline-stream.test.ts`, `synthesize-multipart.test.ts` — 均为 jest globals 环境问题，与 CODEX 无关

### 代码风格规范 — CODEX 必读

**问题**: Phase 4 大量新文件使用了非标准 JS/TS 编码风格（`var` 替代 `const`/`let`，`function(){}` 替代箭头函数，无空格），与 ANFSF 项目已有的 300 个文件的编码风格不一致。

**CODEX 必须遵守的风格规则**:

```
1. 变量声明: const（不变）> let（可变）> 禁止 var
   ❌ var x = ...
   ✅ const x = ... (如果确定不变)
   ✅ let x = ...   (如果需要重新赋值)

2. 回调函数: 箭头函数 > function 表达式
   ❌ arr.map(function(p) { return p.name; })
   ✅ arr.map(p => p.name)
   ❌ arr.filter(function(r) { return r.id === id; })
   ✅ arr.filter(r => r.id === id)

3. 对象字面量: 冒号后有空格，key: value
   ❌ {id:p.id,name:p.name}
   ✅ { id: p.id, name: p.name }

4. 比较/赋值: 运算符两侧有空格
   ❌ if(!x)
   ✅ if (!x)

5. return 语句: return 后加空格，return 对象有空格
   ❌ return{items:x};
   ✅ return { items: x };

6. 文件末尾: 保留一个空行（无 trailing 空白）

7. 编码: 仅使用 UTF-8 without BOM
   - xxd <file> | head -1 不应看到 "efbb bf"
```

**提交前自检** — 这个检查应该成为你的肌肉记忆:
```bash
# 在你的文件中运行:
grep -rn 'var ' src/pipeline/ src/server/routes/ --include="*.ts" | grep -v node_modules
# 输出应该为空

# BOM 检查:
xxd src/pipeline/*.ts | grep "efbb bf" && echo "BOM FOUND — FIX BEFORE COMMIT"

# 编码检查:
grep -r "鈥" src/ --include="*.ts" && echo "ENCODING CORRUPTION — FIX BEFORE COMMIT"
```

---

## Phase 4 整体评估

### 完成项

| GAP | 名称 | 状态 |
|-----|------|------|
| GAP-07 | PM UAT 串联 | ✅ 完成 |
| GAP-15 | MetricsCollector | ✅ 完成 |
| GAP-16 | 多租户 | ✅ 完成 |
| GAP-17 | 多项目管理 | ✅ 完成 |
| GAP-18 | 健康度看板 | ✅ 完成 |
| GAP-03-1 | 进化引擎接入 Pipeline | ✅ 完成 |
| GAP-03-2 | 架构自省 | ✅ 完成 |
| GAP-12 | 知识库增量更新 | ✅ 完成（KnowledgeBridge） |

### Phase 1-4 总计

```
GAP-01 ~ GAP-18: 18 项
已完成: 13 项
未完成: GAP-13 多形态输出(H5/小程序), GAP-14 工单系统, GAP-15(已有基础但未全), 项目间代码复用推荐
```

### 核心价值

```
ANFSF 现在可以:
  - 接收 PRD → 自动解析 → Agent Loop 生成骨架代码
  - 验证 + 修复（3 轮） → 写盘 → 推送 Gitea
  - 开发者提交代码 → DevFixLoop 编译+契约检查 → L1 自动修复
  - 测试生成（Playwright/Jest/Vitest）
  - PM UAT 审核循环（approved/rejected/changes_requested）
  - 项目完成 → 进化引擎运行（编译学习 + 组件沉淀 + 回顾 + 自省）
  - 跨项目知识复用（CompileLearningDB + ComponentMiner → prompt 注入）
  - 多租户 + 多项目并行管理
  - 健康度看板 + 瓶颈分析
  - 完整的 REST API + CLI
```

---

## GAP-08 / GAP-13 / GAP-14 / T-303 审查 (2026-06-15 08:00)

### 审查范围

对 Phase 1-4 结束后仍标记为"延后"或"未完成"的 4 项进行现状评估，确认它们的实际完成度，以及是否应该重新分级。

---

### GAP-08: 版本发布状态新增

**原定义** (BLUEPRINT: `状态扩展`, Phase 2 P1):
> 在 pipeline-state-machine 中新增 test/demo 发布状态

**现状**:
- ✅ `stage4_released_to_test` 已存在于 [pipeline-state-machine.ts](src/pipeline/pipeline-state-machine.ts) 的 `ProjectState` 类型和 `TRANSITION_TABLE` 中
- ✅ `stage4_uat` + `stage4_uat_fixing` UAT 循环已实现
- ✅ `stage5_evolving` 进化状态已实现
- ✅ `release-check.ts` 三层发布门禁已存在
- ✅ `checkpoint.ts` 支持 re-entry

**结论**: **实际已完成**。状态数从原始 15 扩展到 19，覆盖了 test/demo/uat/evolution 全部阶段。GAP-08 应该标记为完成，INDEX.md 中标注为 Phase 2 是因为当时尚未实现，现在应该更新。

**建议**: 在 INDEX.md 中更新 GAP-08 状态为"完成"。

---

### T-303: PM 测试审查界面

**原定义** (PHASE1-SPECS, 4d):
> PM 在 Web 前端查看测试结果、审查失败用例、补充遗漏场景、确认修复

**现状**:
- ✅ [TestFeedback.tsx](web/src/components/TestFeedback.tsx) 已存在 (524 行) — **但有 BOM 编码问题**
- ✅ [feedback.ts](src/server/routes/feedback.ts) 9 个 API 端点完整
- ✅ PM 可提交结构化反馈、查看 lessons/fixes/snapshots、发起 rollback
- ✅ UAT Review API 已实现 ([uat-review.ts](src/pipeline/uat-review.ts) + [routes/uat-review.ts](src/server/routes/uat-review.ts))
- ✅ Index.md 中仍标记为"延后"，但 `TestFeedback.tsx` 实际已存在并接入

**结论**: **大部分已完成**。T-303 在 INDEX.md 中标记为"延后"是错误的——前端组件和后端 API 都已存在并工作。唯一未完成的是 BOM 修复。

**建议**: T-303 标记为完成，修复 BOM。

---

### GAP-13: 多形态输出 H5/小程序

**原定义** (IMPLEMENTATION-PLAN, Phase 3 P2):
> SkeletonGenerator 扩展，支持 web/h5/miniprogram 三种输出形态

**现状**:
- ✅ `SkeletonGenerationInput.deploymentForm` 已定义 `'web' | 'h5' | 'miniprogram'`
- ✅ `RequirementSpec.deploymentForm` 已定义相同枚举
- ❌ `SkeletonGenerator.generate()` 将 `deploymentForm` 注入 spec.context，但实际代码生成逻辑**未针对 h5/miniprogram 产生差异化输出**
- ❌ `ComponentMiner.scan()` 接受 `projectType` 参数但扫描逻辑对 h5/miniprogram 与 web 无区别
- ❌ `buildSkeletonPrompt()` 未根据 deploymentForm 调整 prompt（不要求 mobile-first 布局，不要求小程序 WXML 格式）

**结论**: **未完成，但基础已就绪**。类型系统支持三种形态，实际生成逻辑仍是 web-only。H5 差异不大（同一套 React 代码），小程序需要模板差异（WXML/WXSS 替代 HTML/CSS）。

**工作量评估**:
- H5: 1d — 仅需在 prompt 中加入 viewport/mobile-first 指令
- 小程序: 5d — 需要新的模板系统（WXML 骨架）

**建议**: 保留在 Phase 3 待办。

---

### GAP-14: 工单系统对接

**原定义** (IMPLEMENTATION-PLAN, Phase 3 P3):
> 对外部工单系统（Jira/飞书/钉钉等）的对接能力

**现状**:
- ❌ 整个代码库中**没有任何外部工单系统的 import 或引用**
- ❌ 无 webhook 发送模块、无 ticket 创建逻辑
- ✅ 内部已有 `FixRecord` + `fault-reporter.ts` 作为内部"工单"概念，但不对外对接

**结论**: **完全未开始**。P3 优先级，属于"有最好但没有也能工作"的功能。

**建议**: 保持延后，或降级为 Phase 5（post-launch）。

---

### 审查结论汇总

| 编号 | 名称 | 原状态 | 实际状态 | 行动 |
|------|------|--------|---------|------|
| GAP-08 | 版本发布状态新增 | Phase 2 P1 / INDEX:Phase 2 | **✅ 已完成** | 更新 INDEX.md |
| T-303 | PM 测试审查界面 | 延后 / 已延 | **✅ 基本完成** | 修复 BOM，更新 INDEX.md |
| GAP-13 | 多形态输出 | Phase 3 P2 | **⚠️ 类型就绪，生成未实现** | 保留 Phase 3 待办 |
| GAP-14 | 工单系统对接 | Phase 3 P3 | **❌ 未开始** | 保持延后/降级 |

---

## 历史审查: Phase 3 (2026-06-12 19:00-20:00)

Phase 3 分三批交付，共新增 6 个模块。

### 新增模块

| 模块 | 路径 | 测试 | 评价 |
|------|------|------|------|
| TestGenLoop | `src/agents/test-gen-loop.ts` | 3/3 | 第三 AgentLoop 变体 |
| EvolutionRunner | `src/pipeline/evolution-runner.ts` | 2/2 | stage5_evolving 入口 |
| ComponentMiner | `src/pipeline/component-miner.ts` | 5/5 | 进化一核心 |
| CodeGenLoop 更新 | `src/agents/code-generation-loop.ts` | — | 双注入（CompileLearningDB + ComponentMiner） |

### 发现 + 已修复

| # | 严重度 | 文件 | 问题 |
|---|--------|------|------|
| 1 | MEDIUM | `code-generation-loop.ts` | BOM + 4 处编码损坏 |
| 2 | MEDIUM | `checkpoint.ts` | BOM + 编码损坏 |

---

## 历史审查: Phase 2 收尾 (2026-06-12 17:00)

| # | 严重度 | 文件 | 问题 |
|---|--------|------|------|
| 1 | CRITICAL | `fix-executor.ts:259` | `computePatch()` header 用 `tmp` |
| 2 | MEDIUM | `fix-executor.ts:174` | L1 缺行数门禁 |
| 3 | MEDIUM | `fix-executor.ts:186` | 未验证就记录 outcome: fixed |
| 4 | LOW | `recovery-engine.ts:9` | allStates 硬编码 |

## 历史审查: AgentLoop + CompileLearningDB (2026-06-12 15:00)

| # | 严重度 | 文件 | 问题 |
|---|--------|------|------|
| 1 | CRITICAL | `agent-loop-base.ts:61` | tokenUsage 从未填充 |
| 2 | CRITICAL | `code-generation-loop.ts:197` | null.code.files NPE |
| 3 | MEDIUM | `code-generation-loop.ts:229` | markdown fence 未剥离 |

## 历史审查: GAP-01/GAP-02 骨架 (2026-06-12 12:00)

| # | 严重度 | 文件 | 问题 |
|---|--------|------|------|
| 1 | CRITICAL | `skeleton-generator.ts:37` | `AgentLoopResult['code']` 不存在 |
| 2 | HIGH | `pipeline-state-machine.test.ts` | ALL_STATES 缺 4 状态 |
| 3 | MEDIUM | `dev-fix-loop.ts` | 6 处编码损坏 |

---

## 系统状态

### 测试基线 (2026-06-15)
```
Test Suites: 120 total (5 failed — 预存环境依赖, 2 skipped, 113 passed)
Tests: 1607 total (42 failed — 全部来自预存 jest globals 问题, 17 skipped, 1548 passed)
新增模块: 24/24 passed
```

### 预存失败（不修复 — jest globals 环境）
- `auth.test.ts`
- `rate-limit.test.ts`
- `server.test.ts`
- `pipeline-stream.test.ts`
- `synthesize-multipart.test.ts`
