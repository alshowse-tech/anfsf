# ANFSF 开发路径图谱（Pre-Development Path）
> **版本**: 1.1 | **日期**: 2026-06-16 | **类型**: 执行参考（会话前必读）
> ⚠️ **重要更新**: 附录 B 的代码审查待修复项已移入 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md)。
> 本文档的"已确认决策"和"必须保留模块"仍然有效，但状态描述需以 REFACTOR-FIX 为准。
> 本文档只有**新增条目**的权力，没有**删除已锁定条目**的权力。

---

## 0. 使用方式

每次开始 ANFSF 开发前，先读本文档。它告诉后来者三件事：
1. 我们已经确认了什么（已锁定的结论，不要推翻重来）
2. 我们现在在哪（实现状态基准线）
3. 接下来往哪走（三步走路线）

---

## 1. 已确认的架构决策（锁定，不可推翻）

### 1.1 Agent Loop 的性质

- ANFSF 的 Agent Loop (CodeGenerationLoop) 与 Claude Code 的 Agent Loop (spawn_agent) 是**不同抽象层次**的工具，不是替代关系。
- Claude Code 可以成为 ANFSF 的一个 LLM Provider 后端或外部 Agent 节点。
- CodeGenerationLoop 是 ANFSF 平台层下的能力提供者，其 generate/verify/fix 模式需要抽象为通用基类。

### 1.2 骨架生成定位

- **ANFSF 不生成业务逻辑。** 所有骨架代码以 // TODO: implement 结尾。业务逻辑始终由人类开发者手动填写。
- Stage 2 (dev) 保持为黑盒——ANFSF 不干预开发者本地 IDE。
- 这条底线永不后退。系统的价值在于结构正确性和契约一致性，不在于猜测业务语义。

### 1.3 完整 13 步工作流（已确认）

Step 1: PM 提供 PRD 文档（文本+附件）— Stage 0
Step 2: ANFSF 指出优化建议（分数+结构化建议路径）— Stage 0
Step 3: PM 确定需求，提交最终 PRD — Stage 1
Step 4: ANFSF 结构化 PRD + 生成测试脚本 + 分解任务 — Stage 1
Step 5: 前后端开发者执行任务并补充代码（手动）— Stage 2（黑盒）
Step 6: ANFSF 运行自动化测试并反馈结果 — Stage 3
Step 7: 前后端修复，提交修复代码 — Stage 3
Step 8: ANFSF 验证通过后发布测试版本 — Stage 3→4
Step 9: PM 反馈 UI/UX 测试结果 — Stage 4
Step 10: 前端修复，提交修复代码 — Stage 4
Step 11: ANFSF 验证通过后发布客户演示版本 — Stage 5
Step 12: 项目归档与知识回填 — Stage 5
Step 13: 自进化（技术层面 + 组件沉淀 + 经验提取）— 跨阶段

### 1.4 Three Core Gaps（核心缺口已固化）

| 编号 | 名称 | 类型 | 说明 |
|------|------|------|------|
| GAP-01 | AgentLoop 变体不足 | 架构重构 | 只有 CodeGenerationLoop，需抽象为基类 + 派生 DevFixLoop/TestGenLoop |
| GAP-02 | 状态机拓扑为线性 | 架构重构 | TRANSITION_TABLE 需改为嵌套循环支持 verify/test/UAT 反复进入 |
| GAP-03 | 进化引擎未接入 Pipeline | 架构集成 | 7 个进化模块独立存在，未被 stage5_done 触发 |

### 1.5 FixEngine 的三级边界（锁定）

| 代码来源 | style/spelling | type_mismatch | interface_change | business_logic |
|----------|---------------|---------------|-----------------|----------------|
| generated | L1 | L1 | L2 | L1 |
| modified | L1 | L2 | L2 | L3 |
| new | L1 | L2 | L3 | L3 |

L1 = 系统自动 commit 修复。L2 = 系统生成 diff 建议，开发者确认。L3 = 系统报告位置，开发者自行修复。

---

## 2. 三种进化的准确定义与实现路径

### 进化一：前端组件沉淀

