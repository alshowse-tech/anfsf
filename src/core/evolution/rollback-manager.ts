/**
 * ANFSF L17 — Rollback Manager
 *
 * Independent rollback management for evolution proposals.
 * Supports: version snapshots, granular rollback, state restoration,
 * rollback history, and safety validation before rollback.
 */

import type { EvolutionProposal } from './framework';

// ============================================================================
// Types
// ============================================================================

export type RollbackStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface VersionSnapshot {
  /** Unique version ID (timestamp-based) */
  version: string;
  /** Human-readable label */
  label: string;
  /** Snapshot timestamp */
  createdAt: number;
  /** Proposal that created this version */
  proposalId: string;
  /** State captured at this version */
  state: Record<string, unknown>;
  /** KPI values at this version */
  kpiSnapshot: Record<string, number>;
  /** Contract hashes at this version */
  contractHashes: string[];
  /** Metadata */
  metadata?: Record<string, unknown>;
}

export interface RollbackAction {
  /** Target to revert (e.g., contract, agent, config) */
  target: string;
  /** Current value to revert from */
  currentValue: unknown;
  /** Target value to revert to */
  targetValue: unknown;
}

export interface RollbackPlan {
  /** Rollback ID */
  id: string;
  /** Target version to rollback to */
  targetVersion: string;
  /** Current version */
  currentVersion: string;
  /** Actions to perform */
  actions: RollbackAction[];
  /** Estimated risk (0-1) */
  estimatedRisk: number;
  /** Estimated duration (ms) */
  estimatedDuration: number;
  /** Whether the rollback is safe to execute */
  safe: boolean;
}

export interface RollbackExecution {
  /** Rollback ID */
  id: string;
  /** Status */
  status: RollbackStatus;
  /** Started at */
  startedAt: number;
  /** Completed at */
  completedAt?: number;
  /** Actions executed */
  executedActions: number;
  /** Actions that failed */
  failedActions: RollbackAction[];
  /** Final state after rollback */
  finalVersion: string;
  /** Error message if failed */
  error?: string;
  /** KPI values after rollback */
  kpiSnapshot: Record<string, number>;
}

export interface RollbackConfig {
  /** Maximum rollback history entries */
  maxHistorySize: number;
  /** Dry-run before actual rollback */
  requireDryRun: boolean;
  /** Maximum acceptable risk for auto-rollback (0-1) */
  maxAutoRollbackRisk: number;
  /** Timeout for rollback execution (ms) */
  rollbackTimeoutMs: number;
}

const DEFAULT_CONFIG: RollbackConfig = {
  maxHistorySize: 50,
  requireDryRun: true,
  maxAutoRollbackRisk: 0.3,
  rollbackTimeoutMs: 30000,
};

// ============================================================================
// Rollback Manager
// ============================================================================

export class RollbackManager {
  private config: RollbackConfig;
  private snapshots: VersionSnapshot[] = [];
  private rollbackHistory: RollbackExecution[] = [];
  private currentVersion: string | null = null;

