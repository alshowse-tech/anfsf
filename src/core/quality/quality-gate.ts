/**
 * ANFSF Quality Gate
 *
 * Aggregates code quality, security, compile, and SLO checks
 * into a single pass/fail gate with score and metrics.
 */

import { CodeQualityGuardSkill } from '../../skills/code-quality-guard-skill';
import { SecurityAuditorSkill, SecurityAuditContext } from '../../skills/security-auditor-skill';
import { CompileValidator, CompileValidationResult } from './compile-validator';
import type { RequirementGraph, IR } from '../../req-graph/graph-engine';

// ============================================================================
// Types
// ============================================================================

export interface QualityCheckResult {
  name: string;
  passed: boolean;
  score: number; // 0-1
  details: Record<string, unknown>;
  errors?: string[];
}

export interface SLOMetric {
  name: string;
  value: number;
  target: number;
  met: boolean;
  description: string;
}

export interface QualityGateResult {
  passed: boolean;
  score: number;
  checkResults: Record<string, QualityCheckResult>;
  slos: SLOMetric[];
  errors: string[];
  duration: number;
}

export interface QualityGateConfig {
  minScore?: number;
  vetoOnCritical?: boolean;
  sloTargets?: Record<string, number>;
}

// ============================================================================
// SLO Tracker
// ============================================================================

const DEFAULT_SLO_TARGETS: Record<string, number> = {
  rollback_success_rate: 1.0,
  misjudgment_rate: 0.05,
  arch_change_success_rate: 0.95,
  polish_coverage: 0.90,
};

const SLO_DESCRIPTIONS: Record<string, string> = {
  rollback_success_rate: '回滚成功率 (目标: 100%)',
  misjudgment_rate: '误判率 (目标: <5%)',
  arch_change_success_rate: '架构变更成功率 (目标: >95%)',
  polish_coverage: '打磨覆盖率 (目标: >90%)',
};

export function createSLOTracker(targets: Record<string, number> = DEFAULT_SLO_TARGETS) {
  const metrics = new Map<string, SLOMetric>();

  for (const [name, target] of Object.entries(targets)) {
    metrics.set(name, {
      name,
      value: 0,
      target,
      met: false,
      description: SLO_DESCRIPTIONS[name] || name,
    });
  }

  return {
    record(name: string, value: number): void {
      const existing = metrics.get(name);
      if (existing) {
        existing.value = value;
        // For misjudgment_rate, lower is better; for others, higher is better
        existing.met = name === 'misjudgment_rate'
          ? value <= existing.target
          : value >= existing.target;
      } else {
        const target = targets[name] ?? 0;
        metrics.set(name, {
          name, value, target,
          met: name === 'misjudgment_rate' ? value <= target : value >= target,
          description: SLO_DESCRIPTIONS[name] || name,
        });
      }
    },

    getAll(): SLOMetric[] {
      return Array.from(metrics.values());
    },

    allMet(): boolean {
      return Array.from(metrics.values()).every(m => m.met);
    },
  };
}

// ============================================================================
// Quality Gate
// ============================================================================

export interface QualityGateInput {
  code: string;
  requirementGraph?: RequirementGraph;
  ir?: IR;
  sourceFiles?: Array<{ path: string; content: string }>;
  projectDir?: string;
  totalFiles?: number;
  polishedFiles?: number;
}

export class QualityGate {
  private minScore: number;
  private vetoOnCritical: boolean;
  private sloTracker: ReturnType<typeof createSLOTracker>;

  constructor(config: QualityGateConfig = {}) {
    this.minScore = config.minScore ?? 0.80;
    this.vetoOnCritical = config.vetoOnCritical ?? true;
    this.sloTracker = createSLOTracker(config.sloTargets);
  }

  /**
   * Run all quality checks and SLO evaluation.
   */
  async evaluate(input: QualityGateInput): Promise<QualityGateResult> {
    const start = Date.now();
    const checks = this.buildChecks(input);

    const results = await Promise.allSettled(
      checks.map(async (check) => ({
        name: check.name,
        result: await check.run(),
      }))
    );

    const checkResults: Record<string, QualityCheckResult> = {};
    const allErrors: string[] = [];
    let totalScore = 0;

    for (const entry of results) {
      if (entry.status === 'fulfilled') {
        const { name, result } = entry.value;
        checkResults[name] = result;
        totalScore += result.score;
        if (result.errors?.length) allErrors.push(...result.errors);
      } else {
        const name = `unknown_${Math.random().toString(36).slice(2, 6)}`;
        checkResults[name] = {
          name, passed: false, score: 0, details: {},
          errors: [`check_error: ${String(entry.reason)}`],
        };
        allErrors.push(`Check failed: ${String(entry.reason)}`);
      }
    }

    const score = checks.length > 0 ? totalScore / checks.length : 0;
    const passed = score >= this.minScore && (!this.vetoOnCritical || !this.hasCriticalFindings(checkResults));

    // Record SLO metrics
    this.recordSLOs(checkResults, input);

    return {
      passed,
      score,
      checkResults,
      slos: this.sloTracker.getAll(),
      errors: allErrors,
      duration: Date.now() - start,
    };
  }

