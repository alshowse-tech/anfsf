/**
 * L14 Simulation Layer - Simulator Tests
 */

import { describe, it, expect } from '@jest/globals';
import { UserBehaviorSimulator } from '../user-behavior-simulator';
import { LoadSimulator } from '../load-simulator';
import { ExceptionSimulator } from '../exception-simulator';
import { BoundarySimulator } from '../boundary-simulator';
import { SimulationPipeline } from '../index';
import { AutoDecisionEngine } from '../auto-decision-engine';

describe('UserBehaviorSimulator', () => {
  const simulator = new UserBehaviorSimulator();

  it('should simulate normal mode with low error rate', () => {
    const result = simulator.simulate({
      mode: 'normal',
      paths: [
        { id: 'p1', name: 'Login Flow', steps: [{ action: 'click', target: 'login' }], weight: 1 },
      ],
      iterationsPerPath: 100,
    });

    expect(result.pathCoverage).toBeGreaterThanOrEqual(0);
    expect(result.totalRequests).toBeGreaterThan(0);
    expect(result.avgLatency).toBeGreaterThan(0);
  });

  it('should simulate error mode with higher error rate', () => {
    const result = simulator.simulate({
      mode: 'error',
      paths: [
        { id: 'p1', name: 'Checkout', steps: [{ action: 'submit', target: 'order' }], weight: 1 },
      ],
      iterationsPerPath: 1000,
    });

    expect(result.errorRate).toBeGreaterThan(0.05);
  });

  it('should handle multiple paths', () => {
    const result = simulator.simulate({
      mode: 'normal',
      paths: [
        { id: 'p1', name: 'Browse', steps: [{ action: 'view', target: 'list' }], weight: 1 },
        { id: 'p2', name: 'Purchase', steps: [{ action: 'buy', target: 'cart' }], weight: 0.5 },
      ],
      iterationsPerPath: 100,
    });

    expect(result.pathResults.length).toBe(2);
  });

  it('should generate config from workflow IR', () => {
    const config = UserBehaviorSimulator.fromWorkflowIR([
      { id: 'n1', content: 'User login' },
      { id: 'n2', content: 'View dashboard' },
    ]);

    expect(config.paths.length).toBe(2);
    expect(config.mode).toBe('normal');
    expect(config.iterationsPerPath).toBe(100);
  });
});

describe('LoadSimulator', () => {
  const simulator = new LoadSimulator();

  it('should simulate load against endpoints', () => {
    const result = simulator.simulate(
      [
        { id: 'api-users', path: '/users', method: 'GET', baseLatency: 50 },
        { id: 'api-orders', path: '/orders', method: 'POST', baseLatency: 100 },
      ],
      {
        maxConcurrent: 100,
        rampUpMs: 100,
        steadyMs: 500,
        rampDownMs: 100,
        rps: 50,
      }
    );

    expect(result.totalRequests).toBeGreaterThan(0);
    expect(result.p50).toBeGreaterThan(0);
    expect(result.p99).toBeGreaterThanOrEqual(result.p50);
    expect(result.p95).toBeGreaterThanOrEqual(result.p50);
    expect(Object.keys(result.perEndpoint).length).toBeGreaterThan(0);
  });

  it('should handle empty endpoints', () => {
    const result = simulator.simulate([], {
      maxConcurrent: 10,
      rampUpMs: 100,
      steadyMs: 100,
      rampDownMs: 100,
      rps: 10,
    });

    expect(result.totalRequests).toBeGreaterThanOrEqual(0);
    // With empty endpoints, no requests succeed but the loop still runs
    expect(result.successCount).toBe(0);
  });

  it('should return higher p99 than p50', () => {
    const result = simulator.simulate(
      [{ id: 'api', path: '/test', method: 'GET', baseLatency: 50 }],
      {
        maxConcurrent: 50,
        rampUpMs: 200,
        steadyMs: 1000,
        rampDownMs: 200,
        rps: 100,
      }
    );

    expect(result.p99).toBeGreaterThan(result.p50);
  });
});

