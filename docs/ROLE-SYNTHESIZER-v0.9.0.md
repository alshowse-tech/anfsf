# Role Synthesizer 工业化增强方案

**版本**: v0.9.0  
**日期**: 2026-03-29  
**状态**: ✅ 核心实现完成

---

## 概述

将 Role Synthesizer 从"看起来智能"升级到"工业稳定"，实现可验证、可控、可进化、可预测的工业化增强。

---

## 核心增强模块

### 1. Veto 执行器 (VetoEnforcer)

硬/软否决权执行，防止"智能但失控"。

```typescript
import { VetoEnforcer, DEFAULT_VETO_RULES } from './synthesizer';

const enforcer = new VetoEnforcer(DEFAULT_VETO_RULES);

const result = enforcer.enforce(
  { changes: [{ resourceType: 'contract', resourcePath: '/orders', action: 'update' }] },
  [{ authority: 'architect', scope: 'contract:OpenAPI:*', status: 'approved' }]
);

// Hard veto: requires architect approval
// Soft veto: warns and adds risk multiplier
```

**文件**: `src/core/synthesizer/veto/veto-enforcer.ts`

---

### 2. 经济学评分 (Economics Scoring)

将 economics 决策变量纳入评分函数。

```typescript
import { computeRoleCost, computeEconomicsScore } from './synthesizer';

const cost = computeRoleCost(role, assignment, dag);
// → { baseCost, dependencyCost, concurrentCap, totalCost }

const score = computeEconomicsScore(assignment, dag, roles);
// Score = -0.30×interfaceCost + -0.20×bottleneck + 0.20×skillMatch + 0.15×parallelismGain
```

**文件**: `src/core/synthesizer/economics/scoring.ts`

---

### 3. 热契约收敛 (Hot Contract Convergence)

基于契约耦合度收紧角色数量上限。

```typescript
import { determineOptimalRoleCount } from './synthesizer';

const decision = determineOptimalRoleCount(tasks, graph, { kMin: 2, kMax: 8 });

// Decision:
// - theoreticalMin: 3 (from SCC)
// - practicalMax: 5 (hot contract convergence)
// - optimal: 5
// - recommendation: 'hot_contract_convergence'
```

**文件**: `src/core/synthesizer/analysis/hot-contract.ts`

---

### 4. Ownership Proof 生成器

资源三级规范化 + Single-Writer Proof。

```typescript
import { canonicalizeResource, generateOwnershipProof } from './synthesizer';

// Canonicalize
const key = canonicalizeResource({
  type: 'contract',
  format: 'openapi',
  path: '/orders#POST'
});
// → { type: 'contract', path: 'OpenAPI:/orders', subpath: 'POST' }

// Generate proof
const proofs = generateOwnershipProof([key], roles, ownershipRules);
// → { writer, proposer, approver, rulesApplied, valid }
```

**文件**: `src/core/synthesizer/ownership/proof-generator.ts`

---

### 5. 返工风险预测 (Rework Risk Predictor)

预测返工风险并纳入评分。

```typescript
import { predictReworkRisk, computeScoreWithRework } from './synthesizer';

const risk = predictReworkRisk(task, contractChanges, historicalData);
// → { score: 0.65, factors: ['Breaking change in API'], mitigation: '...' }

// Updated score formula:
// Score = ... - 0.15 × reworkRisk
```

**文件**: `src/core/synthesizer/analysis/rework-risk.ts`

---

### 6. 安全在线优化器 (Safe Online Optimizer)

旋钮限制 + 回滚 + 冷却机制。

```typescript
import { SafeOnlineOptimizer } from './synthesizer';

const optimizer = new SafeOnlineOptimizer({
  cooldownMs: 1800000, // 30 minutes
  failureThreshold: 2
});

const result = await optimizer.optimize(current, metrics, projectId);
// → { optimized, knobApplied, rolledBack, cooldownUntil }
```

**安全旋钮**:
- `roleCountDelta`: -1, 0, +1
- `budgetMultiplier`: 0.8, 1.0, 1.2
- `assignmentSwap`: 任务交换

**禁止优化**:
- authorities
- ownershipRules
- vetoRules
- capabilities

**文件**: `src/core/synthesizer/optimization/safe-optimizer.ts`

---

### 7. 冲突解决器 (Conflict Resolver)

预算驱动的合并角色 vs 加契约决策。

```typescript
import { resolveOwnershipConflict } from './synthesizer';

const resolution = resolveOwnershipConflict(
  resource,
  conflictingRoles,
  currentBudget,
  budgetLimit
);

// If budget exceeded → merge_roles
// Otherwise → introduce_contract
```

