# ANFSF 阶段性完整报告

> **生成日期**: 2026-05-25
> **当前版本**: v0.8.5
> **分支**: master
> **总提交数**: 118+

---

## 一、项目概览

**ANFSF**（Autonomous Non-Fungible Software Factory，自主非重复软件工厂）是一个将产品需求文档（PRD）自动转化为生产级代码的智能生成系统。系统基于 17 层认知流水线架构，通过角色合成、经济学驱动任务分配、四门控质量保障体系，实现从 PRD 到可运行项目的端到端自动化。

| 指标 | 数据 |
|------|------|
| 源文件 (TypeScript) | 261 个 |
| 测试文件 | 103 个 |
| 代码总行数 | ~70,310 行 |
| Web 前端文件 | 85 个 |
| 依赖（生产） | 8 个核心包 |
| 依赖（开发） | 10 个工具包 |

---

## 二、架构分层

```
┌─────────────────────────────────────────────────┐
│                  Web Frontend                     │
│         React 18 + Vite + TailwindCSS            │
│    SSE 实时进度 · Mermaid 图 · 文件上传          │
├─────────────────────────────────────────────────┤
│                   API Layer                       │
│       Fastify 5 · CORS · Helmet · Multipart      │
│     Bearer Auth · Rate Limit · Tracing           │
├─────────────────────────────────────────────────┤
│              Input Governance                     │
│    HTML 剥离 · 注入检测 · 消毒 · 格式验证        │
├─────────────────────────────────────────────────┤
│              17-Layer Pipeline                    │
│  L1 PRD 解析 → L2 质量门 → L3 Why-What-How      │
│  L4 Graph IR → L5 架构决策 → L6 UI 合成          │
│  L7 架构生成 → L8 细节打磨 → L9 文件写入         │
│  L10 编译验证 → L11 质量门 → L12 安全审计        │
│  L13 幻觉检测 → L14 防护检查 → L15-17 扩展层     │
├─────────────────────────────────────────────────┤
│              Agent OS                             │
│   状态机 · 记忆 · 健康监控 · MCP 协调协议        │
├─────────────────────────────────────────────────┤
│              Skills Registry                      │
│   12+ 认知技能：推理/审计/沙箱/引用/压缩/回顾    │
├─────────────────────────────────────────────────┤
│              Integrations                         │
│   LLM 多 Provider · GraphRAG · 向量搜索 · CI     │
├─────────────────────────────────────────────────┤
│              Storage & Data                       │
│   SQLite (默认) · PostgreSQL (可选) · 文件存储    │
└─────────────────────────────────────────────────┘
```

---

## 三、核心模块详情

### 3.1 src/core/ — 认知引擎核心（61 个源文件）

| 子模块 | 文件数 | 功能 |
|--------|--------|------|
| `contract/` | 14 | API 合约引擎、合约差异路由、DB Schema 生成、OpenAPI 差异、语义化版本、UI 合成模块 |
| `evolution/` | 10 | 自进化系统——回滚管理、内省引擎、变更预算、冻结管理、AST 回写、前后端架构师、人工确认、离线优化、回归检测 |
| `graph/` | 7 | 依赖图 IR——缓存、CLI、事件、热力图评分、遍历、类型定义 |
| `role/` | 7 | 角色合成——预算类型、KPI 引擎、KPI 导出、权重校准 |
| `synthesizer/` | 8 | 综合分析——冲突解决、热合约、返工风险、经济学评分、安全优化器、所有权证明、否决执行器 |
| `dod/` | 2 | Definition of Done——编译门、自动审批 |
| `ownership/` | 4 | 所有权门控、提案、状态机 |
| `quality/` | 2 | 编译验证、质量门 |
| `architecture/` | 1 | 自动扩缩容引擎 |
| `task-dag/` | 1 | 任务 DAG 引擎 |
| `strategy/` | 1 | 策略流水线 |
| `fs/` | 2 | 文件写入、图桥接 |
| `guard-pipeline.ts` | 1 | 门控增强流水线包装器 |

### 3.2 src/agents/ — Agent 操作系统（10 个源文件）

