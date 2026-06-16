# ANFSF 17 层理论架构 — 逐层详细设计分析

> ⚠️ **过时警告**: 本文档描述的是 ANFSF 的理论 17 层架构设计。当前系统实际运行架构为**五阶段状态机 + Agent Loop**，运行时接入率约 35%。
> 17 层架构作为设计参考保留，但不应作为理解当前系统的出发点。
> 当前系统真实状态请参阅 [docs/ANFSF-REFACTOR-FIX.md](docs/ANFSF-REFACTOR-FIX.md)。
>
> **路径问题**: 本文档原在 Linux 环境编写，引用路径 `/root/.openclaw/workspace-main/src/` 与当前 Windows 路径 `src/` 不匹配，请自行调整。

> 基于 `/root/.openclaw/workspace-main/src/` 目录下所有 .ts 源文件的深度分析

---

## L1: AI-Native PRD（需求生成与解析层）

### 核心职责
将原始 PRD 文档解析为结构化的、机器可读的需求规格，定义从非结构化自然语言到强类型需求模型的转换协议。

### 关键文件
- `prd/prd-parser.ts`（252 行）

### 核心类型体系（16 个接口）

| 类型 | 说明 |
|------|------|
| `AINativePRD` | 完整的 PRD 数据结构，含 12 个子规格 |
| `Feature` | 功能特性，含 P0-P3 优先级和 4 种状态 |
| `UserFlow` | 用户流程，包含步骤序列 |
| `FlowStep` | 流程步骤（step/action/expected） |
| `UIRequirement` | UI 组件需求 |
| `DataSpec` | 数据实体规格，含字段和关系 |
| `Field` | 数据字段定义 |
| `Relationship` | 实体关系（1:1/1:N/M:N） |
| `Constraint` | 约束条件（技术/业务/法规） |
| `AcceptanceCriterion` | 验收标准，含可测试性标记 |
| `Dependency` | 依赖关系（内部/外部） |
| `NonFunctionalSpec` | 非功能性需求（类别/指标/目标） |
| `Workflow` | 工作流（触发器/动作） |
| `APISpec` | API 规格（路径/方法/请求/响应） |
| `ServiceSpec` | 服务规格 |
| `ValidationReport` | 验证报告（valid/missing/warnings） |

### AINativePRD 的 12 个子规格
- `features`：功能特性列表
- `userFlows`：用户流程
- `uiRequirements`：UI 需求
- `data`：数据模型规格
- `constraints`：约束条件
- `acceptanceCriteria`：验收标准
- `dependencies`：依赖关系
- `nonFunctionalSpecs`：非功能性需求（性能/安全/可扩展性/可靠性）
- `workflow`：工作流定义
- `backendSpecs`：后端规格（API + 服务）
- `infrastructureSpecs`：基础设施规格
- `qaSpecs`：QA 规格

### 关键逻辑
- `AINativePRDParser.parse()`：文本 → 结构化 PRD（当前为 TODO 骨架，AI 驱动的解析逻辑未实现）
- `validateCompleteness()`：检查 `features` 是否为空（阻塞性）、`acceptanceCriteria` 是否缺失（警告性）

### 实现状态
类型体系完整，解析器逻辑骨架化。

---

## L2: Product Input Layer（产品输入层）

### 核心职责
将 L1 产出的原始 PRD 精炼为高质量、经过验证的需求图谱。核心机制：双源上下文检索 + A/B 自验证 + 混合检索 + 幻觉防护。

### 关键文件

| 文件 | 说明 |
|------|------|
| `skills/requirement-refiner-skill.ts`（257 行） | 中央协调器，编排 6 个子技能 |
| `skills/hybrid-retriever-skill.ts`（273 行） | 混合检索（BM25 + 向量 + 图检索 + RRF 融合） |
| `skills/base.ts` | `Skill` 抽象基类 + `SkillResult`/`SkillContext` 接口 |
| `skills/types.ts` + `types.d.ts` | 完整的技能注册类型体系 |
| `skills/skills-registry.ts` | 技能注册表（循环依赖检测 + 拓扑排序 + 版本约束） |
| `skills/index.ts` | 模块导出 |

### 6 个子技能
1. `MemoryConsolidationSkill`：历史记忆检索
2. `ContextCompressorSkill`：当前需求压缩
3. `HybridRetrieverSkill`：混合 RAG 检索
4. `HallucinationGuardSkill`：幻觉防护验证
5. `EvolutionHarness`：进化闭环（回滚用）
6. `KPIDashboard`：KPI 指标记录

### 核心算法

| 算法 | 公式/机制 |
|------|-----------|
| **RRF 融合** | `score = Σ 1/(k + rank)`，k=60 |
| **A/B 自验证回滚** | `IMPROVEMENT_THRESHOLD = 0.20`，低于阈值回滚基线 |
| **BM25** | 简化版 `TF × IDF`，含 Map 缓存 |
| **DFS 循环依赖检测** | recursionStack 跟踪当前路径 |
| **Kahn 拓扑排序** | 入度归零节点队列处理 |
| **沙箱隔离** | 默认 256MB 内存 / 30s 超时，禁止 eval/require/网络/文件系统 |

### 三种检索模式

| 模式 | 使用的方法 | 权重 |
|------|-----------|------|
| `sparse_only` | BM25 | 1.0 |
| `hybrid` | BM25 + Vector | 0.5 / 0.5 |
| `full` | BM25 + Vector + Graph | 0.4 / 0.4 / 0.2 |

