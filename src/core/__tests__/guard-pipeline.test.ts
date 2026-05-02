/**
 * Guard Pipeline Unit Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  GuardPipeline,
  createGuardPipeline,
  applyViolations,
  simpleCheck,
} from '../guard-pipeline';
import type { GuardPipelineConfig, CheckResult, Violation } from '../guard-pipeline';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCheck(score: number, passed: boolean, violations: Violation[] = []): CheckResult {
  return { score, passed, violations };
}

// ---------------------------------------------------------------------------
// Basic pipeline execution
// ---------------------------------------------------------------------------

describe('GuardPipeline', () => {
  it('should pass when all checks pass and score >= threshold', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'a', weight: 0.5, fn: () => makeCheck(0.95, true) },
        { name: 'b', weight: 0.5, fn: () => makeCheck(0.90, true) },
      ],
      threshold: 0.85,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(true);
    expect(result.score).toBeCloseTo(0.925);
    expect(result.violations).toHaveLength(0);
    expect(result.vetoReason).toBeUndefined();
  });

  it('should fail when score is below threshold', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'a', weight: 1, fn: () => makeCheck(0.60, false) },
      ],
      threshold: 0.80,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(false);
    expect(result.score).toBe(0.60);
  });

  it('should fail on critical violations regardless of score', async () => {
    const violations: Violation[] = [{ severity: 'critical', message: 'eval detected' }];
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'security', weight: 1, fn: () => makeCheck(0.99, true, violations) },
      ],
      threshold: 0.50,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(false);
    expect(result.vetoReason).toContain('critical');
    expect(result.score).toBe(0.99);
  });

  it('should fail when any sub-check fails', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'a', weight: 0.5, fn: () => makeCheck(0.95, true) },
        { name: 'b', weight: 0.5, fn: () => makeCheck(0.95, false) },
      ],
      threshold: 0.50,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(false);
    expect(result.vetoReason).toContain('sub-check failures');
  });

  it('should respect custom veto', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'a', weight: 1, fn: () => makeCheck(0.95, true) },
      ],
      threshold: 0.50,
      customVeto: () => 'custom block reason',
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(false);
    expect(result.vetoReason).toBe('custom block reason');
  });

  it('should return alert when score below alertThreshold but above main threshold', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'a', weight: 1, fn: () => makeCheck(0.88, true) },
      ],
      threshold: 0.80,
      alertThreshold: 0.90,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(true);
    expect(result.alert).toBeDefined();
    expect(result.alert).toContain('below alert threshold');
  });

  it('should not alert when score above alertThreshold', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'a', weight: 1, fn: () => makeCheck(0.95, true) },
      ],
      threshold: 0.80,
      alertThreshold: 0.90,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(true);
    expect(result.alert).toBeUndefined();
  });

  // ---------------------------------------------------------------------------
  // Score modes
  // ---------------------------------------------------------------------------

  describe('scoreMode', () => {
    it('weighted: uses weighted average', async () => {
      const pipeline = new GuardPipeline({
        checks: [
          { name: 'a', weight: 0.7, fn: () => makeCheck(0.80, true) },
          { name: 'b', weight: 0.3, fn: () => makeCheck(1.0, true) },
        ],
        scoreMode: 'weighted',
        threshold: 0,
      });

      const result = await pipeline.execute();
      expect(result.score).toBeCloseTo(0.86);
    });

    it('min: uses minimum sub-score', async () => {
      const pipeline = new GuardPipeline({
        checks: [
          { name: 'a', weight: 0.5, fn: () => makeCheck(0.80, true) },
          { name: 'b', weight: 0.5, fn: () => makeCheck(0.95, true) },
        ],
        scoreMode: 'min',
        threshold: 0,
      });

      const result = await pipeline.execute();
      expect(result.score).toBe(0.80);
    });

    it('average: uses simple average', async () => {
      const pipeline = new GuardPipeline({
        checks: [
          { name: 'a', weight: 0.5, fn: () => makeCheck(0.70, true) },
          { name: 'b', weight: 0.5, fn: () => makeCheck(0.90, true) },
        ],
        scoreMode: 'average',
        threshold: 0,
      });

      const result = await pipeline.execute();
      expect(result.score).toBe(0.80);
    });
  });

  // ---------------------------------------------------------------------------
  // Async checks
  // ---------------------------------------------------------------------------

  it('should support async check functions', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        {
          name: 'slow',
          weight: 1,
          fn: async () => {
            await new Promise((r) => setTimeout(r, 10));
            return makeCheck(0.90, true);
          },
        },
      ],
      threshold: 0.85,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Violation aggregation
  // ---------------------------------------------------------------------------

  it('should aggregate violations from all checks', async () => {
    const v1: Violation[] = [{ severity: 'major', message: 'issue a' }];
    const v2: Violation[] = [{ severity: 'minor', message: 'issue b' }];

    const pipeline = new GuardPipeline({
      checks: [
        { name: 'a', weight: 0.5, fn: () => makeCheck(0.90, true, v1) },
        { name: 'b', weight: 0.5, fn: () => makeCheck(0.90, true, v2) },
      ],
      threshold: 0.50,
    });

    const result = await pipeline.execute();
    expect(result.violations).toHaveLength(2);
    expect(result.violations.map((v) => v.message)).toContain('issue a');
    expect(result.violations.map((v) => v.message)).toContain('issue b');
  });

  // ---------------------------------------------------------------------------
  // Details
  // ---------------------------------------------------------------------------

  it('should include per-check details in result', async () => {
    const pipeline = new GuardPipeline({
      checks: [
        { name: 'static', weight: 0.5, fn: () => makeCheck(0.95, true) },
        { name: 'semantic', weight: 0.5, fn: () => makeCheck(0.88, true) },
      ],
      threshold: 0,
    });

    const result = await pipeline.execute();
    expect(result.details['static']).toBeDefined();
    expect(result.details['semantic']).toBeDefined();
    expect(result.details['static'].score).toBe(0.95);
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('should handle empty checks array', async () => {
    const pipeline = new GuardPipeline({
      checks: [],
      threshold: 0.50,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(true);
    expect(result.score).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// applyViolations helper
// ---------------------------------------------------------------------------

describe('applyViolations', () => {
  it('should subtract penalty for each violation', () => {
    const violations: Violation[] = [
      { severity: 'critical', message: 'x' },
      { severity: 'major', message: 'y' },
      { severity: 'minor', message: 'z' },
    ];

    const score = applyViolations(1.0, violations);
    // 1.0 - 0.30 - 0.15 - 0.05 = 0.50
    expect(score).toBe(0.50);
  });

  it('should not go below 0', () => {
    const violations: Violation[] = [
      { severity: 'critical', message: 'a' },
      { severity: 'critical', message: 'b' },
      { severity: 'critical', message: 'c' },
      { severity: 'critical', message: 'd' },
    ];

    const score = applyViolations(1.0, violations);
    expect(score).toBe(0);
  });

  it('should not exceed 1', () => {
    expect(applyViolations(1.0, [])).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// simpleCheck helper
// ---------------------------------------------------------------------------

describe('simpleCheck', () => {
  it('should pass when score >= threshold and no critical violations', () => {
    const result = simpleCheck(0.90, 0.85);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(0.90);
  });

  it('should fail when score < threshold', () => {
    const result = simpleCheck(0.70, 0.85);
    expect(result.passed).toBe(false);
  });

  it('should fail when critical violation exists regardless of score', () => {
    const result = simpleCheck(0.99, 0.50, [{ severity: 'critical', message: 'blocked' }]);
    expect(result.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createGuardPipeline factory
// ---------------------------------------------------------------------------

describe('createGuardPipeline', () => {
  it('should create and execute pipeline', async () => {
    const pipeline = createGuardPipeline({
      checks: [{ name: 'a', weight: 1, fn: () => makeCheck(0.95, true) }],
      threshold: 0.90,
    });

    const result = await pipeline.execute();
    expect(result.passed).toBe(true);
  });
});
