# ANFSF 文档索引（Document Index）

> 版本: 1.0 | 日期: 2026-06-12 | 用途: 快速定位文档/代码/任务/决策

---

## 使用方式

本文档提供三种查询路径：

**1. 按概念查** — 主表格（§2），从概念名出发，找到对应文档、代码、任务和决策
**2. 按文件查** — 反向索引（§3），从代码文件出发，找到相关文档
**3. 按任务查** — 任务索引（§4），从 T-xxx 出发，找到文档和代码

---

## 一、概念索引（主表）

| 概念 | 主文档(节) | 相关代码文件 | 关联任务 | 关联决策 |
|------|-----------|------------|---------|---------|
| **13 步端到端工作流** | BLUEPRINT §2 | pipeline-state-machine.ts | - | development-path §1.3 |
|  |  | server/routes/synthesize.ts |  |  |
| **GAP-01: AgentLoop 变体不足** | BLUEPRINT §3-1 | agents/code-generation-loop.ts | T-002 | development-path §1.1 |
|  |  | agents/verification-runner.ts |  |  |
| **GAP-02: 状态机线性拓扑** | BLUEPRINT §3-2 | pipeline/pipeline-state-machine.ts | T-001 | - |
|  |  | pipeline/checkpoint.ts | T-003 |  |
| **GAP-03: 进化引擎未接入** | BLUEPRINT §3-3 | core/evolution/offline-optimizer.ts | - | development-path §2 |
|  |  | harness/evolution-harness.ts |  |  |
|  |  | harness/ab-test-runner.ts |  |  |
| **Phase 1 地基组** | PHASE1-SPECS T-001~T-004 | pipeline/pipeline-state-machine.ts | T-001 | technical-design §3 |
|  |  | agents/code-generation-loop.ts | T-002 | technical-design §4 |
|  |  | pipeline/checkpoint.ts | T-003 | technical-design §3-3 |
|  |  | pipeline/token-budget.ts | T-004 | technical-design §3-4 |
| **Phase 1 阶段一组** | PHASE1-SPECS T-101~T-105 | prd/prd-quality-check.ts | T-101 | technical-design §2-3 |
|  |  | prd/confidence-annotator.ts | T-102 |  |
|  |  | pipeline/skeleton-generator.ts | T-104 |  |
| **Phase 1 阶段二/三组** | PHASE1-SPECS T-201~T-206 | integrations/gitea-client.ts | T-201 | - |
|  |  | pipeline/code-annotator.ts | T-202 |  |
|  |  | pipeline/contract-watcher.ts | T-203 |  |
|  |  | pipeline/commit-verification.ts | T-204 |  |
|  |  | pipeline/fault-reporter.ts | T-205 |  |
|  |  | pipeline/task-generator.ts | T-206 |  |
| **Phase 1 阶段四/五组** | PHASE1-SPECS T-301~T-305 | pipeline/fix-engine.ts | T-301 | development-path §1.5 |
|  |  | pipeline/release-check.ts | T-304 |  |
|  |  | pipeline/archiver.ts | T-305 |  |
| **Phase 1 权限组(延后)** | PHASE1-SPECS T-401~T-403 | server/auth/roles.ts | T-401 | - |
|  |  | web/src/components/ProjectDashboard.tsx | T-402 |  |
|  |  | web/src/components/DeveloperWorkspace.tsx | T-403 |  |
| **Phase 1 联调组(延后)** | PHASE1-SPECS T-501~T-503 | (全流程) | T-501 | - |
|  |  | (Bug 修复) | T-502 |  |
| **T-303 PM 测试审查(已延)** | PHASE1-SPECS T-303 | web/src/components/TestFeedback.tsx | T-303 | BLUEPRINT §2-Step9 |
|  |  | server/routes/feedback.ts |  |  |
| **FixEngine 三级修复矩阵** | PHASE1-SPECS T-301 | pipeline/fix-engine.ts | T-301 | development-path §1.5 |
|  |  | pipeline/code-annotator.ts | T-202 |  |
| **Agent Loop 不生成业务逻辑** | development-path §5.1 | agents/code-generation-loop.ts | - | technical-design §1.1 |
|  |  | core/evolution/backend-architect.ts |  |  |
| **Stage 2 保持黑盒** | development-path §5.1 | (无代码) | - | development-path §5.1 |
| **检查点覆盖所有阶段** | development-path §5.1 | pipeline/checkpoint.ts | T-003 | - |
| **骨架生成定位** | development-path §1.2 | agents/code-generation-loop.ts | T-002 | development-path §1.2 |
|  |  | pipeline/skeleton-generator.ts | T-104 |  |
| **三类 Agent Loop** | development-path §3 | agents/code-generation-loop.ts | GAP-01 | BLUEPRINT §3-1 |
|  |  | (需新建) dev-fix-loop.ts | GAP-04 |  |
|  |  | (需新建) test-gen-loop.ts | GAP-05 |  |
| **三种进化(组件/编译/经验)** | development-path §2 | (需新建) ComponentMiner | GAP-01/06 | development-path §2 |
|  |  | (需新建) CompileLearningDB |  |  |
|  |  | pipeline/retrospective-engine.ts |  |  |
| **Skill/Harness 可用性** | development-path §2(各段) | skills/hybrid-retriever-skill.ts | - | development-path §2 |
|  |  | storage/knowledge-base.ts |  |  |
|  |  | integrations/graphrag.ts |  |  |
| **17 层理论** | 根目录 17层分析.md | (全部 src/) | - | BLUEPRINT 附录B |
| **17 层 vs 实际对比** | 根目录 17层对比.md | - | - | development-path 附录B |
| **Phase 2 计划** | BLUEPRINT §4-Phase2 | agents/agent-loop-base.ts (需新建) | GAP-03~10 | - |
| **Phase 3 计划** | BLUEPRINT §4-Phase3 | - | GAP-11~14 | - |
| **Phase 4 计划** | BLUEPRINT §4-Phase4 | - | GAP-15~18 | - |
| **17 层认知内核 L4** | 17层分析.md L4 | req-graph/graph-engine.ts | - | BLUEPRINT §3 |
|  |  | memory/temporal_kg.ts |  |  |
| **输入治理 L3** | 17层分析.md L3 | input-governance/governance.ts | - | - |
|  |  | core/synthesizer/veto/veto-enforcer.ts |  |  |
| **部署 L15** | 17层分析.md L15 | harness/canary-deployer.ts | - | - |
|  |  | harness/canary-health-check.ts |  |  |
|  |  | integrations/github-ci.ts |  |  |
| **运行时智能 L16** | 17层分析.md L16 | core/role/kpi-engine.ts | - | - |
|  |  | harness/kpi-dashboard.ts |  |  |
| **进化护栏 L17** | 17层分析.md L17 | harness/evolution-harness.ts | - | - |
|  |  | agents/external-review-agent.ts |  |  |
| **安全与审计** | audit-report.md §2 | .env / prd-parser.ts | T-502 | - |
|  |  | server/middleware/auth.ts |  |  |

