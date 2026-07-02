# ANFSF Frontend Optimization — 开发计划

> **基于文档**: CODEX-PHASE0 ~ CODEX-PHASE9
> **编制日期**: 2026-06-30
> **总预估**: 37-41 天

---

## 一、整体策略

### 前置条件
- 后端已经完成 Phase 1-9 的 Agent Loop 管线开发
- 前端 24 个组件 + 路由 + `api/client.ts` 基座已存在
- 本计划仅覆盖 **前端优化**，不涉及后端核心逻辑修改

### 已存在的基座 (不需重复开发)
| 基座 | 位置 | 说明 |
|------|------|------|
| `safeFetch` + `authHeaders` | `api/client.ts` | 统一 fetch 封装 |
| `useSSE` hook | `hooks/useSSE.ts` | SSE 实时连接 + 断线重连 |
| `useRuns` hook | `hooks/useRuns.ts` | Pipeline 运行数据 |
| App 路由 | `App.tsx` | 12 条现有路由 |
| 24 个组件 | `components/` | 全量组件已存在 |

### 每个 Phase 的交付模式
```
任务定义 → 代码实现 → tsc --noEmit → cd web && npm run build → 手动验证
```

---

## 二、Phase 0 — 基础设施加固 (6 天)

**前置**: 无 | **缺口**: ①⑧ | **文档**: CODEX-PHASE0.md

### 0a: Vitest 测试框架 (30min)
| 条目 | 值 |
|------|-----|
| 文件 | `web/vitest.config.ts` (新建), `web/src/test-setup.ts` (新建) |
| 修改 | `web/package.json` — 添加 devDependencies + test script |
| 验证 | `cd web && npm test` 通过 |

### 0b: ProjectRegistry 持久化 (2h)
| 条目 | 值 |
|------|-----|
| 文件 | `src/pipeline/project.ts` |
| 改动 | + `save()` / `load()` 方法; 修改 `create/updateState/remove` 在变更后调用 `save()` |
| 存储 | `.anfsf/projects.json` |

### 0c: WebhookRegistry 持久化 (1h)
| 条目 | 值 |
|------|-----|
| 文件 | `src/pipeline/webhook.ts` |
| 改动 | + `saveWebhooks()` / `loadWebhooks()`, 同 ProjectRegistry 模式 |

### 0d: Token 存储统一 (1h)
| 文件 | 改动 |
|------|------|
| `ConfirmationReview.tsx` | `localStorage` → `getApiToken()` |
| `LLMPlayground.tsx` | 同上 |
| `ProjectDashboard.tsx` | 同上 |
| `TestFeedback.tsx` | 同上 |

### 0e: 429/Rate Limit 处理 (1h)
| 文件 | 改动 |
|------|------|
| `api/client.ts` | `safeFetch` 中新增 429 检查: 解析 `Retry-After` 头部, 写入 `window.__lastRateLimit` |

### 0f: 静默错误修复 (2h)
| 文件 | 改动 |
|------|------|
| `HomeDashboard.tsx` | `.catch(() => {})` → `setError(...)` + UI |
| `EvolutionPanel.tsx` | 同上 (3 处) |
| `VerifyPanel.tsx` | 同上 |
| `DevWorkspaceV2.tsx` | 同上 |

### 0g: ZIP 导出 (2h)
| 条目 | 值 |
|------|-----|
| 文件 | `ResultView.tsx` |
| 改动 | + `jszip` 依赖; + `handleDownloadAll()` 方法; + 下载按钮 UI |

### 0h: 移动端快速修复 (1h)
| 文件 | 改动 | 原因 |
|------|------|------|
| `PipelineProgress.tsx` | `grid-cols-4` → `grid-cols-2 sm:grid-cols-4` | 手机 4 列太挤 |
| `VerifyPanel.tsx` | `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` | 手机 2 列溢出 |
| `ReleaseGate.tsx` | 加 `flex-wrap gap-2` | 按钮行溢出 |

### 验证
```bash
# 后端
npx tsc --noEmit
# 创建项目 → 重启 → 项目列表不丢失

# 前端
cd web && npm run build
cd web && npm test
```

---

## 三、Phase 1 — API 层扩展 (1 天)

