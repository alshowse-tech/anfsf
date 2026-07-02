# ANFSF Agent Loop 开发文档 — Phase 5: DevFixLoop 接入

> **日期**: 2026-06-29 | **状态**: 📋 待 CODEX 执行
> **执行方**: CODEX
> **前置**: Phase 2 (工具系统), Phase 4 (沙箱)
> **预估**: 5 天

---

## 1. 目标

创建 Gitea webhook 路由 (`POST /api/v1/webhook/gitea`)，接入 DevFixLoop 到开发者提交流程。DevFixLoop 已完全实现 (435行) 但从未被调用。

**当前 DevFixLoop 能力**:
- `verify()`: 3 层验证管道 (tsc compile → ContractWatcher → E2E placeholder)
- `fix()`: 三级分类系统 (classifySource × classifyProblemType → FixEngine.route → L1/L2/L3)
- 完全使用纯文本 LLM 管道 (Phase 5 集成工具系统)

**目标工作流**:
```
Gitea push event → POST /api/v1/webhook/gitea
  → 验证 webhook secret
  → 提取 commit SHA + diff + changed files
  → DevFixLoop.run(input, repoPath)
  → 结果回传 Gitea (issue comment / commit status)
```

---

## 2. 实现清单

### 2.1 新增文件

| 文件 | 说明 |
|------|------|
| `src/server/routes/webhook-gitea.ts` | Gitea webhook 端点 |
| `src/server/routes/__tests__/webhook-gitea.test.ts` | Webhook 测试 |

### 2.2 修改文件

| 文件 | 改动说明 |
|------|---------|
| `src/server/index.ts` | 注册 webhook 路由 |
| `src/agents/dev-fix-loop.ts` | 集成 ToolRegistry + SandboxExecutor; Phase 3 工具调用循环 |
| `src/pipeline/fix-engine.ts` | 确保 L1/L2/L3 分类与 DevFixLoop fix() 配合 |
| `src/pipeline/fix-executor.ts` | L1 自动修复接入 (当前未调用) |
| `src/pipeline/contract-watcher.ts` | 确保作为 VerificationTool 可用 |

---

## 3. 详细设计

### 3.1 Webhook 路由 (`webhook-gitea.ts`)

```typescript
// POST /api/v1/webhook/gitea
// Headers: X-Gitea-Event: push, X-Gitea-Signature: sha256=...

interface GiteaPushPayload {
  ref: string;                    // "refs/heads/main"
  after: string;                  // commit SHA
  repository: {
    name: string;
    full_name: string;
    clone_url: string;
  };
  commits: Array<{
    id: string;
    message: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
}

async function handleGiteaWebhook(request, reply):
  // 1. 验证 webhook secret (环境变量 GITEA_WEBHOOK_SECRET)
  // 2. 解析 push payload
  // 3. 提取 changed files + diffs
  // 4. 构造 DevCommitInput
  // 5. Run DevFixLoop
  // 6. 回传结果到 Gitea
  //    - Create commit status (pending → success/failure)
  //    - Add issue comment with fix details
```

### 3.2 DevFixLoop 改造

**构造函数**:
```typescript
constructor(
  llm: LLMClient,
  config: Partial<AgentLoopConfig> = {},
  budget?: TokenBudget,
  toolRegistry?: ToolRegistry,          // Phase 3
  extraVerificationTools?: VerificationTool[],  // Phase 1
  protected sandbox?: SandboxExecutor,   // Phase 4
) { ... }
```

**verify() 改造**:

当前已验证 (tsc + ContractWatcher + E2E placeholder):
```typescript
async verify(report: VerificationReport): Promise<TestError[]> {
  const allErrors: TestError[] = [];

  // Layer 1: Compile check — keep existing
  const compileResults = await this.verifier.runAll(repoPath);
  allErrors.push(...this.convertVerificationErrors(compileResults));

  // Layer 2: Contract check — keep existing (enhanced)
  if (report.contracts) {
    const contractErrors = await ContractWatcher.validate(report.contracts, repoPath);
    allErrors.push(...contractErrors);
  }

  // Layer 3: E2E check — Phase 5 remains placeholder
  // (Phase 6 实现真实的 E2E)

  return allErrors;
}
```

