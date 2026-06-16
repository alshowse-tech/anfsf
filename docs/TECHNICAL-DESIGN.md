# ANFSF 技术架构设计文档

> **版本**: 1.1 | **日期**: 2026-06-16 | **状态**: Phase 1 开发依据
> ⚠️ **注意**: 七（目录结构）中的文件布局与实际代码不完全对齐。新增模块（Pipeline State Machine 等）已实现但目录结构需参考实际 `src/` 目录。
> 已废弃的 `product-pipeline.ts`（703行）将在 [REFACTOR-FIX](ANFSF-REFACTOR-FIX.md) Phase 3 中删除。
> 关联文档: [产品蓝图](product-discussion-2026-05-28.md) | [实施计划](IMPLEMENTATION-PLAN.md) | [**真实状态审计**](ANFSF-REFACTOR-FIX.md)

---

## 一、系统概述

ANFSF 是一个将产品需求文档（PRD）自动转化为项目骨架代码的平台。系统接收 PRD 文本及附件，经五阶段流水线处理后，输出可直接运行的 React 前端 + Node.js 后端项目骨架。

### 1.1 核心原则

- **人机协作**：AI 生成骨架结构，人填写业务逻辑
- **提交即触发**：开发 push 代码后自动验证，无需手动启动流程
- **保守修复**：系统对开发代码只做无争议修复（格式/类型），业务逻辑只定位不动手
- **渐进积累**：每完成一个项目，自动提取组件/模板/经验入库

### 1.2 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 运行时 | Node.js | 20.x LTS |
| 语言 | TypeScript | 5.x (strict mode, ES2022) |
| HTTP 框架 | Fastify | 5.x |
| 数据库 | SQLite (better-sqlite3) | 默认；PostgreSQL 可选 |
| 前端 | React + TailwindCSS + Vite | 18.x |
| 代码管理 | Gitea | 1.25.4 (API v1) |
| LLM | DeepSeek / OpenCode Go / DashScope | 可插拔 Provider 层 |
| 测试 | Jest + ts-jest | 29.x |
| 部署 | Docker + Compose | |

---

## 二、系统架构

### 2.1 顶层架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Frontend (React)                       │
│  PRD 提交 · 需求确认 · 项目看板 · 测试审查                        │
├─────────────────────────────────────────────────────────────────┤
│                      REST API Layer (Fastify)                     │
│  /api/synthesize  ·  /api/pipeline  ·  /health  ·  /metrics      │
├─────────────────────────────────────────────────────────────────┤
│                     Pipeline State Machine                        │
│  ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐   ┌──────┐          │
│  │Stage 0│ → │Stage 1│ → │Stage 2│ → │Stage 3│ → │Stage 4│ → │Stage 5│
│  │Knowledge│ │Parse  │  │Dev   │  │Verify│  │Test  │  │Archive│
│  └──────┘   └──────┘   └──────┘   └──────┘   └──────┘   └──────┘
│       │          │          │          │          │          │
│       ▼          ▼          ▼          ▼          ▼          ▼
│  Checkpoint  Checkpoint  (Git)    Checkpoint  Checkpoint  Checkpoint
├─────────────────────────────────────────────────────────────────┤
│                     Agent Loop (Code Generation)                  │
│  Generate → Verify → Fix (max 3 rounds) → Annotate → Return     │
├─────────────────────────────────────────────────────────────────┤
│                     Capability Providers                         │
│  Skills Registry  ·  Contract Engine  ·  Graph Engine           │
│  Quality Gates    ·  Evolution Engine ·  LLM Client             │
├─────────────────────────────────────────────────────────────────┤
│                     Storage & External                           │
│  SQLite/PostgreSQL  ·  Gitea (code repos)  ·  LLM APIs          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 组件层次

