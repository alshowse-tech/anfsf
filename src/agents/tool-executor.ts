/**
 * ANFSF Agent — Tool Executor
 *
 * Runs an LLM tool-calling loop: system prompt → LLM.chat() with tools →
 * executes tool calls via ToolRegistry → feeds results back to LLM →
 * repeats until LLM produces a final answer or max rounds reached.
 *
 * Phase 3: Agent Loop Tool Calling Loop
 */

import { ToolRegistry, type ToolContext } from '../tools';
import { LLMClient, type LLMMessage, type LLMToolDefinition } from '../integrations/llm-client';
import { SandboxExecutor } from '../skills/sandbox-executor';

// ============================================================================
// Tool Loop Types
// ============================================================================

export interface ToolLoopConfig {
  /** Maximum number of tool-calling rounds (default: 5) */
  maxRounds: number;
  /** Max tokens per LLM call (default: 32768) */
  maxTokens: number;
  /** LLM request timeout in ms (default: 180000) */
  llmTimeout: number;
}

export interface ToolLoopState {
  /** Full message history (system + user + assistant + tool responses) */
  messages: LLMMessage[];
  /** Current round number (1-indexed) */
  round: number;
  /** Maximum rounds before giving up */
  maxRounds: number;
  /** Token usage from each LLM call in the loop */
  usage: Array<{ promptTokens: number; completionTokens: number; totalTokens: number }>;
}

export const DEFAULT_TOOL_LOOP_CONFIG: ToolLoopConfig = {
  maxRounds: 5,
  maxTokens: 32_768,
  llmTimeout: 180_000,
};

// ============================================================================
// ToolExecutor
// ============================================================================

/**
 * Executes an LLM tool-calling conversation loop.
 *
 * Usage:
 *   const executor = new ToolExecutor(llm, registry, context);
 *   const { content } = await executor.run(systemPrompt, userPrompt, { maxRounds: 5 });
 */
export class ToolExecutor {
  constructor(
    private llm: LLMClient,
    private registry: ToolRegistry,
    private context: ToolContext,
  ) {}

  /**
   * Run the tool-calling loop.
   *
   * 1. Sends system + user prompt to LLM with available tool definitions
   * 2. If LLM returns tool_calls → executes each via ToolRegistry → appends results
   * 3. If LLM returns stop → returns the final content
   * 4. Repeats up to maxRounds
   *
   * @throws Error if LLM call fails or max rounds exceeded
   */
  async run(
    systemPrompt: string,
    userPrompt: string,
    config: Partial<ToolLoopConfig> = {},
  ): Promise<{ content: string; state: ToolLoopState }> {
    const mergedConfig: ToolLoopConfig = { ...DEFAULT_TOOL_LOOP_CONFIG, ...config };

    // ======================================================================
    // Phase 4: Inject sandbox for tools that require it
    // ======================================================================
    const hasSandboxTools = this.registry.list().some(t => t.definition.requiresSandbox);
    if (hasSandboxTools && !this.context.sandbox) {
      this.context.sandbox = new SandboxExecutor(
        { maxExecutionTimeMs: mergedConfig.llmTimeout },
        'bash-command',
      );
    }

    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const state: ToolLoopState = {
      messages,
      round: 0,
      maxRounds: mergedConfig.maxRounds,
      usage: [],
    };

    const llmTools: LLMToolDefinition[] = this.registry.toLLMDefinitions();

    while (state.round < state.maxRounds) {
      state.round++;

      const response = await this.llm.chat({
        messages: state.messages,
        max_tokens: mergedConfig.maxTokens,
        timeoutMs: mergedConfig.llmTimeout,
        tools: llmTools,
        tool_choice: 'auto',
      });

      if (!response.ok) {
        throw new Error(`LLM call failed in tool loop: ${response.error}`);
      }

      // Record token usage
      if (response.usage) {
        state.usage.push({
          promptTokens: response.usage.prompt_tokens || 0,
          completionTokens: response.usage.completion_tokens || 0,
          totalTokens: response.usage.total_tokens || 0,
        });
      }

      // Case 1: LLM produced final answer without tool calls
      if (response.finish_reason === 'stop' || !response.tool_calls?.length) {
        return { content: response.content, state };
      }

      // Case 2: LLM wants to call tools
      if (response.finish_reason === 'tool_calls' && response.tool_calls) {
        // Add assistant message with tool_calls
        state.messages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.tool_calls,
        });

        // Execute each tool call in sequence (tools may depend on previous results)
        for (const tc of response.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments);
          } catch {
            args = {};
          }

          // Bridge: LLMToolCall → ANFSF ToolCall → execute via ToolRegistry
          const result = await this.registry.execute(
            {
              id: tc.id,
              name: tc.function.name,
              arguments: args,
            },
            this.context,
          );

          state.messages.push({
            role: 'tool',
            content: result.success ? result.output : `Error: ${result.error}`,
            tool_call_id: tc.id,
          });
        }

        continue; // Go to next round
      }

      // Case 3: 'length' or other finish_reason → treat as final answer
      return { content: response.content, state };
    }

    throw new Error(
      `Tool loop exceeded max rounds (${mergedConfig.maxRounds}). ` +
      `Messages: ${state.messages.length}. ` +
      `LLM kept calling tools without producing a final answer.`,
    );
  }

  /**
   * Get the LLMToolDefinition array from the registry.
   * Useful for inspection or passing to other LLM calls.
   */
  getLLMDefinitions(): LLMToolDefinition[] {
    return this.registry.toLLMDefinitions();
  }
}