| 模块 | 功能 |
|------|------|
| `agent-os.ts` | 中央编排器——状态机、记忆、健康监控、MCPBus 协调 |
| `agent-os-factory.ts` | AgentOS 实例工厂 |
| `agent-registry.ts` | Agent 注册与查找 |
| `agent-state-machine.ts` | Agent 状态转换 |
| `agent-health-monitor.ts` | 健康检查、资源追踪 |
| `agent-memory.ts` | Agent 记忆存储（临时/持久） |
| `coordination-protocol.ts` | 多 Agent 交接与通信 |
| `external-review-agent.ts` | 外部评审 Agent |

### 3.3 src/skills/ — 认知技能注册表（20 个源文件，12+ 技能）

| 技能 | 功能 |
|------|------|
| `why-what-how-reasoner` | 第一性原理推理 |
| `hallucination-guard-skill` | LLM 输出事实核查 |
| `security-auditor-skill` | 生成代码漏洞扫描 |
| `code-quality-guard-skill` | 代码风格与质量验证 |
| `policy-guard-skill` | 合规性强制 |
| `detail-polisher` | 代码打磨与优化 |
| `sandbox-executor` | 隔离代码执行 |
| `cd-pipeline-skill` | CI/CD 流水线生成 |
| `citation-tracer-skill` | 源代码引用追踪 |
| `context-compressor-skill` | 上下文压缩 |
| `deep-reasoning-skill` | 深度推理 |
| `hybrid-retriever-skill` | 混合检索（向量 + 图） |
| `memory-consolidation-skill` | 记忆整合 |
| `requirement-compiler-skill` | 需求编译 |
| `requirement-refiner-skill` | 需求精化 |
| `retrospective-engine` | 回顾分析 |
| `safe-trend-scanner` | 趋势扫描 |

### 3.4 src/server/ — REST API 服务（14 个源文件）

| 组件 | 功能 |
|------|------|
| `index.ts` | Fastify 启动、插件注册、环境变量验证、全局错误处理 |
| **路由** | `synthesize`（POST JSON + 多部分）、`pipeline`（列表 + SSE 流）、`health`（健康/就绪检查）、`metrics`（Prometheus 格式）、`llm-playground`（LLM 交互）、`confirmation`、`feedback` |
| **中间件** | 认证（Bearer Token）、限流（令牌桶）、追踪（X-Request-ID） |
| **存储** | SQLite 存储（默认）、PostgreSQL 存储（可选）、Schema 迁移 |

### 3.5 src/pipeline/ — 17 层流水线编排

| 层级 | 步骤 | 超时预算 |
|------|------|----------|
| L1 | PRD 解析 | 5 min |
| L2 | 质量门 | - |
| L3 | Why-What-How 推理 | - |
| L4 | Graph IR 编译 | - |
| L5 | 架构决策 | - |
| L6 | UI 合成 | - |
| L7 | 架构生成 | 10 min |
| L8 | 细节打磨 | - |
| L9 | 文件写入 | - |
| L10 | 编译验证 | - |
| L11 | 质量门 | - |
| L12 | 安全审计 | - |
| L13 | 幻觉检测 | - |
| L14 | 防护检查 | - |
| L15-17 | 扩展层 | - |
| **总计** | | **30 min** |

---

## 四、测试体系

### 4.1 测试配置

| 配置项 | 值 |
|--------|-----|
| 框架 | Jest 29.5 + ts-jest |
| 环境 | Node.js |
| 超时 | 10 秒 |
| 覆盖率阈值 | 语句 50% / 行 50% / 分支 49% / 函数 50% |
| 路径别名 | `@/*` → `src/*` |

### 4.2 测试分布（103 个测试文件）

