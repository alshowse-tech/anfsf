# ANFSF — Autonomous Non-Fungible Software Factory

ANFSF 是一个智能软件开发系统，将 PRD 转化为可编译运行的 TypeScript 全栈项目骨架。它是唯一从"PRD→全栈代码"方向切入的 AI-Native 软件工厂。

> **当前阶段**: Phase 1 — 生成阶段（PRD→代码骨架+TASK.md→Gitea）已跑通。验证发布阶段和进化阶段待实现。
> **运行时接入率**: ~35%。详见 [全面审查报告](docs/AUDIT-FULL-STACK.md)。

## 核心理念

ANFSF 的最终目标是**软件开发全流程 AI/Agent 化**——仅保留 1 名产品、1 名后端、1 名前端人员，负责 PRD 确认、逻辑编码、测试和优化。系统自动完成需求解析、架构决策、代码骨架生成、编译验证、任务分解和 Git 推送。

## 功能特性

| 特性 | 状态 | 说明 |
|------|------|------|
| **PRD→全栈代码** | ✅ 已实现 | 文本+附件(图片/CSV/PDF)→React+Express 项目 |
| **Agent Loop 生成引擎** | ✅ 已实现 | generate→verify(tsc)→fix 闭环，最多 2 轮修复 |
| **PRD 质量评估** | ✅ 已实现 | 4 维度评分（完整/一致/量化/可验证） |
| **三级成本管理** | ✅ 已实现 | warn(70%)/block(90%)/hardBlock(135%) + SQLite 持久化 + Prometheus |
| **输入安全防护** | ✅ 已实现 | Prompt 注入检测 + 输入净化 |
| **Gitea 集成** | ✅ 已实现 | 自动创建仓库并推送生成代码 |
| **任务分解** | ✅ 已实现 | 自动生成 TASK_FRONTEND.md + TASK_BACKEND.md |
| **编译时验证** | ✅ 已实现 | tsc --noEmit 自动检查，错误反馈→LLM 修复 |
| **跨项目学习** | ⚠️ 实验中 | CompileLearningDB 积累编译错误模式 |
| **开发者工作台** | ⏳ Phase 2 | DevFixLoop 已实现，待接入 Gitea webhook |
| **自动化测试生成** | ⏳ Phase 2 | TestGenLoop 已实现，待接入 synthesize |
| **发布门禁** | ⏳ Phase 3 | ReleaseCheck + CanaryDeployer 已实现，待接入 |
| **自进化引擎** | ⏳ Phase 3 | 7 个进化模块已实现，待接入 Pipeline |

## 快速开始

### 环境要求

- Node.js 20+, npm 10+
- LLM API Key（DashScope/Qwen 或 DeepSeek）
- Gitea（可选，用于代码推送）

### 安装与运行

```bash
git clone <repo-url> && cd anfsf
npm install
cp .env.example .env   # 编辑 .env 填入 API Key
npm run build
npm run server          # API 服务器启动在 :3000
cd web && npm run dev   # 前端启动在 :5173
```

### 提交第一个 PRD

```bash
curl -X POST http://localhost:3000/api/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{"prdText": "构建一个任务管理应用，支持创建、编辑、删除任务，按分类筛选"}'
```

返回 `{"jobId": "run_...", "status": "running"}`，通过 `/api/v1/pipeline/<jobId>/stream` 实时跟踪进度。

## 核心架构

```
POST /api/v1/synthesize
  → evaluatePRDQuality()          [规则引擎，4维评分]
  → AINativePRDParser.parse()     [LLM: PRD→结构化需求]
  → TokenBudget                   [预算恢复+预评估]
  → CodeGenerationLoop.run()      [Agent Loop 核心]
       generate() → verify(tsc) → fix() × maxRetries
  → TaskGenerator                 [TASK.md 生成]
  → GiteaClient.push()            [Git 推送]
  → saveBudgetRecords()           [预算持久化]
```

系统最初设计为 17 层理论架构，后重构为**五阶段状态机 + Agent Loop**。17 层设计作为参考保留，但当前只有约 35% 的代码接入运行时。详见 [ARCHITECTURE.md](docs/ARCHITECTURE.md) 和 [AUDIT-FULL-STACK.md](docs/AUDIT-FULL-STACK.md)。

## API 端点

