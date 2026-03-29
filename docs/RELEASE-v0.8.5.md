# ASF V4.0 v0.8.5 Release Notes

**Release Date**: 2026-03-29  
**Version**: 0.8.5  
**Status**: ✅ Complete

---

## 🎉 Overview

v0.8.5 transforms 5 architectural optimization proposals into production-ready code. This release includes:

- **28 core modules** (~9,500 lines)
- **6 unit test suites** 
- **4 React components**
- **3 YAML configurations**
- **Full CI/CD pipeline**
- **Complete API documentation**

---

## 🚀 New Features

### 1. Change Flow Visualization (Graph Kernel)

Track and visualize how changes propagate through your architecture.

```typescript
// Calculate blast radius
const blast = calculateBlastRadius(graph, 'api-gateway-v1');
// → { directImpact: 3, indirectImpact: 7, totalBlastRadius: 10 }

// Generate heatmap
const heatmap = generateHeatmap(graph, changeEvents, { window: '7d' });
// → Sorted by heat score: freq × blastRadius × riskWeight
```

**Files**: `src/core/graph/{types,traversal,heatmap,events}.ts`

---

### 2. Interface Budget v2

Calculate cross-role dependency costs with weighted edge types.

```typescript
// Weight matrices
EDGE_COST = { updates: 1.4, calls: 1.2, depends_on: 1.0 }
CONTRACT_COST = { DBSchema: 1.7, OpenAPI: 1.6, UIProps: 1.2 }

// Calculate budget
const budget = calculateInterfaceBudget({ roleId, graph, lattice });
// → { utilizationRate: 0.67, crossRoleEdges: 15, status: 'warning' }
```

**Files**: `src/core/role/{weights,interface-budget}.ts`

---

### 3. Semantic Contract Diff

Automated diff for OpenAPI and DB schemas with migration SQL generation.

```typescript
// OpenAPI diff
const diff = diffOpenAPI(oldSpec, newSpec, '1.0.0', '1.1.0');
// → { breaking: false, bump: 'minor', changelog: '...' }

// DB Schema diff with migration
const diff = diffDBSchema(oldSchema, newSchema, '1.0.0', '1.1.0');
// → { migration: { up: 'ALTER TABLE...', down: '...' } }
```

**Files**: `src/core/contract/diff-{openapi,dbschema}.ts`

---

### 4. Role KPI Dashboard

Monitor role health with 6 metrics and drift index.

```typescript
// Calculate KPI
const kpi = await calculateRoleKPI('backend-team', dataSource, '1d');
// → { healthScore: 72, driftIndex: 0.28, trend: 'stable' }

// Export to Prometheus
const metrics = exportKPI(kpis, 'prometheus');
```

**Metrics**:
- Throughput (tasks/hour)
- Failure Rate (%)
- Rework Rate (%)
- Queue Pressure
- Conflict Rate (%)
- Drift Index (JSD 0-1)

**Files**: `src/core/role/kpi-{engine,export}.ts`

---

### 5. Dual-Gate Approval System

Two-layer protection for contract changes.

```
Gate 1: Ownership Lattice
  → Who can write? (Architect only)
  
Gate 2: DoD Compile Gate
  → What can compile? (Approved contracts only)
```

**State Machine**: `draft → approved/rejected`

**Files**: `src/core/ownership/{state-machine,gates}.ts`, `src/core/dod/compile-gate.ts`

---

## 🧪 Testing

### Unit Tests

```bash
npm test

# Coverage report
npm run test:coverage
```

**Coverage**: 6 test suites covering core algorithms

### Integration Tests

End-to-end workflow testing:
- Propose → Approve → Compile flow
- Auto-approve eligibility
- Compile gate blocking

**Files**: `src/__tests__/integration/ownership-flow.test.ts`

---

## 📦 Components

### React Components