---

## 二、文件反向索引

以代码文件为主键，反向查找相关文档和任务。

### src/agents/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| code-generation-loop.ts | BLUEPRINT §3-1, development-path §1.1, technical-design §4 | T-002 |
| verification-runner.ts | BLUEPRINT §3-1 | T-002 |
| agent-os.ts | 17层分析.md L9 | - |
| coordination-protocol.ts | 17层分析.md L9 | - |
| external-review-agent.ts | 17层分析.md L17 | - |

### src/pipeline/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| pipeline-state-machine.ts | BLUEPRINT §3-2, technical-design §3 | T-001 |
| checkpoint.ts | development-path §5.1, technical-design §3-3 | T-003 |
| token-budget.ts | technical-design §3-4 | T-004 |
| product-pipeline.ts | BLUEPRINT §1(旧架构) | - |
| skeleton-generator.ts | BLUEPRINT §2-Step4 | T-104 |
| code-annotator.ts | BLUEPRINT §2-Step5/6, development-path §2 | T-202 |
| commit-verification.ts | BLUEPRINT §2-Step6 | T-204 |
| contract-watcher.ts | BLUEPRINT §2-Step6 | T-203 |
| fault-reporter.ts | BLUEPRINT §2-Step6 | T-205 |
| fix-engine.ts | BLUEPRINT §2-Step7, development-path §1.5 | T-301 |
| task-generator.ts | BLUEPRINT §2-Step4, technical-design §2-3 | T-206 |
| release-check.ts | PHASE1-SPECS T-304 | T-304 |
| archiver.ts | PHASE1-SPECS T-305 | T-305 |

### src/prd/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| prd-parser.ts | 17层分析.md L1 | - |
| prd-quality-check.ts | BLUEPRINT §2-Step2, PHASE1-SPECS T-101 | T-101 |
| confidence-annotator.ts | BLUEPRINT §2-Step3, PHASE1-SPECS T-102 | T-102 |