**定义**：从开发者在 [modified] 文件中写的 UI 代码中自动提取组件模式（props 签名、state 管理、外部依赖、使用示例），入库供下次骨架生成时复用。

**当前状态**：CodeAnnotator (T-202) 能区分 [generated]/[modified]/[new]，但无后续组件提取。

**实现路径**：

`
ComponentMiner（需新建，~5d）
  scan(projectPath) -> 遍历 [modified] 文件列表
  extractUIPatterns(files) -> AST 解析组件 props/state/deps
  matchAgainstLibrary(component) -> 去重
  store(component) -> knowledge-base + graphrag + hybrid-retriever

后续：SkeletonGenerator 生成 prompt 时注入
  "Historical components similar to this project: {retrievedList}"
`

**接入点**：Archiver (T-305) 归档完成后触发。

**17 层 skills/harness 适用性**：
- ✅ hybrid-retriever-skill.ts — 组件检索层，直接可用
- ✅ knowledge-base.ts + graphrag.ts — 存储+关联层，直接可用
- ⚠️ memory-consolidation-skill.ts — 记忆管理的模式可复用，但数据模型要从"LLM 对话记忆"改为"代码组件模式"
- ❌ context-compressor-skill.ts — 不适用
- ❌ sandbox-executor.ts — 不适用

---

### 进化二：编译学习与优化

**定义**：积累每次 CodeGenerationLoop 运行中产生的编译错误模式与修复方式的配对数据，跨项目聚合，在后续生成 prompt 中注入"常见错误 + 推荐修复"，让首次生成通过率逐步提升。

**当前状态**：
- VerificationRunner 捕获 tsc 错误 ✅
- FixEngine 对错误分类 ✅
- CodeGenerationLoop 记录每轮 token 和错误数 ✅
- 但三者之间的数据没有持久化，没有跨项目分析 ❌

**实现路径**：

`
CompileLearningDB（新建数据库表 + query 方法，~2d）
  表字段: errorPattern / sourceFile / fixApplied / fixRound / projectType / outcome
  
PromptInjectionEngine（改造 CodeGenerationLoop prompt builder，~1d）
  向 buildSkeletonPrompt() 注入:
  "Common compilation errors in past  projects: {top5Patterns}"
`

**接入点**：CodeGenerationLoop.verify() 之后记录结果；CodeGenerationLoop.generate() 之前注入历史。

**17 层 skills/harness 适用性**：
- ✅ compile-validator.ts — 验证器本身，保持
- ✅ code-quality-guard-skill.ts — 可作为辅助维度
- ⚠️ ab-test-runner.ts — 统计学方法可用，对比新旧两版首次通过率
- ❌ sandbox-executor.ts — 不适用

---

### 进化三：项目经验蒸馏

**定义**：项目完成后，从完整生命周期中提炼可复用经验（组件模式、架构模式、常见问题模式），入库回填，让后续项目越来越快。

**当前状态**：Archiver 归档原始数据 ✅，但缺"蒸馏"步骤 ❌。

**实现路径**：

`
在 stage5_done 的 onEnter 中执行（3d）：
  retrospective-engine.ts（已有）-> 项目回顾分析
    ├── lessons extraction（从 fix records + test results 提炼教训）
    └── metrics aggregation（归档 KPI 数据）
  
  输出 -> knowledge-base.ts 入库
  输出 -> graphrag.ts 更新关联
`

**接入点**：PipelineStateMachine.onEnter('stage5_done')注册回调。

**17 层 skills/harness 适用性**：
- ✅ retrospective-engine.ts — 直接可用，它就做项目回顾分析
- ✅ evolution-harness.ts — 数据飞轮模式可直接复用
- ✅ kpi-engine.ts — 提供 KPI 数据输入
- ✅ base.ts (Skill 基类) — 可以定义统一的提取/存储/检索接口

---

## 3. 实现序列与依赖关系

