# ANFSF — Project Context for Claude Code

> **版本**: 2.0 | **日期**: 2026-06-17
> 此文件为 Claude Code 会话提供关键上下文。每次会话开始时自动加载。

---

## 一、项目定位

ANFSF (Autonomous Non-Fungible Software Factory) 是一个**智能软件开发系统**，目标是将软件开发全流程 AI/Agent 化。

**最终愿景**: 从 PRD 到可部署项目的全自动闭环，仅保留 1 产品 + 1 后端 + 1 前端人员，负责 PRD 确认、逻辑编码、测试和优化。

**当前阶段**: Phase 1 — 生成阶段（PRD→代码骨架+TASK.md）已跑通。开发者阶段（Stage 2-3）和验证发布阶段（Stage 4-5）尚未实现。

---

## 二、当前状态 — 最重要的信息

**运行时接入率约 35%**。这是理解本项目的唯一最重要事实。

### 实际运行的路径（`POST /api/v1/synthesize`）

```
synthesize.ts → runAgentPipeline()
  ├── Step 1: evaluatePRDQuality()               [规则引擎，无LLM]
  ├── Step 2: AINativePRDParser.parse()          [LLM call #1，deepseek-chat]
  ├── Step 3: TokenBudget 恢复 + preEvaluate      [成本管理]
  ├── Step 4: CodeGenerationLoop.run()            [Agent Loop 核心]
  │    ├── generate() → LLM call #2              [生成代码]
  │    ├── writeOutput() → npm install            [写磁盘+装依赖]
  │    ├── verify() → CompileValidator (tsc)      [唯一验证工具]
  │    └── fix() → LLM call #3 (最多2轮)          [修复编译错误]
  ├── Step 5: TaskGenerator → TASK.md             [任务分解]
  ├── Step 6: GiteaClient.push()                  [best effort]
  └── Step 7: saveBudgetRecords()                 [预算持久化]
```

### 未接入的关键模块

| 类别 | 总数 | 接入运行时 | 说明 |
|------|------|-----------|------|
| Core 模块 | ~50 | 1 (`compile-validator`) | graph-engine, backend/frontend-architect 等全孤立 |
| Skills | 18 | 0 | SkillsRegistry 注册函数为空 |
| Harnesses | 9 | 0 | agent/governance/evolution/uiux 全孤立 |
| Evolution 模块 | 7 | 0 | framework, rollback, introspection 代码存在但未触发 |
| Pipeline 阶段 | 5 | 2 个状态转换 | 仅 `stage1_parsing→stage1_done` |
| Server 路由 | 16 | 16 | 路由全注册，但大部分只返回空数据 |

### 13 步工作流覆盖

| 阶段 | Steps | 运行时覆盖 | 评分 |
|------|-------|-----------|------|
| 生成阶段 | 1-4 (PRD→代码) | 骨架生成跑通 | 7/10 |
| 开发者阶段 | 5-7 (编码→验证→修复) | Gitea push only | 2/10 |
| 验证发布阶段 | 8-12 (测试→发布→归档) | 零 | 0/10 |
| 进化阶段 | 13 (自进化) | 零 | 0/10 |

---

## 三、架构概览

### 双重架构并存

| 架构 | 状态 | 说明 |
|------|------|------|
| **五阶段状态机 + Agent Loop** | ✅ 活跃运行 | 当前主路径，见上方 |
| **17 层理论架构** | 📐 设计参考 | 65% 代码存在，35% 接入。详见 [AUDIT-FULL-STACK](docs/AUDIT-FULL-STACK.md) |

### Agent Loop 执行引擎

- **基类**: `AgentLoop<TInput, TOutput, TError>` — 模板方法模式（214行）
- **子类**: `CodeGenerationLoop`（382行，活跃）、`DevFixLoop`（435行，未接入）、`TestGenLoop`（280+行，未接入）
- **验证链**: 仅 `CompileValidator (tsc --noEmit)` 活跃。3 个额外 Skill 已实现未接入
- **工具系统**: **无**。Agent Loop 纯文本管道，对标竞品（Claude Code 43+工具、SWE-agent 4工具）严重薄弱
- **成本管理**: 三级阈值（warn 70%/block 90%/hardBlock 135%）+ 统一定价 + SQLite 持久化 + Prometheus 指标。行业领先

### 关键架构缺口

| 缺口 | 严重度 | 说明 |
|------|--------|------|
| 无工具系统 | 🔴致命 | `generate()` 只有一行 `this.llm.chat()` |
| 无沙箱执行 | 🔴致命 | npm install 直接在本地文件系统运行 |
| 无任务分解 | 🔴致命 | 大 PRD 一次性全体生成 |
| 无多 Agent 协作 | 🟠严重 | 单一 Loop，无子 Agent 委托 |
| 验证链薄弱 | 🟠严重 | 仅 tsc 编译检查 |
| 无上下文压缩 | 🟡中等 | 长 prompt 线性膨胀 |

---

## 四、关键决策（锁定，不可推翻）

