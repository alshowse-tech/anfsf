# ANFSF Phase 1 任务详细规格

> **依赖文档**: [技术架构设计](TECHNICAL-DESIGN.md) | **Phase 1 周期**: 10-14 周（1 人） / 6-8 周（2-3 人）

---

## 任务索引

| 编号 | 任务 | 所属组 | 工期 | 依赖 |
|------|------|--------|------|------|
| T-001 | Pipeline 状态机重构 | 地基组 | 4d | 无 |
| T-002 | Agent 循环实现 | 地基组 | 5d | 无 |
| T-003 | 检查点与恢复机制 | 地基组 | 3d | T-001 |
| T-004 | Token 预算与成本追踪 | 地基组 | 3d | 无 |
| T-101 | PRD 质量预检 | 阶段一组 | 4d | T-001, T-002 | ✅ |
| T-102 | 需求理解置信度标注 | 阶段一组 | 3d | T-101 | ✅ |
| T-103 | PM 需求确认界面 | 阶段一组 | 5d | T-102 | ✅ |
| T-104 | Agent 循环接入骨架生成 | 阶段一组 | 4d | T-002 | ✅ |
| T-105 | 部署形态确认 | 阶段一组 | 1d | T-103 | ✅ |
| T-201 | Gitea Webhook 监听器 | 阶段二/三组 | 4d | T-001 | ✅ |
| T-202 | 代码变动标注引擎 | 阶段二/三组 | 5d | T-201 | ✅ |
| T-203 | 契约检查自动触发器 | 阶段二/三组 | 3d | T-202 | ✅ |
| T-204 | 提交即触发验证流水线 | 阶段二/三组 | 5d | T-203 | ✅ |
| T-205 | 故障报告生成器 | 阶段二/三组 | 3d | T-204 | ✅ |
| T-206 | 开发任务包生成器 | 阶段二/三组 | 3d | T-104 | ✅ |
| T-301 | L1/L2/L3 分级修复引擎 | 阶段四/五组 | 5d | T-204 | ✅ |
| T-302 | 回归测试自动触发器 | 阶段四/五组 | 3d | T-301 | ✅ |
| T-303 | PM 测试审查界面 | 阶段四/五组 | 4d | T-301 | ⏸ 延至 T-501 |
| T-304 | 发布检查清单 | 阶段四/五组 | 4d | T-302 | ✅ |
| T-305 | 项目归档基础版 | 阶段四/五组 | 3d | T-304 | ✅ |
| T-401 | 角色模型实现 | 权限组 | 4d | T-001 |
| T-402 | 项目看板前端 | 前端组 | 5d | T-103 |
| T-403 | 开发个人工作台前端 | 前端组 | 4d | T-206 |
| T-501 | 全流程联调测试 | 联调组 | 5d | 全部 |
| T-502 | Bug 修复与边缘场景 | 联调组 | 3d | T-501 |
| T-503 | 现有测试套件保持 | 持续 | - | 全程 |

---

## 地基组详细规格

### T-001：Pipeline 状态机重构

**目标**：将 `product-pipeline.ts` 从 17 层硬编码串联改为基于状态机的五阶段流水线。

**输入**：
- 现有文件：`src/pipeline/product-pipeline.ts`（约 500 行）
- 参考：`TECHNICAL-DESIGN.md` 第三章"Pipeline 状态机设计"

**输出**：
- 新文件：`src/pipeline/pipeline-state-machine.ts`
- 现有文件修改：`src/pipeline/product-pipeline.ts`（标记 deprecated，逐步迁移调用方）

**实现步骤**：

1. 创建 `ProjectState` 枚举（15 个状态，见技术设计 3.1）
2. 实现 `PipelineStateMachine` 类：
   ```
   class PipelineStateMachine {
     constructor(projectId: string, store: PipelineRunStore)
   
     // 状态查询
     getState(): ProjectState
     canTransition(to: ProjectState): boolean
   
     // 状态转换（内部维护 Transition Table）
     transition(to: ProjectState, metadata?: Record<string, unknown>): void
   
     // 阶段回调
     onEnter(state: ProjectState, callback: () => Promise<void>): void
     onLeave(state: ProjectState, callback: () => Promise<void>): void
   
     // 异常处理
     onError(handler: (error: Error, state: ProjectState) => Promise<void>): void
   }
   ```
3. 定义 `TRANSITION_TABLE`：Map<ProjectState, ProjectState[]>，定义每个状态允许的下一状态
4. 将现有 pipeline 的 5 层（L1/L4/L6/L7/L10）映射为五阶段的 substep：
   - Stage1: [现有 L1 PRD 解析 + L4 Graph IR]
   - Stage2: [开发阶段，无现有映射]
   - Stage3: [现有 L6 架构决策 + L7 UI 合成 + L10 编译验证]
   - Stage4: [新逻辑：分级修复]
   - Stage5: [新逻辑：归档]