`
Phase 2（4-6 周）
  ├── [GAP-01] AgentLoop 抽象基类 + DevFixLoop          — 2d+5d  P0
  │     └── TestGenLoop (Playwright)                     — 5d     P2
  ├── [GAP-02] TRANSITION_TABLE 嵌套循环改造              — 2d     P0
  │     ├── 版本发布状态新增 (test/demo)                   — 3d     P1
  │     ├── Checkpoint 支持 stage re-entry               — 2d     P1
  │     └── PM UAT 流程串联 (T-303 恢复)                  — 4d     P1
  └── [GAP-06] L1 FixExecutor 实现                       — 3d     P1
       ├── CompileLearningDB + PromptInjectionEngine     — 3d     P2
       └── ComponentMiner (基础版)                       — 5d     P2

Phase 3（4-6 周）
  ├── [GAP-03-1] 进化引擎技术层接入 Pipeline              — 5d     P0
  │     ├── KPI 数据采集点埋入                            — 3d     P1
  │     └── retrospective-engine 接入 stage5_done          — 3d     P1
  ├── ComponentMiner (完整版) + 知识库增量更新              — 5d     P1
  ├── 项目间代码复用推荐                                   — 4d     P2
  ├── 多形态输出 (H5/小程序)                               — 5d     P2
  └── 工单系统对接                                        — 5d     P3

Phase 4（持续）
  ├── [GAP-03-2] 架构自省 + 自改造                        — 10d    P0
  ├── 多租户隔离                                          — 8d     P1
  ├── 多项目并行管理                                       — 5d     P2
  └── IntrospectionEngine 触发的结构性进化                 — 10d    P2
`

---

## 4. 必须保留的现有模块（不改、不重写、不删除）