| 模块 | 测试文件数 | 覆盖范围 |
|------|-----------|----------|
| `src/agents/__tests__/` | 8 | Agent OS、状态机、记忆、健康、注册、协调、外部评审、集成 |
| `src/core/` | 29 | 合约(9)、进化(9)、图(4)、所有权(1)、质量(2)、角色(1)、策略(1)、综合(1)、任务 DAG(1)、门控(1) |
| `src/skills/__tests__/` | 14 | 所有主要技能 |
| `src/server/__tests__/` | 7 | 认证、健康检查、流水线流、限流、存储、PostgreSQL 存储、合成多部分 |
| `src/harness/__tests__/` | 7 | AB 测试、Agent Harness、金丝雀、部署、集成、技能注册 |
| `src/integrations/__tests__/` | 4 | GitHub CI、GraphRAG、LLM 客户端、向量搜索 |
| `src/governance/__tests__/` | 1 | 治理控制 |
| `src/input-governance/__tests__/` | 3 | 输入治理 |
| `src/mcp/__tests__/` | 1 | MCP 协议 |
| `src/observability/__tests__/` | 1 | 可观测性 |
| `src/pipeline/__tests__/` | 1 | 流水线 |
| `src/req-graph/__tests__/` | 2 | 需求图 |
| `src/ui/__tests__/` | 5 | UI 组件 |
| `src/__tests__/` | 4 | 集成(×2)、服务器、样式加载 |
| `src/simulation/__tests__/` | 1 | 模拟测试 |
| `src/storage/__tests__/` | 1 | 存储 |
| `src/templates/__tests__/` | 1 | 模板 |
| `e2e/` | 7 | 完整 API 流（合成、列表、状态、SSE、健康、404） |

---

## 五、CI/CD 流水线

### 5.1 GitHub Actions（7 个 Job）

| Job | 执行内容 | 前置依赖 |
|-----|----------|----------|
| **typecheck** | `tsc --noEmit` (Node 20) | 无 |
| **lint** | `npm run lint` (ESLint) | 无 |
| **test** | `npm run test:coverage` + Codecov v5 上传 | 无 |
| **build** | `npm run build` | typecheck + lint + test |
| **integration** | 集成测试 | build |
| **security** | `npm audit` + Snyk 扫描 | - |
| **docker-build** | 构建推送 GHCR (仅 main) | build |
| **release** | semantic-release + changelog (仅 main) | - |

**触发条件**: push 到 `main`/`develop`，pull_request 到 `main`

### 5.2 Docker 部署

**后端 Dockerfile**: 多阶段构建（`node:20.20.2-alpine`），TypeScript 编译 → 仅安装生产依赖 → 重建 `better-sqlite3` → 非 root 用户（uid 1001）→ 端口 3000 → HEALTHCHECK

**Docker Compose**（5 服务）:
| 服务 | 镜像/配置 | 端口 |
|------|-----------|------|
| postgres | 17-alpine | 内部 |
| anfsf | 后端 | 3000 |
| frontend | nginx | 8080 |
| prometheus | v2.51.0 | 内部 |
| grafana | 10.4.0 | 3001 |

### 5.3 Makefile（18 个目标）

`build`, `deploy`, `deploy-pg`, `restart`, `restart-pg`, `rollback`, `stop`, `stop-pg`, `logs`, `logs-follow`, `health`, `clean`, `pg-up`, `pg-down`, `pg-backup`

---

## 六、文档体系

| 文档 | 大小 | 内容 |
|------|------|------|
| `docs/ARCHITECTURE.md` | 20KB | 完整系统架构（ASCII 图）、数据流、安全模型、LLM Provider、部署架构 |
| `docs/RUNBOOK.md` | 11KB | 运维手册——快速开始、部署、环境变量、API 端点、监控指标、告警阈值、备份恢复、故障排除 |
| `docs/audit-report.md` | 12KB | ANFSF vs Claude Code 审计对比，28 个发现（P0-P3），执行状态 |
| `docs/INTERLAYER-PROTOCOL.md` | 35KB | 层间协议规范 |
| `SECURITY.md` | - | 安全策略——48h 确认、30 天关键漏洞修复 SLA |
| `README.md` | - | 项目说明 |

---

## 七、开发历程时间线

### 7.1 主要里程碑

| 提交 | 里程碑 | 说明 |
|------|--------|------|
| `6b173ea` | **Stage 7** | 真实 CI/CD、健康检查、生成项目 Docker |
| `28e3848` | **Stage 6** | 领域知识层（前端 UI、后端架构、DevOps） |
| `418256e` | **Stage 4-5** | 认知能力与四门控质量系统 |
| `5fe75a0` | **Stage 1-3** | 认知流水线、API 层、可观测性 |
| `7942b34` | **全面修复** | Phases 1-10 修复计划 |
| `c961ede` | **仓库整合** | 移除遗留项目与制品、修复测试 |

### 7.2 P0 修复（测试通过）

