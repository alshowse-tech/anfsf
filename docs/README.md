# ASF V4.0 核心模块文档

**版本**: v0.8.5  
**日期**: 2026-03-29

---

## 概述

ASF V4.0 是一个基于所有权晶格 (Ownership Lattice) 和接口预算 (Interface Budget) 的架构治理框架。

### 核心模块

```
┌─────────────────────────────────────────────────────────────┐
│  Graph Kernel          - 变更流追踪 + 热力图可视化           │
│  Interface Budget v2   - 跨角色依赖成本计算                  │
│  Contract Pack         - 语义化 diff + 版本管理              │
│  Role KPI Dashboard    - 角色健康度监控                      │
│  Ownership + DoD       - 权限门禁 + 审批流程                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 快速开始

### 安装依赖

```bash
cd /root/.openclaw/workspace-main
npm install
```

### 运行测试

```bash
npm test
```

### 类型检查

```bash
npm run typecheck
```

---

## 模块 API

### Graph Kernel

#### ChangeEvent

```typescript
interface ChangeEvent {
  id: string;
  ts: number;
  actorRoleId: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
  target: { kind: 'graph' | 'code' | 'contract'; idOrPath: string };
  ownershipRuleId: string;
  diff: ChangeDiff;
  riskScore?: number;
  blastRadius?: number;
  heatScore?: number;
}
```

#### Blast Radius 计算

```typescript
import { calculateBlastRadius } from './core/graph/traversal';

const result = calculateBlastRadius(graph, 'api-gateway-v1', 5);
// result: {
//   directImpact: 3,
//   indirectImpact: 7,
//   totalBlastRadius: 10,
//   impactedNodes: [...],
//   criticalPath: [...]
// }
```

#### 热力图生成

```typescript
import { generateHeatmap } from './core/graph/heatmap';

const heatmap = generateHeatmap(graph, changeEvents, {
  window: 7 * 24 * 60 * 60 * 1000, // 7 days
  limit: 100,
});
```

---

### Interface Budget

#### 权重配置

```typescript
import { EDGE_COST, CONTRACT_COST } from './core/role/weights';

// Edge costs
EDGE_COST = {
  depends_on: 1.0,
  calls: 1.2,
  updates: 1.4,
  implements: 0.8,
  validates: 1.3,
};

// Contract costs
CONTRACT_COST = {
  OpenAPI: 1.6,
  DBSchema: 1.7,
  UIProps: 1.2,
  EventSchema: 1.5,
};
```

#### 预算计算

```typescript
import { calculateInterfaceBudget } from './core/role/interface-budget';

const metrics = calculateInterfaceBudget({
  roleId: 'backend-team',
  graph: graphStore,
  lattice: ownershipLattice,
  timeWindow: 7 * 24 * 60 * 60 * 1000,
});

console.log(`Utilization: ${metrics.utilizationRate * 100}%`);
```

---

### Contract Pack

#### 语义化 Diff

```typescript
import { diffOpenAPI } from './core/contract/diff-openapi';

const diff = diffOpenAPI(oldSpec, newSpec, '1.0.0', '1.1.0');

if (diff.breaking) {
  console.log('Breaking changes detected!');
  console.log(diff.changelog);
}
```

#### 版本管理

```typescript
import { bumpVersion, compareVersions } from './core/contract/semver';

bumpVersion('1.2.3', 'major');  // '2.0.0'
bumpVersion('1.2.3', 'minor');  // '1.3.0'
bumpVersion('1.2.3', 'patch');  // '1.2.4'

compareVersions('1.2.3', '1.2.4'); // -1
```

---

### Role KPI

#### 指标计算

```typescript
import { calculateRoleKPI } from './core/role/kpi-engine';

const kpi = await calculateRoleKPI('backend-team', dataSource, '1d');

console.log(`Health Score: ${kpi.healthScore}/100`);
console.log(`Drift Index: ${kpi.driftIndex}`);
```

#### KPI 导出

```typescript
import { exportKPI } from './core/role/kpi-export';

// Prometheus format
const prometheus = exportKPI(kpis, 'prometheus');

// JSONL format
const jsonl = exportKPI(kpis, 'jsonl');

// Snapshot
const snapshot = exportKPI(kpis, 'snapshot');
```

---

### Ownership + DoD

#### 状态机

```typescript
import { ContractStateMachine } from './core/ownership/state-machine';

const machine = new ContractStateMachine('api-gateway-v1', 'draft');

// Submit for approval
machine.transition('approved', 'architect-team', 'LGTM');

console.log(machine.getVersion()); // '1.0.1'
```

#### 权限门禁

```typescript
import { ContractGate } from './core/ownership/gates';

const gate = new ContractGate(lattice);

const result = gate.checkWritePermission(
  'api-gateway-v1',
  'OpenAPI',
  'backend-team'
);

if (!result.allowed && result.proposalRequired) {
  console.log('Must submit proposal instead of direct write');
}
```

#### 自动批准

```typescript
import { canAutoApprove } from './core/dod/auto-approve';

if (canAutoApprove(diff)) {
  console.log('Low-risk change, auto-approved');
} else {
  console.log('Requires manual review');
}
```

---

## CLI 命令

### Graph

```bash
openclaw graph heatmap --window=7d --export=json
openclaw graph trace --node=api-gateway-v1 --depth=3
openclaw graph events --target=user-service --limit=50
```

### Role

```bash
openclaw role budget --role=backend-team --export=json
openclaw role kpi --role=backend-team --window=1d --export=prometheus
openclaw role kpi --triggers
```

### Contract

```bash
openclaw contract diff --from=v1.0.0 --to=v1.1.0 --contract=OpenAPI
openclaw contract propose --id=api-gateway --diff=...
openclaw contract approve --proposal=prop-123
```

---

## 配置文件

### interface-budget.yaml

```yaml
edgeCosts:
  depends_on: 1.0
  calls: 1.2
  updates: 1.4

contractCosts:
  OpenAPI: 1.6
  DBSchema: 1.7

riskThresholds:
  high: 70
  medium: 40
```

### kpi-policies.yaml

```yaml
thresholds:
  queuePressure:
    critical: 1.2
  driftIndex:
    critical: 0.35

policies:
  - name: queue_pressure_split
    condition:
      metric: queuePressure
      operator: ">"
      threshold: 1.2
    action: suggest_split
```

### auto-approve.yaml

```yaml
enabled: true

rules:
  - contractType: OpenAPI
    conditions:
      onlyAddOptionalFields: true
      riskScoreBelow: 20
    autoApprove: true
```

---

## 架构决策

### 1. Blast Radius 使用 BFS

选择 BFS 而非 DFS 因为：
- 需要计算影响深度
- 可以找到最短影响路径
- 便于限制最大深度

### 2. Drift Index 使用 JSD

选择 Jensen-Shannon Divergence 因为：
- 对称性 (JSD(P,Q) = JSD(Q,P))
- 有界 (0-1)
- 对零值友好

### 3. 双门禁系统

Gate 1 (Ownership): 谁可以写  
Gate 2 (DoD): 什么可以编译

分离关注点，便于独立演进。

---

## 测试

```bash
# 运行所有测试
npm test

# 覆盖率报告
npm run test:coverage

# 监听模式
npm run test:watch
```

### 测试覆盖目标

- 语句覆盖率：>50%
- 分支覆盖率：>50%
- 函数覆盖率：>50%

---

## 贡献指南

1. Fork 仓库
2. 创建特性分支
3. 添加测试
4. 确保测试通过
5. 提交 PR

---

## 许可证

MIT License
