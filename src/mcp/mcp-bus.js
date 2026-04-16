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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwLWJ1cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1jcC1idXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFFSCxtQ0FXaUI7QUFFakIsK0VBQStFO0FBQy9FLFlBQVk7QUFDWiwrRUFBK0U7QUFFL0UsTUFBTSxjQUFjLEdBQTJCO0lBQzdDLFVBQVUsRUFBRSxLQUFLO0lBQ2pCLFlBQVksRUFBRSxJQUFJO0lBQ2xCLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsbUJBQW1CLEVBQUUsTUFBTTtJQUMzQixhQUFhLEVBQUUsSUFBSTtDQUNwQixDQUFDO0FBRUYsTUFBTSxnQkFBZ0IsR0FBRyxTQUFrQixDQUFDO0FBQzVDLE1BQU0sY0FBYyxHQUFHLFNBQWtCLENBQUM7QUFFMUMsK0VBQStFO0FBQy9FLG1CQUFtQjtBQUNuQiwrRUFBK0U7QUFFL0Usb0JBQW9CO0FBQ3BCLFNBQVMsWUFBWTtJQUNuQixPQUFPLHNDQUFzQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNuRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDMUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELHdCQUF3QjtBQUN4QixTQUFTLGVBQWU7SUFDdEIsT0FBTyxTQUFTLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxZQUFZLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxF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QyxDQUFDO1FBQ3RFLENBQUM7UUFFRCx3REFBd0Q7UUFDeEQsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsR0FBRyxFQUFFLENBQUM7UUFDakMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLE9BQXFCLENBQUM7SUFDcEMsQ0FBQztDQUNGO0FBOURELHdDQThEQztBQUVELCtFQUErRTtBQUMvRSxVQUFVO0FBQ1YsK0VBQStFO0FBRS9FLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjQgTGF5ZXIgOC41IC0gTUNQIEJ1cyBJbXBsZW1lbnRhdGlvblxuICogXG4gKiBNZXNzYWdlIENvbW11bmljYXRpb24gUHJvdG9jb2wgYnVzIGZvciBhZ2VudC10by1hZ2VudCBjb21tdW5pY2F0aW9uLlxuICogRmVhdHVyZXM6IGlkZW1wb3RlbmN5LCBUVEwsIGZ1bGwtbGluayB0cmFjaW5nLCB2ZXJzaW9uIHZhbGlkYXRpb24uXG4gKi9cblxuaW1wb3J0IHtcbiAgTUNQTWVzc2FnZSxcbiAgTUNQUmVzcG9uc2UsXG4gIE1DUEJ1c0NvbmZpZyxcbiAgTUNQQnVzU3RhdHMsXG4gIFN1YnNjcmlwdGlvbixcbiAgQWdlbnRJZCxcbiAgSWRlbXBvdGVuY3lSZWNvcmQsXG4gIE1lc3NhZ2VUcmFjZSxcbiAgTUNQRXJyb3JDb2RlcyxcbiAgaXNNQ1BNZXNzYWdlLFxufSBmcm9tICcuL3R5cGVzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHOiBSZXF1aXJlZDxNQ1BCdXNDb25maWc+ID0ge1xuICBkZWZhdWx0VFRMOiAzMDAwMCxcbiAgbWF4UXVldWVTaXplOiAxMDAwLFxuICBlbmFibGVMb2dnaW5nOiBmYWxzZSxcbiAgZW5hYmxlSWRlbXBvdGVuY3k6IHRydWUsXG4gIGlkZW1wb3RlbmN5Q2FjaGVUVEw6IDMwMDAwMCxcbiAgZW5hYmxlVHJhY2luZzogdHJ1ZSxcbn07XG5cbmNvbnN0IFBST1RPQ09MX1ZFUlNJT04gPSAnbWNwLzEuMCcgYXMgY29uc3Q7XG5jb25zdCBTQ0hFTUFfVkVSU0lPTiA9ICcyMDI2LTAzJyBhcyBjb25zdDtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKiogR2VuZXJhdGUgVVVJRCAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCk6IHN0cmluZyB7XG4gIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIChjKSA9PiB7XG4gICAgY29uc3QgciA9IChNYXRoLnJhbmRvbSgpICogMTYpIHwgMDtcbiAgICBjb25zdCB2ID0gYyA9PT0gJ3gnID8gciA6IChyICYgMHgzKSB8IDB4ODtcbiAgICByZXR1cm4gdi50b1N0cmluZygxNik7XG4gIH0pO1xufVxuXG4vKiogR2VuZXJhdGUgdHJhY2UgSUQgKi9cbmZ1bmN0aW9uIGdlbmVyYXRlVHJhY2VJZCgpOiBzdHJpbmcge1xuICByZXR1cm4gYHRyYWNlXyR7RGF0ZS5ub3coKX1fJHtnZW5lcmF0ZVVVSUQoKS5zdWJzdHJpbmcoMCwgOCl9YDtcbn1cblxuLyoqIEdldCBjdXJyZW50IHRpbWVzdGFtcCAqL1xuZnVuY3Rpb24gbm93KCk6IG51bWJlciB7XG4gIHJldHVybiBEYXRlLm5vdygpO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBNQ1BCdXMgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBNQ1BCdXMgLSBNZXNzYWdlIENvbW11bmljYXRpb24gUHJvdG9jb2wgQnVzXG4gKiBcbiAqIFByb3ZpZGVzIHJlbGlhYmxlLCB0cmFjZWQsIGlkZW1wb3RlbnQgbWVzc2FnZSBkZWxpdmVyeSBiZXR3ZWVuIGFnZW50cy5cbiAqL1xuZXhwb3J0IGNsYXNzIE1DUEJ1cyB7XG4gIHByaXZhdGUgY29uZmlnOiBSZXF1aXJlZDxNQ1BCdXNDb25maWc+O1xuICBwcml2YXRlIHN1YnNjcmlwdGlvbnM6IE1hcDxBZ2VudElkLCBTZXQ8KG1zZzogTUNQTWVzc2FnZSkgPT4gdm9pZD4+O1xuICBwcml2YXRlIGlkZW1wb3RlbmN5Q2FjaGU6IE1hcDxzdHJpbmcsIElkZW1wb3RlbmN5UmVjb3JkPjtcbiAgcHJpdmF0ZSBpZGVtcG90ZW5jeVBlbmRpbmc6IFNldDxzdHJpbmc+OyAvLyBUcmFjayBpbi1mbGlnaHQgaWRlbXBvdGVudCBrZXlzXG4gIHByaXZhdGUgbWVzc2FnZVRyYWNlczogTWFwPHN0cmluZywgTWVzc2FnZVRyYWNlPjtcbiAgcHJpdmF0ZSBzdGF0czogTUNQQnVzU3RhdHM7XG4gIHByaXZhdGUgbWVzc2FnZVF1ZXVlOiBNQ1BNZXNzYWdlW107XG4gIHByaXZhdGUgbG9nQnVmZmVyOiBzdHJpbmdbXTtcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IE1DUEJ1c0NvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5jb25maWcgPSB7IC4uLkRFRkFVTFRfQ09ORklHLCAuLi5jb25maWcgfTtcbiAgICB0aGlzLnN1YnNjcmlwdGlvbnMgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5pZGVtcG90ZW5jeUNhY2hlID0gbmV3IE1hcCgpO1xuICAgIHRoaXMuaWRlbXBvdGVuY3lQZW5kaW5nID0gbmV3IFNldCgpO1xuICAgIHRoaXMubWVzc2FnZVRyYWNlcyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLm1lc3NhZ2VRdWV1ZSA9IFtdO1xuICAgIHRoaXMubG9nQnVmZmVyID0gW107XG4gICAgdGhpcy5zdGF0cyA9IHtcbiAgICAgIHRvdGFsTWVzc2FnZXNTZW50OiAwLFxuICAgICAgdG90YWxNZXNzYWdlc1JlY2VpdmVkOiAwLFxuICAgICAgdG90YWxCcm9hZGNhc3RzOiAwLFxuICAgICAgYWN0aXZlU3Vic2NyaXB0aW9uczogMCxcbiAgICAgIGlkZW1wb3RlbmN5Q2FjaGVTaXplOiAwLFxuICAgICAgYXZlcmFnZUxhdGVuY3k6IDAsXG4gICAgICBtZXNzYWdlc0Ryb3BwZWRUVEw6IDAsXG4gICAgICBkdXBsaWNhdGVNZXNzYWdlc1JlamVjdGVkOiAwLFxuICAgIH07XG5cbiAgICAvLyBTdGFydCBpZGVtcG90ZW5jeSBjYWNoZSBjbGVhbnVwXG4gICAgdGhpcy5zdGFydElkZW1wb3RlbmN5Q2xlYW51cCgpO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDb3JlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBTZW5kIGEgbWVzc2FnZSB0byBhIHNwZWNpZmljIGFnZW50XG4gICAqL1xuICBhc3luYyBzZW5kKG1lc3NhZ2U6IE1DUE1lc3NhZ2UpOiBQcm9taXNlPE1DUFJlc3BvbnNlPiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAvLyBWYWxpZGF0ZSBtZXNzYWdlXG4gICAgY29uc3QgdmFsaWRhdGlvbkVycm9yID0gdGhpcy52YWxpZGF0ZU1lc3NhZ2UobWVzc2FnZSk7XG4gICAgaWYgKHZhbGlkYXRpb25FcnJvcikge1xuICAgICAgcmV0dXJuIHRoaXMuY3JlYXRlRXJyb3JSZXNwb25zZShtZXNzYWdlLmlkLCBtZXNzYWdlLmNvcnJlbGF0aW9uSWQsIHZhbGlkYXRpb25FcnJvciwgJ01lc3NhZ2UgdmFsaWRhdGlvbiBmYWlsZWQnKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZGVtcG90ZW5jeVxuICAgIGlmICh0aGlzLmNvbmZpZy5lbmFibGVJZGVtcG90ZW5jeSAmJiBtZXNzYWdlLmlkZW1wb3RlbnRLZXkpIHtcbiAgICAgIGNvbnN0IGNhY2hlZFJlc3BvbnNlID0gdGhpcy5jaGVja0lkZW1wb3RlbmN5KG1lc3NhZ2UuaWRlbXBvdGVudEtleSk7XG4gICAgICBpZiAoY2FjaGVkUmVzcG9uc2UpIHtcbiAgICAgICAgdGhpcy5sb2coYFtNQ1BCdXNdIER1cGxpY2F0ZSBtZXNzYWdlIGRldGVjdGVkLCByZXR1cm5pbmcgY2FjaGVkIHJlc3BvbnNlOiAke21lc3NhZ2UuaWRlbXBvdGVudEtleX1gKTtcbiAgICAgICAgdGhpcy5zdGF0cy5kdXBsaWNhdGVNZXNzYWdlc1JlamVjdGVkKys7XG4gICAgICAgIHJldHVybiBjYWNoZWRSZXNwb25zZTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gTWFyayBhcyBpbi1mbGlnaHQgdG8gcHJldmVudCBjb25jdXJyZW50IGR1cGxpY2F0ZXNcbiAgICAgIHRoaXMuaWRlbXBvdGVuY3lQZW5kaW5nLmFkZChtZXNzYWdlLmlkZW1wb3RlbnRLZXkpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIFRUTFxuICAgIGlmICh0aGlzLmlzRXhwaXJlZChtZXNzYWdlKSkge1xuICAgICAgdGhpcy5sb2coYFtNQ1BCdXNdIE1lc3NhZ2UgZXhwaXJlZDogJHttZXNzYWdlLmlkfWApO1xuICAgICAgdGhpcy5zdGF0cy5tZXNzYWdlc0Ryb3BwZWRUVEwrKztcbiAgICAgIGlmIChtZXNzYWdlLmlkZW1wb3RlbnRLZXkpIHtcbiAgICAgICAgdGhpcy5pZGVtcG90ZW5jeVBlbmRpbmcuZGVsZXRlKG1lc3NhZ2UuaWRlbXBvdGVudEtleSk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpcy5jcmVhdGVFcnJvclJlc3BvbnNlKG1lc3NhZ2UuaWQsIG1lc3NhZ2UuY29ycmVsYXRpb25JZCwgJ1RUTF9FWFBJUkVEJywgJ01lc3NhZ2UgVFRMIGV4cGlyZWQnKTtcbiAgICB9XG5cbiAgICAvLyBBZGQgdGltZXN0YW1wIGlmIG5vdCBwcmVzZW50XG4gICAgaWYgKCFtZXNzYWdlLnRpbWVzdGFtcCkge1xuICAgICAgbWVzc2FnZS50aW1lc3RhbXAgPSBub3coKTtcbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIHRyYWNlXG4gICAgaWYgKHRoaXMuY29uZmlnLmVuYWJsZVRyYWNpbmcgJiYgIW1lc3NhZ2UudHJhY2VJZCkge1xuICAgICAgbWVzc2FnZS50cmFjZUlkID0gZ2VuZXJhdGVUcmFjZUlkKCk7XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHRyYWNlXG4gICAgaWYgKG1lc3NhZ2UudHJhY2VJZCkge1xuICAgICAgdGhpcy51cGRhdGVUcmFjZShtZXNzYWdlLCBzdGFydFRpbWUpO1xuICAgIH1cblxuICAgIC8vIEZpbmQgc3Vic2NyaWJlcnNcbiAgICBjb25zdCBzdWJzY3JpYmVycyA9IHRoaXMuc3Vic2NyaXB0aW9ucy5nZXQobWVzc2FnZS50bykgfHwgdGhpcy5zdWJzY3JpcHRpb25zLmdldCgnKicpO1xuICAgIFxuICAgIGlmICghc3Vic2NyaWJlcnMgfHwgc3Vic2NyaWJlcnMuc2l6ZSA9PT0gMCkge1xuICAgICAgdGhpcy5sb2coYFtNQ1BCdXNdIE5vIHN1YnNjcmliZXJzIGZvcjogJHttZXNzYWdlLnRvfWApO1xuICAgICAgaWYgKG1lc3NhZ2UuaWRlbXBvdGVudEtleSkge1xuICAgICAgICB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5kZWxldGUobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzLmNyZWF0ZUVycm9yUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCAnUkVDSVBJRU5UX05PVF9GT1VORCcsIGBObyBzdWJzY3JpYmVycyBmb3VuZCBmb3IgYWdlbnQ6ICR7bWVzc2FnZS50b31gKTtcbiAgICB9XG5cbiAgICAvLyBEZWxpdmVyIG1lc3NhZ2VcbiAgICB0aGlzLnN0YXRzLnRvdGFsTWVzc2FnZXNTZW50Kys7XG4gICAgdGhpcy5zdGF0cy50b3RhbE1lc3NhZ2VzUmVjZWl2ZWQgKz0gc3Vic2NyaWJlcnMuc2l6ZTtcblxuICAgIGNvbnN0IHJlc3BvbnNlczogTUNQUmVzcG9uc2VbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2Ygc3Vic2NyaWJlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNhbGxiYWNrKG1lc3NhZ2UpO1xuICAgICAgICBpZiAobWVzc2FnZS5yZXF1aXJlc0Fjaykge1xuICAgICAgICAgIGNvbnN0IHJlc3BvbnNlID0gdGhpcy5jcmVhdGVTdWNjZXNzUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCBtZXNzYWdlLmZyb20pO1xuICAgICAgICAgIHJlc3BvbnNlcy5wdXNoKHJlc3BvbnNlKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBDYWNoZSByZXNwb25zZSBmb3IgaWRlbXBvdGVuY3lcbiAgICAgICAgICBpZiAodGhpcy5jb25maWcuZW5hYmxlSWRlbXBvdGVuY3kgJiYgbWVzc2FnZS5pZGVtcG90ZW50S2V5KSB7XG4gICAgICAgICAgICB0aGlzLmNhY2hlSWRlbXBvdGVuY3kobWVzc2FnZS5pZGVtcG90ZW50S2V5LCBtZXNzYWdlLmlkLCByZXNwb25zZSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICB0aGlzLmxvZyhgW01DUEJ1c10gRXJyb3IgZGVsaXZlcmluZyBtZXNzYWdlOiAke2Vycm9yfWApO1xuICAgICAgICByZXNwb25zZXMucHVzaCh0aGlzLmNyZWF0ZUVycm9yUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCAnREVMSVZFUllfRVJST1InLCBTdHJpbmcoZXJyb3IpKSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIHN0YXRzXG4gICAgdGhpcy51cGRhdGVTdGF0cyhzdGFydFRpbWUpO1xuXG4gICAgLy8gQ2xlYW4gdXAgaWRlbXBvdGVuY3kgcGVuZGluZyBmbGFnXG4gICAgaWYgKG1lc3NhZ2UuaWRlbXBvdGVudEtleSkge1xuICAgICAgdGhpcy5pZGVtcG90ZW5jeVBlbmRpbmcuZGVsZXRlKG1lc3NhZ2UuaWRlbXBvdGVudEtleSk7XG4gICAgfVxuXG4gICAgLy8gUmV0dXJuIGZpcnN0IHJlc3BvbnNlIG9yIHN1Y2Nlc3NcbiAgICByZXR1cm4gcmVzcG9uc2VzWzBdIHx8IHRoaXMuY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKG1lc3NhZ2UuaWQsIG1lc3NhZ2UuY29ycmVsYXRpb25JZCwgbWVzc2FnZS5mcm9tKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCcm9hZGNhc3QgYSBtZXNzYWdlIHRvIGFsbCBhZ2VudHNcbiAgICovXG4gIGFzeW5jIGJyb2FkY2FzdChtZXNzYWdlOiBNQ1BNZXNzYWdlKTogUHJvbWlzZTxNQ1BSZXNwb25zZVtdPiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gbm93KCk7XG5cbiAgICAvLyBWYWxpZGF0ZSBtZXNzYWdlXG4gICAgY29uc3QgdmFsaWRhdGlvbkVycm9yID0gdGhpcy52YWxpZGF0ZU1lc3NhZ2UobWVzc2FnZSk7XG4gICAgaWYgKHZhbGlkYXRpb25FcnJvcikge1xuICAgICAgaWYgKG1lc3NhZ2UuaWRlbXBvdGVudEtleSkgdGhpcy5pZGVtcG90ZW5jeVBlbmRpbmcuZGVsZXRlKG1lc3NhZ2UuaWRlbXBvdGVudEtleSk7XG4gICAgICByZXR1cm4gW3RoaXMuY3JlYXRlRXJyb3JSZXNwb25zZShtZXNzYWdlLmlkLCBtZXNzYWdlLmNvcnJlbGF0aW9uSWQsIHZhbGlkYXRpb25FcnJvciwgJ01lc3NhZ2UgdmFsaWRhdGlvbiBmYWlsZWQnKV07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWRlbXBvdGVuY3lcbiAgICBpZiAodGhpcy5jb25maWcuZW5hYmxlSWRlbXBvdGVuY3kgJiYgbWVzc2FnZS5pZGVtcG90ZW50S2V5KSB7XG4gICAgICBjb25zdCBjYWNoZWRSZXNwb25zZSA9IHRoaXMuY2hlY2tJZGVtcG90ZW5jeShtZXNzYWdlLmlkZW1wb3RlbnRLZXkpO1xuICAgICAgaWYgKGNhY2hlZFJlc3BvbnNlKSB7XG4gICAgICAgIHJldHVybiBbY2FjaGVkUmVzcG9uc2VdO1xuICAgICAgfVxuICAgICAgdGhpcy5pZGVtcG90ZW5jeVBlbmRpbmcuYWRkKG1lc3NhZ2UuaWRlbXBvdGVudEtleSk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgVFRMXG4gICAgaWYgKHRoaXMuaXNFeHBpcmVkKG1lc3NhZ2UpKSB7XG4gICAgICBpZiAobWVzc2FnZS5pZGVtcG90ZW50S2V5KSB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5kZWxldGUobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICAgIHJldHVybiBbdGhpcy5jcmVhdGVFcnJvclJlc3BvbnNlKG1lc3NhZ2UuaWQsIG1lc3NhZ2UuY29ycmVsYXRpb25JZCwgJ1RUTF9FWFBJUkVEJywgJ01lc3NhZ2UgVFRMIGV4cGlyZWQnKV07XG4gICAgfVxuXG4gICAgLy8gU2V0IHRvIGJyb2FkY2FzdFxuICAgIG1lc3NhZ2UudG8gPSAnKic7XG4gICAgdGhpcy5zdGF0cy50b3RhbEJyb2FkY2FzdHMrKztcblxuICAgIC8vIEdldCBhbGwgc3Vic2NyaWJlcnMgKHVzZSBhcnJheSB0byBhbGxvdyBzYW1lIGNhbGxiYWNrIGZvciBtdWx0aXBsZSBhZ2VudHMpXG4gICAgY29uc3QgYWxsU3Vic2NyaWJlcnM6IEZ1bmN0aW9uW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFthZ2VudElkLCBjYWxsYmFja3NdIG9mIHRoaXMuc3Vic2NyaXB0aW9ucy5lbnRyaWVzKCkpIHtcbiAgICAgIGlmIChhZ2VudElkICE9PSAnKicpIHtcbiAgICAgICAgY2FsbGJhY2tzLmZvckVhY2goY2IgPT4gYWxsU3Vic2NyaWJlcnMucHVzaChjYikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChhbGxTdWJzY3JpYmVycy5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMubG9nKCdbTUNQQnVzXSBObyBzdWJzY3JpYmVycyBmb3IgYnJvYWRjYXN0Jyk7XG4gICAgICBpZiAobWVzc2FnZS5pZGVtcG90ZW50S2V5KSB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5kZWxldGUobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG5cbiAgICAvLyBEZWxpdmVyIHRvIGFsbFxuICAgIGNvbnN0IHJlc3BvbnNlczogTUNQUmVzcG9uc2VbXSA9IFtdO1xuICAgIGxldCBoYXNFcnJvciA9IGZhbHNlO1xuICAgIGZvciAoY29uc3QgY2FsbGJhY2sgb2YgYWxsU3Vic2NyaWJlcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNhbGxiYWNrKG1lc3NhZ2UpO1xuICAgICAgICAvLyBCcm9hZGNhc3QgYWx3YXlzIHJldHVybnMgcmVzcG9uc2VzIChicm9hZGNhc3QgaW1wbGllcyBhY2tub3dsZWRnbWVudClcbiAgICAgICAgcmVzcG9uc2VzLnB1c2godGhpcy5jcmVhdGVTdWNjZXNzUmVzcG9uc2UobWVzc2FnZS5pZCwgbWVzc2FnZS5jb3JyZWxhdGlvbklkLCBtZXNzYWdlLmZyb20pKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGhhc0Vycm9yID0gdHJ1ZTtcbiAgICAgICAgcmVzcG9uc2VzLnB1c2godGhpcy5jcmVhdGVFcnJvclJlc3BvbnNlKG1lc3NhZ2UuaWQsIG1lc3NhZ2UuY29ycmVsYXRpb25JZCwgJ0RFTElWRVJZX0VSUk9SJywgU3RyaW5nKGVycm9yKSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENsZWFuIHVwIHBlbmRpbmcgb24gZXJyb3JcbiAgICBpZiAoaGFzRXJyb3IgJiYgbWVzc2FnZS5pZGVtcG90ZW50S2V5KSB7XG4gICAgICB0aGlzLmlkZW1wb3RlbmN5UGVuZGluZy5kZWxldGUobWVzc2FnZS5pZGVtcG90ZW50S2V5KTtcbiAgICB9XG5cbiAgICB0aGlzLnN0YXRzLnRvdGFsTWVzc2FnZXNTZW50Kys7XG4gICAgdGhpcy5zdGF0cy50b3RhbE1lc3NhZ2VzUmVjZWl2ZWQgKz0gYWxsU3Vic2NyaWJlcnMubGVuZ3RoO1xuICAgIHRoaXMudXBkYXRlU3RhdHMoc3RhcnRUaW1lKTtcblxuICAgIC8vIENhY2hlIHJlc3BvbnNlIGFuZCBjbGVhbiB1cCBwZW5kaW5nXG4gICAgaWYgKG1lc3NhZ2UuaWRlbXBvdGVudEtleSkge1xuICAgICAgdGhpcy5jYWNoZUlkZW1wb3RlbmN5KG1lc3NhZ2UuaWRlbXBvdGVudEtleSwgbWVzc2FnZS5pZCwgcmVzcG9uc2VzWzBdIHx8IHRoaXMuY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKG1lc3NhZ2UuaWQsIG1lc3NhZ2UuY29ycmVsYXRpb25JZCwgbWVzc2FnZS5mcm9tKSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3BvbnNlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgdG8gbWVzc2FnZXMgZm9yIGFuIGFnZW50XG4gICAqL1xuICBzdWJzY3JpYmUoYWdlbnRJZDogQWdlbnRJZCwgY2FsbGJhY2s6IChtc2c6IE1DUE1lc3NhZ2UpID0+IHZvaWQpOiBTdWJzY3JpcHRpb24ge1xuICAgIGlmICghdGhpcy5zdWJzY3JpcHRpb25zLmhhcyhhZ2VudElkKSkge1xuICAgICAgdGhpcy5zdWJzY3JpcHRpb25zLnNldChhZ2VudElkLCBuZXcgU2V0KCkpO1xuICAgIH1cblxuICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5nZXQoYWdlbnRJZCkhLmFkZChjYWxsYmFjayk7XG4gICAgdGhpcy5zdGF0cy5hY3RpdmVTdWJzY3JpcHRpb25zKys7XG5cbiAgICB0aGlzLmxvZyhgW01DUEJ1c10gQWdlbnQgc3Vic2NyaWJlZDogJHthZ2VudElkfWApO1xuXG4gICAgY29uc3Qgc3Vic2NyaXB0aW9uOiBTdWJzY3JpcHRpb24gPSB7XG4gICAgICBpZDogZ2VuZXJhdGVVVUlEKCksXG4gICAgICBhZ2VudElkLFxuICAgICAgaXNBY3RpdmU6IHRydWUsXG4gICAgICB1bnN1YnNjcmliZTogKCkgPT4ge1xuICAgICAgICBzdWJzY3JpcHRpb24uaXNBY3RpdmUgPSBmYWxzZTtcbiAgICAgICAgdGhpcy51bnN1YnNjcmliZShhZ2VudElkLCBjYWxsYmFjayk7XG4gICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4gc3Vic2NyaXB0aW9uO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHByaXZhdGUgdW5zdWJzY3JpYmUoYWdlbnRJZDogQWdlbnRJZCwgY2FsbGJhY2s6IChtc2c6IE1DUE1lc3NhZ2UpID0+IHZvaWQpOiB2b2lkIHtcbiAgICBjb25zdCBjYWxsYmFja3MgPSB0aGlzLnN1YnNjcmlwdGlvbnMuZ2V0KGFnZW50SWQpO1xuICAgIGlmIChjYWxsYmFja3MpIHtcbiAgICAgIGNhbGxiYWNrcy5kZWxldGUoY2FsbGJhY2spO1xuICAgICAgaWYgKGNhbGxiYWNrcy5zaXplID09PSAwKSB7XG4gICAgICAgIHRoaXMuc3Vic2NyaXB0aW9ucy5kZWxldGUoYWdlbnRJZCk7XG4gICAgICAgIHRoaXMuc3RhdHMuYWN0aXZlU3Vic2NyaXB0aW9ucy0tO1xuICAgICAgfVxuICAgICAgdGhpcy5sb2coYFtNQ1BCdXNdIEFnZW50IHVuc3Vic2NyaWJlZDogJHthZ2VudElkfWApO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgdmFsaWRhdGVNZXNzYWdlKG1lc3NhZ2U6IE1DUE1lc3NhZ2UpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBpZiAoIWlzTUNQTWVzc2FnZShtZXNzYWdlKSkge1xuICAgICAgcmV0dXJuICdJTlZBTElEX01FU1NBR0UnO1xuICAgIH1cblxuICAgIGlmIChtZXNzYWdlLnNjaGVtYVZlcnNpb24gIT09IFNDSEVNQV9WRVJTSU9OKSB7XG4gICAgICByZXR1cm4gJ1NDSEVNQV9NSVNNQVRDSCc7XG4gICAgfVxuXG4gICAgaWYgKG1lc3NhZ2UudHRsIDw9IDApIHtcbiAgICAgIHJldHVybiAnSU5WQUxJRF9UVEwnO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm1lc3NhZ2VRdWV1ZS5sZW5ndGggPj0gdGhpcy5jb25maWcubWF4UXVldWVTaXplKSB7XG4gICAgICByZXR1cm4gJ1FVRVVFX0ZVTEwnO1xuICAgIH1cblxuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcHJpdmF0ZSBpc0V4cGlyZWQobWVzc2FnZTogTUNQTWVzc2FnZSk6IGJvb2xlYW4ge1xuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG1lc3NhZ2UudGltZXN0YW1wIHx8IG5vdygpO1xuICAgIHJldHVybiBub3coKSAtIHRpbWVzdGFtcCA+IG1lc3NhZ2UudHRsO1xuICB9XG5cbiAgcHJpdmF0ZSBjaGVja0lkZW1wb3RlbmN5KGtleTogc3RyaW5nKTogTUNQUmVzcG9uc2UgfCBudWxsIHtcbiAgICBjb25zdCByZWNvcmQgPSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuZ2V0KGtleSk7XG4gICAgaWYgKCFyZWNvcmQpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGlmIChub3coKSA+IHJlY29yZC5leHBpcmVzQXQpIHtcbiAgICAgIHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5kZWxldGUoa2V5KTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiByZWNvcmQucmVzcG9uc2U7XG4gIH1cblxuICBwcml2YXRlIGNhY2hlSWRlbXBvdGVuY3koa2V5OiBzdHJpbmcsIG1lc3NhZ2VJZDogc3RyaW5nLCByZXNwb25zZTogTUNQUmVzcG9uc2UpOiB2b2lkIHtcbiAgICBjb25zdCByZWNvcmQ6IElkZW1wb3RlbmN5UmVjb3JkID0ge1xuICAgICAga2V5LFxuICAgICAgbWVzc2FnZUlkLFxuICAgICAgcmVzcG9uc2UsXG4gICAgICBjcmVhdGVkQXQ6IG5vdygpLFxuICAgICAgZXhwaXJlc0F0OiBub3coKSArIHRoaXMuY29uZmlnLmlkZW1wb3RlbmN5Q2FjaGVUVEwsXG4gICAgfTtcblxuICAgIHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5zZXQoa2V5LCByZWNvcmQpO1xuICAgIHRoaXMuaWRlbXBvdGVuY3lQZW5kaW5nLmRlbGV0ZShrZXkpO1xuICAgIHRoaXMuc3RhdHMuaWRlbXBvdGVuY3lDYWNoZVNpemUgPSB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuc2l6ZTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlVHJhY2UobWVzc2FnZTogTUNQTWVzc2FnZSwgc3RhcnRUaW1lOiBudW1iZXIpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubWVzc2FnZVRyYWNlcy5oYXMobWVzc2FnZS50cmFjZUlkISkpIHtcbiAgICAgIHRoaXMubWVzc2FnZVRyYWNlcy5zZXQobWVzc2FnZS50cmFjZUlkISwge1xuICAgICAgICB0cmFjZUlkOiBtZXNzYWdlLnRyYWNlSWQhLFxuICAgICAgICBtZXNzYWdlQ2hhaW46IFtdLFxuICAgICAgICB0b3RhbExhdGVuY3k6IDAsXG4gICAgICAgIGhvcENvdW50OiAwLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgY29uc3QgdHJhY2UgPSB0aGlzLm1lc3NhZ2VUcmFjZXMuZ2V0KG1lc3NhZ2UudHJhY2VJZCEpITtcbiAgICBjb25zdCBsYXRlbmN5ID0gbm93KCkgLSBzdGFydFRpbWU7XG5cbiAgICB0cmFjZS5tZXNzYWdlQ2hhaW4ucHVzaCh7XG4gICAgICBtZXNzYWdlSWQ6IG1lc3NhZ2UuaWQsXG4gICAgICBmcm9tOiBtZXNzYWdlLmZyb20sXG4gICAgICB0bzogbWVzc2FnZS50byxcbiAgICAgIHR5cGU6IG1lc3NhZ2UudHlwZSxcbiAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgICBsYXRlbmN5LFxuICAgIH0pO1xuXG4gICAgdHJhY2UudG90YWxMYXRlbmN5ICs9IGxhdGVuY3k7XG4gICAgdHJhY2UuaG9wQ291bnQrKztcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKG1lc3NhZ2VJZDogc3RyaW5nLCBjb3JyZWxhdGlvbklkOiBzdHJpbmcsIGZyb206IEFnZW50SWQpOiBNQ1BSZXNwb25zZSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIG1lc3NhZ2VJZCxcbiAgICAgIGNvcnJlbGF0aW9uSWQsXG4gICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcbiAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgICBmcm9tLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUVycm9yUmVzcG9uc2UobWVzc2FnZUlkOiBzdHJpbmcsIGNvcnJlbGF0aW9uSWQ6IHN0cmluZywgY29kZTogc3RyaW5nLCBlcnJvcjogc3RyaW5nKTogTUNQUmVzcG9uc2Uge1xuICAgIHJldHVybiB7XG4gICAgICBtZXNzYWdlSWQsXG4gICAgICBjb3JyZWxhdGlvbklkLFxuICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgZXJyb3I6IGAke2NvZGV9OiAke2Vycm9yfWAsXG4gICAgICB0aW1lc3RhbXA6IG5vdygpLFxuICAgICAgZnJvbTogJ3N5c3RlbScsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlU3RhdHMoc3RhcnRUaW1lOiBudW1iZXIpOiB2b2lkIHtcbiAgICBjb25zdCBsYXRlbmN5ID0gbm93KCkgLSBzdGFydFRpbWU7XG4gICAgdGhpcy5zdGF0cy5hdmVyYWdlTGF0ZW5jeSA9ICh0aGlzLnN0YXRzLmF2ZXJhZ2VMYXRlbmN5ICogKHRoaXMuc3RhdHMudG90YWxNZXNzYWdlc1NlbnQgLSAxKSArIGxhdGVuY3kpIC8gdGhpcy5zdGF0cy50b3RhbE1lc3NhZ2VzU2VudDtcbiAgfVxuXG4gIHByaXZhdGUgc3RhcnRJZGVtcG90ZW5jeUNsZWFudXAoKTogdm9pZCB7XG4gICAgc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgICAgY29uc3Qgbm93VGltZSA9IG5vdygpO1xuICAgICAgZm9yIChjb25zdCBba2V5LCByZWNvcmRdIG9mIHRoaXMuaWRlbXBvdGVuY3lDYWNoZS5lbnRyaWVzKCkpIHtcbiAgICAgICAgaWYgKG5vd1RpbWUgPiByZWNvcmQuZXhwaXJlc0F0KSB7XG4gICAgICAgICAgdGhpcy5pZGVtcG90ZW5jeUNhY2hlLmRlbGV0ZShrZXkpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aGlzLnN0YXRzLmlkZW1wb3RlbmN5Q2FjaGVTaXplID0gdGhpcy5pZGVtcG90ZW5jeUNhY2hlLnNpemU7XG4gICAgfSwgNjAwMDApOyAvLyBDbGVhbiB1cCBldmVyeSBtaW51dGVcbiAgfVxuXG4gIHByaXZhdGUgbG9nKG1lc3NhZ2U6IHN0cmluZyk6IHZvaWQge1xuICAgIGlmICh0aGlzLmNvbmZpZy5lbmFibGVMb2dnaW5nKSB7XG4gICAgICB0aGlzLmxvZ0J1ZmZlci5wdXNoKGBbJHtub3coKX1dICR7bWVzc2FnZX1gKTtcbiAgICAgIGlmICh0aGlzLmxvZ0J1ZmZlci5sZW5ndGggPiAxMDAwKSB7XG4gICAgICAgIHRoaXMubG9nQnVmZmVyLnNoaWZ0KCk7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyhtZXNzYWdlKTtcbiAgICB9XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFV0aWxpdHkgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqIEdldCBidXMgc3RhdGlzdGljcyAqL1xuICBnZXRTdGF0cygpOiBNQ1BCdXNTdGF0cyB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy5zdGF0cyB9O1xuICB9XG5cbiAgLyoqIEdldCBtZXNzYWdlIHRyYWNlICovXG4gIGdldFRyYWNlKHRyYWNlSWQ6IHN0cmluZyk6IE1lc3NhZ2VUcmFjZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLm1lc3NhZ2VUcmFjZXMuZ2V0KHRyYWNlSWQpIHx8IG51bGw7XG4gIH1cblxuICAvKiogR2V0IGxvZ3MgKi9cbiAgZ2V0TG9ncyhsaW1pdDogbnVtYmVyID0gMTAwKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLmxvZ0J1ZmZlci5zbGljZSgtbGltaXQpO1xuICB9XG5cbiAgLyoqIENsZWFyIGlkZW1wb3RlbmN5IGNhY2hlICovXG4gIGNsZWFySWRlbXBvdGVuY3lDYWNoZSgpOiB2b2lkIHtcbiAgICB0aGlzLmlkZW1wb3RlbmN5Q2FjaGUuY2xlYXIoKTtcbiAgICB0aGlzLnN0YXRzLmlkZW1wb3RlbmN5Q2FjaGVTaXplID0gMDtcbiAgfVxuXG4gIC8qKiBDcmVhdGUgYSBuZXcgbWVzc2FnZSBidWlsZGVyICovXG4gIHN0YXRpYyBjcmVhdGVNZXNzYWdlQnVpbGRlcigpOiBNZXNzYWdlQnVpbGRlciB7XG4gICAgcmV0dXJuIG5ldyBNZXNzYWdlQnVpbGRlcigpO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIE1lc3NhZ2UgQnVpbGRlclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIE1lc3NhZ2VCdWlsZGVyIC0gRmx1ZW50IGJ1aWxkZXIgZm9yIE1DUCBtZXNzYWdlc1xuICovXG5leHBvcnQgY2xhc3MgTWVzc2FnZUJ1aWxkZXIge1xuICBwcml2YXRlIG1lc3NhZ2U6IFBhcnRpYWw8TUNQTWVzc2FnZT4gPSB7XG4gICAgcHJvdG9jb2w6IFBST1RPQ09MX1ZFUlNJT04sXG4gICAgc2NoZW1hVmVyc2lvbjogU0NIRU1BX1ZFUlNJT04sXG4gICAgaWQ6IGdlbmVyYXRlVVVJRCgpLFxuICAgIGNvcnJlbGF0aW9uSWQ6IGdlbmVyYXRlVVVJRCgpLFxuICAgIHR0bDogREVGQVVMVF9DT05GSUcuZGVmYXVsdFRUTCxcbiAgICByZXF1aXJlc0FjazogdHJ1ZSxcbiAgfTtcblxuICBmcm9tKGFnZW50SWQ6IEFnZW50SWQpOiB0aGlzIHtcbiAgICB0aGlzLm1lc3NhZ2UuZnJvbSA9IGFnZW50SWQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB0byhhZ2VudElkOiBBZ2VudElkIHwgJyonKTogdGhpcyB7XG4gICAgdGhpcy5tZXNzYWdlLnRvID0gYWdlbnRJZDtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHR5cGUodHlwZTogTUNQTWVzc2FnZVsndHlwZSddKTogdGhpcyB7XG4gICAgdGhpcy5tZXNzYWdlLnR5cGUgPSB0eXBlO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgcGF5bG9hZChwYXlsb2FkOiBhbnkpOiB0aGlzIHtcbiAgICB0aGlzLm1lc3NhZ2UucGF5bG9hZCA9IHBheWxvYWQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICB0dGwodHRsOiBudW1iZXIpOiB0aGlzIHtcbiAgICB0aGlzLm1lc3NhZ2UudHRsID0gdHRsO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgaWRlbXBvdGVudEtleShrZXk6IHN0cmluZyk6IHRoaXMge1xuICAgIHRoaXMubWVzc2FnZS5pZGVtcG90ZW50S2V5ID0ga2V5O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgdHJhY2VJZCh0cmFjZUlkOiBzdHJpbmcpOiB0aGlzIHtcbiAgICB0aGlzLm1lc3NhZ2UudHJhY2VJZCA9IHRyYWNlSWQ7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICByZXF1aXJlc0FjayhhY2s6IGJvb2xlYW4pOiB0aGlzIHtcbiAgICB0aGlzLm1lc3NhZ2UucmVxdWlyZXNBY2sgPSBhY2s7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBidWlsZCgpOiBNQ1BNZXNzYWdlIHtcbiAgICBpZiAoIXRoaXMubWVzc2FnZS5mcm9tIHx8ICF0aGlzLm1lc3NhZ2UudG8gfHwgIXRoaXMubWVzc2FnZS50eXBlIHx8ICF0aGlzLm1lc3NhZ2UucGF5bG9hZCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogZnJvbSwgdG8sIHR5cGUsIHBheWxvYWQnKTtcbiAgICB9XG5cbiAgICAvLyBTZXQgdGltZXN0YW1wIGF0IGJ1aWxkIHRpbWUgZm9yIFRUTCB0byB3b3JrIGNvcnJlY3RseVxuICAgIGlmICghdGhpcy5tZXNzYWdlLnRpbWVzdGFtcCkge1xuICAgICAgdGhpcy5tZXNzYWdlLnRpbWVzdGFtcCA9IG5vdygpO1xuICAgIH1cblxuICAgIHJldHVybiB0aGlzLm1lc3NhZ2UgYXMgTUNQTWVzc2FnZTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeHBvcnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBkZWZhdWx0IE1DUEJ1cztcbiJdfQ==