```
src/
├── server/              # HTTP API 层
│   ├── index.ts         # Fastify 启动入口
│   ├── routes/          # 路由处理
│   ├── middleware/       # 认证/限流/追踪
│   └── store.ts         # 数据持久化
│
├── pipeline/            # 流水线编排层
│   ├── pipeline-state-machine.ts  # 五阶段状态机
│   ├── checkpoint.ts    # 检查点与恢复
│   ├── token-budget.ts  # Token 预算控制
│   ├── code-annotator.ts # 代码变动标注
│   ├── commit-verification.ts # 提交验证
│   ├── fault-reporter.ts # 故障报告
│   ├── fix-engine.ts    # 分级修复引擎
│   ├── release-check.ts # 发布检查
│   └── archiver.ts      # 项目归档
│
├── agents/              # Agent 层
│   ├── code-generation-loop.ts  # 生成→验证→修复循环
│   ├── agent-os.ts      # Agent OS 骨架（现有）
│   └── agent-state-machine.ts   # Agent 状态机（现有）
│
├── prd/                 # PRD 处理层
│   ├── prd-parser.ts    # LLM PRD 解析（现有，将升级）
│   ├── prd-quality-check.ts    # PRD 质量预检（新增）
│   └── confidence-annotator.ts # 置信度标注（新增）
│
├── skills/              # 能力提供层（验证工具集）
│   ├── compile-validator.ts
│   ├── code-quality-guard-skill.ts
│   ├── security-auditor-skill.ts
│   └── ...
│
├── core/                # 核心引擎（现有，能力提供方）
│   ├── contract/        # API 合约引擎
│   ├── graph/           # 需求图引擎
│   ├── quality/         # 质量门
│   └── evolution/       # 进化引擎
│
├── integrations/        # 外部集成
│   ├── llm-client.ts    # LLM Provider 抽象层（将升级）
│   ├── gitea-client.ts  # Gitea API 客户端（新增）
│   └── graphrag.ts      # 知识图谱（现有）
│
└── input-governance/    # 输入安全（现有）
```

### 2.3 关键数据流

```
阶段一：PRD → 需求规格

  PRD 文本/附件
    → PRD 质量预检（≥70分直接分析，<40分进引导模式）
    → LLM 解析为结构化需求
    → 置信度标注（每一条目标注来源和置信度）
    → PM 确认界面（低置信度红色高亮）
    → 锁死 → 需求规格 v1 → 写入检查点 1

阶段一：需求规格 → 骨架代码

  需求规格 v1
    → Agent 循环（生成→验证→修复，最多3轮）
    → 骨架代码（前端 + 后端 + 契约 + 测试脚本骨架）
    → 代码自动标注 [generated]
    → 写入检查点 1

阶段二：开发提交 → 代码标注

  Git push (Gitea)
    → Webhook / 轮询 → ANFSF 收到 commit 列表
    → 对比初始骨架 → 标注 [generated]/[modified]/[new]
    → 契约检查（接口变动通知对方）
    → 标注数据写入 DB

阶段三：提交 → 验证

  Commit 事件
    → 契约测试（对照 OpenAPI 文档）
    → 集成测试（多接口调用链）
    → 失败 → 故障报告（定位代码位置 + 可能原因）
    → 全部通过 → 部署测试环境 → 写入检查点 3

阶段四：发现问题 → 修复

  测试反馈（PM 提交 或 自动化测试捕获）
    → 二维矩阵判断：代码来源 × 问题类型 → L1/L2/L3
    → L1：自动修复 + autofix commit
    → L2：生成 diff 建议 → 开发审核确认
    → L3：生成定位报告 → 开发自行修复
    → 每次修复后 → 回归测试 → 通知 PM 确认

阶段五：发布 → 归档

  PM 确认发布 → 三层发布检查（系统/PM/角色）→ 全部通过
    → 部署演示环境 → 通知相关方
    → 度量报告（耗时/返工/复用率）
    → 组件候选标记（供 Phase 2 入库使用）
    → 版本快照 → 写入检查点 5
```

---

## 三、Pipeline 状态机设计（T-001 核心产出）

### 3.1 状态定义

```
ProjectState = 
  'created'           // 项目已创建，等待提交 PRD
  | 'stage0_knowledge'  // 阶段零：知识注入
  | 'stage1_parsing'    // 阶段一：PRD 解析 + 需求确认
  | 'stage1_locked'     // 阶段一：需求已锁死
  | 'stage1_generating' // 阶段一：骨架生成中
  | 'stage1_done'       // 阶段一：完成
  | 'stage2_dev'        // 阶段二：开发进行中
  | 'stage3_verifying'  // 阶段三：验证中
  | 'stage3_passed'     // 阶段三：验证通过
  | 'stage4_testing'    // 阶段四：测试中
  | 'stage4_fixing'     // 阶段四：修复中
  | 'stage4_confirmed'  // 阶段四：PM 已确认
  | 'stage5_archiving'  // 阶段五：归档中
  | 'stage5_done'       // 阶段五：完成（终态）
  | 'failed'            // 异常终止（可从此状态恢复）
```

