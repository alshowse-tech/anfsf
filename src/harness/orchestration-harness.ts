/**
 * ANFSF V1.5.0 - Orchestration Harness
 * 
 * Responsible for MCP Bus and Multi-Agent Orchestration.
 * Phase 1 of Layer 8.5 decomposition.
 */

import { MCPBus, MessageBuilder } from '../mcp/mcp-bus';
import type { MCPBusConfig } from '../mcp/types';

export interface OrchestrationConfig {
  mcpBusConfig: MCPBusConfig;
  maxConcurrentAgents: number;
  enableTracing: boolean;
  enableIdempotency: boolean;
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
};

/**
 * Orchestration Harness - manages MCP Bus and agent coordination.
 */
export class OrchestrationHarness {
  private config: OrchestrationConfig;
  private mcpBus: MCPBus;
  private activeAgents: Set<string>;
  private messageQueue: Array<{ message: any; timestamp: number }>;

  constructor(config: Partial<OrchestrationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.mcpBus = new MCPBus(this.config.mcpBusConfig);
    this.activeAgents = new Set();
    this.messageQueue = [];
  }

  /**
   * Get MCP Bus instance.
   */
  getBus(): MCPBus {
    return this.mcpBus;
  }

  /**
   * Register an agent for orchestration.
   */
  registerAgent(agentId: string): void {
    this.activeAgents.add(agentId);
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
