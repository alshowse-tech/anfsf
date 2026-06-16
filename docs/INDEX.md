# ANFSF 文档索引（Document Index）

> **版本**: 2.0 | **日期**: 2026-06-16 | **状态基准**: [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md)
> **重要**: 本索引以 ANFSF-REFACTOR-FIX.md 的审计结论为基准。模块"代码已写+测试通过"不等于"已接入运行时"。运行时接入率约 35%。

---

## 使用方式

1. **按概念查** — §1，从概念名出发找到文档和真实状态
2. **按文件查** — §2，从代码文件出发找到运行时状态
3. **按任务查** — §3，从 T-xxx/GAP 出发找到文档和代码
4. **按文档查** — §4，文档清单及推荐度

---

## 一、概念索引（主表）

> 状态说明：✅ 已接入运行时 | ⚠️ 代码存在但未接入 | ❌ 未实现 | ⏸ 已延后

| 概念 | 主文档 | 运行时状态 | 说明 |
|------|--------|-----------|------|
| **13 步端到端工作流** | [BLUEPRINT](ANFSF-BLUEPRINT.md) §2 | ⚠️ 部分 | 仅 Step 1-4 部分跑通，Step 5-13 未接入 |
| **五阶段状态机** | [TECHNICAL-DESIGN](TECHNICAL-DESIGN.md) §3 | ⚠️ 部分 | 仅 stage1_parsing→stage1_done 两个状态转换在运行 |
| **Agent Loop** | [TECHNICAL-DESIGN](TECHNICAL-DESIGN.md) §4 | ✅ 已接入 | CodeGenerationLoop 运行中 |
| **验证链** | [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) §1-1 | ⚠️ 部分 | 仅 CompileValidator 活跃，3 个 Skill 未接入 |
| **PRD 质量预检** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-101 | ✅ 已接入 | prd-quality-check.ts 在 synthesize 路由中调用 |
| **置信度标注** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-102 | ✅ 已接入 | confidence-annotator.ts 在 synthesize 路由中调用 |
| **骨架生成** | [TECHNICAL-DESIGN](TECHNICAL-DESIGN.md) §4 | ✅ 已接入 | 通过 Agent Loop 生成骨架代码 |
| **Gitea 集成** | [TECHNICAL-DESIGN](TECHNICAL-DESIGN.md) §6 | ⚠️ 部分 | gitea-client.ts 存在但 push 功能有 bug（缺 SHA） |
| **代码标注** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-202 | ✅ 已接入 | code-annotator.ts 存在 |
| **提交验证** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-204 | ⚠️ 未触发 | commit-verification.ts 存在但 webhook 未接入运行时 |
| **FixEngine** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-301 | ✅ 已接入 | fix-engine.ts 存在 |
| **发布检查** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-304 | ✅ 已接入 | release-check.ts 存在 |
| **项目归档** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-305 | ✅ 已接入 | archiver.ts 存在 |
| **PM 需求确认** | [BLUEPRINT](ANFSF-BLUEPRINT.md) §2-Step3 | ❌ 未接入 | RequirementReview 组件存在但路由未有效使用 |
| **PM 测试审查** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-303 | ⏸ 延后 | 延至全流程联调 |
| **角色管理** | [PHASE1-SPECS](PHASE1-TASK-SPECS.md) T-401 | ⏸ 延后 | 单用户模式先行 |
| **Skills 注册** | [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) §2-1 | ❌ no-op | 18 个 Skill 从未在运行时注册 |
| **17 层流水线** | [17层分析](ANFSF%2017%20层理论架构%20—%20逐层详细设计分析.md) | ❌ 已废弃 | 已被五阶段状态机取代 |
| **进化引擎** | [DEVELOPMENT-PATH](ANFSF-DEVELOPMENT-PATH.md) §2 | ❌ 未接入 | 7 个进化模块存在但未接入 Pipeline |

---

## 二、文件状态索引

### 运行时活跃的代码文件

