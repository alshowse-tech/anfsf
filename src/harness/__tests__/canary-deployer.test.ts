/**
 * Canary Deployer Tests
 */

import { CanaryDeployer } from '../canary-deployer';

describe('CanaryDeployer', () => {
  let deployer: CanaryDeployer;

  beforeEach(() => {
    deployer = new CanaryDeployer({
      stages: [0.1, 0.5, 1.0],
      stageDurationMs: 50,
    });
  });

  describe('Deploy', () => {
    it('should complete deployment successfully', async () => {
      const policy = {
        id: 'policy-1',
        name: 'Test Policy',
        type: 'routing' as const,
        version: '1.0.0',
        config: {},
      };

      const metricsCollector = async () => ({
        error_rate: 0.01,
        latency_p99: 200,
        success_rate: 0.99,
      });

      const healthCheck = async () => true;

      const result = await deployer.deploy(policy, metricsCollector, healthCheck);

      expect(result.deploymentId).toBeDefined();
      expect(result.status).toBe('complete');
      expect(result.trafficPercentage).toBe(100);
    });

    it('should rollback on health check failure', async () => {
      const policy = {
        id: 'policy-2',
        name: 'Failing Policy',
        type: 'routing' as const,
        version: '1.0.0',
        config: {},
      };

      const metricsCollector = async () => ({
        error_rate: 0.01,
        latency_p99: 200,
        success_rate: 0.99,
      });

      const healthCheck = async () => false; // Always fail

      const result = await deployer.deploy(policy, metricsCollector, healthCheck);

      expect(result.status).toBe('rolled_back');
      expect(result.rollbackInfo?.triggered).toBe(true);
    });

    it('should rollback on metrics threshold exceeded', async () => {
      const policy = {
        id: 'policy-3',
        name: 'High Error Policy',
        type: 'routing' as const,
        version: '1.0.0',
        config: {},
      };

      const metricsCollector = async () => ({
        error_rate: 0.15, // Above 0.05 threshold
        latency_p99: 200,
        success_rate: 0.85,
      });

      const healthCheck = async () => true;

      const result = await deployer.deploy(policy, metricsCollector, healthCheck);

      expect(result.status).toBe('rolled_back');
    });

    it('should handle deployment errors', async () => {
      const policy = {
        id: 'policy-4',
        name: 'Error Policy',
        type: 'routing' as const,
        version: '1.0.0',
        config: {},
      };

      const metricsCollector = async () => {
        throw new Error('Metrics collection failed');
      };

      const healthCheck = async () => true;

      const result = await deployer.deploy(policy, metricsCollector, healthCheck);

      expect(result.status).toBe('failed');
      expect(result.rollbackInfo).toBeDefined();
    });
  });

  describe('Configuration', () => {
    it('should use custom stages', async () => {
      const customDeployer = new CanaryDeployer({
        stages: [0.01, 0.05, 0.2, 0.5, 1.0],
        stageDurationMs: 100,
      });

      const policy = {
        id: 'policy-5',
        name: 'Custom Stages Policy',
        type: 'routing' as const,
        version: '1.0.0',
        config: {},
      };

      const metricsCollector = async () => ({
        error_rate: 0.01,
        latency_p99: 200,
        success_rate: 0.99,
      });

      const healthCheck = async () => true;

      const result = await customDeployer.deploy(policy, metricsCollector, healthCheck);

      expect(result.currentStage).toBe(5); // 5 stages
    });

    it('should use default configuration', () => {
      const defaultDeployer = new CanaryDeployer();
      expect(defaultDeployer).toBeDefined();
    });
  });

  describe('Metrics Health Check', () => {
    it('should pass health check with good metrics', async () => {
      const policy = {
        id: 'policy-6',
        name: 'Good Metrics Policy',
        type: 'routing' as const,
        version: '1.0.0',
        config: {},
      };

      const metricsCollector = async () => ({
        error_rate: 0.01, // Below 0.05 threshold
        latency_p99: 500, // Below 1000 threshold
        success_rate: 0.98, // Above 0.95 threshold
      });

      const healthCheck = async () => true;

      const result = await deployer.deploy(policy, metricsCollector, healthCheck);

      expect(result.status).toBe('complete');
    });
  });
});
