# ANFSF Agent Loop 开发文档 — Phase 4: 沙箱执行集成

> **日期**: 2026-06-23 | **状态**: 📋 待 CODEX 执行
> **执行方**: CODEX
> **前置**: Phase 2 (工具系统)
> **预估**: 2 天

---

## 1. 目标

将现有的 `SandboxExecutor` (`src/skills/sandbox-executor.ts`) 接入 BashTool 和编译验证工具，消除直接在主机执行 `npm install` 和 `tsc` 的安全风险。

当前状态:
- `SandboxExecutor` 已完整实现 (child_process 隔离 + 静态分析 + 内存/时间限制)
- 但 `npm install` 和 `tsc --noEmit` 直接通过 `spawn("npm", [...], {shell:true})` 在主机运行
- 零沙箱隔离 = CLAUDE.md 标注的致命缺口

---

## 2. 实现清单

### 2.1 修改文件

| 文件 | 改动说明 |
|------|---------|
| `src/tools/bash-tool.ts` | `execute()` 优先使用 `context.sandbox` 执行; fallback 直接 spawn |
| `src/agents/code-generation-loop.ts` | `installDependencies()` 改为通过 BashTool 执行; 添加 `allowedPaths` 到 ToolContext |
| `src/core/quality/compile-validator.ts` | 接受可选 `sandbox` 参数; 通过沙箱执行 `tsc --noEmit` |
| `src/server/routes/synthesize.ts` | 构造 `SandboxExecutor` 并传入 ToolContext |

### 2.2 不需要修改的文件
- `src/skills/sandbox-executor.ts` — 已完整实现, 直接重用
- `src/skills/types.ts` — SandboxConfig/ExecutionResult 类型已完整

---

## 3. 详细设计

### 3.1 SandboxExecutor 回顾

```typescript
// 现有接口 (src/skills/sandbox-executor.ts)
class SandboxExecutor {
  constructor(config?: Partial<SandboxConfig>);
  execute(code: string, options?: {
    taskType?: string;
    context?: Record<string, unknown>;
  }): Promise<{ success: boolean; output: string; error?: string; durationMs: number }>;
}
```

特性:
- 写入 temp worker script → `node` 子进程执行
- 静态分析阻止危险 API (require, eval, Function, fetch 等)
- 最小全局作用域 (console, Math, Date, JSON, Array, Object, String, Number, Boolean)
- 可配置内存限制 (default 256MB, max 1024MB) 和时间限制 (default 30s, max 120s)

### 3.2 BashTool 沙箱集成

**核心改动** (`src/tools/bash-tool.ts`):

```typescript
async execute(params, context): Promise<ToolResult> {
  // ... existing validation (blocked patterns, etc.) ...

  // === SANDBOXED PATH (Phase 4) ===
  if (context.sandbox) {
    return this.executeInSandbox(command, timeout, context);
  }

  // === FALLBACK: direct spawn (backward compatible) ===
  return this.executeDirect(command, timeout, context);
}

private async executeInSandbox(command, timeout, context): Promise<ToolResult> {
  const sandbox = context.sandbox as SandboxExecutor;
  const result = await sandbox.execute(
    `const { execSync } = require('child_process');\n` +
    `execSync(${JSON.stringify(command)}, { cwd: ${JSON.stringify(context.workingDir)}, timeout: ${timeout} });`,
    { taskType: 'bash-command', context: { command } }
  );
  // ...
}
```

**注意**: SandboxExecutor 的 `blockedAPIs` 默认包含 `require`。沙箱中执行 bash 命令需要一个特殊的任务类型 `'bash-command'`，它允许 `child_process` 访问。需要扩展 SandboxExecutor 的 `TASK_TYPE_LIMITS`:

```typescript
// src/skills/sandbox-executor.ts 中已有的 TASK_TYPE_LIMITS 扩展:
const TASK_TYPE_LIMITS = {
  // ... existing ...
  'bash-command': { maxMemoryMB: 512, maxExecutionTimeMs: 60000 },
};
```

### 3.3 CompileValidator 沙箱集成

