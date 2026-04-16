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
    failureRate: number;
    previewFailures: number;
    queueLength: number;
    utilization: number;
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
export type SafeKnob = {
    type: 'roleCountDelta';
    delta: -1 | 0 | 1;
} | {
    type: 'budgetMultiplier';
    value: 0.8 | 1.0 | 1.2;
} | {
    type: 'assignmentSwap';
    taskA: string;
    taskB: string;
    couplingScore: number;
};
/**
 * Forbidden optimizations (never modify these online).
 */
export declare const FORBIDDEN_OPTIMIZATIONS: readonly ["authorities", "ownershipRules", "vetoRules", "capabilities"];
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
export declare class SafeOnlineOptimizer {
    private cooldownUntil;
    private lastConfig;
    private failureCount;
    private readonly cooldownMs;
    private readonly failureThreshold;
    constructor(options?: {
        cooldownMs?: number;
        failureThreshold?: number;
    });
    /**
     * Attempt safe optimization.
     */
    optimize(current: SynthResult, metrics: RuntimeMetrics, projectId: string): Promise<OptimizationResult>;
    /**
     * Select safe knob based on metrics.
     */
    private selectSafeKnob;
    /**
     * Apply knob to synthesis result.
     */
    private applyKnob;
    /**
     * Apply role count delta.
     */
    private applyRoleCountDelta;
    /**
     * Apply budget multiplier.
     */
    private applyBudgetMultiplier;
    /**
     * Apply assignment swap.
     */
    private applyAssignmentSwap;
    /**
     * Validate optimized result.
     */
    private validate;
    /**
     * Reset optimizer state.
     */
    reset(): void;
    /**
     * Get optimizer status.
     */
    getStatus(): {
        inCooldown: boolean;
        cooldownRemaining: number;
        failureCount: number;
        hasLastConfig: boolean;
    };
}
/**
 * Create safe optimizer with default settings.
 */
export declare function createSafeOptimizer(): SafeOnlineOptimizer;