### 3.2 状态转换

```
created → stage0_knowledge  (PM 选择上传参考资料或跳过)
stage0_knowledge → stage1_parsing  (知识注入完成或跳过)

stage1_parsing → stage1_locked  (PM 确认需求)
stage1_parsing → stage1_parsing  (PM 修改后重新分析)
stage1_parsing → failed  (LLM 分析超时或异常)

stage1_locked → stage1_generating  (系统自动)
stage1_generating → stage1_done  (Agent 循环完成)
stage1_generating → failed  (Agent 循环异常)

stage1_done → stage2_dev  (任务分发完成)
stage2_dev → stage3_verifying  (开发全部任务完成 + 提交触发)

stage3_verifying → stage3_passed  (所有验证通过)
stage3_verifying → stage3_verifying  (修复后重新验证)
stage3_verifying → failed  (验证流水线异常)

stage3_passed → stage4_testing  (PM 开始测试)
stage4_testing → stage4_fixing  (发现问题)
stage4_fixing → stage4_testing  (修复完成，重新测试)
stage4_testing → stage4_confirmed  (PM 确认全部通过)

stage4_confirmed → stage5_archiving  (PM 点击发布)
stage5_archiving → stage5_done  (归档完成)

ANY_STATE → failed  (未捕获异常)
failed → LAST_CHECKPOINT  (恢复)
```

### 3.3 检查点设计

> 注意：TS 接口使用 camelCase，存储到 SQLite 时序列化为 JSON 存入 `data` 列，数据库列名使用 snake_case（`project_id`、`created_at`）。应用层在序列化/反序列化时负责映射。

```typescript
interface Checkpoint {
  id: string;                    // UUID
  projectId: string;
  stage: ProjectState;           // 检查点对应的阶段
  timestamp: number;
  data: {
    requirements?: {             // 阶段一产物
      version: string;
      spec: AINativePRD;
      confidenceAnnotations: ConfidenceAnnotation[];
      lockedBy: string;
      lockedAt: number;
    };
    skeleton?: {                 // 骨架代码产物
      commitHash: string;        // Gitea 上的初始提交
      fileTree: string[];        // 生成的文件列表
      contracts: {               // 接口契约
        openapi: object;
        dbSchema: object;
      };
    };
    verification?: {             // 阶段三产物
      passed: boolean;
      results: VerificationResult[];
      deployedAt: number;
      environmentUrl: string;
    };
    testing?: {                  // 阶段四产物
      testResults: TestResult[];
      fixRecords: FixRecord[];
      confirmedBy: string;
    };
  };
}
```

---

## 四、Agent 循环设计（T-002 核心产出）

### 4.1 接口定义

```typescript
interface AgentLoopConfig {
  maxRetries: number;            // 最大修复轮数（默认 3）
  verificationTools: string[];   // 启用的验证工具列表
  annotateOnSuccess: boolean;    // 成功后自动标注代码来源
  timeout: number;               // 单轮生成超时（ms）
}

interface AgentLoopResult {
  success: boolean;
  code: GeneratedCode;           // 最终代码（无论成功失败）
  rounds: number;                // 实际执行轮数
  errors: VerificationError[];   // 剩余未修复的错误
  annotations: CodeAnnotation[]; // 代码来源标注
  tokenUsage: TokenUsage;        // 各轮 Token 消耗
}

interface GeneratedCode {
  files: Map<string, string>;    // 文件路径 → 内容
  contracts: {
    openapi: OpenAPISpec;
    dbSchema: DBSchema;
  };
}

interface VerificationError {
  file: string;
  line: number;
  column: number;
  severity: 'error' | 'warning';
  message: string;
  rule: string;                  // 触发的规则名
  fixable: boolean;              // 系统可否自动修复
}

interface CodeAnnotation {
  file: string;
  startLine: number;
  endLine: number;
  source: 'generated' | 'modified' | 'new';
  annotatedAt: number;
}
```

