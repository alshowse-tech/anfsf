/**
 * ASF V4.0 Role Synthesizer - Safe Online Optimizer
 * 
 * Safe runtime optimization with knobs, rollback, and cooldown.
 * Version: v0.9.0
 */

import type { Role, Assignment } from '../types';

/**
 * Runtime metrics.
 */
export interface RuntimeMetrics {
  failureRate: number; // 0-1
  previewFailures: number;
  queueLength: number;
  utilization: number; // 0-1
  interfaceCost: number;
  budget: number;
}

/**
 * Synthesis result.
 */
export interface SynthResult {
  roles: Role[];
  assignment: Assignment;
  constraints: any;
}

/**
 * Safe optimization knob.
 */
export type SafeKnob =
  | { type: 'roleCountDelta'; delta: -1 | 0 | 1 }
  | { type: 'budgetMultiplier'; value: 0.8 | 1.0 | 1.2 }
  | { type: 'assignmentSwap'; taskA: string; taskB: string; couplingScore: number };

/**
 * Forbidden optimizations (never modify these online).
 */
export const FORBIDDEN_OPTIMIZATIONS = [
  'authorities',
  'ownershipRules',
  'vetoRules',
  'capabilities',
] as const;

export type ForbiddenOptimization = typeof FORBIDDEN_OPTIMIZATIONS[number];

/**
 * Optimization result.
 */
export interface OptimizationResult {
  optimized: SynthResult;
  knobApplied: SafeKnob;
  rolledBack: boolean;
  cooldownUntil?: number;
}

/**
 * Safe Online Optimizer.
 * 
 * Features:
 * - Cooldown periods between optimizations
 * - Automatic rollback on failures
 * - Limited knob set (no governance changes)
 */
export class SafeOnlineOptimizer {
  private cooldownUntil: number = 0;
  private lastConfig: SynthResult | null = null;
  private failureCount: number = 0;
  private readonly cooldownMs: number;
  private readonly failureThreshold: number;

  constructor(options?: {
    cooldownMs?: number;
    failureThreshold?: number;
  }) {
    this.cooldownMs = options?.cooldownMs ?? 1800000; // 30 minutes
    this.failureThreshold = options?.failureThreshold ?? 2;
  }

  /**
   * Attempt safe optimization.
   */
  async optimize(
    current: SynthResult,
    metrics: RuntimeMetrics,
    projectId: string
  ): Promise<OptimizationResult> {
    // 1. Cooldown check
    if (Date.now() < this.cooldownUntil) {
      return {
        optimized: current,
        knobApplied: { type: 'roleCountDelta', delta: 0 },
        rolledBack: false,
      };
    }

    // 2. Failure detection
    if (metrics.failureRate > 0.1 || metrics.previewFailures > 0) {
      this.failureCount++;

      if (this.failureCount >= this.failureThreshold && this.lastConfig) {
        // Rollback
        this.cooldownUntil = Date.now() + 3600000; // 1 hour cooldown
        this.failureCount = 0;

        return {
          optimized: this.lastConfig,
          knobApplied: { type: 'roleCountDelta', delta: 0 },
          rolledBack: true,
          cooldownUntil: this.cooldownUntil,
        };
      }
    } else {
      this.failureCount = 0;
    }

    // 3. Select safe knob
    const knob = this.selectSafeKnob(metrics);

    // 4. Apply adjustment
    const optimized = this.applyKnob(current, knob);

    // 5. Validate constraints
    if (this.validate(optimized, current)) {
      this.lastConfig = current;
      this.cooldownUntil = Date.now() + this.cooldownMs;

      return {
        optimized,
        knobApplied: knob,
        rolledBack: false,
        cooldownUntil: this.cooldownUntil,
      };
    }

    return {
      optimized: current,
      knobApplied: { type: 'roleCountDelta', delta: 0 },
      rolledBack: false,
    };
  }

