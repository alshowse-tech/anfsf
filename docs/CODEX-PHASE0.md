# ANFSF 前端优化 — Phase 0: 基础设施加固

> **日期**: 2026-06-30 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: 无
> **预估**: 6 天
> **对应计划缺口**: ①-⑧

---

## 1. 目标

解决 8 个基础设施缺口，作为所有后续 Phase 的地基。核心产出：

1. **数据持久化** — `ProjectRegistry` 和 `WebhookRegistry` 从纯内存改为 JSON 文件持久化
2. **Token 安全** — 4 个组件从 `localStorage` 统一到 `sessionStorage`
3. **错误韧性** — `429`/`Retry-After` 处理 + 4 个静默错误组件修复
4. **工程基建** — Vitest 测试框架 + ZIP 导出 + 移动端快速修复

---

## 2. 实现清单

### 2.1 后端：数据持久化

#### ProjectRegistry 持久化 (`src/pipeline/project.ts`)

**现状**: 纯 `Map<string, Project>`，重启全部丢失。

**改动**:
```typescript
import * as fs from 'fs';
const STORAGE_PATH = '.anfsf/projects.json';

export class ProjectRegistry {
  private projects: Map<string, Project> = new Map();

  constructor() {
    this.load(); // 构造时自动加载
  }

  // 新增方法
  save(): void {
    const dir = path.dirname(STORAGE_PATH);
    fs.mkdirSync(dir, { recursive: true });
    const data = JSON.stringify(Array.from(this.projects.entries()), null, 2);
    fs.writeFileSync(STORAGE_PATH, data, 'utf-8');
  }

  load(): void {
    try {
      if (fs.existsSync(STORAGE_PATH)) {
        const raw = fs.readFileSync(STORAGE_PATH, 'utf-8');
        const entries: [string, Project][] = JSON.parse(raw);
        this.projects = new Map(entries);
      }
    } catch (e) {
      console.warn('[ProjectRegistry] Failed to load projects:', e);
      this.projects = new Map();
    }
  }

  // 修改现有方法：每次变更后调用 save()
  create(name, prdText, tenantId): Project {
    // ... 现有逻辑不变 ...
    this.save(); // 新增
    return project;
  }

  updateState(id, state): boolean {
    // ... 现有逻辑 ...
    this.save(); // 新增
  }

  remove(id): boolean {
    // ... 现有逻辑 ...
    this.save(); // 新增
  }
}
```

**文件位置**: `src/pipeline/project.ts`
**验证**: 重启服务器后 `getProjectRegistry().list()` 返回重启前数据

#### WebhookRegistry 持久化 (`src/pipeline/webhook.ts`)

**现状**: 纯 `const _webhooks: WebhookRegistration[] = []`，重启丢失。

**改动**: 同理 `ProjectRegistry` 模式，但保留函数式 API 签名：

```typescript
import * as fs from 'fs';
const STORAGE_PATH = '.anfsf/webhooks.json';

function saveWebhooks(): void {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(_webhooks, null, 2), 'utf-8');
}

function loadWebhooks(): void {
  try {
    if (fs.existsSync(STORAGE_PATH)) {
      const data: WebhookRegistration[] = JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8'));
      _webhooks.length = 0;
      _webhooks.push(...data);
    }
  } catch {}
}

// 初始化加载
loadWebhooks();

export function registerWebhook(url, events): WebhookRegistration {
  const wh = { ... };
  _webhooks.push(wh);
  saveWebhooks(); // 新增
  return wh;
}

export function removeWebhook(id): boolean {
  // ... 删除逻辑 ...
  saveWebhooks(); // 新增
}
```

**文件位置**: `src/pipeline/webhook.ts`
**验证**: 重启后 `listWebhooks()` 返回重启前数据

---

### 2.2 前端：Token 存储统一

**问题**: 4 个组件独立从 `localStorage` 读取 Token，而非走中心化的 `api/client.ts`。

**修复文件和改动**:

| 文件 | 行号 | 改动 |
|------|------|------|
| `web/src/components/ConfirmationReview.tsx` | 13 | `localStorage.getItem(...)` → `import { getApiToken } from '../api/client'` |
| `web/src/components/LLMPlayground.tsx` | 13 | 同上 |
| `web/src/components/ProjectDashboard.tsx` | 13 | 同上（**仅数据层**，交互层 Phase 5 改） |
| `web/src/components/TestFeedback.tsx` | 13 | 同上 |

**改动模式** (4 个组件一致):

```typescript
// 删除:
const token = localStorage.getItem('anfsf_api_token');

// 替换为:
import { getApiToken } from '../api/client';
const token = getApiToken();

// getApiToken() 已正确使用 sessionStorage（关 Tab 清除，XSS 缓解）
```

**API Client 确认** (`web/src/api/client.ts` 已有，无需改动):
```typescript
function getApiToken(): string | undefined {
  return sessionStorage.getItem('anfsf_api_token') || import.meta.env.VITE_ANFSF_API_TOKEN || undefined;
}
```

**验证**: 登录后刷新页面 → Token 丢失 → 需重新输入（sessionStorage 行为）；使用前确认 Token 存入 sessionStorage。

---

### 2.3 前端：429/Rate Limit + 静默错误修复

#### 429 处理 (`web/src/api/client.ts`)