### 数据流
```
原始需求字符串
    ↓
[双源精炼]
├── 历史记忆检索 (MemoryConsolidationSkill)
├── 当前需求压缩 (ContextCompressorSkill)
└── 合并上下文
    ↓
[混合检索] (HybridRetrieverSkill)
├── BM25 (带缓存)
├── Vector (占位)
└── Graph (占位)
    → RRF 融合 (k=60)
    ↓
[幻觉防护] (HallucinationGuardSkill)
    → 验证语句 + 置信度评分
    ↓
[构建需求图] (buildGraph)
    ↓
[A/B 验证] (可选)
├── 双源结果 vs 基线单源结果
├── 改进幅度 = (Δcompleteness + Δquality + Δnodes) / 3
└── 改进 < 20% → 回滚到基线
    ↓
输出：RefinedGraph
```

---

## L3: Input Governance（输入治理层）

### 核心职责
需求进入系统前的"质量门禁"——一致性/完整性/模糊性/冲突检测 + Veto 执行。

### 关键文件

| 文件 | 说明 |
|------|------|
| `input-governance/governance.ts`（283 行） | 输入治理引擎：四大检查能力 |
| `core/synthesizer/veto/veto-enforcer.ts`（229 行） | 硬/软否决执行器 |
| `core/ownership/gates.ts`（430 行） | 合同权限门禁（8 条默认规则） |
| `core/ownership/proposals.ts`（363 行） | 提案管理（提交/审批/拒绝工作流） |
| `core/ownership/state-machine.ts`（320 行） | 合同状态机（draft → approved/rejected） |
| `core/synthesizer/economics/scoring.ts`（285 行） | 经济学评分引擎 |
| `core/synthesizer/ownership/proof-generator.ts`（292 行） | 所有权证明生成器 |
| `governance/control-plane.ts`（622 行） | 治理控制平面 |
| `governance/dynamic-router.ts` | 动态路由（light/standard/full 三级模式） |
| `governance/complexity-metrics.ts` | 治理复杂度度量 |
| `core/synthesizer/types.ts`（120 行） | 合成器核心类型（角色/权限/合同） |
| `core/ownership/types.ts`（514 行） | 所有权类型体系（30+ 个类型） |

### 四大检查能力

| 检查 | 方法 | 说明 |
|------|------|------|
| 一致性 | `checkConsistency(prd, design, api)` | PRD vs Design vs API 对齐（TODO） |
| 完整性 | `checkCompleteness(prd)` | 状态/API/约束完整性，计算 completionRate |
| 模糊性 | `detectAmbiguities(prd)` | 12 个模糊词字典扫描 |
| 冲突 | `resolveConflicts(prd)` | O(n²) 约束对检测（TODO） |

### 默认 Veto 规则

| 规则 | 模式 | 权限 | 类型 |
|------|------|------|------|
| API 合同变更 | `contract:OpenAPI:*` | architect | hard |
| 数据库 Schema 变更 | `contract:DBSchema:*` | architect | hard |
| 认证相关变更 | `contract:*:auth*` | security | hard |
| 实体变更 | `graph:Entity:*` | backend-lead | soft |

### 核心算法

| 算法 | 说明 |
|------|------|
| **Veto 执行** | 通配符前缀匹配 → 硬否决检查审批 / 软否决风险乘数 1.5x |
| **自动审批决策树** | 破坏性变更 → 移除项 → 类型变更 → 风险评分 |
| **经济学评分** | `-0.30×interfaceCost -0.20×bottleneck +0.20×skillMatch +0.15×parallelismGain` |
| **风险评分** | 基础 10 + delete(+30) + high criticality(+20) + blastRadius>10(+15)，上限 100 |
| **合同状态机** | `draft → approved/rejected`，版本号自动递增 |
| **接口成本** | `depends_on=1.0, calls=1.2, updates=1.4` |

### 数据流
```
L1 AINativePRD + L2 RefinedGraph
    ↓
[一致性检查] → ConsistencyReport (critical/warning/info)
    ↓
[完整性检查] → CompletenessReport (missing items + completionRate)
    ↓
[模糊性检测] → AmbiguityReport (模糊词列表 + 建议)
    ↓
[冲突检测] → ConflictResolution
    ↓
[Veto 执行] → VetoResult (passed/rejected/warnings)
    ↓
[所有权检查] → ContractGate.checkPermission()
    ↓
[提案工作流] → ContractProposal (状态流转)
    ↓
[状态机] → draft → approved/rejected
    ↓
[经济学评分] → EconomicsScore
    ↓
通过/阻断/需要人工审查
```

---

## L4: Requirement Graph Engine（认知内核）

### 核心职责
将自然语言需求结构化为多层级有向图（7 层），进行标准化、约束校验、概率补全、推理和优化，最终编译为中间表示（IR）。

### 8 个子模块实现状态

| 子模块 | 方法 | 实现状态 |
|--------|------|----------|
| Graph Builder | `build()` | 骨架已实现，7 层节点构建 |
| Normalizer | `normalize()` | 接口已定义，逻辑全 TODO |
| Constraint System | `applyConstraints()` | 接口已定义，逻辑 TODO |
| Probabilistic Completion | `completeProbabilistically()` | 骨架已实现，核心 TODO |
| **Deep Reasoning** | `reasonDeeply()` | **完全缺失** |
| **Global Optimization** | `optimizeGlobally()` | **完全缺失** |
| Versioning | `version()` | 仅 commit 有简单实现 |
| **Requirement Compiler** | `compileToIR()` | **接口已定义，返回空 IR** |

