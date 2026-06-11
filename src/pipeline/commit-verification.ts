/**
 * ANFSF Pipeline — Commit Verification (T-204)
 *
 * Triggered on each commit/push event.
 * Runs: contract test → integration check → compile validation.
 * Passes → deploys to test env. Fails → generates fault report via T-205.
 */

import type { GiteaCommit, GiteaDiff } from '../integrations/gitea-client';
import type { CodeAnnotation } from './code-annotator';

// ============================================================================
// Types
// ============================================================================

export interface VerificationStep {
  name: string;
  passed: boolean;
  durationMs: number;
  errors: string[];
}

export interface VerificationReport {
  projectId: string;
  commitSha: string;
  passed: boolean;
  steps: VerificationStep[];
  annotations?: CodeAnnotation[];
  deployedUrl?: string;
  timestamp: number;
}

// ============================================================================
// Verification Pipeline
// ============================================================================

export class CommitVerifier {
  /**
   * Run the verification pipeline for a commit.
   *
   * Phase 1 scope: contract check + compile check.
   * Phase 2 adds: E2E automated test execution.
   */
  async verify(
    projectId: string,
    commit: GiteaCommit,
    diffs: GiteaDiff[],
    projectPath: string,
    annotations?: CodeAnnotation[],
  ): Promise<VerificationReport> {
    const steps: VerificationStep[] = [];

    // Step 1: Contract check
    const contractResult = await this.runContractCheck(annotations || []);
    steps.push(contractResult);

    // Step 2: Compile check
    const compileResult = await this.runCompileCheck(projectPath);
    steps.push(compileResult);

    const passed = steps.every(s => s.passed);

    return {
      projectId,
      commitSha: commit.sha,
      passed,
      steps,
      annotations,
      timestamp: Date.now(),
    };
  }

  private async runContractCheck(annotations: CodeAnnotation[]): Promise<VerificationStep> {
    const start = Date.now();
    // Phase 1: basic check — if any backend API files were modified, flag for review
    const apiChanges = annotations.filter(
      a => (a.file.includes('routes/') || a.file.includes('api/')) && a.source !== 'generated',
    );

    return {
      name: 'contract-check',
      passed: true, // Always pass — just flag for review
      durationMs: Date.now() - start,
      errors: apiChanges.length > 0
        ? [`${apiChanges.length} API file(s) modified — manual review recommended`]
        : [],
    };
  }

  private async runCompileCheck(projectPath: string): Promise<VerificationStep> {
    const start = Date.now();
    try {
      // Use existing CompileValidator
      const { CompileValidator } = await import('../core/quality/compile-validator');
      const validator = new CompileValidator(60_000);
      const result = await validator.validate(projectPath);

      return {
        name: 'compile-check',
        passed: result.success,
        durationMs: Date.now() - start,
        errors: result.errors,
      };
    } catch (error) {
      return {
        name: 'compile-check',
        passed: false,
        durationMs: Date.now() - start,
        errors: [`Compile check failed: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }
}