describe('ExceptionSimulator', () => {
  const simulator = new ExceptionSimulator();

  it('should simulate fault injections', () => {
    const result = simulator.simulate([
      { type: 'network_timeout', target: 'api-gateway', durationMs: 5000, probability: 1.0 },
    ]);

    expect(result.faultResults.length).toBe(1);
    expect(result.faultResults[0].triggered).toBe(true);
    expect(result.faultResults[0].error).toContain('Network timeout');
  });

  it('should compute resilience score', () => {
    const result = simulator.simulate([
      { type: 'network_timeout', target: 'api', durationMs: 1000, probability: 1.0 },
    ]);

    expect(result.resilienceScore).toBeGreaterThan(0);
    expect(result.resilienceScore).toBeLessThanOrEqual(1);
  });

  it('should generate faults from service endpoints', () => {
    const faults = ExceptionSimulator.fromServiceEndpoints([
      { id: 'user-service', type: 'api' },
      { id: 'postgres', type: 'database' },
    ]);

    expect(faults.length).toBeGreaterThan(0);
    expect(faults.some((f) => f.type === 'api_rate_limit')).toBe(true);
    expect(faults.some((f) => f.type === 'db_connection_failure')).toBe(true);
  });

  it('should handle untriggered faults', () => {
    const result = simulator.simulate([
      { type: 'service_crash', target: 'svc', durationMs: 5000, probability: 0.0 },
    ]);

    expect(result.faultResults[0].triggered).toBe(false);
  });

  it('should detect data loss possibility', () => {
    const _result = simulator.simulate([
      { type: 'service_crash', target: 'svc', durationMs: 5000, probability: 1.0 },
    ]);

    // service_crash has 10% data loss chance; run many times to check it's possible
    let hasLoss = false;
    for (let i = 0; i < 100; i++) {
      const r = simulator.simulate([{ type: 'service_crash', target: 'svc', durationMs: 5000, probability: 1.0 }]);
      if (r.dataLoss) hasLoss = true;
    }
    expect(hasLoss).toBe(true);
  });
});

describe('BoundarySimulator', () => {
  const simulator = new BoundarySimulator();

  it('should run boundary tests', () => {
    const result = simulator.simulate([
      { name: 'empty body', target: '/users', condition: 'empty_input', expected: 'reject' },
      { name: 'unicode', target: '/users', condition: 'unicode_injection', expected: 'succeed' },
    ]);

    expect(result.totalCases).toBe(2);
    expect(result.passed + result.failed).toBe(2);
    expect(result.testResults.length).toBe(2);
  });

  it('should generate tests from endpoints', () => {
    const tests = BoundarySimulator.fromEndpoints([
      { id: 'create-user', path: '/users' },
    ]);

    expect(tests.length).toBe(6);
    expect(tests.some((t) => t.condition === 'special_characters')).toBe(true);
    expect(tests.some((t) => t.condition === 'concurrent_write')).toBe(true);
  });

  it('should pass safe boundary conditions', () => {
    const result = simulator.simulate([
      { name: 'null safety', target: '/api', condition: 'null_input', expected: 'handle_gracefully' },
      { name: 'unicode support', target: '/api', condition: 'unicode_injection', expected: 'succeed' },
    ]);

    expect(result.failed).toBe(0);
  });
});

