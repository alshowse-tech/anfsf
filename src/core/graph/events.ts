/**
 * ASF V4.0 Graph Kernel - Change Event System
 * 
 * Event emission and subscription for change tracking.
 * Version: v0.8.5
 */

import type { ChangeEvent, ChangeAction, ChangeTargetKind, ChangeDiff } from './types';
import { CHANGE_EVENT_DEFAULTS } from './constants';

/**
 * Generate a unique event ID.
 * Uses crypto.randomUUID() if available, falls back to timestamp-based.
 */
export function generateEventId(): string {
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
export function createChangeEvent(params: {
  actorRoleId: string;
  action: ChangeAction;
  target: { kind: ChangeTargetKind; idOrPath: string };
  ownershipRuleId: string;
  diff: ChangeDiff;
  riskScore?: number;
  metadata?: Record<string, any>;
}): ChangeEvent {
  return {
    id: generateEventId(),
    ts: Date.now(),
    actorRoleId: params.actorRoleId,
    action: params.action,
    target: params.target,
    ownershipRuleId: params.ownershipRuleId,
    diff: params.diff,
    riskScore: params.riskScore ?? CHANGE_EVENT_DEFAULTS.RISK_SCORE,
    metadata: params.metadata,
  };
}

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
export class ChangeEventEmitter {
  private listeners: Map<string, Set<ChangeEventListener>>;
  private eventHistory: ChangeEvent[];
  private maxHistorySize: number;

  constructor(maxHistorySize: number = 10000) {
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
  onAll(listener: ChangeEventListener): () => void {
    return this.subscribe('*', listener);
  }

  /**
   * Subscribe to events for a specific target.
   * 
   * @param targetId - Target ID to filter by
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  onTarget(targetId: string, listener: ChangeEventListener): () => void {
    return this.subscribe(`target:${targetId}`, listener);
  }

  /**
   * Subscribe to events for a specific action type.
   * 
   * @param action - Action type to filter by
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  onAction(action: ChangeAction, listener: ChangeEventListener): () => void {
    return this.subscribe(`action:${action}`, listener);
  }

  /**
   * Subscribe to events for a specific role.
   * 
   * @param roleId - Role ID to filter by
   * @param listener - Callback function
   * @returns Unsubscribe function
   */
  onRole(roleId: string, listener: ChangeEventListener): () => void {
    return this.subscribe(`role:${roleId}`, listener);
  }

  /**
   * Internal subscription mechanism.
   */
  private subscribe(channel: string, listener: ChangeEventListener): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(listener);

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
  async emit(event: ChangeEvent): Promise<void> {
    // Add to history
    this.addToHistory(event);

    // Determine channels to notify
    const channels = new Set<string>();
    channels.add('*'); // All listeners
    channels.add(`target:${event.target.idOrPath}`);
    channels.add(`action:${event.action}`);
    channels.add(`role:${event.actorRoleId}`);

    // Notify all listeners
    const promises: Promise<void>[] = [];

    for (const channel of channels) {
      const listeners = this.listeners.get(channel);
      if (listeners) {
        for (const listener of listeners) {
          try {
            const result = listener(event);
            if (result instanceof Promise) {
              promises.push(result);
            }
          } catch (error) {
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
  private addToHistory(event: ChangeEvent): void {
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
  getRecentEvents(limit: number = 100, since?: number): ChangeEvent[] {
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
  getEventsForTarget(targetId: string, limit: number = 100): ChangeEvent[] {
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
  getEventsForRole(roleId: string, limit: number = 100): ChangeEvent[] {
    return this.eventHistory
      .filter((e) => e.actorRoleId === roleId)
      .slice(-limit);
  }

  /**
   * Clear event history.
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Get number of events in history.
   */
  getHistorySize(): number {
    return this.eventHistory.length;
  }

  /**
   * Get listener counts by channel.
   */
  getListenerStats(): Map<string, number> {
    const stats = new Map<string, number>();
    for (const [channel, listeners] of this.listeners.entries()) {
      stats.set(channel, listeners.size);
    }
    return stats;
  }
}

/**
 * Singleton emitter instance.
 * 
 * Use this for global event emission.
 */
let globalEmitter: ChangeEventEmitter | null = null;

export function getGlobalEmitter(): ChangeEventEmitter {
  if (!globalEmitter) {
    globalEmitter = new ChangeEventEmitter();
  }
  return globalEmitter;
}

/**
 * Reset the global emitter (for testing).
 */
export function resetGlobalEmitter(): void {
  globalEmitter = null;
}

/**
 * Convenience function to emit a change event.
 * 
 * @param event - ChangeEvent to emit
 */
export async function emitChangeEvent(event: ChangeEvent): Promise<void> {
  await getGlobalEmitter().emit(event);
}

/**
 * Middleware for wrapping graph write operations.
 * 
 * Automatically emits change events for write operations.
 */
export function createChangeTrackingMiddleware(
  emitter: ChangeEventEmitter,
  getOwnershipRuleId: (targetId: string, actorRoleId: string) => string
) {
  return async function trackChange(
    params: {
      actorRoleId: string;
      action: ChangeAction;
      targetId: string;
      targetKind: ChangeTargetKind;
      diff: ChangeDiff;
      riskScore?: number;
    }
  ): Promise<ChangeEvent> {
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
