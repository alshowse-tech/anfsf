# ANFSF Agent Loop 开发文档 — Phase 3: Agent Loop 工具调用循环

> **日期**: 2026-06-23 | **状态**: 📋 待 CODEX 执行
> **执行方**: CODEX
> **前置**: Phase 1 (验证链)、Phase 2 (工具系统) 已完成
> **预估**: 3 天

---

## 1. 目标

将 Agent Loop 的 `generate()` 和 `fix()` 从纯文本 LLM 调用升级为工具调用循环。LLM 可以在生成/修复过程中自主调用 `read_file`/`write_file`/`execute_bash`/`search_code` 来理解上下文、验证代码、修复错误。

---

## 2. 核心概念

### 当前状态 (纯文本管道)
```
generate(input) → LLM.chat(prompt) → 解析文本输出 → 返回 GeneratedCode
fix(errors, code) → LLM.chat(prompt) → 解析文本输出 → 合并修复后的文件
```

### 目标状态 (工具调用循环)
```
generate(input):
  messages = [system_prompt, user_prompt]
  loop (max 5 rounds):
    response = LLM.chatWithTools(messages, tools=[read_file, write_file, execute_bash, search_code])
    if response.finish_reason === 'stop': 解析输出, 返回结果
    if response.finish_reason === 'tool_calls':
      for each tool_call in response.tool_calls:
        result = toolRegistry.execute(tool_call, context)
        messages.push({role: 'assistant', tool_calls: [tool_call]})
        messages.push({role: 'tool', tool_call_id: call.id, content: result.output})
      continue loop
```

---

## 3. 实现清单

### 3.1 新增文件

| 文件 | 说明 |
|------|------|
| `src/agents/tool-executor.ts` | Agent Loop 专用工具执行调度器 — 管理工具调用循环的状态 |

### 3.2 修改文件

| 文件 | 改动说明 |
|------|---------|
| `src/agents/agent-loop-base.ts` | 基类新增 `toolRegistry`/`toolContext` 可选属性, 新增 `getAvailableTools()` hook |
| `src/agents/code-generation-loop.ts` | `generate()` 和 `fix()` 改为工具调用循环, 构造函数接受 `ToolRegistry` |
| `src/agents/test-gen-loop.ts` | 同上 (generate/verify/fix 改为工具调用循环) |
| `src/agents/dev-fix-loop.ts` | 同上 |
| `src/server/routes/synthesize.ts` | 构造 `ToolRegistry` 并传入 `CodeGenerationLoop` |

### 3.3 不需要修改的文件
- `src/tools/*` — Phase 2 已完成
- `src/integrations/llm-client.ts` — Phase 2 已完成 (已支持 tools/tool_choice/tool_calls/finish_reason)

---

## 4. 详细设计

### 4.1 ToolExecutor (`src/agents/tool-executor.ts`)

```typescript
import { ToolRegistry, type ToolDefinition, type ToolCall, type ToolResult, type ToolContext } from '../tools';
import { LLMClient, type LLMMessage, type LLMResponse } from '../integrations/llm-client';

interface ToolLoopState {
  messages: LLMMessage[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  round: number;
  maxRounds: number;
}

interface ToolLoopConfig {
  maxRounds: number;        // 最大工具调用轮数 (default: 5)
  maxTokens: number;        // 单次 LLM 调用最多 tokens
  llmTimeout: number;       // LLM 调用超时
  tools: ToolDefinition[];  // 可用工具列表
  toolChoice: 'auto';       // 工具选择策略
}

class ToolExecutor {
  constructor(
    private llm: LLMClient,
    private registry: ToolRegistry,
    private context: ToolContext,
  ) {}

  /**
   * Run a tool-enabled LLM conversation loop.
   * Returns the final text output when finish_reason === 'stop'.
   */
  async run(
    systemPrompt: string,
    userPrompt: string,
    config: Partial<ToolLoopConfig>,
  ): Promise<{ content: string; state: ToolLoopState }>;

  /**
   * Build LLMToolDefinition[] from ToolDefinition[] for the LLM request.
   */
  buildLLMToolDefinitions(): LLMToolDefinition[];
}
```

**循环逻辑**:

