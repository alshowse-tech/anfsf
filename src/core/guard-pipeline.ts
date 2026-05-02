/**
 * ANFSF — Guard Pipeline
 *
 * Shared abstraction for "check → score → veto" across L3/L10/L13/L17.
 *
 * Each layer runs its own checks with different inputs and thresholds,
 * but the decision logic is the same:
 *   1. Run one or more check functions (in parallel)
 *   2. Combine sub-scores into an overall score
 *   3. Compare against threshold
 *   4. Apply veto rules (critical violations always block)
 *   5. Return pass/fail with score, violations, and optional alert
 */

// ============================================================================
// Types
// ============================================================================

export type Severity = 'critical' | 'major' | 'minor';

/** Result from a single check function. */
export interface CheckResult {
  /** Sub-check score, 0–1 */
  score: number;
  /** Whether this sub-check passed on its own */
  passed: boolean;
  /** Violations found by this check */
  violations: Violation[];
}

export interface Violation {
  severity: Severity;
  message: string;
}

/** Configuration for a single check within the pipeline. */
export interface CheckConfig {
  /** Unique name for this check */
  name: string;
  /** Weight in the overall score (used with scoreMode='weighted') */
  weight: number;
  /** The check function */
  fn: () => CheckResult | Promise<CheckResult>;
}

export type ScoreMode = 'weighted' | 'min' | 'average';

export interface GuardPipelineConfig {
  /** Check functions to run */
  checks: CheckConfig[];
  /** How to combine sub-scores: weighted sum, minimum, or average */
  scoreMode?: ScoreMode;
  /** Pipeline passes when overallScore >= this value */
  threshold: number;
  /** Critical violations always cause failure regardless of score */
  vetoOnCritical?: boolean;
  /** Custom veto predicate — if it returns true, pipeline fails */
  customVeto?: (results: CheckResult[]) => string | null;
  /** Score below this triggers an alert (informational, does not block) */
  alertThreshold?: number;
}

/** Final pipeline result. */
export interface GuardPipelineResult {
  /** Whether the pipeline passed all checks */
  passed: boolean;
  /** Combined score, 0–1 */
  score: number;
  /** All violations across all checks */
  violations: Violation[];
  /** Per-check detail */
  details: Record<string, CheckResult>;
  /** Veto reason if blocked by veto */
  vetoReason?: string;
  /** Alert message if score is low but not vetoed */
  alert?: string;
}

// ============================================================================
// Severity → penalty mapping
// ============================================================================

const SEVERITY_PENALTY: Record<Severity, number> = {
  critical: 0.30,
  major: 0.15,
  minor: 0.05,
};

// ============================================================================
// Guard Pipeline
// ============================================================================

export class GuardPipeline {
  private checks: CheckConfig[];
  private scoreMode: ScoreMode;
  private threshold: number;
  private vetoOnCritical: boolean;
  private customVeto?: (results: CheckResult[]) => string | null;
  private alertThreshold?: number;

  constructor(config: GuardPipelineConfig) {
    this.checks = config.checks;
    this.scoreMode = config.scoreMode ?? 'weighted';
    this.threshold = config.threshold;
    this.vetoOnCritical = config.vetoOnCritical ?? true;
    this.customVeto = config.customVeto;
    this.alertThreshold = config.alertThreshold;
  }

  /**
   * Run all checks, compute score, and decide pass/fail.
   */
  async execute(): Promise<GuardPipelineResult> {
    // 1. Run checks in parallel
    const results = await Promise.all(
      this.checks.map(async (c) => ({ name: c.name, result: await c.fn() }))
    );

    const details: Record<string, CheckResult> = {};
    const allViolations: Violation[] = [];
    const checkResults: CheckResult[] = [];

    for (const { name, result } of results) {
      details[name] = result;
      checkResults.push(result);
      allViolations.push(...result.violations);
    }

    // 2. Compute overall score
    const score = this.computeScore(results.map((r) => ({
      score: r.result.score,
      weight: this.checks.find((c) => c.name === r.name)!.weight,
    })));

    // 3. Apply veto rules
    const vetoReason = this.evaluateVeto(checkResults, allViolations, score);
    if (vetoReason) {
      return { passed: false, score, violations: allViolations, details, vetoReason };
    }

    // 4. Threshold check
    if (score < this.threshold) {
      return { passed: false, score, violations: allViolations, details };
    }

    // 5. Alert (informational only)
    const alert = this.alertThreshold !== undefined && score < this.alertThreshold
      ? `score ${score.toFixed(3)} below alert threshold ${this.alertThreshold}`
      : undefined;

    return { passed: true, score, violations: allViolations, details, alert };
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  private computeScore(
    items: Array<{ score: number; weight: number }>
  ): number {
    if (items.length === 0) return 1;

    switch (this.scoreMode) {
      case 'min':
        return Math.min(...items.map((i) => i.score));

      case 'average':
        return items.reduce((sum, i) => sum + i.score, 0) / items.length;

      case 'weighted':
      default: {
        const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
        if (totalWeight === 0) return 1;
        return items.reduce((sum, i) => sum + i.score * i.weight, 0) / totalWeight;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Veto evaluation
  // ---------------------------------------------------------------------------

  private evaluateVeto(
    results: CheckResult[],
    violations: Violation[],
    score: number
  ): string | null {
    // Custom veto
    if (this.customVeto) {
      const reason = this.customVeto(results);
      if (reason) return reason;
    }

    // Critical violations veto
    if (this.vetoOnCritical && violations.some((v) => v.severity === 'critical')) {
      const msgs = violations.filter((v) => v.severity === 'critical').map((v) => v.message);
      return `critical violations: ${msgs.join('; ')}`;
    }

    // Any sub-check failed
    if (results.some((r) => !r.passed)) {
      const failed = results.filter((r) => !r.passed).map((r, i) => this.checks[i]?.name ?? 'unknown');
      return `sub-check failures: ${failed.join(', ')}`;
    }

    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Apply severity penalties to a base score.
 * Usage: start at 1.0, subtract per-violation penalties.
 */
export function applyViolations(base: number, violations: Violation[]): number {
  const penalty = violations.reduce((sum, v) => sum + SEVERITY_PENALTY[v.severity], 0);
  return Math.max(0, Math.min(1, base - penalty));
}

/**
 * Build a simple threshold-based pass/fail check.
 * Useful for quick checks where you just need score + threshold.
 */
export function simpleCheck(
  score: number,
  threshold: number,
  violations: Violation[] = []
): CheckResult {
  return {
    score,
    passed: score >= threshold && !violations.some((v) => v.severity === 'critical'),
    violations,
  };
}

/**
 * Create a GuardPipeline instance.
 */
export function createGuardPipeline(config: GuardPipelineConfig): GuardPipeline {
  return new GuardPipeline(config);
}