从 `b0775cb` 到 `d4db029`，历时 5 次提交，将测试失败从 38 降至 0，实现 **100% 测试通过率**。

### 7.3 P1 渐进式修复（Lint 错误）

从 `a3e13ab` 到 `27a0961`，历时 41 次提交，将 ESLint 错误从 **399 降至 156**（改善率 61%），采用小步快跑策略，每次修复 3-20 个错误。

### 7.4 P2 优化

从 `9fdfc25` 到 `d47c795`，涵盖测试覆盖率集成、Grafana 仪表盘开发、企业级能力三个 Phase。

### 7.5 架构重构

从 `a99af7e` 到 `07bbca6`，完成了 Harness 分离、Phases 1-5 验证、100% 测试通过率。

### 7.6 历史演进

项目从早期的股票操盘模拟系统、SparkPath 教育项目演进而来，经过 MemPalace 融合、双层结构、External Review Agent、超长上下文整合等多个阶段，最终形成当前的 ANFSF V4.0 架构。

---

## 八、技术栈

### 8.1 后端

| 类别 | 技术 |
|------|------|
| 运行时 | Node.js ≥ 20 |
| 语言 | TypeScript 5.0（ES2022, strict） |
| HTTP 框架 | Fastify 5.8.5 |
| 安全 | Helmet 13（CSP）、CORS、Bearer Auth |
| 数据库 | better-sqlite3（默认）、pg 8.20（可选） |
| 测试 | Jest 29.5 + ts-jest |
| Lint | ESLint 10.1 + @typescript-eslint 8.58 |

### 8.2 前端

| 类别 | 技术 |
|------|------|
| 框架 | React 18 |
| 构建 | Vite |
| 样式 | TailwindCSS |
| 路由 | React Router |
| 图表 | Mermaid.js |
| 实时 | SSE（EventSource） |

### 8.3 基础设施

| 组件 | 版本 |
|------|------|
| PostgreSQL | 17-alpine |
| Prometheus | v2.51.0 |
| Grafana | 10.4.0 |
| CI | GitHub Actions |
| 容器 | Docker + Docker Compose |

---

## 九、当前状态评估

### 9.1 已完成能力

- [x] 17 层认知流水线（L1-L17）
- [x] PRD 多格式解析（文本、图片、PDF、CSV）
- [x] 第一性原理推理（Why-What-How）
- [x] 需求图 IR 编译
- [x] 架构决策与自动生成
- [x] UI 合成模块
- [x] 四门控质量系统（编译、安全、幻觉、质量）
- [x] 12+ 认知技能注册与调度
- [x] Agent OS（状态机、记忆、健康、协调）
- [x] REST API（认证、限流、SSE）
- [x] React 前端（实时进度、文件上传、结果查看）
- [x] CI/CD 流水线（GitHub Actions）
- [x] Docker 全栈部署（PostgreSQL + 后端 + 前端 + 监控）
- [x] Prometheus 指标 + Grafana 仪表盘
- [x] 领域知识层
- [x] 自进化系统（回滚、内省、变更预算）
- [x] 103 个测试文件（单元 + 集成 + E2E）
- [x] 完整的文档体系（架构、运维、审计、安全）

### 9.2 待改进项

| 优先级 | 项目 | 状态 |
|--------|------|------|
| P1 | ESLint 错误从 156 降至 0 | 进行中 |
| P1 | 覆盖率阈值提升至 60%+ | 待启动 |
| P2 | LLM Provider 切换抽象层 | 已有基础 |
| P2 | PostgreSQL 作为默认存储 | 已有实现，需切换默认值 |
| P3 | Makefile 补充自动化目标 | 部分完成 |

### 9.3 关键指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 测试覆盖率 | ~50% (阈值) | 70%+ |
| Lint 错误 | 156 | 0 |
| 测试通过率 | 100% | 100% ✓ |
| 文档覆盖 | 4 篇核心文档 | 完整 |
| CI Job 通过率 | 待验证 | 100% |

---

## 十、项目结构速览

