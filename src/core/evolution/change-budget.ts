/**
 * ANFSF V1.5.0 — Change Budget
 *
 * Limits self-evolution changes to a configurable budget per time window.
 * Prevents runaway modification by enforcing max changes per week.
 */

export interface ChangeBudgetConfig {
  /** Maximum number of changes allowed in the window */
  maxChanges: number;
  /** Window duration in milliseconds (default: 7 days) */
  windowMs: number;
}

export interface ChangeRecord {
  timestamp: number;
  description: string;
  category: string;
}

export interface BudgetStatus {
  canChange: boolean;
  remaining: number;
  total: number;
  resetAt: number;
  changesThisWindow: ChangeRecord[];
}

const DEFAULT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_MAX_CHANGES = 3;

export class ChangeBudget {
  private maxChanges: number;
  private windowMs: number;
  private changes: ChangeRecord[];

  constructor(config: Partial<ChangeBudgetConfig> = {}) {
    this.maxChanges = config.maxChanges ?? DEFAULT_MAX_CHANGES;
    this.windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
    this.changes = [];
  }

  /**
   * Import historical changes (for persistence restoration).
   */
  loadChanges(changes: ChangeRecord[]): void {
    this.changes = [...changes];
  }

  /**
   * Export changes for persistence.
   */
  exportChanges(): ChangeRecord[] {
    return [...this.changes];
  }

  /**
   * Check if a change is allowed under the current budget.
   */
  check(): BudgetStatus {
    this.pruneExpired();
    const remaining = Math.max(0, this.maxChanges - this.changes.length);
    const resetAt = this.changes.length > 0
      ? this.changes[0].timestamp + this.windowMs
      : Date.now();

    return {
      canChange: remaining > 0,
      remaining,
      total: this.maxChanges,
      resetAt,
      changesThisWindow: [...this.changes],
    };
  }

  /**
   * Record a change. Returns true if allowed, false if budget exhausted.
   */
  recordChange(description: string, category: string): boolean {
    const status = this.check();
    if (!status.canChange) return false;

    this.changes.push({
      timestamp: Date.now(),
      description,
      category,
    });
    return true;
  }

  /**
   * Remove changes older than the current window.
   */
  private pruneExpired(): void {
    const cutoff = Date.now() - this.windowMs;
    this.changes = this.changes.filter(c => c.timestamp > cutoff);
  }

  /** Reset all budget data */
  reset(): void {
    this.changes = [];
  }
}

export function createChangeBudget(config: Partial<ChangeBudgetConfig> = {}): ChangeBudget {
  return new ChangeBudget(config);
}
