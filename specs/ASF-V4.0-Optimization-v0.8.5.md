# ASF V4.0 优化规格 v0.8.5
## 变更流可视化追踪 × Interface Budget v2 × Role KPI Dashboard

**版本**: v0.8.5  
**日期**: 2026-03-29  
**状态**: 待实现  
**优先级**: P0

---

## 概述

本规格将 5 条架构优化意见转化为可直接落地的工程实现，包含数据结构、关键算法、最小实现路径及模块映射。

### 交付物清单

| # | 优化项 | 模块 | 优先级 | 预计工时 |
|---|--------|------|--------|----------|
| 1 | ChangeEvent + 图追溯边 + 热力图 blast radius | Graph Kernel | P0 | 3d |
| 2 | Interface Budget v2 (风险×依赖类型×契约权重) | Role Engine | P0 | 2d |
| 3 | Contract 语义化 diff + auto-commit + semver | Contract Pack | P0 | 3d |
| 4 | Role KPI Dashboard + CLI export + KPI→动作策略 | Role Engine | P1 | 2d |
| 5 | Propose→Approve contract gate (双门禁) | Ownership Lattice + DoD | P0 | 2d |

---

## 优化 1: Ownership Lattice × Memory-Graph Fusion 变更流可视化追踪

### 1.1 模块映射

```
┌─────────────────────────────────────────────────────────────┐
│  Layer: Graph Kernel (core/graph/)                          │
├─────────────────────────────────────────────────────────────┤
│  - types.ts: ChangeEvent, TraceEdge                         │
│  - events.ts: ChangeEventEmitter                            │
│  - traversal.ts: blastRadius 计算                           │
│  - heatmap.ts: 影响热力图生成                               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer: Storage (core/storage/)                             │
├─────────────────────────────────────────────────────────────┤
│  - change-log.ts: ChangeEvent 持久化                        │
│  - graph-store.ts: TraceEdge 索引                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 数据结构

```typescript
// core/graph/types.ts

/** 变更事件类型 */
type ChangeAction = "create" | "update" | "delete" | "approve" | "reject";

type ChangeTargetKind = "graph" | "code" | "contract";

export interface ChangeEvent {
  id: string;                    // 事件唯一 ID (UUID)
  ts: number;                    // 时间戳 (ms)
  actorRoleId: string;           // 触发角色 ID
  action: ChangeAction;          // 动作类型
  target: {
    kind: ChangeTargetKind;      // 目标类型
    idOrPath: string;            // 目标 ID 或路径
  };
  ownershipRuleId: string;       // 适用的所有权规则 ID
  diff: ChangeDiff;              // 变更差异
  riskScore?: number;            // 风险评分 (0-100)
  blastRadius?: number;          // 影响半径 (下游节点数)
  heatScore?: number;            // 热力分数 (计算后)
}

export interface ChangeDiff {
  added?: Record<string, any>;
  removed?: Record<string, any>;
  modified?: Record<string, { before: any; after: any }>;
  contractType?: "OpenAPI" | "DBSchema" | "UIProps" | "EventSchema";
}

/** 追溯边类型 */
export interface TraceEdge {
  id: string;
  from: string;                  // 源节点 ID (Role|ChangeEvent|OwnershipRule)
  to: string;                    // 目标节点 ID (Node|Contract|CodeArtifact|ChangeEvent)
  relation: "AUTHORED" | "TOUCHED" | "GOVERNED";
  ts: number;
  metadata?: Record<string, any>;
}
```

### 1.3 关键算法

#### 1.3.1 Blast Radius 计算

```typescript
// core/graph/traversal.ts

import { GraphStore } from '../storage/graph-store';

interface BlastRadiusResult {
  directImpact: number;          // 直接影响节点数
  indirectImpact: number;        // 间接影响节点数
  totalBlastRadius: number;      // 总影响半径
  impactedNodes: string[];       // 受影响节点 ID 列表
  criticalPath: string[];        // 关键路径
}

export function calculateBlastRadius(
  graph: GraphStore,
  nodeId: string,
  maxDepth: number = 5
): BlastRadiusResult {
  const visited = new Set<string>();
  const impactedNodes: string[] = [];
  const queue: Array<{ id: string; depth: number; isCritical: boolean }> = [];
  
  // 从目标节点开始 BFS 遍历下游依赖
  queue.push({ id: nodeId, depth: 0, isCritical: false });
  visited.add(nodeId);
  
  let directImpact = 0;
  let indirectImpact = 0;
  const criticalPath: string[] = [];
  
  while (queue.length > 0) {
    const { id, depth, isCritical } = queue.shift()!;
    
    if (depth > 0) {
      impactedNodes.push(id);
      if (depth === 1) directImpact++;
      else indirectImpact++;
      
      if (isCritical) criticalPath.push(id);
    }
    
    if (depth >= maxDepth) continue;
    
    // 获取下游依赖节点
    const downstreamEdges = graph.getDownstreamEdges(id);
    
    for (const edge of downstreamEdges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        
        // 判断是否关键路径 (API/DB/Probe 节点)
        const nodeType = graph.getNodeType(edge.to);
        const isCritical = ['APIContract', 'DBSchema', 'Probe'].includes(nodeType);
        
        queue.push({
          id: edge.to,
          depth: depth + 1,
          isCritical: isCritical || isCritical
        });
      }
    }
  }
  
  return {
    directImpact,
    indirectImpact,
    totalBlastRadius: impactedNodes.length,
    impactedNodes,
    criticalPath
  };
}
```

#### 1.3.2 热力分数计算

```typescript
// core/graph/heatmap.ts

interface HeatScoreParams {
  changeFrequency: number;       // 变更频次 (单位时间内的变更次数)
  blastRadius: number;           // 影响半径
  riskWeight: number;            // 风险权重 (默认 1.0, 高风险×1.5)
  nodeType: string;              // 节点类型
}

const NODE_TYPE_WEIGHTS: Record<string, number> = {
  'APIContract': 1.5,
  'DBSchema': 1.6,
  'Service': 1.2,
  'UIComponent': 1.0,
  'Utility': 0.8
};

