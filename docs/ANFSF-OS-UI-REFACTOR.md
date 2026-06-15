# ANFSF OS 前端重构计划

> **日期**: 2026-06-15  
> **版本**: v0.9 → v1.0  
> **原则**: 保留工作组件，用工作流阶段导航替换传统菜单  

---

## 一、总览

### 当前状态
- 3389 行前端代码，15 个组件，7 个路由
- PRDForm、PipelineProgress、ProjectDashboard 三个组件已验证可用
- 其余 12 个组件存在但未在导航中暴露（隐藏于齿轮菜单）
- 缺少：开发者视图、PM 审核视图、租户/成员管理、Gitea 配置入口

### 重构目标
将"工具列表式"导航改为"工作流阶段式"导航，每个角色在每个阶段看到其所需的操作界面。

---

## 二、导航架构

```
┌─────────────────────────────────────────────────────┐
│  ANFSF OS                                     [⚙]  │
│─────────────────────────────────────────────────────│
│  需求   │ 开发 │ 验证 │ 测试 │ 发布 │ 进化         │
│  (S0-1) │ (S2) │ (S3) │ (S4) │ (S5) │ (S13)        │
│─────────────────────────────────────────────────────│
│                                                     │
│  当前阶段: Stage 1 — 需求解析中...                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**核心变化**:
- 顶栏 6 个阶段 Tab = 工作流的主导航
- 右侧齿轮菜单 = 系统配置（租户、成员、API Token、Gitea）
- 不再有 `/history` `/diagram` 等独立路由，它们内嵌到对应阶段页面中
- 每个阶段 Tab 高亮当前项目所在的阶段

---

## 三、页面设计（6 个阶段 Tab + 首页）

### Tab 0: 首页 (Dashboard)

**路由**: `/`
**角色**: 所有角色
**从上到下布局**:

```
┌─────────────────────────────────────────────┐
│  [项目列表]            [+ 新建项目]          │
│  ┌─────────────────────┐                    │
│  │ 固定资产管理系统       Stage 3 — 验证中   │
│  │ 任务管理系统           Stage 1 — 需求解析  │
│  └─────────────────────┘                    │
│                                             │
│  [系统健康]                                  │
│  ├ 编译模式: 3399 条 / 83 种                 │
│  ├ 组件库: 12 组件                           │
│  └ 累计项目: 5 个                            │
│                                             │
│  [最近活动]  (lessons feed)                  │
└─────────────────────────────────────────────┘
```

**API 调用**:
| 数据 | 端点 | 方法 |
|------|------|------|
| 项目列表 | `/api/v1/projects` | GET |
| 系统健康 | `/api/v1/dashboard` | GET |
| 创建项目 | `/api/v1/projects` | POST |
| 最近教训 | `/api/v1/feedback/lessons` | GET |

**现有组件复用**: `ProjectDashboard.tsx` 核心逻辑，`RunList.tsx` 项目历史

---

### Tab 1: 需求 (Stage 0-1)

**路由**: `/require`
**角色**: PM（主要）/ 管理员

```
┌─────────────────────────────────────────────┐
│  ┌─ 新建项目 ────────────────────────────┐  │
│  │  [PRD 文本输入框]                      │  │
│  │  [文件拖拽区]                          │  │
│  │  [实时质量评分: 65/100 黄灯]           │  │
│  │  [优化建议列表]                        │  │
│  │  [提交并开始分析]                      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ 需求确认 (提交后显示) ───────────────┐  │
│  │  [LLM 解析需求列表]                    │  │
│  │  [置信度标注: 高/中/低]                │  │
│  │  [逐条确认/修改/拒绝]                  │  │
│  │  [锁死需求 → 进入 Stage1_locked]       │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  [Pipeline 进度条 (提交后显示)]              │
└─────────────────────────────────────────────┘
```

**API 调用**:
| 数据 | 端点 | 方法 |
|------|------|------|
| 提交 PRD | `/api/v1/synthesize` | POST |
| 带附件提交 | `/api/v1/synthesize/multipart` | POST |
| 管道状态 | `/api/v1/pipeline/:id/status` | GET (SSE) |
| 确认需求 | `/api/v1/confirmation` | GET/POST |
| 锁死需求 | `/api/v1/pipeline/:id/requirements/confirm` | PUT |
| 蓝图流程 | `/api/v1/diagram` (new) | GET |

**现有组件复用**: `PRDForm.tsx` (保留), `PipelineProgress.tsx` (保留), `FileUpload.tsx`, `ConfirmationReview.tsx`

---

### Tab 2: 开发 (Stage 2)

**路由**: `/dev`
**角色**: 前端/后端开发

```
┌─────────────────────────────────────────────┐
│  ┌─ 任务工作台 ──────────────────────────┐  │
│  │  [过滤器: 全部 | 待处理 | 进行中]       │  │
│  │  ┌─────────────────────────────────┐    │  │
│  │  │ ☐ P0 实现 TaskController            │  │
│  │  │   files: 3  est: 4h  [标记完成]     │  │
│  │  ├─────────────────────────────────┤    │  │
│  │  │ 🔄 P1 添加单元测试                  │  │
│  │  │   上次提交: "fix type error"         │  │
│  │  └─────────────────────────────────┘    │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ 验证反馈区 ────────────────────────┐  │
│  │  [最新 push 的编译结果: 3 error]     │  │
│  │  [契约检查: 1 warning]              │  │
│  │  [L1 自动修复: 2 applied]           │  │
│  │  [L2 建议: 1 pending]              │  │
│  │  [查看详细报告 →]                   │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**API 调用**:
| 数据 | 端点 | 方法 |
|------|------|------|
| 当前项目任务 | 项目状态 + TASK.md | GET (generated) |
| 验证结果 | `/api/v1/pipeline/:id/status` | GET |
| 修复记录 | `/api/v1/feedback/fixes?projectId=` | GET |
| 确认修复 | `/api/v1/pipeline/:id/fix/:fixId/confirm` | PUT |
| 工单列表 | `/api/v1/tickets?projectId=` | GET |