### 4.2 生成流程

```
function generateCodeLoop(spec: RequirementSpec, config: AgentLoopConfig): AgentLoopResult

  // 第一轮：生成
  code = llm.generate({
    model: tier('high-quality'),    // 高质模型
    prompt: buildSkeletonPrompt(spec),
    context: spec
  })
  writeToDisk(code)
  
  // 第二轮起：验证 + 修复
  retries = 0
  while (retries < config.maxRetries):
    errors = runVerification(code, config.verificationTools)
    
    if errors.length == 0:
      break  // 全部通过
    
    fixableErrors = errors.filter(e => e.fixable)
    if fixableErrors.length == 0:
      break  // 剩下的修不了
    
    fix = llm.generate({
      model: tier('high-quality'),
      prompt: `Fix the following errors:\n${fixableErrors}`,
      context: code  // 带上原始代码
    })
    code = applyFix(code, fix)
    retries++
  
  // 最后一轮后：标注 + 上报
  annotations = annotateCodeSource(code)
  
  return {
    success: errors.length == 0,
    code: code,
    rounds: retries + 1,
    errors: errors,   // 诚实上报剩余错误
    annotations: annotations,
    tokenUsage: trackUsage()
  }
```

### 4.3 验证工具配置

```typescript
const DEFAULT_VERIFICATION_TOOLS = [
  'tsc-compile',        // TypeScript 编译检查 (CompileValidator)
  'eslint-check',       // 代码风格检查 (CodeQualityGuardSkill)
  'contract-match',     // 契约字段匹配（新增：对照 OpenAPI 检查接口调用）
  'skeleton-complete',  // 骨架完整性（新增：检查所有应有文件是否生成）
];

// Phase 1 先不启用 security-auditor，等 Phase 2 再加
```

### 4.4 与现有模块的对接

```
Agent 循环调用方式：

  generateCodeLoop(spec)
    ├── llm.generate()          → 调用升级后的 llm-client.ts
    ├── runVerification()       → 调用 skills/ compile-validator + code-quality-guard
    │                             + 新增 contract-match + skeleton-complete
    ├── applyFix()              → 调用 LLM + 文件写入
    └── annotateCodeSource()    → 调用新增的 code-annotator.ts

  不修改 skills/core 的内部实现，只改变调用方式。
```

---

## 五、LLM Provider 配置层设计（T-004 关联）

### 5.1 配置模型

```typescript
interface LLMProviderConfig {
  providers: ProviderConfig[];           // 启用的 Provider 列表
  tiers: ModelTierMap;                   // 模型分层映射
  budget: TokenBudget;                   // 预算配置
}

interface ProviderConfig {
  name: string;                          // 'deepseek' | 'opencode' | 'dashscope'
  apiKey: string;                        // 从环境变量读取
  baseUrl?: string;                      // 可选，自动从 key 前缀推断
  enabled: boolean;                      // 可动态禁用
  models: ProviderModel[];               // 该 Provider 可用模型列表
}

interface ProviderModel {
  name: string;                          // 'deepseek-chat' | 'qwen-plus' | 'flash' | 'pro'
  tier: 'high-quality' | 'standard' | 'lightweight';
  costPer1KInput: number;                // 每千 token 价格
  costPer1KOutput: number;
  maxTokens: number;                     // 上下文窗口
}

interface ModelTierMap {
  'high-quality': { primary: string; fallback: string };   // 骨架生成/修复
  'standard':     { primary: string; fallback: string };   // 需求分析/测试生成
  'lightweight':  { primary: string; fallback: string };   // 代码标注/分类
}

interface TokenBudget {
  projectId: string;
  totalBudget: number;                   // 总预算（tokens）
  used: number;                          // 已使用
  warnThreshold: number;                 // 预警阈值（默认 0.7）
  blockThreshold: number;                // 阻塞阈值（默认 0.9）
}
```

### 5.2 模型选择逻辑

