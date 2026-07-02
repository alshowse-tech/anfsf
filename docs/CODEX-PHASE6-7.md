# ANFSF 前端优化 — Phase 6-7: 项目管理 + 问题分析

> **日期**: 2026-06-30 | **状态**: 📋 待执行
> **执行方**: CODEX
> **前置**: Phase 1 (API 层), Phase 5 (仪表盘路由 `/dashboard/:projectId`)
> **预估**: Phase 6 = 3天, Phase 7 = 3天
> **对应计划缺口**: ⑰-⑱

---

## Phase 6: 多项目管理

### 目标

完整的项目清单 + 详情页，支持搜索/筛选/排序/分页。

### 文件变更总览

| 文件 | 操作 |
|------|------|
| `web/src/components/ProjectList.tsx` | 新建 |
| `web/src/components/ProjectDetail.tsx` | 新建 |
| `web/src/App.tsx` | 新增路由 `/projects`, `/projects/:projectId` |
| `web/src/components/StageTabs.tsx` | 新增 Projects Tab |
| `web/src/components/HomeDashboard.tsx` | 新增"查看全部项目"入口 |

### 2.1 ProjectList.tsx

**路由**: `/projects`

**API**: `GET /api/v1/projects`

**功能**: 表格视图 + 搜索框 + 状态筛选 + 排序列头 + 分页

**UI 设计**:

```
┌─ 项目清单 ─────────────────────────────────────────────────────────────┐
│ [🔍 搜索项目名...      ]  [状态: 全部 ▼]                               │
│                                                                        │
│ 项目名          │ 状态       │ 租户     │ 创建时间          │ 操作     │
│─────────────────│───────────│─────────│──────────────────│──────────│
│ Todo App        │ created   │ default  │ 2026-06-28       │ [详情]   │
│ 电商平台         │ stage2_dev │ default  │ 2026-06-25       │ [详情]   │
│ 博客系统         │ stage4_verify │ default│ 2026-06-20       │ [详情]   │
│                                                                        │
│                                        ← 第 1 页 / 共 3 页 →          │
└────────────────────────────────────────────────────────────────────────┘
```

**代码结构**:

```typescript
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchProjects } from '../api/client';
import type { ProjectInfo } from '../api/types';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

interface ProjectRow {
  id: string; name: string; projectState: string; tenantId: string; createdAt: number;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setError('加载项目列表失败'));
  }, []);

  // 筛选 + 排序 + 分页逻辑 (useMemo)
  const filtered = useMemo(() => {
    let result = [...projects];
    // 搜索: 按 name 模糊匹配
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    // 筛选: 按 projectState
    if (stateFilter !== 'all') result = result.filter(p => p.projectState === stateFilter);
    // 排序
    result.sort((a, b) => {
      const cmp = sortField === 'name'
        ? a.name.localeCompare(b.name)
        : a.createdAt - b.createdAt;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [projects, search, stateFilter, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // 所有独立的状态值用于筛选下拉
  const states = Array.from(new Set(projects.map(p => p.projectState))).sort();

  // 排序列头点击切换
  const toggleSort = (field: 'name' | 'createdAt') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="space-y-4">
      {/* 搜索 + 筛选行 */}
      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 搜索项目名..."
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm flex-1" />
        <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
          <option value="all">状态: 全部</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {/* 表格 */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('name')}>
                项目名 {sortField === 'name' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left px-4 py-2">状态</th>
              <th className="text-left px-4 py-2">租户</th>
              <th className="text-left px-4 py-2 cursor-pointer" onClick={() => toggleSort('createdAt')}>
                创建时间 {sortField === 'createdAt' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th className="text-left px-4 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">暂无项目</td></tr>
            ) : pageRows.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded bg-gray-100">{p.projectState}</span></td>
                <td className="px-4 py-2 text-xs text-gray-500">{p.tenantId}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <Link to={`/dashboard/${p.id}`} className="text-blue-600 hover:text-blue-800 text-xs no-underline">仪表盘</Link>
                  <Link to={`/projects/${p.id}`} className="ml-2 text-blue-600 hover:text-blue-800 text-xs no-underline">详情</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded border disabled:opacity-30">← 上一页</button>
          <span className="text-gray-500">第 {page + 1} / {totalPages} 页</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded border disabled:opacity-30">下一页 →</button>
        </div>
      )}
    </div>
  );
}
```