export function calculateHeatScore(params: HeatScoreParams): number {
  const { changeFrequency, blastRadius, riskWeight, nodeType } = params;
  
  const typeWeight = NODE_TYPE_WEIGHTS[nodeType] || 1.0;
  
  // 热力分数 = 频次 × 影响半径 × 风险权重 × 类型权重
  const heatScore = changeFrequency * blastRadius * riskWeight * typeWeight;
  
  return Math.round(heatScore * 100) / 100;
}

/** 生成热力图数据 */
export function generateHeatmap(
  graph: GraphStore,
  timeWindow: number = 7 * 24 * 60 * 60 * 1000  // 默认 7 天
): Array<{ nodeId: string; heatScore: number; rank: number }> {
  const changeEvents = graph.getChangeEvents({ since: Date.now() - timeWindow });
  
  // 按节点聚合变更
  const nodeChanges = new Map<string, { count: number; blastRadius: number; riskSum: number }>();
  
  for (const event of changeEvents) {
    const targetId = event.target.idOrPath;
    const existing = nodeChanges.get(targetId) || { count: 0, blastRadius: 0, riskSum: 0 };
    
    existing.count++;
    existing.riskSum += event.riskScore || 50;
    
    // 重新计算 blast radius
    const blastResult = calculateBlastRadius(graph, targetId);
    existing.blastRadius = blastResult.totalBlastRadius;
    
    nodeChanges.set(targetId, existing);
  }
  
  // 计算热力分数
  const heatmap: Array<{ nodeId: string; heatScore: number }> = [];
  
  for (const [nodeId, data] of nodeChanges.entries()) {
    const nodeType = graph.getNodeType(nodeId);
    const avgRisk = data.riskSum / data.count;
    const riskWeight = avgRisk > 70 ? 1.5 : avgRisk > 40 ? 1.2 : 1.0;
    
    const heatScore = calculateHeatScore({
      changeFrequency: data.count / (timeWindow / (24 * 60 * 60 * 1000)), // 每天变更次数
      blastRadius: data.blastRadius,
      riskWeight,
      nodeType
    });
    
    heatmap.push({ nodeId, heatScore });
  }
  
  // 排序并添加排名
  return heatmap
    .sort((a, b) => b.heatScore - a.heatScore)
    .map((item, index) => ({ ...item, rank: index + 1 }));
}
```

### 1.4 最小实现路径

```bash
# Day 1: 数据结构 + 事件发射器
1. 在 core/graph/types.ts 添加 ChangeEvent/TraceEdge 类型
2. 在 core/storage/change-log.ts 实现事件持久化
3. 在 GraphStore.write() 中集成事件发射

# Day 2: 遍历算法 + Blast Radius
1. 实现 calculateBlastRadius() BFS 遍历
2. 添加下游依赖边索引 (depends_on, calls, updates)
3. 单元测试：验证遍历深度和准确性

# Day 3: 热力图 + 仪表盘集成
1. 实现 generateHeatmap() 聚合计算
2. 添加 CLI: openclaw graph heatmap --window=7d
3. 前端仪表盘热力图组件
```

---

## 优化 2: Interface Budget 动态权重 v2

### 2.1 模块映射

```
┌─────────────────────────────────────────────────────────────┐
│  Layer: Role Engine (core/role/)                            │
├─────────────────────────────────────────────────────────────┤
│  - interface-budget.ts: 预算计算核心                        │
│  - weights.ts: 权重矩阵配置                                 │
│  - types.ts: InterfaceCost, BudgetMetrics                   │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer: Graph Kernel (core/graph/)                          │
├─────────────────────────────────────────────────────────────┤
│  - edges.ts: 边类型识别                                     │
│  - contracts.ts: 契约类型识别                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 数据结构

```typescript
// core/role/types.ts

/** 边类型成本矩阵 */
export const EDGE_COST: Record<string, number> = {
  "depends_on": 1.0,      // 普通依赖
  "calls": 1.2,           // 调用关系
  "updates": 1.4,         // 数据更新 (高成本)
  "implements": 0.8,      // 实现接口 (低成本)
  "validates": 1.3,       // 验证关系
  "subscribes": 1.1,      // 事件订阅
  "owns": 0.5             // 所有权 (内部)
};

/** 契约类型成本矩阵 */
export const CONTRACT_COST: Record<string, number> = {
  "OpenAPI": 1.6,         // API 契约 (跨角色成本高)
  "DBSchema": 1.7,        // 数据库模式 (最高成本)
  "UIProps": 1.2,         // UI 组件 props
  "EventSchema": 1.5,     // 事件模式
  "ConfigSchema": 1.1     // 配置模式
};

/** 跨角色边 */
export interface CrossRoleEdge {
  id: string;
  from: { nodeId: string; roleId: string };
  to: { nodeId: string; roleId: string };
  edgeType: string;       // depends_on, calls, updates...
  contractType?: string;  // OpenAPI, DBSchema...
}

/** 接口成本明细 */
export interface InterfaceCost {
  edgeCost: number;       // 边成本
  contractCost: number;   // 契约成本
  riskMultiplier: number; // 风险乘数
  totalCost: number;      // 总成本
}

/** 预算指标 */
export interface BudgetMetrics {
  totalBudget: number;           // 总预算 (默认 100)
  usedBudget: number;            // 已用预算
  remainingBudget: number;       // 剩余预算
  utilizationRate: number;       // 使用率 (0-1)
  crossRoleEdges: number;        // 跨角色边数
  contractTouches: number;       // 契约触达数
  weightedCost: number;          // 加权成本
  riskAdjustedCost: number;      // 风险调整成本
}
```

### 2.3 关键算法

