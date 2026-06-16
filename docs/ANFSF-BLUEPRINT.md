# ANFSF 完整蓝图 — 架构现状·流程映射·缺口分析·演进路径

> **版本**: 1.1 | **日期**: 2026-06-16 | **状态**: 基线文档（已更新运行时状态标注）
> ⚠️ **重要**: 本文档描述的"完成"状态指"代码已编写+测试通过"，不代表"已接入运行时"。
> 运行时接入率约 35%，详见 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md)。
> 关联文档: [产品蓝图](product-discussion-2026-05-28.md) | [技术架构](TECHNICAL-DESIGN.md) | [实施计划](IMPLEMENTATION-PLAN.md) | [**真实状态审计**](ANFSF-REFACTOR-FIX.md)

---

## 一、总览

ANFSF 的最终目标是实现 17 层理论架构的全部能力，从 PRD 到可部署项目的全自动闭环，并在此过程中实现技术层面和架构层面的持续自我进化。

当前（Phase 1, v0.8.5）实现了约 45% 的端到端流程覆盖，核心缺口在于：**Agent Loop 变体不足**、**状态机拓扑为线性而非循环**、**进化引擎未接入流水线**。

本文档固化三件事：

1. **完整 13 步工作流** — 涵盖 PM、前后端开发者、ANFSF 系统三个角色的交互
2. **当前架构缺口** — 逐项标注完成后分与缺失件
3. **演进路径** — 从 Phase 1 到 Phase 4 的分阶段实施序列

---

## 二、13 步端到端工作流

### Step 1: PM 提供 PRD 文档

| 维度 | 当前状态 | 备注 |
|------|---------|------|
| 文本 PRD 输入 | ✅ 已实现 | PRDForm 组件 |
| 附件上传（图片/CSV/PDF） | ✅ 已实现 | FileUpload + AttachmentProcessor |
| 多文件拖拽 | ✅ 已实现 | MIME 校验 + Magic Bytes 嗅探 |
| 输入安全（注入检测） | ✅ 已实现 | InputGovernance |

### Step 2: ANFSF 指出优化建议

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| PRD 质量评分（4 维度） | ✅ 已实现 | T-101，覆盖完整性/一致性/可量化/可验证 |
| 结构化改进建议 | ❌ 缺失 | 当前只输出分数区间（绿/黄/红），不出具体的改进路径 |
| 对话式引导模式 | ⚠️ 部分实现 | <40 分进引导模式已定义接口，多轮对话未对接前端 |

### Step 3: PM 确定需求并提交最终 PRD

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| 逐条确认/修改/拒绝 | ✅ 已实现 | RequirementReview 组件 |
| 低置信度红色高亮 | ✅ 已实现 | |
| 锁死需求（stage1_locked） | ✅ 已实现 | PipelineStateMachine 状态 |
| 基于建议的大幅改写 PRD | ❌ 缺失 | 无迭代式对话 |

### Step 4: ANFSF 结构化 PRD -> 测试 + 任务

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| PRD -> 结构化需求 | ✅ 已实现 | L1 PRDParser |
| 置信度标注 | ✅ 已实现 | T-102 ConfidenceAnnotator |
| 骨架代码生成（Agent Loop） | ✅ 已实现 | CodeGenerationLoop |
| TASK.md 任务分解 | ✅ 已实现 | T-206 TaskGenerator |
| 生成测试用例 + 测试脚本 | ❌ 缺失 | Phase 2，需 TestGenLoop |

### Step 5: 开发者执行任务并补充代码

| 维度 | 当前状态 | 备注 |
|------|---------|------|
| 开发者工作台 | ✅ 已实现 | DeveloperWorkspace 组件 |
| 任务详情（文件/行号/优先级） | ✅ 已实现 | TASK.md |
| ANFSF 参与代码填充 | 设计上为零 | Stage 2 黑盒，等待 Gitea push |

