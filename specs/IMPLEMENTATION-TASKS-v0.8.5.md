# ASF V4.0 v0.8.5 实现任务清单

**版本**: v0.8.5  
**开始日期**: 2026-03-29  
**总工时**: ~12 天  
**状态**: 阶段 1-2 完成，阶段 3-5 进行中

## 进度更新 (2026-03-29 09:00)

### ✅ 已完成

**阶段 1: Graph Kernel 变更流追踪**
- [x] `core/graph/types.ts` - ChangeEvent, TraceEdge 类型定义
- [x] `core/graph/constants.ts` - 边类型/节点类型常量
- [x] `core/graph/traversal.ts` - Blast Radius BFS 遍历算法
- [x] `core/graph/heatmap.ts` - 热力图生成引擎
- [x] `core/graph/events.ts` - ChangeEvent 事件系统
- [x] `core/graph/cli.ts` - CLI 命令框架
- [x] `storage/change-log.ts` - 变更日志存储

**阶段 2: Interface Budget v2**
- [x] `core/role/weights.ts` - 权重矩阵配置
- [x] `core/role/budget-types.ts` - 预算类型定义
- [x] `core/role/interface-budget.ts` - 预算计算引擎
- [x] `core/role/cli.ts` - CLI 命令框架

**阶段 4: Role KPI Dashboard**
- [x] `core/role/kpi-types.ts` - KPI 类型定义
- [x] `core/role/kpi-engine.ts` - KPI 计算引擎 + Drift Index (JSD)
- [x] `core/role/kpi-export.ts` - Prometheus/JSONL/Snapshot 导出

**阶段 3: Contract Pack (部分完成)**
- [x] `core/contract/semver.ts` - 语义化版本管理
- [x] `core/contract/types.ts` - Contract Diff 类型定义

---

## 任务分解

### 阶段 1: Graph Kernel 变更流追踪 (3 天)

#### Task 1.1: 数据结构定义
- [ ] `core/graph/types.ts` - ChangeEvent, TraceEdge, ChangeDiff
- [ ] `core/graph/constants.ts` - 边类型常量，节点类型常量
- [ ] 单元测试：类型验证

#### Task 1.2: ChangeEvent 事件系统
- [ ] `core/graph/events.ts` - ChangeEventEmitter 类
- [ ] `core/storage/change-log.ts` - 事件持久化
- [ ] 集成到 GraphStore.write() 钩子
- [ ] 单元测试：事件发射 + 持久化

#### Task 1.3: Blast Radius 遍历算法
- [ ] `core/graph/traversal.ts` - calculateBlastRadius() BFS
- [ ] `core/graph/edges.ts` - 下游依赖边索引
- [ ] 单元测试：遍历准确性验证

#### Task 1.4: 热力图生成
- [ ] `core/graph/heatmap.ts` - calculateHeatScore(), generateHeatmap()
- [ ] `core/graph/cli.ts` - CLI: `openclaw graph heatmap`
- [ ] 前端组件：热力图可视化

---

### 阶段 2: Interface Budget v2 (2 天)

#### Task 2.1: 权重矩阵配置
- [ ] `core/role/weights.ts` - EDGE_COST, CONTRACT_COST
- [ ] `config/interface-budget.yaml` - 可配置权重
- [ ] 单元测试：权重加载

#### Task 2.2: 预算计算引擎
- [ ] `core/role/interface-budget.ts` - calculateInterfaceBudget()
- [ ] `core/role/budget-types.ts` - BudgetMetrics, InterfaceCost
- [ ] `core/role/cli.ts` - CLI: `openclaw role budget`
- [ ] 单元测试：预算计算准确性

#### Task 2.3: 仪表盘集成
- [ ] 前端组件：预算使用率卡片
- [ ] API: GET /api/roles/:id/budget

---

### 阶段 3: Contract 语义化 Diff (3 天)