  constructor(config: Partial<RollbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ---------------------------------------------------------------------------
  // Snapshot Management
  // ---------------------------------------------------------------------------

  /**
   * Create a version snapshot before applying a proposal.
   */
  createSnapshot(proposal: EvolutionProposal, state: Record<string, unknown>, kpiSnapshot: Record<string, number>, contractHashes: string[]): VersionSnapshot {
    const snapshot: VersionSnapshot = {
      version: this.generateVersionId(),
      label: proposal.description.slice(0, 80),
      createdAt: Date.now(),
      proposalId: proposal.id,
      state: { ...state },
      kpiSnapshot: { ...kpiSnapshot },
      contractHashes: [...contractHashes],
      metadata: {
        riskScore: proposal.riskScore,
        budgetImpact: proposal.budgetImpact,
      },
    };

    this.snapshots.push(snapshot);
    this.currentVersion = snapshot.version;

    // Trim history
    if (this.snapshots.length > this.config.maxHistorySize) {
      this.snapshots = this.snapshots.slice(-this.config.maxHistorySize);
    }

    return snapshot;
  }

  /**
   * Get a snapshot by version ID.
   */
  getSnapshot(version: string): VersionSnapshot | null {
    return this.snapshots.find(s => s.version === version) ?? null;
  }

  /**
   * Get all snapshots.
   */
  getAllSnapshots(): VersionSnapshot[] {
    return [...this.snapshots];
  }

  /**
   * Get the current active version.
   */
  getCurrentVersion(): string | null {
    return this.currentVersion;
  }

  // ---------------------------------------------------------------------------
  // Rollback Planning
  // ---------------------------------------------------------------------------

  /**
   * Plan a rollback to a specific version (dry-run by default).
   */
  planRollback(targetVersion: string, currentState: Record<string, unknown>): RollbackPlan | null {
    const target = this.getSnapshot(targetVersion);
    if (!target) return null;

    if (!this.currentVersion) return null;

    // Find snapshots between current and target
    const currentIndex = this.snapshots.findIndex(s => s.version === this.currentVersion);
    const targetIndex = this.snapshots.findIndex(s => s.version === targetVersion);
    if (currentIndex < 0 || targetIndex < 0) return null;

    // Generate rollback actions by diffing state
    const actions: RollbackAction[] = [];
    const allKeys = new Set([...Object.keys(currentState), ...Object.keys(target.state)]);

    for (const key of allKeys) {
      const currentVal = currentState[key];
      const targetVal = target.state[key];

      if (JSON.stringify(currentVal) !== JSON.stringify(targetVal)) {
        actions.push({
          target: key,
          currentValue: currentVal,
          targetValue: targetVal,
        });
      }
    }

    // Estimate risk based on number of changes and time distance
    const stateChangeRatio = actions.length / Math.max(1, allKeys.size);
    const versionDistance = currentIndex - targetIndex;
    const estimatedRisk = Math.min(1, stateChangeRatio * 0.5 + versionDistance * 0.1);

    // Estimate duration
    const estimatedDuration = actions.length * 500 + 1000; // 500ms per action + 1s overhead

    // Safety check
    const safe = estimatedRisk <= this.config.maxAutoRollbackRisk &&
                 actions.every(a => a.targetValue !== undefined);

    return {
      id: `rollback-${Date.now()}`,
      targetVersion,
      currentVersion: this.currentVersion,
      actions,
      estimatedRisk,
      estimatedDuration,
      safe,
    };
  }

  /**
   * Execute a rollback plan.
   */
  async executeRollback(plan: RollbackPlan, applyFn: (action: RollbackAction) => Promise<void>): Promise<RollbackExecution> {
    const execution: RollbackExecution = {
      id: plan.id,
      status: 'in_progress',
      startedAt: Date.now(),
      executedActions: 0,
      failedActions: [],
      finalVersion: plan.currentVersion,
      kpiSnapshot: {},
    };

    // Apply each action
    for (const action of plan.actions) {
      try {
        await Promise.race([
          applyFn(action),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Rollback timeout')), this.config.rollbackTimeoutMs)
          ),
        ]);
        execution.executedActions++;
      } catch (error) {
        execution.failedActions.push(action);
        execution.status = 'failed';
        execution.error = `Failed to rollback ${action.target}: ${String(error)}`;
        break;
      }
    }

    // Update final state
    if (execution.failedActions.length === 0) {
      execution.status = 'completed';
      execution.finalVersion = plan.targetVersion;
      this.currentVersion = plan.targetVersion;

      // Update KPI snapshot
      const target = this.getSnapshot(plan.targetVersion);
      if (target) {
        execution.kpiSnapshot = { ...target.kpiSnapshot };
      }
    }

    execution.completedAt = Date.now();
    this.rollbackHistory.push(execution);

    return execution;
  }

  // ---------------------------------------------------------------------------
  // Auto-Rollback
  // ---------------------------------------------------------------------------

  /**
   * Automatically rollback if KPI violations trigger it.
   * Returns the rollback execution or null if no safe rollback is possible.
   */
  async autoRollback(
    violationCount: number,
    threshold: number,
    currentState: Record<string, unknown>,
    applyFn: (action: RollbackAction) => Promise<void>
  ): Promise<RollbackExecution | null> {
    if (violationCount < threshold) return null;

    // Find the last safe version (before violations started)
    const safeVersion = this.findLastSafeVersion();
    if (!safeVersion) return null;

    const plan = this.planRollback(safeVersion, currentState);
    if (!plan || !plan.safe) return null;

    return this.executeRollback(plan, applyFn);
  }

  /**
   * Find the last version before KPI violations started.
   */
  private findLastSafeVersion(): string | null {
    // Walk backwards through snapshots to find one with healthy KPIs
    for (let i = this.snapshots.length - 2; i >= 0; i--) {
      const snapshot = this.snapshots[i];
      const allHealthy = Object.entries(snapshot.kpiSnapshot).every(
        ([_, value]) => typeof value === 'number' && value >= 0.8
      );
      if (allHealthy) return snapshot.version;
    }
    // Fallback to oldest snapshot
    return this.snapshots.length > 0 ? this.snapshots[0].version : null;
  }

  // ---------------------------------------------------------------------------
  // History and Status
  // ---------------------------------------------------------------------------

  /**
   * Get rollback history.
   */
  getRollbackHistory(): RollbackExecution[] {
    return [...this.rollbackHistory];
  }

  /**
   * Get rollback summary.
   */
  getSummary(): {
    totalSnapshots: number;
    currentVersion: string | null;
    totalRollbacks: number;
    successfulRollbacks: number;
    failedRollbacks: number;
    lastRollbackAt: number | null;
  } {
    const successful = this.rollbackHistory.filter(r => r.status === 'completed').length;
    const failed = this.rollbackHistory.filter(r => r.status === 'failed').length;
    const last = this.rollbackHistory.length > 0
      ? this.rollbackHistory[this.rollbackHistory.length - 1].startedAt
      : null;

    return {
      totalSnapshots: this.snapshots.length,
      currentVersion: this.currentVersion,
      totalRollbacks: this.rollbackHistory.length,
      successfulRollbacks: successful,
      failedRollbacks: failed,
      lastRollbackAt: last,
    };
  }

  /**
   * Clear rollback history.
   */
  clearHistory(): void {
    this.snapshots = [];
    this.rollbackHistory = [];
    this.currentVersion = null;
  }

  private generateVersionId(): string {
    return `v${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Create a new RollbackManager instance.
 */
export function createRollbackManager(config?: Partial<RollbackConfig>): RollbackManager {
  return new RollbackManager(config);
}
