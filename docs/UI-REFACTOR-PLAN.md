# ANFSF UI/UX 重构计划

> **版本**: 1.0 | **日期**: 2026-06-08 | **关联**: 后端已从 17 层 Pipeline 切换为 Agent Loop
> **目标**: 前端与新的 Agent Loop 运行逻辑对齐，修复死链，化简导航

---

## 一、现有前端组件审计

| 组件 | 问题 | 严重度 |
|------|------|:---:|
| `PRDForm` | 可用。缺少提交后的质量评分反馈 | 🟡 |
| `PipelineProgress` | 显示旧版 12 个步骤名称，新管线只有 3 个步骤。缺 token/Gitea 信息 | 🔴 |
| `RunList` | 用 `fetchRuns()`，代理修复后可用 | 🟢 |
| `ResultView` / `RunResult` | 用 `fetchRunDetail()`，需适配新 result 结构 | 🟡 |
| `ProjectDashboard` | **完全硬编码**。五阶段进度、任务数都是假数据 | 🔴 |
| `DeveloperWorkspace` | **完全硬编码**。3 个假任务 | 🔴 |
| `RequirementReview` | 组件存在但路由未有效使用，PM 确认流程缺失 | 🔴 |
| `MermaidDiagram` | 展示旧 17 层图 | 🟡 |
| `ConfirmationReview` | 旧审查页，逻辑关联已断 | 🟡 |
| `TestFeedback` | 独立存在，可保留 | 🟢 |
| `LLMPlayground` | LLM 直接对话，不依赖管线 | 🟢 |
| `ApiTokenSettings` | 独立功能，可用 | 🟢 |

---

## 二、新 UX 流程（分两期实现）

### 第一期（本次）：优化单次提交流程

```
主页（PRD 提交 + 质量评分实时反馈）
  ↓ （提交后直接触发生成，但前端先展示质量评分再跳转）
Agent Loop 执行页（3 步骤 + Token + Gitea 链接）
  ↓
代码产出页（文件树 + 代码预览 + TASK.md）
```

**第一期不做**：需求确认中间页。因为当前后端 PRD 提交和 Agent Loop 生成在同一个 POST 请求中完成。拆分为两步（提交→确认→生成）是 B-002 的工作。

### 第二期（后端配合后）：增加需求确认步骤

```
主页 → 需求确认页 → Agent Loop 执行页 → 代码产出页
```

> B-001/B-002 必须在第二期前端之前完成。当前 synthesize 一次调用完成全部，需改造为：(1) POST synthesize 返回需求列表；(2) PUT confirm 触发 Agent Loop。

**导航（第一期）**：主页 | 实时进度 | 代码产出 | 历史记录 | 看板
**导航（第二期）**：主页 | 需求确认 | 实时进度 | 代码产出 | 历史记录
**辅助收纳（两期相同）**：LLM 实验、反馈、设置 → 右上角齿轮图标

---

## 三、页面详细规格

### P-001：PRD 提交页（重写 `PRDForm`）

**数据源**：`POST /api/v1/synthesize`

UI 布局：
- 上半屏：项目名称输入 + PRD 文本输入 + 文件上传
- 提交后**不跳转**，先展示质量预检结果：
  - 绿色（≥70）→ 自动跳转到需求确认页
  - 黄色（40-69）→ 展示评分 + 建议，用户手动点"继续"
  - 红色（<40）→ 展示引导对话模式入口

### P-002：需求确认页（将 `RequirementReview` 接入管线）

**数据源**：从 synthesize 响应中获取结构化需求 + 置信度标注

**改动**：当前 Route 存在但用假数据。改为：
- synthesize 响应中增加 `requirements` 字段（后端需配合返回解析好的需求列表）
- 每条需求显示来源标记（🟢 明确 / 🟡 推断 / 🔴 补充）和置信度
- PM 可逐条确认 / 修改 / 补充
- 点击"锁定需求"→ 后端开始 Agent Loop 代码生成

### P-003：Agent Loop 执行页（重写 `PipelineProgress`）

**数据源**：`GET /api/v1/pipeline/:id/status`（SSE 流）

**改动**：
- 只显示 3 个步骤：质量检查 → Agent Loop 生成 → 推送 Gitea
- 增加实时信息：
  - 当前生成轮数（round 1/3）
  - Token 消耗（实时累计）
  - 已生成文件数
- 完成后展示：
  - 总文件数、总 Token、耗时
  - Gitea 仓库链接
  - "查看代码" 按钮
- 去掉旧版 12 步骤列表

### P-004：代码产出页（增强 `ResultView`）

