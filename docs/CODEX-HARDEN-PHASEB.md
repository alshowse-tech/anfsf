# ANFSF 生产级硬化 — Phase B: 运维能力

> **日期**: 2026-07-02 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase A (认证重构后 middleware/auth.ts 可用)
> **预估**: 1 周（子任务: B1=0.5d, B2=1d, B3=0.1d, B4=0.1d, B5=1d）

---

## 1. 目标

将 ANFSF 的运维能力提升到生产级。大部分工作是"接线" — 代码已存在，只需在 `index.ts` 正确初始化。

---

## 2. B1: 优雅关闭

### 目标

当服务收到 SIGTERM（Docker stop / Kubernetes pod 终止）或 SIGINT（Ctrl+C）时，完成正在处理的请求后再退出。

### 实现

**文件**: `src/server/index.ts`

找到文件末尾的启动代码（当前为 `createServer().then(s => s.start())`），替换为:

```typescript
// === 替换以下代码 ===
// const argvPath = (process.argv[1] || '').replace(/\\/g, '/');
// if (argvPath.includes('server/index.ts') || argvPath.includes('server/index.js')) {
//   createServer().then(s => s.start()).catch(err => {
//     console.error('[startup] Failed to start ANFSF server:', err.message);
//     process.exit(1);
//   });
// }

// === 替换为 ===
async function main() {
  const server = await createServer();

  const shutdown = async (signal: string) => {
    console.log(`[server] Received ${signal}, starting graceful shutdown...`);

    // 30 秒超时保护 — 超过此时间强制退出
    const forceExit = setTimeout(() => {
      console.error('[server] Forced shutdown after 30s timeout');
      process.exit(1);
    }, 30_000);

    try {
      await server.stop();
      console.log('[server] Graceful shutdown complete');
    } catch (e) {
      console.error('[server] Shutdown error:', e);
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  await server.start();
}

const argvPath = (process.argv[1] || '').replace(/\\/g, '/');
if (argvPath.includes('server/index.ts') || argvPath.includes('server/index.js')) {
  main().catch(err => {
    console.error('[startup] Failed to start ANFSF server:', err.message);
    process.exit(1);
  });
}
```

### 验证

```bash
# 启动服务
npm run server

# 在新终端:
kill $(lsof -ti:3000)
# 日志应输出:
# [server] Received SIGTERM, starting graceful shutdown...
# [server] Graceful shutdown complete

# 验证超时保护:
# 在 server.stop() 中加 sleep(40s) → 30s 后强制退出
```

---

## 3. B2: OpenAPI/Swagger

### 3.1 新增依赖
```bash
npm install @fastify/swagger @fastify/swagger-ui
```

### 3.2 注册 Swagger 插件

**文件**: `src/server/index.ts`

在 route 注册之前（推荐在 `app.register(cors, ...)` 之后，`registerHealthRoutes` 之前）:

```typescript
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';

// 在 await app.register(sensible); 之后添加:
await app.register(swagger, {
  openapi: {
    info: {
      title: 'ANFSF API',
      version: '1.0.0',
      description: 'Agent OS Platform — Autonomous Non-Fungible Software Factory',
    },
    servers: [{ url: `http://localhost:${resolved.port}` }],
  },
});
await app.register(swaggerUi, {
  routePrefix: '/docs',
});
```

### 3.3 为核心路由添加 Schema

**文件**: `src/server/routes/synthesize.ts`

```typescript
export function registerSynthesizeRoute(app, store, serverConfig, llm, attachmentProcessor?): void {
  // JSON endpoint with schema
  app.post('/api/v1/synthesize', {
    schema: {
      description: '提交 PRD 文本，启动 Agent Loop 代码生成 pipeline',
      tags: ['synthesize'],
      body: {
        type: 'object',
        required: ['prdText'],
        properties: {
          prdText: { type: 'string', description: 'PRD 需求文本' },
          projectName: { type: 'string', description: '项目名称（可选）' },
        },
      },
      response: {
        202: {
          type: 'object',
          properties: {
            jobId: { type: 'string' },
            status: { type: 'string', enum: ['queued', 'running'] },
          },
        },
      },
    },
  }, handler);

  // Multipart endpoint
  app.post('/api/v1/synthesize/multipart', {
    schema: {
      description: '提交 PRD 文本 + 附件，启动 Agent Loop 代码生成 pipeline',
      tags: ['synthesize'],
      consumes: ['multipart/form-data'],
      // Fastify multipart schema via body
    },
  }, multipartHandler);
}
```

**文件**: `src/server/routes/pipeline.ts`

```typescript
app.get('/api/v1/pipeline/:id/status', {
  schema: {
    description: '获取 pipeline 运行状态',
    tags: ['pipeline'],
    params: {
      type: 'object', properties: { id: { type: 'string' } }, required: ['id'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' }, status: { type: 'string' },
          steps: { type: 'array' }, error: { type: 'string', nullable: true },
          startedAt: { type: 'number' }, completedAt: { type: 'number', nullable: true },
          projectName: { type: 'string', nullable: true },
        },
      },
    },
  },
}, handler);
```

**文件**: `src/server/routes/orchestrate.ts`

```typescript
app.get('/api/v1/orchestrate/status', {
  schema: {
    description: '获取多 Agent 编排状态',
    tags: ['orchestrate'],
    response: {
      200: {
        type: 'object',
        properties: {
          activeAgents: { type: 'number' },
          queuedMessages: { type: 'number' },
          registeredAgents: { type: 'number' },
        },
      },
    },
  },
}, handler);
```

### 3.4 验证

```bash
npx tsc --noEmit
npm test
# 手动验证:
# GET http://localhost:3001/docs → Swagger UI 渲染
# 在 UI 中尝试 /api/v1/pipeline/{id}/status
```

---

## 4. B3: Agent 记忆持久化启用

### 目标

AgentMemoryStore 当前在 `index.ts` 中被实例化时没有 `persistencePath`，记忆数据在重启后丢失。传入路径即可启用文件持久化。

### 实现

**文件**: `src/server/index.ts`

找到 `const agentMemory = new AgentMemoryStore();` 行，改为:

```typescript
// 原:
const agentMemory = new AgentMemoryStore();