### Step 6: ANFSF 运行自动化测试

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| CommitVerifier compile check | ✅ 已实现 | T-204 |
| ContractWatcher API 变更检测 | ✅ 已实现 | T-203 |
| FaultReporter 可读报告 | ✅ 已实现 | T-205 |
| 自动化 E2E 测试 | ❌ 缺失 | Phase 2 |

### Step 7: 开发者修复 -> 提交

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| FixEngine 分类矩阵 | ✅ 已实现 | T-301 |
| L1 自动修复 | ⚠️ 分类已实现 | 没有 executor |
| L2 建议修复 | ✅ 已实现 | suggestedDiff |
| L3 仅定位 | ✅ 已实现 | located_only |

### Step 8: ANFSF 发布测试版本

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| 三层发布门禁 | ✅ 已实现 | T-304 ReleaseCheck |
| CanaryDeployer + HealthChecker | ✅ 已实现 | |
| 测试版本状态 | ❌ 缺失 | 状态机中无对应状态 |
| 多环境管理 | ❌ 缺失 | |

### Step 9: PM 反馈 UI/UX

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| TestFeedback 组件 | ✅ 已实现 | |
| 与状态机串联 | ⏸ 延后 | T-303 延至 T-501 |
| 反馈 -> 修复循环自动触发 | ❌ 缺失 | |

### Step 10-11: 修复 -> 发布演示版本

同 Step 7 和 Step 8，增加演示版本状态。

### Step 12: 项目归档

| 维度 | 当前状态 | 缺口 |
|------|---------|------|
| 项目归档 | ✅ 已实现 | T-305 |
| 代码标注入库 | ✅ 已实现 | CodeAnnotator |
| 自动提取组件 | ❌ 缺失 | Phase 2 |
| 知识库增量更新 | ❌ 缺失 | Phase 3 |

### Step 13: 自进化

