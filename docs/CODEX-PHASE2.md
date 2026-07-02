# ANFSF 前端优化 — Phase 2: 新页面 + 存量组件挂载

> **日期**: 2026-06-30 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase 0-1
> **预估**: 2 天
> **对应计划缺口**: ⑩-⑯

---

## 1. 目标

新增 OrchestrationStatus + SkillsRegistry 两个页面，挂载 ConfirmationReview / RequirementReview / ProjectDashboard 三个已有组件到路由。

---

## 2. 文件变更总览

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `web/src/components/OrchestrationStatus.tsx` | 编排状态页 |
| 新建 | `web/src/components/SkillsRegistry.tsx` | 技能注册+工具历史 |
| 修改 | `web/src/App.tsx` | 新增 5 路由 |
| 修改 | `web/src/components/StageTabs.tsx` | 新增 3 Tab |
| 修改 | `web/src/components/ConfirmationReview.tsx` | **仅路由挂载**: Token 改造已在 Phase 0 完成；添加路由适配确保 `/confirm` 可达 |
| 新建 | `web/src/components/RequirementReviewPage.tsx` | 包装页从 pipeline status 映射 props |
| 修改 | `web/src/components/ProjectDashboard.tsx` | **仅路由挂载**: Token 改造已在 Phase 0 完成；仅确认路由可达 |
| 修改 | `web/src/i18n.ts` | 新增 ~15 个翻译 key |

---

## 3. OrchestrationStatus.tsx

**路由**: `/orchestrate`

**功能**: 展示多 Agent 编排系统的运行状态。

**设计**:
- 自动轮询 `fetchOrchestrateStatus()` (5 秒间隔)
- 3 个区块：

```
┌─ Agent 健康 ─────────────────────────────────┐
│ ● Active Agents: 3  ● Registered: 4          │
│ ● Queued Messages: 12                         │
├─ 总线统计 ─────────────────────────────────────┤
│ ● Messages Processed: 1,234                   │
│ ● Avg Latency: 12ms                           │
├─ DAG 状态 ────────────────────────────────────┤
│ Wave 1: [auth-task ■, crud-task ■]           │
│ Wave 2: [ui-task □]                           │
│ 总计: 3/5 任务完成                             │
└───────────────────────────────────────────────┘
```

**代码结构** (参考 `EvolutionPanel.tsx` 的轮询模式):

```typescript
import { useState, useEffect, useRef } from 'react';
import { fetchOrchestrateStatus } from '../api/client';
import type { OrchestrateStatus } from '../api/types';

export default function OrchestrationStatus() {
  const [status, setStatus] = useState<OrchestrateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const load = async () => {
    try {
      setError(null);
      const data = await fetchOrchestrateStatus();
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => clearInterval(intervalRef.current);
  }, []);

  // JSX: 同上三区块布局，Tailwind 卡片
  // 空状态: "编排系统尚未启动，请先运行流水线。"
  // 错误状态: 红色错误条（同 Phase 0 模式）
}
```

---

## 4. SkillsRegistry.tsx

**路由**: `/skills`

**功能**: 展示已注册的技能列表和工具调用历史。

**设计**: 双 Tab (Skills / Tool History)

```
Skills Tab:
┌─ 技能列表 ───────────────────────────────────┐
│ context-compressor  v1.0  ● Loaded           │
│ memory-consolidation v1.0  ● Loaded          │
│ hybrid-retriever     v1.0  ● Loaded          │
│ citation-tracer      v1.0  ○ Disabled        │
└───────────────────────────────────────────────┘

Tool History Tab:
┌─ 工具调用历史 ────────────────────────────────┐
│ read_file  | src/index.ts     | 12ms | 10:32  │
│ write_file | src/routes/a.ts  | 8ms  | 10:30  │
│ execute_bash | npm install    | 3.2s | 10:29  │
└───────────────────────────────────────────────┘
```

**代码结构**:

```typescript
import { useState, useEffect } from 'react';
import { fetchSkills, fetchTools } from '../api/client';
import type { SkillInfo, ToolInfo } from '../api/types';

export default function SkillsRegistry() {
  const [activeTab, setActiveTab] = useState<'skills' | 'tools'>('skills');
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchSkills().then(setSkills).catch(() => {}),
      fetchTools().then(setTools).catch(() => {}),
    ]).catch(() => setError('Failed to load'));
  }, []);

  // 双 Tab UI + 技能卡片列表 + 工具表格
  // 状态徽标颜色: loaded=green, error=red, disabled=gray
}
```

---

## 5. 存量组件挂载

### 5.1 ConfirmationReview (`/confirm`)

**改动**: Token 改造已在 Phase 0 完成。不需重复。只需确保组件通过路由 `/confirm` 可达（已在 App.tsx 路由表中注册）。

### 5.2 RequirementReview (`/require/review`)

**问题**: `RequirementReview` 需要 `items`/`summary`/`attentionItems`/`onLock`/`onReanalyze` 5 个 props。没有直接 API。

**方案**: 新建包装页 `RequirementReviewPage`，从 pipeline status 映射数据：