### 2.2 ProjectDetail.tsx

**路由**: `/projects/:projectId`

**API**: 4 个并行请求

| 数据 | API |
|------|-----|
| 项目信息 | `GET /api/v1/projects/:id` |
| 运行历史 | `GET /api/v1/pipeline?limit=50` → 客户端过滤 projectName 匹配 |
| 修复记录 | `GET /api/v1/feedback/fixes?projectId=` (注: 当前用 projectId 跑) |
| 阶段指标 | `GET /api/v1/knowledge/metrics/stages` |

**UI 设计**:

```
┌─ 项目: 电商平台 ───────────────────────────────────────────────────────┐
│  状态: stage2_dev  |  租户: default  |  创建时间: 2026-06-25           │
│  PRD: 一个电商平台... (前 100 字)     [查看仪表盘 →]                   │
├─ 运行历史 ─────────────────────────────────────────────────────────────┤
│  run_xxx  │ done   │ 12 steps │ 2026-06-25 10:00  │ [查看]            │
│  run_yyy  │ failed │ 3 steps  │ 2026-06-25 09:30  │ [查看]            │
├─ 修复记录 ─────────────────────────────────────────────────────────────┤
│ L1 │ src/auth.ts:42  │ 类型不匹配  │ 已确认                          │
│ L2 │ src/index.ts:15 │ 接口变更    │ 待处理                          │
├─ 阶段指标 ─────────────────────────────────────────────────────────────┤
│ 阶段        │ 平均耗时  │ P95     │ 失败率  │ 运行次数               │
│ stage1      │ 1.2s     │ 2.1s    │ 0%      │ 3                      │
│ stage2      │ 4.5s     │ 6.0s    │ 33%     │ 3                      │
└────────────────────────────────────────────────────────────────────────┘
```

**关键实现要点**:

```typescript
// 从 pipeline 列表过滤项目匹配的运行
const [runs, setRuns] = useState<any[]>([]);
useEffect(() => {
  Promise.all([
    fetchProjectDetail(projectId).catch(() => null),
    fetchRuns({ limit: 50 }).then(({ runs }) => runs).catch(() => []),
    fetchFixes().catch(() => []),
    fetchStageMetrics().catch(() => []),
  ]).then(([project, allRuns, fixes, stages]) => {
    const projectRuns = allRuns.filter((r: any) => r.projectName === (project as any)?.name);
    setProject(project);
    setRuns(projectRuns);
    setFixes(fixes);
    setStages(stages);
  }).catch(() => setError('加载项目详情失败'));
}, [projectId]);
```

### 2.3 HomeDashboard — "查看全部项目"入口

```typescript
// 在 <div className="flex items-center justify-between"> 内新增:
<Link to="/projects"
  className="text-sm text-blue-600 hover:text-blue-700 no-underline">
  查看全部项目 →
</Link>
```

### 2.4 StageTabs — Projects Tab

```typescript
{ path: "/projects", label: t("Projects"), stage: -1 },
```

**i18n**:
```typescript
"Projects": "项目",
"Project Details": "项目详情",
"Pipeline Runs": "运行历史",
"Fix Records": "修复记录",
"Stage Metrics": "阶段指标",
"Search project name...": "搜索项目名...",
"Status: All": "状态: 全部",
"Actions": "操作",
"Dashboard": "仪表盘",
"Details": "详情",
"No projects": "暂无项目",
```

---

## Phase 7: 问题分析

### 目标

单项目分析 + 全局分析 2 页。全部 API 已有，仅需前端页面。不用图表库，用表格 + 进度条 + 数字。

