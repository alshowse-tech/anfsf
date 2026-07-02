# ANFSF Agent Loop 开发文档 — Phase 7: 多 Agent 协调

> **日期**: 2026-06-29 | **状态**: 📋 待 CODEX 执行
> **执行方**: CODEX
> **前置**: Phase 2 (工具系统), Phase 3 (工具调用循环)
> **预估**: 5 天

---

## 1. 目标

将已实现但未接入的 5 个多 Agent 协调模块全部接入运行时:
- `AgentOS` — Agent 生命周期管理
- `MCPBus` — Agent 间消息总线
- `CoordinationProtocol` — 任务委托 + 结果聚合
- `TaskDAGEngine` — DAG 任务分解 + 并行执行
- `OrchestrationHarness` — MCPBus + TaskDAG 编排

**目标工作流**:
```
大 PRD (>5 features) → TaskDAGEngine.decompose()
  ├── Feature A → Agent A (CodeGenerationLoop) ──┐
  ├── Feature B → Agent B (CodeGenerationLoop) ──┤ parallel wave
  ├── Feature C → Agent C (CodeGenerationLoop) ──┘
  ↓
  CoordinationProtocol.aggregate() → merge code files
  ↓
  全量编译验证 (tsc --noEmit on merged output)
  ↓
  TaskGenerator → per-feature TASK.md
```

---

## 2. 实现清单

### 2.1 新增文件

| 文件 | 说明 |
|------|------|
| `src/server/routes/orchestrate.ts` | 编排管理 API (GET /api/v1/orchestrate/status, POST /api/v1/orchestrate/run) |

### 2.2 修改文件

| 文件 | 改动说明 |
|------|---------|
| `src/server/index.ts` | 初始化 AgentOS + MCPBus + 注册 orchestrate 路由 |
| `src/server/routes/synthesize.ts` | 大PRD自动任务分解 (features > 5 → TaskDAGEngine) |
| `src/harness/orchestration-harness.ts` | 接入 PipelineStateMachine + AgentLoop |
| `src/agents/agent-os.ts` | 接入 CodeGenerationLoop 作为子 Agent 类型 |
| `src/core/task-dag/task-dag-engine.ts` | 验证与 Agent Loop 兼容性 |

### 2.3 不需要修改的文件 (已完整实现, 直接使用)
- `src/agents/agent-registry.ts` — Agent 元数据存储
- `src/agents/agent-state-machine.ts` — Agent 生命周期转换
- `src/agents/agent-health-monitor.ts` — 心跳健康追踪
- `src/agents/agent-memory.ts` — 三层记忆 (working/episodic/semantic)
- `src/agents/coordination-protocol.ts` — MCPBus 上的任务委托协议
- `src/mcp/mcp-bus.ts` — 发布/订阅消息总线

---

## 3. 详细设计

### 3.1 server/index.ts 初始化

```typescript
// 在服务器启动时:
import { MCPBus } from '../mcp/mcp-bus';
import { AgentOS } from '../agents/agent-os';
import { AgentRegistry } from '../agents/agent-registry';
import { AgentMemoryStore } from '../agents/agent-memory';
import { AgentHealthMonitor } from '../agents/agent-health-monitor';
import { OrchestrationHarness } from '../harness/orchestration-harness';
import { registerOrchestrateRoutes } from './routes/orchestrate';

const mcpBus = new MCPBus({
  defaultTTL: 30000,
  idempotencyEnabled: true,
  tracingEnabled: true,
});

const agentRegistry = new AgentRegistry();
const agentMemory = new AgentMemoryStore({ tiers: ['working', 'episodic', 'semantic'] });
const healthMonitor = new AgentHealthMonitor({ heartbeatIntervalMs: 5000 });

const agentOS = new AgentOS({
  mcpBus,
  registry: agentRegistry,
  memory: agentMemory,
  healthMonitor,
});

const orchestrationHarness = new OrchestrationHarness({
  agentOS,
  mcpBus,
  maxParallelAgents: 4,  // 最多 4 个并发生成
});

// 注册编排 API
registerOrchestrateRoutes(app, orchestrationHarness, store, serverConfig, llm);
```