#### Task 3.1: 解析器
- [ ] `core/contract/parsers/openapi.ts` - parseOpenAPI()
- [ ] `core/contract/parsers/dbschema.ts` - parseDBSchema()
- [ ] `core/contract/parsers/uiprops.ts` - parseUIProps()
- [ ] 单元测试：解析准确性

#### Task 3.2: Diff 引擎
- [ ] `core/contract/diff-openapi.ts` - diffOpenAPI()
- [ ] `core/contract/diff-dbschema.ts` - diffDBSchema()
- [ ] `core/contract/diff-uiprops.ts` - diffUIProps()
- [ ] `core/contract/diff.ts` - 统一入口
- [ ] 单元测试：diff 语义化准确性

#### Task 3.3: Semver 版本管理
- [ ] `core/contract/semver.ts` - bumpVersion(), determineBumpType()
- [ ] `core/contract/version.ts` - 版本号存储
- [ ] 单元测试：版本 bump 逻辑

#### Task 3.4: Auto-Commit + Changelog
- [ ] `core/contract/auto-commit.ts` - autoCommit() Git 集成
- [ ] `core/contract/changelog.ts` - generateChangelog()
- [ ] CLI: `openclaw contract diff`, `openclaw contract propose`
- [ ] 前端组件：diff 可视化

---

### 阶段 4: Role KPI Dashboard (2 天)

#### Task 4.1: KPI 计算引擎
- [ ] `core/role/kpi-engine.ts` - calculateRoleKPI()
- [ ] `core/role/kpi-drift.ts` - calculateDriftIndex() JSD
- [ ] `core/role/kpi-types.ts` - RoleKPISnapshot, KPIWindow
- [ ] 单元测试：指标计算

#### Task 4.2: 存储 + Export
- [ ] `core/storage/kpi-store.ts` - KPI 时间序列存储
- [ ] `core/role/kpi-export.ts` - exportPrometheus(), exportJSONL()
- [ ] CLI: `openclaw role kpi --export=prometheus|jsonl|snapshot`
- [ ] 单元测试：导出格式

#### Task 4.3: KPI→动作策略
- [ ] `core/role/kpi-actions.ts` - KPI_POLICIES, evaluateKPITriggers()
- [ ] CLI: `openclaw role kpi --triggers`
- [ ] 前端组件：KPI 卡片 + 策略建议

---

### 阶段 5: Propose→Approve 双门禁 (2 天)

#### Task 5.1: Contract 状态机
- [ ] `core/ownership/state-machine.ts` - ContractStateMachine 类
- [ ] `core/ownership/types.ts` - ContractState, StateTransition
- [ ] 单元测试：状态转换

#### Task 5.2: 提案管理
- [ ] `core/ownership/proposals.ts` - ContractProposal CRUD
- [ ] `core/storage/proposal-store.ts` - 提案持久化
- [ ] CLI: `openclaw contract propose`, `openclaw contract approve`
- [ ] 单元测试：提案流程

#### Task 5.3: 权限门禁
- [ ] `core/ownership/gates.ts` - ContractGate 类
- [ ] `core/ownership/permissions.ts` - ContractPermissionRule
- [ ] 集成到 OwnershipLattice.write()
- [ ] 单元测试：权限检查

#### Task 5.4: DoD 编译门禁
- [ ] `core/dod/compile-gate.ts` - checkCompileGate()
- [ ] `core/dod/auto-approve.ts` - canAutoApprove()
- [ ] 集成到 compile/runtime preview
- [ ] 前端组件：审批队列

---

## 实现顺序

```
Week 1 (Day 1-5):
├── Task 1.1 → 1.2 → 1.3 → 1.4  (Graph Kernel 完成)
└── Task 2.1 → 2.2              (Interface Budget 核心完成)

Week 2 (Day 6-10):
├── Task 2.3                    (Interface Budget 收尾)
├── Task 3.1 → 3.2 → 3.3 → 3.4  (Contract Diff 完成)
└── Task 4.1 → 4.2              (KPI 核心完成)

Week 3 (Day 11-12):
├── Task 4.3                    (KPI 收尾)
└── Task 5.1 → 5.2 → 5.3 → 5.4  (门禁完成)
```

