# ANFSF 集成计划 — ⚠️ 已被 REFACTOR-FIX 取代

> **状态**: ⚠️ 已过时 | 本文档的 I-001~I-008 集成任务已并入 [ANFSF-REFACTOR-FIX.md](ANFSF-REFACTOR-FIX.md) Phase 0-2。
> 请以 REFACTOR-FIX 为准。本文档保留供参考，不再更新。
>
> **原编制日期**: 2026-06-15 | **原基准**: IMPLEMENTATION-PLAN.md

---

## 一、当前状态

24 个模块已开发完成，每个模块都有独立的单元测试。但它们之间以及它们与 Fastify 服务器之间尚未连接。

```
✅ 已完成（独立模块）               ⬜ 待完成（集成工作）
─────────────────────────          ─────────────────────
PipelineStateMachine               接入 synthesize 路由
CodeGenerationLoop                 接入骨架生成流程
CheckpointManager                  接入 Pipeline 状态转换
TokenBudget                        接入 LLM 调用层
PRDQualityCheck                    接入 PRD 提交处理
ConfidenceAnnotator                接入需求分析响应
SkeletonGenerator                  接入 Agent 循环调度
GiteaClient                        接入服务器启动配置
WebhookRoute                       接入 Fastify 路由注册
CodeAnnotator                      接入 Webhook 处理
ContractWatcher                    接入 Commit 验证流程
CommitVerifier                     接入 Webhook 处理
FaultReporter                      接入验证失败通知
TaskGenerator                      接入骨架生成完成
FixEngine                          接入测试反馈处理
RegressionRunner                   接入修复后验证
ReleaseCheck                       接入发布流程
Archiver                           接入项目完成处理
RoleManager                        接入认证中间件
RequirementReview (React)          接入前端路由
ProjectDashboard (React)           接入前端路由
DeveloperWorkspace (React)         接入前端路由
```

---

## 二、集成任务清单

### I-001：服务器启动配置（1d）

**目标**: 服务器启动时初始化所有模块实例，注入依赖。

**改动文件**: `src/server/index.ts`

**工作内容**:
1. 创建 `LLMClient` 实例（从环境变量读取配置）
2. 创建 `GiteaClient` 实例（从环境变量读取 Gitea URL/账号）
3. 创建 `CheckpointManager` 实例（注入 store）
4. 创建 `RoleManager` 实例
5. 将所有实例挂载到 Fastify `decorate` 或通过路由 options 传递
6. 确保 `LLM_API_KEY`, `GITEA_URL`, `GITEA_USERNAME`, `GITEA_PASSWORD` 环境变量验证

**验收**:
- [ ] 服务器启动时所有模块实例成功创建
- [ ] 环境变量缺失时给出明确错误提示
- [ ] `/ready` 端点返回正确的就绪状态（LLM 可连接、Gitea 可连接）

---

### I-002：Synthesize 路由集成（3d）

**目标**: 将 PRD 提交、质量检查、置信度标注、骨架生成串入 `/api/v1/synthesize` 路由。

**改动文件**: `src/server/routes/synthesize.ts`

**工作内容**:

1. **PRD 提交处理**：
   - 接收 PRD 文本 → 调用 `evaluatePRDQuality()`
   - 质量 < 40 分：返回引导模式响应（`triggerGuidedMode: true`）
   - 质量 >= 40 分：进入需求分析流程

2. **需求分析流程**：
   - 调用现有 `AINativePRDParser` 解析 PRD → 结构化需求
   - 调用 `annotateRequirements()` → 标注置信度
   - 返回需求分析结果给前端（含置信度标注）
   - 等待 PM 确认（I-003）

3. **骨架生成流程**（PM 确认后触发）：
   - 创建 `PipelineStateMachine` 实例
   - 状态转换：`stage1_parsing` → `stage1_locked` → `stage1_generating`
   - 调用 `SkeletonGenerator.generate()` → 生成骨架代码
   - 状态转换：`stage1_generating` → `stage1_done`
   - 保存检查点
   - 调用 `TaskGenerator.generate()` → 生成 TASK.md
   - 调用 `GiteaClient.createRepo()` + `pushFile()` → 推送初始代码