| 文件 | 活跃角色 | 说明 |
|------|---------|------|
| `src/server/index.ts` | 入口 | Fastify 启动 |
| `src/server/routes/synthesize.ts` | 主 API | POST /api/v1/synthesize |
| `src/server/routes/pipeline.ts` | 状态 API | GET /api/v1/pipeline/:id/status |
| `src/pipeline/pipeline-state-machine.ts` | 状态机 | 仅 2 个状态转换 |
| `src/agents/code-generation-loop.ts` | Agent Loop | 生成→验证→修复循环 |
| `src/agents/verification-runner.ts` | 验证调度 | 仅 CompileValidator |
| `src/prd/prd-parser.ts` | PRD 解析 | LLM 解析 |
| `src/prd/prd-quality-check.ts` | 质量预检 | 四维评分 |
| `src/prd/confidence-annotator.ts` | 置信度 | 🟢🟡🔴 标注 |
| `src/pipeline/skeleton-generator.ts` | 骨架生成 | Agent Loop 集成 |
| `src/pipeline/task-generator.ts` | 任务生成 | TASK.md 生成 |
| `src/integrations/llm-client.ts` | LLM 客户端 | 多 Provider |
| `src/integrations/gitea-client.ts` | Gitea | push 功能有 bug |

### 代码存在但未接入运行时的文件

| 文件 | 模块类别 | 接入优先级(REF努力) |
|------|---------|-----------------|
| `src/skills/code-quality-guard-skill.ts` | 验证链 | P1 — Phase 1 接入 |
| `src/skills/hallucination-guard-skill.ts` | 验证链 | P1 — Phase 1 接入 |
| `src/skills/security-auditor-skill.ts` | 验证链 | P1 — Phase 1 接入 |
| `src/harness/skills-registration.ts` | 编排 | P2 — Phase 2 注册 |
| `src/harness/governance-harness.ts` | 治理 | P2 — Phase 2 接入 |
| `src/input-governance/governance.ts` | 输入安全 | P2 — Phase 2 接入 |
| `src/core/evolution/*.ts` (7个) | 进化 | P3 — Phase 3 |
| `src/harness/agent-harness.ts` | 部署 | P3 — Phase 3 |
| `src/core/contract/*.ts` (4个) | 契约引擎 | P3 — Phase 3 |
| `src/core/graph/graph-engine.ts` | 需求图 | P3 — Phase 3 |

> 完整未接入模块清单见 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) 附录 A

---

## 三、GAP 与任务索引

> 统一来源：以 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) 为基准，标注运行时接入状态

| 编号 | 名称 | 代码状态 | 运行时状态 | 阶段 |
|------|------|---------|-----------|------|
| GAP-01 | AgentLoop 抽象基类 | ✅ agent-loop-base.ts 已创建 | ⚠️ DevFixLoop/TestGenLoop 未接入 | Phase 2 |
| GAP-02 | 状态机拓扑 | ✅ 19 状态已实现 | ⚠️ 仅 2 个状态转换活跃 | Phase 2 |
| GAP-03 | 进化引擎接入 | ✅ evolution-runner.ts 存在 | ❌ 未接入 Pipeline | Phase 3 |
| GAP-04 | DevFixLoop | ✅ dev-fix-loop.ts 存在 | ❌ 未接入运行时 | Phase 2 |
| GAP-05 | TestGenLoop | ✅ test-gen-loop.ts 存在 | ❌ 未接入运行时 | Phase 2 |
| GAP-06 | L1 FixExecutor | ✅ fix-executor.ts 存在 | ⚠️ 已接入但触发条件未激活 | Phase 2 |
| GAP-09 | CompileLearningDB | ✅ 存在 | ❌ 未接入 | Phase 2 |
| GAP-10 | ComponentMiner | ✅ 存在 | ❌ 未接入 | Phase 2 |
| GAP-11 | PromptInjectionEngine | ✅ 存在 | ❌ 未接入 | Phase 2 |
| GAP-12 | 知识库增量更新 | ✅ 存在 | ❌ 未接入 | Phase 3 |
| GAP-15 | 架构自省 | ✅ 存在 | ❌ 未接入 | Phase 4 |
| T-001~T-004 | 地基组 | ✅ 完成 | ⚠️ 仅部分接入运行时 | 完成 |
| T-101~T-105 | 阶段一组 | ✅ 完成 | ⚠️ 仅部分接入运行时 | 完成 |
| T-201~T-206 | 阶段二/三组 | ✅ 完成 | ⚠️ 仅部分接入运行时 | 完成 |
| T-301~T-305 | 阶段四/五组 | ✅ 完成 | ⚠️ 仅部分接入运行时 | 完成 |
| T-401~T-403 | 权限+前端组 | ⏸ 延后 | ❌ 未开始 | 延后 |
| T-501~T-503 | 联调组 | ⏸ 延后 | ❌ 未开始 | 延后 |
| I-001~I-008 | 集成任务 | ❌ 未开始 | ❌ 未开始 | 见 REFACTOR-FIX |

---

## 四、文档清单与推荐度

