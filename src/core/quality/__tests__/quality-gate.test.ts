/**
 * Quality Gate — unit tests
 */

import { QualityGate, createSLOTracker, QualityGateInput } from '../quality-gate';

describe('SLOTracker', () => {
  it('should initialize with default targets', () => {
    const tracker = createSLOTracker();
    const metrics = tracker.getAll();
    expect(metrics.length).toBe(4);
    expect(metrics.some(m => m.name === 'rollback_success_rate')).toBe(true);
    expect(metrics.some(m => m.name === 'misjudgment_rate')).toBe(true);
    expect(metrics.some(m => m.name === 'arch_change_success_rate')).toBe(true);
    expect(metrics.some(m => m.name === 'polish_coverage')).toBe(true);
  });

  it('should record and track metrics', () => {
    const tracker = createSLOTracker();
    tracker.record('rollback_success_rate', 1.0);
    const metrics = tracker.getAll();
    const metric = metrics.find(m => m.name === 'rollback_success_rate');
    expect(metric).toBeDefined();
    expect(metric!.value).toBe(1.0);
    expect(metric!.target).toBe(1.0);
    expect(metric!.met).toBe(true);
  });

  it('should mark misjudgment_rate as met when below target', () => {
    const tracker = createSLOTracker();
    tracker.record('misjudgment_rate', 0.02);
    const metrics = tracker.getAll();
    const metric = metrics.find(m => m.name === 'misjudgment_rate');
    expect(metric!.met).toBe(true);
  });

  it('should mark misjudgment_rate as not met when above target', () => {
    const tracker = createSLOTracker();
    tracker.record('misjudgment_rate', 0.10);
    const metrics = tracker.getAll();
    const metric = metrics.find(m => m.name === 'misjudgment_rate');
    expect(metric!.met).toBe(false);
  });

  it('should report allMet when all metrics meet targets', () => {
    const tracker = createSLOTracker();
    tracker.record('rollback_success_rate', 1.0);
    tracker.record('misjudgment_rate', 0.01);
    tracker.record('arch_change_success_rate', 0.99);
    tracker.record('polish_coverage', 1.0);
    expect(tracker.allMet()).toBe(true);
  });

  it('should report allMet as false when any metric misses', () => {
    const tracker = createSLOTracker();
    tracker.record('rollback_success_rate', 1.0);
    tracker.record('misjudgment_rate', 0.20);
    tracker.record('arch_change_success_rate', 0.99);
    tracker.record('polish_coverage', 1.0);
    expect(tracker.allMet()).toBe(false);
  });

  it('should accept custom targets', () => {
    const tracker = createSLOTracker({ custom_metric: 0.5 });
    tracker.record('custom_metric', 0.6);
    const metrics = tracker.getAll();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].target).toBe(0.5);
    expect(metrics[0].met).toBe(true);
  });
});

describe('QualityGate', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const gate = new QualityGate();
      expect(gate).toBeDefined();
    });

    it('should accept custom minScore', () => {
      const gate = new QualityGate({ minScore: 0.90 });
      expect(gate).toBeDefined();
    });

    it('should accept vetoOnCritical', () => {
      const gate = new QualityGate({ vetoOnCritical: false });
      expect(gate).toBeDefined();
    });
  });

  describe('evaluate()', () => {
    it('should run checks and return result structure', async () => {
      const gate = new QualityGate();
      const input: QualityGateInput = {
        code: 'const x = 1;',
        projectDir: undefined, // skip compile check
      };
      const result = await gate.evaluate(input);
      expect(result).toHaveProperty('passed');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('checkResults');
      expect(result).toHaveProperty('slos');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('duration');
    });

    it('should have checkResults with expected check names', async () => {
      const gate = new QualityGate();
      const input: QualityGateInput = { code: 'const x = 1;' };
      const result = await gate.evaluate(input);
      expect(result.checkResults).toHaveProperty('code-quality');
      expect(result.checkResults).toHaveProperty('security');
      expect(result.checkResults).toHaveProperty('compile');
    });

    it('should skip compile check when no projectDir', async () => {
      const gate = new QualityGate();
      const input: QualityGateInput = {
        code: 'const x = 1;',
        projectDir: undefined,
      };
      const result = await gate.evaluate(input);
      expect(result.checkResults['compile'].passed).toBe(true);
      expect(result.checkResults['compile'].details).toHaveProperty('skipped', true);
    });

    it('should include SLO metrics in result', async () => {
      const gate = new QualityGate();
      const input: QualityGateInput = {
        code: 'const x = 1;',
        totalFiles: 10,
        polishedFiles: 8,
      };
      const result = await gate.evaluate(input);
      expect(result.slos.length).toBe(4);
    });

    it('should track polish_coverage SLO', async () => {
      const gate = new QualityGate();
      const input: QualityGateInput = {
        code: 'const x = 1;',
        totalFiles: 10,
        polishedFiles: 8,
      };
      const result = await gate.evaluate(input);
      const polishMetric = result.slos.find(s => s.name === 'polish_coverage');
      expect(polishMetric).toBeDefined();
      expect(polishMetric!.value).toBe(0.8);
    });

    it('should handle check errors gracefully', async () => {
      const gate = new QualityGate();
      const input: QualityGateInput = {
        code: 'eval("bad code");',
      };
      const result = await gate.evaluate(input);
      expect(result).toBeDefined();
    });
  });

  describe('getSLOTracker()', () => {
    it('should return a tracker instance', () => {
      const gate = new QualityGate();
      const tracker = gate.getSLOTracker();
      expect(tracker).toBeDefined();
      expect(typeof tracker.record).toBe('function');
      expect(typeof tracker.getAll).toBe('function');
    });
  });
});