// 改为:
const agentMemory = new AgentMemoryStore({
  persistencePath: '.anfsf/agent-memory.json',
});
```

### 验证

```bash
# 1. 启动服务 → 确保 .anfsf/agent-memory.json 被创建（空数据可写入）
# 2. 运行一个 synthesis → 触发记忆写入
# 3. 重启服务 → 数据保留
```

---

## 5. B4: EvolutionHarness 特性启用

### 目标

EvolutionHarness 当前 3 个特性全部设为 `false`，489 行代码死锁。启用它们。

### 实现

**文件**: `src/server/index.ts`

找到 `const evolutionHarness = new EvolutionHarness({...})` 行，将 3 个 `false` 改为 `true`:

```typescript
// 原:
const evolutionHarness = new EvolutionHarness({
  enableKPIOptimizer: false,
  enableDataFlywheel: false,
  enableProgressiveEvolution: false,
  kpiUpdateInterval: 300000,
  calibrationThreshold: 10,
});

// 改为:
const evolutionHarness = new EvolutionHarness({
  enableKPIOptimizer: true,
  enableDataFlywheel: true,
  enableProgressiveEvolution: true,
  kpiUpdateInterval: 300000,
  calibrationThreshold: 10,
});
```

### 验证

```bash
npx tsc --noEmit
npm test
# 手动: 启动 → 日志确认 "EvolutionHarness: KPI optimizer enabled"
# 观察 KPI 数据是否自动生成
```

---

## 6. B5: Token 预算持久化接入 Store

### 目标

`TokenBudget` 已有 `BudgetPersistence` 接口和 `save()`/`restore()` 方法，但当前没有连接到 `PipelineRunStore` 的 `saveBudgetRecords()`。连接后，预算数据将在 server 重启后恢复。

### 6.1 实现 BudgetPersistence 适配器

**新增文件**: `src/pipeline/budget-persistence-store.ts`

```typescript
import type { TokenUsageRecord, BudgetPersistence } from './token-budget';
import type { PipelineRunStore } from '../server/store';

export class StoreBudgetPersistence implements BudgetPersistence {
  constructor(
    private store: PipelineRunStore,
    private projectId: string,
  ) {}

  async restore(): Promise<TokenUsageRecord[] | null> {
    if (typeof this.store.loadBudgetRecords !== 'function') return null;
    return this.store.loadBudgetRecords(this.projectId) as Promise<TokenUsageRecord[] | null>;
  }

  async save(records: TokenUsageRecord[], totalUsed: number): Promise<void> {
    if (typeof this.store.saveBudgetRecords !== 'function') return;
    await this.store.saveBudgetRecords(this.projectId, records);
  }
}
```

### 6.2 接入 synthesize.ts

**文件**: `src/server/routes/synthesize.ts`

找到 `const budget = new TokenBudget(jobId, {...})` 处，传入 persistence:

```typescript
import { StoreBudgetPersistence } from '../../pipeline/budget-persistence-store';

// 现有:
const budget = new TokenBudget(jobId, {
  totalBudget: parseInt(process.env.TOKEN_BUDGET || '5000000', 10),
  warnThreshold: 0.7,
  blockThreshold: 0.9,
  hardBlockThreshold: 1.35,
});

// 改为:
const budget = new TokenBudget(jobId, {
  totalBudget: parseInt(process.env.TOKEN_BUDGET || '5000000', 10),
  warnThreshold: 0.7,
  blockThreshold: 0.9,
  hardBlockThreshold: 1.35,
}, new StoreBudgetPersistence(store as PipelineRunStore, jobId));
```

### 6.3 验证

```bash
npx tsc --noEmit
npm test
# 1. 运行 synthesize → 预算记录写入 store
# 2. 查询 token_budget_records 表（SQLite: sqlite3 .anfsf/runs.db "SELECT * FROM token_budget_records"）
# 3. 确认有数据行
```

---

## 7. 验证清单

```bash
# 0. 安装依赖
npm install @fastify/swagger @fastify/swagger-ui

# 1. 类型检查
npx tsc --noEmit

# 2. 测试
npm test

# 3. 优雅关闭测试
# 启动 → kill <pid> → 确认日志

# 4. Swagger 测试
# GET /docs → Swagger UI

# 5. 持久化测试
# 重启服务 → Agent 记忆 / Token 预算数据保留

# 6. Evolution 测试
# 启动日志确认特性启用到
```
