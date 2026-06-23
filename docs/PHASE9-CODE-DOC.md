# ANFSF Agent Loop 开发文档 — Phase 9: 进化管道集成

> **日期**: 2026-06-23 | **状态**: 📋 待 CODEX 执行
> **执行方**: CODEX
> **前置**: Phase 4 (沙箱), Phase 5 (DevFixLoop), Phase 6 (TestGenLoop), Phase 7 (多Agent)
> **预估**: 5 天

---

## 1. 目标

将 7 个 Evolution 模块 + EvolutionHarness + KPI Dashboard + CanaryDeployer 全部接入运行时。这是 ANFSF Agent Loop 开发的最后一个 Phase, 目标是将运行时接入率从当前 35% 提升到 70%。

**当前 Pipeline 状态**: 仅 `stage1_parsing → stage1_done`

**Phase 9 后 Pipeline**:
```
stage1_parsing → stage1_done
  → stage2_dev (DevFixLoop webhook)
    → stage3_testing (TestGenLoop)
      → stage4_verify (全量验证: tsc + quality + hallucination + security)
        → stage5_release (CanaryDeployer + ABTestRunner)
          → stage5_done → EvolutionHarness.introspect()
```

---

## 2. 实现清单

### 2.1 修改文件

| 文件 | 改动说明 |
|------|---------|
| `src/harness/evolution-harness.ts` | 接入 PipelineStateMachine `onEnter('stage5_done')` |
| `src/core/evolution/introspection-engine.ts` | 接入 Agent Loop 验证反馈 + CompileLearningDB |
| `src/core/evolution/rollback-manager.ts` | 接入版本管理 (revert to last good state) |
| `src/harness/kpi-dashboard.ts` | 接入 Prometheus 指标 + 实时 WebSocket |
| `src/harness/canary-deployer.ts` | 接入部署管道 (Canary + AB Test) |
| `src/server/index.ts` | 初始化 EvolutionHarness + KPI Dashboard |
| `src/pipeline/pipeline-state-machine.ts` | 扩展 `TRANSITION_TABLE` (已支持全状态, 只需激活) |

### 2.2 不需要修改的文件 (已完整实现, 直接使用)
- `src/core/evolution/framework.ts` — 进化框架
- `src/core/evolution/offline-optimizer.ts` — 离线优化
- `src/core/evolution/freeze-manager.ts` — 冻结管理
- `src/core/evolution/backend-architect.ts` (534行) — 后端架构推理
- `src/core/evolution/frontend-architect.ts` (409行) — 前端架构推理
- `src/core/evolution/ast-backwrite-engine.ts` (491行) — AST 回写
- `src/harness/ab-test-runner.ts` (164行) — AB 测试运行器

---

## 3. 详细设计

### 3.1 Pipeline 状态扩展

```typescript
// src/pipeline/pipeline-state-machine.ts

// TRANSITION_TABLE 已支持完整的嵌套循环拓扑 (在 Phase 2.4.5 文档中有描述)
// Phase 9 激活以下转换:

// 新增 onEnter callbacks:
const evolutionCallbacks = {
  stage1_done: async (ctx) => {
    // After initial code generation, trigger stage2_dev
    // (DevFixLoop webhook watches for git pushes)
    ctx.sm.transition('stage2_dev');
  },
  stage2_dev: async (ctx) => {
    // After developer commits pass verification, trigger testing
    ctx.sm.transition('stage3_testing');
  },
  stage3_testing: async (ctx) => {
    // After tests pass, trigger full verification
    ctx.sm.transition('stage4_verify');
  },
  stage4_verify: async (ctx) => {
    // Full verification gate: tsc + quality + hallucination + security
    const gateResult = await ctx.runVerificationGate();
    if (gateResult.passed) {
      ctx.sm.transition('stage5_release');
    } else {
      ctx.sm.transition('stage2_dev');  // Loop back for fixes
    }
  },
  stage5_release: async (ctx) => {
    // Canary deploy + AB test
    const deployResult = await ctx.canaryDeployer.deploy(ctx.release);
    if (deployResult.healthy) {
      ctx.sm.transition('stage5_done');
    } else {
      // Rollback
      await ctx.rollbackManager.revert(ctx.release.version);
      ctx.sm.transition('stage2_dev');
    }
  },
  stage5_done: async (ctx) => {
    // Evolution introspection
    await ctx.evolutionHarness.introspect(ctx.release);
    // Update KPI dashboard
    await ctx.kpiDashboard.recordRelease(ctx.release);
  },
};
```