```
async run(systemPrompt, userPrompt, config):
  state = { messages: [{role:'system', content:systemPrompt}, {role:'user', content:userPrompt}],
            toolCalls: [], toolResults: [], round: 0, maxRounds: config.maxRounds }

  while state.round < state.maxRounds:
    state.round++
    response = await llm.chat({
      model: 'deepseek-chat',
      messages: state.messages,
      max_tokens: config.maxTokens,
      timeoutMs: config.llmTimeout,
      tools: buildLLMToolDefinitions(),
      tool_choice: 'auto',
    })

    if !response.ok: throw new Error(response.error)

    // Case 1: LLM has a final answer (or didn't call tools)
    if response.finish_reason === 'stop' || !response.tool_calls?.length:
      return { content: response.content, state }

    // Case 2: LLM wants to call tools
    if response.finish_reason === 'tool_calls' && response.tool_calls:
      // Add assistant message with tool_calls
      state.messages.push({
        role: 'assistant',
        content: response.content || '',
        tool_calls: response.tool_calls,
      })

      // Execute each tool call
      for (const tc of response.tool_calls) {
        const args = JSON.parse(tc.function.arguments)
        const result = await registry.execute({
          id: tc.id,
          name: tc.function.name,
          arguments: args,
        }, context)

        state.toolCalls.push(tc)
        state.toolResults.push(result)

        // Add tool result message
        state.messages.push({
          role: 'tool',
          content: result.success ? result.output : `Error: ${result.error}`,
          tool_call_id: tc.id,
        })
      }
      continue loop

  // Max rounds reached
  throw new Error(`Tool loop exceeded max rounds (${state.maxRounds})`)
```

### 4.2 AgentLoop 基类改动 (`src/agents/agent-loop-base.ts`)

```typescript
// 新增 import
import { ToolRegistry, type ToolDefinition, type ToolContext } from '../tools';

abstract class AgentLoop<TInput, TOutput, TError> {
  // 新增可选属性
  protected toolRegistry?: ToolRegistry;
  protected toolContext?: ToolContext;

  // 新增 hook: 子类覆盖以限制可用工具
  protected getAvailableTools(): ToolDefinition[] {
    return this.toolRegistry?.getDefinitions() ?? [];
  }

  // 新增 hook: 子类覆盖以创建 ToolExecutor
  protected createToolExecutor(llm: LLMClient): ToolExecutor | undefined {
    if (!this.toolRegistry || !this.toolContext) return undefined;
    return new ToolExecutor(llm, this.toolRegistry, this.toolContext);
  }
}
```

### 4.3 CodeGenerationLoop 改动 (`src/agents/code-generation-loop.ts`)

**构造函数新增参数**:
```typescript
constructor(
  llm: LLMClient,
  config: Partial<AgentLoopConfig> = {},
  budget?: TokenBudget,
  extraTools?: VerificationTool[],   // Phase 1
  toolRegistry?: ToolRegistry,       // Phase 3 NEW
) {
  // ...
  this.toolRegistry = toolRegistry;
}
```

**generate() 改造**:
```typescript
async generate(spec: RequirementSpec): Promise<GeneratedCode> {
  // ... budget pre-evaluation (unchanged) ...

  const executor = this.createToolExecutor(this.llm);

  if (executor && this.toolRegistry) {
    // === TOOL-ENABLED PATH ===
    const systemPrompt = buildSkeletonSystemPrompt(/* ... */);
    const userPrompt = buildSkeletonUserPrompt(spec);

    const { content } = await executor.run(systemPrompt, userPrompt, {
      maxRounds: 5,
      maxTokens: this.config.maxTokens,
      llmTimeout: this.config.llmTimeout,
      tools: this.getAvailableTools(),
    });

    const code = parseCodeFromResponse(content);
    // ... token recording + budget consumption ...
    return code;
  } else {
    // === FALLBACK: pure text path (backward compatible) ===
    // ... existing generate() implementation ...
  }
}
```

**fix() 改造**:
```typescript
async fix(errors: VerificationError[], code: GeneratedCode): Promise<GeneratedCode> {
  // ... budget pre-evaluation (unchanged) ...

  const executor = this.createToolExecutor(this.llm);

  if (executor && this.toolRegistry) {
    // === TOOL-ENABLED PATH ===
    // Write current files to disk so tools can read them
    // ...

    const systemPrompt = buildFixSystemPrompt();
    const userPrompt = buildFixUserPrompt(errors, code.files);

    const { content } = await executor.run(systemPrompt, userPrompt, {
      maxRounds: 3,
      maxTokens: this.config.maxTokens,
      llmTimeout: this.config.llmTimeout,
      tools: this.getAvailableTools(),
    });

    const fixedFiles = parseCodeFromResponse(content);
    // ... merge + token recording ...
    return mergeFixedFiles(code, fixedFiles.files);
  } else {
    // === FALLBACK: pure text path (backward compatible) ===
    // ... existing fix() implementation ...
  }
}
```

**关键设计决策**: 工具路径和纯文本路径并存。如果 `toolRegistry` 未提供，完全回退到现有行为。这确保向后兼容 + 渐进式采用。

### 4.4 synthesize.ts 改动

