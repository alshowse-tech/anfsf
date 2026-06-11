/**
 * ANFSF Pipeline — Fault Reporter (T-205)
 *
 * Generates human-readable fault reports from verification failures.
 * Does NOT auto-assign faults — it provides precise location info
 * so developers can quickly understand and act.
 */

import type { VerificationReport, VerificationStep } from './commit-verification';
import type { CodeAnnotation } from './code-annotator';

export interface FaultLocation {
  file: string;
  line?: number;
  message: string;
  suggestedAction: string;
}

export interface FaultReport {
  projectId: string;
  commitSha: string;
  timestamp: number;
  summary: string;
  failedSteps: string[];
  locations: FaultLocation[];
}

export class FaultReporter {
  /**
   * Generate a fault report from a failed verification.
   */
  generate(report: VerificationReport): FaultReport {
    const failedSteps = report.steps.filter(s => !s.passed);
    const locations: FaultLocation[] = [];

    for (const step of failedSteps) {
      for (const error of step.errors) {
        locations.push({
          file: this.extractFile(error),
          line: this.extractLine(error),
          message: error,
          suggestedAction: this.suggestAction(step.name, error),
        });
      }
    }

    return {
      projectId: report.projectId,
      commitSha: report.commitSha,
      timestamp: Date.now(),
      summary: `${failedSteps.length} step(s) failed with ${locations.length} error(s)`,
      failedSteps: failedSteps.map(s => s.name),
      locations,
    };
  }

  private extractFile(error: string): string {
    // Try to extract file path from error messages like "src/file.ts:42:10: error..."
    const match = error.match(/([a-zA-Z0-9_\-/.]+\.(tsx|ts|jsx|js))/);
    return match ? match[1] : 'unknown';
  }

  private extractLine(error: string): number | undefined {
    const match = error.match(/:(\d+):/);
    return match ? parseInt(match[1], 10) : undefined;
  }

  private suggestAction(stepName: string, error: string): string {
    if (error.includes('cannot find module') || error.includes('Cannot find module')) {
      return 'Check import paths and ensure dependencies are installed';
    }
    if (error.includes('TS') && error.includes('error')) {
      return 'Review TypeScript type definitions at the indicated location';
    }
    if (stepName === 'contract-check') {
      return 'Review the API changes and update the frontend accordingly';
    }
    if (stepName === 'compile-check') {
      return 'Fix the compilation errors, then push a new commit';
    }
    return 'Review the error and fix accordingly';
  }
}