### 3.2 IntrospectionEngine 接入

```typescript
// 每个 Agent Loop 完成后自动调用的反馈回路:
// 1. CodeGenerationLoop.run() → 记录编译错误模式 → CompileLearningDB
// 2. DevFixLoop.run() → 记录修复成功率 → EvolutionHarness
// 3. TestGenLoop.run() → 记录测试覆盖率 → EvolutionHarness

// EvolutionHarness.introspect():
async introspect(release): Promise<IntrospectionReport> {
  // 1. CompileLearningDB 查询 — 高频错误模式
  const errorPatterns = await compileLearningDB.getFrequentErrors(release.projectType);

  // 2. Agent memory 检索 — 成功的修复策略
  const fixStrategies = await agentMemory.query({
    tier: 'semantic',
    query: `fix strategies for ${release.projectType}`,
    limit: 10,
  });

  // 3. LLM-based introspection — 评估生成质量
  const llmReview = await this.introspectionEngine.review({
    generatedCode: release.code,
    errors: release.allErrors,
    tokenUsage: release.tokenUsage,
    fixSuccessRate: release.fixSuccessRate,
  });

  // 4. 反馈注入 — 更新 KnowledgeBridge
  await knowledgeBridge.inject({
    patterns: errorPatterns,
    strategies: fixStrategies,
    review: llmReview,
    expiresAt: Date.now() + 7 * 24 * 3600 * 1000, // 1 week
  });

  return {
    errorPatterns,
    fixStrategies,
    llmReview,
    recommendations: llmReview.recommendations,
  };
}
```

### 3.3 RollbackManager 接入

```typescript
// src/core/evolution/rollback-manager.ts

class RollbackManager {
  /**
   * Revert to last known-good state if verification gate fails.
   */
  async revert(projectName: string, version: string): Promise<void> {
    // 1. Find last passing version in freeze-manager
    const lastGood = this.freezeManager.getLastPassing(projectName);
    if (!lastGood) throw new Error('No good version to revert to');

    // 2. Git reset to last good commit
    await this.git.reset(projectName, lastGood.commitSha);

    // 3. Restore frozen state (schema + contracts + config)
    await this.freezeManager.restore(projectName, lastGood.version);

    // 4. Log rollback event
    await this.kpiDashboard.recordRollback({
      project: projectName,
      fromVersion: version,
      toVersion: lastGood.version,
      reason: 'Verification gate failed',
      timestamp: Date.now(),
    });
  }
}
```

### 3.4 CanaryDeployer 接入

```typescript
// src/harness/canary-deployer.ts

class CanaryDeployer {
  async deploy(release: Release): Promise<CanaryResult> {
    // 1. Deploy to canary environment (10% traffic)
    const canaryUrl = await this.deployCanary(release);

    // 2. Health check (compile + basic E2E)
    const healthCheck = await this.runHealthCheck(canaryUrl);
    if (!healthCheck.passed) {
      return { healthy: false, reason: healthCheck.error };
    }

    // 3. AB test (if configured)
    if (release.abTest) {
      const abResult = await this.abTestRunner.run({
        controlUrl: release.currentUrl,
        experimentUrl: canaryUrl,
        metrics: ['latency', 'error_rate', 'user_satisfaction'],
        duration: 3600_000,  // 1 hour
      });

      if (!abResult.significant) {
        return { healthy: true, note: 'AB test: no significant difference' };
      }
      if (abResult.experimentBetter) {
        // Promote canary to 100%
        await this.promoteCanary(release);
      }
    }

    return { healthy: true };
  }
}
```

