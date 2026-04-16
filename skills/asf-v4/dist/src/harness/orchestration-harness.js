"use strict";
/**
 * ANFSF V1.5.0 - Orchestration Harness
 *
 * Responsible for MCP Bus and Multi-Agent Orchestration.
 * Phase 1 of Layer 8.5 decomposition.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrchestrationHarness = void 0;
exports.getDefaultHarness = getDefaultHarness;
exports.resetDefaultHarness = resetDefaultHarness;
const mcp_bus_1 = require("../mcp/mcp-bus");
const DEFAULT_CONFIG = {
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
class OrchestrationHarness {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.mcpBus = new mcp_bus_1.MCPBus(this.config.mcpBusConfig);
        this.activeAgents = new Set();
        this.messageQueue = [];
    }
    /**
     * Get MCP Bus instance.
     */
    getBus() {
        return this.mcpBus;
    }
    /**
     * Register an agent for orchestration.
     */
    registerAgent(agentId) {
        this.activeAgents.add(agentId);
    }
    /**
     * Unregister an agent.
     */
    unregisterAgent(agentId) {
        this.activeAgents.delete(agentId);
    }
    /**
     * Get active agent count.
     */
    getActiveAgentCount() {
        return this.activeAgents.size;
    }
    /**
     * Check if agent is active.
     */
    isAgentActive(agentId) {
        return this.activeAgents.has(agentId);
    }
    /**
     * Send message to agent with idempotency check.
     */
    async sendMessage(from, to, type, payload, idempotentKey) {
        const message = new mcp_bus_1.MessageBuilder()
            .from(from)
            .to(to)
            .type(type)
            .payload(payload)
            .idempotentKey(idempotentKey || `${from}-${to}-${Date.now()}`)
            .requiresAck(true)
            .build();
        return this.mcpBus.send(message);
    }
    /**
     * Broadcast message to all active agents.
     */
    async broadcast(from, type, payload, idempotentKey) {
        const message = new mcp_bus_1.MessageBuilder()
            .from(from)
            .to('*')
            .type(type)
            .payload(payload)
            .idempotentKey(idempotentKey || `broadcast-${from}-${Date.now()}`)
            .requiresAck(true)
            .build();
        return this.mcpBus.broadcast(message);
    }
    /**
     * Get harness metrics.
     */
    getMetrics() {
        return {
            activeAgents: this.activeAgents.size,
            queuedMessages: this.messageQueue.length,
            busStats: this.mcpBus.getStats(),
        };
    }
    /**
     * Cleanup resources.
     */
    dispose() {
        this.activeAgents.clear();
        this.messageQueue = [];
    }
}
exports.OrchestrationHarness = OrchestrationHarness;
/**
 * Singleton harness instance.
 */
