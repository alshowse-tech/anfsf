# ANFSF 前端优化 — Phase 8-9: 配置管理 + 体验优化

> **日期**: 2026-06-30 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase 1 (API 层 — 配置类型 + 函数), Phase 6 (SettingsModal 改造)
> **预估**: Phase 8 = 5天, Phase 9 = 14天
> **对应计划缺口**: ⑲-㉑

---

## Phase 8: 灵活配置

### 目标

完整配置管理区：LLM Provider、Pipeline 参数、Webhook 通知、租户管理。

**后端新增 3 条路由**（骨架已在 Phase 1 创建，本 Phase 完整实现）：

| 路由 | 方法 | 功能 |
|------|------|------|
| `GET /api/v1/config/llm` | GET | 读取 LLM 配置 |
| `PUT /api/v1/config/llm` | PUT | 保存 LLM 配置 → `.anfsf/llm-config.json` |
| `GET /api/v1/config/pipeline` | GET | 读取 Pipeline 参数 |
| `PUT /api/v1/config/pipeline` | PUT | 保存 Pipeline 参数 → `.anfsf/pipeline-config.json` |
| `PUT /api/v1/config/roles` | PUT | 保存角色-权限映射 → `.anfsf/role-config.json` |
| `GET /api/v1/config/roles` | GET | 读取角色-权限映射 |

### 1.1 后端路由实现

**完整实现 `config-llm.ts` 参考** (Phase 1 已有骨架，补齐完整):

```typescript
import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

const STORAGE_PATH = path.resolve('.anfsf/llm-config.json');

interface LLMConfigStore {
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

const DEFAULTS: LLMConfigStore = {
  apiKey: '',
  baseUrl: '',
  defaultModel: 'qwen3.5-plus',
};

function readConfig(): LLMConfigStore {
  try {
    return { ...DEFAULTS, ...JSON.parse(fs.readFileSync(STORAGE_PATH, 'utf-8')) };
  } catch {
    return { ...DEFAULTS };
  }
}

function writeConfig(data: LLMConfigStore): void {
  fs.mkdirSync(path.dirname(STORAGE_PATH), { recursive: true });
  fs.writeFileSync(STORAGE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function registerLLMConfigRoutes(app: FastifyInstance): void {
  app.get('/api/v1/config/llm', async () => {
    const config = readConfig();
    // 不返回实际 API Key（安全），只显示是否已配置
    return { ...config, apiKey: config.apiKey ? '••••••••' : '' };
  });

  app.put('/api/v1/config/llm', async (req) => {
    const body = req.body as Partial<LLMConfigStore>;
    const current = readConfig();
    const merged = { ...current, ...body };
    writeConfig(merged);
    return { status: 'ok' };
  });
}
```

`config-pipeline.ts` 和 `config-roles.ts` 同理。

### 1.2 LLMConfig.tsx

```typescript
import { useState, useEffect } from 'react';
import { fetchLLMConfig, updateLLMConfig } from '../api/client';
import type { LLMConfigData } from '../api/types';

export default function LLMConfig() {
  const [config, setConfig] = useState<LLMConfigData>({
    apiKey: '', baseUrl: '', defaultModel: 'qwen3.5-plus',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetchLLMConfig().then(setConfig).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLLMConfig(config);
      setMessage('配置已保存');
    } catch (e) {
      setMessage('保存失败: ' + String(e));
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    setTestResult('测试中...');
    try {
      const res = await fetch(config.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.apiKey}` },
        body: JSON.stringify({ model: config.defaultModel, messages: [{role:'user', content:'hi'}], max_tokens: 5 }),
      });
      setTestResult(res.ok ? '✅ 连接成功' : `❌ 失败: HTTP ${res.status}`);
    } catch (e) {
      setTestResult('❌ 无法连接: ' + String(e));
    }
  };

  // JSX: 三字段表单 (API Key masked + 显示是否已配置, Base URL, 默认模型下拉)
  // + "测试连接" 按钮 + "保存" 按钮
  // + 成功/失败消息
}
```

### 1.3 NotificationConfig.tsx

```typescript
// 读取 POST/GET/DELETE /api/v1/webhooks
// 表格: URL | 事件 | 创建时间 | 操作 (删除)
// 顶部: [Webhook URL 输入框] [事件选择] [+ 添加]
// "Ping" 测试按钮: 向该 webhook 发送测试事件
```

### 1.4 SettingsModal — 改造为设置页面

**现状**: 弹窗模式，固定 2 Tab (Gitea / Members)。

**Phase 8 方案**: 保留 `SettingsModal` 作为入口，点击⚙齿轮打开全屏设置页:

```typescript
// App.tsx 中:
// ⚙ 齿轮按钮改为导航到 /settings 而非弹窗
<Link to="/settings"
  className="text-gray-500 hover:text-gray-700 p-1 text-lg">
  {String.fromCharCode(0x2699)}
</Link>

// 新建 /settings 路由:
<Route path="/settings" element={<SettingsPage />} />
```

**SettingsPage.tsx** (新建):

```typescript
// 左侧竖排 Tab 导航: LLM / Pipeline / Notifications / Tenants / Gitea / Members
// 右侧对应表单
// 复用现有 GiteaConfig / MemberManager 组件
// 新增 LLMConfig / PipelineConfig / NotificationConfig / TenantManager
```

### 1.5 验证清单

```bash
# 后端
npx tsc --noEmit
curl -X PUT http://localhost:3001/api/v1/config/llm \
  -H 'Content-Type: application/json' \
  -d '{"defaultModel":"deepseek-chat"}'
