# ANFSF 前端优化 — Phase 1: API 层扩展

> **日期**: 2026-06-30 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase 0
> **预估**: 1 天
> **对应计划缺口**: ⑨

---

## 1. 目标

将所有后端 API 端点封装到前端类型和函数中。Phase 1 是 Phase 2-9 的唯一数据入口。封装完成后，所有新页面只需调用 `api/client.ts` 的函数，不再需要直接 `fetch()`。

---

## 2. 新增类型 (`web/src/api/types.ts`)

### 2.1 编排状态

```typescript
export interface OrchestrateStatus {
  activeAgents: number;
  queuedMessages: number;
  busStats: {
    messagesProcessed: number;
    avgLatencyMs: number;
  };
  registeredAgents: number;
  dagStatus: {
    tasks: number;
    completed: number;
    waves: string[][];
  };
}
```

### 2.2 技能与工具

```typescript
export interface SkillInfo {
  name: string;
  version: string;
  status: 'loaded' | 'error' | 'disabled';
  description?: string;
}

export interface ToolInfo {
  name: string;
  description: string;
  mode: 'readonly' | 'readwrite';
  requiresSandbox: boolean;
}

export interface ToolCallHistoryEntry {
  toolName: string;
  args: string; // JSON stringified
  result: string; // preview
  durationMs: number;
  timestamp: number;
}
```

### 2.3 Webhook / DevFixLoop

```typescript
export interface WebhookDelivery {
  deliveryId: string;
  commitSha: string;
  branch: string;
  repository: string;
  success: boolean;
  errors: number;
  warnings: number;
  autoFixed: number;
  message: string;
  timestamp: number;
}
```

### 2.4 验证工具逐项结果

```typescript
export interface VerificationError {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  rule: string;
  fixable: boolean;
}

export interface VerificationGuardResult {
  tool: string;             // 'tsc-compile' | 'code-quality-guard' | 'hallucination-guard' | 'security-auditor'
  passed: boolean;
  errors: VerificationError[];
  warnings: VerificationError[];
  durationMs: number;
}

export interface StepDetail {
  name: string;
  duration: number;
  status: 'ok' | 'error' | 'running' | 'pending';
  timestamp?: number;
}
```

### 2.5 项目相关

```typescript
export interface ProjectInfo {
  id: string;
  name: string;
  tenantId: string;
  projectState: string;
  createdAt: number;
}

export interface ProjectDetail extends ProjectInfo {
  description?: string;
  prdText: string;
  updatedAt: number;
}
```

### 2.6 指标分析

```typescript
export interface StageSummary {
  stage: string;
  avgDurationMs: number;
  p95DurationMs: number;
  failureRate: number;
  totalRuns: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  avgErrors: number;
  avgFixL1: number;
  avgFixL2: number;
  avgFixL3: number;
}

export interface BottleneckInfo {
  stage: string;
  avgDurationMs: number;
  p95DurationMs: number;
  failureRate: number;
  totalRuns: number;
}

export interface FixRecordInfo {
  id: string;
  projectId: string;
  level: 'L1' | 'L2' | 'L3';
  file: string;
  line: number;
  problemType: string;
  issueDescription: string;
  fixStatus: string;
}

export interface CompilePatternInfo {
  pattern: string;
  frequency: number;
  firstSeen: number;
  lastSeen: number;
  avgFixRound: number;
  commonFixHint?: string;
  projectTypes: string[];
}

export interface ComponentPatternInfo {
  name: string;
  propsSignature: string;
  occurrenceCount: number;
  projectType: string;
  firstSeen: number;
  lastSeen: number;
}
```

### 2.7 配置

```typescript
export interface LLMConfigData {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

export interface PipelineConfigData {
  maxRetries: number;
  llmTimeout: number;
  bottleneckThreshold: number;
}

export interface RolePermissionMap {
  role: string;
  permissions: string[];
}
```

---

## 3. 新增函数 (`web/src/api/client.ts`)

参考 `safeFetch` + `authHeaders()` 模式。每个函数使用 `safeFetch`。

```typescript
// === 编排 ===
export async function fetchOrchestrateStatus(): Promise<OrchestrateStatus> {
  const res = await safeFetch(`${API_BASE}/api/v1/orchestrate/status`, { headers: authHeaders() });
  return res.json();
}

export async function triggerOrchestrateRun(jobId: string): Promise<{ status: string; jobId: string; waves: number; totalTasks: number }> {
  const res = await safeFetch(`${API_BASE}/api/v1/orchestrate/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ jobId }),
  });
  return res.json();
}

// === 技能与工具 ===
export async function fetchSkills(): Promise<SkillInfo[]> {
  const res = await safeFetch(`${API_BASE}/api/v1/skills`, { headers: authHeaders() });
  return (await res.json()).skills ?? [];
}

export async function fetchTools(): Promise<ToolInfo[]> {
  const res = await safeFetch(`${API_BASE}/api/v1/tools`, { headers: authHeaders() });
  return (await res.json()).tools ?? [];
}