| 模块 | 理由 |
|------|------|
| src/agents/code-generation-loop.ts | 只加抽象基类，不改内部实现 |
| src/pipeline/pipeline-state-machine.ts | 只改 TRANSITION_TABLE 映射表，不改核心类 |
| src/pipeline/checkpoint.ts | 只加 re-entry 支持，不改接口 |
| src/skills/* | 作为能力提供方保留，不改造 |
| src/core/* | 作为验证工具集保留，不改造 |
| src/server/* | 渐进式加路由，不改旧路由 |
| src/integrations/llm-client.ts | 保持多 Provider 架构 |
| web/ src/components/* | 加新页面，不改旧组件 |

---

## 5. 会话连续性协议

### 5.1 每次开发前必读

开始 ANFSF 代码工作前，先读本文档的以下部分：
1. **第 1 节**（已确认的架构决策）— 防止推翻已锁定的结论
2. **第 4 节**（必须保留的模块）— 防止误改不该改的代码
3. **第 3 节**（实现序列）— 知道当前应该做什么、下一步做什么

### 5.2 更新规则

- 本文档只有**新增条目**的权力，没有**删除已锁定条目**的权力
- 新增条目必须标注日期和决策人
- 争议性决策在条目后标注【争议，YYYY-MM-DD 待定】
- 已实现条目从"待做"移至"已完成"区

### 5.3 数据源

- .anfsf/knowledge.json — 流水线运行的回顾数据（原始存储）
- docs/ANFSF-BLUEPRINT.md — 完整架构蓝图（宏观视图）
- docs/ANFSF-DEVELOPMENT-PATH.md — 本文档，执行路径（微观视图）

---

## 附录：本文档的生成背景

本文档由 2026-06-10 的多轮架构讨论固化而来，讨论历程：

| 轮次 | 主题 | 产出 |
|------|------|------|
| 1 | ANFSF 架构全景分析 | 完整架构扫描与 Stage 7 进展 |
| 2 | ANFSF Agent Loop vs Claude Code Agent Loop | 不同抽象层的互补关系，非替代 |
| 3 | Agent Loop vs 17 层理论架构 | 范式转换：前馈堆栈 -> 水平迭代回路 |
| 4 | 骨架生成定位纠正与 13 步工作流 | 确认 ANFSF 不生成业务逻辑，Stage 2 黑盒 |
| 5 | 三种进化的准确定义 | 组件沉淀 / 编译学习 / 项目经验（非 L16 自省） |
| 6 | skills/harness 适用性评估 | 三档分类（直接可用/改造可用/需新建） |
| 7 | 开发路径图谱固化（本文档） | 锁定决策 + 实现序列 + 会话连续性协议 |
| 8 | Phase 1 核心开发 + 代码审查 | 25 项任务完成，2 轮审查发现 14 个问题（6 已修复） |
| 9 | Agent Loop 重构 | 解析层换回 AINativePRDParser（deepseek-chat），合并修复逻辑（mergeFixedFiles） |

---

## 附录B：Phase 1 最新状态快照（2026-06-09）

### 测试基线

```
Test Suites: 4 failed, 105 passed, 109 total (96.3%)
Tests: 10 failed, 1528 passed, 1538 total (99.3%)
4 个失败 = 已知环境依赖问题（compile-validator/auth/rate-limit/server）
```

### 代码审查待修复项（按严重度排序）

| # | 文件 | 问题 | 严重度 | 状态 |
|---|------|------|--------|------|
| 1 | gitea-client.ts:122 | pushFile 不支持更新已存在文件（缺 SHA） | 高 | 待修 |
| 2 | synthesize.ts:253 | success \|\| files>=5 失败仍标记成功 | 高 | ✅ 已修 |
| 3 | llm-client.ts:141 | baseUrl 空字符串穿透 ?? 运算符 | 高 | ✅ 已修 |
| 4 | token-budget.ts:147 | 零预算导致 Infinity 静默阻塞 | 高 | ✅ 已修 |
| 5 | code-generation-loop.ts:192 | model 死代码三元表达式 | 低 | ✅ 已修 |
| 6 | pipeline-state-machine.ts:201 | errorHandler 抛异常吞 PipelineError | 中 | 待修 |
| 7 | pipeline-state-machine.ts:184 | leave 回调副作用在 enter 失败时未回滚 | 中 | 待修 |
| 8 | PipelineProgress.tsx:65 | onComplete 在 deps 中触发重复回调 | 中 | 待修 |
| 9 | llm-client.ts:199 | 超时和 4xx 错误不触发断路器 | 中 | 待修 |
| 10 | code-generation-loop.ts:224 | 循环条件允许多余修复调用 | 中 | 待修 |
| 11 | pipeline.ts:7 | OUTPUT_BASE 在 import 时捕获 | 低 | 待修 |
| 12 | start.bat | LLM_BASE_URL/ANFSF_MODEL 尾部空格 | 高 | ✅ 已修 |
| 13 | synthesize.ts:204 | PRD 中文标点替换后分割失效 | 高 | ✅ 已修 |

### 模块清单（新增/变更）

| 模块 | 文件 | 状态 |
|------|------|------|
| 五阶段状态机 | pipeline-state-machine.ts (15 状态) | ✅ |
| 检查点/恢复 | checkpoint.ts + InMemoryCheckpointStore | ✅ |
| Token 预算 | token-budget.ts (70%/90%预警) | ✅ |
| Agent Loop | code-generation-loop.ts (3 轮+合并修复) | ✅ |
| PRD 质量预检 | prd-quality-check.ts (4 维评分) | ✅ |
| 置信度标注 | confidence-annotator.ts (中文适配) | ✅ |
| Gitea 客户端 | gitea-client.ts (API v1) | ✅ |
| Webhook 路由 | webhook.ts (dedup+幂等) | ✅ |
| 代码标注 | code-annotator.ts (generated/modified/new) | ✅ |
| 提交验证 | commit-verification.ts (编译+契约) | ✅ |
| 故障报告 | fault-reporter.ts (文件+行号+建议) | ✅ |
| 任务生成 | task-generator.ts (TASK.md+优先级) | ✅ |
| 修复引擎 | fix-engine.ts (L1/L2/L3 矩阵) | ✅ |
| 回归测试 | regression-runner.ts (退化检测) | ✅ |
| 发布检查 | release-check.ts (三层门禁) | ✅ |
| 项目归档 | archiver.ts (度量+组件候选) | ✅ |
| 角色管理 | roles.ts (PM/FE/BE/QA/DevOps) | ✅ |
| PipelineProgress | 重写为 3 步骤+指标面板 | ✅ |
| PRDForm | 实时质量评分反馈 | ✅ |
| App.tsx | 导航精简 5 项+齿轮菜单 | ✅ |