### Graph Kernel（图内核，已完整实现）

| 模块 | 文件 | 说明 |
|------|------|------|
| 核心类型 | `core/graph/types.ts` | 所有权格：ChangeEvent/TraceEdge/BlastRadiusResult |
| 图遍历 | `core/graph/traversal.ts` | BFS 爆炸半径、DFS 全路径枚举、最短路径、可达性 |
| 热力图 | `core/graph/heatmap.ts` | 热评分引擎 + 双时间段对比 |
| 事件系统 | `core/graph/events.ts` | 事件分发中心 + 变更追踪中间件 |
| 缓存工具 | `core/graph/cache.ts` | LRU/TTL 缓存 + memoize + debounce + BatchProcessor |
| 常量定义 | `core/graph/constants.ts` | 9 种边类型、11 种节点类型、风险阈值 |
| CLI 工具 | `core/graph/cli.ts` | heatmap / trace / events 查询命令 |

### 图类型体系

- **NodeType**（11 种）：Role / Service / APIContract / DBSchema / UIComponent / EventSchema / ConfigSchema / Probe / Utility / AuthModule / PaymentService
- **边类型**（9 种）：owns / implements / depends_on / subscribes / calls / validates / updates / governs / touches
- **变更动作**（5 种）：created / updated / deleted / renamed / moved
- **变更动作**（5 种）：created / updated / deleted / renamed / moved
- **TraceEdge 关系类型**：AUTHORED / TOUCHED / GOVERNED / DEPENDS_ON / CALLS / UPDATES

### 契约差异引擎（L4-L7 桥接）

| 文件 | 说明 |
|------|------|
| `core/contract/semver.ts` | 语义版本解析/比较/bump/range/prerelease |
| `core/contract/diff-openapi.ts` | OpenAPI 语义 diff + 风险评分 + 自动审批 |
| `core/contract/diff-dbschema.ts` | DB Schema diff + 自动生成 migration SQL（up/down） |
| `core/contract/types.ts` | 完整契约类型系统 |

### 关键算法

| 算法 | 公式/说明 |
|------|-----------|
| **BFS 爆炸半径** | 从目标节点出发，按下游边 BFS，标记关键路径节点，区分直接/间接影响 |
| **DFS 全路径枚举** | 枚举两节点间所有可能路径 |
| **热评分** | `heat = frequency × blastRadius × riskWeight × typeWeight` |
| **OpenAPI 风险评分** | `50(基础) + 30(breaking) + critical×5 + removed×10 + modified×3`，上限 100 |
| **自动审批（OpenAPI/DB）** | 非 breaking + 新增字段可选 + 无删除项 + riskScore < 20 |

### 数据流
```
自然语言需求
    ↓
[Graph Builder] → RequirementGraph (7 层节点 + 边)
    ↓
[Normalizer] → 去重/命名统一/结构规范化
    ↓
[Constraint System] → 应用 schema/semantic/architecture/policy 约束
    ↓
[Probabilistic Completion] → 补全缺失节点 (confidence > 0.7)
    ↓
[Deep Reasoning] → 多跳推理 + 反事实推理
    ↓
[Global Optimization] → 复杂度/性能/成本/可维护性优化
    ↓
[Versioning] → commit/diff/rollback
    ↓
[Requirement Compiler] → IR (Service/UI/Workflow/Data)

同时，变更事件 (ChangeEvent) 持续输出到:
  - ChangeLogStore (持久化)
  - ChangeEventEmitter (实时分发)
  - Heatmap 引擎 (可视化)
  - 契约 Diff 引擎 (版本管理)
```

---

## L5: Strategy Layer（策略层）

### 核心职责
三大策略——架构策略（接口预算）+ 执行策略（KPI 监控）+ 缩放策略（安全优化）。

### 关键模块

| 模块 | 文件 | 说明 |
|------|------|------|
| 接口预算 | `core/role/interface-budget.ts` | 跨角色边成本 + 合约触碰成本 |
| 权重矩阵 | `core/role/weights.ts` | 三层权重体系（边/合约/节点风险） |
| KPI 引擎 | `core/role/kpi-engine.ts` | JSD 漂移指数 + 6 维健康评分 |
| KPI 导出 | `core/role/kpi-export.ts` | Prometheus/JSONL/CSV/Grafana |
| KPI 类型 | `core/role/kpi-types.ts` | 快照/阈值/健康评分/策略 |
| 安全优化器 | `synthesizer/optimization/safe-optimizer.ts` | Cooldown + 自动回滚 + 有限旋钮 |
| 冲突解决 | `synthesizer/analysis/conflict-resolver.ts` | 超预算→合并角色，否则→新合约 |
| 热合约分析 | `synthesizer/analysis/hot-contract.ts` | 四重约束角色数决策 |
| 返工风险 | `synthesizer/analysis/rework-risk.ts` | 四因子累加模型 |
| 离线校准 | `core/evolution/offline-optimizer.ts` | 回归分析校准经济学权重 |
| 预算类型 | `core/role/budget-types.ts` | BudgetMetrics/BudgetAlert 定义 |

### 边成本矩阵

| 边类型 | 成本 | 说明 |
|--------|------|------|
| `owns` | 0.5 | 所有权关系（最低） |
| `implements` | 0.8 | 接口实现 |
| `depends_on` | 1.0 | 简单依赖 |
| `subscribes` | 1.1 | 事件订阅 |
| `calls` | 1.2 | API 调用 |
| `validates` | 1.3 | 验证关系 |
| `updates` | 1.4 | 数据更新（较高） |