| Component | Description |
|-----------|-------------|
| `HeatmapCard` | Change heatmap visualization |
| `KPICard` | Role KPI dashboard card |
| `ApprovalQueue` | Contract proposal queue |
| `BudgetComparison` | Budget utilization comparison |

---

## ⚙️ Configuration

### interface-budget.yaml

```yaml
edgeCosts:
  updates: 1.4
  calls: 1.2
contractCosts:
  DBSchema: 1.7
  OpenAPI: 1.6
```

### kpi-policies.yaml

```yaml
thresholds:
  queuePressure:
    critical: 1.2  # Triggers split suggestion
  driftIndex:
    critical: 0.35  # Triggers reassign suggestion
```

### auto-approve.yaml

```yaml
rules:
  - contractType: OpenAPI
    conditions:
      onlyAddOptionalFields: true
      riskScoreBelow: 20
    autoApprove: true
```

---

## 🔧 CLI Commands

```bash
# Graph operations
openclaw graph heatmap --window=7d
openclaw graph trace --node=api-gateway --depth=3

# Role operations
openclaw role budget --role=backend-team
openclaw role kpi --export=prometheus

# Contract operations
openclaw contract diff --from=v1.0.0 --to=v1.1.0
openclaw contract approve --proposal=prop-123
```

---

## 📈 Performance Optimizations

### Caching

```typescript
// LRU Cache
const cache = new LRUCache<string, BlastRadiusResult>(1000);

// TTL Cache
const ttlCache = new TTLCache<string, HeatmapData>(5 * 60 * 1000);

// Memoization
const expensiveFn = memoize(calculateBlastRadius);
```

### Batching

```typescript
// Batch processor for rapid writes
const batcher = new BatchProcessor<ChangeEvent, void>(
  async (events) => { await store.saveBatch(events); },
  { delay: 100, maxSize: 100 }
);
```

**Files**: `src/core/graph/cache.ts`

---

## 🚦 CI/CD Pipeline

GitHub Actions workflow:

```yaml
jobs:
  - typecheck    # TypeScript validation
  - lint         # ESLint
  - test         # Unit tests + coverage
  - build        # TypeScript compilation
  - integration  # E2E tests
  - security     # npm audit + Snyk
  - release      # Semantic release
```

**File**: `.github/workflows/ci.yml`

---

## 📚 Documentation

- **API Reference**: `docs/README.md`
- **Release Notes**: `docs/RELEASE-v0.8.5.md`
- **Implementation Tasks**: `specs/IMPLEMENTATION-TASKS-v0.8.5.md`
- **Optimization Spec**: `specs/ASF-V4.0-Optimization-v0.8.5.md`

---

## 🔢 Statistics

| Metric | Value |
|--------|-------|
| Total Files | 44 |
| Source Lines | ~14,300 |
| Test Files | 7 |
| Test Cases | 50+ |
| Git Commits | 6 |
| Development Time | ~4 hours |

---

## 🙏 Acknowledgments

This release implements 5 architectural optimization proposals:

1. ✅ ChangeEvent + Graph Trace + Heatmap
2. ✅ Interface Budget v2 (weighted edges)
3. ✅ Contract Semantic Diff + Semver
4. ✅ Role KPI Dashboard + Drift Index
5. ✅ Propose→Approve Dual-Gate System

---

## 📝 Upgrade Guide

### From v0.8.x

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy configuration files:
   ```bash
   cp config/*.yaml /your/config/path/
   ```

3. Update imports:
   ```typescript
   // Old
   import { calculateBudget } from 'old-module';
   
   // New
   import { calculateInterfaceBudget } from '@asf-v4/core/role';
   ```

---

## 🐛 Known Issues

None at this time.

---

## 🔮 Next Steps (v0.9.0)

- [ ] WebSocket real-time updates
- [ ] GraphQL API layer
- [ ] Mobile-responsive dashboard
- [ ] Advanced analytics (time series, trends)
- [ ] Plugin system for custom metrics

---

**Full changelog**: See Git history from commit `31159f9` to `HEAD`.