// === 项目 ===
export async function fetchProjects(): Promise<ProjectInfo[]> {
  const res = await safeFetch(`${API_BASE}/api/v1/projects`, { headers: authHeaders() });
  const data = await res.json();
  return data.projects ?? [];
}

export async function fetchProjectDetail(id: string): Promise<ProjectDetail> {
  const res = await safeFetch(`${API_BASE}/api/v1/projects/${encodeURIComponent(id)}`, { headers: authHeaders() });
  const data = await res.json();
  return data.project;
}

// === 验证钻取 ===
export async function fetchStepDetails(runId: string): Promise<StepDetail[]> {
  const run = await fetchRunDetail(runId);
  return (run.steps || []).filter(s => s.name && s.name.startsWith('verify:'));
}

// === 指标 ===
export async function fetchStageMetrics(): Promise<StageSummary[]> {
  const res = await safeFetch(`${API_BASE}/api/v1/knowledge/metrics/stages`, { headers: authHeaders() });
  return (await res.json()).stages ?? [];
}

export async function fetchBottlenecks(thresholdMs?: number): Promise<BottleneckInfo[]> {
  const params = thresholdMs ? `?thresholdMs=${thresholdMs}` : '';
  const res = await safeFetch(`${API_BASE}/api/v1/knowledge/metrics/bottlenecks${params}`, { headers: authHeaders() });
  return (await res.json()).bottlenecks ?? [];
}

export async function fetchCompilePatterns(): Promise<CompilePatternInfo[]> {
  const res = await safeFetch(`${API_BASE}/api/v1/knowledge/compile-patterns`, { headers: authHeaders() });
  return (await res.json()).patterns ?? [];
}

export async function fetchComponentPatterns(): Promise<ComponentPatternInfo[]> {
  const res = await safeFetch(`${API_BASE}/api/v1/knowledge/component-patterns`, { headers: authHeaders() });
  return (await res.json()).components ?? [];
}

// === 修复记录 ===
export async function fetchFixes(projectId?: string): Promise<FixRecordInfo[]> {
  const params = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
  const res = await safeFetch(`${API_BASE}/api/v1/feedback/fixes${params}`, { headers: authHeaders() });
  return (await res.json()).fixes ?? [];
}

// === 配置 ===
export async function fetchLLMConfig(): Promise<LLMConfigData> {
  const res = await safeFetch(`${API_BASE}/api/v1/config/llm`, { headers: authHeaders() });
  return res.json();
}

export async function updateLLMConfig(data: Partial<LLMConfigData>): Promise<void> {
  await safeFetch(`${API_BASE}/api/v1/config/llm`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
}

export async function fetchPipelineConfig(): Promise<PipelineConfigData> {
  const res = await safeFetch(`${API_BASE}/api/v1/config/pipeline`, { headers: authHeaders() });
  return res.json();
}

export async function updatePipelineConfig(data: Partial<PipelineConfigData>): Promise<void> {
  await safeFetch(`${API_BASE}/api/v1/config/pipeline`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
}
```

---

## 4. 后端骨架路由 (供 Phase 8 实现)

3 个配置路由在 Phase 8 完整实现，Phase 1 先建骨架避免 404：

### `src/server/routes/config-llm.ts`
```typescript
import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE = '.anfsf/llm-config.json';

export function registerLLMConfigRoutes(app: FastifyInstance): void {
  app.get('/api/v1/config/llm', async () => {
    try {
      const data = JSON.parse(fs.readFileSync(STORAGE, 'utf-8'));
      return data;
    } catch {
      return { apiKey: '', baseUrl: '', defaultModel: 'qwen3.5-plus' };
    }
  });

  app.put('/api/v1/config/llm', async (req) => {
    const body = req.body as { apiKey?: string; baseUrl?: string; defaultModel?: string };
    const dir = path.dirname(STORAGE);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(body, null, 2), 'utf-8');
    return { status: 'ok' };
  });
}
```

### `src/server/routes/config-pipeline.ts` — 同上模式
### `src/server/routes/skills.ts` — 返回技能列表

在 `src/server/index.ts` 中注册:
```typescript
import { registerLLMConfigRoutes } from './routes/config-llm';
import { registerPipelineConfigRoutes } from './routes/config-pipeline';
registerLLMConfigRoutes(app);
registerPipelineConfigRoutes(app);
```

---

## 5. 验证清单

```bash
cd web && npm run build        # 零类型错误
cd web && npm test             # 已有测试 + 新 smoke tests 通过

# 手动验证
# 1. 启动 server → 确认 GET /api/v1/skills 返回非 404
# 2. 启动 server → 确认 GET /api/v1/config/llm 返回 { apiKey:'', baseUrl:'', defaultModel:'' }
# 3. 所有前端组件原来用 fetch() 的地方现在改用 client 函数
```