| Method | Endpoint | 说明 |
|--------|----------|------|
| POST | `/api/v1/synthesize` | 提交 PRD 文本（JSON） |
| POST | `/api/v1/synthesize/multipart` | 提交 PRD 文本 + 附件（图片/CSV/PDF） |
| GET | `/api/v1/pipeline` | 列出最近的管道运行 |
| GET | `/api/v1/pipeline/:id/status` | 查询特定运行状态 |
| GET | `/api/v1/pipeline/:id/stream` | SSE 实时进度推送 |
| GET | `/health` | 存活检查 |
| GET | `/ready` | 就绪检查（含 LLM、DB、磁盘诊断） |
| GET | `/metrics` | Prometheus 指标（含 Token 预算指标） |
| POST | `/api/v1/llm/chat` | LLM 调试终端 |
| GET | `/api/v1/feedback/*` | 反馈与修复记录管理 |
| GET | `/api/v1/confirmation/*` | 人工确认管理 |
| GET | `/api/v1/dashboard` | 仪表盘数据 |

## 文档导航

| 文档 | 内容 | 阅读顺序 |
|------|------|---------|
| [AUDIT-FULL-STACK](docs/AUDIT-FULL-STACK.md) | **全面审查报告**：13 步工作流 + 生成阶段审计 + 竞品对比 + 修复路线图 | 🥇 首选 |
| [ANFSF-REFACTOR-FIX](docs/ANFSF-REFACTOR-FIX.md) | 系统真实状态基准（数据稍旧，以 AUDIT 为准） | 🥈 次选 |
| [ARCHITECTURE](docs/ARCHITECTURE.md) | 当前架构图 + 组件说明 | 了解系统结构 |
| [ANFSF-BLUEPRINT](docs/ANFSF-BLUEPRINT.md) | 13 步工作流详情 + 三缺口 + 演进路线 | 理解设计意图 |
| [ANFSF-DEVELOPMENT-PATH](docs/ANFSF-DEVELOPMENT-PATH.md) | 5 条锁定决策 + 执行参考 | 开发前必读 |
| [COST-MANAGEMENT-FIX](docs/COST-MANAGEMENT-FIX.md) | 成本管理体系设计与实现 | 理解预算系统 |
| [DOC-AUDIT-REPORT](docs/DOC-AUDIT-REPORT.md) | 文档体系自洽性审查 | 文档维护参考 |
| [API-SPEC](docs/API-SPEC.md) | REST API 详细规范 | 接口开发 |
| [DATABASE-SCHEMA](docs/DATABASE-SCHEMA.md) | 数据库表结构 | 数据层变更 |
| [RUNBOOK](docs/RUNBOOK.md) | 部署、监控、备份、故障处理 | 运维操作 |

## 配置

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `LLM_API_KEY` | 是 | — | LLM API Key |
| `ANFSF_MODEL` | 否 | `qwen3.5-plus` | LLM 模型 |
| `ANFSF_HOST` | 否 | `0.0.0.0` | 服务器绑定地址 |
| `ANFSF_PORT` | 否 | `3000` | 服务器端口 |
| `ANFSF_API_TOKEN` | 否 | — | API 认证令牌 |
| `TOKEN_BUDGET` | 否 | `5000000` | 每项目 Token 预算 |
| `DATABASE_URL` | 否 | — | PostgreSQL URL（空则使用 SQLite） |
| `GITEA_URL` | 否 | `http://localhost:3001` | Gitea 服务地址 |

## 项目结构

```
src/
  agents/            Agent Loop 引擎(基类+CodeGen/DevFix/TestGen 三个子类)
  server/            Fastify HTTP 服务器, 16 个路由模块, SQLite/Postgres 存储
  pipeline/          TokenBudget, TaskGenerator, 状态机, 旧 ProductPipeline(已弃用)
  integrations/      LLMClient(多Provider+CircuitBreaker+定价), GiteaClient
  prd/               PRD 解析器, 质量评估, 置信度标注
  core/              50 个核心模块(仅 compile-validator 接入运行时)
  skills/            18 个技能实现(SkillsRegistry 注册为空)
  harness/           9 个 Harness 模块(全孤立)
  input/             附件处理(图片/CSV/PDF)
  input-governance/  Prompt 注入检测, 输入净化
  observability/     结构化日志, Prometheus 指标
web/
  src/components/    React 组件(24 个, PRDForm/StageTabs/SettingsModal 等)
docs/                17 份架构/审查/运维文档
```

## 开发

```bash
npm run build          # 构建
npm run server         # 开发服务器
npm test               # 测试 (1,617/1,632 通过, 99.1%)
npx tsc --noEmit       # 类型检查 (零错误)
cd web && npm run dev  # 前端开发服务器
```

## License

MIT