**数据源**：`GET /api/v1/pipeline/:id/files`

**改动**：
- 左侧：文件树（可折叠）
- 右侧：代码预览（语法高亮）
- 顶部：TASK_FRONTEND.md / TASK_BACKEND.md 切换 Tab
- 底部：Gitea 链接 + "在 Gitea 中查看" 按钮

### P-005：项目看板（`ProjectDashboard` 接真实 API）

**数据源**：`GET /api/v1/pipeline/:id/status`

**改动**：
- 从硬编码改为从 API 获取实时项目状态
- 五阶段指示器用实际 checkpoints 数据
- 进度条用实际 steps 数据
- 与历史列表联动（点击 RunList 中的项目 → 跳转到该项目的看板）

### P-006：导航重组（`App.tsx`）

**改动**：
- 主导航：新建 | 进度 | 产出 | 历史 | 看板
- 右上角齿轮：LLM 实验 | 反馈 | API 设置
- 去掉：审查（合并到需求确认页）、工作台（Phase 1 硬编码版去掉，Phase 2 真数据版再加）
- 架构图：更新为 Agent Loop 流程图

---

## 四、数据流映射

| UI 组件 | API 端点 | 请求方式 | 轮询/SSE |
|---------|---------|---------|---------|
| PRDForm | `/api/v1/synthesize` | POST | — |
| RequirementReview | 同上响应 + 新增 `PUT /api/v1/pipeline/:id/requirements/confirm` | PUT | — |
| PipelineProgress | `/api/v1/pipeline/:id/status` | GET | 轮询 1s |
| ResultView | `/api/v1/pipeline/:id/files` | GET | — |
| RunList | `/api/v1/pipeline` | GET | — |
| ProjectDashboard | `/api/v1/pipeline/:id/status` | GET | — |

---

## 五、后端配合清单

| # | 改动 | 说明 |
|---|------|------|
| B-001 | synthesize 响应中返回结构化需求 | 当前只返回 steps + result.files，需在 result 中增加 requirements 字段（含置信度标注） |
| B-002 | 增加 `PUT /api/v1/pipeline/:id/requirements/confirm` | 已有路由（phase1-routes.ts），需接上 Agent Loop 触发生成 |
| B-003 | `/api/v1/pipeline/:id/status` 返回 round/token/giteaUrl | Agent Loop 已在 result 中写入，status 端点未返回。改 `pipeline.ts` | `pipeline.ts` | 0.5d |

---

## 六、实施任务（按依赖排序）

### Phase 1：地基（先做，阻塞所有 UI 任务）

| # | 任务 | 改动文件 | 工期 |
|---|------|---------|------|
| B-001 | synthesize 响应增加 requirements 字段 | `synthesize.ts` | 1d |
| B-002 | confirm 路由触发 Agent Loop（而非直接生成） | `synthesize.ts`, `phase1-routes.ts` | 1d |
| B-003 | PipelineStatus 响应增加 round/token/giteaUrl | `store.ts`, `synthesize.ts` | 0.5d |

### Phase 2：核心页面（并行开发）

| # | 任务 | 改动文件 | 工期 |
|---|------|---------|------|
| P-001 | 重写 PRDForm——增加质量预检反馈 | `PRDForm.tsx` | 1d |
| P-002 | 将 RequirementReview 接入真实 API | `RequirementReview.tsx`, `App.tsx` | 1.5d |
| P-003 | 重写 PipelineProgress——3 步骤 + token/Gitea | `PipelineProgress.tsx` | 2d |
| P-004 | 增强 ResultView——文件树 + 代码预览 + TASK.md | `ResultView.tsx`, `RunResult.tsx` | 2d |

### Phase 3：导航 + 辅助

| # | 任务 | 改动文件 | 工期 |
|---|------|---------|------|
| P-005 | ProjectDashboard 接真实 API | `ProjectDashboard.tsx` | 1d |
| P-006 | 导航重组 + 架构图更新 | `App.tsx` | 1d |
| P-007 | 全局联调 + 样式统一 | 全局 | 1d |

---

## 七、验收标准

- [ ] 提交 PRD 后立即看到质量评分（绿/黄/红），不再直接跳转
- [ ] 需求确认页展示结构化需求 + 置信度标注
- [ ] 执行页只显示 3 个步骤，包含 token 消耗和 Gitea 链接
- [ ] 代码产出页可浏览文件树，预览代码内容
- [ ] 项目看板展示真实项目数据
- [ ] 导航从 9 项减到 5 项，核心流程突出
- [ ] 所有组件数据来自 API，无硬编码假数据
