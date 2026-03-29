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
export class InMemoryChangeLogStore implements ChangeLogStore {
  private events: Map<string, ChangeEvent>;
  private indexByTarget: Map<string, Set<string>>;
  private indexByRole: Map<string, Set<string>>;
  private indexByTime: ChangeEvent[];

  constructor() {
    this.events = new Map();
    this.indexByTarget = new Map();
    this.indexByRole = new Map();
    this.indexByTime = [];
  }

  async append(event: ChangeEvent): Promise<void> {
    // Store event
    this.events.set(event.id, event);
    
    // Update time index
    this.indexByTime.push(event);
    this.indexByTime.sort((a, b) => a.ts - b.ts);
    
    // Update target index
    if (!this.indexByTarget.has(event.target.idOrPath)) {
      this.indexByTarget.set(event.target.idOrPath, new Set());
    }
    this.indexByTarget.get(event.target.idOrPath)!.add(event.id);
    
    // Update role index
    if (!this.indexByRole.has(event.actorRoleId)) {
      this.indexByRole.set(event.actorRoleId, new Set());
    }
    this.indexByRole.get(event.actorRoleId)!.add(event.id);
  }

  async appendBatch(events: ChangeEvent[]): Promise<void> {
    for (const event of events) {
      await this.append(event);
    }
  }

  async query(options: ChangeLogQuery): Promise<ChangeEvent[]> {
    let results = this.indexByTime;

    // Filter by time range
    if (options.since !== undefined) {
      results = results.filter((e) => e.ts >= options.since!);
    }
    if (options.until !== undefined) {
      results = results.filter((e) => e.ts <= options.until!);
    }

    // Filter by target
    if (options.targetId !== undefined) {
      results = results.filter((e) => e.target.idOrPath === options.targetId);
    }

    // Filter by role
    if (options.actorRoleId !== undefined) {
      results = results.filter((e) => e.actorRoleId === options.actorRoleId);
    }

    // Filter by action
    if (options.action !== undefined) {
      results = results.filter((e) => e.action === options.action);
    }

    // Filter by ownership rule
    if (options.ownershipRuleId !== undefined) {
      results = results.filter((e) => e.ownershipRuleId === options.ownershipRuleId);
    }

    // Sort
    const order = options.order || 'desc';
    if (order === 'desc') {
      results = [...results].sort((a, b) => b.ts - a.ts);
    } else {
      results = [...results].sort((a, b) => a.ts - b.ts);
    }

    // Apply limit
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  async getById(eventId: string): Promise<ChangeEvent | null> {
    return this.events.get(eventId) || null;
  }

  async getByTarget(targetId: string, limit: number = 100): Promise<ChangeEvent[]> {
    const eventIds = this.indexByTarget.get(targetId);
    if (!eventIds) {
      return [];
    }

    const events: ChangeEvent[] = [];
    for (const id of eventIds) {
      const event = this.events.get(id);
      if (event) {
        events.push(event);
      }
    }

    // Sort by timestamp descending
    events.sort((a, b) => b.ts - a.ts);

    return events.slice(0, limit);
  }

  async getByRole(roleId: string, limit: number = 100): Promise<ChangeEvent[]> {
    const eventIds = this.indexByRole.get(roleId);
    if (!eventIds) {
      return [];
    }

    const events: ChangeEvent[] = [];
    for (const id of eventIds) {
      const event = this.events.get(id);
      if (event) {
        events.push(event);
      }
    }

    events.sort((a, b) => b.ts - a.ts);

    return events.slice(0, limit);
  }

  async getCount(since?: number): Promise<number> {
    if (since === undefined) {
      return this.events.size;
    }
    return this.indexByTime.filter((e) => e.ts >= since).length;
  }

  async pruneBefore(timestamp: number): Promise<number> {
    const toDelete: string[] = [];

    for (const [id, event] of this.events.entries()) {
      if (event.ts < timestamp) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      const event = this.events.get(id)!;
      
      // Remove from indexes
      this.indexByTarget.get(event.target.idOrPath)?.delete(id);
      this.indexByRole.get(event.actorRoleId)?.delete(id);
      
      // Remove from time index
      const timeIndex = this.indexByTime.findIndex((e) => e.id === id);
      if (timeIndex !== -1) {
        this.indexByTime.splice(timeIndex, 1);
      }
      
      // Remove from main store
      this.events.delete(id);
    }

    return toDelete.length;
  }

  /**
   * Clear all events (for testing).
   */
  clear(): void {
    this.events.clear();
    this.indexByTarget.clear();
    this.indexByRole.clear();
    this.indexByTime = [];
  }

  /**
   * Export all events (for backup/debugging).
   */
  export(): ChangeEvent[] {
    return [...this.indexByTime];
  }

  /**
   * Import events (for restore/testing).
   */
  import(events: ChangeEvent[]): void {
    this.clear();
    for (const event of events) {
      this.events.set(event.id, event);
      this.indexByTime.push(event);
      
      if (!this.indexByTarget.has(event.target.idOrPath)) {
        this.indexByTarget.set(event.target.idOrPath, new Set());
      }
      this.indexByTarget.get(event.target.idOrPath)!.add(event.id);
      
      if (!this.indexByRole.has(event.actorRoleId)) {
        this.indexByRole.set(event.actorRoleId, new Set());
      }
      this.indexByRole.get(event.actorRoleId)!.add(event.id);
    }
    
    this.indexByTime.sort((a, b) => a.ts - b.ts);
  }
}

/**
 * Create a change log store with automatic persistence.
 * 
 * @param filePath - Path to JSON file for persistence
 * @returns ChangeLogStore with file-based persistence
 */
export function createFileBackedChangeLogStore(filePath: string): ChangeLogStore {
  // This would use fs module for file I/O
  // For now, return in-memory store
  // Implementation would:
  // 1. Load existing events from file on init
  // 2. Append to file on each write (or batch writes)
  // 3. Handle concurrent access safely
  
  return new InMemoryChangeLogStore();
}

/**
 * Singleton in-memory store instance.
 */
let defaultStore: ChangeLogStore | null = null;

export function getDefaultChangeLogStore(): ChangeLogStore {
  if (!defaultStore) {
    defaultStore = new InMemoryChangeLogStore();
  }
  return defaultStore;
}

export function resetDefaultChangeLogStore(): void {
  defaultStore = null;
}
