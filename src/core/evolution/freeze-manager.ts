/**
 * ANFSF V1.5.0 — Freeze Manager
 *
 * Manages code change freeze periods. During a freeze, all self-evolution
 * changes are blocked unless explicitly overridden by a human operator.
 * Supports scheduled freezes (e.g., release windows) and emergency freezes.
 */

export type FreezeType = 'scheduled' | 'emergency' | 'manual';

export interface Freeze {
  id: string;
  type: FreezeType;
  reason: string;
  startAt: number;
  endAt: number;
  createdBy: string;
  createdAt: number;
}

export interface FreezeStatus {
  isFrozen: boolean;
  currentFreeze: Freeze | null;
  upcomingFreezes: Freeze[];
}

export class FreezeManager {
  private freezes: Map<string, Freeze>;

  constructor() {
    this.freezes = new Map();
  }

  /**
   * Import freeze records for persistence restoration.
   */
  loadFreezes(freezes: Freeze[]): void {
    this.freezes = new Map(freezes.map(f => [f.id, f]));
  }

  /**
   * Export freeze records for persistence.
   */
  exportFreezes(): Freeze[] {
    return Array.from(this.freezes.values());
  }

  /**
   * Create a new freeze period.
   */
  createFreeze(options: {
    type: FreezeType;
    reason: string;
    startAt?: number;
    endAt?: number;
    durationMs?: number;
    createdBy: string;
  }): Freeze {
    const id = `freeze_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const startAt = options.startAt ?? now;
    const endAt = options.endAt ?? (options.durationMs ? startAt + options.durationMs : now + 72 * 60 * 60 * 1000);

    const freeze: Freeze = {
      id,
      type: options.type,
      reason: options.reason,
      startAt,
      endAt,
      createdBy: options.createdBy,
      createdAt: now,
    };
    this.freezes.set(id, freeze);
    return freeze;
  }

  /**
   * Cancel a freeze by ID.
   */
  cancelFreeze(id: string): boolean {
    return this.freezes.delete(id);
  }

  /**
   * Check if changes are currently frozen.
   */
  check(): FreezeStatus {
    const now = Date.now();
    const activeFreezes: Freeze[] = [];
    const upcomingFreezes: Freeze[] = [];

    for (const freeze of this.freezes.values()) {
      if (freeze.startAt <= now && freeze.endAt > now) {
        activeFreezes.push(freeze);
      } else if (freeze.startAt > now) {
        upcomingFreezes.push(freeze);
      }
    }

    // Sort upcoming by start time
    upcomingFreezes.sort((a, b) => a.startAt - b.startAt);

    return {
      isFrozen: activeFreezes.length > 0,
      currentFreeze: activeFreezes.length > 0 ? activeFreezes[0] : null,
      upcomingFreezes,
    };
  }

  /**
   * Check if a change is allowed (i.e., not frozen).
   */
  isAllowed(): { allowed: boolean; reason?: string } {
    const status = this.check();
    if (status.isFrozen && status.currentFreeze) {
      const remaining = status.currentFreeze.endAt - Date.now();
      const hours = Math.ceil(remaining / (1000 * 60 * 60));
      return {
        allowed: false,
        reason: `Changes frozen for ${hours}h: ${status.currentFreeze.reason}`,
      };
    }
    return { allowed: true };
  }

  /**
   * Remove expired freezes.
   */
  pruneExpired(): void {
    const now = Date.now();
    for (const [id, freeze] of this.freezes.entries()) {
      if (freeze.endAt < now && freeze.type !== 'emergency') {
        this.freezes.delete(id);
      }
    }
  }

  /** Remove all freeze records */
  clear(): void {
    this.freezes.clear();
  }
}

export function createFreezeManager(): FreezeManager {
  return new FreezeManager();
}
