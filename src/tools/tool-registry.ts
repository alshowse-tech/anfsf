/**
 * ANFSF — Tool Registry
 *
 * Central registry for LLM-facing tools. Supports registration,
 * discovery by name/mode, and execution dispatch.
 *
 * Phase 2: Tool System Infrastructure
 */

import type {
  Tool,
  ToolDefinition,
  ToolCall,
  ToolResult,
  ToolContext,
  ToolExecutionReport,
} from './types';

// ============================================================================
// ToolRegistry
// ============================================================================

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool. Throws if a tool with the same name already exists.
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.definition.name)) {
      throw new Error(
        `Tool "${tool.definition.name}" is already registered. ` +
        `Unregister it first or use a different name.`
      );
    }
    this.tools.set(tool.definition.name, tool);
  }

  /**
   * Unregister a tool by name. No-op if not registered.
   */
  unregister(name: string): void {
    this.tools.delete(name);
  }

  /**
   * Get a tool by name. Returns undefined if not found.
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools.
   */
  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools filtered by execution mode.
   */
  listByMode(mode: 'readonly' | 'readwrite'): Tool[] {
    return this.list().filter(t => t.definition.mode === mode);
  }

  /**
   * Get all tool definitions — the format sent to the LLM.
   */
  getDefinitions(): ToolDefinition[] {
    return this.list().map(t => t.definition);
  }

  /**
   * Get definitions for a subset of tool names (by name).
   * Returns only definitions for tools that exist in the registry.
   */
  getDefinitionsFor(names: string[]): ToolDefinition[] {
    return names
      .map(name => this.tools.get(name))
      .filter((t): t is Tool => t !== undefined)
      .map(t => t.definition);
  }

  /**
   * Check if a tool exists.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Number of registered tools.
   */
  get size(): number {
    return this.tools.size;
  }

  /**
   * Execute a single tool call. Dispatches to the registered tool.
   */
  async execute(call: ToolCall, context: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return {
        callId: call.id,
        toolName: call.name,
        success: false,
        output: '',
        error: `Unknown tool: "${call.name}". Available: ${this.list().map(t => t.definition.name).join(', ')}`,
        durationMs: 0,
      };
    }

    const start = Date.now();
    try {
      const result = await tool.execute(call.arguments, context);
      // Ensure callId and toolName are set
      result.callId = call.id;
      result.toolName = call.name;
      result.durationMs = Date.now() - start;
      return result;
    } catch (error) {
      return {
        callId: call.id,
        toolName: call.name,
        success: false,
        output: '',
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Execute multiple tool calls in parallel. Returns an aggregated report.
   */
  async executeAll(
    calls: ToolCall[],
    context: ToolContext,
  ): Promise<ToolExecutionReport> {
    const start = Date.now();
    const results = await Promise.all(
      calls.map(call => this.execute(call, context))
    );

    return {
      totalCalls: calls.length,
      succeeded: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
      totalDurationMs: Date.now() - start,
    };
  }

  /**
   * Clear all registered tools.
   */
  clear(): void {
    this.tools.clear();
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let _defaultRegistry: ToolRegistry | null = null;

/**
 * Get or create the singleton default ToolRegistry.
 */
export function getToolRegistry(): ToolRegistry {
  if (!_defaultRegistry) {
    _defaultRegistry = new ToolRegistry();
  }
  return _defaultRegistry;
}

/**
 * Reset the singleton registry (primarily for testing).
 */
export function resetToolRegistry(): void {
  _defaultRegistry = null;
}