### src/server/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| index.ts | ARCHITECTURE.md, BLUEPRINT §2 | - |
| routes/feedback.ts | BLUEPRINT §2-Step9 | T-303 |
| routes/synthesize.ts | API-SPEC.md | - |
| store.ts | DATABASE-SCHEMA.md | - |
| auth/roles.ts | PHASE1-SPECS T-401 | T-401 |
| middleware/auth.ts | audit-report.md | - |

### src/core/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| evolution/ | 17层分析.md L16/L17 | - |
| contract/ | 17层分析.md L7 | - |
| quality/ | 17层分析.md L10 | - |

### src/skills/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| retrospective-engine.ts | development-path §2(进化三) | - |
| hybrid-retriever-skill.ts | development-path §2(进化一) | - |
| all others | 17层分析.md §四(技能库) | - |

### src/harness/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| evolution-harness.ts | 17层分析.md L17 | - |
| canary-deployer.ts | 17层分析.md L15 | - |
| canary-health-check.ts | 17层分析.md L15 | - |
| ab-test-runner.ts | 17层分析.md L16 | - |

### web/src/components/

| 文件 | 相关文档 | 关联任务 |
|------|---------|---------|
| TestFeedback.tsx | BLUEPRINT §2-Step9 | T-303(已延) |
| ProjectDashboard.tsx | PHASE1-SPECS T-402 | T-402 |
| DeveloperWorkspace.tsx | PHASE1-SPECS T-403 | T-403 |
| RequirementReview.tsx | BLUEPRINT §2-Step3 | T-103 |
| PRDForm.tsx | BLUEPRINT §2-Step1 | - |

---

## 三、任务索引

| 任务 | 名称 | 文档 | 代码 | 状态 |
|------|------|------|------|------|
| T-001 | Pipeline 状态机 | PHASE1-SPECS T-001, BLUEPRINT §3-2 | pipeline-state-machine.ts | 完成 |
| T-002 | Agent 循环实现 | PHASE1-SPECS T-002, BLUEPRINT §3-1 | code-generation-loop.ts | 完成 |
| T-003 | 检查点与恢复 | PHASE1-SPECS T-003 | checkpoint.ts | 完成 |
| T-004 | Token 预算 | PHASE1-SPECS T-004 | token-budget.ts | 完成 |
| T-101 | PRD 质量预检 | PHASE1-SPECS T-101, BLUEPRINT §2-Step2 | prd-quality-check.ts | 完成 |
| T-102 | 置信度标注 | PHASE1-SPECS T-102, BLUEPRINT §2-Step3 | confidence-annotator.ts | 完成 |
| T-103 | PM 确认界面 | PHASE1-SPECS T-103 | RequirementReview.tsx | 完成 |
| T-104 | Agent Loop 接入骨架 | PHASE1-SPECS T-104 | skeleton-generator.ts | 完成 |
| T-105 | 部署形态确认 | PHASE1-SPECS T-105 | - | 完成 |
| T-201 | Gitea 对接 | PHASE1-SPECS T-201 | gitea-client.ts | 完成 |
| T-202 | 代码变动标注 | PHASE1-SPECS T-202, development-path §2 | code-annotator.ts | 完成 |
| T-203 | 契约检查触发 | PHASE1-SPECS T-203 | contract-watcher.ts | 完成 |
| T-204 | 提交验证流水线 | PHASE1-SPECS T-204 | commit-verification.ts | 完成 |
| T-205 | 故障报告 | PHASE1-SPECS T-205 | fault-reporter.ts | 完成 |
| T-206 | 任务包生成 | PHASE1-SPECS T-206 | task-generator.ts | 完成 |
| T-301 | 分级修复引擎 | PHASE1-SPECS T-301, development-path §1.5 | fix-engine.ts | 完成 |
| T-302 | 回归测试触发 | PHASE1-SPECS T-302 | regression-runner.ts | 完成 |
| T-303 | PM 测试审查界面 | PHASE1-SPECS T-303, BLUEPRINT §2-Step9 | TestFeedback.tsx | 延后 |
| T-304 | 发布检查清单 | PHASE1-SPECS T-304 | release-check.ts | 完成 |
| T-305 | 项目归档 | PHASE1-SPECS T-305 | archiver.ts | 完成 |
| T-401 | 角色模型 | PHASE1-SPECS T-401 | roles.ts | 延后 |
| T-402 | 项目看板前端 | PHASE1-SPECS T-402 | ProjectDashboard.tsx | 延后 |
| T-403 | 开发工作台 | PHASE1-SPECS T-403 | DeveloperWorkspace.tsx | 延后 |
| T-501 | 全流程联调 | PHASE1-SPECS T-501 | (全流程) | 延后 |
| T-502 | Bug 修复 | PHASE1-SPECS T-502 | (多处) | 延后 |
| T-503 | 测试套件保持 | PHASE1-SPECS T-503 | __tests__/ | 持续 |
| GAP-01 | AgentLoop 变体不足 | BLUEPRINT §3-1 | (需新建) agent-loop-base.ts | Phase 2 |
| GAP-02 | 状态机拓扑 | BLUEPRINT §3-2 | pipeline-state-machine.ts(改造) | Phase 2 |
| GAP-03 | 进化引擎接入 | BLUEPRINT §3-3 | (多文件) | Phase 3 |
| GAP-04 | DevFixLoop | BLUEPRINT §3-1 | (需新建) dev-fix-loop.ts | Phase 2 |
| GAP-05 | TestGenLoop | BLUEPRINT §3-1 | (需新建) test-gen-loop.ts | Phase 2 |
| GAP-06 | L1 FixExecutor | BLUEPRINT §2-Step7 | fix-engine.ts(扩展) | Phase 2 |
| GAP-07 | PM UAT 串联 | BLUEPRINT §2-Step9 | TestFeedback.tsx(扩展) | Phase 2 |
| GAP-08 | PRDQualityCheckV2 | BLUEPRINT §2-Step2 | prd-quality-check.ts(扩展) | Phase 2 |
| GAP-09 | CompileLearningDB | development-path §2(进化二) | (需新建) | Phase 2 |
| GAP-10 | ComponentMiner | development-path §2(进化一) | (需新建) | Phase 3 |
| GAP-11 | PromptInjectionEngine | development-path §2(进化二) | code-generation-loop.ts(扩展) | Phase 2 |
| GAP-12 | 知识库增量更新 | development-path §2(进化三) | knowledge-base.ts(扩展) | Phase 3 |
| GAP-13 | 多形态输出 | IMPLEMENTATION-PLAN §3 | skeleton-generator.ts(扩展) | Phase 3 |
| GAP-14 | 工单系统 | IMPLEMENTATION-PLAN §3 | (需新建) | Phase 3 |
| GAP-15 | 架构自省 | BLUEPRINT §4-Phase4 | introspection-engine.ts(接入) | Phase 4 |
| GAP-16 | 多租户 | IMPLEMENTATION-PLAN §3 | (需新建) | Phase 4 |
| GAP-17 | 多项目管理 | IMPLEMENTATION-PLAN §3 | (需新建) | Phase 4 |
| GAP-18 | 健康度看板 | IMPLEMENTATION-PLAN §3 | (需新建) | Phase 4 |