**现有组件复用**: `DeveloperWorkspace.tsx` (保留，扩展), `ConfirmationReview.tsx`

---

### Tab 3: 验证 (Stage 3)

**路由**: `/verify`
**角色**: PM / QA (确认后触发 Stage 3→4 转移)

```
┌─────────────────────────────────────────────┐
│  ┌─ 验证结果概览 ────────────────────────┐  │
│  │  编译: ✅ Passed   契约: ✅ Passed       │  │
│  │  E2E: ⚠ Not run                         │  │
│  │                                         │  │
│  │  [查看完整报告 →]                       │  │
│  │                                         │  │
│  │  [验证通过，进入测试阶段] ← 状态转移      │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ 修复记录 ──────────────────────────┐  │
│  │  L1 自动: 3 / L2 建议: 1 / L3 手动: 0    │  │
│  │  已确认: 3 / 待处理: 1                    │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**API 调用**:
| 数据 | 端点 | 方法 |
|------|------|------|
| 管道状态 | `/api/v1/pipeline/:id/status` | GET |
| 发布检查 | `/api/v1/pipeline/:id/release` | POST |
| 状态转移 | `/api/v1/projects/:id/state` | PATCH |
| 修复记录 | `/api/v1/feedback/fixes?projectId=` | GET |

**现有组件复用**: `PipelineProgress.tsx` (验证步骤), `ResultView.tsx`

---

### Tab 4: 测试 (Stage 4 — UAT)

**路由**: `/test`
**角色**: PM (主要)

```
┌─────────────────────────────────────────────┐
│  ┌─ PM 测试审查 ────────────────────────┐  │
│  │  [项目文件列表]                        │  │
│  │  [文件内容预览 (点击展开)]              │  │
│  │  [提交反馈: 类别 + 描述 + 关联代码]     │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ UAT 审核 ──────────────────────────┐  │
│  │  [审核决策: 通过 / 拒绝 / 需修改]     │  │
│  │  [审核意见: ...]                      │  │
│  │  [历史审核记录]                        │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ 反馈历史 ──────────────────────────┐  │
│  │  [Lessons Tab] [Fixes Tab]            │  │
│  │  [Snapshots Tab] [Freeze Tab]         │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**API 调用**:
| 数据 | 端点 | 方法 |
|------|------|------|
| 管道文件 | `/api/v1/pipeline/:id/files` | GET |
| 提交反馈 | `/api/v1/feedback/lessons` | POST |
| 提交修复 | `/api/v1/pipeline/:id/feedback` | POST |
| UAT 审核 | `/api/v1/uat/review` | POST |
| UAT 历史 | `/api/v1/uat/reviews?projectId=` | GET |
| 反馈列表 | `/api/v1/feedback/lessons` | GET |
| 修复状态 | `/api/v1/feedback/fixes?projectId=` | GET |
| 创建快照 | `/api/v1/feedback/snapshots` | POST |
| 冻结管理 | `/api/v1/feedback/freeze` | GET/POST/DELETE |
| 发布 | `/api/v1/pipeline/:id/release` | POST |
| 状态转移 | `/api/v1/projects/:id/state` | PATCH |

**现有组件复用**: `TestFeedback.tsx` (全部保留), `ResultView.tsx`

---

### Tab 5: 发布/归档 (Stage 5)

**路由**: `/release`
**角色**: PM / 管理员

