"use strict";
/**
 * ASF V4.0 Graph Kernel - Change Event System
 *
 * Event emission and subscription for change tracking.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangeEventEmitter = void 0;
exports.generateEventId = generateEventId;
exports.createChangeEvent = createChangeEvent;
exports.getGlobalEmitter = getGlobalEmitter;
exports.resetGlobalEmitter = resetGlobalEmitter;
exports.emitChangeEvent = emitChangeEvent;
exports.createChangeTrackingMiddleware = createChangeTrackingMiddleware;
const constants_1 = require("./constants");
/**
 * Generate a unique event ID.
 * Uses crypto.randomUUID() if available, falls back to timestamp-based.
 */
function generateEventId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    // Fallback: timestamp + random
    return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}
/**
 * Create a new ChangeEvent.
 *
 * @param params - Event parameters
 * @returns New ChangeEvent instance
 *
 * @example
 * ```typescript
 * const event = createChangeEvent({
 *   actorRoleId: 'backend-team',
 *   action: 'update',
 *   target: { kind: 'contract', idOrPath: 'api-gateway-v1' },
 *   ownershipRuleId: 'rule-001',
 *   diff: { modified: { version: { before: '1.0.0', after: '1.1.0' } } },
 *   riskScore: 65,
 * });
 * ```
 */
function createChangeEvent(params) {
    return {
        id: generateEventId(),
        ts: Date.now(),
        actorRoleId: params.actorRoleId,
        action: params.action,
        target: params.target,
        ownershipRuleId: params.ownershipRuleId,
        diff: params.diff,
        riskScore: params.riskScore ?? constants_1.CHANGE_EVENT_DEFAULTS.RISK_SCORE,
        metadata: params.metadata,
    };
}
/**
 * ChangeEventEmitter - Manages change event subscription and emission.
 *
 * This is the central hub for change event distribution.
 * All graph modifications should emit events through this class.
 */
class ChangeEventEmitter {
    constructor(maxHistorySize = 10000) {
        this.listeners = new Map();
        this.eventHistory = [];
        this.maxHistorySize = maxHistorySize;
    }
    /**
     * Subscribe to all change events.
     *
     * @param listener - Callback function
     * @returns Unsubscribe function
     *
     * @example
     * ```typescript
     * const unsubscribe = emitter.onAll((event) => {
     *   console.log(`Change: ${event.action} on ${event.target.idOrPath}`);
     * });
     *
     * // Later...
     * unsubscribe();
     * ```
     */
    onAll(listener) {
        return this.subscribe('*', listener);
    }
    /**
     * Subscribe to events for a specific target.
     *
     * @param targetId - Target ID to filter by
     * @param listener - Callback function
     * @returns Unsubscribe function
     */
    onTarget(targetId, listener) {
        return this.subscribe(`target:${targetId}`, listener);
    }
    /**
     * Subscribe to events for a specific action type.
     *
     * @param action - Action type to filter by
     * @param listener - Callback function
     * @returns Unsubscribe function
     */
    onAction(action, listener) {
        return this.subscribe(`action:${action}`, listener);
    }
    /**
     * Subscribe to events for a specific role.
     *
     * @param roleId - Role ID to filter by
     * @param listener - Callback function
     * @returns Unsubscribe function
     */
    onRole(roleId, listener) {
        return this.subscribe(`role:${roleId}`, listener);
    }
    /**
     * Internal subscription mechanism.
     */
    subscribe(channel, listener) {
        if (!this.listeners.has(channel)) {
            this.listeners.set(channel, new Set());
        }
        this.listeners.get(channel).add(listener);
        // Return unsubscribe function
        return () => {
            this.listeners.get(channel)?.delete(listener);
        };
    }
    /**
     * Emit a change event.
     *
     * @param event - ChangeEvent to emit
     * @returns Promise that resolves when all listeners have been notified
     *
     * @example
     * ```typescript
     * const event = createChangeEvent({...});
     * await emitter.emit(event);
     * ```
     */
    async emit(event) {
        // Add to history
        this.addToHistory(event);
        // Determine channels to notify
        const channels = new Set();
        channels.add('*'); // All listeners
        channels.add(`target:${event.target.idOrPath}`);
        channels.add(`action:${event.action}`);
        channels.add(`role:${event.actorRoleId}`);
        // Notify all listeners
        const promises = [];
        for (const channel of channels) {
            const listeners = this.listeners.get(channel);
            if (listeners) {
                for (const listener of listeners) {
                    try {
                        const result = listener(event);
                        if (result instanceof Promise) {
                            promises.push(result);
                        }
                    }
                    catch (error) {
                        console.error(`Error in change event listener:`, error);
                    }
                }
            }
        }
        await Promise.all(promises);
    }
    /**
     * Add event to history.
     */
    addToHistory(event) {
        this.eventHistory.push(event);
        // Trim history if needed
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
        }
    }
    /**
     * Get recent events from history.
     *
     * @param limit - Number of events to return
     * @param since - Optional timestamp filter
     * @returns Array of recent events
     */
    getRecentEvents(limit = 100, since) {
        let events = this.eventHistory;
        if (since !== undefined) {
            events = events.filter((e) => e.ts >= since);
        }
        return events.slice(-limit);
    }
    /**
     * Get events for a specific target.
     *
     * @param targetId - Target ID
     * @param limit - Number of events to return
     * @returns Array of events for the target
     */
    getEventsForTarget(targetId, limit = 100) {
        return this.eventHistory
            .filter((e) => e.target.idOrPath === targetId)
            .slice(-limit);
    }
    /**
     * Get events for a specific role.
     *
     * @param roleId - Role ID
     * @param limit - Number of events to return
     * @returns Array of events for the role
     */
    getEventsForRole(roleId, limit = 100) {
        return this.eventHistory
            .filter((e) => e.actorRoleId === roleId)
            .slice(-limit);
    }
    /**
     * Clear event history.
     */
    clearHistory() {
        this.eventHistory = [];
    }
    /**
     * Get number of events in history.
     */
    getHistorySize() {
        return this.eventHistory.length;
    }
    /**
     * Get listener counts by channel.
     */
    getListenerStats() {
        const stats = new Map();
        for (const [channel, listeners] of this.listeners.entries()) {
            stats.set(channel, listeners.size);
        }
        return stats;
    }
}
exports.ChangeEventEmitter = ChangeEventEmitter;
/**
 * Singleton emitter instance.
 *
 * Use this for global event emission.
 */
