/**
 * ANFSF Agent ¡ª DevFixLoop (GAP-03)
 *
 * Developer commit verification and auto-fix loop.
 * Implements AgentLoop with a 3-layer verification pipeline:
 *   compile ¡ú contract ¡ú E2E (placeholder for Phase 2)
 * and an error-driven fix cycle using FixEngine's classification matrix.
 *
 * Template method (run): generate ¡ú verify ¡ú fix (up to maxRetries rounds)
 */

import { AgentLoop } from './agent-loop-base';
import { getCompileLearningDB, verificationErrorsToNormalized } from "../pipeline/compile-learning-db";
import { ContractWatcher } from '../pipeline/contract-watcher';
import { FixEngine, type FixRecord, type ProblemType } from '../pipeline/fix-engine';
import { VerificationRunner } from './verification-runner';
import type { CodeSource, CodeAnnotation } from '../pipeline/code-annotator';
import * as path from 'path';

// ============================================================================
// Types
// ============================================================================

export interface DevCommitInput {
  projectPath: string;
  commitSha: string;
  files: string[];
  diffs: Array<{
    filename: string;
    status: 'added' | 'modified' | 'removed';
    patch?: string;
  }>;
}

export interface TestError {
  step: string;
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning';
  fixable: boolean;
}

export interface VerificationReport {
  commitSha: string;
  passed: boolean;
  steps: Array<{ name: string; passed: boolean; errors: string[]; durationMs: number }>;
  fixRecords: FixRecord[];
}

// ============================================================================
// Internal: Verification Step Result
// ============================================================================

interface StepResult {
  step: { name: string; passed: boolean; errors: string[]; durationMs: number };
  testErrors: TestError[];
}

// ============================================================================
// Timeout Helper
// ============================================================================

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

// ============================================================================
// DevFixLoop
// ============================================================================

export class DevFixLoop extends AgentLoop<DevCommitInput, VerificationReport, TestError> {
  readonly maxRetries = 2;

  private fixEngine = new FixEngine();

  /** Stored during generate() for use in verify() and fix(). */
  private currentInput: DevCommitInput | null = null;

  /** Resolved project directory, cached from the input. */
  private projectPath: string = '';

  // ========================================================================
  // AgentLoop lifecycle
  // ========================================================================

  async generate(input: DevCommitInput): Promise<VerificationReport> {
    this.currentInput = input;
    this.projectPath = input.projectPath;

    return {
      commitSha: input.commitSha,
      passed: false,
      steps: [],
      fixRecords: [],
    };
  }

  async verify(output: VerificationReport): Promise<TestError[]> {
    const allTestErrors: TestError[] = [];
    const allSteps: Array<{ name: string; passed: boolean; errors: string[]; durationMs: number }> = [];

    // --- Layer 1: Compile check (tsc --noEmit via VerificationRunner) ---
    const compileResult = await this.runCompileCheck();
    allSteps.push(compileResult.step);
    allTestErrors.push(...compileResult.testErrors);

    // --- Layer 2: Contract check (via ContractWatcher) ---
    const contractResult = await this.runContractCheck();
    allSteps.push(contractResult.step);
    allTestErrors.push(...contractResult.testErrors);

    // --- Layer 3: E2E check (Phase 2 placeholder) ---
    const e2eResult = await this.runE2ECheck();
    allSteps.push(e2eResult.step);
    allTestErrors.push(...e2eResult.testErrors);

    // --- Update output ---
    output.steps = allSteps;
    output.passed = allTestErrors.every(e => e.severity === 'warning');

    return allTestErrors;
  }

  async fix(errors: TestError[], output: VerificationReport): Promise<VerificationReport> {
    const fixRecords: FixRecord[] = [...output.fixRecords];

    for (const err of errors) {
      // Skip non-fixable errors (e.g. business logic, E2E placeholders)
      if (!err.fixable) continue;

      const source = this.classifySource(err.file);
      const problemType = this.classifyProblemType(err);

      const result = this.fixEngine.createFix({
        projectId: path.basename(this.projectPath) || this.projectPath,
        source,
        problemType,
        file: err.file,
        line: err.line,
        description: err.message,
      });

      fixRecords.push(result.record);
    }

    output.fixRecords = fixRecords;
    return output;
  }

  // ========================================================================
  // Layer 1: Compile check
  // ========================================================================

  private async runCompileCheck(): Promise<StepResult> {
    const start = Date.now();
    const stepName = 'compile-check';

    try {
      const runner = new VerificationRunner();
      const results = await withTimeout(
        runner.runAll(this.projectPath),
        60_000,
        stepName,
      );

      const errorStrings: string[] = [];
      const testErrors: TestError[] = [];

      for (const result of results) {
        if (!result.passed) {
          for (const verr of result.errors) {
            errorStrings.push(
              `${verr.file}(${verr.line},${verr.column}): ${verr.severity} ${verr.message}`,
            );
            testErrors.push({
              step: 'compile',
              file: verr.file,
              line: verr.line,
              message: verr.message,
              severity: verr.severity,
              fixable: verr.fixable,
            });
          }
        }
      }

      // Record compile errors in learning database
      if (testErrors.length > 0) {
        try {
          const db = getCompileLearningDB();
          const normalized = verificationErrorsToNormalized(
            testErrors.map(e => ({ message: e.message, file: e.file })),
            'web',
            0,
            'fixed',
          );
          db.recordErrors(normalized);
        } catch {}
      }
      return {
        step: { name: stepName, passed: errorStrings.length === 0, errors: errorStrings, durationMs: Date.now() - start },
        testErrors,
      };
    } catch (error) {
      const msg = `Compile check failed: ${error instanceof Error ? error.message : String(error)}`;
      return {
        step: { name: stepName, passed: false, errors: [msg], durationMs: Date.now() - start },
        testErrors: [{ step: 'compile', file: '', line: 0, message: msg, severity: 'error', fixable: false }],
      };
    }
  }