**前置**: Phase 0 | **缺口**: ⑨ | **文档**: CODEX-PHASE1.md

### 1a: 前端类型定义 (1h)
| 文件 | `web/src/api/types.ts` (新建/扩展) |
|------|------|
| 新增类型 | `OrchestrateStatus`, `SkillInfo`, `ToolInfo`, `ToolCallHistoryEntry`, `WebhookDelivery`, `VerificationError`, `VerificationGuardResult`, `StepDetail`, `ProjectInfo`, `ProjectDetail`, `StageSummary`, `BottleneckInfo`, `FixRecordInfo`, `CompilePatternInfo`, `ComponentPatternInfo`, `LLMConfigData`, `PipelineConfigData`, `RolePermissionMap` |

### 1b: API 函数新增 (2h)
| 文件 | `web/src/api/client.ts` (扩展) |
|------|------|
| 新增函数 | `fetchOrchestrateStatus`, `triggerOrchestrateRun`, `fetchSkills`, `fetchTools`, `fetchProjects`, `fetchProjectDetail`, `fetchStepDetails`, `fetchStageMetrics`, `fetchBottlenecks`, `fetchCompilePatterns`, `fetchComponentPatterns`, `fetchFixes`, `fetchLLMConfig`, `updateLLMConfig`, `fetchPipelineConfig`, `updatePipelineConfig` |

### 1c: 后端骨架路由 (3h)
| 文件 | 功能 |
|------|------|
| `src/server/routes/config-llm.ts` | GET/PUT `/api/v1/config/llm`, 存储为 `.anfsf/llm-config.json` |
| `src/server/routes/config-pipeline.ts` | GET/PUT `/api/v1/config/pipeline`, 存储为 `.anfsf/pipeline-config.json` |
| `src/server/routes/skills.ts` | GET `/api/v1/skills`, 返回 SkillsRegistry 列表 |
| `src/server/routes/tools.ts` | GET `/api/v1/tools`, 返回 ToolRegistry 列表 |
| `src/server/index.ts` | 注册 4 条新路由 |

### 验证
```bash
npx tsc --noEmit
cd web && npm run build
# GET /api/v1/skills → 返回非 404
# GET /api/v1/config/llm → 返回 { apiKey:'', baseUrl:'', defaultModel:'qwen3.5-plus' }
```

---

## 四、Phase 2 — 新页面 + 存量挂载 (2 天)

**前置**: Phase 0-1 | **缺口**: ⑩⑮ | **文档**: CODEX-PHASE2.md

### 2a: OrchestrationStatus.tsx (4h)
| 路由 | `/orchestrate` |
| API | `fetchOrchestrateStatus()` |
| UI | 3 区块: Agent 健康 / 总线统计 / DAG 状态; 5s 自动轮询 |

### 2b: SkillsRegistry.tsx (3h)
| 路由 | `/skills` |
| API | `fetchSkills()` + `fetchTools()` |
| UI | 双 Tab: Skills / Tool History |

### 2c: App.tsx + StageTabs + i18n (2h)
App.tsx 添加 5 条路由; StageTabs 添加新 Tab; i18n 添加 ~15 key

### 2d: RequirementReviewPage.tsx (2h) — 从 pipeline status 映射数据到 RequirementReview props

### 2e: ProjectDashboardBase.tsx (2h) — 适配器层, 读 URL 参数 + fetch 数据

---

## 五、Phase 3 — SSE 实时 + 验证钻取 (2 天)

**前置**: Phase 1 | **缺口**: ⑫⑬ | **文档**: CODEX-PHASE3.md

### 3a: PipelineProgress SSE 迁移 (4h)
删除 polling → useSSE hook; 添加连接指示器; SSE 断开 10s 回退 HTTP polling

### 3b: VerifyPanel 验证工具详情 (3h)
新增可折叠"验证工具详情"区块; 从 pipeline status 提取 guard 结果

### 3c: useSSE hook 扩展 (1h)
添加 `verification` 事件类型; 扩展 SSEMessage

---

## 六、Phase 4 — Webhook 状态页面 (1 天)

**前置**: Phase 1 | **缺口**: ⑪ | **文档**: CODEX-PHASE4-5.md

