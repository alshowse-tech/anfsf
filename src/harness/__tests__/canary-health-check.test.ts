/**
 * Tests for Canary Health Check Integration
 */

import {
  HttpHealthChecker,
  KpiHealthChecker,
  CompositeHealthChecker,
  createHttpHealthChecker,
  createKpiHealthChecker,
  createCompositeHealthChecker,
} from '../canary-health-check';

describe('HttpHealthChecker', () => {
  it('should create via constructor', () => {
    const checker = new HttpHealthChecker({
      baseUrl: 'http://localhost:3000',
    });
    expect(checker).toBeDefined();
  });

  it('should create via factory', () => {
    const checker = createHttpHealthChecker({
      baseUrl: 'http://localhost:3000',
      path: '/healthz',
    });
    expect(checker).toBeDefined();
  });

  it('should return unhealthy when service is unreachable', async () => {
    const checker = new HttpHealthChecker({
      baseUrl: 'http://localhost:1', // Unlikely to be running
      timeoutMs: 100,
    });

    const result = await checker.checkHealth();
    expect(result.healthy).toBe(false);
    expect(result.checks.some(c => !c.healthy)).toBe(true);
  });

  it('should return simulated metrics when endpoint unavailable', async () => {
    const checker = new HttpHealthChecker({
      baseUrl: 'http://localhost:1',
      timeoutMs: 100,
    });

    const metrics = await checker.collectMetrics();
    expect(metrics).toHaveProperty('error_rate');
    expect(metrics).toHaveProperty('latency_p99');
    expect(metrics).toHaveProperty('success_rate');
    expect(metrics).toHaveProperty('request_count');
    expect(metrics.error_rate).toBeGreaterThanOrEqual(0);
    expect(metrics.success_rate).toBeGreaterThan(0);
  });

  it('should create health check function', () => {
    const checker = new HttpHealthChecker({
      baseUrl: 'http://localhost:1',
      timeoutMs: 100,
    });

    const fn = checker.toHealthCheckFn();
    expect(typeof fn).toBe('function');
  });

  it('should create metrics collector function', () => {
    const checker = new HttpHealthChecker({
      baseUrl: 'http://localhost:1',
      timeoutMs: 100,
    });

    const fn = checker.toMetricsCollectorFn();
    expect(typeof fn).toBe('function');
  });
});

describe('KpiHealthChecker', () => {
  it('should create via constructor', () => {
    const checker = new KpiHealthChecker({
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
      maxLatencyP99: 1000,
      getMetrics: () => ({}),
    });
    expect(checker).toBeDefined();
  });

  it('should create via factory', () => {
    const checker = createKpiHealthChecker({
      maxErrorRate: 0.01,
      minSuccessRate: 0.99,
      maxLatencyP99: 500,
      getMetrics: () => ({}),
    });
    expect(checker).toBeDefined();
  });

  it('should pass when metrics are healthy', () => {
    const checker = new KpiHealthChecker({
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
      maxLatencyP99: 1000,
      getMetrics: () => ({
        error_rate: 0.01,
        success_rate: 0.99,
        latency_p99: 200,
      }),
    });

    const result = checker.check();
    expect(result.healthy).toBe(true);
  });

  it('should fail when error rate is too high', () => {
    const checker = new KpiHealthChecker({
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
      maxLatencyP99: 1000,
      getMetrics: () => ({
        error_rate: 0.10,
        success_rate: 0.90,
        latency_p99: 200,
      }),
    });

    const result = checker.check();
    expect(result.healthy).toBe(false);
    expect(result.checks.find(c => c.name === 'error_rate')?.healthy).toBe(false);
  });

  it('should fail when latency is too high', () => {
    const checker = new KpiHealthChecker({
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
      maxLatencyP99: 1000,
      getMetrics: () => ({
        error_rate: 0.01,
        success_rate: 0.99,
        latency_p99: 2000,
      }),
    });

    const result = checker.check();
    expect(result.healthy).toBe(false);
    expect(result.checks.find(c => c.name === 'latency_p99')?.healthy).toBe(false);
  });

  it('should create health check function', () => {
    const checker = new KpiHealthChecker({
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
      maxLatencyP99: 1000,
      getMetrics: () => ({}),
    });

    const fn = checker.toHealthCheckFn();
    expect(typeof fn).toBe('function');
  });

  it('should create metrics collector function', () => {
    const checker = new KpiHealthChecker({
      maxErrorRate: 0.05,
      minSuccessRate: 0.95,
      maxLatencyP99: 1000,
      getMetrics: () => ({ error_rate: 0.01 }),
    });

    const fn = checker.toMetricsCollectorFn();
    expect(typeof fn).toBe('function');
  });
});

describe('CompositeHealthChecker', () => {
  it('should create via factory', () => {
    const checker = createCompositeHealthChecker();
    expect(checker).toBeDefined();
  });

  it('should be healthy with no checkers', async () => {
    const checker = createCompositeHealthChecker();
    const result = await checker.checkAll();
    expect(result.healthy).toBe(true);
    expect(result.checks).toHaveLength(0);
  });

  it('should be healthy when all checkers pass', async () => {
    const checker = createCompositeHealthChecker();
    checker.add('mock', async () => ({
      healthy: true,
      checks: [{ name: 'mock', healthy: true, latency: 0 }],
      timestamp: Date.now(),
    }));

    const result = await checker.checkAll();
    expect(result.healthy).toBe(true);
  });

  it('should be unhealthy when any checker fails', async () => {
    const checker = createCompositeHealthChecker();
    checker.add('pass', async () => ({
      healthy: true,
      checks: [{ name: 'pass', healthy: true, latency: 0 }],
      timestamp: Date.now(),
    }));
    checker.add('fail', async () => ({
      healthy: false,
      checks: [{ name: 'fail', healthy: false, latency: 0 }],
      timestamp: Date.now(),
    }));

    const result = await checker.checkAll();
    expect(result.healthy).toBe(false);
    expect(result.checks.length).toBe(2);
  });

  it('should handle checker errors gracefully', async () => {
    const checker = createCompositeHealthChecker();
    checker.add('error', async () => {
      throw new Error('Checker failed');
    });

    const result = await checker.checkAll();
    expect(result.healthy).toBe(false);
    expect(result.checks.some(c => !c.healthy)).toBe(true);
  });

  it('should create health check function for CanaryDeployer', () => {
    const checker = createCompositeHealthChecker();
    const fn = checker.toHealthCheckFn();
    expect(typeof fn).toBe('function');
  });
});