### 合约成本矩阵

| 合约类型 | 成本 |
|----------|------|
| ConfigSchema | 1.1 |
| UIProps | 1.2 |
| EventSchema | 1.5 |
| OpenAPI | 1.6 |
| DBSchema | 1.7（最高） |

### 节点风险权重

| 节点类型 | 权重 |
|----------|------|
| PaymentService | 1.9（最高） |
| AuthModule | 1.8 |
| DBSchema | 1.7 |
| APIContract | 1.5 |
| Service | 1.3 |
| UIComponent | 1.1 |
| Utility | 0.8（最低） |

### KPI 六维指标

| 指标 | 说明 | 权重 |
|------|------|------|
| `throughput` | 每小时完成任务数 | -（加分项） |
| `failureRate` | 失败任务比例 | 0.25 |
| `reworkRate` | 返工任务比例 | 0.15 |
| `queuePressure` | 队列压力 (current/max) | 0.15 |
| `conflictRate` | 所有权冲突率 | 0.15 |
| `driftIndex` | 能力漂移指数 | 0.10 |

**健康分**：`100 - Σ(metric × 100 × weight)`，throughput > 5 时 +5 分

### 核心算法

| 算法 | 公式/说明 |
|------|-----------|
| **接口预算** | `weighted_cost = Σ(EDGE_COST×riskWeight) + Σ(CONTRACT_COST×riskWeight)`，风险缓冲 ×1.1 |
| **JSD 漂移指数** | `JSD(P\|\|Q) = (KL(P\|\|M) + KL(Q\|\|M)) / 2`，M = (P+Q)/2，范围 0-1 |
| **角色数四重约束** | SCC 下界 + √n 上界 + 热合约收敛 + 历史学习 |
| **安全在线优化** | 30 分钟冷却、连续 2 次失败回滚、禁止修改治理核心 |
| **返工风险累加** | breaking(+0.4) + 废弃字段(+0.2) + 高风险标签(+0.3) + 历史返工(×0.5)，cap 1.0 |
| **含返工经济学评分** | `-0.30×interfaceCost -0.20×bottleneck +0.20×skillMatch +0.15×parallelismGain -0.15×reworkRisk` |
| **热合约收敛** | 0 热合约 maxK=8，1 个 maxK=6，2+ 个 maxK=5 |

### KPI 触发动作策略

| 条件 | 动作 |
|------|------|
| queuePressure > 1.2 | 建议拆分角色 |
| driftIndex > 0.35 AND failureRate > 0.15 | 建议重分配 |
| conflictRate > 0.15 | 收紧所有权规则 |
| reworkRate > 0.3 | 审查 DoD 门禁 |
| failureRate > 0.25 | 调查根因 |

---

## L6: System Architecture（系统架构层）

### 核心职责
管理架构的渐进式演化和离线优化。

### 关键文件

| 文件 | 说明 |
|------|------|
| `core/evolution/framework.ts` | `ProgressiveEvolutionFramework`：KPI 护栏保护的架构演化 |
| `core/evolution/offline-optimizer.ts` | 离线权重校准：回归分析校准经济学权重 |

### 5 类 KPI 目标

| KPI | 目标值 | 最低值 |
|-----|--------|--------|
| style_loading_success_rate | 99.5% | 99.0% |
| contract_change_success_rate | 95.0% | 90.0% |
| role_assignment_efficiency | 85.0% | 75.0% |
| token_budget_compliance | 100.0% | 95.0% |
| deployment_success_rate | 98.0% | 95.0% |

### 个人化预算管理
- 总预算：1,000,000 tokens
- 样式预算：100,000 tokens（10%）
- 周期：24 小时自动重置

### 关键发现
理论架构中的**前端/后端/数据/API 架构生成器**、**AST 反写引擎**全部缺失。L6 当前是"演化管理框架"而非"架构生成引擎"——它管理架构的演化和优化，但不负责从零生成架构。

---

## L7: Contract-First Engine（契约优先引擎）

### 核心职责
OpenAPI/DBSchema/UIProps 契约的语义 diff、breaking change 检测、版本升级判定、UI 组件合成。

### 关键文件

| 文件 | 说明 |
|------|------|
| `core/contract/types.ts` | 完整契约类型系统 |
| `core/contract/semver.ts` | 语义化版本管理 |
| `core/contract/diff-openapi.ts` | OpenAPI 语义 diff 引擎 |
| `core/contract/diff-dbschema.ts` | DB Schema diff + 迁移 SQL 生成 |
| `core/contract/ui-synthesis-module.ts` | UI 组件合成（React/Vue/Angular） |

### 契约类型
`OpenAPI` | `DBSchema` | `UIProps` | `EventSchema` | `ConfigSchema`

### Breaking Change 规则

| OpenAPI | DBSchema |
|---------|----------|
| 新增 required 字段 | 列类型变更 |
| 类型变更 | NULL → NOT NULL |
| 删除 property/endpoint | 添加 UNIQUE 约束 |
| 删除 enum 值 | 删除列/表、主键变更、删除外键 |

### 风险评分公式
```
score = 50(基础) + 30(breaking) + critical×5 + removed×10 + modified×3
```
上限 100

### 自动审批条件
- 非 breaking change
- 新增字段必须是可选的（nullable 或有默认值）
- 不能有删除项
- riskScore < 20

### UI 组件可访问性评分
从 100 分起算：缺失 alt text -20、缺失 labels -20、低对比度 -15、缺失键盘导航 -25

---