```typescript
// core/role/interface-budget.ts

import { EDGE_COST, CONTRACT_COST } from './weights';
import { GraphStore } from '../graph/graph-store';
import { OwnershipLattice } from '../ownership/lattice';

interface BudgetCalculationParams {
  roleId: string;
  graph: GraphStore;
  lattice: OwnershipLattice;
  timeWindow?: number;  // 可选：时间窗口内的变更
}

export function calculateInterfaceBudget(
  params: BudgetCalculationParams
): BudgetMetrics {
  const { roleId, graph, lattice, timeWindow } = params;
  
  // 获取角色的所有节点
  const roleNodes = graph.getNodesByRole(roleId);
  const roleNodeIds = new Set(roleNodes.map(n => n.id));
  
  let totalEdgeCost = 0;
  let totalContractCost = 0;
  let crossRoleEdgeCount = 0;
  let contractTouchCount = 0;
  
  // 遍历所有边，计算跨角色成本
  for (const node of roleNodes) {
    const edges = graph.getEdges(node.id);
    
    for (const edge of edges) {
      const targetRole = lattice.getOwner(edge.to);
      
      // 只计算跨角色边
      if (targetRole && targetRole !== roleId) {
        crossRoleEdgeCount++;
        
        const baseCost = EDGE_COST[edge.type] || 1.0;
        const riskWeight = calculateRiskWeight(graph, node.id, edge.to);
        
        totalEdgeCost += baseCost * riskWeight;
        
        // 如果边关联契约，累加契约成本
        if (edge.contractType) {
          contractTouchCount++;
          const contractCost = CONTRACT_COST[edge.contractType] || 1.0;
          totalContractCost += contractCost * riskWeight;
        }
      }
    }
  }
  
  // 计算总加权成本
  const weightedCost = totalEdgeCost + totalContractCost;
  
  // 风险调整 (基于历史变更失败率)
  const failureRate = getHistoricalFailureRate(roleId, timeWindow);
  const riskAdjustedCost = weightedCost * (1 + failureRate);
  
  // 预算指标
  const TOTAL_BUDGET = 100;  // 可配置
  
  return {
    totalBudget: TOTAL_BUDGET,
    usedBudget: Math.min(riskAdjustedCost, TOTAL_BUDGET),
    remainingBudget: Math.max(TOTAL_BUDGET - riskAdjustedCost, 0),
    utilizationRate: riskAdjustedCost / TOTAL_BUDGET,
    crossRoleEdges: crossRoleEdgeCount,
    contractTouches: contractTouchCount,
    weightedCost: Math.round(weightedCost * 100) / 100,
    riskAdjustedCost: Math.round(riskAdjustedCost * 100) / 100
  };
}

/** 计算风险权重 */
function calculateRiskWeight(
  graph: GraphStore,
  fromId: string,
  toId: string
): number {
  const fromNode = graph.getNode(fromId);
  const toNode = graph.getNode(toId);
  
  // 高风险节点类型
  const highRiskTypes = ['DBSchema', 'AuthModule', 'PaymentService'];
  
  if (highRiskTypes.includes(fromNode.type) || highRiskTypes.includes(toNode.type)) {
    return 1.5;
  }
  
  // 基于变更历史的风险
  const changeCount = graph.getChangeCount(toId, 7 * 24 * 60 * 60 * 1000);
  if (changeCount > 10) return 1.3;
  if (changeCount > 5) return 1.1;
  
  return 1.0;
}

/** 获取历史失败率 */
function getHistoricalFailureRate(roleId: string, timeWindow?: number): number {
  // 从变更日志中统计失败/回滚比例
  // 简化实现：返回固定值，实际应从 ChangeEvent 聚合
  return 0.1;  // 10% 失败率
}
```

### 2.4 最小实现路径

```bash
# Day 1: 权重矩阵 + 基础计算
1. 在 core/role/weights.ts 定义 EDGE_COST/CONTRACT_COST
2. 实现 calculateInterfaceBudget() 核心函数
3. 单元测试：验证权重计算准确性

# Day 2: 集成 + CLI
1. 在 Role Engine 中集成预算计算
2. 添加 CLI: openclaw role budget --role=xxx --export=json
3. 仪表盘预算卡片组件
```

---

## 优化 3: Role Contract Pack 语义化 Diff

### 3.1 模块映射

```
┌─────────────────────────────────────────────────────────────┐
│  Layer: Contract Pack (core/contract/)                      │
├─────────────────────────────────────────────────────────────┤
│  - diff.ts: 语义化 diff 引擎                                │
│  - semver.ts: 语义化版本管理                                │
│  - auto-commit.ts: Git 自动提交                             │
│  - changelog.ts: 变更说明生成                               │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer: DoD Guard (core/dod/)                               │
├─────────────────────────────────────────────────────────────┤
│  - gate.ts: 审批门禁检查                                    │
│  - validators.ts: 契约验证器                                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 数据结构

```typescript
// core/contract/types.ts

/** 契约类型 */
export type ContractType = 'OpenAPI' | 'DBSchema' | 'UIProps' | 'EventSchema';

/** 语义化 diff 结果 */
export interface ContractDiff {
  contractType: ContractType;
  version: {
    before: string;  // semver
    after: string;   // semver
    bump: 'major' | 'minor' | 'patch' | null;
  };
  changes: {
    added: DiffItem[];
    removed: DiffItem[];
    modified: DiffItem[];
  };
  breaking: boolean;        // 是否破坏性变更
  requiresApproval: boolean; // 是否需要审批
  changelog: string;        // 变更说明
}

/** Diff 项 */
export interface DiffItem {
  path: string;             // JSON Path 或 Schema Path
  type: string;             // 变更类型 (field/method/table/etc)
  description: string;      // 人类可读描述
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
}

/** OpenAPI 特定 diff */
export interface OpenAPIDiff extends ContractDiff {
  contractType: 'OpenAPI';
  changes: {
    added: Array<{ path: string; method: string; schema: any }>;
    removed: Array<{ path: string; method: string }>;
    modified: Array<{ path: string; method: string; schemaDiff: any }>;
  };
}

/** DB Schema 特定 diff */
export interface DBSchemaDiff extends ContractDiff {
  contractType: 'DBSchema';
  changes: {
    added: Array<{ table: string; columns: any[]; indexes: any[] }>;
    removed: Array<{ table: string }>;
    modified: Array<{ table: string; columnsDiff: any; indexesDiff: any }>;
  };
  migration?: {
    up: string;
    down: string;
  };
}
```

### 3.3 关键算法

#### 3.3.1 OpenAPI 语义化 Diff

```typescript
// core/contract/diff-openapi.ts

import { OpenAPIDiff, DiffItem } from './types';
import { parseOpenAPI } from './parsers';