**文件**: `src/core/synthesizer/analysis/conflict-resolver.ts`

---

## 模块依赖关系

```
┌─────────────────────────────────────────────────────────────┐
│  synthesizer/                                               │
│  ├── veto/                                                  │
│  │   └── veto-enforcer.ts ← ChangeAuthority, ApprovalRecord │
│  ├── economics/                                             │
│  │   └── scoring.ts ← TaskDAG, RoleEconomics                │
│  ├── analysis/                                              │
│  │   ├── hot-contract.ts                                    │
│  │   ├── rework-risk.ts                                     │
│  │   └── conflict-resolver.ts                               │
│  ├── ownership/                                             │
│  │   └── proof-generator.ts ← ResourceKey, OwnershipRule    │
│  ├── optimization/                                          │
│  │   └── safe-optimizer.ts ← RuntimeMetrics, SafeKnob       │
│  └── index.ts (统一导出)                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 七大提升点落地映射

| 提升点 | 落地模块 | 关键代码 |
|--------|---------|----------|
| veto 硬/软 | VetoEnforcer | `hard/soft` 分支 + DoD Gate |
| economics 决策 | computeRoleCost | 进入评分函数 |
| hotContract 收敛 | computeContractCouplingBound | 收紧 k_max |
| 资源层级 | canonicalizeResource | ResourceKey 规范化 |
| single-writer proof | generateOwnershipProof | 输出可验证证明 |
| 返工风险 | predictReworkRisk | 加入评分函数 |
| 安全优化 | SafeOnlineOptimizer | 旋钮限制 + 回滚 + 冷却 |
| SCC 修正 | buildTaskCouplingGraph | 在耦合图上做社区检测 |
| 冲突决策 | resolveOwnershipConflict | 预算驱动（合并 vs 契约） |

---

## API 参考

### VetoEnforcer

```typescript
class VetoEnforcer {
  enforce(changes: ChangeSet, approvals: ApprovalRecord[]): VetoResult
  addRule(rule: VetoRule): void
  hasHardVeto(scopeSelector: string): boolean
  hasSoftVeto(scopeSelector: string): boolean
}
```

### Economics Scoring

```typescript
function computeRoleCost(
  role: Role & { economics: RoleEconomics },
  assignment: Assignment,
  dag: TaskDAG
): RoleCostResult

function computeEconomicsScore(
  assignment: Assignment,
  dag: TaskDAG,
  roles: Role[]
): EconomicsScore
```

### Hot Contract Analysis

```typescript
function determineOptimalRoleCount(
  tasks: Task[],
  graph: RequirementGraph,
  constraints: SynthConstraints
): RoleCountDecision
```

### Ownership Proof

```typescript
function generateOwnershipProof(
  resources: ResourceKey[],
  roles: Array<{ id: string }>,
  ownershipRules: OwnershipRule[]
): OwnershipProof[]
```

### Safe Optimizer

```typescript
class SafeOnlineOptimizer {
  optimize(
    current: SynthResult,
    metrics: RuntimeMetrics,
    projectId: string
  ): Promise<OptimizationResult>
  
  getStatus(): {
    inCooldown: boolean
    cooldownRemaining: number
    failureCount: number
  }
}
```

---

## 使用示例

### 完整工作流

```typescript
import {
  VetoEnforcer,
  computeEconomicsScore,
  determineOptimalRoleCount,
  generateOwnershipProof,
  predictReworkRisk,
  SafeOnlineOptimizer,
} from './synthesizer';

// 1. Determine optimal role count
const decision = determineOptimalRoleCount(tasks, graph, { kMin: 2, kMax: 8 });

// 2. Generate ownership proofs
const proofs = generateOwnershipProof(resources, roles, ownershipRules);

// 3. Check veto rules
const vetoResult = enforcer.enforce(changes, approvals);

// 4. Compute economics score with rework risk
const risks = predictReworkRisk(task, contractChanges, historicalData);
const score = computeEconomicsScore(assignment, dag, roles);

// 5. Runtime optimization
const optimizer = new SafeOnlineOptimizer();
const optimized = await optimizer.optimize(current, metrics, projectId);
```

---

## 测试

```bash
npm test -- --testPathPattern=synthesizer
```

---

## 下一步

- [ ] 集成到 Agent OS 主流程
- [ ] 添加更多历史学习算法
- [ ] 实时指标采集集成
- [ ] 可视化仪表盘

---

**实现完成**: 2026-03-29  
**代码行数**: ~2,500  
**模块数**: 8