```typescript
// 构造 ToolRegistry
import { ToolRegistry, ReadTool, WriteTool, BashTool, GrepTool } from '../../tools';

const toolRegistry = new ToolRegistry();
toolRegistry.register(new ReadTool());
toolRegistry.register(new WriteTool());
toolRegistry.register(new BashTool());
toolRegistry.register(new GrepTool());

// 构造 ToolContext
const toolContext = {
  workingDir: outputDir,
  allowedPaths: [outputDir],
  timeoutMs: 30000,
};

const agentLoop = new CodeGenerationLoop(llm, config, budget, extraTools, toolRegistry);
agentLoop.setToolContext?.(toolContext);  // or pass via constructor
```

### 4.5 TestGenLoop 改动 (`src/agents/test-gen-loop.ts`)

与 CodeGenerationLoop 相同的模式:
- 构造函数接受 `toolRegistry`
- `generate()` 和 `fix()` 切换为工具调用循环
- 无 `toolRegistry` 时回退到纯文本路径

### 4.6 DevFixLoop 改动 (`src/agents/dev-fix-loop.ts`)

同上模式，额外:
- `verify()` 中的 ContractWatcher 可以通过 `search_code` 工具暴露给 LLM
- `fix()` 中的 L1 FixExecutor 可以通过 `write_file` 工具暴露

---

## 5. LLMToolDefinition 构建工具

需要将 ANFSF 的 `ToolDefinition` 转换为 OpenAI 兼容的 `LLMToolDefinition`:

```typescript
// src/agents/tool-executor.ts

function toLLMToolDefinition(td: ToolDefinition): LLMToolDefinition {
  const properties: Record<string, any> = {};
  const required: string[] = [];

  for (const param of td.parameters) {
    properties[param.name] = {
      type: param.type,
      description: param.description,
      ...(param.enum ? { enum: param.enum } : {}),
      ...(param.items ? { items: param.items } : {}),
    };
    if (param.required) required.push(param.name);
  }

  return {
    type: 'function',
    function: {
      name: td.name,
      description: td.description,
      parameters: {
        type: 'object',
        properties,
        required,
      },
    },
  };
}
```

---

## 6. 测试要求

### 6.1 新增测试文件

| 文件 | 测试内容 |
|------|---------|
| `src/agents/__tests__/tool-executor.test.ts` | ToolExecutor 循环逻辑: 无工具调用/单工具调用/多轮/最大轮数超限 |
| `src/agents/__tests__/code-generation-loop-tools.test.ts` | CodeGenerationLoop with ToolRegistry: generate/fix 使用工具 |

### 6.2 测试要点

1. **后端兼容**: 无 `toolRegistry` 时代码行为不变 (现有测试必须通过)
2. **工具调用循环**: mock LLMClient 返回 tool_calls → 验证 ToolExecutor 执行工具并回传结果
3. **最大轮数**: 确保 LLM 无限调用工具时达到 maxRounds 后抛出
4. **工具错误处理**: 工具执行失败 → 错误消息回传给 LLM → LLM 可以选择重试或放弃
5. **路径安全**: 通过工具读取白名单外路径 → 被 ReadTool 拒绝

### 6.3 Mock LLMClient for tool tests

```typescript
function mockLLMWithTools(responses: Array<{
  finish_reason: 'stop' | 'tool_calls';
  content?: string;
  tool_calls?: ToolCall[];
}>): LLMClient {
  // 类似现有的 mockLLMClient, 但返回 tool_calls 和 finish_reason
}
```

---

## 7. 验证清单

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 现有测试 (必须全通过 — 向后兼容)
npx jest src/agents/__tests__/code-generation-loop.test.ts --forceExit

# 3. 新测试
npx jest src/agents/__tests__/tool-executor.test.ts --forceExit
npx jest src/agents/__tests__/code-generation-loop-tools.test.ts --forceExit

# 4. 全量测试
npm test

# 5. 集成冒烟测试
curl -X POST http://localhost:3001/api/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{"prdText": "一个简单的计数器应用", "projectName": "counter-test"}'
```

---

## 8. 风险与缓解

| 风险 | 缓解 |
|------|------|
| LLM Provider 不支持 tools 参数 | 已实现向后兼容 — toolRegistry 未提供时回退到纯文本路径 |
| 工具调用循环导致 token 消耗激增 | maxRounds=5 限制, 每轮都有 budget 检查 |
| LLM 写出危险代码 (eval 等) | BashTool 有危险命令拦截, WriteTool 有路径白名单 |
| 工具输出过大填满上下文 | ReadTool limit=2000, BashTool 截断 100KB, GrepTool max_results=250 |

---

## 9. 依赖关系

```
Phase 1 (验证链) ✅ → Phase 2 (工具系统) ✅ → Phase 3 (本Phase) 🔜
                                                      ↓
                                              Phase 4 (沙箱执行)
                                              Phase 5 (DevFixLoop)
                                              Phase 6 (TestGenLoop)
```