```
┌─────────────────────────────────────────────┐
│  ┌─ 三层门禁 ──────────────────────────┐  │
│  │  [系统检查: 5/5 ✅]                   │  │
│  │  [PM 确认: ☐ 已确认]                  │  │
│  │  [角色确认: 前端✅ 后端✅ DevOps✅]     │  │
│  │  [释放发布] [进入归档]                  │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ 归档摘要 ──────────────────────────┐  │
│  │  [度量: 耗时/返工/复用/Token]         │  │
│  │  [组件候选: 3 组件]                    │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ 知识回填 ──────────────────────────┐  │
│  │  [编译学习: 新增 15 条模式]           │  │
│  │  [组件沉淀: 2 组件入库]               │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**API 调用**:
| 数据 | 端点 | 方法 |
|------|------|------|
| 发布检查 | `/api/v1/pipeline/:id/release` | POST |
| 归档触发 | `/api/v1/pipeline/:id/archive` | POST |
| 知识库模式 | `/api/v1/knowledge/compile-patterns` | GET |
| 组件模式 | `/api/v1/knowledge/component-patterns` | GET |
| 管道指标 | `/api/v1/knowledge/metrics` | GET |

**现有组件复用**: `ReleaseCheck` (后端已有，前端需新建)

---

### Tab 6: 进化 (Stage ∞)

**路由**: `/evolve`
**角色**: 管理员

```
┌─────────────────────────────────────────────┐
│  ┌─ 瓶颈分析 ──────────────────────────┐  │
│  │  [各阶段平均耗时 / P95]                │  │
│  │  [最长阶段: Stage 1 — 45s avg]         │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  ┌─ 知识库 ────────────────────────────┐  │
│  │  [编译模式] [组件模式] [反省发现]       │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

**API 调用**:
| 数据 | 端点 | 方法 |
|------|------|------|
| 瓶颈分析 | `/api/v1/knowledge/metrics/bottlenecks` | GET |
| 阶段摘要 | `/api/v1/knowledge/metrics/stages` | GET |
| 仪表盘 | `/api/v1/dashboard` | GET |
| 管道健康 | `/api/v1/dashboard/pipeline` | GET |

---

## 四、系统配置（齿轮菜单）

**路由**: 独立 Modal 或 `/settings` 页面
**角色**: 管理员

```
┌─ 系统设置 ────────────────────────────────┐
│  [租户管理]  [成员/角色]  [Gitea 配置]     │
│  [API Token]  [LLM Playground]             │
└───────────────────────────────────────────┘
```

| 功能 | API | 现有组件 |
|------|-----|---------|
| 租户管理 | `/api/v1/tenants` (need new route) | 新建 |
| 成员管理 | 未接入 — 仅后端 RoleManager | 新建 |
| Gitea 配置 | 未接入 — 当前 hardcoded in start.bat | 新建 |
| API Token | (localStorage) | `ApiTokenSettings.tsx` |
| LLM Playground | `/api/v1/llm/chat` | `LLMPlayground.tsx` |

> **注意**: 租户/成员管理需要在后端新增以下路由：
> - `GET/POST /api/v1/tenants`
> - `GET/POST/DELETE /api/v1/tenants/:id/members`
> - `PATCH /api/v1/tenants/:id/members/:userId` (role change)

---

## 五、状态转移流程

```
用户操作                    API 调用                          状态变化
─────────────────────────────────────────────────────────────────────
PM 提交 PRD        → POST /api/v1/synthesize            → stage1_parsing
PM 确认需求         → PUT /api/v1/pipeline/:id/requirements/confirm → stage1_locked
骨架生成完毕        → (自动，管道内)                      → stage1_done
开发者获取任务       → (Gitea webhook 触发)              → stage2_dev
开发者 push 代码     → POST /api/webhook/gitea           → stage3_verifying
验证通过             → POST /api/v1/pipeline/:id/release → stage3_passed
PM 发起 UAT          → PATCH /api/v1/projects/:id/state  → stage4_testing
PM 提交审核          → POST /api/v1/uat/review           → approved/ changes_requested
PM 确认发布          → POST /api/v1/pipeline/:id/release → stage5_archiving
归档完成             → POST /api/v1/pipeline/:id/archive → stage5_done
进化引擎运行          → (自动)                          → stage5_evolving
```

**前端需要新增的 API 调用**:
- `PATCH /api/v1/projects/:id/state` — 手动触发状态转移（当前仅在 dashboard 中不可见）
- `POST /api/v1/pipeline/:id/release` — 触发发布检查
- `POST /api/v1/pipeline/:id/archive` — 触发归档

---

## 六、需要新建的组件

