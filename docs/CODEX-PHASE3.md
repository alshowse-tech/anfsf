# ANFSF 前端优化 — Phase 3: SSE 实时 + 验证钻取

> **日期**: 2026-06-30 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase 1 (API 层已定义 SSE/Verification 类型)
> **预估**: 2 天
> **对应计划缺口**: ⑫-⑬

---

## 1. 目标

1. **PipelineProgress**: 轮询 → SSE 实时
2. **VerifyPanel**: 新增可折叠验证工具详情
3. **useSSE hook**: 扩展事件类型

---

## 2. PipelineProgress 改造 — SSE 迁移

**替换策略**: 保留现有组件结构，将 polling 逻辑替换为 `useSSE` hook。

### 改动要点

```typescript
// 删除:
// const POLL_MS = 1000;
// const interval logic

// 新增 import:
import { useSSE } from '../hooks/useSSE';

// 在组件内替换:
const [data, setData] = useState<PipelineStatus | null>(null);
// ... polling useEffect ...
// 替换为:
const { events, connected } = useSSE(runId);
const [data, setData] = useState<PipelineStatus | null>(null);

useEffect(() => {
  if (events.length === 0) return;
  const lastEvent = events[events.length - 1];
  if (lastEvent.status || lastEvent.steps) {
    setData(prev => ({
      ...prev,
      steps: lastEvent.steps || prev?.steps || [],
      status: lastEvent.status || prev?.status || 'running',
      // 保留 polling 回退：如果 SSE 断开，10s 后用 HTTP 补数据
    }));
  }
}, [events]);

// SSE 断开回退轮询:
useEffect(() => {
  if (connected || !runId) return;
  const timer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/pipeline/${runId}/status`);
      if (res.ok) setData(await res.json());
    } catch {}
  }, 10000); // 10s fallback
  return () => clearInterval(timer);
}, [connected, runId]);
```

### SSE 连接指示器

在 header 区增加绿色连接指示器:

```typescript
// 在 <div className="flex items-center justify-between"> 内:
<div className="flex items-center gap-2">
  <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
  <span className="text-xs text-gray-400">{connected ? '实时' : '轮询中'}</span>
</div>
```

**SSE 断开时自动回退**: `useSSE` 已有指数退避 + jitter 重连逻辑。前端展示 `connected` 状态。断开 10 秒回退到 HTTP polling。重连成功时自动切回 SSE。

### `grid-cols-4` 移动端修复

```typescript
// 原:
<div className="grid grid-cols-4 gap-3">
// 改为:
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
```

---

## 3. VerifyPanel — 验证工具详情

### 新增区块

在"State Actions"下方新增可折叠区块:

```typescript
const [showGuardDetails, setShowGuardDetails] = useState(false);
const [guardResults, setGuardResults] = useState<VerificationGuardResult[]>([]);

// 从 step 列表提取验证工具结果
useEffect(() => {
  if (!projectId) return;
  fetch(`${API_BASE}/api/v1/pipeline/${projectId}/status`)
    .then(r => r.json())
    .then(run => {
      const steps = run.steps || [];
      const guards = steps
        .filter(s => s.name?.startsWith('verify:'))
        .map(s => ({
          tool: s.name.replace('verify:', ''),
          passed: s.status === 'ok',
          errors: [],
          warnings: [],
          durationMs: s.duration || 0,
        } as VerificationGuardResult));
      setGuardResults(guards);
    })
    .catch(() => {});
}, [projectId]);
```

### 可折叠区块 UI

```typescript
<div className="bg-white rounded-lg shadow p-4">
  <button
    onClick={() => setShowGuardDetails(!showGuardDetails)}
    className="flex items-center justify-between w-full text-sm font-medium text-gray-700">
    <span>验证工具详情 ({guardResults.length})</span>
    <span>{showGuardDetails ? '▲' : '▼'}</span>
  </button>

  {showGuardDetails && (
    <div className="mt-3 space-y-2">
      {guardResults.length === 0 ? (
        <p className="text-sm text-gray-500 py-2 text-center">暂无可用的验证结果</p>
      ) : guardResults.map((g, i) => (
        <div key={i} className="border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-mono font-medium">{g.tool}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              g.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>{g.passed ? '通过' : '未通过'}</span>
          </div>
          {g.durationMs > 0 && (
            <p className="text-xs text-gray-400 mt-1">耗时: {(g.durationMs / 1000).toFixed(1)}s</p>
          )}
          {g.errors.length > 0 && (
            <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
              {g.errors.map((e, j) => (
                <p key={j} className="text-xs text-red-600 font-mono">
                  {e.file}:{e.line}:{e.column} — {e.message}
                </p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )}
</div>
```

注意: 需导入 `VerificationGuardResult` 类型:
```typescript
import type { VerificationGuardResult } from '../api/types';
```

### `grid-cols-2` 移动端修复

```typescript
// 原 line 58:
<div className="grid grid-cols-2 gap-4">
// 改为:
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
```

---

## 4. useSSE hook — 扩展事件类型

```typescript
// 新增类型:
export interface VerificationEvent {
  tool: string;
  passed: boolean;
  errors: Array<{ file: string; line: number; message: string }>;
  durationMs: number;
}

// SSEMessage 扩展:
interface SSEMessage {
  status?: string;
  steps?: Array<{ name: string; duration: number; status: string }>;
  verification?: VerificationEvent;   // NEW
}

// 在 event listener 中新增:
es.addEventListener('verification', (e) => {
  try {
    const data = JSON.parse(e.data) as SSEMessage;
    setEvents((prev) => [...prev, data]);
  } catch { /* ignore */ }
});
```

---

## 5. 验证清单

```bash
cd web && npm run build        # 零类型错误

# 手动验证
# 1. 触发 synthesize → PipelineProgress 出现绿色"实时"指示器
# 2. 断开网络 → 指示器变灰 → 恢复后重新变绿
# 3. 完成后 → /verify 展开"验证工具详情"
# 4. 看到 4 个 guard 卡片: tsc-compile / code-quality / hallucination / security
# 5. 手机模式下 PipelineProgress 2 列、VerifyPanel 1 列
```