```typescript
// web/src/components/RequirementReviewPage.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchRunDetail } from '../api/client';
import RequirementReview from './RequirementReview';

export default function RequirementReviewPage() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId') || searchParams.get('runId');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    fetchRunDetail(projectId)
      .then(run => {
        // 从 run.result 或 PRD 解析需求项
        // 目前后端不返回结构化需求项，用占位数据
        setItems([
          { id: '1', text: run.projectName || 'Project', category: 'overview',
            annotation: { itemId: '1', itemText: run.projectName || '', source: 'explicit',
              confidence: 'high', confidenceScore: 0.95, rationale: 'From PRD', pmConfirmed: false } }
        ]);
        setSummary({ total: 1, explicit: 1, inferred: 0, supplemented: 0,
          highConfidence: 1, mediumConfidence: 0, lowConfidence: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [projectId]);

  if (!projectId) return <div className="text-center py-12 text-gray-500">请提供项目 ID</div>;
  if (loading) return <div className="text-center py-12 text-gray-500">加载中...</div>;

  return (
    <RequirementReview
      items={items}
      summary={summary}
      attentionItems={items.filter(i => i.annotation.confidence === 'low').map(i => i.id)}
      onLock={(confirmed) => { /* PUT /api/v1/projects/:id/state */ }}
      onReanalyze={(mod) => { /* 暂不操作 */ }}
    />
  );
}
```

**路由**: 在 `App.tsx` 中:
```typescript
<Route path="/require/review" element={<RequirementReviewPage />} />
```

### 5.3 ProjectDashboard (`/dashboard/:projectId`)

**改动**: Token 改造已在 Phase 0 完成，不需重复。Phase 2 只做：确保路由 `/dashboard/:projectId` 可达（已在 App.tsx 注册）。交互层 `onStageClick` 在 Phase 5 完成。
```

**路由**: `App.tsx`:
```typescript
<Route path="/dashboard/:projectId" element={<ProjectDashboardBase />} />
```

`ProjectDashboardBase` 是一个适配器读取 URL 参数并传递给 `ProjectDashboard`:
```typescript
import { useParams, useNavigate } from 'react-router-dom';
import ProjectDashboard from './ProjectDashboard';

export default function ProjectDashboardBase() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  // fetch project + pipeline data, 构建 props
  // 传入 onStageClick: (stage) => navigate(路由映射)
}
```

> **注意**: `onStageClick` 逻辑在 Phase 5 实现。Phase 2 只需确保 `ProjectDashboard` 的 Token 来源正确 + 路由可达。

---

## 6. App.tsx 路由变更

```typescript
// 新增 import
import OrchestrationStatus from './components/OrchestrationStatus';
import SkillsRegistry from './components/SkillsRegistry';
import RequirementReviewPage from './components/RequirementReviewPage';
import ProjectDashboardBase from './components/ProjectDashboardBase';

// 在 <Routes> 内新增:
<Route path="/orchestrate" element={<OrchestrationStatus />} />
<Route path="/skills" element={<SkillsRegistry />} />
<Route path="/confirm" element={<ConfirmationReview />} />
<Route path="/require/review" element={<RequirementReviewPage />} />
<Route path="/dashboard/:projectId" element={<ProjectDashboardBase />} />
```

---

## 7. StageTabs.tsx 变更

```typescript
const TABS: StageTab[] = [
  { path: "/", label: t("Home"), stage: -1 },
  { path: "/require", label: t("Requirements"), stage: 0 },
  { path: "/dev", label: t("Development"), stage: 2 },
  { path: "/verify", label: t("Verification"), stage: 3 },
  { path: "/test", label: t("Testing"), stage: 4 },
  { path: "/release", label: t("Release"), stage: 5 },
  { path: "/orchestrate", label: t("Orchestrate"), stage: -1 },   // NEW
  { path: "/skills", label: t("Skills"), stage: -1 },              // NEW
  { path: "/evolve", label: t("Evolution"), stage: -1 },
];
```

---

## 8. i18n.ts 新增 key

```typescript
"Orchestrate": "编排",
"Skills": "技能",
"Agent Health": "Agent 健康",
"Bus Stats": "总线统计",
"DAG Status": "DAG 状态",
"Active Agents": "活跃 Agent",
"Registered Agents": "已注册 Agent",
"Queued Messages": "队列消息",
"Messages Processed": "已处理消息",
"Avg Latency": "平均延迟",
"Skill Name": "技能名称",
"Version": "版本",
"Status": "状态",
"Tool History": "工具历史",
"Tool Name": "工具名称",
"Duration": "耗时",
"No data available": "暂无数据",
```

---

## 9. 验证清单

```bash
cd web && npm run build        # 零类型错误

# 手动验证
# 1. /orchestrate → 显示 Agent 健康/总线/DAG 三个区块，5s 自动刷新
# 2. /skills → Skills/Tool History 双 Tab 切换
# 3. /confirm → 创建确认 → approve → 状态变更
# 4. /dashboard/:projectId → 显示阶段时间线（Token 正确传递）
# 5. /require/review?projectId=xxx → 显示需求评审（可正常加载）
# 6. StageTabs 出现 Orchestrate、Skills 新 Tab
```