## L8: Adaptive Task DAG（自适应任务 DAG）

### 核心职责
动态任务编排，通过 Harness 模式实现任务灵活调度、动态插入和依赖调整。

### 实现方式
通过 `harness/orchestration-harness.ts` 的 Agent 注册/注销、消息发送/广播实现任务编排。配合 `governance/dynamic-router.ts` 根据项目复杂度决定激活哪些 Harness。

### 三级激活模式

| 模式 | Token 预算 | 说明 |
|------|-----------|------|
| light | < 50K tokens | 最小 Harness 集 |
| standard | < 200K tokens | 标准 Harness 集 |
| full | ≥ 200K tokens | 全部 Harness |

### 复杂度评分
```
complexity = featureScore(0.25) + flowScore(0.20) + entityScore(0.20) + integrationScore(0.20) + complianceScore(0.15)
```

---

## L8.5: Governance Control Plane（治理控制平面）

### 核心职责
集中整合 MCP Bus + Skills Registry + Agent Harness，统一治理操作、变更事件追踪、所有权仲裁。

### 关键文件
- `governance/control-plane.ts`（622 行）：治理控制平面主类
- `governance/index.ts`：模块导出
- `harness/governance-harness.ts`：治理 Harness（Veto 检查 + 所有权证明 + Canary 部署）

### 5 种治理操作
| 操作 | 说明 |
|------|------|
| `synthesize` | 通过 MCP Bus 发送 proposal，创建 ChangeEvent + TraceEdge |
| `deployPolicy` | 所有权检查 → Canary 部署 → ChangeEvent |
| `runTest` | 统计显著性检验 → ChangeEvent |
| `verify` | 架构一致性检查（graph/contract/ownership） |
| `loadSkill` | 依赖检查 → 注册到 SkillsRegistry |

### 核心能力
- 变更事件追踪 + Trace Edge 记录
- 金丝雀部署 + 自动回滚
- 所有权仲裁（Ownership Arbitration）
- L13-L17 层利用率跟踪
- 治理复杂度度量：`(Harness 数量 × 平均代码行数) / 功能点数`

---

## L9: Agent Operating System（Agent 操作系统）

### 核心职责
单 Agent 生命周期管理 + 多 Harness 协同调度 + MCP 通信协议 + 记忆系统 + 外部独立审核。

### 架构模型：单 Agent + 多 Harness

理论架构设计了 6 类独立 Agent（架构师/构建师/测试师/安全审计师/产品经理/进化管家），实际实现采用**单 Agent + 多 Harness**模型：

- **单 Agent**：系统唯一的智能体核心，负责推理、决策、代码生成
- **多 Harness**：围绕单 Agent 的多个专业 Harness，各自负责不同维度的运行时能力

```
                    ┌─────────────────┐
                    │   单 Agent 核心  │
                    │  (推理/决策/生成) │
                    └────────┬────────┘
                             │
           ┌─────────┬───────┼───────┬─────────┐
           ▼         ▼       ▼       ▼         ▼
      ┌────────┐┌───────┐┌──────┐┌───────┐┌────────┐
      │ Agent  ││Evol.  ││Govern││UI/UX  ││Orchest.│
      │Harness ││Harness││Harness││Harness││Harness │
      └────────┘└───────┘└──────┘└───────┘└────────┘
```

| Harness | 职责 | 文件 |
|---------|------|------|
| Agent Harness | 测试执行 + 金丝雀部署 + 统计显著性检验 | `harness/agent-harness.ts` |
| Evolution Harness | KPI 优化 + 数据飞轮 + 记忆巩固 + 自升级 | `harness/evolution-harness.ts` |
| Governance Harness | 否决检查 + 所有权证明 + 策略版本管理 | `harness/governance-harness.ts` |
| UI/UX Harness | GenUI + 样式验证 + 个性化预算 | `harness/uiux-harness.ts` |
| Orchestration Harness | MCP Bus 管理 + Harness 注册/注销 | `harness/orchestration-harness.ts` |

外部独立的 **External Review Agent** 作为独立审计角色存在，不加入主系统 Harness 组，拥有独立否决权。

### 关键模块

| 模块 | 文件 | 说明 |
|------|------|------|
| MCP Bus | `mcp/mcp-bus.ts` | 幂等性 + TTL + 订阅发布 + MessageBuilder Fluent API |
| Agent Harness | `harness/agent-harness.ts` | 测试执行 + 金丝雀部署 + 统计显著性检验 |
| Evolution Harness | `harness/evolution-harness.ts` | KPI 优化 + 数据飞轮 + 记忆巩固 + 自升级 |
| External Review Agent | `agents/external-review-agent.ts` | 独立审计 + 否决权 + TimescaleDB |
| Memory Consolidation | `skills/memory-consolidation-skill.ts` | 五维重要性 + 半衰期遗忘 |
| Context Compressor | `skills/context-compressor-skill.ts` | 分层压缩 + 4-bit 量化 + 稀疏注意力 |
| Orchestration Harness | `harness/orchestration-harness.ts` | MCP Bus 管理 + Agent 注册/注销 |
| Skills Registration | `harness/skills-registration.ts` | Skills 到 Harness 的注册桥接 |

### MCP 通信协议

| 类型 | 说明 |
|------|------|
| `MCPMessageType` | `proposal` / `query` / `command` / `feedback` / `approval` / `telemetry` |
| `MCPProtocolVersion` | `'mcp/1.0'` |
| `MCPSchemaVersion` | `'2026-03'` |
| `MCPErrorCodes` | INVALID_MESSAGE / TTL_EXPIRED / DUPLICATE_MESSAGE / RECIPIENT_NOT_FOUND / QUEUE_FULL / SCHEMA_MISMATCH |

