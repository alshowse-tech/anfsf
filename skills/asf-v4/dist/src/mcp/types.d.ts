/**
 * ANFSF V4 Layer 8.5 - MCP Bus Type Definitions
 *
 * MCP (Message Communication Protocol) bus types for agent communication.
 * Supports idempotency, TTL, full-link tracing, and version validation.
 * Version: 2026-03
 */
/** Agent identifier */
export type AgentId = string;
/** MCP message types */
export type MCPMessageType = 'proposal' | 'query' | 'command' | 'feedback' | 'approval' | 'telemetry';
/** MCP protocol version */
export type MCPProtocolVersion = 'mcp/1.0';
/** Schema version for type validation */
export type MCPSchemaVersion = '2026-03';
/**
 * MCPMessage - Core message structure for agent communication
 *
 * All messages must include:
 * - protocol: MCP protocol version
 * - id: Unique message ID
 * - from: Sender agent ID
 * - to: Recipient agent ID or "*" for broadcast
 * - type: Message type
 * - payload: Message content
 * - ttl: Time-to-live in milliseconds
 * - correlationId: Correlation ID for request-response pairing
 * - schemaVersion: Schema version for validation
 * - requiresAck: Whether acknowledgment is required
 *
 * Optional fields:
 * - idempotentKey: Prevent duplicate execution
 * - traceId: Full-link tracing ID
 */
export interface MCPMessage {
    /** Protocol version */
    protocol: MCPProtocolVersion;
    /** Unique message ID (UUID) */
    id: string;
    /** Sender agent ID */
    from: AgentId;
    /** Recipient agent ID or "*" for broadcast */
    to: AgentId | '*';
    /** Message type */
    type: MCPMessageType;
    /** Message payload */
    payload: any;
    /** Time-to-live in milliseconds */
    ttl: number;
    /** Correlation ID for request-response pairing */
    correlationId: string;
    /** Schema version */
    schemaVersion: MCPSchemaVersion;
    /** Whether acknowledgment is required */
    requiresAck: boolean;
    /** Idempotency key (optional) */
    idempotentKey?: string;
    /** Full-link tracing ID (optional) */
    traceId?: string;
    /** Timestamp when message was created */
    timestamp?: number;
}
/**
 * MCPResponse - Response to an MCP message
 */
export interface MCPResponse {
    /** Message ID this response is for */
    messageId: string;
    /** Correlation ID */
    correlationId: string;
    /** Response status */
    status: 'success' | 'error' | 'timeout' | 'rejected';
    /** Response payload */
    payload?: any;
    /** Error message if status is 'error' */
    error?: string;
    /** Timestamp when response was created */
    timestamp: number;
    /** Sender agent ID */
    from: AgentId;
}
/**
 * Subscription - Represents an active message subscription
 */
export interface Subscription {
    /** Subscription ID */
    id: string;
    /** Subscribed agent ID */
    agentId: AgentId;
    /** Unsubscribe function */
    unsubscribe: () => void;
    /** Whether subscription is active */
    isActive: boolean;
}
/**
 * MCPBusConfig - Configuration for MCP bus
 */
export interface MCPBusConfig {
    /** Default TTL in milliseconds (default: 30000) */
    defaultTTL?: number;
    /** Maximum message queue size (default: 1000) */
    maxQueueSize?: number;
    /** Enable message logging */
    enableLogging?: boolean;
    /** Enable idempotency checking */
    enableIdempotency?: boolean;
    /** Idempotency cache TTL in milliseconds (default: 300000) */
    idempotencyCacheTTL?: number;
    /** Enable tracing */
    enableTracing?: boolean;
}
/**
 * MessageTrace - Full-link tracing information
 */
export interface MessageTrace {
    /** Trace ID */
    traceId: string;
    /** Message chain */
    messageChain: Array<{
        messageId: string;
        from: AgentId;
        to: AgentId | '*';
        type: MCPMessageType;
        timestamp: number;
        latency?: number;
    }>;
    /** Total latency in milliseconds */
    totalLatency: number;
    /** Number of hops */
    hopCount: number;
}
/**
 * IdempotencyRecord - Record for idempotency checking
 */
export interface IdempotencyRecord {
    /** Idempotency key */
    key: string;
    /** Message ID */
    messageId: string;
    /** Response (cached) */
    response: MCPResponse;
    /** Timestamp when record was created */
    createdAt: number;
    /** Timestamp when record expires */
    expiresAt: number;
}
/**
 * MCPBusStats - Bus statistics
 */
export interface MCPBusStats {
    /** Total messages sent */
    totalMessagesSent: number;
    /** Total messages received */
    totalMessagesReceived: number;
    /** Total broadcasts */
    totalBroadcasts: number;
    /** Active subscriptions */
    activeSubscriptions: number;
    /** Idempotency cache size */
    idempotencyCacheSize: number;
    /** Average latency in milliseconds */
    averageLatency: number;
    /** Messages dropped due to TTL */
    messagesDroppedTTL: number;
    /** Duplicate messages rejected */
    duplicateMessagesRejected: number;
}
/**
 * MCPError - MCP bus error
 */
export interface MCPError {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Additional details */
    details?: any;
}
/** Error codes */
export declare const MCPErrorCodes: {
    readonly INVALID_MESSAGE: "INVALID_MESSAGE";
    readonly TTL_EXPIRED: "TTL_EXPIRED";
    readonly DUPLICATE_MESSAGE: "DUPLICATE_MESSAGE";
    readonly RECIPIENT_NOT_FOUND: "RECIPIENT_NOT_FOUND";
    readonly QUEUE_FULL: "QUEUE_FULL";
    readonly SCHEMA_MISMATCH: "SCHEMA_MISMATCH";
    readonly SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND";
};
export declare function isMCPMessage(obj: any): obj is MCPMessage;
export declare function isMCPResponse(obj: any): obj is MCPResponse;