let globalEmitter = null;
function getGlobalEmitter() {
    if (!globalEmitter) {
        globalEmitter = new ChangeEventEmitter();
    }
    return globalEmitter;
}
/**
 * Reset the global emitter (for testing).
 */
function resetGlobalEmitter() {
    globalEmitter = null;
}
/**
 * Convenience function to emit a change event.
 *
 * @param event - ChangeEvent to emit
 */
async function emitChangeEvent(event) {
    await getGlobalEmitter().emit(event);
}
/**
 * Middleware for wrapping graph write operations.
 *
 * Automatically emits change events for write operations.
 */
function createChangeTrackingMiddleware(emitter, getOwnershipRuleId) {
    return async function trackChange(params) {
        const event = createChangeEvent({
            actorRoleId: params.actorRoleId,
            action: params.action,
            target: {
                kind: params.targetKind,
                idOrPath: params.targetId,
            },
            ownershipRuleId: getOwnershipRuleId(params.targetId, params.actorRoleId),
            diff: params.diff,
            riskScore: params.riskScore,
        });
        await emitter.emit(event);
        return event;
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnRzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvZ3JhcGgvZXZlbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBU0gsMENBT0M7QUFvQkQsOENBb0JDO0FBaU9ELDRDQUtDO0FBS0QsZ0RBRUM7QUFPRCwwQ0FFQztBQU9ELHdFQTZCQztBQS9VRCwyQ0FBb0Q7QUFFcEQ7OztHQUdHO0FBQ0gsU0FBZ0IsZUFBZTtJQUM3QixJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsSUFBSSxZQUFZLElBQUksTUFBTSxFQUFFLENBQUM7UUFDNUQsT0FBTyxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7SUFDN0IsQ0FBQztJQUVELCtCQUErQjtJQUMvQixPQUFPLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO0FBQzVFLENBQUM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FpQkc7QUFDSCxTQUFnQixpQkFBaUIsQ0FBQyxNQVFqQztJQUNDLE9BQU87UUFDTCxFQUFFLEVBQUUsZUFBZSxFQUFFO1FBQ3JCLEVBQUUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ2QsV0FBVyxFQUFFLE1BQU0sQ0FBQyxXQUFXO1FBQy9CLE1BQU0sRUFBRSxNQUFNLENBQUMsTUFBTTtRQUNyQixNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07UUFDckIsZUFBZSxFQUFFLE1BQU0sQ0FBQyxlQUFlO1FBQ3ZDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSTtRQUNqQixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVMsSUFBSSxpQ0FBcUIsQ0FBQyxVQUFVO1FBQy9ELFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTtLQUMxQixDQUFDO0FBQ0os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RztBQUNILFNBQWdCLGtCQUFrQjtJQUNoQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0FBQ3ZCLENBQUM7QUFFRDs7OztHQUlHO0FBQ0ksS0FBSyxVQUFVLGVBQWUsQ0FBQyxLQUFrQjtJQUN0RCxNQUFNLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBZ0IsOEJBQThCLENBQzVDLE9BQTJCLEVBQzNCLGtCQUFxRTtJQUVyRSxPQUFPLEtBQUssVUFBVSxXQUFXLENBQy9CLE1BT0M7UUFFRCxNQUFNLEtBQUssR0FBRyxpQkFBaUIsQ0FBQztZQUM5QixXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVc7WUFDL0IsTUFBTSxFQUFFLE1BQU0sQ0FBQyxNQUFNO1lBQ3JCLE1BQU0sRUFBRTtnQkFDTixJQUFJLEVBQUUsTUFBTSxDQUFDLFVBQVU7Z0JBQ3ZCLFFBQVEsRUFBRSxNQUFNLENBQUMsUUFBUTthQUMxQjtZQUNELGVBQWUsRUFBRSxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUM7WUFDeEUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJO1lBQ2pCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztTQUM1QixDQUFDLENBQUM7UUFFSCxNQUFNLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDMUIsT0FBTyxLQUFLLENBQUM7SUFDZixDQUFDLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBHcmFwaCBLZXJuZWwgLSBDaGFuZ2UgRXZlbnQgU3lzdGVtXG4gKiBcbiAqIEV2ZW50IGVtaXNzaW9uIGFuZCBzdWJzY3JpcHRpb24gZm9yIGNoYW5nZSB0cmFja2luZy5cbiAqIFZlcnNpb246IHYwLjguNVxuICovXG5cbmltcG9ydCB0eXBlIHsgQ2hhbmdlRXZlbnQsIENoYW5nZUFjdGlvbiwgQ2hhbmdlVGFyZ2V0S2luZCwgQ2hhbmdlRGlmZiB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgQ0hBTkdFX0VWRU5UX0RFRkFVTFRTIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG4vKipcbiAqIEdlbmVyYXRlIGEgdW5pcXVlIGV2ZW50IElELlxuICogVXNlcyBjcnlwdG8ucmFuZG9tVVVJRCgpIGlmIGF2YWlsYWJsZSwgZmFsbHMgYmFjayB0byB0aW1lc3RhbXAtYmFzZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUV2ZW50SWQoKTogc3RyaW5nIHtcbiAgaWYgKHR5cGVvZiBjcnlwdG8gIT09ICd1bmRlZmluZWQnICYmICdyYW5kb21VVUlEJyBpbiBjcnlwdG8pIHtcbiAgICByZXR1cm4gY3J5cHRvLnJhbmRvbVVVSUQoKTtcbiAgfVxuICBcbiAgLy8gRmFsbGJhY2s6IHRpbWVzdGFtcCArIHJhbmRvbVxuICByZXR1cm4gYGV2dF8ke0RhdGUubm93KCl9XyR7TWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc3Vic3RyaW5nKDIsIDExKX1gO1xufVxuXG4vKipcbiAqIENyZWF0ZSBhIG5ldyBDaGFuZ2VFdmVudC5cbiAqIFxuICogQHBhcmFtIHBhcmFtcyAtIEV2ZW50IHBhcmFtZXRlcnNcbiAqIEByZXR1cm5zIE5ldyBDaGFuZ2VFdmVudCBpbnN0YW5jZVxuICogXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZXZlbnQgPSBjcmVhdGVDaGFuZ2VFdmVudCh7XG4gKiAgIGFjdG9yUm9sZUlkOiAnYmFja2VuZC10ZWFtJyxcbiAqICAgYWN0aW9uOiAndXBkYXRlJyxcbiAqICAgdGFyZ2V0OiB7IGtpbmQ6ICdjb250cmFjdCcsIGlkT3JQYXRoOiAnYXBpLWdhdGV3YXktdjEnIH0sXG4gKiAgIG93bmVyc2hpcFJ1bGVJZDogJ3J1bGUtMDAxJyxcbiAqICAgZGlmZjogeyBtb2RpZmllZDogeyB2ZXJzaW9uOiB7IGJlZm9yZTogJzEuMC4wJywgYWZ0ZXI6ICcxLjEuMCcgfSB9IH0sXG4gKiAgIHJpc2tTY29yZTogNjUsXG4gKiB9KTtcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2hhbmdlRXZlbnQocGFyYW1zOiB7XG4gIGFjdG9yUm9sZUlkOiBzdHJpbmc7XG4gIGFjdGlvbjogQ2hhbmdlQWN0aW9uO1xuICB0YXJnZXQ6IHsga2luZDogQ2hhbmdlVGFyZ2V0S2luZDsgaWRPclBhdGg6IHN0cmluZyB9O1xuICBvd25lcnNoaXBSdWxlSWQ6IHN0cmluZztcbiAgZGlmZjogQ2hhbmdlRGlmZjtcbiAgcmlza1Njb3JlPzogbnVtYmVyO1xuICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT47XG59KTogQ2hhbmdlRXZlbnQge1xuICByZXR1cm4ge1xuICAgIGlkOiBnZW5lcmF0ZUV2ZW50SWQoKSxcbiAgICB0czogRGF0ZS5ub3coKSxcbiAgICBhY3RvclJvbGVJZDogcGFyYW1zLmFjdG9yUm9sZUlkLFxuICAgIGFjdGlvbjogcGFyYW1zLmFjdGlvbixcbiAgICB0YXJnZXQ6IHBhcmFtcy50YXJnZXQsXG4gICAgb3duZXJzaGlwUnVsZUlkOiBwYXJhbXMub3duZXJzaGlwUnVsZUlkLFxuICAgIGRpZmY6IHBhcmFtcy5kaWZmLFxuICAgIHJpc2tTY29yZTogcGFyYW1zLnJpc2tTY29yZSA/PyBDSEFOR0VfRVZFTlRfREVGQVVMVFMuUklTS19TQ09SRSxcbiAgICBtZXRhZGF0YTogcGFyYW1zLm1ldGFkYXRhLFxuICB9O1xufVxuXG4vKipcbiAqIENoYW5nZSBldmVudCBsaXN0ZW5lciBjYWxsYmFjayB0eXBlLlxuICovXG5leHBvcnQgdHlwZSBDaGFuZ2VFdmVudExpc3RlbmVyID0gKGV2ZW50OiBDaGFuZ2VFdmVudCkgPT4gdm9pZCB8IFByb21pc2U8dm9pZD47XG5cbi8qKlxuICogQ2hhbmdlRXZlbnRFbWl0dGVyIC0gTWFuYWdlcyBjaGFuZ2UgZXZlbnQgc3Vic2NyaXB0aW9uIGFuZCBlbWlzc2lvbi5cbiAqIFxuICogVGhpcyBpcyB0aGUgY2VudHJhbCBodWIgZm9yIGNoYW5nZSBldmVudCBkaXN0cmlidXRpb24uXG4gKiBBbGwgZ3JhcGggbW9kaWZpY2F0aW9ucyBzaG91bGQgZW1pdCBldmVudHMgdGhyb3VnaCB0aGlzIGNsYXNzLlxuICovXG5leHBvcnQgY2xhc3MgQ2hhbmdlRXZlbnRFbWl0dGVyIHtcbiAgcHJpdmF0ZSBsaXN0ZW5lcnM6IE1hcDxzdHJpbmcsIFNldDxDaGFuZ2VFdmVudExpc3RlbmVyPj47XG4gIHByaXZhdGUgZXZlbnRIaXN0b3J5OiBDaGFuZ2VFdmVudFtdO1xuICBwcml2YXRlIG1heEhpc3RvcnlTaXplOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IobWF4SGlzdG9yeVNpemU6IG51bWJlciA9IDEwMDAwKSB7XG4gICAgdGhpcy5saXN0ZW5lcnMgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5ldmVudEhpc3RvcnkgPSBbXTtcbiAgICB0aGlzLm1heEhpc3RvcnlTaXplID0gbWF4SGlzdG9yeVNpemU7XG4gIH1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIHRvIGFsbCBjaGFuZ2UgZXZlbnRzLlxuICAgKiBcbiAgICogQHBhcmFtIGxpc3RlbmVyIC0gQ2FsbGJhY2sgZnVuY3Rpb25cbiAgICogQHJldHVybnMgVW5zdWJzY3JpYmUgZnVuY3Rpb25cbiAgICogXG4gICAqIEBleGFtcGxlXG4gICAqIGBgYHR5cGVzY3JpcHRcbiAgICogY29uc3QgdW5zdWJzY3JpYmUgPSBlbWl0dGVyLm9uQWxsKChldmVudCkgPT4ge1xuICAgKiAgIGNvbnNvbGUubG9nKGBDaGFuZ2U6ICR7ZXZlbnQuYWN0aW9ufSBvbiAke2V2ZW50LnRhcmdldC5pZE9yUGF0aH1gKTtcbiAgICogfSk7XG4gICAqIFxuICAgKiAvLyBMYXRlci4uLlxuICAgKiB1bnN1YnNjcmliZSgpO1xuICAgKiBgYGBcbiAgICovXG4gIG9uQWxsKGxpc3RlbmVyOiBDaGFuZ2VFdmVudExpc3RlbmVyKTogKCkgPT4gdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuc3Vic2NyaWJlKCcqJywgbGlzdGVuZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSB0byBldmVudHMgZm9yIGEgc3BlY2lmaWMgdGFyZ2V0LlxuICAgKiBcbiAgICogQHBhcmFtIHRhcmdldElkIC0gVGFyZ2V0IElEIHRvIGZpbHRlciBieVxuICAgKiBAcGFyYW0gbGlzdGVuZXIgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgKiBAcmV0dXJucyBVbnN1YnNjcmliZSBmdW5jdGlvblxuICAgKi9cbiAgb25UYXJnZXQodGFyZ2V0SWQ6IHN0cmluZywgbGlzdGVuZXI6IENoYW5nZUV2ZW50TGlzdGVuZXIpOiAoKSA9PiB2b2lkIHtcbiAgICByZXR1cm4gdGhpcy5zdWJzY3JpYmUoYHRhcmdldDoke3RhcmdldElkfWAsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJzY3JpYmUgdG8gZXZlbnRzIGZvciBhIHNwZWNpZmljIGFjdGlvbiB0eXBlLlxuICAgKiBcbiAgICogQHBhcmFtIGFjdGlvbiAtIEFjdGlvbiB0eXBlIHRvIGZpbHRlciBieVxuICAgKiBAcGFyYW0gbGlzdGVuZXIgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgKiBAcmV0dXJucyBVbnN1YnNjcmliZSBmdW5jdGlvblxuICAgKi9cbiAgb25BY3Rpb24oYWN0aW9uOiBDaGFuZ2VBY3Rpb24sIGxpc3RlbmVyOiBDaGFuZ2VFdmVudExpc3RlbmVyKTogKCkgPT4gdm9pZCB7XG4gICAgcmV0dXJuIHRoaXMuc3Vic2NyaWJlKGBhY3Rpb246JHthY3Rpb259YCwgbGlzdGVuZXIpO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSB0byBldmVudHMgZm9yIGEgc3BlY2lmaWMgcm9sZS5cbiAgICogXG4gICAqIEBwYXJhbSByb2xlSWQgLSBSb2xlIElEIHRvIGZpbHRlciBieVxuICAgKiBAcGFyYW0gbGlzdGVuZXIgLSBDYWxsYmFjayBmdW5jdGlvblxuICAgKiBAcmV0dXJucyBVbnN1YnNjcmliZSBmdW5jdGlvblxuICAgKi9cbiAgb25Sb2xlKHJvbGVJZDogc3RyaW5nLCBsaXN0ZW5lcjogQ2hhbmdlRXZlbnRMaXN0ZW5lcik6ICgpID0+IHZvaWQge1xuICAgIHJldHVybiB0aGlzLnN1YnNjcmliZShgcm9sZToke3JvbGVJZH1gLCBsaXN0ZW5lcik7XG4gIH1cblxuICAvKipcbiAgICogSW50ZXJuYWwgc3Vic2NyaXB0aW9uIG1lY2hhbmlzbS5cbiAgICovXG4gIHByaXZhdGUgc3Vic2NyaWJlKGNoYW5uZWw6IHN0cmluZywgbGlzdGVuZXI6IENoYW5nZUV2ZW50TGlzdGVuZXIpOiAoKSA9PiB2b2lkIHtcbiAgICBpZiAoIXRoaXMubGlzdGVuZXJzLmhhcyhjaGFubmVsKSkge1xuICAgICAgdGhpcy5saXN0ZW5lcnMuc2V0KGNoYW5uZWwsIG5ldyBTZXQoKSk7XG4gICAgfVxuICAgIHRoaXMubGlzdGVuZXJzLmdldChjaGFubmVsKSEuYWRkKGxpc3RlbmVyKTtcblxuICAgIC8vIFJldHVybiB1bnN1YnNjcmliZSBmdW5jdGlvblxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB0aGlzLmxpc3RlbmVycy5nZXQoY2hhbm5lbCk/LmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFbWl0IGEgY2hhbmdlIGV2ZW50LlxuICAgKiBcbiAgICogQHBhcmFtIGV2ZW50IC0gQ2hhbmdlRXZlbnQgdG8gZW1pdFxuICAgKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiBhbGwgbGlzdGVuZXJzIGhhdmUgYmVlbiBub3RpZmllZFxuICAgKiBcbiAgICogQGV4YW1wbGVcbiAgICogYGBgdHlwZXNjcmlwdFxuICAgKiBjb25zdCBldmVudCA9IGNyZWF0ZUNoYW5nZUV2ZW50KHsuLi59KTtcbiAgICogYXdhaXQgZW1pdHRlci5lbWl0KGV2ZW50KTtcbiAgICogYGBgXG4gICAqL1xuICBhc3luYyBlbWl0KGV2ZW50OiBDaGFuZ2VFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIEFkZCB0byBoaXN0b3J5XG4gICAgdGhpcy5hZGRUb0hpc3RvcnkoZXZlbnQpO1xuXG4gICAgLy8gRGV0ZXJtaW5lIGNoYW5uZWxzIHRvIG5vdGlmeVxuICAgIGNvbnN0IGNoYW5uZWxzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY2hhbm5lbHMuYWRkKCcqJyk7IC8vIEFsbCBsaXN0ZW5lcnNcbiAgICBjaGFubmVscy5hZGQoYHRhcmdldDoke2V2ZW50LnRhcmdldC5pZE9yUGF0aH1gKTtcbiAgICBjaGFubmVscy5hZGQoYGFjdGlvbjoke2V2ZW50LmFjdGlvbn1gKTtcbiAgICBjaGFubmVscy5hZGQoYHJvbGU6JHtldmVudC5hY3RvclJvbGVJZH1gKTtcblxuICAgIC8vIE5vdGlmeSBhbGwgbGlzdGVuZXJzXG4gICAgY29uc3QgcHJvbWlzZXM6IFByb21pc2U8dm9pZD5bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCBjaGFubmVsIG9mIGNoYW5uZWxzKSB7XG4gICAgICBjb25zdCBsaXN0ZW5lcnMgPSB0aGlzLmxpc3RlbmVycy5nZXQoY2hhbm5lbCk7XG4gICAgICBpZiAobGlzdGVuZXJzKSB7XG4gICAgICAgIGZvciAoY29uc3QgbGlzdGVuZXIgb2YgbGlzdGVuZXJzKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGxpc3RlbmVyKGV2ZW50KTtcbiAgICAgICAgICAgIGlmIChyZXN1bHQgaW5zdGFuY2VvZiBQcm9taXNlKSB7XG4gICAgICAgICAgICAgIHByb21pc2VzLnB1c2gocmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgaW4gY2hhbmdlIGV2ZW50IGxpc3RlbmVyOmAsIGVycm9yKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGV2ZW50IHRvIGhpc3RvcnkuXG4gICAqL1xuICBwcml2YXRlIGFkZFRvSGlzdG9yeShldmVudDogQ2hhbmdlRXZlbnQpOiB2b2lkIHtcbiAgICB0aGlzLmV2ZW50SGlzdG9yeS5wdXNoKGV2ZW50KTtcblxuICAgIC8vIFRyaW0gaGlzdG9yeSBpZiBuZWVkZWRcbiAgICBpZiAodGhpcy5ldmVudEhpc3RvcnkubGVuZ3RoID4gdGhpcy5tYXhIaXN0b3J5U2l6ZSkge1xuICAgICAgdGhpcy5ldmVudEhpc3RvcnkgPSB0aGlzLmV2ZW50SGlzdG9yeS5zbGljZSgtdGhpcy5tYXhIaXN0b3J5U2l6ZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCByZWNlbnQgZXZlbnRzIGZyb20gaGlzdG9yeS5cbiAgICogXG4gICAqIEBwYXJhbSBsaW1pdCAtIE51bWJlciBvZiBldmVudHMgdG8gcmV0dXJuXG4gICAqIEBwYXJhbSBzaW5jZSAtIE9wdGlvbmFsIHRpbWVzdGFtcCBmaWx0ZXJcbiAgICogQHJldHVybnMgQXJyYXkgb2YgcmVjZW50IGV2ZW50c1xuICAgKi9cbiAgZ2V0UmVjZW50RXZlbnRzKGxpbWl0OiBudW1iZXIgPSAxMDAsIHNpbmNlPzogbnVtYmVyKTogQ2hhbmdlRXZlbnRbXSB7XG4gICAgbGV0IGV2ZW50cyA9IHRoaXMuZXZlbnRIaXN0b3J5O1xuXG4gICAgaWYgKHNpbmNlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGV2ZW50cyA9IGV2ZW50cy5maWx0ZXIoKGUpID0+IGUudHMgPj0gc2luY2UpO1xuICAgIH1cblxuICAgIHJldHVybiBldmVudHMuc2xpY2UoLWxpbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZXZlbnRzIGZvciBhIHNwZWNpZmljIHRhcmdldC5cbiAgICogXG4gICAqIEBwYXJhbSB0YXJnZXRJZCAtIFRhcmdldCBJRFxuICAgKiBAcGFyYW0gbGltaXQgLSBOdW1iZXIgb2YgZXZlbnRzIHRvIHJldHVyblxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBldmVudHMgZm9yIHRoZSB0YXJnZXRcbiAgICovXG4gIGdldEV2ZW50c0ZvclRhcmdldCh0YXJnZXRJZDogc3RyaW5nLCBsaW1pdDogbnVtYmVyID0gMTAwKTogQ2hhbmdlRXZlbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuZXZlbnRIaXN0b3J5XG4gICAgICAuZmlsdGVyKChlKSA9PiBlLnRhcmdldC5pZE9yUGF0aCA9PT0gdGFyZ2V0SWQpXG4gICAgICAuc2xpY2UoLWxpbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZXZlbnRzIGZvciBhIHNwZWNpZmljIHJvbGUuXG4gICAqIFxuICAgKiBAcGFyYW0gcm9sZUlkIC0gUm9sZSBJRFxuICAgKiBAcGFyYW0gbGltaXQgLSBOdW1iZXIgb2YgZXZlbnRzIHRvIHJldHVyblxuICAgKiBAcmV0dXJucyBBcnJheSBvZiBldmVudHMgZm9yIHRoZSByb2xlXG4gICAqL1xuICBnZXRFdmVudHNGb3JSb2xlKHJvbGVJZDogc3RyaW5nLCBsaW1pdDogbnVtYmVyID0gMTAwKTogQ2hhbmdlRXZlbnRbXSB7XG4gICAgcmV0dXJuIHRoaXMuZXZlbnRIaXN0b3J5XG4gICAgICAuZmlsdGVyKChlKSA9PiBlLmFjdG9yUm9sZUlkID09PSByb2xlSWQpXG4gICAgICAuc2xpY2UoLWxpbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhciBldmVudCBoaXN0b3J5LlxuICAgKi9cbiAgY2xlYXJIaXN0b3J5KCk6IHZvaWQge1xuICAgIHRoaXMuZXZlbnRIaXN0b3J5ID0gW107XG4gIH1cblxuICAvKipcbiAgICogR2V0IG51bWJlciBvZiBldmVudHMgaW4gaGlzdG9yeS5cbiAgICovXG4gIGdldEhpc3RvcnlTaXplKCk6IG51bWJlciB7XG4gICAgcmV0dXJuIHRoaXMuZXZlbnRIaXN0b3J5Lmxlbmd0aDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgbGlzdGVuZXIgY291bnRzIGJ5IGNoYW5uZWwuXG4gICAqL1xuICBnZXRMaXN0ZW5lclN0YXRzKCk6IE1hcDxzdHJpbmcsIG51bWJlcj4ge1xuICAgIGNvbnN0IHN0YXRzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcbiAgICBmb3IgKGNvbnN0IFtjaGFubmVsLCBsaXN0ZW5lcnNdIG9mIHRoaXMubGlzdGVuZXJzLmVudHJpZXMoKSkge1xuICAgICAgc3RhdHMuc2V0KGNoYW5uZWwsIGxpc3RlbmVycy5zaXplKTtcbiAgICB9XG4gICAgcmV0dXJuIHN0YXRzO1xuICB9XG59XG5cbi8qKlxuICogU2luZ2xldG9uIGVtaXR0ZXIgaW5zdGFuY2UuXG4gKiBcbiAqIFVzZSB0aGlzIGZvciBnbG9iYWwgZXZlbnQgZW1pc3Npb24uXG4gKi9cbmxldCBnbG9iYWxFbWl0dGVyOiBDaGFuZ2VFdmVudEVtaXR0ZXIgfCBudWxsID0gbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEdsb2JhbEVtaXR0ZXIoKTogQ2hhbmdlRXZlbnRFbWl0dGVyIHtcbiAgaWYgKCFnbG9iYWxFbWl0dGVyKSB7XG4gICAgZ2xvYmFsRW1pdHRlciA9IG5ldyBDaGFuZ2VFdmVudEVtaXR0ZXIoKTtcbiAgfVxuICByZXR1cm4gZ2xvYmFsRW1pdHRlcjtcbn1cblxuLyoqXG4gKiBSZXNldCB0aGUgZ2xvYmFsIGVtaXR0ZXIgKGZvciB0ZXN0aW5nKS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0R2xvYmFsRW1pdHRlcigpOiB2b2lkIHtcbiAgZ2xvYmFsRW1pdHRlciA9IG51bGw7XG59XG5cbi8qKlxuICogQ29udmVuaWVuY2UgZnVuY3Rpb24gdG8gZW1pdCBhIGNoYW5nZSBldmVudC5cbiAqIFxuICogQHBhcmFtIGV2ZW50IC0gQ2hhbmdlRXZlbnQgdG8gZW1pdFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZW1pdENoYW5nZUV2ZW50KGV2ZW50OiBDaGFuZ2VFdmVudCk6IFByb21pc2U8dm9pZD4ge1xuICBhd2FpdCBnZXRHbG9iYWxFbWl0dGVyKCkuZW1pdChldmVudCk7XG59XG5cbi8qKlxuICogTWlkZGxld2FyZSBmb3Igd3JhcHBpbmcgZ3JhcGggd3JpdGUgb3BlcmF0aW9ucy5cbiAqIFxuICogQXV0b21hdGljYWxseSBlbWl0cyBjaGFuZ2UgZXZlbnRzIGZvciB3cml0ZSBvcGVyYXRpb25zLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQ2hhbmdlVHJhY2tpbmdNaWRkbGV3YXJlKFxuICBlbWl0dGVyOiBDaGFuZ2VFdmVudEVtaXR0ZXIsXG4gIGdldE93bmVyc2hpcFJ1bGVJZDogKHRhcmdldElkOiBzdHJpbmcsIGFjdG9yUm9sZUlkOiBzdHJpbmcpID0+IHN0cmluZ1xuKSB7XG4gIHJldHVybiBhc3luYyBmdW5jdGlvbiB0cmFja0NoYW5nZShcbiAgICBwYXJhbXM6IHtcbiAgICAgIGFjdG9yUm9sZUlkOiBzdHJpbmc7XG4gICAgICBhY3Rpb246IENoYW5nZUFjdGlvbjtcbiAgICAgIHRhcmdldElkOiBzdHJpbmc7XG4gICAgICB0YXJnZXRLaW5kOiBDaGFuZ2VUYXJnZXRLaW5kO1xuICAgICAgZGlmZjogQ2hhbmdlRGlmZjtcbiAgICAgIHJpc2tTY29yZT86IG51bWJlcjtcbiAgICB9XG4gICk6IFByb21pc2U8Q2hhbmdlRXZlbnQ+IHtcbiAgICBjb25zdCBldmVudCA9IGNyZWF0ZUNoYW5nZUV2ZW50KHtcbiAgICAgIGFjdG9yUm9sZUlkOiBwYXJhbXMuYWN0b3JSb2xlSWQsXG4gICAgICBhY3Rpb246IHBhcmFtcy5hY3Rpb24sXG4gICAgICB0YXJnZXQ6IHtcbiAgICAgICAga2luZDogcGFyYW1zLnRhcmdldEtpbmQsXG4gICAgICAgIGlkT3JQYXRoOiBwYXJhbXMudGFyZ2V0SWQsXG4gICAgICB9LFxuICAgICAgb3duZXJzaGlwUnVsZUlkOiBnZXRPd25lcnNoaXBSdWxlSWQocGFyYW1zLnRhcmdldElkLCBwYXJhbXMuYWN0b3JSb2xlSWQpLFxuICAgICAgZGlmZjogcGFyYW1zLmRpZmYsXG4gICAgICByaXNrU2NvcmU6IHBhcmFtcy5yaXNrU2NvcmUsXG4gICAgfSk7XG5cbiAgICBhd2FpdCBlbWl0dGVyLmVtaXQoZXZlbnQpO1xuICAgIHJldHVybiBldmVudDtcbiAgfTtcbn1cbiJdfQ==