4. **SSE 进度推送**：
   - 每个步骤完成时推送 SSE 事件
   - 事件类型：`quality_check`, `annotation`, `generation_start`, `generation_progress`, `generation_done`, `task_package`

**验收**:
- [ ] 提交正常 PRD → 返回需求分析结果 + 置信度标注
- [ ] 提交低质量 PRD → 返回引导模式提示
- [ ] PM 确认后 → 异步生成骨架 → SSE 推送进度 → 代码推送到 Gitea
- [ ] 生成失败时 → 返回错误信息 + 检查点可用于恢复

---

### I-003：需求确认路由集成（1d）

**目标**: PM 可通过 API 确认/修改需求，确认后锁定并触发骨架生成。

**改动文件**: 新增路由或扩展现有 `synthesize.ts`

**工作内容**:
1. `PUT /api/v1/pipeline/:jobId/requirements/confirm`
2. 接收 PM 确认的需求条目列表
3. 更新置信度标注中的 `pmConfirmed` 字段
4. 锁定需求规格版本
5. 触发 I-002 的骨架生成流程

**验收**:
- [ ] PM 可逐条确认/修改需求
- [ ] 确认后需求规格版本锁定
- [ ] 锁定后自动触发骨架生成

---

### I-004：Webhook 路由 + 代码标注集成（2d）

**目标**: 接收 Gitea push 事件，触发代码标注和验证流水线。

**改动文件**: `src/server/routes/webhook.ts`（已创建，需注册到 Fastify）

**工作内容**:
1. 在 `src/server/index.ts` 中注册 webhook 路由
2. 实现 `WebhookHandler.onPush`：
   - 接收 push event → 调用 `GiteaClient.getDiff()`
   - 调用 `CodeAnnotator.annotate()` → 标注代码变动
   - 调用 `ContractWatcher.check()` → 检查契约变动
   - 调用 `CommitVerifier.verify()` → 运行验证流水线
   - 验证失败 → 调用 `FaultReporter.generate()` → 推送通知
   - 验证通过 → 更新项目状态 → 部署测试环境
3. 轮询兜底：每 5 分钟检查一次未处理的 commit

**验收**:
- [ ] Gitea push → ANFSF 收到 webhook → 触发代码标注
- [ ] 标注结果正确分类（generated/modified/new）
- [ ] API 文件修改 → 契约变动通知
- [ ] 验证失败 → 生成故障报告 → 通知开发者

---

### I-005：测试反馈 + 修复引擎集成（2d）

**目标**: PM 提交的测试反馈自动路由到分级修复引擎。

**改动文件**: 新增路由或扩展 `synthesize.ts`

**工作内容**:
1. `POST /api/v1/pipeline/:jobId/feedback`（API-SPEC 2.7）
2. 接收 PM 反馈 → 调用 `FixEngine.classify()` 判断 L1/L2/L3
3. L1：调用 Agent 循环自动修复 + 自动提交
4. L2：生成修复建议 diff + 返回给前端
5. L3：生成定位报告 + 返回给前端
6. 修复后 → 调用 `RegressionRunner.run()` → 回归检查
7. 全部通过 → 通知 PM 确认

**验收**:
- [ ] 骨架代码问题 → L1 自动修复
- [ ] 开发代码问题 → L2 建议修复 / L3 定位
- [ ] 修复后自动回归检查
- [ ] 回归失败 → 阻断 + 通知

---

### I-006：发布 + 归档集成（1d）

**目标**: PM 确认发布后运行三层检查并归档项目。

**改动文件**: 新增路由

**工作内容**:
1. `POST /api/v1/pipeline/:jobId/release`（API-SPEC 2.10）
2. 调用 `ReleaseCheck.check()` → 三层检查
3. 全部通过 → 状态转换至 `stage5_archiving`
4. 调用 `Archiver.archive()` → 生成度量报告 + 组件候选标记
5. 保存最终检查点
6. 状态转换至 `stage5_done`

**验收**:
- [ ] 三层检查全通过 → 发布按钮可用
- [ ] 任一检查不通过 → 列出阻塞项
- [ ] 发布后自动归档 + 生成度量报告

---

### I-007：前端路由集成（2d）