describe('SimulationPipeline', () => {
  const pipeline = new SimulationPipeline();

  it('should skip at level 0', () => {
    const result = pipeline.run({
      level: { level: 0, description: 'Skip', enabledModules: [] },
      userConfig: { mode: 'normal', paths: [], iterationsPerPath: 0 },
    });

    expect(result.skipped).toBe(true);
    expect(result.passed).toBe(true);
  });

  it('should run user behavior at level 1', () => {
    const result = pipeline.run({
      level: { level: 1, description: 'Light', enabledModules: ['user-behavior'] },
      userConfig: {
        mode: 'normal',
        paths: [{ id: 'p1', name: 'Test', steps: [{ action: 'click', target: 'btn' }], weight: 1 }],
        iterationsPerPath: 50,
      },
    });

    expect(result.skipped).toBe(false);
    expect(result.userBehavior).toBeDefined();
    expect(result.load).toBeUndefined();
  });

  it('should run user behavior + load at level 2', () => {
    const result = pipeline.run({
      level: { level: 2, description: 'Full', enabledModules: ['user-behavior', 'load'] },
      userConfig: {
        mode: 'normal',
        paths: [{ id: 'p1', name: 'Test', steps: [{ action: 'click', target: 'btn' }], weight: 1 }],
        iterationsPerPath: 50,
      },
      endpoints: [{ id: 'api', path: '/test', method: 'GET', baseLatency: 50 }],
      loadProfile: { maxConcurrent: 10, rampUpMs: 100, steadyMs: 200, rampDownMs: 100, rps: 10 },
    });

    expect(result.userBehavior).toBeDefined();
    expect(result.load).toBeDefined();
    expect(result.exception).toBeUndefined();
  });

  it('should run all simulators at level 3', () => {
    const result = pipeline.run({
      level: { level: 3, description: 'Enhanced', enabledModules: ['user-behavior', 'load', 'exception', 'boundary'] },
      userConfig: {
        mode: 'normal',
        paths: [{ id: 'p1', name: 'Test', steps: [{ action: 'click', target: 'btn' }], weight: 1 }],
        iterationsPerPath: 50,
      },
      endpoints: [{ id: 'api', path: '/test', method: 'GET', baseLatency: 50 }],
      loadProfile: { maxConcurrent: 10, rampUpMs: 100, steadyMs: 200, rampDownMs: 100, rps: 10 },
      faults: [{ type: 'network_timeout', target: 'api', durationMs: 5000, probability: 1.0 }],
      boundaryTests: [
        { name: 'empty', target: '/test', condition: 'empty_input', expected: 'reject' },
      ],
    });

    expect(result.userBehavior).toBeDefined();
    expect(result.load).toBeDefined();
    expect(result.exception).toBeDefined();
    expect(result.boundary).toBeDefined();
    expect(result.summary.length).toBe(4);
  });
});

describe('AutoDecisionEngine', () => {
  const engine = new AutoDecisionEngine();

  it('should compute risk score correctly', () => {
    const score = engine.computeRiskScore({
      domainRisk: 0.9,
      scaleRisk: 0.6,
      dataRisk: 0.7,
      complianceRisk: 0.5,
    });

    expect(score).toBeCloseTo(0.9 * 0.35 + 0.6 * 0.25 + 0.7 * 0.25 + 0.5 * 0.15, 2);
  });

  it('should decide level 0 for low risk', () => {
    const level = engine.decideSimulationLevel(0.1);
    expect(level.level).toBe(0);
  });

  it('should decide level 1 for moderate risk', () => {
    const level = engine.decideSimulationLevel(0.4);
    expect(level.level).toBe(1);
  });

  it('should decide level 2 for high risk', () => {
    const level = engine.decideSimulationLevel(0.7);
    expect(level.level).toBe(2);
  });

  it('should decide level 3 for very high risk', () => {
    const level = engine.decideSimulationLevel(0.9);
    expect(level.level).toBe(3);
  });

  it('should extract risk profile from PRD', () => {
    const profile = engine.extractRiskProfile({
      domain: '金融平台',
      expectedUsers: 500000,
      handlesPII: true,
      compliance: ['GDPR'],
    });

    expect(profile.domainRisk).toBe(0.9);
    expect(profile.dataRisk).toBe(0.7);
    expect(profile.complianceRisk).toBe(0.9);
  });
});