### MessageBuilder Fluent API
```
MessageBuilder.from('agent-a').to('agent-b').type('command').payload({...}).idempotentKey('key-123').traceId('trace-456').requiresAck(true).build()
```

### MCP Bus 关键保障
- **幂等性**：两级机制（idempotencyCache + idempotencyPending），60 秒定时清理
- **消息验证**：schema version = '2026-03'，protocol = 'mcp/1.0'，TTL > 0，maxQueueSize = 1000
- **TTL 追踪**：MessageTrace 记录 messageChain + hopCount + totalLatency

### 记忆系统

| 维度 | 权重 | 说明 |
|------|------|------|
| `taskImpact` | 40% | 任务影响 |
| `frequency` | 25% | 归一化访问频率 |
| `connectivity` | 15% | 关联记忆数 / 100 |
| `rlReward` | 10% | 强化学习奖励 |
| `userFeedback` | 10% | 用户反馈 |

**半衰期**：高重要性(>0.8)→60 天，中(0.5-0.8)→30 天，低(<0.5)→15 天

**剪枝条件**：importance < 0.3 且 age > threshold × 2

**三层存储**：short（24h）/ long（7 天）/ cold（无限），高重要性记忆永远保留

### 上下文压缩

| 层次 | 内容 | 保留比例（fast/deep） |
|------|------|----------------------|
| L1 | 原始 tokens（最近） | 5% / 25% |
| L2 | 语义摘要 | 15% / 45% |
| L3 | 图索引 | 30% / 80% |

**Token 超限解决**：MAX_TOKENS = 180,000（API 限制 196,601），优先级裁剪（keep: currentTask/currentFile/directDeps/criticalContext），保留 80% 预算

**4-bit 量化**：每 16 token 一个 cluster，压缩比约 16:1

### External Review Agent 独立性
- 独立的 PostgreSQL/TimescaleDB 连接（不同端口 5433）
- 不共享 memory/reward/retriever 与主系统
- 拥有独立否决权（veto）
- 双阈值：分数 0.85，幻觉 0.70

---

## L10: Efficiency Layer（效率层）

### 核心职责
上下文优化 + 模型分级 + 提前终止 + 批处理 + 质量检查。

### 5 大 Guard Skills

| Skill | 文件 | 说明 |
|-------|------|------|
| Context Compressor | `skills/context-compressor-skill.ts` | 分层压缩（L1/L2/L3）+ 4-bit 量化 |
| Hallucination Guard | `skills/hallucination-guard-skill.ts` | 自洽性 + 来源验证 + GraphRAG 验证 |
| Policy Guard | `skills/policy-guard-skill.ts` | 安全 + 合规 + 所有权检查 |
| Code Quality Guard | `skills/code-quality-guard-skill.ts` | 静态 + 语义 + 性能 + 策略四维检查 |
| Citation Tracer | `skills/citation-tracer-skill.ts` | 片段级引用 + 置信度评分 |

### 三级检测模式

| 模式 | Variants | Graph 验证 | 阈值 |
|------|----------|-----------|------|
| fast | 1 | 否 | 0.7 |
| standard | 3 | 是 | 0.8 |
| thorough | 5 | 是 | 0.9 |

### 幻觉三分类

| 类型 | 条件 |
|------|------|
| `unsupported` | 自洽但无来源（consistent.score > 0.7） |
| `fabricated` | 既不自洽也无来源（consistent.score < 0.5） |
| `contradictory` | 与来源矛盾 |

### Code Quality Guard 加权评分
```
overallScore = 0.30×static + 0.30×semantic + 0.20×performance + 0.20×policy
```
质量阈值 0.92（高于 Policy Guard 的 0.70）

### 批处理
4 个检查 `Promise.all` 并行执行，目标延迟 < 10ms

### 引用置信度计算
```
confidence = 0.4×sourceCountScore + 0.4×overlapScore + 0.2×qualityScore
sourceCountScore = min(1, sourceCount/3)
overlapScore = 重叠词数 / statement 总词数
qualityScore = 0.5(base) + author?(+0.2) + recent?(+0.2) + version?(+0.1)
```

---

## L11: Cognitive Integrity（认知完整性层）

### 核心职责
确保 AI 生成内容的语义一致性、事实准确性和引用可追溯性。

### 关键模块

| 模块 | 文件 | 说明 |
|------|------|------|
| Hallucination Guard | `skills/hallucination-guard-skill.ts` | 幻觉三分类检测 |
| Citation Tracer | `skills/citation-tracer-skill.ts` | 片段级引用溯源 |
| Hybrid Retriever | `skills/hybrid-retriever-skill.ts` | 混合检索（BM25 + 向量 + 图） |
| Memory Consolidation | `skills/memory-consolidation-skill.ts` | 多权重检索 + Graph 驱动遗忘 |

### 核心算法

| 算法 | 说明 |
|------|------|
| **幻觉三分类** | `classifyHallucination()` 根据 grounded 和 consistent 分数分类 |
| **RRF 融合** | `1/(k + rank)` 公式（k=60）融合多检索源 |
| **重要性五维加权** | taskImpact 40% + frequency 25% + connectivity 15% + rlReward 10% + userFeedback 10% |
| **半衰期遗忘** | 高>0.8: 60 天，中 0.5-0.8: 30 天，低<0.5: 15 天 |
| **引用置信度** | sourceCountScore 40% + overlapScore 40% + qualityScore 20% |