export function diffOpenAPI(
  before: string,
  after: string,
  beforeVersion: string,
  afterVersion: string
): OpenAPIDiff {
  const beforeSpec = parseOpenAPI(before);
  const afterSpec = parseOpenAPI(after);
  
  const changes: OpenAPIDiff['changes'] = {
    added: [],
    removed: [],
    modified: []
  };
  
  let bumpType: 'major' | 'minor' | 'patch' | null = null;
  let breaking = false;
  
  // 比较 paths
  const beforePaths = new Set(Object.keys(beforeSpec.paths || {}));
  const afterPaths = new Set(Object.keys(afterSpec.paths || {}));
  
  // 新增 path
  for (const path of afterPaths) {
    if (!beforePaths.has(path)) {
      const methods = Object.keys(afterSpec.paths[path]);
      for (const method of methods) {
        changes.added.push({
          path,
          method,
          schema: afterSpec.paths[path][method]
        });
      }
    }
  }
  
  // 删除 path (破坏性)
  for (const path of beforePaths) {
    if (!afterPaths.has(path)) {
      const methods = Object.keys(beforeSpec.paths[path]);
      for (const method of methods) {
        changes.removed.push({ path, method });
      }
      breaking = true;
      bumpType = 'major';
    }
  }
  
  // 修改 path
  for (const path of afterPaths) {
    if (beforePaths.has(path)) {
      const beforeMethods = beforeSpec.paths[path];
      const afterMethods = afterSpec.paths[path];
      
      for (const method of Object.keys(afterMethods)) {
        if (beforeMethods[method]) {
          const schemaDiff = compareSchemas(beforeMethods[method], afterMethods[method]);
          
          if (schemaDiff.hasChanges) {
            changes.modified.push({
              path,
              method,
              schemaDiff: schemaDiff
            });
            
            // 检查是否破坏性变更
            if (schemaDiff.breaking) {
              breaking = true;
              if (bumpType !== 'major') bumpType = 'minor';
            } else if (bumpType === null) {
              bumpType = 'patch';
            }
          }
        }
      }
    }
  }
  
  // 生成 changelog
  const changelog = generateChangelog('OpenAPI', changes, bumpType);
  
  return {
    contractType: 'OpenAPI',
    version: {
      before: beforeVersion,
      after: afterVersion,
      bump: bumpType
    },
    changes,
    breaking,
    requiresApproval: breaking || bumpType === 'major',
    changelog
  };
}

function compareSchemas(before: any, after: any): { hasChanges: boolean; breaking: boolean } {
  // 简化实现：检查必填字段、类型变化等
  const breakingChanges = [
    '删除必填字段',
    '字段类型变更',
    '添加必填字段',
    '约束收紧'
  ];
  
  // 实际实现需要深入比较 schema
  const hasChanges = JSON.stringify(before) !== JSON.stringify(after);
  const breaking = false; // 需要详细比较逻辑
  
  return { hasChanges, breaking };
}
```

#### 3.3.2 语义化版本 Bump

```typescript
// core/contract/semver.ts