5. 写单元测试覆盖所有状态转换路径

**验收标准**：
- [ ] `ProjectState` 枚举包含 15 个状态
- [ ] `transition()` 拒绝非法状态转换（抛异常）
- [ ] `onEnter/onLeave` 回调正常触发
- [ ] `onError` 捕获异常后状态进入 `failed`
- [ ] 从 `failed` 状态可恢复到最近检查点
- [ ] 现有 5 层作为 substep 在新状态机中正常执行
- [ ] 现有测试保持通过

**接口契约**：
```typescript
// 其他模块通过这个接口使用状态机
interface IPipelineStateMachine {
  getState(): ProjectState;
  transition(to: ProjectState): void;
  onEnter(state: ProjectState, callback: () => Promise<void>): void;
}
```

**关联模块**：
- 被 `src/server/routes/synthesize.ts` 调用（创建项目时初始化状态机）
- 被 `src/server/routes/pipeline.ts` 调用（查询项目状态）
- 内部调用 T-003 检查点（状态转换时自动写检查点）

---

### T-002：Agent 循环实现

**目标**：实现"生成→验证→修复"轻量 Agent 循环，替代现有直接 LLM 调用的代码生成方式。

**输入**：
- 现有：`src/integrations/llm-client.ts`（LLM Provider 层）
- 现有：`src/skills/`（编译验证、代码质量、安全审计）
- 参考：`TECHNICAL-DESIGN.md` 第四章"Agent 循环设计"

**输出**：
- 新文件：`src/agents/code-generation-loop.ts`
- 新文件：`src/agents/verification-runner.ts`（验证工具调度器）
- 新文件：`src/agents/__tests__/code-generation-loop.test.ts`

**实现步骤**：

1. 创建 `VerificationRunner` 类：
   ```
   class VerificationRunner {
     constructor(tools: VerificationTool[])
     
     // 运行所有启用的验证工具
     async runAll(codePath: string): Promise<VerificationResult[]>
     
     // 单个工具
     async runSingle(toolName: string, codePath: string): Promise<VerificationResult>
   }
   ```
2. 注册默认验证工具：
   - `tsc-compile`：包装现有 `CompileValidator`
   - `eslint-check`：包装现有 `CodeQualityGuardSkill`
   - `contract-match`：新增，对照 OpenAPI 规范检查接口调用
   - `skeleton-complete`：新增，检查所有应有文件是否生成
3. 实现 `generateCodeLoop()` 核心函数：
   ```
   async function generateCodeLoop(
     spec: RequirementSpec,
     config: AgentLoopConfig = DEFAULT_CONFIG
   ): Promise<AgentLoopResult>
   ```
4. 实现修复 prompt 模板——将验证错误列表转化为 LLM 能理解的修复指令
5. 实现 `annotateCodeSource()`——生成代码后自动添加 `[generated]` 注释标记
6. 写测试：mock LLM 返回带错误的代码，验证 Agent 循环能修复并最终通过

**验收标准**：
- [ ] 输入需求规格 → 生成代码 → 自动验证 → 有错自动修复（最多 3 轮）
- [ ] 3 轮后仍有错误：诚实上报剩余错误，不假装修好
- [ ] 生成成功的代码带 `[generated]` 标记
- [ ] 验证工具可配置（传入 tools 列表选择启用哪些）
- [ ] Token 消耗每轮记录
- [ ] 单轮超时（默认 60s）后终止并上报

**与 T-004 的协作**：
```
generateCodeLoop() 内部：
  eachRound:
    tokens = llm.generate(...)  // 由 T-004 升级后的 client 自动记录消耗
    budget.consume(tokens)      // T-004 的预算控制检查
    if budget.exceeded(): throw TokenBudgetExceededError
```

---

### T-003：检查点与恢复机制

**目标**：每个阶段完成时写检查点，流水线崩溃后从最近检查点恢复。

**输入**：
- T-001：PipelineStateMachine（状态转换时通知检查点写入）

**输出**：
- 新文件：`src/pipeline/checkpoint.ts`
- 新增数据库表：`checkpoints`

**实现步骤**：

1. 定义 `Checkpoint` 数据模型（见技术设计 3.3）
2. 实现 `CheckpointManager` 类：
   ```
   class CheckpointManager {
     constructor(store: PipelineRunStore)
     
     async save(projectId: string, stage: ProjectState, data: CheckpointData): Promise<void>
     async load(projectId: string): Promise<Checkpoint | null>
     async loadByStage(projectId: string, stage: ProjectState): Promise<Checkpoint | null>
     async list(projectId: string): Promise<Checkpoint[]>
     async restore(projectId: string, stage?: ProjectState): Promise<Checkpoint>
   }
   ```