---

## L12: Long-Chain Stability（长链稳定性层）

### 核心职责
维护长上下文推理的稳定性，防止上下文膨胀和推理退化。

### 关键模块

| 模块 | 文件 | 说明 |
|------|------|------|
| Memory Consolidation | `skills/memory-consolidation-skill.ts` | MemWeaver 核心：记忆巩固/修剪/检索 |
| Context Compressor | `skills/context-compressor-skill.ts` | 上下文压缩（被 Evolution Harness 用于自升级） |
| Quantization | `integrations/quantization.ts` | 4/8-bit 量化：压缩 token 表示 |
| Sandbox Executor | `skills/sandbox-executor.ts` | 沙箱执行：隔离环境，内存/时间限制 |
| Evolution Framework | `core/evolution/framework.ts` | 渐进式进化框架：预算控制 + KPI 护栏 |

### 关键算法

| 算法 | 说明 |
|------|------|
| **三层存储** | short（24h）/ long（7 天）/ cold（无限），高重要性记忆永远保留 |
| **检索六维评分** | semantic 40% + temporal 20% + importance 25% + frequency 15% + rl 10% + user 10% |
| **沙箱分级限制** | requirement-graph: 512MB/60s，ui-synthesis: 256MB/30s |
| **预算双轨** | 总预算 1M tokens/天 + 样式子预算 100K tokens/天，24h 自动重置 |
| **4-bit 量化** | 16 token/cluster，内存节省 75-87.5% |

---

## L13: Semantic Consistency（语义一致性层）

### 核心职责
确保生成的代码/API/Schema 与需求图保持语义一致性，防止 API 虚构、契约偏离和状态不一致。

### 关键模块

| 模块 | 文件 | 说明 |
|------|------|------|
| Policy Guard | `skills/policy-guard-skill.ts` | 安全模式检测 + 合规检查 + 所有权验证 |
| External Review Agent | `agents/external-review-agent.ts` | 独立静态分析 + 模型审计 |
| Governance Harness | `harness/governance-harness.ts` | 否决检查 + 所有权证明 + 策略版本管理 |
| OpenAPI Diff | `core/contract/diff-openapi.ts` | OpenAPI 差异检测 |
| DB Schema Diff | `core/contract/diff-dbschema.ts` | 数据库 Schema 差异检测 |
| SemVer | `core/contract/semver.ts` | 语义版本一致性 |

### 核心算法

| 算法 | 说明 |
|------|------|
| **安全评分递减** | 基础分 1.0，critical -0.30，major -0.15，minor -0.05。critical 或 <0.70 即拒绝 |
| **所有权冲突检测** | 检测多个 `// Owner:` 标记 |
| **外部审核双阈值** | 分数 0.85，幻觉 0.70。任一不达标或有关键问题即否决 |
| **否决条件** | 关键问题 > 0 OR 幻觉 < 0.70 OR 主要问题 > 5 |

---

## L14: Simulation Layer（模拟层）

### 核心职责
执行前模拟用户行为、系统负载和异常情况，根据项目风险特征自动选择模拟级别。

### 关键文件
- `simulation/auto-decision-engine.ts`：自动决策引擎

### 模拟四级

| 级别 | 内容 |
|------|------|
| 0 | 跳过模拟 |
| 1 | 仅用户行为模拟 |
| 2 | 用户行为 + 负载模拟 |
| 3 | 用户行为 + 负载 + 异常 + 边界模拟 |

### 风险评分加权
```
riskScore = domainRisk×0.35 + scaleRisk×0.25 + dataRisk×0.25 + complianceRisk×0.15
```

### 领域风险映射

| 领域 | 风险值 |
|------|--------|
| 金融/证券/医疗 | 0.9 |
| 电商/教育 | 0.5 |
| 其他 | 0.2 |

### A/B 显著性检验
- t 统计量 + 正态分布 CDF 计算 p-value
- p < 0.05 判定为显著
- Cohen's d 计算效应量
- 95% 置信区间：`1.96 × stdDev / √n`

---

## L15: Runtime + Deployment（运行时与部署层）

### 核心职责
管理执行、验证、部署的完整流水线，包括内联守卫检查、外部审核仲裁、金丝雀部署和渐进式发布。

### 关键文件

| 文件 | 说明 |
|------|------|
| `harness/deployment-pipeline.ts` | 部署流水线：双层审核架构 + 金丝雀部署 |
| `harness/canary-deployer.ts` | 金丝雀部署器：渐进式发布 + 自动回滚 |
| `harness/governance-harness.ts` | 治理 Harness：否决检查 + 策略版本 + 金丝雀编排 |
| `cli/anfsf-cli.ts` | CLI：synthesize/preview/verify/role rebalance/ui gen 等命令 |

### 双层审核架构

| 层级 | 延迟 | 内容 |
|------|------|------|
| 内联守卫 | < 10ms | CodeQualityGuard + HallucinationGuard（standard 模式） |
| 外部审核 | 50-300ms | 独立静态分析 + qwen bailian 模型审计 |

### 金丝雀阶段
`1% → 5% → 20% → 50% → 100%`，每阶段 5 分钟

### 健康判定

| 指标 | 不健康阈值 |
|------|-----------|
| error_rate | ≥ 0.05 |
| latency_p99 | ≥ 1000ms |
| success_rate | ≤ 0.95 |

### 自修复
内联守卫失败时触发 `graphAddEvent` 记录 `SelfHealingTriggered` 事件

