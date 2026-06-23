# ANFSF Agent Loop 开发文档 — Phase 6: TestGenLoop 接入

> **日期**: 2026-06-23 | **状态**: 📋 待 CODEX 执行
> **执行方**: CODEX
> **前置**: Phase 2 (工具系统), Phase 3 (工具调用循环)
> **预估**: 2 天

---

## 1. 目标

在 synthesize 管道中增加测试生成阶段。PRD 经过 CodeGenerationLoop (骨架代码) 后，自动调用 TestGenLoop 生成测试文件。

**当前 TestGenLoop 能力** (361行, 已实现未接入):
- `generate()`: 从 RequirementSpec 生成测试文件 (Jest/Playwright/Vitest)
- `verify()`: TypeScript 语法检查 + 框架检测
- `fix()`: LLM 修复测试语法错误
- `detectFramework()`: 启发式检测测试框架

---

## 2. 实现清单

### 2.1 修改文件

| 文件 | 改动说明 |
|------|---------|
| `src/server/routes/synthesize.ts` | 在代码生成完成后调用 TestGenLoop |
| `src/agents/test-gen-loop.ts` | 集成 ToolRegistry; 构造函数接受 tools |

### 2.2 synthesize.ts 改动

```typescript
// 在 Step 4 (TASK.md 生成) 之后:
// Step 5: Test Generation (NEW)

const testLoop = new TestGenLoop(llm, {
  maxRetries: 1,
  maxTokens: 16384,
}, budget, toolRegistry);  // toolRegistry from Phase 3

const testResult = await testLoop.run(spec, path.join(outputDir, '__tests__'));

if (testResult.success) {
  persistedSteps.push({
    name: `Tests: ${testResult.output.files.length} files`,
    duration: testResult.duration,
    status: 'ok',
  });
  store.emitStep(jobId, {
    name: `Tests: ${testResult.output.files.length} test files generated`,
    status: 'ok',
  });
} else {
  // Test generation failure is non-blocking
  // (the skeleton code is still valid)
  store.emitStep(jobId, {
    name: `Tests: generation failed (non-blocking)`,
    status: 'warning',
  });
}
```

### 2.3 TestGenLoop 改动

**构造函数**:
```typescript
constructor(
  llm: LLMClient,
  config: Partial<AgentLoopConfig> = {},
  budget?: TokenBudget,
  protected toolRegistry?: ToolRegistry,  // NEW Phase 3
) { ... }
```

**generate() 改造**:
```typescript
async generate(spec: RequirementSpec): Promise<TestSuite> {
  // ... budget check (existing) ...

  // Read generated source files for context (via tools)
  const executor = this.createToolExecutor(this.llm);
  if (executor && this.toolRegistry && this.outputPath) {
    const sourceContext = await this.readSourceFilesForContext(this.outputPath);
    // Use tool-enabled path
    const { content } = await executor.run(
      buildTestGenSystemPrompt(spec, sourceContext),
      buildTestGenUserPrompt(spec),
      { maxRounds: 3, ... }
    );
    return parseTestFilesFromResponse(content);
  }

  // Fallback: pure text path (existing implementation)
  // ...
}
```

**verify() 增强**:
```typescript
async verify(suite: TestSuite): Promise<RunError[]> {
  // Phase 1: TS syntax check (existing)
  const syntaxErrors = checkTypeScriptSyntax(suite);

  // Phase 2: Framework detection (existing)
  const framework = detectFramework(suite);

  // NEW: Optional — if sandbox is available, attempt test execution
  // (Phase 4+ only; requires Playwright/Jest installed)

  return syntaxErrors;
}
```

---

## 3. 工作流对比

### Phase 6 前 (当前):
```
PRD → CodeGenerationLoop → TaskGenerator → TASK.md → Gitea push
```

### Phase 6 后:
```
PRD → CodeGenerationLoop → TaskGenerator → TASK.md
     → TestGenLoop → test files → Gitea push (including tests)
```

### 完整输出结构:
```
output/<project-name>/
  ├── package.json
  ├── src/          ← CodeGenerationLoop 产物
  │   ├── index.ts
  │   ├── routes/
  │   └── ...
  ├── __tests__/    ← TestGenLoop 产物
  │   ├── index.test.ts
  │   ├── routes.test.ts
  │   └── ...
  ├── TASK_FRONTEND.md
  └── TASK_BACKEND.md
```

---

## 4. 测试框架检测

TestGenLoop 已有的检测逻辑:
```typescript
function detectFramework(files: TestFile[]): 'jest' | 'vitest' | 'playwright' | 'unknown' {
  // 检查 imports:
  // - import { test, expect } from '@playwright/test' → playwright
  // - import { describe, it, expect } from 'vitest' → vitest
  // - 默认: jest (不需要显式 import describe/it)
}
```

---

## 5. 测试

### 5.1 现有测试
- `src/agents/__tests__/test-gen-loop.test.ts` — 3 tests (generate/verify/fix)

### 5.2 新增/修改测试

| 测试 | 文件 |
|------|------|
| TestGenLoop with ToolRegistry | `test-gen-loop.test.ts` (修改) |
| TestGenLoop without ToolRegistry (backward compat) | 同上 |
| synthesize 包含 test generation | `synthesize.test.ts` (修改) |
| TestGenLoop framework detection | 同上 |
| TestGenLoop budget tracking | 同上 |

---

## 6. 验证清单

```bash
npx tsc --noEmit
npx jest --testPathPattern="test-gen-loop" --forceExit
npm test

# 集成测试:
curl -X POST http://localhost:3001/api/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{"prdText": "一个简单的登录API，接受用户名密码返回JWT", "projectName": "auth-test"}'
# → 验证输出目录包含 __tests__/ 目录
```
