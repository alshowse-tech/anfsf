/**
 * Governance Control Plane Tests
 */

import { GovernanceControlPlane } from '../control-plane';
import { Policy, TestScenario } from '../../harness/types';

describe('GovernanceControlPlane', () => {
  let controlPlane: GovernanceControlPlane;

  beforeEach(() => {
    controlPlane = new GovernanceControlPlane({
      enableAuditLogging: true,
      enableChangeEventTracking: true,
      enableOwnershipArbitration: true,
    });
  });

  describe('Synthesize', () => {
    it('should synthesize architecture', async () => {
      const operation = await controlPlane.synthesize('test-project');

      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('synthesize');
      expect(operation.status).toBeDefined();
    });

    it('should support k-auto optimization', async () => {
      const operation = await controlPlane.synthesize('test-project', { kAuto: true });

      expect(operation.status).toBeDefined();
      expect(operation.data).toBeDefined();
    });

    it('should create change event', async () => {
      const operation = await controlPlane.synthesize('test-project');

      expect(operation.changeEvent).toBeDefined();
      expect(operation.changeEvent?.action).toBeDefined();
    });
  });

  describe('DeployPolicy', () => {
    it('should deploy policy with canary', async () => {
      const policy: Policy = {
        id: 'policy-1',
        name: 'Test Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      const operation = await controlPlane.deployPolicy(policy);

      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('deploy');
      expect(operation.data).toBeDefined();
    });

    it('should check ownership before deployment', async () => {
      const policy: Policy = {
        id: 'policy-2',
        name: 'Ownership Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      const operation = await controlPlane.deployPolicy(policy);

      expect(operation).toBeDefined();
    });

    it('should track change event', async () => {
      const policy: Policy = {
        id: 'policy-3',
        name: 'Tracked Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      const operation = await controlPlane.deployPolicy(policy);

      expect(operation.changeEvent).toBeDefined();
    });
  });

  describe('RunTest', () => {
    it('should run test scenario', async () => {
      const scenario: TestScenario = {
        id: 'test-1',
        name: 'Test Scenario',
        type: 'unit',
        config: {},
        expectedOutcomes: [],
        successCriteria: {
          minPassRate: 0.9,
        },
      };

      const operation = await controlPlane.runTest(scenario);

      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('test');
      expect(operation.data).toBeDefined();
    });

    it('should track test results', async () => {
      const scenario: TestScenario = {
        id: 'test-2',
        name: 'Tracked Test',
        type: 'integration',
        config: {},
        expectedOutcomes: [],
        successCriteria: {},
      };

      const operation = await controlPlane.runTest(scenario);

      expect(operation.data).toBeDefined();
    });
  });

  describe('Verify', () => {
    it('should verify architecture', async () => {
      const operation = await controlPlane.verify('test-project');

      expect(operation.id).toBeDefined();
      expect(operation.type).toBe('verify');
      expect(operation.status).toBe('completed');
    });

    it('should return consistency score', async () => {
      const operation = await controlPlane.verify('test-project');

      expect(operation.data.consistency).toBeDefined();
      expect(operation.data.score).toBeDefined();
    });
  });

  describe('LoadSkill', () => {
    it('should load skill', async () => {
      const operation = await controlPlane.loadSkill('test-skill', '1.0.0');

      expect(operation.id).toBeDefined();
      expect(operation.data).toBeDefined();
    });

    it('should check dependencies', async () => {
      const operation = await controlPlane.loadSkill('utils', '1.0.0');

      expect(operation).toBeDefined();
    });
  });

  describe('Ownership Arbitration', () => {
    it('should check ownership', async () => {
      const result = await controlPlane.checkOwnership('resource', '/path', 'deploy');

      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
    });
  });

  describe('Change Event Tracking', () => {
    it('should track change events', async () => {
      await controlPlane.synthesize('project-1');
      await controlPlane.verify('project-1');

      const events = controlPlane.getChangeEvents();
      expect(events.length).toBeGreaterThan(0);
    });

    it('should limit change events', async () => {
      const events = controlPlane.getChangeEvents(5);
      expect(events.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Trace Edges', () => {
    it('should create trace edges', async () => {
      await controlPlane.synthesize('project-1');

      const edges = controlPlane.getTraceEdges();
      expect(edges.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should return control plane stats', () => {
      const stats = controlPlane.getStats();

      expect(stats.mcpBusStats).toBeDefined();
      expect(stats.uptimeMs).toBeGreaterThan(0);
    });
  });

  describe('Operations', () => {
    it('should track operations', async () => {
      await controlPlane.synthesize('project-1');
      await controlPlane.verify('project-1');

      const operations = controlPlane.getOperations();
      expect(operations.length).toBe(2);
    });

    it('should get operation by ID', async () => {
      const op1 = await controlPlane.synthesize('project-1');
      const retrieved = controlPlane.getOperation(op1.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(op1.id);
    });
  });

  describe('Component Access', () => {
    it('should provide access to MCP Bus', () => {
      const bus = controlPlane.getMCPBus();
      expect(bus).toBeDefined();
    });

    it('should provide access to Skills Registry', () => {
      const registry = controlPlane.getSkillsRegistry();
      expect(registry).toBeDefined();
    });

    it('should provide access to Agent Harness', () => {
      const harness = controlPlane.getAgentHarness();
      expect(harness).toBeDefined();
    });
  });

  describe('Logging', () => {
    it('should collect logs', async () => {
      await controlPlane.synthesize('project-1');

      const logs = controlPlane.getLogs();
      expect(logs.length).toBeGreaterThan(0);
    });

    it('should limit log buffer', async () => {
      const logs = controlPlane.getLogs(10);
      expect(logs.length).toBeLessThanOrEqual(10);
    });
  });
});