| 维度 | 当前状态 | 模块位置 |
|------|---------|---------|
| 7 个进化模块 | ✅ 存在，未接入 Pipeline | core/evolution/*, harness/* |
| Pipeline 接入 | ❌ 缺失 | |
| 架构层面进化 | ❌ 缺失 | |

---

## 三、三个核心架构缺口

### 缺口一：Agent Loop 变体不足

**问题**：当前只有一个 CodeGenerationLoop 类，流程需要三种独立的 Agent Loop 变体。

**根因**：CodeGenerationLoop 的 generate/verify/fix 硬编码为 LLM生成 -> tsc验证 -> LLM修复。没有抽象出通用接口。

**修复**：提取 AgentLoop<TInput, TOutput, TError> 抽象基类。

- **CodeGenLoop**：骨架生成循环（现有，改为继承）。generate: spec->code; verify: tsc --noEmit; fix: LLM修复
- **DevFixLoop**：提交验证循环（新增）。generate: wait git push; verify: compile->contract->E2E; fix: L1/L2/L3
- **TestGenLoop**：测试生成循环（新增 Phase 2）。generate: 需求规格->Playwright/Jest; verify: dry-run; fix: 修正断言

| 子任务 | 工期 | 依赖 |
|-------|------|------|
| AgentLoop 抽象基类 | 2d | T-002 |
| CodeGenLoop 重构 | 1d | 上一步 |
| DevFixLoop | 5d | 基类 + T-204/T-301 |
| TestGenLoop | 5d | 基类 + Playwright |

---

### 缺口二：状态机拓扑从线性变为嵌套循环

**问题**：当前 TRANSITION_TABLE 是线性顺序，Stage 3-4 不允许反复 re-entry。

**根因**：状态机设计假设每阶段只进入一次，未考虑测试失败/UAT 反馈导致的回退。

**需要拓扑**：

`
Stage 3: Verify Loop
  stage3_verifying -> stage3_verifying / stage3_passed / stage2_dev / failed
  stage2_dev -> stage3_verifying（收到新 push 后重新进入）

Stage 4: Test + Fix 双循环
  stage4_testing -> stage4_fixing / stage4_confirmed / stage2_dev / failed
  stage4_fixing -> stage4_testing / stage4_confirmed / stage2_dev / failed

Stage 4 新增版本状态:
  stage4_released_to_test / stage4_uat / stage4_uat_fixing

Stage 5: 新增进化触发
  stage5_done -> stage5_evolving
`

| 子任务 | 工期 | 依赖 |
|-------|------|------|
| 重构 TRANSITION_TABLE | 2d | T-001 |
| 版本状态新增 | 3d | T-304 |
| Checkpoint 支持 re-entry | 2d | T-003 |
| 前端对接 UAT 循环 | 4d | T-303 |

---

### 缺口三：进化引擎未接入 Pipeline

**问题**：L16-L17 的 7 个进化模块全部存在，但没有一个被 Pipeline 调用。

**涉及模块**：offline-optimizer.ts, freeze-manager.ts, introspection-engine.ts, framework.ts, rollback-manager.ts, evolution-harness.ts, ab-test-runner.ts

**根因**：Phase 1 聚焦于跑通闭环，进化被设计为离线并行。

**修复**：

```typescript
pipeline.onEnter('stage5_done', async (projectId) => {
  await evolution.optimize();
  // -> 更新 BackendArchitect 默认参数
  // -> 更新 TokenBudget 预算基线
  // -> 调整 FixEngine.FIX_MATRIX 等级映射
  // -> 积累数据足够时触发架构自省
});
```

| 子任务 | 工期 | 依赖 |
|-------|------|------|
| 技术层 Pipeline 接入 | 5d | 全部进化模块 |
| KPI 数据采集点 | 3d | TokenBudget+FixEngine+CommitVerifier |
| 架构自省触发 | 5d | IntrospectionEngine+项目数据 |
| 知识回填 | 5d | Archiver+GraphRAG |

---

## 四、演进路线图

### 当前 (Phase 1)

Step1 ⬤ Step2 ◐ Step3 ⬤ Step4 ◐ Step5 ○ Step6 ◐ Step7 ◐ Step8 ◐ Step9 ○ Step10 ○ Step11 ○ Step12 ◐ Step13 ○
⬤=完整 ◐=部分 ○=缺失

### Phase 2（4-6 周）：完成闭环 + 测试自动化

目标：消除所有缺失，在一个项目上跑通 13 步。

- Step2 -> ⬤ PRDQualityCheckV2：结构化建议 + 引导对话
- Step4 -> ⬤ TestGenLoop
- Step6 -> ⬤ E2E 测试接入 CommitVerifier
- Step7 -> ⬤ FixExecutor：L1 自动修改+commit
- Step8 -> ⬤ 版本状态新增
- Step9-10 -> ⬤ PM UAT 串联
- Step12 -> ◐ 自动提取组件入库

关键交付：| 缺口一 | 缺口二 | L1 FixExecutor | PM UAT |

### Phase 3（4-6 周）：多形态 + 知识积累

目标：系统开始学习，第二个项目比第一个快。

- Step12 -> ⬤ 知识库增量更新
- Step13 -> ⬤ 进化引擎技术层接入 | 缺口三-1
- 新增：多形态输出 / 自动 E2E / 外部反馈闭环 / 工单系统 / 代码复用推荐 / 参数级自校准

### Phase 4（持续）：企业级 + 架构自进化

目标：17 层理论能力完整落地。

- Step13 -> ⬤ 架构层面进化 | 缺口三-2
- 新增：多租户 / 私有化部署 / 健康度看板 / 架构自省->结构自调整

---

## 五、实施约束与原则

### 5.1 不破的底线

1. **Agent Loop 不生成业务逻辑** — 骨架永远是骨架，TODO 永远留给人类。
2. **FixEngine 三级边界不可后退** — generated/modified/new x business_logic = L3。
3. **Stage 2 保持黑盒** — 不干预开发者本地 IDE。
4. **检查点覆盖所有阶段** — 包括测试版本和 UAT 循环。

### 5.2 优先顺序（按风险）

Phase2: AgentLoop抽象+DevFixLoop [最高] -> TRANSITION_TABLE重构 [次高] -> PM UAT [中]
Phase3: 进化引擎接入 [高] -> 知识库增量更新 [中]
Phase4: 架构自省+自改造 [最高]

### 5.3 保持现有代码原则

- 不重写现有模块
- 只在现有代码上加层和重构接口（AgentLoop 抽象基类）
- 状态机改造只改 TRANSITION_TABLE 映射表
- 进化引擎通过 onEnter/onLeave 回调接入

---

## 附录A：缺口索引

| 编号 | 名称 | 类型 | Phase | 优先级 |
|------|------|------|-------|--------|
| GAP-01 | PRDQualityCheck 结构化建议 | 功能增量 | 2 | P1 |
| GAP-02 | PRD 优化对话引导模式 | 功能增量 | 2 | P2 |
| GAP-03 | AgentLoop 抽象基类 | 架构重构 | 2 | P0 |
| GAP-04 | DevFixLoop | 新增模块 | 2 | P0 |
| GAP-05 | TestGenLoop | 新增模块 | 2 | P1 |
| GAP-06 | L1 FixExecutor 实现 | 功能增量 | 2 | P1 |
| GAP-07 | TRANSITION_TABLE 嵌套循环 | 架构重构 | 2 | P0 |
| GAP-08 | 版本发布状态新增 | 状态扩展 | 2 | P1 |
| GAP-09 | PM UAT 流程串联 | 全流程联调 | 2 | P1 |
| GAP-10 | 自动化 E2E 生成 Playwright | 新增模块 | 2 | P2 |
| GAP-11 | 进化引擎 Pipeline 接入技术层 | 架构集成 | 3 | P0 |
| GAP-12 | 知识库增量更新 | 功能增量 | 3 | P1 |
| GAP-13 | 多形态输出 H5/小程序 | 能力扩展 | 3 | P2 |
| GAP-14 | 工单系统对接 | 能力扩展 | 3 | P3 |
| GAP-15 | 架构自省 + 自改造 | 高级能力 | 4 | P0 |
| GAP-16 | 多租户隔离 | 企业能力 | 4 | P1 |
| GAP-17 | 多项目并行管理 | 能力扩展 | 4 | P2 |
| GAP-18 | 组织级健康度看板 | 能力扩展 | 4 | P3 |

---

## 附录B：核心架构对比一览

| 维度 | 17 层理论 | 当前 (Phase 1) | 目标 (Phase 4) |
|------|----------|----------------|----------------|
| 架构范式 | 前馈垂直堆栈 | 水平循环 + 线性状态机 | 多层嵌套循环 + 自进化 |
| Agent Loop | 无此概念 | 1 种 (CodeGeneration) | 3 种 + 抽象基类 |
| 状态拓扑 | DAG (L1...L17) | 线性 15 状态 | 嵌套循环 (verify/test) |
| 进化方式 | 每层自演进 | 离线模块不接入 | onEnter(stage5_done) |
| 人工参与 | 完全自动 | PM确认+锁死 | PM确认+UAT+修复循环 |
| 业务逻辑 | 系统生成 | 开发者手动填写 | 开发者手动填写（永不改变） |
| 可恢复性 | 无 | 检查点 | 检查点+嵌套循环恢复 |
| 测试生成 | 无 | Phase 2 计划 | TestGenLoop |
| 多环境管理 | 无 | 无 | dev/test/staging/demo |
| 经济约束 | 无 | Token 预算 | 预算 + 权重自校准 |
| 架构自省 | 无 | 无 | 瓶颈检测 + 结构自调整 |