### 3.2 synthesize.ts 大 PRD 分解

```typescript
// In runAgentPipeline(), after Step 2 (PRD Analysis):

if (allFeatures.length > 5) {
  // === MULTI-AGENT PATH ===
  store.emitStep(jobId, {
    name: `Multi-Agent: Decomposing ${allFeatures.length} features...`,
    status: 'ok',
  });

  // Step 2.5: Task decomposition
  const dag = taskDAGEngine.decompose({
    intent: projectName,
    features: allFeatures,
    deploymentForm: 'web' as const,
  });

  // Step 3: Parallel generation via OrchestrationHarness
  const parallelResults = await orchestrationHarness.executeParallel(
    dag,
    agentOS,
    llm,
    budget,
  );

  // Step 4: Merge results
  const mergedCode = orchestrationHarness.mergeResults(parallelResults);

  // Step 5: Full compilation verification on merged output
  const verifier = new VerificationRunner();
  const verifyResults = await verifier.runAll(outputDir);
  const errors = collectErrors(verifyResults);

  // If errors, attempt fix on merged code
  // ...

} else {
  // === SINGLE-AGENT PATH (existing) ===
  const agentLoop = new CodeGenerationLoop(llm, config, budget, extraTools, toolRegistry);
  const result = await agentLoop.run(spec, outputDir);
  // ...
}
```

### 3.3 OrchestrationHarness 执行

```typescript
// src/harness/orchestration-harness.ts

class OrchestrationHarness {
  async executeParallel(
    dag: TaskDAG,
    agentOS: AgentOS,
    llm: LLMClient,
    budget: TokenBudget,
  ): Promise<Map<string, AgentLoopResult>> {
    const results = new Map<string, AgentLoopResult>();
    const waves = dag.topologicalWaves();  // [[A,B], [C], [D,E]]

    for (const wave of waves) {
      // Each wave runs in parallel
      const wavePromises = wave.map(async (taskId) => {
        const task = dag.getTask(taskId);

        // Delegate to AgentOS
        const agentId = await agentOS.delegateTask({
          type: 'code-generation',
          input: task.spec,
          budget: budget.fork(task.estimatedTokens),
        });

        // Wait for result via MCPBus
        const result = await coordinationProtocol.awaitResult(agentId);
        return [taskId, result] as const;
      });

      const waveResults = await Promise.all(wavePromises);
      for (const [taskId, result] of waveResults) {
        results.set(taskId, result);
      }
    }

    return results;
  }

  mergeResults(results: Map<string, AgentLoopResult>): GeneratedCode {
    const allFiles: GeneratedFile[] = [];
    for (const result of results.values()) {
      if (result.output) {
        allFiles.push(...result.output.files);
      }
    }
    // Dedup by file path
    const deduped = new Map<string, GeneratedFile>();
    for (const f of allFiles) {
      deduped.set(f.path, f);
    }
    return { files: Array.from(deduped.values()) };
  }
}
```

### 3.4 TaskDAGEngine 兼容性

```typescript
// src/core/task-dag/task-dag-engine.ts

class TaskDAGEngine {
  /**
   * Decompose a RequirementSpec into a DAG of sub-tasks.
   * Each feature becomes a top-level task.
   * Cross-cutting concerns (shared types, DB schema) become dependency tasks.
   */
  decompose(spec: RequirementSpec): TaskDAG {
    const dag = new TaskDAG();

    // Shared dependencies first
    const sharedTask = dag.addTask({
      id: 'shared',
      name: 'Shared types + DB schema',
      spec: { ...spec, features: spec.features.filter(f => f.priority === 'P0') },
      estimatedTokens: 8192,
    });

    // Each feature as a parallel generation task
    for (const feature of spec.features) {
      const task = dag.addTask({
        id: feature.id,
        name: feature.name,
        spec: { ...spec, features: [feature] },
        estimatedTokens: 16384,
        dependsOn: [sharedTask.id],  // Must complete shared types first
      });
    }

    return dag;
  }
}
```

