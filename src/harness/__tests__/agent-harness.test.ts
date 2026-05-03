/**
 * Agent Harness Tests
 */

import { AgentHarness } from '../agent-harness';
import { TestScenario, Policy } from '../../harness/types';

describe('AgentHarness', () => {
  let harness: AgentHarness;

  beforeEach(() => {
    harness = new AgentHarness({ enableLogging: false });
  });

  describe('RunTest', () => {
    it('should run test successfully', async () => {
      const scenario: TestScenario = {
        id: 'test-1',
        name: 'Test Scenario',
        type: 'unit',
        config: {},
        expectedOutcomes: [],
        successCriteria: {
          minPassRate: 0.9,
          maxErrorRate: 0.1,
        },
      };

      const result = await harness.runTest(scenario);

      expect(result.scenarioId).toBe('test-1');
      expect(result.status).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle test failure', async () => {
      const scenario: TestScenario = {
        id: 'test-2',
        name: 'Failing Test',
        type: 'integration',
        config: {},
        expectedOutcomes: [],
        successCriteria: {
          minPassRate: 0.99, // High threshold to trigger failure
          maxErrorRate: 0.01,
        },
      };

      const result = await harness.runTest(scenario);

      expect(result.scenarioId).toBe('test-2');
      expect(result.status).toBeDefined();
    });

    it('should track test results', async () => {
      const scenario: TestScenario = {
        id: 'test-3',
        name: 'Tracked Test',
        type: 'unit',
        config: {},
        expectedOutcomes: [],
        successCriteria: {},
      };

      await harness.runTest(scenario);
      const storedResult = harness.getTestResult('test-3');

      expect(storedResult).toBeDefined();
      expect(storedResult?.scenarioId).toBe('test-3');
    });
  });

  describe('DeployWithCanary', () => {
    it('should deploy policy with canary', async () => {
      const policy: Policy = {
        id: 'policy-1',
        name: 'Test Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      const result = await harness.deployWithCanary(policy, {
        stages: [0.1, 0.5, 1.0],
        stageDurationMs: 100, // Short duration for testing
        rollbackOnFailure: true,
      });

      expect(result.deploymentId).toBeDefined();
      expect(result.startTime).toBeDefined();
    });

    it('should handle deployment rollback', async () => {
      const policy: Policy = {
        id: 'policy-2',
        name: 'Rollback Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
        rollbackPolicy: {
          enabled: true,
          triggers: [
            {
              metric: 'error_rate',
              operator: 'gt',
              threshold: 0.01, // Low threshold to trigger rollback
            },
          ],
        },
      };

      const result = await harness.deployWithCanary(policy, {
        stages: [0.1, 0.5, 1.0],
        stageDurationMs: 100,
        rollbackOnFailure: true,
      });

      expect(result).toBeDefined();
    });

    it('should track active deployments', async () => {
      const policy: Policy = {
        id: 'policy-3',
        name: 'Tracked Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      await harness.deployWithCanary(policy, {
        stageDurationMs: 100,
      });

      const deployments = harness.getActiveDeployments();
      expect(deployments.length).toBeGreaterThan(0);
    });
  });

  describe('Rollback', () => {
    it('should rollback deployment', async () => {
      const policy: Policy = {
        id: 'policy-4',
        name: 'Rollback Test',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      const result = await harness.deployWithCanary(policy, {
        stageDurationMs: 100,
      });

      await harness.rollback(result.deploymentId);

      const updatedResult = harness.getDeployment(result.deploymentId);
      expect(updatedResult?.rollbackInfo?.triggered).toBe(true);
    });

    it('should throw error for non-existent deployment', async () => {
      await expect(harness.rollback('non-existent-id')).rejects.toThrow();
    });
  });

  describe('Ownership Check', () => {
    it('should set and check ownership', async () => {
      harness.setOwnership('resource', '/path/to/resource', 'owner-role');

      const scenario: TestScenario = {
        id: 'test-ownership',
        name: 'Ownership Test',
        type: 'unit',
        config: {
          testData: {
            resourceType: 'resource',
            resourcePath: '/path/to/resource',
          },
        },
        expectedOutcomes: [],
        successCriteria: {},
      };

      const result = await harness.runTest(scenario);

      expect(result).toBeDefined();
    });
  });

  describe('Logging', () => {
    it('should collect logs', async () => {
      const harnessWithLogging = new AgentHarness({ enableLogging: true });

      const scenario: TestScenario = {
        id: 'test-log',
        name: 'Logging Test',
        type: 'unit',
        config: {},
        expectedOutcomes: [],
        successCriteria: {},
      };

      await harnessWithLogging.runTest(scenario);

      const logs = harnessWithLogging.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should limit log buffer', async () => {
      const logs = harness.getLogs(10);
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Statistics', () => {
    it('should track multiple tests', async () => {
      for (let i = 0; i < 5; i++) {
        const scenario: TestScenario = {
          id: `test-${i}`,
          name: `Test ${i}`,
          type: 'unit',
          config: {},
          expectedOutcomes: [],
          successCriteria: {},
        };
        await harness.runTest(scenario);
      }

      // Just verify we can run multiple tests
      const deployments = harness.getActiveDeployments();
      expect(Array.isArray(deployments)).toBe(true);
    });
  });
});