export function bumpVersion(
  currentVersion: string,
  bumpType: 'major' | 'minor' | 'patch'
): string {
  const match = currentVersion.match(/^v?(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
  
  if (!match) {
    throw new Error(`Invalid semver: ${currentVersion}`);
  }
  
  let [, major, minor, patch, prerelease] = match;
  
  switch (bumpType) {
    case 'major':
      major = String(parseInt(major) + 1);
      minor = '0';
      patch = '0';
      break;
    case 'minor':
      minor = String(parseInt(minor) + 1);
      patch = '0';
      break;
    case 'patch':
      patch = String(parseInt(patch) + 1);
      break;
  }
  
  const newVersion = `${major}.${minor}.${patch}`;
  return prerelease ? `${newVersion}-${prerelease}` : newVersion;
}

export function determineBumpType(diff: ContractDiff): 'major' | 'minor' | 'patch' | null {
  if (diff.breaking) return 'major';
  if (diff.changes.added.length > 0) return 'minor';
  if (diff.changes.modified.length > 0) return 'patch';
  if (diff.changes.removed.length > 0) return 'major';
  return null;
}
```

#### 3.3.3 Git Auto-Commit

```typescript
// core/contract/auto-commit.ts

import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

interface AutoCommitParams {
  contractPath: string;
  diff: ContractDiff;
  authorRoleId: string;
  commitMessage?: string;
}

export async function autoCommit(params: AutoCommitParams): Promise<{
  success: boolean;
  commitHash?: string;
  error?: string;
}> {
  const { contractPath, diff, authorRoleId } = params;
  
  try {
    // 1. 更新版本号文件
    if (diff.version.bump) {
      const newVersion = bumpVersion(diff.version.before, diff.version.bump);
      await updateVersionFile(contractPath, newVersion);
    }
    
    // 2. 生成 commit message
    const commitMessage = params.commitMessage || generateCommitMessage(diff);
    
    // 3. Git add
    await execAsync(`git add ${contractPath}`);
    
    // 4. Git commit
    const { stdout } = await execAsync(
      `git commit -m "${commitMessage}" --author="${authorRoleId} <system@openclaw.local>"`
    );
    
    // 5. 提取 commit hash
    const hashMatch = stdout.match(/\[([^\]]+)\s+([a-f0-9]{7})\]/);
    const commitHash = hashMatch ? hashMatch[2] : undefined;
    
    return { success: true, commitHash };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function generateCommitMessage(diff: ContractDiff): string {
  const bump = diff.version.bump || 'patch';
  const type = diff.contractType;
  
  const prefix = {
    'major': 'BREAKING',
    'minor': 'feat',
    'patch': 'fix'
  }[bump];
  
  return `${prefix}(${type}): ${diff.changelog.split('\n')[0]}`;
}
```

### 3.4 最小实现路径

```bash
# Day 1: OpenAPI/DBSchema 解析器 + Diff 引擎
1. 实现 parseOpenAPI() / parseDBSchema()
2. 实现 diffOpenAPI() / diffDBSchema()
3. 单元测试：验证 diff 准确性

# Day 2: Semver + Auto-Commit
1. 实现 bumpVersion() / determineBumpType()
2. 实现 autoCommit() Git 集成
3. 添加 CLI: openclaw contract diff --from=v1 --to=v2

# Day 3: Changelog + 审批集成
1. 实现 generateChangelog()
2. 与 DoD Gate 集成 (requiresApproval → 审批流程)
3. 前端 diff 可视化组件
```

---

## 优化 4: Role KPI Dashboard

### 4.1 模块映射

```
┌─────────────────────────────────────────────────────────────┐
│  Layer: Role Engine (core/role/)                            │
├─────────────────────────────────────────────────────────────┤
│  - kpi.ts: KPI 计算引擎                                     │
│  - metrics.ts: 指标采集                                     │
│  - actions.ts: KPI→动作策略                                 │
│  - cli.ts: CLI export                                       │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer: Storage (core/storage/)                             │
├─────────────────────────────────────────────────────────────┤
│  - kpi-store.ts: KPI 时间序列存储                           │
│  - export.ts: Prometheus/Grafana 导出                       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 数据结构

```typescript
// core/role/kpi-types.ts

/** KPI 时间窗口 */
export type KPIWindow = '30m' | '2h' | '1d' | '7d';

/** KPI 指标快照 */
export interface RoleKPISnapshot {
  roleId: string;
  timestamp: number;
  window: KPIWindow;
  
  // 核心指标
  throughput: number;           // 完成任务数 / 小时
  failureRate: number;          // 失败数 / 总任务 (0-1)
  reworkRate: number;           // 重复打开/回滚占比 (0-1)
  queuePressure: number;        // queue_len / maxQueueLen
  conflictRate: number;         // 冲突次数 / 变更次数 (0-1)
  driftIndex: number;           // 漂移指数 (0-1)
  
  // 派生指标
  healthScore: number;          // 健康分数 (0-100)
  trend: 'improving' | 'stable' | 'degrading';
  
  // 元数据
  taskCount: number;
  changeCount: number;
}

/** KPI 时间序列 (用于 Prometheus) */
export interface RoleKPITimeseries {
  metric: string;
  labels: Record<string, string>;
  values: Array<{ timestamp: number; value: number }>;
}

/** KPI→动作策略 */
export interface KPIActionPolicy {
  condition: (kpi: RoleKPISnapshot) => boolean;
  action: 'suggest_split' | 'suggest_merge' | 'suggest_reassign' | 'alert';
  message: string;
  priority: 'low' | 'medium' | 'high';
}
```

### 4.3 关键算法

#### 4.3.1 漂移指数 (Drift Index)

```typescript
// core/role/kpi-drift.ts

import { jsd } from 'simple-statistics';  // Jensen-Shannon Divergence

interface Distribution {
  [category: string]: number;  // 概率分布 (和为 1)
}

/**
 * 计算任务类型分布与角色能力包分布的 KL/JS 散度
 * 漂移指数越高，说明角色在做不擅长的事
 */
export function calculateDriftIndex(
  taskTypeDistribution: Distribution,
  capabilityDistribution: Distribution
): number {
  // 确保两个分布有相同的键
  const allKeys = new Set([
    ...Object.keys(taskTypeDistribution),
    ...Object.keys(capabilityDistribution)
  ]);
  
  const p: number[] = [];
  const q: number[] = [];
  
  for (const key of allKeys) {
    p.push(taskTypeDistribution[key] || 0.001);  // 避免 log(0)
    q.push(capabilityDistribution[key] || 0.001);
  }
  
  // 归一化
  const pSum = p.reduce((a, b) => a + b, 0);
  const qSum = q.reduce((a, b) => a + b, 0);
  
  const pNorm = p.map(x => x / pSum);
  const qNorm = q.map(x => x / qSum);
  
  // JS Divergence (0-1, 0=完全相同, 1=完全不同)
  const drift = jsd(pNorm, qNorm);
  
  return Math.round(drift * 1000) / 1000;
}

/**
 * 从任务历史构建任务类型分布
 */
export function buildTaskTypeDistribution(
  tasks: Array<{ type: string; completedAt: number }>,
  window: number
): Distribution {
  const cutoff = Date.now() - window;
  const typeCounts: Record<string, number> = {};
  let total = 0;
  
  for (const task of tasks) {
    if (task.completedAt >= cutoff) {
      typeCounts[task.type] = (typeCounts[task.type] || 0) + 1;
      total++;
    }
  }
  
  const distribution: Distribution = {};
  for (const [type, count] of Object.entries(typeCounts)) {
    distribution[type] = count / total;
  }
  
  return distribution;
}
```

#### 4.3.2 KPI 计算引擎

```typescript
// core/role/kpi-engine.ts

import { RoleKPISnapshot, KPIWindow } from './kpi-types';
import { calculateDriftIndex, buildTaskTypeDistribution } from './kpi-drift';

const WINDOW_MS: Record<KPIWindow, number> = {
  '30m': 30 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000
};

export function calculateRoleKPI(
  roleId: string,
  window: KPIWindow = '1d'
): RoleKPISnapshot {
  const windowMs = WINDOW_MS[window];
  
  // 从存储/事件流中获取数据
  const tasks = getTasksByRole(roleId, windowMs);
  const changes = getChangesByRole(roleId, windowMs);
  const queueState = getQueueState(roleId);
  
  // Throughput: 完成任务数 / 小时
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const throughput = completedTasks / (windowMs / (60 * 60 * 1000));
  
  // Failure Rate
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const failureRate = tasks.length > 0 ? failedTasks / tasks.length : 0;
  
  // Rework Rate
  const reworkedTasks = tasks.filter(t => t.reworkCount > 0).length;
  const reworkRate = tasks.length > 0 ? reworkedTasks / tasks.length : 0;
  
  // Queue Pressure
  const queuePressure = queueState.currentLength / queueState.maxLength;
  
  // Conflict Rate
  const conflictChanges = changes.filter(c => c.conflict).length;
  const conflictRate = changes.length > 0 ? conflictChanges / changes.length : 0;
  
  // Drift Index
  const taskDist = buildTaskTypeDistribution(tasks, windowMs);
  const capabilityDist = getCapabilityDistribution(roleId);
  const driftIndex = calculateDriftIndex(taskDist, capabilityDist);
  
  // Health Score (加权平均)
  const healthScore = calculateHealthScore({
    throughput,
    failureRate,
    reworkRate,
    queuePressure,
    conflictRate,
    driftIndex
  });
  
  // Trend (与前一个窗口比较)
  const previousKPI = getPreviousKPI(roleId, window);
  const trend = calculateTrend(healthScore, previousKPI?.healthScore || 0);
  
  return {
    roleId,
    timestamp: Date.now(),
    window,
    throughput: Math.round(throughput * 100) / 100,
    failureRate: Math.round(failureRate * 1000) / 1000,
    reworkRate: Math.round(reworkRate * 1000) / 1000,
    queuePressure: Math.round(queuePressure * 100) / 100,
    conflictRate: Math.round(conflictRate * 1000) / 1000,
    driftIndex: Math.round(driftIndex * 1000) / 1000,
    healthScore: Math.round(healthScore),
    trend,
    taskCount: tasks.length,
    changeCount: changes.length
  };
}

function calculateHealthScore(metrics: {
  throughput: number;
  failureRate: number;
  reworkRate: number;
  queuePressure: number;
  conflictRate: number;
  driftIndex: number;
}): number {
  // 权重配置
  const weights = {
    throughput: 0.2,      // 越高越好
    failureRate: 0.25,    // 越低越好
    reworkRate: 0.15,     // 越低越好
    queuePressure: 0.15,  // 越低越好
    conflictRate: 0.15,   // 越低越好
    driftIndex: 0.1       // 越低越好
  };
  
  // 归一化到 0-100
  let score = 100;
  score -= metrics.failureRate * 100 * weights.failureRate;
  score -= metrics.reworkRate * 100 * weights.reworkRate;
  score -= metrics.queuePressure * 100 * weights.queuePressure;
  score -= metrics.conflictRate * 100 * weights.conflictRate;
  score -= metrics.driftIndex * 100 * weights.driftIndex;
  
  // Throughput 奖励 (可选)
  if (metrics.throughput > 5) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function calculateTrend(current: number, previous: number): 'improving' | 'stable' | 'degrading' {
  const delta = current - previous;
  if (delta > 5) return 'improving';
  if (delta < -5) return 'degrading';
  return 'stable';
}
```

#### 4.3.3 KPI→动作策略

```typescript
// core/role/kpi-actions.ts

import { RoleKPISnapshot, KPIActionPolicy } from './kpi-types';

export const KPI_POLICIES: KPIActionPolicy[] = [
  {
    // 队列压力过高 → 建议 Split
    condition: (kpi) => kpi.queuePressure > 1.2,
    action: 'suggest_split',
    message: `角色 ${kpi.roleId} 队列压力过高 (${kpi.queuePressure.toFixed(2)}), 建议拆分职责`,
    priority: 'high'
  },
  {
    // 漂移指数高 + 失败率上升 → 建议重新分配
    condition: (kpi) => kpi.driftIndex > 0.35 && kpi.failureRate > 0.2,
    action: 'suggest_reassign',
    message: `角色 ${kpi.roleId} 漂移指数高 (${kpi.driftIndex.toFixed(2)}), 任务类型与能力不匹配`,
    priority: 'high'
  },
  {
    // 冲突率高 → 收紧所有权
    condition: (kpi) => kpi.conflictRate > 0.15,
    action: 'alert',
    message: `角色 ${kpi.roleId} 冲突率高 (${kpi.conflictRate.toFixed(2)}), 建议收紧 ownership 规则`,
    priority: 'medium'
  },
  {
    // 返工率高 → 建议审查 DoD
    condition: (kpi) => kpi.reworkRate > 0.25,
    action: 'alert',
    message: `角色 ${kpi.roleId} 返工率高 (${kpi.reworkRate.toFixed(2)}), 建议审查 DoD 门禁`,
    priority: 'medium'
  }
];

export function evaluateKPITriggers(kpi: RoleKPISnapshot): KPIActionPolicy[] {
  return KPI_POLICIES.filter(policy => policy.condition(kpi));
}
```

### 4.4 CLI Export

```typescript
// core/role/kpi-cli.ts

import { RoleKPISnapshot, RoleKPITimeseries } from './kpi-types';

/** 导出为 Prometheus 格式 */
export function exportPrometheus(kpis: RoleKPISnapshot[]): string {
  const lines: string[] = [];
  
  for (const kpi of kpis) {
    const labels = `role="${kpi.roleId}",window="${kpi.window}"`;
    
    lines.push(`role_kpi_throughput{${labels}} ${kpi.throughput}`);
    lines.push(`role_kpi_failure_rate{${labels}} ${kpi.failureRate}`);
    lines.push(`role_kpi_rework_rate{${labels}} ${kpi.reworkRate}`);
    lines.push(`role_kpi_queue_pressure{${labels}} ${kpi.queuePressure}`);
    lines.push(`role_kpi_conflict_rate{${labels}} ${kpi.conflictRate}`);
    lines.push(`role_kpi_drift_index{${labels}} ${kpi.driftIndex}`);
    lines.push(`role_kpi_health_score{${labels}} ${kpi.healthScore}`);
  }
  
  return lines.join('\n');
}

/** 导出为 JSONL (时间序列) */
export function exportJSONL(kpis: RoleKPISnapshot[]): string {
  return kpis.map(kpi => JSON.stringify(kpi)).join('\n');
}

/** 导出为快照 JSON */
export function exportSnapshot(kpis: RoleKPISnapshot[]): string {
  return JSON.stringify({
    timestamp: Date.now(),
    roles: kpis
  }, null, 2);
}
```

### 4.5 最小实现路径

```bash
# Day 1: KPI 计算引擎
1. 实现 calculateRoleKPI() 核心函数
2. 实现 calculateDriftIndex() JS 散度
3. 单元测试：验证指标计算

# Day 2: CLI + Export
1. 添加 CLI: openclaw role kpi --role=xxx --export=prometheus|jsonl|snapshot
2. 实现 exportPrometheus() / exportJSONL()
3. 集成到定时任务 (heartbeat)

# Day 3: 仪表盘 + 策略
1. 前端 KPI 卡片组件
2. 实现 KPI_POLICIES 策略评估
3. 触发建议 (不自动执行，仅提示)
```

---

## 优化 5: DoD 门禁的 LLM 防误改护栏

### 5.1 模块映射

```
┌─────────────────────────────────────────────────────────────┐
│  Layer: Ownership Lattice (core/ownership/)                 │
├─────────────────────────────────────────────────────────────┤
│  - gates.ts: 权限门禁                                       │
│  - proposals.ts: 提案管理                                   │
│  - state-machine.ts: Contract 状态机                        │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer: DoD Guard (core/dod/)                               │
├─────────────────────────────────────────────────────────────┤
│  - compile-gate.ts: 编译前检查                              │
│  - validators.ts: 契约验证器                                │
└─────────────────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer: Role Engine (core/role/)                            │
├─────────────────────────────────────────────────────────────┤
│  - authorities.ts: 角色权限定义                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 数据结构

```typescript
// core/ownership/types.ts

/** Contract 状态 */
export type ContractState = 'draft' | 'approved' | 'rejected';

/** Contract 状态机 */
export interface ContractStateMachine {
  id: string;                    // Contract ID
  currentState: ContractState;
  version: string;               // 当前版本
  history: StateTransition[];
}

/** 状态转换 */
export interface StateTransition {
  from: ContractState;
  to: ContractState;
  actorRoleId: string;
  timestamp: number;
  reason?: string;
}

/** 权限规则 */
export interface ContractPermissionRule {
  contractType: string;          // OpenAPI, DBSchema...
  action: 'read' | 'write' | 'propose' | 'approve' | 'reject';
  allowedRoles: string[];        // 允许的角色
  conditions?: Condition[];      // 附加条件
}

/** 条件 */
export interface Condition {
  type: 'risk_below' | 'auto_approve' | 'requires_review';
  value: any;
}

/** 提案 */
export interface ContractProposal {
  id: string;
  contractId: string;
  proposerRoleId: string;
  state: 'pending' | 'approved' | 'rejected';
  diff: ContractDiff;
  submittedAt: number;
  reviewedAt?: number;
  reviewerRoleId?: string;
  reviewComment?: string;
}
```

### 5.3 关键算法

#### 5.3.1 Contract 状态机

```typescript
// core/ownership/state-machine.ts

import { ContractStateMachine, ContractState, StateTransition } from './types';

const VALID_TRANSITIONS: Record<ContractState, ContractState[]> = {
  'draft': ['approved', 'rejected'],
  'approved': ['draft'],      // 可以回退到 draft 进行修改
  'rejected': ['draft']       // 可以重新提交
};

export class ContractStateMachine {
  private state: ContractStateMachine;
  
  constructor(contractId: string, initialState: ContractState = 'draft') {
    this.state = {
      id: contractId,
      currentState: initialState,
      version: '0.0.0',
      history: []
    };
  }
  
  canTransition(to: ContractState): boolean {
    return VALID_TRANSITIONS[this.state.currentState].includes(to);
  }
  
  transition(
    to: ContractState,
    actorRoleId: string,
    reason?: string
  ): { success: boolean; error?: string } {
    if (!this.canTransition(to)) {
      return {
        success: false,
        error: `Cannot transition from ${this.state.currentState} to ${to}`
      };
    }
    
    const transition: StateTransition = {
      from: this.state.currentState,
      to,
      actorRoleId,
      timestamp: Date.now(),
      reason
    };
    
    this.state.history.push(transition);
    this.state.currentState = to;
    
    // 如果是 approve, bump 版本
    if (to === 'approved') {
      this.state.version = this.bumpVersion();
    }
    
    return { success: true };
  }
  
  private bumpVersion(): string {
    // 从历史中计算版本
    const approvedCount = this.state.history.filter(t => t.to === 'approved').length;
    return `1.0.${approvedCount}`;
  }
  
  getState(): ContractStateMachine {
    return { ...this.state };
  }
}
```

#### 5.3.2 权限门禁

```typescript
// core/ownership/gates.ts

import { ContractPermissionRule, ContractProposal } from './types';
import { OwnershipLattice } from './lattice';

export class ContractGate {
  constructor(
    private lattice: OwnershipLattice,
    private rules: ContractPermissionRule[]
  ) {}
  
  /**
   * 检查是否允许对 contract 进行写操作
   */
  checkWritePermission(
    contractId: string,
    actorRoleId: string,
    contractType: string
  ): { allowed: boolean; reason?: string; proposalRequired?: boolean } {
    // 查找适用规则
    const rule = this.rules.find(r => 
      r.contractType === contractType && r.action === 'write'
    );
    
    if (!rule) {
      return { allowed: false, reason: 'No rule found' };
    }
    
    // 检查是否 Architect 角色
    const isArchitect = this.lattice.hasAuthority(actorRoleId, 'architect');
    
    if (isArchitect) {
      return { allowed: true };
    }
    
    // 非 Architect: 只能 propose
    return {
      allowed: false,
      reason: 'Non-Architect roles can only propose contract changes',
      proposalRequired: true
    };
  }
  
  /**
   * 检查是否可以 approve 提案
   */
  checkApprovePermission(
    proposal: ContractProposal,
    actorRoleId: string
  ): { allowed: boolean; reason?: string } {
    const isArchitect = this.lattice.hasAuthority(actorRoleId, 'architect');
    
    if (!isArchitect) {
      return {
        allowed: false,
        reason: 'Only Architect roles can approve contract changes'
      };
    }
    
    if (proposal.state !== 'pending') {
      return {
        allowed: false,
        reason: `Proposal is already ${proposal.state}`
      };
    }
    
    return { allowed: true };
  }
  
  /**
   * 检查是否可以自动批准 (低风险变更)
   */
  canAutoApprove(diff: ContractDiff): boolean {
    // 自动批准条件:
    // 1. 仅新增 optional 字段
    // 2. 不删字段、不改类型、不改语义约束
    // 3. 风险评分 < 20
    
    if (diff.breaking) return false;
    if (diff.changes.removed.length > 0) return false;
    
    // 检查修改是否只是添加 optional 字段
    for (const mod of diff.changes.modified) {
      if (mod.type === 'type_change') return false;
      if (mod.type === 'constraint_tighten') return false;
    }
    
    const riskScore = diff.riskScore || 50;
    return riskScore < 20;
  }
}
```

#### 5.3.3 DoD 编译门禁

```typescript
// core/dod/compile-gate.ts

import { ContractGate } from '../ownership/gates';
import { ContractProposal } from '../ownership/types';

interface CompileGateParams {
  contractId: string;
  proposals: ContractProposal[];
  runtimeDependencies: string[];  // 运行路径中引用的 contract
}

export function checkCompileGate(
  params: CompileGateParams,
  gate: ContractGate
): { allowed: boolean; errors: string[] } {
  const { contractId, proposals, runtimeDependencies } = params;
  const errors: string[] = [];
  
  // 检查是否存在 draft contract 且被运行路径引用
  const draftProposals = proposals.filter(p => 
    p.contractId === contractId && p.state === 'pending'
  );
  
  for (const proposal of draftProposals) {
    if (runtimeDependencies.includes(contractId)) {
      errors.push(
        `Contract ${contractId} has pending changes but is referenced in runtime path. ` +
        `Must be approved before compilation.`
      );
    }
  }
  
  // 检查所有依赖的 contract 是否都是 approved 状态
  for (const depId of runtimeDependencies) {
    const depProposals = proposals.filter(p => p.contractId === depId);
    const hasApproved = depProposals.some(p => p.state === 'approved');
    const hasOnlyPending = depProposals.length > 0 && !hasApproved;
    
    if (hasOnlyPending) {
      errors.push(
        `Dependency contract ${depId} has no approved version. ` +
        `Cannot compile with pending-only contracts.`
      );
    }
  }
  
  return {
    allowed: errors.length === 0,
    errors
  };
}
```

### 5.4 最小实现路径

```bash
# Day 1: 状态机 + 提案管理
1. 实现 ContractStateMachine 类
2. 实现 ContractProposal 存储
3. 添加 CLI: openclaw contract propose --id=xxx --diff=...

# Day 2: 权限门禁
1. 实现 ContractGate.checkWritePermission()
2. 实现 ContractGate.checkApprovePermission()
3. 集成到 Ownership Lattice write 规则

# Day 3: DoD 编译门禁
1. 实现 checkCompileGate()
2. 集成到 compile/runtime preview 流程
3. 实现 canAutoApprove() 低风险自动批准
```

---

## 版本里程碑 v0.8.5 交付清单

### 代码交付

| 模块 | 文件 | 状态 |
|------|------|------|
| Graph Kernel | `core/graph/types.ts` | ✅ |
| Graph Kernel | `core/graph/traversal.ts` | ✅ |
| Graph Kernel | `core/graph/heatmap.ts` | ✅ |
| Storage | `core/storage/change-log.ts` | ✅ |
| Role Engine | `core/role/weights.ts` | ✅ |
| Role Engine | `core/role/interface-budget.ts` | ✅ |
| Role Engine | `core/role/kpi-engine.ts` | ✅ |
| Role Engine | `core/role/kpi-drift.ts` | ✅ |
| Role Engine | `core/role/kpi-actions.ts` | ✅ |
| Contract Pack | `core/contract/diff-openapi.ts` | ✅ |
| Contract Pack | `core/contract/diff-dbschema.ts` | ✅ |
| Contract Pack | `core/contract/semver.ts` | ✅ |
| Contract Pack | `core/contract/auto-commit.ts` | ✅ |
| Ownership | `core/ownership/state-machine.ts` | ✅ |
| Ownership | `core/ownership/gates.ts` | ✅ |
| DoD Guard | `core/dod/compile-gate.ts` | ✅ |

### CLI 命令

```bash
# 变更流可视化
openclaw graph heatmap --window=7d --export=png
openclaw graph trace --node=xxx --depth=3

# Interface Budget
openclaw role budget --role=xxx --export=json
openclaw role budget --all --compare

# Contract Diff
openclaw contract diff --from=v1.0.0 --to=v1.1.0 --contract=OpenAPI
openclaw contract propose --id=api-gateway --diff=...
openclaw contract approve --proposal=xxx

# Role KPI
openclaw role kpi --role=xxx --window=1d --export=prometheus
openclaw role kpi --all --export=snapshot
openclaw role kpi --triggers  # 显示触发的策略建议
```

### 仪表盘组件

- [ ] 变更热力图 (按 blast radius 着色)
- [ ] Interface Budget 使用率卡片
- [ ] Role KPI Dashboard (6 指标雷达图)
- [ ] Contract 状态机可视化
- [ ] 提案审批队列

### 测试覆盖

- [ ] ChangeEvent 发射 + 持久化
- [ ] Blast Radius 遍历准确性
- [ ] Interface Budget 权重计算
- [ ] Contract Diff 语义化准确性
- [ ] KPI 指标计算
- [ ] Drift Index JS 散度
- [ ] Contract 状态机转换
- [ ] 门禁权限检查

---

## 附录：配置示例

### Interface Budget 权重配置

```yaml
# config/interface-budget.yaml
edgeCosts:
  depends_on: 1.0
  calls: 1.2
  updates: 1.4
  implements: 0.8
  validates: 1.3

contractCosts:
  OpenAPI: 1.6
  DBSchema: 1.7
  UIProps: 1.2
  EventSchema: 1.5

riskThresholds:
  high: 70    # ×1.5
  medium: 40  # ×1.2
  low: 0      # ×1.0
```

### KPI 策略配置

```yaml
# config/kpi-policies.yaml
policies:
  - name: queue_pressure_split
    condition: queuePressure > 1.2
    duration: 3  # 持续 3 个周期
    action: suggest_split
    priority: high

  - name: drift_reassign
    condition: driftIndex > 0.35 && failureRate > 0.2
    action: suggest_reassign
    priority: high

  - name: conflict_tighten
    condition: conflictRate > 0.15
    action: alert
    message: "建议收紧 ownership 规则"
    priority: medium
```

### Contract 自动批准规则

```yaml
# config/auto-approve.yaml
enabled: true
rules:
  - contractType: OpenAPI
    conditions:
      - onlyAddOptionalFields: true
      - noTypeChanges: true
      - noConstraintTighten: true
      - riskScoreBelow: 20
    autoApprove: true

  - contractType: UIProps
    conditions:
      - onlyAddFields: true
      - noRemovedFields: true
      - riskScoreBelow: 15
    autoApprove: true
```

---

**文档版本**: 1.0  
**最后更新**: 2026-03-29  
**维护者**: ASF V4.0 Architecture Team
