/**
 * ASF V4.0 Storage - Change Log
 *
 * Persistent storage for ChangeEvents.
 * Version: v0.8.5
 */
import type { ChangeEvent } from '../core/graph/types';
/**
 * Query options for change log retrieval.
 */
export interface ChangeLogQuery {
    /** Start timestamp (inclusive) */
    since?: number;
    /** End timestamp (inclusive) */
    until?: number;
    /** Filter by target ID */
    targetId?: string;
    /** Filter by actor role ID */
    actorRoleId?: string;
    /** Filter by action type */
    action?: 'create' | 'update' | 'delete' | 'approve' | 'reject';
    /** Filter by ownership rule ID */
    ownershipRuleId?: string;
    /** Maximum results to return */
    limit?: number;
    /** Sort order (default: 'desc' - newest first) */
    order?: 'asc' | 'desc';
}
/**
 * Change log storage interface.
 *
 * Implement this interface for different storage backends.
 */
export interface ChangeLogStore {
    /**
     * Append a change event to the log.
     */
    append(event: ChangeEvent): Promise<void>;
    /**
     * Append multiple change events.
     */
    appendBatch(events: ChangeEvent[]): Promise<void>;
    /**
     * Query change events.
     */
    query(options: ChangeLogQuery): Promise<ChangeEvent[]>;
    /**
     * Get a specific event by ID.
     */
    getById(eventId: string): Promise<ChangeEvent | null>;
    /**
     * Get events for a specific target.
     */
    getByTarget(targetId: string, limit?: number): Promise<ChangeEvent[]>;
    /**
     * Get events for a specific role.
     */
    getByRole(roleId: string, limit?: number): Promise<ChangeEvent[]>;
    /**
     * Get event count.
     */
    getCount(since?: number): Promise<number>;
    /**
     * Delete events older than a timestamp.
     */
    pruneBefore(timestamp: number): Promise<number>;
}
/**
 * In-memory change log store.
 *
 * Suitable for testing and development.
 * For production, use a persistent store (SQLite, PostgreSQL, etc.).
 */
export declare class InMemoryChangeLogStore implements ChangeLogStore {
    private events;
    private indexByTarget;
    private indexByRole;
    private indexByTime;
    constructor();
    append(event: ChangeEvent): Promise<void>;
    appendBatch(events: ChangeEvent[]): Promise<void>;
    query(options: ChangeLogQuery): Promise<ChangeEvent[]>;
    getById(eventId: string): Promise<ChangeEvent | null>;
    getByTarget(targetId: string, limit?: number): Promise<ChangeEvent[]>;
    getByRole(roleId: string, limit?: number): Promise<ChangeEvent[]>;
    getCount(since?: number): Promise<number>;
    pruneBefore(timestamp: number): Promise<number>;
    /**
     * Clear all events (for testing).
     */
    clear(): void;
    /**
     * Export all events (for backup/debugging).
     */
    export(): ChangeEvent[];
    /**
     * Import events (for restore/testing).
     */
    import(events: ChangeEvent[]): void;
}
/**
 * Create a change log store with automatic persistence.
 *
 * @param filePath - Path to JSON file for persistence
 * @returns ChangeLogStore with file-based persistence
 */
export declare function createFileBackedChangeLogStore(filePath: string): ChangeLogStore;
export declare function getDefaultChangeLogStore(): ChangeLogStore;
export declare function resetDefaultChangeLogStore(): void;
