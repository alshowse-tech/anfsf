/**
 * ANFSF V4 Layer 9 - Multi-Agent Coordination Protocol
 *
 * Extends MCPBus with agent-specific message types for task delegation,
 * result aggregation, capability discovery, and error recovery.
 */

import { MCPBus, MessageBuilder } from '../mcp/mcp-bus';
import type {
  AgentMessageType,
  TaskPayload,
  TaskDelegation,
  AgentEntry,
  AgentOSEvent,
} from './types';

export class CoordinationProtocol {
  private bus: MCPBus;
  private pendingTasks: Map<string, TaskDelegation>;
  private aggregatedResults: Map<string, any[]>;
  private expectedAgentCount: Map<string, number>;
  private eventListeners: Set<(event: AgentOSEvent) => void>;
  private responseCallbacks: Map<string, (response: any) => void>;

  constructor(bus: MCPBus) {
    this.bus = bus;
    this.pendingTasks = new Map();
    this.aggregatedResults = new Map();
    this.expectedAgentCount = new Map();
    this.eventListeners = new Set();
    this.responseCallbacks = new Map();
  }

  async delegateTask(
    fromAgent: string,
    toAgent: string,
    task: TaskPayload
  ): Promise<any> {
    const delegation: TaskDelegation = {
      taskId: task.taskId,
      fromAgent,
      toAgent,
      payload: task,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.pendingTasks.set(task.taskId, delegation);

    const response = await this.bus.send(
      new MessageBuilder()
        .from(fromAgent)
        .to(toAgent)
        .type('task_delegate' as any)
        .payload(task)
        .idempotentKey(`task-delegate-${task.taskId}`)
        .requiresAck(true)
        .ttl(task.timeoutMs || 30000)
        .build()
    );

    return response;
  }

  async aggregateResult(
    taskId: string,
    fromAgent: string,
    result: any
  ): Promise<boolean> {
    if (!this.aggregatedResults.has(taskId)) {
      this.aggregatedResults.set(taskId, []);
    }
    this.aggregatedResults.get(taskId)!.push({ agentId: fromAgent, result, timestamp: Date.now() });

    const delegation = this.pendingTasks.get(taskId);
    if (delegation) {
      const expected = this.expectedAgentCount.get(taskId) || 1;
      const current = this.aggregatedResults.get(taskId)!.length;

      if (current >= expected) {
        delegation.status = 'completed';
        delegation.completedAt = Date.now();
        delegation.result = this.aggregatedResults.get(taskId);
        this.emitEvent('agent:task_completed', delegation.fromAgent, { taskId });
        return true;
      }
    }

    return false;
  }

  getAggregatedResult(taskId: string): any[] | null {
    return this.aggregatedResults.get(taskId) || null;
  }

  setExpectedAgentCount(taskId: string, count: number): void {
    this.expectedAgentCount.set(taskId, count);
  }

  async recoverTask(
    fromAgent: string,
    failedTask: TaskPayload,
    retries: number = 3
  ): Promise<any> {
    const delegation = this.pendingTasks.get(failedTask.taskId);
    if (delegation) {
      delegation.status = 'recovered';
    }

    const response = await this.bus.send(
      new MessageBuilder()
        .from(fromAgent)
        .to(failedTask.taskId)
        .type('error_recover' as any)
        .payload({ task: failedTask, retries })
        .idempotentKey(`error-recover-${failedTask.taskId}`)
        .requiresAck(true)
        .build()
    );

    return response;
  }

  async discoverCapabilities(
    requesterId: string,
    requiredCapability: string
  ): Promise<string[]> {
    const response = await this.bus.broadcast(
      new MessageBuilder()
        .from(requesterId)
        .to('*')
        .type('capability_discover' as any)
        .payload({ requiredCapability })
        .idempotentKey(`capability-discover-${Date.now()}`)
        .requiresAck(true)
        .build()
    );

    const agentsWithCapability: string[] = [];
    if (Array.isArray(response)) {
      for (const resp of response) {
        if (resp.status === 'success' && resp.payload?.hasCapability) {
          agentsWithCapability.push(resp.from);
        }
      }
    }

    return agentsWithCapability;
  }

  broadcastHeartbeat(agentId: string, resourceUsage?: { memoryMB?: number; cpuPercent?: number }): void {
    this.bus.send(
      new MessageBuilder()
        .from(agentId)
        .to('*')
        .type('heartbeat' as any)
        .payload({ resourceUsage })
        .requiresAck(false)
        .build()
    ).catch(() => {});
  }

  onAgentEvent(callback: (event: AgentOSEvent) => void): () => void {
    this.eventListeners.add(callback);
    return () => { this.eventListeners.delete(callback); };
  }

  getPendingTasks(): Map<string, TaskDelegation> {
    return new Map(this.pendingTasks);
  }

  getPendingTaskCount(): number {
    return this.pendingTasks.size;
  }

  private emitEvent(type: AgentOSEvent['type'], agentId: string, data?: any): void {
    const event: AgentOSEvent = {
      type,
      agentId,
      timestamp: Date.now(),
      data,
    };
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }
}
