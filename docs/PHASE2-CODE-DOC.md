# ANFSF Agent Loop 开发文档 — Phase 2: 工具系统基础设施

> **日期**: 2026-06-29 | **状态**: ✅ 已完成
> **执行方**: Claude Code (Phase 2 实现) + CODEX (后续执行)
> **基线**: 类型检查零错误, 现有测试全通过

---

## 1. 概述

建立最小可行的 LLM 工具系统——4 个核心工具（Read/Write/Bash/Grep）+ ToolRegistry + LLMClient 工具调用扩展。这是 Agent Loop 从"纯文本管道"升级为"工具使用 Agent"的基础设施。

对标: Claude Code (43+ 工具), SWE-agent (4 工具), OpenHands (8 工具)

---

## 2. 实现清单

### 2.1 新增文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/tools/types.ts` | 115 | Tool/ToolDefinition/ToolCall/ToolResult/ToolContext 接口 |
| `src/tools/tool-registry.ts` | 155 | ToolRegistry: register/unregister/get/list/execute/executeAll |
| `src/tools/read-tool.ts` | 150 | ReadTool: 文件读取 + 路径验证 + offset/limit分页 |
| `src/tools/write-tool.ts` | 120 | WriteTool: 文件写入 + 路径验证 + 自动创建目录 |
| `src/tools/bash-tool.ts` | 180 | BashTool: shell命令执行 + 危险命令拦截 + 输出截断 |
| `src/tools/grep-tool.ts` | 210 | GrepTool: regex搜索 + glob过滤 + 二进制跳过 |
| `src/tools/index.ts` | 25 | Barrel export (types + registry + 4 tools) |

### 2.2 修改文件

| 文件 | 改动 | 说明 |
|------|------|------|
| `src/integrations/llm-client.ts` | 多处 | LLMMessage支持role:'tool'+tool_call_id; LLMRequest新增tools/tool_choice; LLMResponse新增tool_calls/finish_reason; doChatRequest解析工具调用结果 |

### 2.3 核心接口

```typescript
// Tool definition sent to LLM as function-calling schema
interface ToolDefinition {
  name: string;              // "read_file", "write_file", "execute_bash", "search_code"
  description: string;       // LLM decision guidance
  parameters: ToolParameter[];
  mode: 'readonly' | 'readwrite';
  requiresSandbox: boolean;  // Phase 4 enforcement
}

// Runtime tool execution
interface Tool {
  readonly definition: ToolDefinition;
  execute(params, context): Promise<ToolResult>;
}

// Central registry
class ToolRegistry {
  register(tool): void;
  unregister(name): void;
  get(name): Tool | undefined;
  list(): Tool[];
  listByMode(mode): Tool[];
  getDefinitions(): ToolDefinition[];
  execute(call, context): Promise<ToolResult>;
  executeAll(calls, context): Promise<ToolExecutionReport>;
}
```

### 2.4 LLMClient 工具扩展

**LLMRequest 新增字段**:
```typescript
tools?: LLMToolDefinition[];     // OpenAI-compatible function definitions
tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
```

**LLMResponse 新增字段**:
```typescript
tool_calls?: ToolCall[];         // LLM-requested function calls
finish_reason?: 'stop' | 'tool_calls' | 'length';
```

**API 请求体新增**:
```json
{
  "model": "...",
  "messages": [...],
  "tools": [...],           // <-- NEW
  "tool_choice": "auto"     // <-- NEW
}
```

**API 响应解析新增**:
- `message.tool_calls[]` — LLM 请求的工具调用
- `choices[0].finish_reason` — 区分自然结束 vs 工具调用请求

---

## 3. 工具详情

### ReadTool (`read_file`)
```
参数: file_path (required), offset (optional, default=1), limit (optional, default=2000)
安全: 路径遍历检测, 白名单验证, 目录拒绝
输出: <行号>\t<内容> 格式, 带文件头信息
```

### WriteTool (`write_file`)
```
参数: file_path (required), content (required)
安全: 同 ReadTool 路径验证
行为: 自动创建父目录, 覆盖已存在文件
```

### BashTool (`execute_bash`)
```
参数: command (required), timeout (optional, default=30000, max=120000)
安全: 危险模式拦截 (rm -rf /, fork bomb, dd, chmod 777)
输出: STDOUT + STDERR + Exit code, 截断至 100KB
沙箱: Phase 4 集成 SandboxExecutor
```

### GrepTool (`search_code`)
```
参数: pattern (required), path (optional), glob (optional), max_results (optional, default=250)
安全: 只读操作, 跳过 >1MB 文件
过滤: 默认只搜索文本文件扩展名; 自动跳过 node_modules/.git/dist
```

---

## 4. 验证结果

### 类型检查
```bash
$ npx tsc --noEmit
# 零错误
```

### 单元测试
```bash
$ npx jest src/agents/__tests__/code-generation-loop.test.ts --no-coverage --forceExit
Test Suites: 1 passed, 1 total
Tests:       17 passed, 17 total
# 确认 Phase 2 改动不破坏现有 Agent Loop 测试
```

---

## 5. 依赖关系

```
Phase 2 → Phase 3 (Agent Loop 工具调用循环)
Phase 2 → Phase 4 (沙箱执行集成)
Phase 2 → Phase 5 (DevFixLoop 工具使用)
Phase 2 → Phase 6 (TestGenLoop 工具使用)
```

Phase 2 是 Phase 3-6 的基础。所有后续 Phase 都依赖此工具系统。

---

## 6. CODEX 后续执行要点

Phase 2 基础设施已就绪。CODEX 可基于此文档直接进入 Phase 3-4 的编码工作。

**需要创建的测试文件**:
- `src/tools/__tests__/read-tool.test.ts`
- `src/tools/__tests__/write-tool.test.ts`
- `src/tools/__tests__/bash-tool.test.ts`
- `src/tools/__tests__/grep-tool.test.ts`
- `src/tools/__tests__/tool-registry.test.ts`