1. **Agent Loop 不生成业务逻辑** — 骨架代码以 `// TODO: implement` 结尾。业务逻辑始终由人类开发者手动填写
2. **Stage 2 (dev) 是黑盒** — ANFSF 不干预开发者的本地 IDE
3. **FixEngine 三级边界** — generated/modified/new × style/type/interface/business，L1 自动修复/L2 建议 Diff/L3 仅定位
4. **五阶段状态机** — created→parsing→locked→generating→done（当前仅 2 个状态转换活跃）
5. **LLM Provider 可插拔** — DeepSeek 主、DashScope 备，通过环境变量配置

---

## 五、代码库速览

| 指标 | 数值 |
|------|------|
| TypeScript 源文件 | 211 |
| 测试文件 | 126 |
| 总代码行 | 57,665 |
| 测试通过 | 1,617/1,632 (99.1%) |
| 测试失败 | 10（环境依赖，6 suites 失败） |
| 类型检查 | `npx tsc --noEmit` → 零错误 |

### 文件约定

- 模块: `kebab-case.ts` | 测试: `__tests__/*.test.ts` | 组件: `PascalCase.tsx` | 文档: `UPPERCASE.md` in `docs/`

### 常用命令

```bash
npm run build          # 构建
npm run server         # 开发服务器
cd web && npm run dev  # 前端
npm test               # 测试
npx tsc --noEmit       # 类型检查
```

---

## 六、文档地图

| 文档 | 用途 | 何时读 |
|------|------|--------|
| [docs/ANFSF-REFACTOR-FIX.md](docs/ANFSF-REFACTOR-FIX.md) | 系统真实状态基准（需更新统计数据） | **首次必读** |
| [docs/AUDIT-FULL-STACK.md](docs/AUDIT-FULL-STACK.md) | 全面审查报告：13步工作流+生成阶段+竞品对比 | 理解系统全貌 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 当前架构图 + 组件说明 | 理解系统结构 |
| [docs/ANFSF-BLUEPRINT.md](docs/ANFSF-BLUEPRINT.md) | 13步工作流详情 + 三缺口 + 演进路线 | 理解设计意图 |
| [docs/ANFSF-DEVELOPMENT-PATH.md](docs/ANFSF-DEVELOPMENT-PATH.md) | 锁定决策 + 执行参考 | 开发前必读 |
| [docs/COST-MANAGEMENT-FIX.md](docs/COST-MANAGEMENT-FIX.md) | 成本管理体系修复文档 | 理解预算系统 |
| [docs/DOC-AUDIT-REPORT.md](docs/DOC-AUDIT-REPORT.md) | 文档体系自洽性审查 | 文档维护参考 |
| [docs/DATABASE-SCHEMA.md](docs/DATABASE-SCHEMA.md) | 数据库表结构 | 数据层变更时 |
| [docs/DEVELOPMENT-STANDARDS.md](docs/DEVELOPMENT-STANDARDS.md) | 开发规范 | 新成员入职 |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | 运维手册 | 部署/故障时 |
| [docs/API-SPEC.md](docs/API-SPEC.md) | API 规范 | 接口开发时 |

---

## 七、环境

- **OS/运行时**: Windows 11 Pro, Node.js 20+, npm 10+
- **数据库**: SQLite（默认，WAL 模式），PostgreSQL（可选）
- **LLM**: DashScope (Qwen) 或 DeepSeek，通过 `DASHSCOPE_API_KEY` / `DEEPSEEK_API_KEY` 配置
- **Git 服务**: Gitea 1.25.4 @ localhost:3001
- **预算控制**: `TOKEN_BUDGET` 环境变量（默认 5,000,000 tokens）

---

## 八、已知陷阱 — 每次会话开始前必读

> 从 200+ 次审查中提炼的不可再犯的错误。

### 陷阱 1: "文件存在 ≠ 运行时接入"

看到模块有文件就假设它在工作。**现实**: `DevFixLoop` 有 435 行代码但 `synthesize.ts` 不导入它。
**规则**: `grep <ModuleName> src/server/routes/synthesize.ts` 确认被导入后再声明"已实现"。

### 陷阱 2: "文档 [x] ≠ 代码真的修了"

`audit-report.md` 的 `[x]` 标记可能是预填的期望而非核实的结果。
**规则**: 对任何 `[x]` 标记，用 `grep` 到代码中验证。

### 陷阱 3: 新旧架构混用

`product-pipeline.ts`（旧 17 层）和 `synthesize.ts`→`CodeGenerationLoop`（新 Agent Loop）并存。
**规则**: 新功能在 `synthesize.ts`→Agent Loop 路径接入。旧 pipeline 的 `PipelineStep` 类型可用，运行逻辑已废弃。

### 陷阱 4: 定价表分裂

`llm-client.ts` 和 `token-budget.ts` 一度独立维护两套 `MODEL_PRICING`，差 3-7 倍。
**规则**: 定价变更只改 `llm-client.ts`（单一事实来源）。

### 陷阱 5: 修复 ≠ 加注释

P1-6 的"修复"是加注释而非改代码。
**规则**: 注释是文档，不是修复。

### 自查

```bash
bash scripts/audit/run-all.sh
```
