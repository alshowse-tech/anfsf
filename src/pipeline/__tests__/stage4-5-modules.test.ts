/**
 * Combined tests for T-301, T-302, T-304, T-305
 */

import { describe, it, expect } from '@jest/globals';
import { FixEngine } from '../fix-engine';
import { RegressionRunner } from '../regression-runner';
import { ReleaseCheck } from '../release-check';
import { Archiver } from '../archiver';
import type { CodeAnnotation } from '../code-annotator';

// ============================================================================
// T-301: FixEngine
// ============================================================================

describe('FixEngine', () => {
  const engine = new FixEngine();

  describe('classify', () => {
    it('should return L1 for style issues on generated code', () => {
      expect(engine.classify('generated', 'style_deviation')).toBe('L1');
    });

    it('should return L3 for business logic on new code', () => {
      expect(engine.classify('new', 'business_logic')).toBe('L3');
    });

    it('should return L2 for type mismatch on modified code', () => {
      expect(engine.classify('modified', 'type_mismatch')).toBe('L2');
    });

    it('should default to L3 for unknown problem types', () => {
      expect(engine.classify('new', 'algorithm_issue')).toBe('L3');
    });
  });

  describe('createFix', () => {
    it('should create L1 auto-fix', () => {
      const result = engine.createFix({
        projectId: 'p1', source: 'generated', problemType: 'type_mismatch',
        file: 'src/index.ts', line: 10, description: 'Type error',
      });
      expect(result.level).toBe('L1');
      expect(result.action).toBe('auto_fix_applied');
      expect(result.record.fixStatus).toBe('auto_fixed');
    });

    it('should create L2 suggestion', () => {
      const result = engine.createFix({
        projectId: 'p1', source: 'modified', problemType: 'interface_change',
        file: 'src/api.ts', line: 5, description: 'Field renamed',
      });
      expect(result.level).toBe('L2');
      expect(result.action).toBe('review_suggestion');
      expect(result.suggestedDiff).toBeDefined();
    });

    it('should create L3 location-only', () => {
      const result = engine.createFix({
        projectId: 'p1', source: 'new', problemType: 'business_logic',
        file: 'src/checkout.ts', line: 42, description: 'Wrong discount calc',
      });
      expect(result.level).toBe('L3');
      expect(result.action).toBe('manual_fix_required');
    });
  });

  describe('confirmFix', () => {
    it('should mark fix as confirmed', () => {
      const result = engine.createFix({
        projectId: 'p1', source: 'generated', problemType: 'style_deviation',
        file: 'a.ts', line: 1, description: 'x',
      });
      const confirmed = engine.confirmFix(result.record, 'pm');
      expect(confirmed.fixStatus).toBe('confirmed');
      expect(confirmed.confirmedBy).toBe('pm');
    });
  });

  describe('summarize', () => {
    it('should count L1/L2/L3/confirmed/pending', () => {
      const r1 = engine.createFix({ projectId: 'p1', source: 'generated', problemType: 'type_mismatch', file: 'a.ts', line: 1, description: 'x' });
      const r2 = engine.createFix({ projectId: 'p1', source: 'new', problemType: 'business_logic', file: 'b.ts', line: 1, description: 'x' });
      const conf = engine.confirmFix(r1.record, 'pm');
      const summary = engine.summarize([r1.record, r2.record]);
      expect(summary.l1).toBe(1);
      expect(summary.l3).toBe(1);
      expect(summary.total).toBe(2);
    });
  });
});

// ============================================================================
// T-302: RegressionRunner
// ============================================================================

describe('RegressionRunner', () => {
  it('should detect new failures after fix', async () => {
    const runner = new RegressionRunner();
    runner.recordPassing('p1', ['tc1', 'tc2', 'tc3']);

    const result = await runner.run('p1', { id: 'fix1', level: 'L1', projectId: 'p1', file: 'a.ts', line: 1, problemType: 'type_mismatch' as any, issueDescription: '', fixStatus: 'pending' }, [
      { testId: 'tc1', passed: true },
      { testId: 'tc2', passed: false }, // regression!
      { testId: 'tc3', passed: true },
    ]);

    expect(result.passed).toBe(false);
    expect(result.newFailures).toContain('tc2');
  });

  it('should pass when all tests still pass', async () => {
    const runner = new RegressionRunner();
    runner.recordPassing('p1', ['tc1', 'tc2']);

    const result = await runner.run('p1', { id: 'fix2', level: 'L1', projectId: 'p1', file: 'a.ts', line: 1, problemType: 'type_mismatch' as any, issueDescription: '', fixStatus: 'pending' }, [
      { testId: 'tc1', passed: true },
      { testId: 'tc2', passed: true },
    ]);

    expect(result.passed).toBe(true);
    expect(result.newFailures).toHaveLength(0);
  });
});