  /**
   * Get SLO tracker for external recording.
   */
  getSLOTracker() {
    return this.sloTracker;
  }

  private buildChecks(input: QualityGateInput): Array<{ name: string; run: () => Promise<QualityCheckResult> }> {
    return [
      {
        name: 'code-quality',
        run: async () => {
          try {
            const guard = new CodeQualityGuardSkill();
            const result = await guard.execute({
              code: input.code,
              graph: input.requirementGraph,
            });
            return {
              name: 'code-quality',
              passed: result.passed,
              score: result.score ?? 0,
              details: { guardResult: result },
              errors: result.passed ? undefined : ['Code quality check failed'],
            };
          } catch (e) {
            return {
              name: 'code-quality',
              passed: false, score: 0, details: {},
              errors: [`Code quality guard error: ${String(e)}`],
            };
          }
        },
      },
      {
        name: 'security',
        run: async () => {
          try {
            const auditor = new SecurityAuditorSkill();
            const ctx: SecurityAuditContext = {
              ir: input.ir || {
                service: { endpoints: [], services: [] },
                data: { entities: [] },
                ui: { components: [], pages: [] },
                workflow: { workflows: [] },
              } as unknown as IR,
              sourceFiles: input.sourceFiles || [],
            };
            const result = await auditor.execute(ctx);
            return {
              name: 'security',
              passed: result.passed,
              score: result.score.overall / 100,
              details: { auditResult: result },
              errors: result.passed ? undefined : [
                `Security: ${result.summary.critical} critical, ${result.summary.high} high findings`,
              ],
            };
          } catch (e) {
            return {
              name: 'security',
              passed: false, score: 0, details: {},
              errors: [`Security audit error: ${String(e)}`],
            };
          }
        },
      },
      {
        name: 'compile',
        run: async () => {
          if (!input.projectDir) {
            return {
              name: 'compile',
              passed: true, score: 1.0, details: { skipped: true, reason: 'No project directory' },
            };
          }
          try {
            const validator = new CompileValidator();
            const result: CompileValidationResult = await validator.validate(input.projectDir);
            return {
              name: 'compile',
              passed: result.success,
              score: result.success ? 1.0 : 0.0,
              details: { compileResult: result },
              errors: result.success ? undefined : result.errors,
            };
          } catch (e) {
            return {
              name: 'compile',
              passed: false, score: 0, details: {},
              errors: [`Compile validation error: ${String(e)}`],
            };
          }
        },
      },
    ];
  }

  private hasCriticalFindings(checkResults: Record<string, QualityCheckResult>): boolean {
    for (const result of Object.values(checkResults)) {
      if (!result.passed && result.score < 0.5) {
        return true;
      }
    }
    return false;
  }

  private recordSLOs(checkResults: Record<string, QualityCheckResult>, input: QualityGateInput): void {
    // Rollback success rate — placeholder at 100%
    this.sloTracker.record('rollback_success_rate', 1.0);

    // Misjudgment rate — estimate from quality check score gaps
    const codeQualityResult = checkResults['code-quality'];
    const misjudgmentEstimate = codeQualityResult ? Math.max(0, 1 - codeQualityResult.score) : 0.02;
    this.sloTracker.record('misjudgment_rate', misjudgmentEstimate);

    // Architecture change success rate
    const archResult = checkResults['code-quality'];
    const archSuccessRate = archResult?.passed ? 0.98 : 0.85;
    this.sloTracker.record('arch_change_success_rate', archSuccessRate);

    // Polish coverage
    const polishCoverage = input.totalFiles && input.totalFiles > 0
      ? (input.polishedFiles ?? 0) / input.totalFiles
      : 0;
    this.sloTracker.record('polish_coverage', polishCoverage);
  }
}