---

## L16: Runtime Intelligence（运行时智能层）

### 核心职责
KPI 监控 + 瓶颈识别 + A/B 测试 + 显著性检验 + 指标导出，为系统进化提供数据驱动的决策依据。

### 关键模块

| 模块 | 文件 | 说明 |
|------|------|------|
| KPI 引擎 | `core/role/kpi-engine.ts` | 角色级 KPI + 漂移指数 + 趋势分析 |
| KPI 类型 | `core/role/kpi-types.ts` | 快照/阈值/健康评分/策略 |
| KPI 导出 | `core/role/kpi-export.ts` | Prometheus/JSONL/CSV/Grafana 格式 |
| KPI 仪表盘 | `harness/kpi-dashboard.ts` | 架构级指标监控 + 告警 + 自愈检查 |
| A/B 测试 | `harness/ab-test-runner.ts` | 统计显著性分析 |
| 权重配置 | `core/role/weights.ts` | KPI 权重 |

### KPI 阈值体系

| 指标 | 警告 | 严重 |
|------|------|------|
| 队列压力 | 0.8 | 1.2 |
| 失败率 | 0.15 | 0.25 |
| 返工率 | 0.2 | 0.3 |
| 冲突率 | 0.1 | 0.15 |
| 漂移指数 | 0.25 | 0.35 |
| 健康评分 | < 60 | < 40 |

### 核心算法

| 算法 | 说明 |
|------|------|
| **健康评分** | 基础 100 分，减去各指标加权，高吞吐量 +5，范围 0-100 |
| **Jensen-Shannon 漂移** | `JSD(P\|\|Q)` 计算任务分布与能力分布散度，范围 0-1 |
| **趋势判定** | delta > +5 = improving，< -5 = degrading，否则 stable |
| **架构日自检** | L13-L17 调用率 ≤ 45%、Layer 8.5 代码增量 ≤ 30 行、效率比 ≥ 4.8:1 |

---

## L17: Evolution Guard（进化护栏层）

### 核心职责
管理系统进化过程中的回归检测、风险评分、回滚触发、人工确认和多层防御，确保系统在持续进化中保持稳定。

### 关键模块

| 模块 | 文件 | 说明 |
|------|------|------|
| Evolution Harness | `harness/evolution-harness.ts` | KPI 优化 + 数据飞轮 + 记忆巩固 + 自升级 |
| Evolution Framework | `core/evolution/framework.ts` | KPI 跟踪 + 预算执行 + 自动回滚 |
| Offline Optimizer | `core/evolution/offline-optimizer.ts` | 经济学权重校准 + 回归分析 |
| External Review Agent | `agents/external-review-agent.ts` | 独立审计 + 否决权 |
| Governance Harness | `harness/governance-harness.ts` | 否决 + 所有权证明 + 金丝雀编排 |
| KPI Dashboard | `harness/kpi-dashboard.ts` | 架构级阈值监控 + 告警 |

### 核心算法

| 算法 | 说明 |
|------|------|
| **KPI 违规判定** | `current < minimum` → 违规，`< minimum × 0.9` → critical |
| **自动回滚** | 连续违规 >= rollbackThreshold（默认 3 次）→ 触发回滚 |
| **经济学权重校准** | 回归分析，R² >= 0.6 + 样本增益 >= 0.8 才采纳 |
| **外部融合启用** | projectCount >= 5 AND externalDataFilterAccuracy >= 0.92 AND sandboxIsolationPassRate == 100% |
| **自升级机制** | ContextCompressor 压缩上下文 + 生成 diff 而非全量代码（token 下降 90%） |
| **架构自愈** | twoSourceImprovement 连续 3 天 < 0.15 时自动暂停双源融合 |

---

## 层间依赖关系总览

```
L1 (PRD 解析)
    ↓
L2 (精炼: 双源检索 + A/B 验证)
    ↓
L3 (治理门禁: Veto + 所有权 + 经济学评分)
    ↓
L4 (认知内核: Graph Engine 8 子模块 + 契约 Diff 引擎)
    ↓
L5 (策略层: 接口预算 + JSD 漂移 + KPI 引擎 + 安全优化)
    ↓
L6 (演化管理框架: KPI 护栏 + 预算控制 + 离线校准)
    ↓
L7 (契约优先引擎: OpenAPI/DBSchema/UIProps 语义 Diff)
    ↓
L8 (自适应任务 DAG: Harness 编排 + 动态路由)
    ↓
L8.5 (治理控制平面: MCP Bus + Skills Registry + Agent Harness)
    ↓
L9 (Agent OS: 单 Agent + 多 Harness + MCP 通信 + 记忆系统 + 外部审核)
    ↓
L10 (效率层: 5 大 Guard Skills + 三级检测模式)
    ↓
L11 (认知完整: 幻觉检测 + 引用溯源 + 混合检索)
    ↓
L12 (长链稳定: 三层存储 + 4-bit 量化 + 沙箱隔离)
    ↓
L13 (语义一致: Policy Guard + External Review + Diff 检测)
    ↓
L14 (模拟: 四级模拟 + 风险画像 + A/B 显著性)
    ↓
L15 (部署: 双层审核 + 金丝雀 5 阶段 + 自动回滚)
    ↓
L16 (KPI 智能: 6 维监控 + JSD 漂移 + Grafana 导出)
    ↓
L17 (进化护栏: 连续违规回滚 + 权重校准 + 自升级闭环)
    ↓
    └──→ 反馈到 L11-L16 全链路，形成持续进化闭环
```