  /**
   * Select safe knob based on metrics.
   */
  private selectSafeKnob(metrics: RuntimeMetrics): SafeKnob {
    // Queue too long → expand roles
    if (metrics.queueLength > 8) {
      return { type: 'roleCountDelta', delta: 1 };
    }

    // Low utilization → shrink roles
    if (metrics.utilization < 0.3) {
      return { type: 'roleCountDelta', delta: -1 };
    }

    // High interface cost → increase budget
    if (metrics.interfaceCost > metrics.budget * 0.8) {
      return { type: 'budgetMultiplier', value: 1.2 };
    }

    // No change needed
    return { type: 'roleCountDelta', delta: 0 };
  }

  /**
   * Apply knob to synthesis result.
   */
  private applyKnob(current: SynthResult, knob: SafeKnob): SynthResult {
    switch (knob.type) {
      case 'roleCountDelta':
        return this.applyRoleCountDelta(current, knob.delta);

      case 'budgetMultiplier':
        return this.applyBudgetMultiplier(current, knob.value);

      case 'assignmentSwap':
        return this.applyAssignmentSwap(current, knob);

      default:
        return current;
    }
  }

  /**
   * Apply role count delta.
   */
  private applyRoleCountDelta(
    current: SynthResult,
    delta: number
  ): SynthResult {
    if (delta === 0) return current;

    const newConstraints = {
      ...current.constraints,
      kMax: Math.max(1, current.constraints.kMax + delta),
    };

    return {
      ...current,
      constraints: newConstraints,
    };
  }

  /**
   * Apply budget multiplier.
   */
  private applyBudgetMultiplier(
    current: SynthResult,
    value: number
  ): SynthResult {
    const newConstraints = {
      ...current.constraints,
      budgetLimit: (current.constraints.budgetLimit ?? 100) * value,
    };

    return {
      ...current,
      constraints: newConstraints,
    };
  }

  /**
   * Apply assignment swap.
   */
  private applyAssignmentSwap(
    current: SynthResult,
    knob: { type: 'assignmentSwap'; taskA: string; taskB: string; couplingScore: number }
  ): SynthResult {
    const newAssignment = {
      ...current.assignment,
      taskToRole: {
        ...current.assignment.taskToRole,
        [knob.taskA]: current.assignment.taskToRole[knob.taskB],
        [knob.taskB]: current.assignment.taskToRole[knob.taskA],
      },
    };

    return {
      ...current,
      assignment: newAssignment,
    };
  }

  /**
   * Validate optimized result.
   */
  private validate(optimized: SynthResult, original: SynthResult): boolean {
    // Check role count is within bounds
    if (optimized.roles.length < 1 || optimized.roles.length > 20) {
      return false;
    }

    // Check all tasks are assigned
    const taskCount = Object.keys(original.assignment.taskToRole).length;
    const assignedTasks = Object.keys(optimized.assignment.taskToRole).length;
    if (assignedTasks !== taskCount) {
      return false;
    }

    // Check no forbidden changes
    if (
      JSON.stringify(optimized.roles.map((r) => r.authorities)) !==
      JSON.stringify(original.roles.map((r) => r.authorities))
    ) {
      return false;
    }

    return true;
  }

  /**
   * Reset optimizer state.
   */
  reset(): void {
    this.cooldownUntil = 0;
    this.lastConfig = null;
    this.failureCount = 0;
  }

  /**
   * Get optimizer status.
   */
  getStatus(): {
    inCooldown: boolean;
    cooldownRemaining: number;
    failureCount: number;
    hasLastConfig: boolean;
  } {
    const now = Date.now();
    return {
      inCooldown: now < this.cooldownUntil,
      cooldownRemaining: Math.max(0, this.cooldownUntil - now),
      failureCount: this.failureCount,
      hasLastConfig: this.lastConfig !== null,
    };
  }
}

/**
 * Create safe optimizer with default settings.
 */
export function createSafeOptimizer(): SafeOnlineOptimizer {
  return new SafeOnlineOptimizer();
}