let defaultHarness = null;
function getDefaultHarness() {
    if (!defaultHarness) {
        defaultHarness = new OrchestrationHarness();
    }
    return defaultHarness;
}
function resetDefaultHarness() {
    defaultHarness = null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3JjaGVzdHJhdGlvbi1oYXJuZXNzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2hhcm5lc3Mvb3JjaGVzdHJhdGlvbi1oYXJuZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBcUpILDhDQUtDO0FBRUQsa0RBRUM7QUE1SkQsNENBQXdEO0FBVXhELE1BQU0sY0FBYyxHQUF3QjtJQUMxQyxZQUFZLEVBQUU7UUFDWixVQUFVLEVBQUUsS0FBSztRQUNqQixZQUFZLEVBQUUsSUFBSTtRQUNsQixhQUFhLEVBQUUsS0FBSztRQUNwQixpQkFBaUIsRUFBRSxJQUFJO1FBQ3ZCLG1CQUFtQixFQUFFLE1BQU07UUFDM0IsYUFBYSxFQUFFLElBQUk7S0FDcEI7SUFDRCxtQkFBbUIsRUFBRSxFQUFFO0lBQ3ZCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLGlCQUFpQixFQUFFLElBQUk7Q0FDeEIsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBYSxvQkFBb0I7SUFNL0IsWUFBWSxTQUF1QyxFQUFFO1FBQ25ELElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxnQkFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbkQsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU07UUFDSixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYSxDQUFDLE9BQWU7UUFDM0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZSxDQUFDLE9BQWU7UUFDN0IsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDcEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsbUJBQW1CO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUM7SUFDaEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYSxDQUFDLE9BQWU7UUFDM0IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsV0FBVyxDQUNmLElBQVksRUFDWixFQUFVLEVBQ1YsSUFBWSxFQUNaLE9BQVksRUFDWixhQUFzQjtRQUV0QixNQUFNLE9BQU8sR0FBRyxJQUFJLHdCQUFjLEVBQUU7YUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQzthQUNWLEVBQUUsQ0FBQyxFQUFFLENBQUM7YUFDTixJQUFJLENBQUMsSUFBVyxDQUFDO2FBQ2pCLE9BQU8sQ0FBQyxPQUFPLENBQUM7YUFDaEIsYUFBYSxDQUFDLGFBQWEsSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7YUFDN0QsV0FBVyxDQUFDLElBQUksQ0FBQzthQUNqQixLQUFLLEVBQUUsQ0FBQztRQUVYLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FDYixJQUFZLEVBQ1osSUFBWSxFQUNaLE9BQVksRUFDWixhQUFzQjtRQUV0QixNQUFNLE9BQU8sR0FBRyxJQUFJLHdCQUFjLEVBQUU7YUFDakMsSUFBSSxDQUFDLElBQUksQ0FBQzthQUNWLEVBQUUsQ0FBQyxHQUFHLENBQUM7YUFDUCxJQUFJLENBQUMsSUFBVyxDQUFDO2FBQ2pCLE9BQU8sQ0FBQyxPQUFPLENBQUM7YUFDaEIsYUFBYSxDQUFDLGFBQWEsSUFBSSxhQUFhLElBQUksSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQzthQUNqRSxXQUFXLENBQUMsSUFBSSxDQUFDO2FBQ2pCLEtBQUssRUFBRSxDQUFDO1FBRVgsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxVQUFVO1FBS1IsT0FBTztZQUNMLFlBQVksRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUk7WUFDcEMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTtZQUN4QyxRQUFRLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7U0FDakMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILE9BQU87UUFDTCxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQzFCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQWpIRCxvREFpSEM7QUFFRDs7R0FFRztBQUNILElBQUksY0FBYyxHQUFnQyxJQUFJLENBQUM7QUFFdkQsU0FBZ0IsaUJBQWlCO0lBQy9CLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNwQixjQUFjLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO0lBQzlDLENBQUM7SUFDRCxPQUFPLGNBQWMsQ0FBQztBQUN4QixDQUFDO0FBRUQsU0FBZ0IsbUJBQW1CO0lBQ2pDLGNBQWMsR0FBRyxJQUFJLENBQUM7QUFDeEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjEuNS4wIC0gT3JjaGVzdHJhdGlvbiBIYXJuZXNzXG4gKiBcbiAqIFJlc3BvbnNpYmxlIGZvciBNQ1AgQnVzIGFuZCBNdWx0aS1BZ2VudCBPcmNoZXN0cmF0aW9uLlxuICogUGhhc2UgMSBvZiBMYXllciA4LjUgZGVjb21wb3NpdGlvbi5cbiAqL1xuXG5pbXBvcnQgeyBNQ1BCdXMsIE1lc3NhZ2VCdWlsZGVyIH0gZnJvbSAnLi4vbWNwL21jcC1idXMnO1xuaW1wb3J0IHR5cGUgeyBNQ1BCdXNDb25maWcgfSBmcm9tICcuLi9tY3AvdHlwZXMnO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9yY2hlc3RyYXRpb25Db25maWcge1xuICBtY3BCdXNDb25maWc6IE1DUEJ1c0NvbmZpZztcbiAgbWF4Q29uY3VycmVudEFnZW50czogbnVtYmVyO1xuICBlbmFibGVUcmFjaW5nOiBib29sZWFuO1xuICBlbmFibGVJZGVtcG90ZW5jeTogYm9vbGVhbjtcbn1cblxuY29uc3QgREVGQVVMVF9DT05GSUc6IE9yY2hlc3RyYXRpb25Db25maWcgPSB7XG4gIG1jcEJ1c0NvbmZpZzoge1xuICAgIGRlZmF1bHRUVEw6IDMwMDAwLFxuICAgIG1heFF1ZXVlU2l6ZTogMTAwMCxcbiAgICBlbmFibGVMb2dnaW5nOiBmYWxzZSxcbiAgICBlbmFibGVJZGVtcG90ZW5jeTogdHJ1ZSxcbiAgICBpZGVtcG90ZW5jeUNhY2hlVFRMOiAzMDAwMDAsXG4gICAgZW5hYmxlVHJhY2luZzogdHJ1ZSxcbiAgfSxcbiAgbWF4Q29uY3VycmVudEFnZW50czogMTAsXG4gIGVuYWJsZVRyYWNpbmc6IHRydWUsXG4gIGVuYWJsZUlkZW1wb3RlbmN5OiB0cnVlLFxufTtcblxuLyoqXG4gKiBPcmNoZXN0cmF0aW9uIEhhcm5lc3MgLSBtYW5hZ2VzIE1DUCBCdXMgYW5kIGFnZW50IGNvb3JkaW5hdGlvbi5cbiAqL1xuZXhwb3J0IGNsYXNzIE9yY2hlc3RyYXRpb25IYXJuZXNzIHtcbiAgcHJpdmF0ZSBjb25maWc6IE9yY2hlc3RyYXRpb25Db25maWc7XG4gIHByaXZhdGUgbWNwQnVzOiBNQ1BCdXM7XG4gIHByaXZhdGUgYWN0aXZlQWdlbnRzOiBTZXQ8c3RyaW5nPjtcbiAgcHJpdmF0ZSBtZXNzYWdlUXVldWU6IEFycmF5PHsgbWVzc2FnZTogYW55OyB0aW1lc3RhbXA6IG51bWJlciB9PjtcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFBhcnRpYWw8T3JjaGVzdHJhdGlvbkNvbmZpZz4gPSB7fSkge1xuICAgIHRoaXMuY29uZmlnID0geyAuLi5ERUZBVUxUX0NPTkZJRywgLi4uY29uZmlnIH07XG4gICAgdGhpcy5tY3BCdXMgPSBuZXcgTUNQQnVzKHRoaXMuY29uZmlnLm1jcEJ1c0NvbmZpZyk7XG4gICAgdGhpcy5hY3RpdmVBZ2VudHMgPSBuZXcgU2V0KCk7XG4gICAgdGhpcy5tZXNzYWdlUXVldWUgPSBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgTUNQIEJ1cyBpbnN0YW5jZS5cbiAgICovXG4gIGdldEJ1cygpOiBNQ1BCdXMge1xuICAgIHJldHVybiB0aGlzLm1jcEJ1cztcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhbiBhZ2VudCBmb3Igb3JjaGVzdHJhdGlvbi5cbiAgICovXG4gIHJlZ2lzdGVyQWdlbnQoYWdlbnRJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5hY3RpdmVBZ2VudHMuYWRkKGFnZW50SWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFVucmVnaXN0ZXIgYW4gYWdlbnQuXG4gICAqL1xuICB1bnJlZ2lzdGVyQWdlbnQoYWdlbnRJZDogc3RyaW5nKTogdm9pZCB7XG4gICAgdGhpcy5hY3RpdmVBZ2VudHMuZGVsZXRlKGFnZW50SWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhY3RpdmUgYWdlbnQgY291bnQuXG4gICAqL1xuICBnZXRBY3RpdmVBZ2VudENvdW50KCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuYWN0aXZlQWdlbnRzLnNpemU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgYWdlbnQgaXMgYWN0aXZlLlxuICAgKi9cbiAgaXNBZ2VudEFjdGl2ZShhZ2VudElkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5hY3RpdmVBZ2VudHMuaGFzKGFnZW50SWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbmQgbWVzc2FnZSB0byBhZ2VudCB3aXRoIGlkZW1wb3RlbmN5IGNoZWNrLlxuICAgKi9cbiAgYXN5bmMgc2VuZE1lc3NhZ2UoXG4gICAgZnJvbTogc3RyaW5nLFxuICAgIHRvOiBzdHJpbmcsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIHBheWxvYWQ6IGFueSxcbiAgICBpZGVtcG90ZW50S2V5Pzogc3RyaW5nXG4gICk6IFByb21pc2U8YW55PiB7XG4gICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlQnVpbGRlcigpXG4gICAgICAuZnJvbShmcm9tKVxuICAgICAgLnRvKHRvKVxuICAgICAgLnR5cGUodHlwZSBhcyBhbnkpXG4gICAgICAucGF5bG9hZChwYXlsb2FkKVxuICAgICAgLmlkZW1wb3RlbnRLZXkoaWRlbXBvdGVudEtleSB8fCBgJHtmcm9tfS0ke3RvfS0ke0RhdGUubm93KCl9YClcbiAgICAgIC5yZXF1aXJlc0Fjayh0cnVlKVxuICAgICAgLmJ1aWxkKCk7XG5cbiAgICByZXR1cm4gdGhpcy5tY3BCdXMuc2VuZChtZXNzYWdlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBCcm9hZGNhc3QgbWVzc2FnZSB0byBhbGwgYWN0aXZlIGFnZW50cy5cbiAgICovXG4gIGFzeW5jIGJyb2FkY2FzdChcbiAgICBmcm9tOiBzdHJpbmcsXG4gICAgdHlwZTogc3RyaW5nLFxuICAgIHBheWxvYWQ6IGFueSxcbiAgICBpZGVtcG90ZW50S2V5Pzogc3RyaW5nXG4gICk6IFByb21pc2U8YW55W10+IHtcbiAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2VCdWlsZGVyKClcbiAgICAgIC5mcm9tKGZyb20pXG4gICAgICAudG8oJyonKVxuICAgICAgLnR5cGUodHlwZSBhcyBhbnkpXG4gICAgICAucGF5bG9hZChwYXlsb2FkKVxuICAgICAgLmlkZW1wb3RlbnRLZXkoaWRlbXBvdGVudEtleSB8fCBgYnJvYWRjYXN0LSR7ZnJvbX0tJHtEYXRlLm5vdygpfWApXG4gICAgICAucmVxdWlyZXNBY2sodHJ1ZSlcbiAgICAgIC5idWlsZCgpO1xuXG4gICAgcmV0dXJuIHRoaXMubWNwQnVzLmJyb2FkY2FzdChtZXNzYWdlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgaGFybmVzcyBtZXRyaWNzLlxuICAgKi9cbiAgZ2V0TWV0cmljcygpOiB7XG4gICAgYWN0aXZlQWdlbnRzOiBudW1iZXI7XG4gICAgcXVldWVkTWVzc2FnZXM6IG51bWJlcjtcbiAgICBidXNTdGF0czogYW55O1xuICB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgYWN0aXZlQWdlbnRzOiB0aGlzLmFjdGl2ZUFnZW50cy5zaXplLFxuICAgICAgcXVldWVkTWVzc2FnZXM6IHRoaXMubWVzc2FnZVF1ZXVlLmxlbmd0aCxcbiAgICAgIGJ1c1N0YXRzOiB0aGlzLm1jcEJ1cy5nZXRTdGF0cygpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2xlYW51cCByZXNvdXJjZXMuXG4gICAqL1xuICBkaXNwb3NlKCk6IHZvaWQge1xuICAgIHRoaXMuYWN0aXZlQWdlbnRzLmNsZWFyKCk7XG4gICAgdGhpcy5tZXNzYWdlUXVldWUgPSBbXTtcbiAgfVxufVxuXG4vKipcbiAqIFNpbmdsZXRvbiBoYXJuZXNzIGluc3RhbmNlLlxuICovXG5sZXQgZGVmYXVsdEhhcm5lc3M6IE9yY2hlc3RyYXRpb25IYXJuZXNzIHwgbnVsbCA9IG51bGw7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXREZWZhdWx0SGFybmVzcygpOiBPcmNoZXN0cmF0aW9uSGFybmVzcyB7XG4gIGlmICghZGVmYXVsdEhhcm5lc3MpIHtcbiAgICBkZWZhdWx0SGFybmVzcyA9IG5ldyBPcmNoZXN0cmF0aW9uSGFybmVzcygpO1xuICB9XG4gIHJldHVybiBkZWZhdWx0SGFybmVzcztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0RGVmYXVsdEhhcm5lc3MoKTogdm9pZCB7XG4gIGRlZmF1bHRIYXJuZXNzID0gbnVsbDtcbn1cbiJdfQ==