3. 在 `store.ts` 中新增 `checkpoints` 表（SQL schema）
4. 将检查点写入集成到 `PipelineStateMachine`：
   - 每次 `transition()` 成功后的 `onLeave` 回调自动写检查点
   - `failed` 状态 → 自动加载最近检查点 → 提示恢复路径
5. 实现幂等性保证：同一阶段的重复执行不产生副作用（检查点去重）
6. 写测试：模拟崩溃后恢复，验证产物不丢失

**验收标准**：
- [ ] 每个阶段完成时自动写入检查点
- [ ] 进程 kill 后重启，自动从最近检查点恢复
- [ ] 恢复后重新执行当前阶段（幂等，不产生副作用）
- [ ] 检查点数据包含该阶段的所有关键产物
- [ ] 查询 API 可列出项目的所有检查点

**数据库变更**：
```sql
CREATE TABLE IF NOT EXISTS checkpoints (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  data TEXT NOT NULL,  -- JSON serialized
  FOREIGN KEY (project_id) REFERENCES pipeline_runs(id)
);
CREATE INDEX idx_checkpoints_project ON checkpoints(project_id, stage);
```

---

### T-004：Token 预算与成本追踪

**目标**：项目级 Token 预算管理，LLM Provider 配置层（可插拔 API Key），模型分层自动选择。

**输入**：
- 现有文件：`src/integrations/llm-client.ts`（需升级）
- 参考：`TECHNICAL-DESIGN.md` 第五章"LLM Provider 配置层设计"

**输出**：
- 升级文件：`src/integrations/llm-client.ts`
- 新文件：`src/pipeline/token-budget.ts`
- 配置文件：`.anfsf/llm-providers.json`（Provider 配置模板）

**实现步骤**：

1. **升级 LLM Client 的 Provider 配置层**：
   ```
   // 当前：根据 API Key 前缀自动推断 provider
   // 升级后：从配置读取 provider 列表，支持多 provider 同时启用
   
   class LLMClientManager {
     constructor(config: LLMProviderConfig)
     
     getClient(tier: string): LLMClient  // 按分层自动选择
     selectModel(tier: string): string    // primary → fallback 逻辑
     isProviderAvailable(name: string): boolean
   }
   ```
2. 实现模型分层选择逻辑（`selectModel()`，见技术设计 5.2）
3. 实现 `TokenBudget` 类：
   ```
   class TokenBudget {
     constructor(projectId: string, totalBudget: number)
     
     consume(tokens: number, model: string): void       // 消耗并计价
     remaining(): number
     usageRate(): number
     isWarnThreshold(): boolean  // > 70%
     isBlockThreshold(): boolean // > 90%
     getReport(): TokenUsageReport
   }
   ```
4. 在 Agent 循环（T-002）和直接 LLM 调用的位置集成预算检查
5. 更新环境变量模板（`.env.example`），添加多 Provider 配置示例

**验收标准**：
- [ ] 可配置多个 Provider（通过环境变量或配置文件）
- [ ] 模型按分层自动选择（high-quality / standard / lightweight）
- [ ] Primary 模型不可用时自动 fallback
- [ ] Token 消耗实时累计
- [ ] 消耗达 70% 通知 PM
- [ ] 消耗达 90% 暂停非必要 LLM 调用
- [ ] Provider 过期只需更新环境变量，不改代码

---

## 阶段一组概要规格

### T-101：PRD 质量预检（4d）

- **新文件**：`src/prd/prd-quality-check.ts`
- **核心逻辑**：输入 PRD 文本 → 四维度评分（完整性/一致性/可量化性/可验证性）→ ≥70 绿灯 / 40-70 黄灯 / <40 红灯（触发引导对话模式）
- **验收**：正常 PRD 直接通过，模糊 PRD 被识别并引导，引导至 ≥70 分后继续

### T-102：需求理解置信度标注（3d）

- **新文件**：`src/prd/confidence-annotator.ts`
- **核心逻辑**：每个需求分析结论标注推导来源（🟢明确/🟡推断/🔴补充）和置信度（高/中/低）
- **验收**：每条结论带标注；低置信度条目可在前端高亮

### T-103：PM 需求确认界面（5d）

- **新文件**：`web/src/pages/RequirementReview.tsx`
- **核心逻辑**：左栏带颜色标记的功能列表 + 用户流程图；右栏 PRD 原文对照；逐条确认/修改/补充；锁定后生成需求版本 v1
- **验收**：PM 可逐条操作；低置信度醒目；锁定后不可编辑

### T-104：Agent 循环接入骨架生成（4d）

- **修改文件**：`src/pipeline/product-pipeline.ts`（调用 T-002 替代直接 LLM 生成）
- **核心逻辑**：调用 `generateCodeLoop(spec)` → 骨架含 [generated] 标记 → 编译通过