### 3.5 KPI Dashboard 接入

```typescript
// src/harness/kpi-dashboard.ts

class KPIDashboard {
  // Prometheus metrics (already in cost-management system)
  // Phase 9 adds:

  async recordRelease(release: Release): void {
    // Record these metrics to Prometheus:
    // - `anfsf_release_total{project, status}` — counter
    // - `anfsf_generation_duration_seconds{project}` — histogram
    // - `anfsf_verification_errors{project, type}` — gauge
    // - `anfsf_token_usage{project, phase}` — counter
    // - `anfsf_fix_success_rate{project}` — gauge
    // - `anfsf_test_coverage{project}` — gauge
    // - `anfsf_evolution_introspection_triggered_total` — counter
  }

  // Real-time WebSocket推送 (已有基础设施)
  async pushUpdate(event: string, data: unknown): void {
    this.wsServer.emit(event, data);
  }
}
```

### 3.6 server/index.ts 初始化

```typescript
import { EvolutionHarness } from '../harness/evolution-harness';
import { CanaryDeployer } from '../harness/canary-deployer';
import { ABTestRunner } from '../harness/ab-test-runner';
import { KPIDashboard } from '../harness/kpi-dashboard';
import { RollbackManager } from '../core/evolution/rollback-manager';
import { IntrospectionEngine } from '../core/evolution/introspection-engine';
import { FreezeManager } from '../core/evolution/freeze-manager';

// Evolution subsystem
const freezeManager = new FreezeManager({ /* DB */ });
const rollbackManager = new RollbackManager(freezeManager, { /* git client */ });
const introspectionEngine = new IntrospectionEngine(llm);
const canaryDeployer = new CanaryDeployer({ /* deploy config */ });
const abTestRunner = new ABTestRunner({ /* AB test config */ });
const kpiDashboard = new KPIDashboard({ /* WS server */ });

const evolutionHarness = new EvolutionHarness({
  introspectionEngine,
  rollbackManager,
  freezeManager,
  compileLearningDB,
  knowledgeBridge,
  agentMemory,
});

// Register onEnter callbacks on PipelineStateMachine
PipelineStateMachine.onEnter('stage5_done', async (ctx) => {
  await evolutionHarness.introspect(ctx.release);
  await kpiDashboard.recordRelease(ctx.release);
});

// Make available to routes
serverConfig.evolutionHarness = evolutionHarness;
serverConfig.kpiDashboard = kpiDashboard;
serverConfig.canaryDeployer = canaryDeployer;
```

---

## 4. 完整管道执行流

```
1. POST /api/v1/synthesize
   ├── PRD Quality Check
   ├── AINativePRDParser.parse()
   ├── [stage1_parsing] → [stage1_done]
   │
   ├── CodeGenerationLoop.run()         (骨架代码)
   ├── TaskGenerator.generate()         (TASK.md)
   ├── TestGenLoop.run()                (测试文件)
   │
   └── [stage1_done] → onEnter: stage2_dev

2. Developer commits (IDE)
   └── Gitea push → POST /api/v1/webhook/gitea
       └── DevFixLoop.run() → [stage2_dev] → onEnter: stage3_testing

3. Test Verification
   └── TestGenLoop.verify() (完整测试执行) → [stage3_testing] → onEnter: stage4_verify

4. Full Verification Gate
   ├── CompileValidator (tsc)
   ├── CodeQualityGuard (static analysis)
   ├── HallucinationGuard (consistency)
   ├── SecurityAuditor (OWASP Top 10)
   └── All passed → [stage4_verify] → onEnter: stage5_release

5. Release
   ├── CanaryDeployer (10% traffic)
   ├── ABTestRunner (if configured)
   ├── Promote canary → 100% or rollback
   └── [stage5_release] → onEnter: stage5_done

6. Evolution
   ├── IntrospectionEngine.review()
   ├── CompileLearningDB injection
   ├── KnowledgeBridge update
   └── KPI Dashboard record
```