```
function selectModel(tier: string, config: LLMProviderConfig): string

  tierMap = config.tiers[tier]
  
  // 尝试 primary
  provider = findEnabledProvider(tierMap.primary, config.providers)
  if provider != null:
    return tierMap.primary
  
  // 尝试 fallback
  provider = findEnabledProvider(tierMap.fallback, config.providers)
  if provider != null:
    log.warn(`Primary model ${tierMap.primary} unavailable, using ${tierMap.fallback}`)
    return tierMap.fallback
  
  // 所有都不可用
  throw Error(`No available model for tier: ${tier}`)
```

---

## 六、Gitea 集成设计（T-201 关联）

### 6.1 集成点

> 注意：以下 `/api/v1/orgs/*` 和 `/api/v1/repos/*` 端点为 **Gitea 自身的 REST API**。ANFSF 作为 HTTP 客户端调用 Gitea，而非 ANFSF 自身暴露这些端点。

```
Gitea API — ANFSF 调用 Gitea (写操作):
  POST   /api/v1/orgs/{org}/repos       创建仓库（阶段一完成后）
  POST   /api/v1/repos/{owner}/{repo}/contents/{path}  推送初始代码
  POST   /api/v1/repos/{owner}/{repo}/branches         创建开发分支
  POST   /api/v1/repos/{owner}/{repo}/tags             打版本 Tag（阶段五）

Gitea API — ANFSF 调用 Gitea (读操作):
  GET    /api/v1/repos/{owner}/{repo}/commits/{ref}    获取 commit 详情
  GET    /api/v1/repos/{owner}/{repo}/commits/{sha}/diff  获取 diff
  
ANFSF API — Gitea 回调 ANFSF (Webhook):
  POST   /api/webhook/gitea   ← 这是 ANFSF 的端点，见 API-SPEC.md 第三章
  Push events → ANFSF 收到后触发代码标注 + 契约检查 + 验证流水线
```

### 6.2 Webhook 与轮询兜底

```
Webhook 优先：
  Gitea push → POST http://anfsf:3000/api/webhook/gitea → 处理 commit

轮询兜底：
  每 5 分钟 → GET /api/v1/repos/{owner}/{repo}/commits?since={lastCheck}
  → 如果有新 commit → 同样触发处理
  → 如果 webhook 已处理 → 跳过（幂等，用 commit SHA 去重）
```

---

## 七、目录结构（变更后）

```
anfsf/
├── src/
│   ├── server/              # HTTP API（升级）
│   │   ├── index.ts
│   │   ├── routes/
│   │   │   ├── synthesize.ts
│   │   │   ├── pipeline.ts
│   │   │   ├── health.ts
│   │   │   ├── metrics.ts
│   │   │   └── webhook.ts        # 新增：Gitea webhook 接收
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── tracing.ts
│   │   └── store.ts
│   │
│   ├── pipeline/            # 流水线（重构 + 大批新增）
│   │   ├── product-pipeline.ts          # 保留：现有 pipeline，逐步废弃
│   │   ├── pipeline-state-machine.ts    # 新增：T-001 五阶段状态机
│   │   ├── checkpoint.ts               # 新增：T-003 检查点
│   │   ├── token-budget.ts             # 新增：T-004 预算控制
│   │   ├── code-annotator.ts           # 新增：T-202 代码标注
│   │   ├── contract-watcher.ts         # 新增：T-203 契约监控
│   │   ├── commit-verification.ts      # 新增：T-204 提交验证
│   │   ├── fault-reporter.ts           # 新增：T-205 故障报告
│   │   ├── task-generator.ts           # 新增：T-206 任务生成
│   │   ├── fix-engine.ts              # 新增：T-301 修复引擎
│   │   ├── regression-runner.ts        # 新增：T-302 回归测试
│   │   ├── release-check.ts            # 新增：T-304 发布检查
│   │   └── archiver.ts                # 新增：T-305 归档
│   │
│   ├── agents/              # Agent 层
│   │   ├── code-generation-loop.ts     # 新增：T-002 Agent 循环
│   │   ├── verification-runner.ts     # 新增：验证工具调度器
│   │   └── (existing agent-os files preserved)
│   │
│   ├── prd/                 # PRD 处理
│   │   ├── prd-parser.ts              # 现有：升级
│   │   ├── prd-quality-check.ts       # 新增：T-101
│   │   └── confidence-annotator.ts    # 新增：T-102
│   │
│   ├── integrations/        # 外部集成
│   │   ├── llm-client.ts              # 现有：升级 Provider 配置层
│   │   ├── gitea-client.ts            # 新增：T-201 Gitea API
│   │   └── (existing files preserved)
│   │
│   ├── skills/              # 能力提供层（现有，不改内部实现）
│   ├── core/                # 核心引擎（现有，不改内部实现）
│   ├── governance/          # 治理（现有）
│   ├── input-governance/    # 输入安全（现有）
│   ├── req-graph/           # 需求图（现有）
│   └── ...
│
├── web/                     # React 前端（渐进改造）
│   ├── pages/
│   │   ├── PRDForm.tsx             # 现有
│   │   ├── RequirementReview.tsx   # 新增：T-103 PM 确认页
│   │   ├── ProjectDashboard.tsx    # 新增：T-402 项目看板
│   │   ├── TestReview.tsx          # 新增：T-303 PM 测试审查
│   │   └── DeveloperWorkspace.tsx  # 新增：T-403 开发工作台
│   └── components/
│
├── docs/                   # 文档（本次新增）
│   ├── TECHNICAL-DESIGN.md          # 本文件
│   ├── PHASE1-TASK-SPECS.md         # Phase 1 任务详细规格
│   ├── API-SPEC.md                  # API 设计规范
│   ├── DATABASE-SCHEMA.md           # 数据库 Schema
│   ├── DEVELOPMENT-STANDARDS.md     # 开发规范
│   ├── IMPLEMENTATION-PLAN.md       # 实施计划
│   └── product-discussion-2026-05-28.md  # 产品蓝图
│
└── .anfsf/                 # 运行时数据（现有）
```