### T-105：部署形态确认（1d）

- **修改文件**：阶段一确认界面
- **核心逻辑**：Phase 1 仅独立 Web 可选，H5/小程序置灰标注"即将推出"

---

## 阶段二/三组概要规格

### T-201：Gitea Webhook 监听器（4d）

- **新文件**：`src/integrations/gitea-client.ts`, `src/server/routes/webhook.ts`
- **核心逻辑**：接收 Gitea push event → 解析 commit → 送入代码标注（T-202）；5 分钟轮询兜底
- **验收**：本地 push 到 Gitea → ANFSF 收到 → 触发后续流程

### T-202：代码变动标注引擎（5d）

- **新文件**：`src/pipeline/code-annotator.ts`
- **核心逻辑**：git diff vs 初始骨架 → 标注 [generated]/[modified]/[new] → 写入元数据库
- **验收**：骨架→generated；开发改过→modified；新文件→new

### T-203：契约检查自动触发器（3d）

- **新文件**：`src/pipeline/contract-watcher.ts`
- **核心逻辑**：后端 commit → 接口变更 → 通知前端；前端 commit → 调用未定义字段 → 警告

### T-204：提交即触发验证流水线（5d）

- **新文件**：`src/pipeline/commit-verification.ts`
- **核心逻辑**：commit → 契约测试 → 集成测试 → 编译验证 → 全部通过 → 部署测试环境

### T-205：故障报告生成器（3d）

- **新文件**：`src/pipeline/fault-reporter.ts`
- **核心逻辑**：验证失败 → 报告含问题描述 + 代码位置 + 可能原因 + 建议修复方向

### T-206：开发任务包生成器（3d）

- **新文件**：`src/pipeline/task-generator.ts`
- **核心逻辑**：阶段一后生成前端/后端 TASK.md → 文件路径 + 行范围 + 依赖 + 优先级

---

## 阶段四/五组概要规格

### T-301：L1/L2/L3 分级修复引擎（5d）

- **新文件**：`src/pipeline/fix-engine.ts`
- **核心逻辑**：二维矩阵（代码来源 × 问题类型）→ 判定 L1/L2/L3；L1 自动提交，L2 生成 diff，L3 只定位

### T-302：回归测试自动触发器（3d）

- **新文件**：`src/pipeline/regression-runner.ts`
- **核心逻辑**：每次修复提交 → 重跑全部已通过测试 → 有退化则阻断

### T-303：PM 测试审查界面（4d）

- **新文件**：`web/src/pages/TestReview.tsx`
- **核心逻辑**：展示自动化测试结果（通过/失败/未覆盖）；PM 手工验证清单；结构化反馈提交

### T-304：发布检查清单（4d）

- **新文件**：`src/pipeline/release-check.ts`
- **核心逻辑**：三层检查（系统自动/PM 确认/角色确认）→ 全绿解锁发布按钮

### T-305：项目归档基础版（3d）

- **新文件**：`src/pipeline/archiver.ts`
- **核心逻辑**：度量报告 + 组件候选标记 + 版本快照。Phase 1 不做自动模式提取

---

## 权限 + 前端组概要规格

### T-401：角色模型实现（4d）

- **新文件**：`src/server/auth/roles.ts`
- **核心逻辑**：PM/前端/后端三角色；人员变更走项目岗位机制；审计日志。Phase 1 可简化为单用户模式

### T-402：项目看板前端（5d）

- **新文件**：`web/src/pages/ProjectDashboard.tsx`
- **核心逻辑**：五阶段进度指示器；每阶段产出物链接；变更看板（如有）

### T-403：开发个人工作台前端（4d）

- **新文件**：`web/src/pages/DeveloperWorkspace.tsx`
- **核心逻辑**：任务清单 + 代码跳转 + 上下文恢复（"上次写到哪了"）。Phase 1 可简化

---

## 联调组概要规格

### T-501：全流程联调测试（5d）

- **测试场景**：正常 PRD 全流程 / 低质量 PRD 引导 / Agent 修复 / 提交触发契约检查 / L1 自动修复 / L2 建议修复 / L3 定位 / PM 确认 / 三层发布检查 / 归档
- **验收**：端到端可跑通，不要求无 bug

### T-502：Bug 修复与边缘场景（3d）

- **范围**：联调中发现的 bug + 边界条件补充 + 错误处理完善

### T-503：现有测试套件保持（持续）

- **类型**：维护任务，非独立开发任务
- **要求**：每次提交后跑全量测试，确保现有 103 个测试文件的通过率不下降
- **新增模块同步写测试**
- **验收**：Phase 1 结束时，测试套件通过数 ≥ 当前基线（93/97）

---

> **下一步**：[API 设计规范](API-SPEC.md)