| 文档 | 主题 | 推荐度 | 说明 |
|------|------|--------|------|
| [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) | **当前真实状态审计** | ⭐⭐⭐ 必读 | 唯一准确反映系统运行时状态的文档 |
| [ANFSF-OS-UI-REFACTOR](ANFSF-OS-UI-REFACTOR.md) | 前端重构执行记录 | ⭐⭐⭐ 必读 | Phase A-C 全部完成，含变更清单 |
| [claude-code-review](claude-code-review.md) | 代码审查记录 | ⭐⭐ 推荐 | 最新审查结果（2026-06-15） |
| [ANFSF-DEVELOPMENT-PATH](ANFSF-DEVELOPMENT-PATH.md) | 执行路径与锁定决策 | ⭐⭐ 推荐 | 架构决策仍有效，但状态标记需以 REFACTOR-FIX 为准 |
| [ANFSF-BLUEPRINT](ANFSF-BLUEPRINT.md) | 宏观蓝图 | ⭐⭐ 推荐 | 13步流程和3缺口分析有效，完成状态需以 REFACTOR-FIX 为准 |
| [TECHNICAL-DESIGN](TECHNICAL-DESIGN.md) | 技术架构设计 | ⭐⭐ 推荐 | 五阶段状态机和Agent Loop设计有效，目录结构需对齐实际代码 |
| [IMPLEMENTATION-PLAN](IMPLEMENTATION-PLAN.md) | Phase 1 任务规格 | ⭐ 参考 | 25项任务代码已完成但接入率约35%，状态描述需以 REFACTOR-FIX 为准 |
| [PHASE1-TASK-SPECS](PHASE1-TASK-SPECS.md) | 任务详细规格 | ⭐ 参考 | 任务输入/输出/验收标准仍有效 |
| [API-SPEC](API-SPEC.md) | REST API 端点定义 | ⭐ 参考 | 端点定义有效，需标注实现状态（见本文§二） |
| [DATABASE-SCHEMA](DATABASE-SCHEMA.md) | 数据库 Schema | ⭐ 参考 | 表结构有效 |
| [development-discussion](product-discussion-2026-05-28.md) | 产品方向讨论 | ⭐ 参考 | 55条共识仍有效 |
| [INTERLAYER-PROTOCOL](INTERLAYER-PROTOCOL.md) | 17层协议定义 | ⚠️ 过时 | 描述17层理论架构，已被五阶段状态机取代，仅作参考 |
| [17层分析](ANFSF%2017%20层理论架构%20—%20逐层详细设计分析.md) | 理论架构详解 | ⚠️ 过时 | 路径引用过时，实现率描述与实际不符 |
| [17层对比](ANFSF%2017%20层理论架构%20vs%20实际实现对比分析.md) | 理论vs实际对比 | ⚠️ 过时 | 引用路径为Linux，实现率统计方式需注意 |
| [UI-REFACTOR-PLAN](UI-REFACTOR-PLAN.md) | 前端重构计划 | ⚠️ 已被取代 | 已被 ANFSF-OS-UI-REFACTOR 取代 |
| [INTEGRATION-PLAN](INTEGRATION-PLAN.md) | 集成计划 | ⚠️ 已被取代 | I-001~I-008 已并入 REFACTOR-FIX Phase 0-2 |
| [audit-report](audit-report.md) | 安全审计 | ⚠️ 部分过时 | 2026-05-21 审计，部分P0/P1标记已修复但需验证 |
| [DEVELOPMENT-STANDARDS](DEVELOPMENT-STANDARDS.md) | 编码规范 | ✅ 有效 | 规范本身有效，但实际执行需加强 |
| [ARCHITECTURE](ARCHITECTURE.md) | 系统架构 | ⚠️ 需更新 | 仍描述17层架构，需更新为五阶段+Agent Loop |
| [RUNBOOK](RUNBOOK.md) | 运维手册 | ✅ 有效 | 部署和运维信息有效，需补充文档链接 |
| [SECURITY](../SECURITY.md) | 安全策略 | ⚠️ 需更新 | 缺少联系邮箱 |

---

## 五、状态定义说明

本文档使用以下状态标记：

| 标记 | 含义 |
|------|------|
| ✅ 已接入运行时 | 代码在 synthesize 路由或其他活跃路径中被调用 |
| ⚠️ 代码存在但未接入 | 文件存在、测试通过，但运行时不调用 |
| ❌ 未实现/未接入 | 代码不存在或完全为空壳 |
| ⏸ 已延后 | 计划延后执行 |

**核心区分**："代码已写+测试通过" ≠ "已接入运行时"。详见 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) §1.1。