curl http://localhost:3001/api/v1/config/llm
# → {"apiKey":"","baseUrl":"","defaultModel":"deepseek-chat"}

# 前端
cd web && npm run build
# 1. /settings → 6 个 Tab 可见
# 2. LLM Config → 输入 API Key → 测试连接 → 保存 → 重启不丢失
# 3. Pipeline Config → 修改 maxRetries → 保存 → 重启不丢失
# 4. Notifications → 添加 Webhook URL → PING → 收到通知
# 5. Tenants → 创建 → 添加成员 → 删除
```

---

## Phase 9: 体验优化

### 目标

用户认证 + 全局 SSE + 审计日志 + 移动端 + i18n 切换 + CLI 终端。

### 2.1 用户认证

**后端新增**:

| 路由 | 功能 |
|------|------|
| `POST /api/v1/auth/login` | 用户名+密码 → JWT Token |
| `GET /api/v1/auth/me` | 当前用户信息 + 权限列表 |
| `POST /api/v1/auth/register` | (可选) 用户注册 |

**前端新增**:

| 文件 | 功能 |
|------|------|
| `web/src/components/LoginPage.tsx` | 登录表单 → 存储 JWT 到 sessionStorage → 跳转首页 |
| `web/src/components/ProtectedRoute.tsx` | 路由守卫: 无 Token → 重定向 `/login` |

**App.tsx 路由保护区**:

```typescript
import ProtectedRoute from './components/ProtectedRoute';

<Route path="/login" element={<LoginPage />} />
<Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>} />
```

> **注意**: Phase 0-8 保持 API Token 兼容，Phase 9 引入 JWT。两者共存策略:
> - `api/client.ts` 中: 优先使用 JWT (sessionStorage `anfsf_jwt`)，无 JWT 时尝试旧 API Token
> - `authHeaders()` 新增逻辑: 有 JWT 时发 `Authorization: Bearer <jwt>`

### 2.2 全局 SSE

```
GET /api/v1/events  (Phase 9 新增)
→ 事件流: 新项目创建 / 阶段转换 / 修复完成 / 发布
```

**前端**: `web/src/hooks/useGlobalEvents.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

interface GlobalEvent {
  type: 'project_created' | 'stage_changed' | 'fix_completed' | 'release';
  data: Record<string, unknown>;
  timestamp: number;
}

export function useGlobalEvents() {
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${API_BASE}/api/v1/events`);
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        setEvents(prev => [...prev.slice(-50), JSON.parse(e.data)]); // 保留最近 50 条
      } catch {}
    };
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  return { events, connected };
}
```

### 2.3 审计日志页 (`/audit-log`)

```
GET /api/v1/audit-log (Phase 9 新增)
→ 表格: 时间 | 操作 | 用户 | IP | 详情
→ 分页: 每页 50 条
```

### 2.4 移动端全面适配

逐个页面检查并将硬编码列数改为响应式:

| 页面 | 当前问题 | 修复 |
|------|---------|------|
| 全部页面 | 表格无 `overflow-x-auto` | 每个 `<table>` 包裹 `<div className="overflow-x-auto">` |
| PipelineProgress | `grid-cols-4` | `grid-cols-2 sm:grid-cols-4` (Phase 3 已改) |
| VerifyPanel | `grid-cols-2`, 按钮 `flex-row` | `grid-cols-1 sm:grid-cols-2`, `flex-col sm:flex-row` |
| ReleaseGate | 按钮行无 `flex-wrap` | 父容器 `flex-wrap gap-2` |
| ProjectList | 表格至少 5 列 | `overflow-x-auto` |
| 主容器 | `max-w-6xl` 在小屏合适 | 保持现状 |

### 2.5 i18n 切换 UI

**现状**: `setLang()` 存在无 UI。`t()` 函数返回 "en / zh" 拼接模式（`i18n.ts:106`）。

**改动**:

- 新建语言切换控件（Settings 页 + 导航栏下拉）
- `setLang()` 切换 + 存入 `localStorage`
- `i18n.ts` 启动时从 `localStorage` 恢复语言

**关于 `t()` 函数注意**: 当前 `t()` 在中文模式下返回 `"English key / Chinese translation"` 双语拼接。Phase 9 将其改为纯翻译模式。这是 **breaking change**：所有现有引用 `t()` 的 UI 标签会从显示"两行文本"变为"一行译文"。需在合并后全面检查 UI 布局不再依赖之前的双行展示：

```typescript
export function t(en: string): string {
  if (currentLang === "en") return en;
  return translations[en] || en;  // 不再拼接 "en / zh"
}
```

### 2.6 CLI 终端 (`/cli`)

```typescript
// web/src/components/CLITerminal.tsx
// 简单命令输入框 + 输出滚动区域
// 调用后端 API 执行命令 (需新增 POST /api/v1/cli/exec)
// 或作为纯前端终端仿真 (localStorage + shell 模拟)
```

### 2.7 验证清单

```bash
cd web && npm run build
# 1. /login → 输入凭证 → 登录 → 跳转首页
# 2. 未登录访问首页 → 重定向 /login
# 3. /audit-log → 显示操作日志列表
# 4. 设置 → 切换语言 → UI 立即切换
# 5. CLI → 输入命令 → 显示输出
# 6. 手机模式 → 全部页面无水平溢出
```