**现状**: `safeFetch` 遇到 429 直接抛 `ApiClientError`，前端从未解析 `Retry-After`。

**改动**:

```typescript
async function safeFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);

  if (res.status === 429) {
    const retryAfter = res.headers.get('Retry-After');
    const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;
    // 写入 window.__lastRateLimit 供 UI 显示
    if (typeof window !== 'undefined') {
      (window as any).__lastRateLimit = { url, retryAfter: waitMs, timestamp: Date.now() };
    }
    throw new ApiClientError({
      status: 429,
      message: `Rate limited. Retry after ${retryAfter || 5}s`,
      details: [`Wait ${(waitMs / 1000).toFixed(0)}s before next request`],
    });
  }

  if (!res.ok) {
    throw new ApiClientError(await parseError(res));
  }
  return res;
}
```

#### 静默错误修复 (4 组件)

**问题**: 4 个组件使用 `.catch(() => {})` 吞掉所有 fetch 错误。

| 组件 | 文件 | 现状代码 | 修复方式 |
|------|------|---------|---------|
| HomeDashboard | `HomeDashboard.tsx` | `.catch(() => {})` | `setError('服务器连接失败')` |
| EvolutionPanel | `EvolutionPanel.tsx` | `.catch(() => {})` (3 处) | 显示错误提示条 |
| VerifyPanel | `VerifyPanel.tsx` | `.catch(() => {})` | 显示错误提示条 |
| DevWorkspaceV2 | `DevWorkspaceV2.tsx` | `.catch(() => {})` | 显示错误提示条 |

**改动模式**: 每个组件增加 `error` state + 错误提示 UI：

```typescript
// 在 useState 区域增加:
const [fetchError, setFetchError] = useState<string | null>(null);

// 替换 .catch(() => {}):
.catch((err) => setFetchError(err instanceof Error ? err.message : '请求失败'))

// 在 JSX return 中增加（通常在顶部）:
{fetchError && (
  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
    {fetchError}
    <button onClick={() => setFetchError(null)} className="ml-2 text-red-400 hover:text-red-600">✕</button>
  </div>
)}
```

---

### 2.4 前端：测试框架 + ZIP 导出 + 移动端

#### 测试框架 (`web/vitest.config.ts`)

```typescript
// web/vitest.config.ts — 新建
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

```typescript
// web/src/test-setup.ts — 新建
import '@testing-library/jest-dom';
```

**package.json 新增 devDependencies**:
```json
{
  "devDependencies": {
    "vitest": "^3.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "jsdom": "^25.0.0"
  }
}
```

**npm script** (`web/package.json`):
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**最小 smoke test 示例** (`web/src/components/__tests__/ErrorBoundary.test.tsx`):
```typescript
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

test('renders children when no error', () => {
  render(<ErrorBoundary><div>ok</div></ErrorBoundary>);
  expect(screen.getByText('ok')).toBeInTheDocument();
});
```

#### ZIP 导出 (`web/src/components/ResultView.tsx`)

**现状**: 文件只能浏览不能下载。

**改动**:

```typescript
// 新增导入
import JSZip from 'jszip';

// 在 ResultView 组件内新增:
const [downloading, setDownloading] = useState(false);

const handleDownloadAll = async () => {
  setDownloading(true);
  try {
    const zip = new JSZip();
    for (const file of files) {
      const res = await fetch(
        `${API_BASE}/api/v1/pipeline/${runId}/files/content?filePath=${encodeURIComponent(file.path)}&category=${file.category}`
      );
      if (res.ok) {
        const data = await res.json();
        zip.file(file.path, data.content);
      }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName || 'project'}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    setError('下载失败');
  } finally {
    setDownloading(false);
  }
};

// 在 JSX 中"项目名"旁插入按钮:
{projectName && (
  <button onClick={handleDownloadAll} disabled={downloading}
    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50">
    {downloading ? '打包中...' : '下载全部'}
  </button>
)}
```

**package.json 新增**:
```json
"dependencies": { "jszip": "^3.10.0" }
```

#### 移动端快速修复

**3 个组件的响应式修改**:

| 组件 | 问题 | 修复 |
|------|------|------|
| `PipelineProgress.tsx` | `grid-cols-4` → 手机上 4 列太挤 | `grid-cols-2 sm:grid-cols-4` |
| `VerifyPanel.tsx` | `grid-cols-2` 无断点 → 手机过窄 | `grid-cols-1 sm:grid-cols-2` |
| `ReleaseGate.tsx` | 按钮行无 `flex-wrap` → 溢出 | 父容器加 `flex-wrap gap-2` |

---

## 3. 验证清单

```bash
# 后端持久化
npx tsc --noEmit
# 启动 server → 创建项目 → 停止 → 重启 → 项目列表不丢失

# 前端编译
cd web && npm run build

# 前端测试（Phase 0 新增）
cd web && npm test

# 手动验证
# 1. Token: 关闭 Tab 再打开 → Token 被清除（sessionStorage 行为）
# 2. 429: 快速连续提交 synthesize → 看到 rate limit 提示
# 3. 错误: 停掉 server → 前端显示"服务器连接失败"而非空白
# 4. 下载: 打开 /result → 点击"下载全部" → ZIP 包含所有文件
# 5. 移动: F12 手机模式 → PipelineProgress 2 列显示
```