**目标**: 将 Phase 1 创建的前端组件接入 React 应用。

**改动文件**: `web/src/App.tsx`, `web/src/main.tsx`

**工作内容**:
1. 安装 `react-router-dom`（如未安装）
2. 配置路由：
   - `/` → PRDForm（现有）
   - `/project/:id` → ProjectDashboard（T-402）
   - `/project/:id/review` → RequirementReview（T-103）
   - `/project/:id/test` → TestReview（T-303，需新建简化版）
   - `/workspace` → DeveloperWorkspace（T-403）
3. 添加 API 调用层：前端组件调用后端 API 获取数据
4. SSE 连接：ProjectDashboard 监听 `/api/v1/pipeline/:id/stream`

**验收**:
- [ ] 所有页面可正常路由
- [ ] ProjectDashboard 显示五阶段进度
- [ ] RequirementReview 可确认/修改需求
- [ ] DeveloperWorkspace 可查看任务列表

---

### I-008：全流程联调（3d）

**目标**: 端到端跑通所有流程，修复集成问题。

**工作内容**:
1. 启动 Gitea 本地实例
2. 启动 ANFSF 服务器（配置真实 DeepSeek API Key）
3. 启动前端
4. 测试完整流程：
   - 提交 PRD → 质量检查 → 需求分析 → PM 确认
   - 骨架生成 → Agent 循环验证 → 推送 Gitea
   - 模拟开发提交 → Webhook 触发 → 代码标注 → 验证
   - 提交测试反馈 → 分级修复 → 回归检查
   - PM 确认 → 发布检查 → 归档
5. 修复发现的问题

**验收**:
- [ ] 全流程端到端跑通
- [ ] 无阻断性 bug
- [ ] 前端界面可用（即使 UI 不完美）

---

## 三、任务依赖关系

```
I-001（服务器配置）
  ├── I-002（Synthesize 路由）
  │     └── I-003（需求确认路由）
  ├── I-004（Webhook + 标注）
  │     └── I-005（反馈 + 修复）
  │           └── I-006（发布 + 归档）
  └── I-007（前端路由）

I-008（全流程联调）← 依赖所有 I-001 ~ I-007
```

**并行策略**：
- 后端开发者做 I-001 → I-002 → I-004（5-6 天）
- 前端开发者做 I-007（2 天，然后协助后端）
- 两人一起做 I-003, I-005, I-006（3-4 天）
- 一起做 I-008（3 天）

---

## 四、集成完成后的状态

```
用户（PM）通过浏览器：
  1. 打开 ANFSF Web → 提交 PRD
  2. 看到需求分析结果（带置信度标注）
  3. 逐条确认/修改 → 锁定需求
  4. 系统自动生成骨架 → 推送到 Gitea
  5. 前端/后端开发 clone 代码 → 填写业务逻辑
  6. 开发 push 代码 → ANFSF 自动验证
  7. 发现问题 → 系统自动修复或建议
  8. PM 测试确认 → 三层发布检查 → 发布
  9. 系统自动归档 → 生成度量报告
```

---

## 五、开发所需环境

| 组件 | 版本 | 备注 |
|------|------|------|
| Node.js | 20.x | nvm-windows 管理 |
| Gitea | 1.25.4 本地 | `http://localhost:3001` |
| DeepSeek API Key | sk-*** | 用于 LLM 调用 |
| 数据库 | SQLite | 零配置 |

**启动命令**（开发时）：
```
# 终端 1：Gitea
set GITEA_WORK_DIR=C:\gitea && gitea.exe web --port 3001

# 终端 2：ANFSF 后端
set LLM_API_KEY=sk-*** && set GITEA_URL=http://localhost:3001 && set GITEA_USERNAME=anfsf && set GITEA_PASSWORD=anfsf123 && npm run dev

# 终端 3：前端
cd web && npm run dev
```

---

> **交给开发者**: 这份文档 + [技术架构设计](TECHNICAL-DESIGN.md) + [API 设计规范](API-SPEC.md) + [数据库 Schema](DATABASE-SCHEMA.md) + [开发规范](DEVELOPMENT-STANDARDS.md) 即可开始集成工作。每个任务有明确的输入/输出/验收标准。