### 3.5 Orchestrate 管理 API

```typescript
// GET /api/v1/orchestrate/status
// Returns: active agents, pending tasks, health status

// POST /api/v1/orchestrate/run
// Body: { requirements: RequirementSpec }
// Triggers multi-agent decomposition + parallel execution
// Returns: { jobId, status: 'running' }
```

---

## 4. Agent 类型注册

```typescript
// src/agents/agent-os.ts 中:
agentRegistry.register({
  type: 'code-generation',
  displayName: 'Code Generation Agent',
  capabilities: ['typescript', 'nodejs', 'web-dev'],
  loopClass: CodeGenerationLoop,
  defaultConfig: { maxRetries: 2, maxTokens: 32768 },
});

agentRegistry.register({
  type: 'test-generation',
  displayName: 'Test Generation Agent',
  capabilities: ['testing', 'jest', 'playwright'],
  loopClass: TestGenLoop,
  defaultConfig: { maxRetries: 1, maxTokens: 16384 },
});
```

---

## 5. 消息流

```
                     ┌──────────────────┐
                     │  Orchestration   │
                     │    Harness       │
                     └────────┬─────────┘
                              │ MCPBus
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ Agent A  │   │ Agent B  │   │ Agent C  │
        │ (Feature │   │ (Feature │   │ (Feature │
        │  Auth)   │   │  CRUD)   │   │  UI)     │
        └────┬─────┘   └────┬─────┘   └────┬─────┘
             │               │               │
             └───────────────┼───────────────┘
                             │ MCPBus
                     ┌───────┴────────┐
                     │ Coordination   │
                     │   Protocol     │
                     └───────┬────────┘
                             │ aggregate()
                             ▼
                     ┌──────────────┐
                     │  Merged Code │
                     └──────────────┘
```

### MCP Message Flow (per agent):
```
1. AgentOS.delegateTask() → MCPBus.publish({type:'task_delegate', to:agentId, payload:task})

2. Agent receives → MCPBus.publish({type:'task_accept', to:'agentOS', payload:{agentId}})

3. Agent generates code → MCPBus.publish({type:'task_complete', to:'agentOS', payload:result})

4. CoordinationProtocol.awaitResult() → resolves with result
```

---

## 6. 测试

### 6.1 现有测试 (确认通过)
- `src/agents/__tests__/` — AgentOS/AgentRegistry/StateMachine tests
- `src/mcp/__tests__/` — MCPBus tests
- `src/core/task-dag/__tests__/` — TaskDAGEngine tests

### 6.2 新增测试

| 测试 | 文件 |
|------|------|
| OrchestrationHarness.executeParallel | `orchestration-harness.test.ts` (新建) |
| Multi-agent merge results | 同上 |
| synthesize multi-agent path (>5 features) | `synthesize.test.ts` (修改) |
| synthesize single-agent path (backward compat) | 同上 |
| Orchestrate API routes | `orchestrate.test.ts` (新建) |

---

## 7. 验证清单

```bash
npx tsc --noEmit
npx jest --testPathPattern="agent-os|mcp-bus|coordination|task-dag|orchestration" --forceExit
npm test

# 集成测试: 提交 10-feature PRD → 验证多 Agent 并行生成
curl -X POST http://localhost:3001/api/v1/orchestrate/run \
  -H "Content-Type: application/json" \
  -d '{"requirements": {"intent":"电商平台", "features":[...10 features...]}}'
# → 验证多个 Agent 并行生成
# → 验证结果合并
# → 验证全量编译通过
```