| 组件 | 行数估计 | 用途 | 路由 |
|------|---------|------|------|
| `StageTabs.tsx` | ~80 | 顶部 6 阶段导航栏，高亮当前阶段 | 全局 |
| `HomeDashboard.tsx` | ~150 | 首页：项目列表 + 健康概览 | `/` |
| `DevWorkspaceV2.tsx` | ~200 | 开发者任务 + 验证反馈 | `/dev` |
| `VerifyPanel.tsx` | ~100 | 验证结果的汇总视图 | `/verify` |
| `ReleaseGate.tsx` | ~120 | 三层门禁 + PM 确认 | `/release` |
| `EvolutionPanel.tsx` | ~80 | 瓶颈分析 + 知识库 | `/evolve` |
| `SettingsModal.tsx` | ~120 | 系统设置：租户/成员/Gitea | 齿轮菜单 |
| `GiteaConfig.tsx` | ~60 | Gitea URL 和凭证配置 | 设置内 |
| `MemberManager.tsx` | ~100 | 成员增删 + 角色修改 | 设置内 |

## 需要修改的现有组件

| 组件 | 改动 | 原因 |
|------|------|------|
| `App.tsx` | 全部路由重写 | 从 7 条路由改为 6 阶段 + 1 首页 |
| `PRDForm.tsx` | 保留核心，增加 ConfirmationReview 内联 | 需求提交和确认放在同一页面 |
| `PipelineProgress.tsx` | 保留，移到 Require 页内 | 进度条属于需求阶段 |
| `ProjectDashboard.tsx` | 拆分/合并到 HomeDashboard | 逻辑重用 |
| `TestFeedback.tsx` | 保留，移到 Test 页 | 属于测试阶段 |
| `DeveloperWorkspace.tsx` | 扩展为 DevWorkspaceV2 | 增加验证反馈区 |
| `FileUpload.tsx` | 无需改动 | 稳定性好 |
| `ApiTokenSettings.tsx` | 移到齿轮菜单 | 与系统设置统一 |
| `ErrorBoundary.tsx` | 无需改动 | 通用组件 |

## 可以移除的组件

| 组件 | 原因 |
|------|------|
| `RunList.tsx` | 项目历史并入 HomeDashboard |
| `ResultView.tsx` | 文件查看内嵌到 Test 页 |
| `RunResult.tsx` | 被 PipelineProgress 覆盖 |
| `MermaidDiagram.tsx` | 流程可视化可后续加回 |
| `LLMPlayground.tsx` | 移到齿轮菜单 |

---

## 七、实施顺序（3 个 Phase）

### Phase A: 导航 + 首页 (1-2d)

1. 新建 `StageTabs.tsx` — 6 阶段导航栏
2. 重写 `App.tsx` — 新路由结构
3. 新建 `HomeDashboard.tsx` — 项目列表 + 健康概览
4. 验证：旧功能不减 (PRDForm/PipelineProgress 仍可用)

### Phase B: 页面填充 (2-3d)

5. 将 PRDForm + PipelineProgress + ConfirmationReview 整合到 `/require`
6. 新建 `DevWorkspaceV2.tsx` 替换旧组件
7. 新建 `VerifyPanel.tsx`
8. 将 TestFeedback 迁移到 `/test`
9. 新建 `ReleaseGate.tsx` → `/release`

### Phase C: 系统配置 (1-2d)

10. 新建 `SettingsModal.tsx` + `GiteaConfig.tsx` + `MemberManager.tsx`
11. 后端新增 tenant/member 路由
12. 新建 `EvolutionPanel.tsx` → `/evolve`

**总计**: 4-7 个工作日

---

## 八、后端需要新增的 API

为支撑前端重构，需要新增以下后端路由（工作量 ~2d）：

| 端点 | 用途 | 预估 |
|------|------|------|
| `GET/POST /api/v1/tenants` | 租户 CRUD | 1h |
| `GET/POST/DELETE /api/v1/tenants/:id/members` | 成员管理 | 2h |
| `PATCH /api/v1/tenants/:id/members/:userId` | 角色修改 | 1h |
| `GET/PUT /api/v1/config/gitea` | Gitea 配置读写 (持久化到 `.anfsf/config.json`) | 1h |

以上端点对接现有的 `TenantRegistry`、`RoleManager`，不需要新逻辑。

---

## 九、决策记录

1. **保留现有工作组件** — PRDForm, PipelineProgress, TestFeedback 已被验证可用，不重写
2. **先用 API Token 登录，不加登录页面** — 权限粒度上移到 API 层 (Bearer auth)，前端只展示/隐藏 UI 元素
3. **状态转移由后端驱动** — 前端只是"触发按钮"，转移逻辑全在 TRANSITION_TABLE 中验证
4. **Gitea 配置持久化** — 从 `start.bat` 环境变量移到 `.anfsf/config.json`，前端可编辑
5. **不改变现有后端 API 签名** — 只新增路由，不改已有端点