  // ========================================================================
  // Layer 2: Contract check
  // ========================================================================

  private async runContractCheck(): Promise<StepResult> {
    const start = Date.now();
    const stepName = 'contract-check';

    try {
      const annotations = this.buildAnnotations();
      const watcher = new ContractWatcher();
      const result = await withTimeout(
        Promise.resolve(watcher.check(annotations)),  // sync call; timeout guards call-site, not execution
        60_000,
        stepName,
      );

      const errorStrings: string[] = [];
      const testErrors: TestError[] = [];

      for (const v of result.violations) {
        errorStrings.push(`[${v.severity}] ${v.file}: ${v.message}`);
        testErrors.push({
          step: 'contract',
          file: v.file,
          line: 0,
          message: v.message,
          severity: v.severity,
          fixable: v.severity === 'error',
        });
      }

      return {
        step: {
          name: stepName,
          passed: result.summary.errors === 0,
          errors: errorStrings,
          durationMs: Date.now() - start,
        },
        testErrors,
      };
    } catch (error) {
      const msg = `Contract check failed: ${error instanceof Error ? error.message : String(error)}`;
      return {
        step: { name: stepName, passed: false, errors: [msg], durationMs: Date.now() - start },
        testErrors: [{ step: 'contract', file: '', line: 0, message: msg, severity: 'error', fixable: false }],
      };
    }
  }

  // ========================================================================
  // Layer 3: E2E check (Phase 2 placeholder)
  // ========================================================================

  private async runE2ECheck(): Promise<StepResult> {
    const start = Date.now();
    const stepName = 'e2e-check';

    // Placeholder ¡ª Phase 2: E2E test runner integration
    const msg = 'E2E tests not implemented (Phase 2)';

    return {
      step: {
        name: stepName,
        passed: true,
        errors: [msg],
        durationMs: Date.now() - start,
      },
      testErrors: [{
        step: 'e2e',
        file: '',
        line: 0,
        message: msg,
        severity: 'warning',
        fixable: false,
      }],
    };
  }

  // ========================================================================
  // Helpers
  // ========================================================================

  /**
   * Build minimal CodeAnnotation[] from the current commit diffs
   * for the contract watcher to scan.
   */
  private buildAnnotations(): CodeAnnotation[] {
    if (!this.currentInput) return [];

    return this.currentInput.diffs.map(d => ({
      file: d.filename,
      startLine: 0,
      endLine: 0,
      source: this.mapStatusToSource(d.status),
      commitSha: this.currentInput!.commitSha,
      annotatedAt: Date.now(),
    }));
  }

  /**
   * Map DevCommitInput diff status to CodeSource.
   */
  private mapStatusToSource(status: 'added' | 'modified' | 'removed'): CodeSource {
    switch (status) {
      case 'added':
        return 'new';
      case 'modified':
        return 'modified';
      case 'removed':
        return 'modified'; // Treated as modified for fix classification
      default:
        return 'generated';
    }
  }

  /**
   * Determine the CodeSource for a file based on the current commit diffs.
   * Falls back to 'generated' for files not mentioned in the diff set.
   */
  private classifySource(file: string): CodeSource {
    if (!this.currentInput) return 'generated';

    const diff = this.currentInput.diffs.find(d => d.filename === file);
    if (diff) {
      return this.mapStatusToSource(diff.status);
    }

    // File in the changed file list but not in diffs ¡ª assume modified
    if (this.currentInput.files.includes(file)) {
      return 'modified';
    }

    return 'generated';
  }

  /**
   * Infer the ProblemType from a TestError based on its message content.
   */
  private classifyProblemType(err: TestError): ProblemType {
    const msg = err.message.toLowerCase();

    // Type errors (most common in tsc output)
    if (
      msg.includes('type') ||
      msg.includes('assignable') ||
      msg.includes('types of') ||
      msg.includes('not assignable') ||
      msg.includes('cannot find module') ||
      msg.includes('cannot find name') ||
      msg.includes('has no')
    ) {
      return 'type_mismatch';
    }

    // API / interface changes
    if (
      msg.includes('api') ||
      msg.includes('interface') ||
      msg.includes('endpoint') ||
      err.step === 'contract'
    ) {
      return 'interface_change';
    }

    // Dead code
    if (msg.includes('unused') || msg.includes('declared but never')) {
      return 'unused_variable';
    }

    // Style deviations
    if (msg.includes('style') || msg.includes('css') || msg.includes('spacing')) {
      return 'style_deviation';
    }

    // Spelling / formatting
    if (msg.includes('spelling') || msg.includes('format') || msg.includes('typo')) {
      return 'spelling_format';
    }

    // Conditional / logic gaps
    if (msg.includes('condition') || msg.includes('always') || msg.includes('unreachable')) {
      return 'conditional_flaw';
    }

    // Business logic ¡ª conservative default for meaningful logic errors
    if (
      msg.includes('logic') ||
      msg.includes('business') ||
      msg.includes('incorrect')
    ) {
      return 'business_logic';
    }

    return 'type_mismatch';
  }
}