### 4a: WebhookStatus.tsx (4h)
路由 `/webhooks`; 从 fetchRuns 过滤 webhookResult; 表格+展开行

---

## 七、Phase 5 — 阶段仪表盘 (1 天)

**前置**: Phase 2 | **缺口**: ⑯ | **文档**: CODEX-PHASE4-5.md

### 5a: HomeDashboard Pipeline 入口 (2h) — 项目卡片新增 Pipeline 按钮
### 5b: ProjectDashboard 交互层 (2h) — onStageClick 路由映射

---

## 八、Phase 6 — 多项目管理 (3 天)

**前置**: Phase 1, Phase 5 | **缺口**: ⑰ | **文档**: CODEX-PHASE6-7.md

### 6a: ProjectList.tsx (8h) — 表格+搜索+筛选+排序+分页
### 6b: ProjectDetail.tsx (8h) — 4 区块: 信息/运行/修复/指标

---

## 九、Phase 7 — 问题分析 (3 天)

**前置**: Phase 1 | **缺口**: ⑱ | **文档**: CODEX-PHASE6-7.md

### 7a: ProjectAnalysis.tsx (6h) — 阶段耗时/修复效率/Token 消耗/编译错误 TOP10
### 7b: GlobalAnalysis.tsx (6h) — 瓶颈排名/跨项目编译错误/组件复用排名

---

## 十、Phase 8 — 配置管理 (5 天)

**前置**: Phase 1 (API 骨架), Phase 6 (SettingsModal) | **缺口**: ⑲ | **文档**: CODEX-PHASE8-9.md

### 8a: 后端配置路由 (6h) — config-llm, config-pipeline, config-roles 完整实现
### 8b: LLMConfig.tsx (4h) — API Key/Base URL/Model 表单 + 测试连接
### 8c: NotificationConfig.tsx (4h) — Webhook URL 列表 + 添加 + Ping
### 8d: SettingsPage.tsx (12h) — 全屏设置页面, 6 Tab, 替代弹窗

---

## 十一、Phase 9 — 体验优化 (14 天)

**前置**: Phase 8 | **缺口**: ⑳㉑ | **文档**: CODEX-PHASE8-9.md

### 9a: 用户认证 (3 天)
LoginPage + ProtectedRoute + JWT (与 API Token 共存)

### 9b: 全局 SSE (2 天)
useGlobalEvents hook + GET /api/v1/events 端点

### 9c: 审计日志 (2 天)
AuditLog.tsx + GET /api/v1/audit-log 端点

### 9d: i18n 切换 UI (2 天)
语言切换控件; `t()` 改为纯翻译 (Breaking Change)

### 9e: CLI 终端 (3 天)
CLITerminal.tsx + POST /api/v1/cli/exec

### 9f: 全量移动端适配 (2 天)
所有表格 overflow-x-auto; flex-wrap; 逐页检查

---

## 十二、依赖关系

```
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3
                                      │
                         Phase 4 ─────┤
                         Phase 5 ─────┤
                         Phase 6 ─────┤
                         Phase 7 ─────┤
                         Phase 8 ─────┤
                         Phase 9 ─────┘
```

### 可并行: Phase 4+5+6+7 (全部依赖 Phase 1 但不依赖彼此)

### 风险项
| 风险 | 级别 | 缓解 |
|------|------|------|
| t() 改为纯翻译 (Phase 9) | 高 | 全面检查 24 组件 UI 布局 |
| JWT + API Token 共存 | 中 | 灰度发布 |
| CLI 终端 API | 低 | 可先做前端终端仿真 |

---

## 十三、总量预估

| Phase | 天数 | 新建文件 | 修改文件 |
|-------|------|---------|---------|
| 0 | 6 | 3 | ~8 |
| 1 | 1 | 4 | 1 |
| 2 | 2 | 4 | 3 |
| 3 | 2 | 0 | 3 |
| 4 | 1 | 1 | 2 |
| 5 | 1 | 0 | 3 |
| 6 | 3 | 2 | 4 |
| 7 | 3 | 2 | 3 |
| 8 | 5 | 5 | 4 |
| 9 | 14 | 6 | 4 |
| **合计** | **37-41** | **~24** | **~36** |
