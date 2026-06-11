/**
 * ANFSF V1.5.0 - Orchestration Harness
 * 
 * Responsible for MCP Bus and Multi-Agent Orchestration.
 * Phase 1 of Layer 8.5 decomposition.
 */

import { MCPBus, MessageBuilder } from '../mcp/mcp-bus';
import type { MCPBusConfig } from '../mcp/types';
import { TaskDAGEngine, createTaskDAGEngine, type TaskNode, type DAGExecutionPlan, type TaskInsertionResult } from '../core/task-dag/task-dag-engine';
import type { AgentOS, AgentCapability } from '../agents';

export interface OrchestrationConfig {
  mcpBusConfig: MCPBusConfig;
  maxConcurrentAgents: number;
  enableTracing: boolean;
  enableIdempotency: boolean;
  /** DAG parallelism cap */
  maxParallelism?: number;
  /** Auto-break dependency cycles */
  autoBreakCycles?: boolean;
}

const DEFAULT_CONFIG: OrchestrationConfig = {
  mcpBusConfig: {
    defaultTTL: 30000,
    maxQueueSize: 1000,
    enableLogging: false,
    enableIdempotency: true,
    idempotencyCacheTTL: 300000,
    enableTracing: true,
  },
  maxConcurrentAgents: 10,
  enableTracing: true,
  enableIdempotency: true,
  maxParallelism: 10,
  autoBreakCycles: true,
};

/**
 * Orchestration Harness - manages MCP Bus and agent coordination.
 */
export class OrchestrationHarness {
  private config: OrchestrationConfig;
  private mcpBus: MCPBus;
  private activeAgents: Set<string>;
  private messageQueue: Array<{ message: any; timestamp: number }>;
  private taskDAG: TaskDAGEngine;
  private currentPlan: DAGExecutionPlan | null = null;
  private onTaskComplete?: (taskId: string, newlyReady: string[]) => void;
  private agentOS: AgentOS | null = null;

  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mcpBus = new MCPBus(this.config.mcpBusConfig);
    this.activeAgents = new Set();
    this.messageQueue = [];
    this.taskDAG = createTaskDAGEngine({
      maxParallelism: this.config.maxParallelism,
      autoBreakCycles: this.config.autoBreakCycles,
    });
  }

  /**
   * Get MCP Bus instance.
   */
  getBus(): MCPBus {
    return this.mcpBus;
  }

  /**
   * Get Task DAG engine instance.
   */
  getTaskDAG(): TaskDAGEngine {
    return this.taskDAG;
  }

  /**
   * Inject AgentOS for lifecycle management.
   */
  setAgentOS(agentOS: AgentOS): void {
    this.agentOS = agentOS;
  }

  /**
   * Register an agent for orchestration.
   */
  registerAgent(agentId: string, options?: { name?: string; capabilities?: AgentCapability[] }): void {
    this.activeAgents.add(agentId);
    if (this.agentOS) {
      this.agentOS.registerAgent({
        id: agentId,
        name: options?.name || agentId,
        capabilities: options?.capabilities,
      });
    }
  }

  /**
   * Unregister an agent.
   */
  unregisterAgent(agentId: string): void {
    this.activeAgents.delete(agentId);
  }

  /**
   * Get active agent count.
   */
  getActiveAgentCount(): number {
    return this.activeAgents.size;
  }

  /**
   * Check if agent is active.
   */
  isAgentActive(agentId: string): boolean {
    return this.activeAgents.has(agentId);
  }

  // ---------------------------------------------------------------------------
  // DAG-based Task Orchestration
  // ---------------------------------------------------------------------------

  /**
   * Register a task for DAG-based execution.
   */
  registerTask(task: Omit<TaskNode, 'status' | 'dependencies' | 'dependents'> & { dependencies?: string[] }): void {
    this.taskDAG.addTask(task);
  }

  /**
   * Generate and execute DAG-based task plan.
   * Returns the execution plan with parallel waves.
   */
  planAndExecute(): DAGExecutionPlan | null {
    this.currentPlan = this.taskDAG.generateExecutionPlan();
    return this.currentPlan;
  }

  /**
   * Execute a single wave of ready tasks by sending messages to agents.
   * Returns the list of task IDs dispatched in this wave.
   */
  async executeWave(agentId: string): Promise<string[]> {
    const readyTasks = this.taskDAG.getReadyTasks();
    const dispatched: string[] = [];

    for (const taskId of readyTasks.slice(0, this.config.maxConcurrentAgents)) {
      const task = this.taskDAG.getTask(taskId);
      if (!task || task.status !== 'ready') continue;

      task.status = 'running';
      await this.sendMessage('orchestrator', agentId, 'task_execute', { taskId, task });
      dispatched.push(taskId);
    }

    return dispatched;
  }

  /**
   * Mark a task as completed and get newly ready tasks.
   */
  completeTask(taskId: string): string[] {
    const result = this.taskDAG.completeTask(taskId);
    if (this.onTaskComplete) {
      this.onTaskComplete(taskId, result.newlyReady);
    }
    return result.newlyReady;
  }

  /**
   * Insert a new task at runtime and re-plan.
   */
  insertTask(task: Omit<TaskNode, 'status' | 'dependencies' | 'dependents'> & { dependencies?: string[] }): TaskInsertionResult {
    const result = this.taskDAG.insertTask(task);
    if (result.inserted) {
      this.currentPlan = result.newPlan ?? this.taskDAG.generateExecutionPlan();
    }
    return result;
  }

  /**
   * Get DAG status summary.
   */
  getDAGStatus() {
    return this.taskDAG.getStatus();
  }

  /**
   * Get current execution plan.
   */
  getCurrentPlan(): DAGExecutionPlan | null {
    return this.currentPlan;
  }

  /**
   * Set callback for task completion.
   */
  onTaskCompleted(callback: (taskId: string, newlyReady: string[]) => void): void {
    this.onTaskComplete = callback;
  }

  /**
   * Send message to agent with idempotency check.
   */
  async sendMessage(
    from: string,
    to: string,
    type: string,
    payload: any,
    idempotentKey?: string
  ): Promise<any> {
    const message = new MessageBuilder()
      .from(from)
      .to(to)
      .type(type as any)
      .payload(payload)
      .idempotentKey(idempotentKey || `${from}-${to}-${Date.now()}`)
      .requiresAck(true)
      .build();

    return this.mcpBus.send(message);
  }

  /**
   * Broadcast message to all active agents.
   */
  async broadcast(
    from: string,
    type: string,
    payload: any,
    idempotentKey?: string
  ): Promise<any[]> {
    const message = new MessageBuilder()
      .from(from)
      .to('*')
      .type(type as any)
      .payload(payload)
      .idempotentKey(idempotentKey || `broadcast-${from}-${Date.now()}`)
      .requiresAck(true)
      .build();

    return this.mcpBus.broadcast(message);
  }

  /**
   * Get harness metrics.
   */
  getMetrics(): {
    activeAgents: number;
    queuedMessages: number;
    busStats: any;
  } {
    return {
      activeAgents: this.activeAgents.size,
      queuedMessages: this.messageQueue.length,
      busStats: this.mcpBus.getStats(),
    };
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.activeAgents.clear();
    this.messageQueue = [];
  }
}

/**
 * Singleton harness instance.
 */
let defaultHarness: OrchestrationHarness | null = null;

export function getDefaultHarness(): OrchestrationHarness {
  if (!defaultHarness) {
    defaultHarness = new OrchestrationHarness();
  }
  return defaultHarness;
}

export function resetDefaultHarness(): void {
  defaultHarness = null;
}