// ============================================================================
// T-304: ReleaseCheck
// ============================================================================

describe('ReleaseCheck', () => {
  it('should run three-layer check', () => {
    const check = new ReleaseCheck();
    const report = check.check({
      projectId: 'p1',
      fixRecords: [],
      testResults: [{ passed: true }],
      changeRequests: [{ state: 'completed' }],
      frontendConfirmed: true,
      backendConfirmed: true,
    });

    expect(report.layers.system.passed).toBe(true);
    expect(report.layers.role.passed).toBe(true);
  });

  it('should block when tests fail', () => {
    const check = new ReleaseCheck();
    const report = check.check({
      projectId: 'p1',
      fixRecords: [],
      testResults: [{ passed: false }],
      changeRequests: [],
      frontendConfirmed: false,
      backendConfirmed: false,
    });

    expect(report.layers.system.passed).toBe(false);
    expect(report.releasable).toBe(false);
  });

  it('should list blockers', () => {
    const check = new ReleaseCheck();
    const report = check.check({
      projectId: 'p1', fixRecords: [], testResults: [{ passed: false }],
      changeRequests: [], frontendConfirmed: false, backendConfirmed: false,
    });

    expect(report.blockers.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// T-305: Archiver
// ============================================================================

describe('Archiver', () => {
  it('should generate metrics and candidates', () => {
    const archiver = new Archiver();
    const annotations: CodeAnnotation[] = [
      { file: 'src/pages/Home.tsx', startLine: 0, endLine: 50, source: 'generated', commitSha: 'abc', annotatedAt: 1000 },
      { file: 'src/services/payment.ts', startLine: 0, endLine: 100, source: 'new', commitSha: 'abc', annotatedAt: 2000 },
      { file: 'src/routes/api.ts', startLine: 0, endLine: 30, source: 'modified', commitSha: 'def', annotatedAt: 3000 },
    ];

    const result = archiver.archive({
      projectId: 'p1',
      projectName: 'Test Project',
      stages: [{ stage: 1, name: 'Parse', durationHours: 2, startTimestamp: 1000, endTimestamp: 2000 }],
      fixRecords: [],
      annotations,
      tokenByStage: { stage1: 1000000, stage3: 500000 },
      totalTokens: 1500000,
      startTimestamp: 1000,
      endTimestamp: 2000,
    });

    expect(result.metrics.projectName).toBe('Test Project');
    expect(result.metrics.fixSummary.total).toBe(0);
    expect(result.candidates.length).toBeGreaterThan(0);
    expect(result.snapshotVersion).toContain('archive');
  });

  it('should mark files with 0 modifications as stable', () => {
    const archiver = new Archiver();
    const annotations: CodeAnnotation[] = [
      { file: 'src/pages/Home.tsx', startLine: 0, endLine: 50, source: 'generated', commitSha: 'a', annotatedAt: 1000 },
    ];

    const result = archiver.archive({
      projectId: 'p1', projectName: 'P', stages: [], fixRecords: [], annotations,
      tokenByStage: {}, totalTokens: 0, startTimestamp: 1000, endTimestamp: 2000,
    });

    const home = result.candidates.find(c => c.file === 'src/pages/Home.tsx');
    expect(home).toBeDefined();
    expect(home!.stability).toBe('stable');
  });

  it('should skip new files as candidates', () => {
    const archiver = new Archiver();
    const annotations: CodeAnnotation[] = [
      { file: 'src/newfile.ts', startLine: 0, endLine: 10, source: 'new', commitSha: 'a', annotatedAt: 1000 },
    ];

    const result = archiver.archive({
      projectId: 'p1', projectName: 'P', stages: [], fixRecords: [], annotations,
      tokenByStage: {}, totalTokens: 0, startTimestamp: 1000, endTimestamp: 2000,
    });

    const newFile = result.candidates.find(c => c.file === 'src/newfile.ts');
    expect(newFile).toBeUndefined();
  });
});
