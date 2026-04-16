/**
 * ANFSF V4 Layer 8.5 - MCP Bus Implementation
 *
 * Message Communication Protocol bus for agent-to-agent communication.
 * Features: idempotency, TTL, full-link tracing, version validation.
 */
import { MCPMessage, MCPResponse, MCPBusConfig, MCPBusStats, Subscription, AgentId, MessageTrace } from './types';
/**
 * MCPBus - Message Communication Protocol Bus
 *
 * Provides reliable, traced, idempotent message delivery between agents.
 */
export declare class MCPBus {
    private config;
    private subscriptions;
    private idempotencyCache;
    private idempotencyPending;
    private messageTraces;
    private stats;
    private messageQueue;
    private logBuffer;
    constructor(config?: MCPBusConfig);
    /**
     * Send a message to a specific agent
     */
    send(message: MCPMessage): Promise<MCPResponse>;
    /**
     * Broadcast a message to all agents
     */
    broadcast(message: MCPMessage): Promise<MCPResponse[]>;
    /**
     * Subscribe to messages for an agent
     */
    subscribe(agentId: AgentId, callback: (msg: MCPMessage) => void): Subscription;
    private unsubscribe;
    private validateMessage;
    private isExpired;
    private checkIdempotency;
    private cacheIdempotency;
    private updateTrace;
    private createSuccessResponse;
    private createErrorResponse;
    private updateStats;
    private startIdempotencyCleanup;
    private log;
    /** Get bus statistics */
    getStats(): MCPBusStats;
    /** Get message trace */
    getTrace(traceId: string): MessageTrace | null;
    /** Get logs */
    getLogs(limit?: number): string[];
    /** Clear idempotency cache */
    clearIdempotencyCache(): void;
    /** Create a new message builder */
    static createMessageBuilder(): MessageBuilder;
}
/**
 * MessageBuilder - Fluent builder for MCP messages
 */
export declare class MessageBuilder {
    private message;
    from(agentId: AgentId): this;
    to(agentId: AgentId | '*'): this;
    type(type: MCPMessage['type']): this;
    payload(payload: any): this;
    ttl(ttl: number): this;
    idempotentKey(key: string): this;
    traceId(traceId: string): this;
    requiresAck(ack: boolean): this;
    build(): MCPMessage;
}
export default MCPBus;
