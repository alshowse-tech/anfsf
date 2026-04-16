"use strict";
/**
 * ANFSF V4 Layer 8.5 - MCP Bus Implementation
 *
 * Message Communication Protocol bus for agent-to-agent communication.
 * Features: idempotency, TTL, full-link tracing, version validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageBuilder = exports.MCPBus = void 0;
const types_1 = require("./types");
// ============================================================================
// Constants
// ============================================================================
const DEFAULT_CONFIG = {
    defaultTTL: 30000,
    maxQueueSize: 1000,
    enableLogging: false,
    enableIdempotency: true,
    idempotencyCacheTTL: 300000,
    enableTracing: true,
};
const PROTOCOL_VERSION = 'mcp/1.0';
const SCHEMA_VERSION = '2026-03';
// ============================================================================
// Helper Functions
// ============================================================================
/** Generate UUID */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/** Generate trace ID */
function generateTraceId() {
    return `trace_${Date.now()}_${generateUUID().substring(0, 8)}`;
}
/** Get current timestamp */
function now() {
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
class MCPBus {
    constructor(config = {}) {
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
    async send(message) {
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
        const responses = [];
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
            }
            catch (error) {
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
    async broadcast(message) {
        const startTime = now();
        // Validate message
        const validationError = this.validateMessage(message);
        if (validationError) {
            if (message.idempotentKey)
                this.idempotencyPending.delete(message.idempotentKey);
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
            if (message.idempotentKey)
                this.idempotencyPending.delete(message.idempotentKey);
            return [this.createErrorResponse(message.id, message.correlationId, 'TTL_EXPIRED', 'Message TTL expired')];
        }
        // Set to broadcast
        message.to = '*';
        this.stats.totalBroadcasts++;
        // Get all subscribers (use array to allow same callback for multiple agents)
        const allSubscribers = [];
        for (const [agentId, callbacks] of this.subscriptions.entries()) {
            if (agentId !== '*') {
                callbacks.forEach(cb => allSubscribers.push(cb));
            }
        }
        if (allSubscribers.length === 0) {
            this.log('[MCPBus] No subscribers for broadcast');
            if (message.idempotentKey)
                this.idempotencyPending.delete(message.idempotentKey);
            return [];
        }
        // Deliver to all
        const responses = [];
        let hasError = false;
        for (const callback of allSubscribers) {
            try {
                callback(message);
                // Broadcast always returns responses (broadcast implies acknowledgment)
                responses.push(this.createSuccessResponse(message.id, message.correlationId, message.from));
            }
            catch (error) {
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
    subscribe(agentId, callback) {
        if (!this.subscriptions.has(agentId)) {
            this.subscriptions.set(agentId, new Set());
        }
        this.subscriptions.get(agentId).add(callback);
        this.stats.activeSubscriptions++;
        this.log(`[MCPBus] Agent subscribed: ${agentId}`);
        const subscription = {
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
    unsubscribe(agentId, callback) {
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
    validateMessage(message) {
        if (!(0, types_1.isMCPMessage)(message)) {
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
    isExpired(message) {
        const timestamp = message.timestamp || now();
        return now() - timestamp > message.ttl;
    }
    checkIdempotency(key) {
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
    cacheIdempotency(key, messageId, response) {
        const record = {
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
    updateTrace(message, startTime) {
        if (!this.messageTraces.has(message.traceId)) {
            this.messageTraces.set(message.traceId, {
                traceId: message.traceId,
                messageChain: [],
                totalLatency: 0,
                hopCount: 0,
            });
        }
        const trace = this.messageTraces.get(message.traceId);
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
    createSuccessResponse(messageId, correlationId, from) {
        return {
            messageId,
            correlationId,
            status: 'success',
            timestamp: now(),
            from,
        };
    }
    createErrorResponse(messageId, correlationId, code, error) {
        return {
            messageId,
            correlationId,
            status: 'error',
            error: `${code}: ${error}`,
            timestamp: now(),
            from: 'system',
        };
    }
    updateStats(startTime) {
        const latency = now() - startTime;
        this.stats.averageLatency = (this.stats.averageLatency * (this.stats.totalMessagesSent - 1) + latency) / this.stats.totalMessagesSent;
    }
    startIdempotencyCleanup() {
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
    log(message) {
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
    getStats() {
        return { ...this.stats };
    }
    /** Get message trace */
    getTrace(traceId) {
        return this.messageTraces.get(traceId) || null;
    }
    /** Get logs */
    getLogs(limit = 100) {
        return this.logBuffer.slice(-limit);
    }
    /** Clear idempotency cache */
    clearIdempotencyCache() {
        this.idempotencyCache.clear();
        this.stats.idempotencyCacheSize = 0;
    }
    /** Create a new message builder */
    static createMessageBuilder() {
        return new MessageBuilder();
    }
}
exports.MCPBus = MCPBus;
// ============================================================================
// Message Builder
// ============================================================================
/**
 * MessageBuilder - Fluent builder for MCP messages
 */
class MessageBuilder {
    constructor() {
        this.message = {
            protocol: PROTOCOL_VERSION,
            schemaVersion: SCHEMA_VERSION,
            id: generateUUID(),
            correlationId: generateUUID(),
            ttl: DEFAULT_CONFIG.defaultTTL,
            requiresAck: true,
        };
    }
    from(agentId) {
        this.message.from = agentId;
        return this;
    }
    to(agentId) {
        this.message.to = agentId;
        return this;
    }
    type(type) {
        this.message.type = type;
        return this;
    }
    payload(payload) {
        this.message.payload = payload;
        return this;
    }
    ttl(ttl) {
        this.message.ttl = ttl;
        return this;
    }
    idempotentKey(key) {
        this.message.idempotentKey = key;
        return this;
    }
    traceId(traceId) {
        this.message.traceId = traceId;
        return this;
    }
    requiresAck(ack) {
        this.message.requiresAck = ack;
        return this;
    }
    build() {
        if (!this.message.from || !this.message.to || !this.message.type || !this.message.payload) {
            throw new Error('Missing required fields: from, to, type, payload');
        }
        // Set timestamp at build time for TTL to work correctly
        if (!this.message.timestamp) {
            this.message.timestamp = now();
        }
        return this.message;
    }
}
exports.MessageBuilder = MessageBuilder;
// ============================================================================
// Exports
// ============================================================================
exports.default = MCPBus;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLWJ1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9tY3AvbWNwLWJ1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILG1DQVdpQjtBQUVqQiwrRUFBK0U7QUFDL0UsWUFBWTtBQUNaLCtFQUErRTtBQUUvRSxNQUFNLGNBQWMsR0FBMkI7SUFDN0MsVUFBVSxFQUFFLEtBQUs7SUFDakIsWUFBWSxFQUFFLElBQUk7SUFDbEIsYUFBYSxFQUFFLEtBQUs7SUFDcEIsaUJBQWlCLEVBQUUsSUFBSTtJQUN2QixtQkFBbUIsRUFBRSxNQUFNO0lBQzNCLGFBQWEsRUFBRSxJQUFJO0NBQ3BCLENBQUM7QUFFRixNQUFNLGdCQUFnQixHQUFHLFNBQWtCLENBQUM7QUFDNUMsTUFBTSxjQUFjLEdBQUcsU0FBa0IsQ0FBQztBQUUxQywrRUFBK0U7QUFDL0UsbUJBQW1CO0FBQ25CLCtFQUErRTtBQUUvRSxvQkFBb0I7QUFDcEIsU0FBUyxZQUFZO0lBQ25CLE9BQU8sc0NBQXNDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ25FLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMxQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsd0JBQXdCO0FBQ3hCLFNBQVMsZUFBZTtJQUN0QixPQUFPLFNBQVMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLFlBQVksRUFBRSxDQUFDLFNBQVMsQ0FB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QUksS0FBSyxDQUFDLGtEQUFrRCxDQUFDLENBQUM7UUFDdEUsQ0FBQztRQUVELHdEQUF3RDtRQUN4RCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsT0FBcUIsQ0FBQztJQUNwQyxDQUFDO0NBQ0Y7QUE5REQsd0NBOERDO0FBRUQsK0VBQStFO0FBQy9FLFVBQVU7QUFDViwrRUFBK0U7QUFFL0Usa0JBQWUsTUFBTSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWNCBMYXllciA4LjUgLSBNQ1AgQnVzIEltcGxlbWVudGF0aW9uXG4gKiBcbiAqIE1lc3NhZ2UgQ29tbXVuaWNhdGlvbiBQcm90b2NvbCBidXMgZm9yIGFnZW50LXRvLWFnZW50IGNvbW11bmljYXRpb24uXG4gKiBGZWF0dXJlczogaWRlbXBvdGVuY3ksIFRUTCwgZnVsbC1saW5rIHRyYWNpbmcsIHZlcnNpb24gdmFsaWRhdGlvbi5cbiAqL1xuXG5pbXBvcnQge1xuICBNQ1BNZXNzYWdlLFxuICBNQ1BSZXNwb25zZSxcbiAgTUNQQnVzQ29uZmlnLFxuICBNQ1BCdXNTdGF0cyxcbiAgU3Vic2NyaXB0aW9uLFxuICBBZ2VudElkLFxuICBJZGVtcG90ZW5jeVJlY29yZCxcbiAgTWVzc2FnZVRyYWNlLFxuICBNQ1BFcnJvckNvZGVzLFxuICBpc01DUE1lc3NhZ2UsXG59IGZyb20gJy4vdHlwZXMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY29uc3QgREVGQVVMVF9DT05GSUc6IFJlcXVpcmVkPE1DUEJ1c0NvbmZpZz4gPSB7XG4gIGRlZmF1bHRUVEw6IDMwMDAwLFxuICBtYXhRdWV1ZVNpemU6IDEwMDAsXG4gIGVuYWJsZUxvZ2dpbmc6IGZhbHNlLFxuICBlbmFibGVJZGVtcG90ZW5jeTogdHJ1ZSxcbiAgaWRlbXBvdGVuY3lDYWNoZVRUTDogMzAwMDAwLFxuICBlbmFibGVUcmFjaW5nOiB0cnVlLFxufTtcblxuY29uc3QgUFJPVE9DT0xfVkVSU0lPTiA9ICdtY3AvMS4wJyBhcyBjb25zdDtcbmNvbnN0IFNDSEVNQV9WRVJTSU9OID0gJzIwMjYtMDMnIGFzIGNvbnN0O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIZWxwZXIgRnVuY3Rpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBHZW5lcmF0ZSBVVUlEICovXG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKTogc3RyaW5nIHtcbiAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgKGMpID0+IHtcbiAgICBjb25zdCByID0gKE1hdGgucmFuZG9tKCkgKiAxNikgfCAwO1xuICAgIGNvbnN0IHYgPSBjID09PSAneCcgPyByIDogKHIgJiAweDMpIHwgMHg4O1xuICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgfSk7XG59XG5cbi8qKiBHZW5lcmF0ZSB0cmFjZSBJRCAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVUcmFjZUlkKCk6IHN0cmluZyB7XG4gIHJldHVybiBgdHJhY2VfJHtEYXRlLm5vdygpfV8ke2dlbmVyYXRlVVVJRCgpLnN1YnN0cmluZygwLCA4KX1gO1xufVxuXG4vKiogR2V0IGN1cnJlbnQgdGltZXN0YW1wICovXG5mdW5jdGlvbiBub3coKTogbnVtYmVyIHtcbiAgcmV0dXJuIERhdGUubm93KCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1DUEJ1cyBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE1DUEJ1cyAtIE1lc3NhZ2UgQ29tbXVuaWNhdGlvbiBQcm90b2NvbCBCdXNcbiAqIFxuICogUHJvdmlkZXMgcmVsaWFibGUsIHRyYWNlZCwgaWRlbXBvdGVudCBtZXNzYWdlIGRlbGl2ZXJ5IGJldHdlZW4gYWdlbnRzLlxuICovXG5leHBvcnQgY2xhc3MgTUNQQnVzIHtcbiAgcHJpdmF0ZSBjb25maWc6IFJlcXVpcmVkPE1DUEJ1c0NvbmZpZz47XG4gIHByaXZhdGUgc3Vic2NyaXB0aW9uczogTWFwPEFnZW50SWQsIFNldDwobXNnOiBNQ1BNZXNzYWdlKSA9PiB2b2lkPj47XG4gIHByaXZhdGUgaWRlbXBvdGVuY3lDYWNoZTogTWFwPHN0cmluZywgSWRlbXBvdGVuY3lSZWNvcmQ+O1xuICBwcml2YXRlIGlkZW1wb3RlbmN5UGVuZGluZzogU2V0PHN0cmluZz47IC8vIFRyYWNrIGluLWZsaWdodCBpZGVtcG90ZW50IGtleXNcbiAgcHJpdmF0ZSBtZXNzYWdlVHJhY2VzOiBNYXA8c3RyaW5nLCBNZXNzYWdlVHJhY2U+O1xuICBwcml2YXRlIHN0YXRzOiBNQ1BCdXNTdGF0cztcbiAgcHJpdmF0ZSBtZXNzYWdlUXVldWU6IE1DUE1lc3NhZ2VbXTtcbiAgcHJpdmF0ZSBsb2dCdWZmZXI6IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogTUNQQnVzQ29uZmlnID0ge30pIHtcbiAgICB0aGlzLmNvbmZpZyA9IHsgLi4uREVGQVVMVF9DT05GSUcsIC4uLmNvbmZpZyB9O1xuICAgIHRoaXMuc3Vic2NyaXB0aW9ucyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5pZGVtcG90ZW5jeVBlbmRpbmcgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5tZXNzYWdlVHJhY2VzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMubWVzc2FnZVF1ZXVlID0gW107XG4gICAgdGhpcy5sb2dCdWZmZXIgPSBbXTtcbiAgICB0aGlzLnN0YXRzID0ge1xuICAgICAgdG90YWxNZXNzYWdlc1NlbnQ6IDAsXG4gICAgICB0b3RhbE1lc3NhZ2VzUmVjZWl2ZWQ6IDAsXG4gICAgICB0b3RhbEJyb2FkY2FzdHM6IDAsXG4gICAgICBhY3RpdmVTdWJzY3JpcHRpb25zOiAwLFxuICAgICAgaWRlbXBvdGVuY3lDYWNoZVNpemU6IDAsXG4gICAgICBhdmVyYWdlTGF0ZW5jeTogMCxcbiAgICAgIG1lc3NhZ2VzRHJvcHBlZFRUTDogMCxcbiAgICAgIGR1cGxpY2F0ZU1lc3NhZ2VzUmVqZWN0ZWQ6IDAsXG4gICAgfTtcblxuICAgIC8vIFN0YXJ0IGlkZW1wb3RlbmN5IGNhY2hlIGNsZWFudXBcbiAgICB0aGlzLnN0YXJ0SWRlbXBvdGVuY3lDbGVhbnVwKCk7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENvcmUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIFNlbmQgYSBtZXNzYWdlIHRvIGEgc3BlY2lmaWMgYWdlbnRcbiAgICovXG4gIGFzeW5jIHNlbmQobWVzc2FnZTogTUNQTWVzc2FnZSk6IFByb21pc2U8TUNQUmVzcG9uc2U+IHtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBub3coKTtcblxuICAgIC8vIFZhbGlkYXRlIG1lc3NhZ2VcbiAgICBjb25zdCB2YWxpZGF0aW9uRXJyb3IgPSB0aGlzLnZhbGlkYXRlTWVzc2FnZShtZXNzYWdlKTtcbiAgICBpZiAodmFsaWRhdGlvbkVycm9yKSB7XG4gICAgICByZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3BvbnNlKG1lc3NhZ2UuaWQsIG1lc3NhZ2UuY29ycmVsYXRpb25JZCwgdmFsaWRhdGlvbkVycm9yLCAnTWVzc2FnZSB2YWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlkZW1wb3RlbmN5XG4gICAgaWYgKHRoaXMuY29uZmlnLmVuYWJsZUlkZW1wb3RlbmN5ICYmIG1lc3NhZ2UuaWRlbXBvdGVudEtleSkge1xuICAgICAgY29uc3QgY2FjaGVkUmVzcG9uc2UgPSB0aGlzLmNoZWNrSWRlbXBvdGVuY3kobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICAgIGlmIChjYWNoZWRSZXNwb25zZSkge1xuICAgICAgICB0aGlzLmxvZyhgW01DUEJ1c10gRHVwbGljYXRlIG1lc3NhZ2UgZGV0ZWN0ZWQsIHJldHVybmluZyBjYWNoZWQgcmVzcG9uc2U6ICR7bWVzc2FnZS5pZGVtcG90ZW50S2V5fWApO1xuICAgICAgICB0aGlzLnN0YXRzLmR1cGxpY2F0ZU1lc3NhZ2VzUmVqZWN0ZWQrKztcbiAgICAgICAgcmV0dXJuIGNhY2hlZFJlc3BvbnNlO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBNYXJrIGFzIGluLWZsaWdodCB0byBwcmV2ZW50IGNvbmN1cnJlbnQgZHVwbGljYXRlc1xuICAgICAgdGhpcy5pZGVtcG90ZW5jeVBlbmRpbmcuYWRkKG1lc3NhZ2UuaWRlbXBvdGVudEtleSk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgVFRMXG4gICAgaWYgKHRoaXMuaXNFeHBpcmVkKG1lc3NhZ2UpKSB7XG4gICAgICB0aGlzLmxvZyhgW01DUEJ1c10gTWVzc2FnZSBleHBpcmVkOiAke21lc3NhZ2UuaWR9YCk7XG4gICAgICB0aGlzLnN0YXRzLm1lc3NhZ2VzRHJvcHBlZFRUTCsrO1xuICAgICAgaWYgKG1lc3NhZ2UuaWRlbXBvdGVudEtleSkge1xuICAgICAgICB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5kZWxldGUobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCAnVFRMX0VYUElSRUQnLCAnTWVzc2FnZSBUVEwgZXhwaXJlZCcpO1xuICAgIH1cblxuICAgIC8vIEFkZCB0aW1lc3RhbXAgaWYgbm90IHByZXNlbnRcbiAgICBpZiAoIW1lc3NhZ2UudGltZXN0YW1wKSB7XG4gICAgICBtZXNzYWdlLnRpbWVzdGFtcCA9IG5vdygpO1xuICAgIH1cblxuICAgIC8vIEluaXRpYWxpemUgdHJhY2VcbiAgICBpZiAodGhpcy5jb25maWcuZW5hYmxlVHJhY2luZyAmJiAhbWVzc2FnZS50cmFjZUlkKSB7XG4gICAgICBtZXNzYWdlLnRyYWNlSWQgPSBnZW5lcmF0ZVRyYWNlSWQoKTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgdHJhY2VcbiAgICBpZiAobWVzc2FnZS50cmFjZUlkKSB7XG4gICAgICB0aGlzLnVwZGF0ZVRyYWNlKG1lc3NhZ2UsIHN0YXJ0VGltZSk7XG4gICAgfVxuXG4gICAgLy8gRmluZCBzdWJzY3JpYmVyc1xuICAgIGNvbnN0IHN1YnNjcmliZXJzID0gdGhpcy5zdWJzY3JpcHRpb25zLmdldChtZXNzYWdlLnRvKSB8fCB0aGlzLnN1YnNjcmlwdGlvbnMuZ2V0KCcqJyk7XG4gICAgXG4gICAgaWYgKCFzdWJzY3JpYmVycyB8fCBzdWJzY3JpYmVycy5zaXplID09PSAwKSB7XG4gICAgICB0aGlzLmxvZyhgW01DUEJ1c10gTm8gc3Vic2NyaWJlcnMgZm9yOiAke21lc3NhZ2UudG99YCk7XG4gICAgICBpZiAobWVzc2FnZS5pZGVtcG90ZW50S2V5KSB7XG4gICAgICAgIHRoaXMuaWRlbXBvdGVuY3lQZW5kaW5nLmRlbGV0ZShtZXNzYWdlLmlkZW1wb3RlbnRLZXkpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXNwb25zZShtZXNzYWdlLmlkLCBtZXNzYWdlLmNvcnJlbGF0aW9uSWQsICdSRUNJUElFTlRfTk9UX0ZPVU5EJywgYE5vIHN1YnNjcmliZXJzIGZvdW5kIGZvciBhZ2VudDogJHttZXNzYWdlLnRvfWApO1xuICAgIH1cblxuICAgIC8vIERlbGl2ZXIgbWVzc2FnZVxuICAgIHRoaXMuc3RhdHMudG90YWxNZXNzYWdlc1NlbnQrKztcbiAgICB0aGlzLnN0YXRzLnRvdGFsTWVzc2FnZXNSZWNlaXZlZCArPSBzdWJzY3JpYmVycy5zaXplO1xuXG4gICAgY29uc3QgcmVzcG9uc2VzOiBNQ1BSZXNwb25zZVtdID0gW107XG4gICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiBzdWJzY3JpYmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2FsbGJhY2sobWVzc2FnZSk7XG4gICAgICAgIGlmIChtZXNzYWdlLnJlcXVpcmVzQWNrKSB7XG4gICAgICAgICAgY29uc3QgcmVzcG9uc2UgPSB0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXNwb25zZShtZXNzYWdlLmlkLCBtZXNzYWdlLmNvcnJlbGF0aW9uSWQsIG1lc3NhZ2UuZnJvbSk7XG4gICAgICAgICAgcmVzcG9uc2VzLnB1c2gocmVzcG9uc2UpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIENhY2hlIHJlc3BvbnNlIGZvciBpZGVtcG90ZW5jeVxuICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5lbmFibGVJZGVtcG90ZW5jeSAmJiBtZXNzYWdlLmlkZW1wb3RlbnRLZXkpIHtcbiAgICAgICAgICAgIHRoaXMuY2FjaGVJZGVtcG90ZW5jeShtZXNzYWdlLmlkZW1wb3RlbnRLZXksIG1lc3NhZ2UuaWQsIHJlc3BvbnNlKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHRoaXMubG9nKGBbTUNQQnVzXSBFcnJvciBkZWxpdmVyaW5nIG1lc3NhZ2U6ICR7ZXJyb3J9YCk7XG4gICAgICAgIHJlc3BvbnNlcy5wdXNoKHRoaXMuY3JlYXRlRXJyb3JSZXNwb25zZShtZXNzYWdlLmlkLCBtZXNzYWdlLmNvcnJlbGF0aW9uSWQsICdERUxJVkVSWV9FUlJPUicsIFN0cmluZyhlcnJvcikpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgc3RhdHNcbiAgICB0aGlzLnVwZGF0ZVN0YXRzKHN0YXJ0VGltZSk7XG5cbiAgICAvLyBDbGVhbiB1cCBpZGVtcG90ZW5jeSBwZW5kaW5nIGZsYWdcbiAgICBpZiAobWVzc2FnZS5pZGVtcG90ZW50S2V5KSB7XG4gICAgICB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5kZWxldGUobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICB9XG5cbiAgICAvLyBSZXR1cm4gZmlyc3QgcmVzcG9uc2Ugb3Igc3VjY2Vzc1xuICAgIHJldHVybiByZXNwb25zZXNbMF0gfHwgdGhpcy5jcmVhdGVTdWNjZXNzUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCBtZXNzYWdlLmZyb20pO1xuICB9XG5cbiAgLyoqXG4gICAqIEJyb2FkY2FzdCBhIG1lc3NhZ2UgdG8gYWxsIGFnZW50c1xuICAgKi9cbiAgYXN5bmMgYnJvYWRjYXN0KG1lc3NhZ2U6IE1DUE1lc3NhZ2UpOiBQcm9taXNlPE1DUFJlc3BvbnNlW10+IHtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBub3coKTtcblxuICAgIC8vIFZhbGlkYXRlIG1lc3NhZ2VcbiAgICBjb25zdCB2YWxpZGF0aW9uRXJyb3IgPSB0aGlzLnZhbGlkYXRlTWVzc2FnZShtZXNzYWdlKTtcbiAgICBpZiAodmFsaWRhdGlvbkVycm9yKSB7XG4gICAgICBpZiAobWVzc2FnZS5pZGVtcG90ZW50S2V5KSB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5kZWxldGUobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICAgIHJldHVybiBbdGhpcy5jcmVhdGVFcnJvclJlc3BvbnNlKG1lc3NhZ2UuaWQsIG1lc3NhZ2UuY29ycmVsYXRpb25JZCwgdmFsaWRhdGlvbkVycm9yLCAnTWVzc2FnZSB2YWxpZGF0aW9uIGZhaWxlZCcpXTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZGVtcG90ZW5jeVxuICAgIGlmICh0aGlzLmNvbmZpZy5lbmFibGVJZGVtcG90ZW5jeSAmJiBtZXNzYWdlLmlkZW1wb3RlbnRLZXkpIHtcbiAgICAgIGNvbnN0IGNhY2hlZFJlc3BvbnNlID0gdGhpcy5jaGVja0lkZW1wb3RlbmN5KG1lc3NhZ2UuaWRlbXBvdGVudEtleSk7XG4gICAgICBpZiAoY2FjaGVkUmVzcG9uc2UpIHtcbiAgICAgICAgcmV0dXJuIFtjYWNoZWRSZXNwb25zZV07XG4gICAgICB9XG4gICAgICB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5hZGQobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBUVExcbiAgICBpZiAodGhpcy5pc0V4cGlyZWQobWVzc2FnZSkpIHtcbiAgICAgIGlmIChtZXNzYWdlLmlkZW1wb3RlbnRLZXkpIHRoaXMuaWRlbXBvdGVuY3lQZW5kaW5nLmRlbGV0ZShtZXNzYWdlLmlkZW1wb3RlbnRLZXkpO1xuICAgICAgcmV0dXJuIFt0aGlzLmNyZWF0ZUVycm9yUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCAnVFRMX0VYUElSRUQnLCAnTWVzc2FnZSBUVEwgZXhwaXJlZCcpXTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdG8gYnJvYWRjYXN0XG4gICAgbWVzc2FnZS50byA9ICcqJztcbiAgICB0aGlzLnN0YXRzLnRvdGFsQnJvYWRjYXN0cysrO1xuXG4gICAgLy8gR2V0IGFsbCBzdWJzY3JpYmVycyAodXNlIGFycmF5IHRvIGFsbG93IHNhbWUgY2FsbGJhY2sgZm9yIG11bHRpcGxlIGFnZW50cylcbiAgICBjb25zdCBhbGxTdWJzY3JpYmVyczogRnVuY3Rpb25bXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW2FnZW50SWQsIGNhbGxiYWNrc10gb2YgdGhpcy5zdWJzY3JpcHRpb25zLmVudHJpZXMoKSkge1xuICAgICAgaWYgKGFnZW50SWQgIT09ICcqJykge1xuICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChjYiA9PiBhbGxTdWJzY3JpYmVycy5wdXNoKGNiKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGFsbFN1YnNjcmliZXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5sb2coJ1tNQ1BCdXNdIE5vIHN1YnNjcmliZXJzIGZvciBicm9hZGNhc3QnKTtcbiAgICAgIGlmIChtZXNzYWdlLmlkZW1wb3RlbnRLZXkpIHRoaXMuaWRlbXBvdGVuY3lQZW5kaW5nLmRlbGV0ZShtZXNzYWdlLmlkZW1wb3RlbnRLZXkpO1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH1cblxuICAgIC8vIERlbGl2ZXIgdG8gYWxsXG4gICAgY29uc3QgcmVzcG9uc2VzOiBNQ1BSZXNwb25zZVtdID0gW107XG4gICAgbGV0IGhhc0Vycm9yID0gZmFsc2U7XG4gICAgZm9yIChjb25zdCBjYWxsYmFjayBvZiBhbGxTdWJzY3JpYmVycykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY2FsbGJhY2sobWVzc2FnZSk7XG4gICAgICAgIC8vIEJyb2FkY2FzdCBhbHdheXMgcmV0dXJucyByZXNwb25zZXMgKGJyb2FkY2FzdCBpbXBsaWVzIGFja25vd2xlZGdtZW50KVxuICAgICAgICByZXNwb25zZXMucHVzaCh0aGlzLmNyZWF0ZVN1Y2Nlc3NSZXNwb25zZShtZXNzYWdlLmlkLCBtZXNzYWdlLmNvcnJlbGF0aW9uSWQsIG1lc3NhZ2UuZnJvbSkpO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgaGFzRXJyb3IgPSB0cnVlO1xuICAgICAgICByZXNwb25zZXMucHVzaCh0aGlzLmNyZWF0ZUVycm9yUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCAnREVMSVZFUllfRVJST1InLCBTdHJpbmcoZXJyb3IpKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2xlYW4gdXAgcGVuZGluZyBvbiBlcnJvclxuICAgIGlmIChoYXNFcnJvciAmJiBtZXNzYWdlLmlkZW1wb3RlbnRLZXkpIHtcbiAgICAgIHRoaXMuaWRlbXBvdGVuY3lQZW5kaW5nLmRlbGV0ZShtZXNzYWdlLmlkZW1wb3RlbnRLZXkpO1xuICAgIH1cblxuICAgIHRoaXMuc3RhdHMudG90YWxNZXNzYWdlc1NlbnQrKztcbiAgICB0aGlzLnN0YXRzLnRvdGFsTWVzc2FnZXNSZWNlaXZlZCArPSBhbGxTdWJzY3JpYmVycy5sZW5ndGg7XG4gICAgdGhpcy51cGRhdGVTdGF0cyhzdGFydFRpbWUpO1xuXG4gICAgLy8gQ2FjaGUgcmVzcG9uc2UgYW5kIGNsZWFuIHVwIHBlbmRpbmdcbiAgICBpZiAobWVzc2FnZS5pZGVtcG90ZW50S2V5KSB7XG4gICAgICB0aGlzLmNhY2hlSWRlbXBvdGVuY3kobWVzc2FnZS5pZGVtcG90ZW50S2V5LCBtZXNzYWdlLmlkLCByZXNwb25zZXNbMF0gfHwgdGhpcy5jcmVhdGVTdWNjZXNzUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCBtZXNzYWdlLmZyb20pKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzcG9uc2VzO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSB0byBtZXNzYWdlcyBmb3IgYW4gYWdlbnRcbiAgICovXG4gIHN1YnNjcmliZShhZ2VudElkOiBBZ2VudElkLCBjYWxsYmFjazogKG1zZzogTUNQTWVzc2FnZSkgPT4gdm9pZCk6IFN1YnNjcmlwdGlvbiB7XG4gICAgaWYgKCF0aGlzLnN1YnNjcmlwdGlvbnMuaGFzKGFnZW50SWQpKSB7XG4gICAgICB0aGlzLnN1YnNjcmlwdGlvbnMuc2V0KGFnZW50SWQsIG5ldyBTZXQoKSk7XG4gICAgfVxuXG4gICAgdGhpcy5zdWJzY3JpcHRpb25zLmdldChhZ2VudElkKSEuYWRkKGNhbGxiYWNrKTtcbiAgICB0aGlzLnN0YXRzLmFjdGl2ZVN1YnNjcmlwdGlvbnMrKztcblxuICAgIHRoaXMubG9nKGBbTUNQQnVzXSBBZ2VudCBzdWJzY3JpYmVkOiAke2FnZW50SWR9YCk7XG5cbiAgICBjb25zdCBzdWJzY3JpcHRpb246IFN1YnNjcmlwdGlvbiA9IHtcbiAgICAgIGlkOiBnZW5lcmF0ZVVVSUQoKSxcbiAgICAgIGFnZW50SWQsXG4gICAgICBpc0FjdGl2ZTogdHJ1ZSxcbiAgICAgIHVuc3Vic2NyaWJlOiAoKSA9PiB7XG4gICAgICAgIHN1YnNjcmlwdGlvbi5pc0FjdGl2ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnVuc3Vic2NyaWJlKGFnZW50SWQsIGNhbGxiYWNrKTtcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHJldHVybiBzdWJzY3JpcHRpb247XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgcHJpdmF0ZSB1bnN1YnNjcmliZShhZ2VudElkOiBBZ2VudElkLCBjYWxsYmFjazogKG1zZzogTUNQTWVzc2FnZSkgPT4gdm9pZCk6IHZvaWQge1xuICAgIGNvbnN0IGNhbGxiYWNrcyA9IHRoaXMuc3Vic2NyaXB0aW9ucy5nZXQoYWdlbnRJZCk7XG4gICAgaWYgKGNhbGxiYWNrcykge1xuICAgICAgY2FsbGJhY2tzLmRlbGV0ZShjYWxsYmFjayk7XG4gICAgICBpZiAoY2FsbGJhY2tzLnNpemUgPT09IDApIHtcbiAgICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLmRlbGV0ZShhZ2VudElkKTtcbiAgICAgICAgdGhpcy5zdGF0cy5hY3RpdmVTdWJzY3JpcHRpb25zLS07XG4gICAgICB9XG4gICAgICB0aGlzLmxvZyhgW01DUEJ1c10gQWdlbnQgdW5zdWJzY3JpYmVkOiAke2FnZW50SWR9YCk7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSB2YWxpZGF0ZU1lc3NhZ2UobWVzc2FnZTogTUNQTWVzc2FnZSk6IHN0cmluZyB8IG51bGwge1xuICAgIGlmICghaXNNQ1BNZXNzYWdlKG1lc3NhZ2UpKSB7XG4gICAgICByZXR1cm4gJ0lOVkFMSURfTUVTU0FHRSc7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2Uuc2NoZW1hVmVyc2lvbiAhPT0gU0NIRU1BX1ZFUlNJT04pIHtcbiAgICAgIHJldHVybiAnU0NIRU1BX01JU01BVENIJztcbiAgICB9XG5cbiAgICBpZiAobWVzc2FnZS50dGwgPD0gMCkge1xuICAgICAgcmV0dXJuICdJTlZBTElEX1RUTCc7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMubWVzc2FnZVF1ZXVlLmxlbmd0aCA+PSB0aGlzLmNvbmZpZy5tYXhRdWV1ZVNpemUpIHtcbiAgICAgIHJldHVybiAnUVVFVUVfRlVMTCc7XG4gICAgfVxuXG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBwcml2YXRlIGlzRXhwaXJlZChtZXNzYWdlOiBNQ1BNZXNzYWdlKTogYm9vbGVhbiB7XG4gICAgY29uc3QgdGltZXN0YW1wID0gbWVzc2FnZS50aW1lc3RhbXAgfHwgbm93KCk7XG4gICAgcmV0dXJuIG5vdygpIC0gdGltZXN0YW1wID4gbWVzc2FnZS50dGw7XG4gIH1cblxuICBwcml2YXRlIGNoZWNrSWRlbXBvdGVuY3koa2V5OiBzdHJpbmcpOiBNQ1BSZXNwb25zZSB8IG51bGwge1xuICAgIGNvbnN0IHJlY29yZCA9IHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5nZXQoa2V5KTtcbiAgICBpZiAoIXJlY29yZCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgaWYgKG5vdygpID4gcmVjb3JkLmV4cGlyZXNBdCkge1xuICAgICAgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLmRlbGV0ZShrZXkpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlY29yZC5yZXNwb25zZTtcbiAgfVxuXG4gIHByaXZhdGUgY2FjaGVJZGVtcG90ZW5jeShrZXk6IHN0cmluZywgbWVzc2FnZUlkOiBzdHJpbmcsIHJlc3BvbnNlOiBNQ1BSZXNwb25zZSk6IHZvaWQge1xuICAgIGNvbnN0IHJlY29yZDogSWRlbXBvdGVuY3lSZWNvcmQgPSB7XG4gICAgICBrZXksXG4gICAgICBtZXNzYWdlSWQsXG4gICAgICByZXNwb25zZSxcbiAgICAgIGNyZWF0ZWRBdDogbm93KCksXG4gICAgICBleHBpcmVzQXQ6IG5vdygpICsgdGhpcy5jb25maWcuaWRlbXBvdGVuY3lDYWNoZVRUTCxcbiAgICB9O1xuXG4gICAgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLnNldChrZXksIHJlY29yZCk7XG4gICAgdGhpcy5pZGVtcG90ZW5jeVBlbmRpbmcuZGVsZXRlKGtleSk7XG4gICAgdGhpcy5zdGF0cy5pZGVtcG90ZW5jeUNhY2hlU2l6ZSA9IHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5zaXplO1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVUcmFjZShtZXNzYWdlOiBNQ1BNZXNzYWdlLCBzdGFydFRpbWU6IG51bWJlcik6IHZvaWQge1xuICAgIGlmICghdGhpcy5tZXNzYWdlVHJhY2VzLmhhcyhtZXNzYWdlLnRyYWNlSWQhKSkge1xuICAgICAgdGhpcy5tZXNzYWdlVHJhY2VzLnNldChtZXNzYWdlLnRyYWNlSWQhLCB7XG4gICAgICAgIHRyYWNlSWQ6IG1lc3NhZ2UudHJhY2VJZCEsXG4gICAgICAgIG1lc3NhZ2VDaGFpbjogW10sXG4gICAgICAgIHRvdGFsTGF0ZW5jeTogMCxcbiAgICAgICAgaG9wQ291bnQ6IDAsXG4gICAgICB9KTtcbiAgICB9XG5cbiAgICBjb25zdCB0cmFjZSA9IHRoaXMubWVzc2FnZVRyYWNlcy5nZXQobWVzc2FnZS50cmFjZUlkISkhO1xuICAgIGNvbnN0IGxhdGVuY3kgPSBub3coKSAtIHN0YXJ0VGltZTtcblxuICAgIHRyYWNlLm1lc3NhZ2VDaGFpbi5wdXNoKHtcbiAgICAgIG1lc3NhZ2VJZDogbWVzc2FnZS5pZCxcbiAgICAgIGZyb206IG1lc3NhZ2UuZnJvbSxcbiAgICAgIHRvOiBtZXNzYWdlLnRvLFxuICAgICAgdHlwZTogbWVzc2FnZS50eXBlLFxuICAgICAgdGltZXN0YW1wOiBub3coKSxcbiAgICAgIGxhdGVuY3ksXG4gICAgfSk7XG5cbiAgICB0cmFjZS50b3RhbExhdGVuY3kgKz0gbGF0ZW5jeTtcbiAgICB0cmFjZS5ob3BDb3VudCsrO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVTdWNjZXNzUmVzcG9uc2UobWVzc2FnZUlkOiBzdHJpbmcsIGNvcnJlbGF0aW9uSWQ6IHN0cmluZywgZnJvbTogQWdlbnRJZCk6IE1DUFJlc3BvbnNlIHtcbiAgICByZXR1cm4ge1xuICAgICAgbWVzc2FnZUlkLFxuICAgICAgY29ycmVsYXRpb25JZCxcbiAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxuICAgICAgdGltZXN0YW1wOiBub3coKSxcbiAgICAgIGZyb20sXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlRXJyb3JSZXNwb25zZShtZXNzYWdlSWQ6IHN0cmluZywgY29ycmVsYXRpb25JZDogc3RyaW5nLCBjb2RlOiBzdHJpbmcsIGVycm9yOiBzdHJpbmcpOiBNQ1BSZXNwb25zZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2VJZCxcbiAgICAgIGNvcnJlbGF0aW9uSWQsXG4gICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICBlcnJvcjogYCR7Y29kZX06ICR7ZXJyb3J9YCxcbiAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgICBmcm9tOiAnc3lzdGVtJyxcbiAgICB9O1xuICB9XG5cbiAgcHJpdmF0ZSB1cGRhdGVTdGF0cyhzdGFydFRpbWU6IG51bWJlcik6IHZvaWQge1xuICAgIGNvbnN0IGxhdGVuY3kgPSBub3coKSAtIHN0YXJ0VGltZTtcbiAgICB0aGlzLnN0YXRzLmF2ZXJhZ2VMYXRlbmN5ID0gKHRoaXMuc3RhdHMuYXZlcmFnZUxhdGVuY3kgKiAodGhpcy5zdGF0cy50b3RhbE1lc3NhZ2VzU2VudCAtIDEpICsgbGF0ZW5jeSkgLyB0aGlzLnN0YXRzLnRvdGFsTWVzc2FnZXNTZW50O1xuICB9XG5cbiAgcHJpdmF0ZSBzdGFydElkZW1wb3RlbmN5Q2xlYW51cCgpOiB2b2lkIHtcbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBjb25zdCBub3dUaW1lID0gbm93KCk7XG4gICAgICBmb3IgKGNvbnN0IFtrZXksIHJlY29yZF0gb2YgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLmVudHJpZXMoKSkge1xuICAgICAgICBpZiAobm93VGltZSA+IHJlY29yZC5leHBpcmVzQXQpIHtcbiAgICAgICAgICB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuZGVsZXRlKGtleSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRoaXMuc3RhdHMuaWRlbXBvdGVuY3lDYWNoZVNpemUgPSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuc2l6ZTtcbiAgICB9LCA2MDAwMCk7IC8vIENsZWFuIHVwIGV2ZXJ5IG1pbnV0ZVxuICB9XG5cbiAgcHJpdmF0ZSBsb2cobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY29uZmlnLmVuYWJsZUxvZ2dpbmcpIHtcbiAgICAgIHRoaXMubG9nQnVmZmVyLnB1c2goYFske25vdygpfV0gJHttZXNzYWdlfWApO1xuICAgICAgaWYgKHRoaXMubG9nQnVmZmVyLmxlbmd0aCA+IDEwMDApIHtcbiAgICAgICAgdGhpcy5sb2dCdWZmZXIuc2hpZnQoKTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UpO1xuICAgIH1cbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVXRpbGl0eSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKiogR2V0IGJ1cyBzdGF0aXN0aWNzICovXG4gIGdldFN0YXRzKCk6IE1DUEJ1c1N0YXRzIHtcbiAgICByZXR1cm4geyAuLi50aGlzLnN0YXRzIH07XG4gIH1cblxuICAvKiogR2V0IG1lc3NhZ2UgdHJhY2UgKi9cbiAgZ2V0VHJhY2UodHJhY2VJZDogc3RyaW5nKTogTWVzc2FnZVRyYWNlIHwgbnVsbCB7XG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZVRyYWNlcy5nZXQodHJhY2VJZCkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKiBHZXQgbG9ncyAqL1xuICBnZXRMb2dzKGxpbWl0OiBudW1iZXIgPSAxMDApOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMubG9nQnVmZmVyLnNsaWNlKC1saW1pdCk7XG4gIH1cblxuICAvKiogQ2xlYXIgaWRlbXBvdGVuY3kgY2FjaGUgKi9cbiAgY2xlYXJJZGVtcG90ZW5jeUNhY2hlKCk6IHZvaWQge1xuICAgIHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5jbGVhcigpO1xuICAgIHRoaXMuc3RhdHMuaWRlbXBvdGVuY3lDYWNoZVNpemUgPSAwO1xuICB9XG5cbiAgLyoqIENyZWF0ZSBhIG5ldyBtZXNzYWdlIGJ1aWxkZXIgKi9cbiAgc3RhdGljIGNyZWF0ZU1lc3NhZ2VCdWlsZGVyKCk6IE1lc3NhZ2VCdWlsZGVyIHtcbiAgICByZXR1cm4gbmV3IE1lc3NhZ2VCdWlsZGVyKCk7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gTWVzc2FnZSBCdWlsZGVyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogTWVzc2FnZUJ1aWxkZXIgLSBGbHVlbnQgYnVpbGRlciBmb3IgTUNQIG1lc3NhZ2VzXG4gKi9cbmV4cG9ydCBjbGFzcyBNZXNzYWdlQnVpbGRlciB7XG4gIHByaXZhdGUgbWVzc2FnZTogUGFydGlhbDxNQ1BNZXNzYWdlPiA9IHtcbiAgICBwcm90b2NvbDogUFJPVE9DT0xfVkVSU0lPTixcbiAgICBzY2hlbWFWZXJzaW9uOiBTQ0hFTUFfVkVSU0lPTixcbiAgICBpZDogZ2VuZXJhdGVVVUlEKCksXG4gICAgY29ycmVsYXRpb25JZDogZ2VuZXJhdGVVVUlEKCksXG4gICAgdHRsOiBERUZBVUxUX0NPTkZJRy5kZWZhdWx0VFRMLFxuICAgIHJlcXVpcmVzQWNrOiB0cnVlLFxuICB9O1xuXG4gIGZyb20oYWdlbnRJZDogQWdlbnRJZCk6IHRoaXMge1xuICAgIHRoaXMubWVzc2FnZS5mcm9tID0gYWdlbnRJZDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRvKGFnZW50SWQ6IEFnZW50SWQgfCAnKicpOiB0aGlzIHtcbiAgICB0aGlzLm1lc3NhZ2UudG8gPSBhZ2VudElkO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdHlwZSh0eXBlOiBNQ1BNZXNzYWdlWyd0eXBlJ10pOiB0aGlzIHtcbiAgICB0aGlzLm1lc3NhZ2UudHlwZSA9IHR5cGU7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBwYXlsb2FkKHBheWxvYWQ6IGFueSk6IHRoaXMge1xuICAgIHRoaXMubWVzc2FnZS5wYXlsb2FkID0gcGF5bG9hZDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHR0bCh0dGw6IG51bWJlcik6IHRoaXMge1xuICAgIHRoaXMubWVzc2FnZS50dGwgPSB0dGw7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBpZGVtcG90ZW50S2V5KGtleTogc3RyaW5nKTogdGhpcyB7XG4gICAgdGhpcy5tZXNzYWdlLmlkZW1wb3RlbnRLZXkgPSBrZXk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB0cmFjZUlkKHRyYWNlSWQ6IHN0cmluZyk6IHRoaXMge1xuICAgIHRoaXMubWVzc2FnZS50cmFjZUlkID0gdHJhY2VJZDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHJlcXVpcmVzQWNrKGFjazogYm9vbGVhbik6IHRoaXMge1xuICAgIHRoaXMubWVzc2FnZS5yZXF1aXJlc0FjayA9IGFjaztcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGJ1aWxkKCk6IE1DUE1lc3NhZ2Uge1xuICAgIGlmICghdGhpcy5tZXNzYWdlLmZyb20gfHwgIXRoaXMubWVzc2FnZS50byB8fCAhdGhpcy5tZXNzYWdlLnR5cGUgfHwgIXRoaXMubWVzc2FnZS5wYXlsb2FkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBmcm9tLCB0bywgdHlwZSwgcGF5bG9hZCcpO1xuICAgIH1cblxuICAgIC8vIFNldCB0aW1lc3RhbXAgYXQgYnVpbGQgdGltZSBmb3IgVFRMIHRvIHdvcmsgY29ycmVjdGx5XG4gICAgaWYgKCF0aGlzLm1lc3NhZ2UudGltZXN0YW1wKSB7XG4gICAgICB0aGlzLm1lc3NhZ2UudGltZXN0YW1wID0gbm93KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMubWVzc2FnZSBhcyBNQ1BNZXNzYWdlO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4cG9ydHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGRlZmF1bHQgTUNQQnVzO1xuIl19