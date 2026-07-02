# ANFSF 前端优化 — Phase 4-5: Webhook 状态 + 仪表盘

> **日期**: 2026-06-30 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase 1 (API 层), Phase 2 (ProjectDashboardBase 骨架路由)
> **预估**: Phase 4 = 1天, Phase 5 = 1天
> **对应计划缺口**: ⑪ (Phase 4 Webhook), ⑯ (Phase 5 仪表盘)

---

## Phase 4: Webhook 状态页

### 目标

展示 Gitea webhook 投递历史 + DevFixLoop 修复详情。后端无专用 `GET /api/v1/webhooks` 端点，前端通过 `GET /pipeline?limit=50` 过滤 `webhookResult` 数据。

### 新建: `web/src/components/WebhookStatus.tsx`

```typescript
import { useState, useEffect } from 'react';
import { fetchRuns } from '../api/client';
import type { WebhookDelivery } from '../api/types';

export default function WebhookStatus() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchRuns({ limit: 50 })
      .then(({ runs }) => {
        const webhookResults = runs
          .map(r => (r as any).result?.webhookResult)
          .filter(Boolean)
          .map((wr: any) => ({
            deliveryId: wr.deliveryId,
            commitSha: wr.commitSha,
            branch: wr.branch,
            repository: '',
            success: wr.success,
            errors: wr.errors ?? 0,
            warnings: wr.warnings ?? 0,
            autoFixed: wr.autoFixed ?? 0,
            message: wr.message ?? '',
            timestamp: (r as any).completedAt ?? 0,
          }))
          .sort((a: any, b: any) => b.timestamp - a.timestamp);
        setDeliveries(webhookResults);
      })
      .catch(() => setError('加载 Webhook 投递记录失败'))
      .finally(() => setLoading(false));
  }, []);

  // JSX: 表格 + 展开行
  // 表头: 提交SHA | 分支 | 状态 | 错误 | 自动修复 | 时间
  // 展开行: DevFixLoop 详情 (verify steps + fix records)
  // 空状态: "暂未收到任何 Webhook 事件"
  // 错误状态: 红色错误提示
}
```

### Webhook 列表 UI 设计

```
┌─ Webhook 投递记录 ───────────────────────────────────────────────────┐
│ 提交SHA          │ 分支   │ 状态     │ 错误 │ 自动修复 │ 时间        │
│──────────────────│────────│─────────│──────│─────────│────────────│
│ a1b2c3d (main)   │ main   │ ✅ 成功  │  0   │   3    │ 10:32:15    │
│   └─ DevFixLoop 详情 (展开状态)                                      │
│      ├─ 验证: tsc --noEmit → ✅ 通过                                │
│      ├─ 验证: ContractWatcher → ✅ 通过                              │
│      ├─ L1 自动修复: src/auth.ts:42 → 类型修复 ✅                   │
│      ├─ L1 自动修复: src/index.ts:15 → 未使用变量 ✅                │
│      └─ 总计: 2 个自动修复, 0 个建议, 1 个人工审查                  │
│──────────────────│────────│─────────│──────│─────────│────────────│
│ f6e5d4c (feature)│ feature│ ❌ 失败  │  2   │   0    │ 10:15:42    │
└──────────────────────────────────────────────────────────────────────┘
```

### App.tsx / StageTabs 变更

```typescript
// App.tsx:
import WebhookStatus from './components/WebhookStatus';
<Route path="/webhooks" element={<WebhookStatus />} />

// StageTabs.tsx: 在 Evolution 后新增
{ path: "/webhooks", label: "Webhooks", stage: -1 },
```

### i18n 新增 key

```typescript
"Webhooks": "Webhooks",
"Webhook Deliveries": "Webhook 投递",
"Commit": "提交",
"Branch": "分支",
"Auto-fixed": "自动修复",
"Verify Steps": "验证步骤",
"No webhook deliveries yet": "暂未收到 Webhook 事件",
```

---

## Phase 5: 5 阶段项目仪表盘

### 目标