---

## 八、开发环境配置

### 8.1 必需组件

| 组件 | 版本 | 获取方式 |
|------|------|---------|
| Node.js | 20.x LTS | nvm-windows: `nvm install 20.20.2` |
| Python | 3.12+ | winget: `winget install Python.Python.3.12` |
| Gitea | 1.25.4 | 本地开发用，`C:\gitea\gitea.exe` |
| Git | 2.x | 系统安装 |

### 8.2 环境变量

```bash
# 必需
LLM_API_KEY=           # DeepSeek 或 OpenCode Go 的 API Key
LLM_BASE_URL=          # （可选）自定义 API 端点

# Gitea
GITEA_URL=http://localhost:3001
GITEA_USERNAME=anfsf
GITEA_PASSWORD=anfsf123

# 可选
ANFSF_API_TOKEN=       # 生产环境设置
DATABASE_URL=          # 留空使用 SQLite
```

### 8.3 启动开发环境

```
# 终端 1：Gitea
set GITEA_WORK_DIR=C:\gitea
gitea.exe web --port 3001

# 终端 2：ANFSF 后端
set PATH=%LOCALAPPDATA%\nvm\current;%PATH%
set LLM_API_KEY=your-key
set GITEA_URL=http://localhost:3001
set GITEA_USERNAME=anfsf
set GITEA_PASSWORD=anfsf123
npm run dev

# 终端 3：前端
cd web && npm run dev
```

---

## 九、关键设计决策

| # | 决策 | 选择 | 理由 |
|---|------|------|------|
| 1 | Pipeline 架构 | 五阶段状态机 + 检查点 | 替代现有 17 层硬编码，支持崩溃恢复 |
| 2 | 代码生成方式 | 自建轻量 Agent 循环 | 比通用 Agent 更可控、更便宜、更适配骨架生成场景 |
| 3 | LLM 调用策略 | 分析用直接 API，生成用 Agent 循环 | 分界线：是否需要"验证产出能跑" |
| 4 | 数据库 | Phase 1-2 SQLite | 零运维负担，WAL 模式够用 |
| 5 | 代码标注 | 写入源码注释 | 开发和系统都能直接看到，编译零影响 |
| 6 | 修复策略 | 二维矩阵（代码来源 × 问题类型） | 骨架大胆修，开发代码只修无争议项 |
| 7 | LLM Provider | 可插拔配置层 | 不绑定厂商，Key 过期只改配置不动代码 |
| 8 | 模型选择 | 按任务分层自动选择 + fallback | 平衡质量与成本 |

---

> **下一步**：[Phase 1 任务详细规格](PHASE1-TASK-SPECS.md)
