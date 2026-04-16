/**
 * ANFSF V1.5.0 - Orchestration Harness
 *
 * Responsible for MCP Bus and Multi-Agent Orchestration.
 * Phase 1 of Layer 8.5 decomposition.
 */
import { MCPBus } from '../mcp/mcp-bus';
import type { MCPBusConfig } from '../mcp/types';
export interface OrchestrationConfig {
    mcpBusConfig: MCPBusConfig;
    maxConcurrentAgents: number;
    enableTracing: boolean;
    enableIdempotency: boolean;
}
/**
 * Orchestration Harness - manages MCP Bus and agent coordination.
 */
export declare class OrchestrationHarness {
    private config;
    private mcpBus;
    private activeAgents;
    private messageQueue;
    constructor(config?: Partial<OrchestrationConfig>);
    /**
     * Get MCP Bus instance.
     */
    getBus(): MCPBus;
    /**
     * Register an agent for orchestration.
     */
    registerAgent(agentId: string): void;
    /**
     * Unregister an agent.
     */
    unregisterAgent(agentId: string): void;
    /**
     * Get active agent count.
     */
    getActiveAgentCount(): number;
    /**
     * Check if agent is active.
     */
    isAgentActive(agentId: string): boolean;
    /**
     * Send message to agent with idempotency check.
     */
    sendMessage(from: string, to: string, type: string, payload: any, idempotentKey?: string): Promise<any>;
    /**
     * Broadcast message to all active agents.
     */
    broadcast(from: string, type: string, payload: any, idempotentKey?: string): Promise<any[]>;
    /**
     * Get harness metrics.
     */
    getMetrics(): {
        activeAgents: number;
        queuedMessages: number;
        busStats: any;
    };
    /**
     * Cleanup resources.
     */
    dispose(): void;
}
export declare function getDefaultHarness(): OrchestrationHarness;
export declare function resetDefaultHarness(): void;