---

## 目录结构

```
src/
├── core/
│   ├── graph/
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── events.ts
│   │   ├── traversal.ts
│   │   ├── heatmap.ts
│   │   ├── edges.ts
│   │   └── cli.ts
│   ├── role/
│   │   ├── weights.ts
│   │   ├── interface-budget.ts
│   │   ├── budget-types.ts
│   │   ├── kpi-engine.ts
│   │   ├── kpi-drift.ts
│   │   ├── kpi-types.ts
│   │   ├── kpi-actions.ts
│   │   ├── kpi-export.ts
│   │   └── cli.ts
│   ├── contract/
│   │   ├── parsers/
│   │   │   ├── openapi.ts
│   │   │   ├── dbschema.ts
│   │   │   └── uiprops.ts
│   │   ├── diff-openapi.ts
│   │   ├── diff-dbschema.ts
│   │   ├── diff-uiprops.ts
│   │   ├── diff.ts
│   │   ├── semver.ts
│   │   ├── version.ts
│   │   ├── auto-commit.ts
│   │   └── changelog.ts
│   ├── ownership/
│   │   ├── state-machine.ts
│   │   ├── types.ts
│   │   ├── proposals.ts
│   │   ├── gates.ts
│   │   └── permissions.ts
│   └── dod/
│       ├── compile-gate.ts
│       └── auto-approve.ts
├── storage/
│   ├── change-log.ts
│   ├── kpi-store.ts
│   └── proposal-store.ts
└── config/
    ├── interface-budget.yaml
    ├── kpi-policies.yaml
    └── auto-approve.yaml
```

---

## 依赖关系

```
Graph Kernel (阶段 1)
    ↓
Role Engine (阶段 2) ← 依赖 GraphStore
    ↓
Contract Pack (阶段 3) ← 独立
    ↓
KPI Dashboard (阶段 4) ← 依赖 Role Engine + Storage
    ↓
Ownership Gate (阶段 5) ← 依赖 Contract Pack + Graph
```

---

## 验收标准

### 阶段 1: Graph Kernel
- [ ] ChangeEvent 可正确发射并持久化
- [ ] Blast Radius 计算准确率 > 95%
- [ ] 热力图 CLI 输出正确格式
- [ ] 单元测试覆盖率 > 80%

### 阶段 2: Interface Budget
- [ ] 权重矩阵可配置加载
- [ ] 预算计算与手工验证一致
- [ ] CLI export 格式正确
- [ ] 单元测试覆盖率 > 80%

### 阶段 3: Contract Diff
- [ ] OpenAPI/DBSchema diff 语义化准确
- [ ] Semver bump 符合规范
- [ ] Auto-commit 可正确提交
- [ ] 单元测试覆盖率 > 80%

### 阶段 4: KPI Dashboard
- [ ] 6 指标计算正确
- [ ] Drift Index JSD 计算准确
- [ ] Export 格式符合 Prometheus/JSONL
- [ ] 策略触发条件正确
- [ ] 单元测试覆盖率 > 80%

### 阶段 5: 门禁
- [ ] 状态机转换正确
- [ ] 权限检查准确 (Architect vs Non-Architect)
- [ ] 提案流程完整
- [ ] DoD 编译门禁生效
- [ ] 单元测试覆盖率 > 80%

---

## 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| BFS 遍历性能 | 高 | 限制 maxDepth=5, 添加缓存 |
| JSD 计算依赖 | 中 | 使用简单实现或内置函数 |
| Git auto-commit | 中 | 添加 dry-run 模式 |
| 前端组件复杂度 | 中 | 先 CLI 后 UI |

---

**最后更新**: 2026-03-29  
**状态**: 准备开始实现