---

## 5. 测试

### 5.1 现有测试 (确认通过)
- `src/core/evolution/__tests__/` — Evolution 模块测试
- `src/harness/__tests__/` — Harness 测试

### 5.2 新增测试

| 测试 | 文件 |
|------|------|
| Full pipeline E2E (PRD → stage5_done) | `pipeline-e2e.test.ts` (新建) |
| EvolutionHarness.introspect | `evolution-harness.test.ts` (已存在, 确认通过) |
| RollbackManager.revert | `rollback-manager.test.ts` (已存在, 确认通过) |
| CanaryDeployer.deploy | `canary-deployer.test.ts` (已存在, 确认通过) |
| KPIDashboard metrics | `kpi-dashboard.test.ts` (已存在, 确认通过) |
| PipelineStateMachine full transitions | `pipeline-state-machine.test.ts` (修改) |

---

## 6. 验证清单

```bash
npx tsc --noEmit
npx jest --testPathPattern="evolution|introspection|rollback|kpi|canary|pipeline" --forceExit
npm test

# 集成 E2E 测试:
# 1. 提交完整 PRD
# 2. 追踪 5 阶段管道执行
# 3. 验证 DevFixLoop webhook 触发
# 4. 验证 EvolutionHarness introspection
# 5. 验证 KPI Dashboard 指标更新
```

---

## 7. 各 Phase 交付物汇总

| Phase | 状态 | 文档 |
|-------|------|------|
| Phase 1 | ✅ 已完成 | [PHASE1-CODE-DOC.md](PHASE1-CODE-DOC.md) |
| Phase 2 | ✅ 已完成 | [PHASE2-CODE-DOC.md](PHASE2-CODE-DOC.md) |
| Phase 3 | 📋 待执行 | [PHASE3-CODE-DOC.md](PHASE3-CODE-DOC.md) |
| Phase 4 | 📋 待执行 | [PHASE4-CODE-DOC.md](PHASE4-CODE-DOC.md) |
| Phase 5 | 📋 待执行 | [PHASE5-CODE-DOC.md](PHASE5-CODE-DOC.md) |
| Phase 6 | 📋 待执行 | [PHASE6-CODE-DOC.md](PHASE6-CODE-DOC.md) |
| Phase 7 | 📋 待执行 | [PHASE7-CODE-DOC.md](PHASE7-CODE-DOC.md) |
| Phase 8 | 📋 待执行 | [PHASE8-CODE-DOC.md](PHASE8-CODE-DOC.md) |
| Phase 9 | 📋 待执行 | [PHASE9-CODE-DOC.md](PHASE9-CODE-DOC.md) |

---

## 8. 最终里程碑

| 指标 | 当前值 | Phase 9 后目标 |
|------|--------|---------------|
| 运行时接入率 | 35% | 70% |
| 验证工具数 | 1 (Phase 1: 4) | 4 |
| 13步工作流覆盖 | 5/13 | 11/13 |
| Agent Loop 子类接入 | 1/3 | 3/3 |
| Skills 运行时加载 | 0/18 | 18/18 |
| Harnesses 接入 | 0/9 | 6/9 |
| Pipeline 活跃状态转换 | 2/18 | 8/18 |
| LLM 工具数 | 0 → 4 (Phase 2) | 4+ |
| 沙箱执行 | 无 | 配置文件+Bash隔离 |
| 多 Agent 并行 | 无 | 有 (PRD>5 features 自动触发) |
| 测试通过率 | 99.1% | 99.5%+ |