**fix() 改造**:

三相分类 → FixEngine 路由:
```typescript
async fix(errors: TestError[], report: VerificationReport): Promise<VerificationReport> {
  const fixRecords: FixRecord[] = [];

  for (const error of errors) {
    // Step 1: 确定改动来源
    const source = classifySource(error.file, report.changedFiles);
    // 'generated' | 'modified' | 'new'

    // Step 2: 确定问题类型
    const problemType = classifyProblemType(error);
    // 'type_mismatch' | 'interface_change' | 'unused_variable' |
    // 'style_deviation' | 'spelling_format' | 'conditional_flaw' | 'business_logic'

    // Step 3: FixEngine 路由
    const fixRecord = FixEngine.route(source, problemType, error);
    fixRecords.push(fixRecord);
  }

  // Step 4: 执行修复
  for (const record of fixRecords) {
    switch (record.level) {
      case 'L1':  // generated × (style/type) — 自动修复
        await FixExecutor.autoFix(record);
        break;
      case 'L2':  // modified × (type/interface) — 生成 Diff 建议
        record.diff = await FixExecutor.generateDiff(record);
        break;
      case 'L3':  // new × (interface/business) — 仅定位
        // No auto-fix; mark for human review
        break;
    }
  }

  return { ...report, fixRecords };
}
```

### 3.3 server/index.ts 改动

```typescript
import { registerWebhookRoutes } from './routes/webhook-gitea';

// In server startup:
registerWebhookRoutes(app, store, serverConfig, llm, sandbox);
```

### 3.4 Gitea 结果回传

```typescript
async function reportToGitea(payload, result):
  // 1. Create commit status
  POST /api/v1/repos/{owner}/{repo}/statuses/{sha}
  {
    state: result.success ? 'success' : 'failure',
    description: `ANFSF: ${result.fixRecords.length} issues found`,
    context: 'ANFSF/DevFixLoop',
  }

  // 2. Add comment if L1 fixes were auto-applied
  if result.l1Fixed.length > 0:
    POST /api/v1/repos/{owner}/{repo}/issues/{index}/comments
    { body: "ANFSF auto-fixed:\n- ..." }
```

---

## 4. FixEngine 三级边界

| 层级 | 触发条件 | 动作 | 自动化程度 |
|------|---------|------|-----------|
| **L1** | generated × (style_deviation, spelling_format, type_mismatch) | FixExecutor.autoFix() — 直接修改文件 | 全自动 |
| **L2** | modified × (type_mismatch, interface_change, unused_variable) | FixExecutor.generateDiff() — 生成 Patch 建议, 不直接修改 | 半自动 |
| **L3** | new × (interface_change, conditional_flaw, business_logic) | 仅记录文件+行号, 标记需人工审查 | 零自动 |

---

## 5. 测试

### 5.1 Mock Gitea webhook payload

```typescript
const mockPayload: GiteaPushPayload = {
  ref: 'refs/heads/main',
  after: 'abc123def456',
  repository: {
    name: 'test-repo',
    full_name: 'test/test-repo',
    clone_url: 'http://localhost:3001/test/test-repo.git',
  },
  commits: [{
    id: 'abc123def456',
    message: 'Add user auth feature',
    added: ['src/auth/login.ts'],
    modified: ['src/index.ts'],
    removed: [],
  }],
};
```

### 5.2 新增测试

| 测试 | 文件 |
|------|------|
| Webhook signature validation | `webhook-gitea.test.ts` |
| Webhook payload parsing | 同上 |
| DevFixLoop L1 auto-fix | `dev-fix-loop.test.ts` (新建) |
| L1/L2/L3 边界分类 | 同上 |
| ContractWatcher verification | `contract-watcher.test.ts` (新建) |
| FixExecutor auto-fix execution | `fix-executor.test.ts` (已存在, 确认通过) |

---

## 6. 验证清单

```bash
npx tsc --noEmit
npx jest --testPathPattern="webhook|dev-fix|fix-engine|contract" --forceExit
npm test

# 集成测试: 向 Gitea repo push commit
# → 验证 webhook 触发
# → 验证 DevFixLoop 执行
# → 验证 Gitea commit status 更新
```