### 文件变更总览

| 文件 | 操作 |
|------|------|
| `web/src/components/ProjectAnalysis.tsx` | 新建 |
| `web/src/components/GlobalAnalysis.tsx` | 新建 |
| `web/src/App.tsx` | 路由 `/analysis/:projectId`, `/analysis/global` |
| `web/src/components/StageTabs.tsx` | 新增 Analysis Tab |

### 3.1 ProjectAnalysis.tsx

**路由**: `/analysis/:projectId`

**数据源**:
| 数据 | API |
|------|-----|
| 阶段耗时 | `GET /knowledge/metrics/stages` |
| 修复记录 | `GET /feedback/fixes` |
| 编译错误 | `GET /knowledge/compile-patterns` |

**展示内容**:

```typescript
// 阶段耗时分布 — 表格 + 进度条
interface StageDurationRow {
  stage: string;
  avgDurationMs: number;
  p95DurationMs: number;
  failureRate: number;
  runs: number;
}

// 渲染: 表格 + 每行的水平进度条 (avg duration 按比例)
// tailwind: bg-blue-500 h-2 rounded

// 修复效率 — 数字卡片
// L1 自动修复率 = l1_count / total, 通过率 = confirmed / total
// 3 卡片: 总修复数 / L1占比 / 通过率

// Token 消耗 — 表格
// 阶段 | prompt tokens | completion tokens | total

// 编译错误 TOP 10 — 有序列表
// #1  TS2322: Type X not assignable to Y (15 次)
// #2  TS6133: X declared but never used (8 次)
```

### 3.2 GlobalAnalysis.tsx

**路由**: `/analysis/global`

**数据源**:
| 数据 | API |
|------|-----|
| 瓶颈阶段 | `GET /knowledge/metrics/bottlenecks?thresholdMs=1000` |
| 阶段汇总 | `GET /knowledge/metrics/stages` |
| 编译错误 | `GET /knowledge/compile-patterns` |
| 组件模式 | `GET /knowledge/component-patterns` |

**展示内容**:

```
┌─ 瓶颈阶段排名 ─────────────────────────────────────────────────────────┐
│ #1  stage2_dev  avg: 4.5s  P95: 6.0s  失败率: 33%  3 次运行           │
│    ████████████████████████████████░░░░░░░░  4.5s                      │
│ #2  stage4_verify  avg: 3.2s  P95: 5.1s  失败率: 20%  5 次运行         │
│    ██████████████████████████░░░░░░░░░░░░░░  3.2s                      │
├─ 跨项目编译错误 ───────────────────────────────────────────────────────┤
│ TS2322: Type X not assignable to Y  |  15 次  |  3 个项目类型           │
│ TS6133: X declared but never used   |   8 次  |  2 个项目类型           │
├─ 组件复用排行 ─────────────────────────────────────────────────────────┤
│ Button          |  5 个项目  |  props: {variant,size,onClick}          │
│ Card            |  4 个项目  |  props: {title,children}                │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.3 StageTabs — Analysis Tab

```typescript
// 在 StageTabs 中新增:
{ path: "/analysis/global", label: t("Analysis"), stage: -1 },
```

Phase 7 不实现子 Tab（Project / Global）。Phase 7 先只做 `/analysis/global` 页面。单项目分析可通过 `/analysis/:projectId` 访问。

---

## 验证清单

```bash
cd web && npm run build        # 零类型错误

# Phase 6
# 1. /projects → 搜索"Todo" → 只显示匹配项目
# 2. 排序: 点击"项目名"列头 → 升序/降序切换
# 3. 筛选: 选择状态 → 只显示该状态项目
# 4. 分页: >20 项目 → 出现分页控件
# 5. /projects/:id → 看到 4 区块 (信息/运行/修复/指标)

# Phase 7
# 1. /analysis/global → 瓶颈排名 > 编译错误 > 组件复用
# 2. 进度条长度反映耗时占比
# 3. 修复效率卡片显示 L1/通过率
```