```
anfsf/
├── src/                          # 后端 TypeScript (261 文件, ~70K 行)
│   ├── agents/                   # Agent OS (10 文件)
│   ├── core/                     # 认知引擎 (61 文件)
│   │   ├── contract/             # API 合约引擎
│   │   ├── evolution/            # 自进化系统
│   │   ├── graph/                # 依赖图 IR
│   │   ├── role/                 # 角色合成
│   │   ├── synthesizer/          # 综合分析
│   │   └── ...
│   ├── skills/                   # 认知技能 (20 文件)
│   ├── server/                   # REST API (14 文件)
│   ├── pipeline/                 # 17 层编排
│   ├── governance/               # 治理控制面
│   ├── integrations/             # LLM/GraphRAG/向量搜索
│   ├── observability/            # 日志与指标
│   ├── input-governance/         # 输入治理
│   ├── prd/                      # PRD 解析
│   ├── req-graph/                # 需求图引擎
│   ├── mcp/                      # MCP 协议
│   ├── harness/                  # 测试 Harness
│   ├── simulation/               # 模拟测试
│   ├── storage/                  # 文件存储
│   ├── templates/                # 行业模板
│   └── ui/                       # UI 组件
├── web/                          # React 前端 (85 文件)
├── docs/                         # 文档 (4 篇核心)
├── e2e/                          # 端到端测试
├── infra/                        # Grafana/Prometheus 配置
├── scripts/                      # 备份脚本
├── coverage/                     # 测试覆盖率报告
├── output/                       # 生成项目产物
├── .github/workflows/            # CI/CD
├── Dockerfile                    # 后端镜像
├── Dockerfile.frontend           # 前端镜像
├── docker-compose.yml            # 全栈编排
└── Makefile                      # 构建/部署命令
```

---

## 十一、下一阶段建议

### 11.1 短期（1-2 周）

1. **清零 ESLint 错误**——继续 P1 渐进式修复策略，预计 8-10 次提交完成剩余 156 个错误
2. **提升测试覆盖率**——从当前 50% 阈值提升至 65-70%，重点关注 `src/core/evolution/` 和 `src/pipeline/`
3. **CI 流水线验证**——确保所有 GitHub Actions Job 在 push 后 100% 通过

### 11.2 中期（1-2 月）

4. **PostgreSQL 默认切换**——将默认存储从 SQLite 切换为 PostgreSQL，SQLite 作为降级选项
5. **LLM Provider 热切换**——完善多 Provider 抽象层，支持运行时切换 DashScope/DeepSeek/OpenAI
6. **E2E 测试扩展**——从当前 7 个 E2E 用例扩展至 20+，覆盖真实 LLM 调用的 mock 场景

### 11.3 长期（季度）

7. **流水线性能优化**——建立每层性能基线，优化 L7（架构生成）和 L10（编译验证）的长尾延迟
8. **自进化闭环**——完善 introspection engine 的自动回写能力，实现真正的自我优化
9. **多语言支持**——支持非中文 PRD 输入和多语言代码生成

---

## 附录 A：npm Scripts

| 命令 | 说明 |
|------|------|
| `npm run build` | TypeScript 编译 |
| `npm run test` | 运行测试 |
| `npm run test:watch` | 监听模式 |
| `npm run test:coverage` | 覆盖率报告 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | 类型检查（不编译） |
| `npm run server` | 开发模式启动（ts-node） |
| `npm run start` | 生产模式启动（dist） |

## 附录 B：核心 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/synthesize` | 提交 PRD（JSON / multipart） |
| GET | `/api/pipeline` | 列出所有流水线运行 |
| GET | `/api/pipeline/:id/stream` | SSE 实时进度流 |
| GET | `/api/pipeline/:id` | 获取运行详情 |
| GET | `/health` | 健康检查 |
| GET | `/ready` | 就绪检查 |
| GET | `/metrics` | Prometheus 指标 |

## 附录 C：环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 3000 | 服务端口 |
| `DATABASE_URL` | sqlite:.anfsf/runs.db | 数据库连接 |
| `LLM_PROVIDER` | dashscope | LLM 提供商 |
| `LLM_API_KEY` | - | API 密钥 |
| `LLM_MODEL` | qwen-plus | 模型名称 |
| `RATE_LIMIT_RPS` | 10 | 每秒请求限制 |
| `AUTH_TOKEN` | - | Bearer 认证令牌 |

---

> **报告说明**: 本报告基于 git 历史、文件统计、代码分析和文档审查自动生成。数据截至 2026-05-25。