---

## 四、文档一览

| 文档 | 主题 | 篇幅 | 核心读者 |
|------|------|------|---------|
| ANFSF-BLUEPRINT.md | 宏观蓝图(13步/3缺口/路线图) | ~12KB | 架构师/PM |
| ANFSF-DEVELOPMENT-PATH.md | 执行路径(锁定决策/进化/序列) | ~11KB | 所有开发者 |
| IMPLEMENTATION-PLAN.md | Phase 1 25项任务完整记录 | ~15KB | PM/开发者 |
| PHASE1-TASK-SPECS.md | 每项任务的详细规格 | ~30KB | 实施者 |
| TECHNICAL-DESIGN.md | 架构设计(状态机/Agent/LLM) | ~20KB | 架构师/后端 |
| ARCHITECTURE.md | 系统架构图/部署图/组件表 | ~15KB | 入门阅读 |
| API-SPEC.md | REST API 端点定义 | ~5KB | 前端/后端 |
| DATABASE-SCHEMA.md | 11张表 DDL | ~5KB | 后端 |
| 17层理论分析.md | 逐层详细设计 | ~25KB | 架构师(备查) |
| 17层 vs 实际.md | 理论/实际对比表 | ~10KB | 架构师(备查) |
| audit-report.md | ANFSF vs Claude Code + P0/P1 问题 | ~15KB | 架构师(备查) |
| product-discussion.md | 产品方向讨论(55条共识) | ~20KB | PM/决策者 |
| INTEGRATION-PLAN.md | 外部系统集成计划 | ~5KB | 后端 |
| INTERLAYER-PROTOCOL.md | 层间通信协议 | ~5KB | 架构师 |
| RUNBOOK.md | 部署/监控/备份/故障处理 | ~8KB | DevOps |
| UI-REFACTOR-PLAN.md | 前端重构计划 | ~5KB | 前端 |
| DEVELOPMENT-STANDARDS.md | 编码规范 | ~3KB | 所有开发者 |



