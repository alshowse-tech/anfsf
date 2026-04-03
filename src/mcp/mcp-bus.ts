/**
 * ANFSF V4 Layer 8.5 - MCP Bus Implementation
 * 
 * Message Communication Protocol bus for agent-to-agent communication.
 * Features: idempotency, TTL, full-link tracing, version validation.
 */

import {
  MCPMessage,
  MCPResponse,
  MCPBusConfig,
  MCPBusStats,
  Subscription,
  AgentId,
  IdempotencyRecord,
  MessageTrace,
  MCPErrorCodes,
  isMCPMessage,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<MCPBusConfig> = {
  defaultTTL: 30000,
  maxQueueSize: 1000,
  enableLogging: false,
  enableIdempotency: true,
  idempotencyCacheTTL: 300000,
  enableTracing: true,
};

const PROTOCOL_VERSION = 'mcp/1.0' as const;
const SCHEMA_VERSION = '2026-03' as const;

// ============================================================================
// Helper Functions
// ============================================================================

/** Generate UUID */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Generate trace ID */
function generateTraceId(): string {
  return `trace_${Date.now()}_${generateUUID().substring(0, 8)}`;
}

/** Get current timestamp */
function now(): number {
  return Date.now();
}

// ============================================================================
// MCPBus Class
// ============================================================================

/**
 * MCPBus - Message Communication Protocol Bus
 * 
 * Provides reliable, traced, idempotent message delivery between agents.
 */
export class MCPBus {
  private config: Required<MCPBusConfig>;
  private subscriptions: Map<AgentId, Set<(msg: MCPMessage) => void>>;
  private idempotencyCache: Map<string, IdempotencyRecord>;
  private idempotencyPending: Set<string>; // Track in-flight idempotent keys
  private messageTraces: Map<string, MessageTrace>;
  private stats: MCPBusStats;
  private messageQueue: MCPMessage[];
  private logBuffer: string[];

  constructor(config: MCPBusConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.subscriptions = new Map();
    this.idempotencyCache = new Map();
    this.idempotencyPending = new Set();
    this.messageTraces = new Map();
    this.messageQueue = [];
    this.logBuffer = [];
    this.stats = {
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalBroadcasts: 0,
      activeSubscriptions: 0,
      idempotencyCacheSize: 0,
      averageLatency: 0,
      messagesDroppedTTL: 0,
      duplicateMessagesRejected: 0,
    };

    // Start idempotency cache cleanup
    this.startIdempotencyCleanup();
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Send a message to a specific agent
   */
  async send(message: MCPMessage): Promise<MCPResponse> {
    const startTime = now();

    // Validate message
    const validationError = this.validateMessage(message);
    if (validationError) {
      return this.createErrorResponse(message.id, message.correlationId, validationError, 'Message validation failed');
    }

    // Check idempotency
    if (this.config.enableIdempotency && message.idempotentKey) {
      const cachedResponse = this.checkIdempotency(message.idempotentKey);
      if (cachedResponse) {
        this.log(`[MCPBus] Duplicate message detected, returning cached response: ${message.idempotentKey}`);
        this.stats.duplicateMessagesRejected++;
        return cachedResponse;
      }
      
      // Mark as in-flight to prevent concurrent duplicates
      this.idempotencyPending.add(message.idempotentKey);
    }

    // Check TTL
    if (this.isExpired(message)) {
      this.log(`[MCPBus] Message expired: ${message.id}`);
      this.stats.messagesDroppedTTL++;
      if (message.idempotentKey) {
        this.idempotencyPending.delete(message.idempotentKey);
      }
      return this.createErrorResponse(message.id, message.correlationId, 'TTL_EXPIRED', 'Message TTL expired');
    }

    // Add timestamp if not present
    if (!message.timestamp) {
      message.timestamp = now();
    }

    // Initialize trace
    if (this.config.enableTracing && !message.traceId) {
      message.traceId = generateTraceId();
    }

    // Update trace
    if (message.traceId) {
      this.updateTrace(message, startTime);
    }

    // Find subscribers
    const subscribers = this.subscriptions.get(message.to) || this.subscriptions.get('*');
    
    if (!subscribers || subscribers.size === 0) {
      this.log(`[MCPBus] No subscribers for: ${message.to}`);
      if (message.idempotentKey) {
        this.idempotencyPending.delete(message.idempotentKey);
      }
      return this.createErrorResponse(message.id, message.correlationId, 'RECIPIENT_NOT_FOUND', `No subscribers found for agent: ${message.to}`);
    }

    // Deliver message
    this.stats.totalMessagesSent++;
    this.stats.totalMessagesReceived += subscribers.size;

    const responses: MCPResponse[] = [];
    for (const callback of subscribers) {
      try {
        callback(message);
        if (message.requiresAck) {
          const response = this.createSuccessResponse(message.id, message.correlationId, message.from);
          responses.push(response);
          
          // Cache response for idempotency
          if (this.config.enableIdempotency && message.idempotentKey) {
            this.cacheIdempotency(message.idempotentKey, message.id, response);
          }
        }
      } catch (error) {
        this.log(`[MCPBus] Error delivering message: ${error}`);
        responses.push(this.createErrorResponse(message.id, message.correlationId, 'DELIVERY_ERROR', String(error)));
      }
    }

    // Update stats
    this.updateStats(startTime);

    // Clean up idempotency pending flag
    if (message.idempotentKey) {
      this.idempotencyPending.delete(message.idempotentKey);
    }

    // Return first response or success
    return responses[0] || this.createSuccessResponse(message.id, message.correlationId, message.from);
  }

  /**
   * Broadcast a message to all agents
   */
  async broadcast(message: MCPMessage): Promise<MCPResponse[]> {
    const startTime = now();

    // Validate message
    const validationError = this.validateMessage(message);
    if (validationError) {
      if (message.idempotentKey) this.idempotencyPending.delete(message.idempotentKey);
      return [this.createErrorResponse(message.id, message.correlationId, validationError, 'Message validation failed')];
    }

    // Check idempotency
    if (this.config.enableIdempotency && message.idempotentKey) {
      const cachedResponse = this.checkIdempotency(message.idempotentKey);
      if (cachedResponse) {
        return [cachedResponse];
      }
      this.idempotencyPending.add(message.idempotentKey);
    }

    // Check TTL
    if (this.isExpired(message)) {
      if (message.idempotentKey) this.idempotencyPending.delete(message.idempotentKey);
      return [this.createErrorResponse(message.id, message.correlationId, 'TTL_EXPIRED', 'Message TTL expired')];
    }

    // Set to broadcast
    message.to = '*';
    this.stats.totalBroadcasts++;

    // Get all subscribers (use array to allow same callback for multiple agents)
    const allSubscribers: Function[] = [];
    for (const [agentId, callbacks] of this.subscriptions.entries()) {
      if (agentId !== '*') {
        callbacks.forEach(cb => allSubscribers.push(cb));
      }
    }

    if (allSubscribers.length === 0) {
      this.log('[MCPBus] No subscribers for broadcast');
      if (message.idempotentKey) this.idempotencyPending.delete(message.idempotentKey);
      return [];
    }

    // Deliver to all
    const responses: MCPResponse[] = [];
    let hasError = false;
    for (const callback of allSubscribers) {
      try {
        callback(message);
        // Broadcast always returns responses (broadcast implies acknowledgment)
        responses.push(this.createSuccessResponse(message.id, message.correlationId, message.from));
      } catch (error) {
        hasError = true;
        responses.push(this.createErrorResponse(message.id, message.correlationId, 'DELIVERY_ERROR', String(error)));
      }
    }

    // Clean up pending on error
    if (hasError && message.idempotentKey) {
      this.idempotencyPending.delete(message.idempotentKey);
    }

    this.stats.totalMessagesSent++;
    this.stats.totalMessagesReceived += allSubscribers.length;
    this.updateStats(startTime);

    // Cache response and clean up pending
    if (message.idempotentKey) {
      this.cacheIdempotency(message.idempotentKey, message.id, responses[0] || this.createSuccessResponse(message.id, message.correlationId, message.from));
    }

    return responses;
  }

  /**
   * Subscribe to messages for an agent
   */
  subscribe(agentId: AgentId, callback: (msg: MCPMessage) => void): Subscription {
    if (!this.subscriptions.has(agentId)) {
      this.subscriptions.set(agentId, new Set());
    }

    this.subscriptions.get(agentId)!.add(callback);
    this.stats.activeSubscriptions++;

    this.log(`[MCPBus] Agent subscribed: ${agentId}`);

    const subscription: Subscription = {
      id: generateUUID(),
      agentId,
      isActive: true,
      unsubscribe: () => {
        subscription.isActive = false;
        this.unsubscribe(agentId, callback);
      },
    };

    return subscription;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private unsubscribe(agentId: AgentId, callback: (msg: MCPMessage) => void): void {
    const callbacks = this.subscriptions.get(agentId);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(agentId);
        this.stats.activeSubscriptions--;
      }
      this.log(`[MCPBus] Agent unsubscribed: ${agentId}`);
    }
  }

  private validateMessage(message: MCPMessage): string | null {
    if (!isMCPMessage(message)) {
      return 'INVALID_MESSAGE';
    }

    if (message.schemaVersion !== SCHEMA_VERSION) {
      return 'SCHEMA_MISMATCH';
    }

    if (message.ttl <= 0) {
      return 'INVALID_TTL';
    }

    if (this.messageQueue.length >= this.config.maxQueueSize) {
      return 'QUEUE_FULL';
    }

    return null;
  }

  private isExpired(message: MCPMessage): boolean {
    const timestamp = message.timestamp || now();
    return now() - timestamp > message.ttl;
  }

  private checkIdempotency(key: string): MCPResponse | null {
    const record = this.idempotencyCache.get(key);
    if (!record) {
      return null;
    }

    if (now() > record.expiresAt) {
      this.idempotencyCache.delete(key);
      return null;
    }

    return record.response;
  }

  private cacheIdempotency(key: string, messageId: string, response: MCPResponse): void {
    const record: IdempotencyRecord = {
      key,
      messageId,
      response,
      createdAt: now(),
      expiresAt: now() + this.config.idempotencyCacheTTL,
    };

    this.idempotencyCache.set(key, record);
    this.idempotencyPending.delete(key);
    this.stats.idempotencyCacheSize = this.idempotencyCache.size;
  }

  private updateTrace(message: MCPMessage, startTime: number): void {
    if (!this.messageTraces.has(message.traceId!)) {
      this.messageTraces.set(message.traceId!, {
        traceId: message.traceId!,
        messageChain: [],
        totalLatency: 0,
        hopCount: 0,
      });
    }

    const trace = this.messageTraces.get(message.traceId!)!;
    const latency = now() - startTime;

    trace.messageChain.push({
      messageId: message.id,
      from: message.from,
      to: message.to,
      type: message.type,
      timestamp: now(),
      latency,
    });

    trace.totalLatency += latency;
    trace.hopCount++;
  }

  private createSuccessResponse(messageId: string, correlationId: string, from: AgentId): MCPResponse {
    return {
      messageId,
      correlationId,
      status: 'success',
      timestamp: now(),
      from,
    };
  }

  private createErrorResponse(messageId: string, correlationId: string, code: string, error: string): MCPResponse {
    return {
      messageId,
      correlationId,
      status: 'error',
      error: `${code}: ${error}`,
      timestamp: now(),
      from: 'system',
    };
  }

  private updateStats(startTime: number): void {
    const latency = now() - startTime;
    this.stats.averageLatency = (this.stats.averageLatency * (this.stats.totalMessagesSent - 1) + latency) / this.stats.totalMessagesSent;
  }

  private startIdempotencyCleanup(): void {
    setInterval(() => {
      const nowTime = now();
      for (const [key, record] of this.idempotencyCache.entries()) {
        if (nowTime > record.expiresAt) {
          this.idempotencyCache.delete(key);
        }
      }
      this.stats.idempotencyCacheSize = this.idempotencyCache.size;
    }, 60000); // Clean up every minute
  }

  private log(message: string): void {
    if (this.config.enableLogging) {
      this.logBuffer.push(`[${now()}] ${message}`);
      if (this.logBuffer.length > 1000) {
        this.logBuffer.shift();
      }
      console.log(message);
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /** Get bus statistics */
  getStats(): MCPBusStats {
    return { ...this.stats };
  }

  /** Get message trace */
  getTrace(traceId: string): MessageTrace | null {
    return this.messageTraces.get(traceId) || null;
  }

  /** Get logs */
  getLogs(limit: number = 100): string[] {
    return this.logBuffer.slice(-limit);
  }

  /** Clear idempotency cache */
  clearIdempotencyCache(): void {
    this.idempotencyCache.clear();
    this.stats.idempotencyCacheSize = 0;
  }

  /** Create a new message builder */
  static createMessageBuilder(): MessageBuilder {
    return new MessageBuilder();
  }
}

// ============================================================================
// Message Builder
// ============================================================================

/**
 * MessageBuilder - Fluent builder for MCP messages
 */
export class MessageBuilder {
  private message: Partial<MCPMessage> = {
    protocol: PROTOCOL_VERSION,
    schemaVersion: SCHEMA_VERSION,
    id: generateUUID(),
    correlationId: generateUUID(),
    ttl: DEFAULT_CONFIG.defaultTTL,
    requiresAck: true,
  };

  from(agentId: AgentId): this {
    this.message.from = agentId;
    return this;
  }

  to(agentId: AgentId | '*'): this {
    this.message.to = agentId;
    return this;
  }

  type(type: MCPMessage['type']): this {
    this.message.type = type;
    return this;
  }

  payload(payload: any): this {
    this.message.payload = payload;
    return this;
  }

  ttl(ttl: number): this {
    this.message.ttl = ttl;
    return this;
  }

  idempotentKey(key: string): this {
    this.message.idempotentKey = key;
    return this;
  }

  traceId(traceId: string): this {
    this.message.traceId = traceId;
    return this;
  }

  requiresAck(ack: boolean): this {
    this.message.requiresAck = ack;
    return this;
  }

  build(): MCPMessage {
    if (!this.message.from || !this.message.to || !this.message.type || !this.message.payload) {
      throw new Error('Missing required fields: from, to, type, payload');
    }

    // Set timestamp at build time for TTL to work correctly
    if (!this.message.timestamp) {
      this.message.timestamp = now();
    }

    return this.message as MCPMessage;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default MCPBus;