```typescript
// src/core/quality/compile-validator.ts 改动:
class CompileValidator {
  constructor(
    private timeoutMs: number = 60000,
    private sandbox?: SandboxExecutor,  // NEW
  ) {}

  async validate(codePath: string): Promise<CompileResult> {
    if (this.sandbox) {
      return this.validateInSandbox(codePath);
    }
    return this.validateDirect(codePath);  // 现有实现
  }

  private async validateInSandbox(codePath: string): Promise<CompileResult> {
    const result = await this.sandbox.execute(
      `const { execSync } = require('child_process');\n` +
      `try {\n` +
      `  execSync('npx tsc --noEmit', { cwd: ${JSON.stringify(codePath)}, timeout: ${this.timeoutMs} });\n` +
      `  return { success: true, errors: [] };\n` +
      `} catch (e) { return { success: false, errors: e.stderr.toString().split('\\n') }; }`,
      { taskType: 'bash-command', context: { command: 'tsc --noEmit' } }
    );
    // ...
  }
}
```

### 3.4 CodeGenerationLoop 改动

```typescript
// installDependencies() 改为:
async function installDependencies(outputPath: string, sandbox?: SandboxExecutor): Promise<void> {
  if (sandbox) {
    await sandbox.execute(
      `const { execSync } = require('child_process');\n` +
      `execSync('npm install --ignore-scripts --no-audit --no-fund', { cwd: ${JSON.stringify(outputPath)}, timeout: 120000 });`,
      { taskType: 'bash-command' }
    );
  } else {
    // 现有直接 spawn 实现 (fallback)
  }
}
```

### 3.5 synthesize.ts 改动

```typescript
import { SandboxExecutor } from '../../skills/sandbox-executor';

// 创建沙箱
const sandbox = new SandboxExecutor({
  maxMemoryMB: 512,
  maxExecutionTimeMs: 120000,
  readOnlyPaths: [outputDir],  // 只读文件系统 (write 通过 WriteTool)
});

// 传入 ToolContext
const toolContext = {
  workingDir: outputDir,
  sandbox,
  allowedPaths: [outputDir],
  timeoutMs: 30000,
};
```

### 3.6 路径白名单

```typescript
// src/tools/shared.ts (可以提取到新文件)
const SAFE_PATH_RE = /^[a-zA-Z0-9_\-\.\/\\]+$/;

export function validatePath(filePath: string, allowedPaths: string[]): string | null {
  if (!filePath) return 'Empty path';
  if (filePath.includes('..')) return 'Path traversal detected';
  if (!SAFE_PATH_RE.test(filePath)) return `Invalid characters in path: ${filePath}`;

  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  if (allowedPaths.length === 0) return null; // no restrictions

  const isAllowed = allowedPaths.some(a =>
    resolved.startsWith(path.resolve(a).replace(/\\/g, '/'))
  );
  return isAllowed ? null : `Path "${filePath}" is outside allowed directories`;
}
```

---

## 4. 安全边界

| 操作 | Phase 3 (无沙箱) | Phase 4 (有沙箱) |
|------|------------------|-------------------|
| `npm install` | 主机 spawn, shell:true | 沙箱子进程, 只读文件系统 |
| `tsc --noEmit` | 主机 spawn | 沙箱子进程 |
| `execute_bash` | 直接 spawn + 危险模式拦截 | 沙箱子进程 + 危险模式拦截 |
| `read_file` | 直接 fs.readFileSync | 直接 fs.readFileSync (只读安全) |
| `write_file` | 直接 fs.writeFileSync | 直接 fs.writeFileSync + 路径白名单 |

---

## 5. 测试

### 5.1 现有测试引用
- `src/skills/__tests__/sandbox-executor.test.ts` — 12 个测试已存在
- `src/agents/__tests__/code-generation-loop.test.ts` — 需确认无沙箱时行为不变

### 5.2 新增/修改测试

| 测试 | 文件 |
|------|------|
| BashTool with sandbox | `src/tools/__tests__/bash-tool.test.ts` |
| BashTool without sandbox (fallback) | 同上 |
| CompileValidator with sandbox | `src/core/quality/__tests__/compile-validator.test.ts` |
| Path whitelist rejection | `src/tools/__tests__/read-tool.test.ts` |
| Path whitelist acceptance | 同上 |

### 5.3 手动验证
```bash
# 验证沙箱隔离: 尝试通过 BashTool 读取系统文件
# 预期: 路径白名单拒绝
```

---

## 6. 验证清单

```bash
npx tsc --noEmit
npx jest src/skills/__tests__/sandbox-executor.test.ts --forceExit
npx jest src/tools/__tests__/ --forceExit
npx jest src/agents/__tests__/code-generation-loop.test.ts --forceExit
```
