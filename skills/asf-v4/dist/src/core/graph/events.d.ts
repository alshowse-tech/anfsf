/**
 * ASF V4.0 Graph Kernel - Change Event System
 *
 * Event emission and subscription for change tracking.
 * Version: v0.8.5
 */
import type { ChangeEvent, ChangeAction, ChangeTargetKind, ChangeDiff } from './types';
/**
 * Generate a unique event ID.
 * Uses crypto.randomUUID() if available, falls back to timestamp-based.
 */
export declare function generateEventId(): string;
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
export declare function createChangeEvent(params: {
    actorRoleId: string;
    action: ChangeAction;
    target: {
        kind: ChangeTargetKind;
        idOrPath: string;
    };
    ownershipRuleId: string;
    diff: ChangeDiff;
    riskScore?: number;
    metadata?: Record<string, any>;
}): ChangeEvent;
/**
 * Change event listener callback type.
 */
export type ChangeEventListener = (event: ChangeEvent) => void | Promise<void>;
/**
 * ChangeEventEmitter - Manages change event subscription and emission.
 *
 * This is the central hub for change event distribution.
 * All graph modifications should emit events through this class.
 */
export declare class ChangeEventEmitter {
    private listeners;
    private eventHistory;
    private maxHistorySize;
    constructor(maxHistorySize?: number);
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
    onAll(listener: ChangeEventListener): () => void;
    /**
     * Subscribe to events for a specific target.
     *
     * @param targetId - Target ID to filter by
     * @param listener - Callback function
     * @returns Unsubscribe function
     */
    onTarget(targetId: string, listener: ChangeEventListener): () => void;
    /**
     * Subscribe to events for a specific action type.
     *
     * @param action - Action type to filter by
     * @param listener - Callback function
     * @returns Unsubscribe function
     */
    onAction(action: ChangeAction, listener: ChangeEventListener): () => void;
    /**
     * Subscribe to events for a specific role.
     *
     * @param roleId - Role ID to filter by
     * @param listener - Callback function
     * @returns Unsubscribe function
     */
    onRole(roleId: string, listener: ChangeEventListener): () => void;
    /**
     * Internal subscription mechanism.
     */
    private subscribe;
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
    emit(event: ChangeEvent): Promise<void>;
    /**
     * Add event to history.
     */
    private addToHistory;
    /**
     * Get recent events from history.
     *
     * @param limit - Number of events to return
     * @param since - Optional timestamp filter
     * @returns Array of recent events
     */
    getRecentEvents(limit?: number, since?: number): ChangeEvent[];
    /**
     * Get events for a specific target.
     *
     * @param targetId - Target ID
     * @param limit - Number of events to return
     * @returns Array of events for the target
     */
    getEventsForTarget(targetId: string, limit?: number): ChangeEvent[];
    /**
     * Get events for a specific role.
     *
     * @param roleId - Role ID
     * @param limit - Number of events to return
     * @returns Array of events for the role
     */
    getEventsForRole(roleId: string, limit?: number): ChangeEvent[];
    /**
     * Clear event history.
     */
    clearHistory(): void;
    /**
     * Get number of events in history.
     */
    getHistorySize(): number;
    /**
     * Get listener counts by channel.
     */
    getListenerStats(): Map<string, number>;
}
export declare function getGlobalEmitter(): ChangeEventEmitter;
/**
 * Reset the global emitter (for testing).
 */
export declare function resetGlobalEmitter(): void;
/**
 * Convenience function to emit a change event.
 *
 * @param event - ChangeEvent to emit
 */
export declare function emitChangeEvent(event: ChangeEvent): Promise<void>;
/**
 * Middleware for wrapping graph write operations.
 *
 * Automatically emits change events for write operations.
 */
export declare function createChangeTrackingMiddleware(emitter: ChangeEventEmitter, getOwnershipRuleId: (targetId: string, actorRoleId: string) => string): (params: {
    actorRoleId: string;
    action: ChangeAction;
    targetId: string;
    targetKind: ChangeTargetKind;
    diff: ChangeDiff;
    riskScore?: number;
}) => Promise<ChangeEvent>;
