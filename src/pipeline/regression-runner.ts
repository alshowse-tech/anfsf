/**
 * ANFSF Pipeline — Regression Runner (T-302)
 *
 * After each fix commit, re-runs all previously passing tests
 * to confirm no regressions were introduced.
 */

import type { FixRecord } from './fix-engine';

export interface RegressionResult {
  projectId: string;
  fixId: string;
  passed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  newFailures: string[];    // Tests that WERE passing but now fail
  durationMs: number;
}

export class RegressionRunner {
  private passHistory: Map<string, string[]> = new Map(); // projectId → passed test IDs

  /**
   * Record a set of test IDs as "currently passing".
   */
  recordPassing(projectId: string, testIds: string[]): void {
    this.passHistory.set(projectId, [...testIds]);
  }

  /**
   * Run regression check after a fix.
   * Compares current test results against the known-passing set.
   */
  async run(
    projectId: string,
    fix: FixRecord,
    currentTestResults: { testId: string; passed: boolean }[],
  ): Promise<RegressionResult> {
    const start = Date.now();
    const previousPassing = this.passHistory.get(projectId) || [];

    const newFailures: string[] = [];
    let passedTests = 0;
    let failedTests = 0;

    for (const result of currentTestResults) {
      if (result.passed) {
        passedTests++;
      } else {
        failedTests++;
        // If this test was previously passing, it's a regression
        if (previousPassing.includes(result.testId)) {
          newFailures.push(result.testId);
        }
      }
    }

    const passed = newFailures.length === 0;

    if (passed) {
      // Update pass history
      this.recordPassing(projectId, currentTestResults.filter(r => r.passed).map(r => r.testId));
    }

    return {
      projectId,
      fixId: fix.id,
      passed,
      totalTests: currentTestResults.length,
      passedTests,
      failedTests,
      newFailures,
      durationMs: Date.now() - start,
    };
  }
}