在 HomeDashboard 项目卡上增加"Pipeline"入口，点击进入 `ProjectDashboard` 全流程 5 阶段时间线。**Phase 2 已完成其 Token 数据层改造，本 Phase 只改交互层**。

### 改动文件

| 文件 | 改动 |
|------|------|
| `web/src/components/HomeDashboard.tsx` | 项目卡新增 Pipeline 按钮 + 阶段圆点 |
| `web/src/components/ProjectDashboard.tsx` | **仅交互层**: `useNavigate()` + `onStageClick` |
| `web/src/App.tsx` | 确认 `/dashboard/:projectId` 路由 |
| `web/src/i18n.ts` | 新增 2 key |

### 3.1 HomeDashboard — 项目卡新增入口

**读取项目阶段数据** (在现有 fetch projects 基础上增加):

```typescript
// 新增请求: 获取每个项目的最近 pipeline 运行
useEffect(() => {
  fetch(API_BASE + '/api/v1/pipeline?limit=50')
    .then(r => r.json())
    .then(data => {
      const runs = Array.isArray(data) ? data : data.runs || [];
      // 按 projectName 分组取最新一条
      // 挂载到项目卡片上
    })
    .catch(() => {});
}, []);
```

**项目卡新增**:

```typescript
// 在项目卡片的 name 右侧新增 Pipeline 入口:
<div className="flex items-center gap-2">
  <h3 className="...">{p.name}</h3>
  <Link to={`/dashboard/${p.id}`}
    className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 no-underline">
    Pipeline
  </Link>
</div>
```

### 3.2 ProjectDashboard — 导航映射

`ProjectDashboard` 已有 `onStageClick` prop。Phase 5 在路由包装层实现映射:

```typescript
// web/src/components/ProjectDashboardBase.tsx (Phase 2 已创建骨架)
import { useParams, useNavigate } from 'react-router-dom';
import ProjectDashboard from './ProjectDashboard';
import { fetchRunDetail } from '../api/client';
import { useState, useEffect } from 'react';

export default function ProjectDashboardBase() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [runDetail, setRunDetail] = useState<any>(null);

  useEffect(() => {
    if (projectId) fetchRunDetail(projectId).then(setRunDetail).catch(() => {});
  }, [projectId]);

  const handleStageClick = (stage: number) => {
    const routes: Record<number, string> = {
      0: `/require?runId=${projectId}`,
      1: `/require/review?projectId=${projectId}`,
      2: `/dev?projectId=${projectId}`,
      3: `/verify?projectId=${projectId}`,
      4: `/test?projectId=${projectId}`,
      5: `/release?projectId=${projectId}`,
    };
    const target = routes[stage];
    if (target) navigate(target);
  };

  // 构建 ProjectDashboard props
  const projectName = runDetail?.projectName || projectId || '';
  const stages = runDetail ? statusToStages(runDetail) : [];
  const progress = stages.length > 0
    ? { totalTasks: 6, completedTasks: stages.filter((s: any) => s.state === 'completed').length }
    : { totalTasks: 6, completedTasks: 0 };

  return (
    <ProjectDashboard
      projectName={projectName}
      projectState={runDetail?.status || 'created'}
      stages={stages}
      currentStage={stages.findIndex((s: any) => s.state === 'active')}
      progress={progress}
      checkpoints={[]}
      onStageClick={handleStageClick}
      runId={projectId}
    />
  );
}
```

**说明**: `statusToStages` 函数已存在于 `ProjectDashboard.tsx` 原始文件 (48-72行)，可直接引用或复制。

---

## 验证清单

```bash
cd web && npm run build        # 零类型错误

# Phase 4 Webhook 页
# 1. 触发 Gitea push → /webhooks 出现新记录
# 2. 点击展开 → 显示 DevFixLoop 验证步骤和修复详情

# Phase 5 仪表盘
# 1. HomeDashboard 项目卡出现蓝色 "Pipeline" 按钮
# 2. 点击 → /dashboard/:projectId 显示 5 阶段时间线
# 3. 点击任一阶段（如 Verification）→ 导航到 /verify?projectId=
```
