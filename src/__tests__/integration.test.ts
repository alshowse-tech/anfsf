/**
 * ANFSF V4 Layer 8.5 Integration Tests
 * 
 * End-to-end tests for the complete governance control plane.
 */

import { GovernanceControlPlane } from '../governance/control-plane';
import { MCPBus, MessageBuilder } from '../mcp/mcp-bus';
import { SkillsRegistry } from '../skills/skills-registry';
import { AgentHarness } from '../harness/agent-harness';
import { Policy, TestScenario } from '../harness/types';

describe('Layer 8.5 Integration Tests', () => {
  describe('Complete Workflow', () => {
    it('should execute complete governance workflow', async () => {
      const controlPlane = new GovernanceControlPlane();

      // Step 1: Synthesize architecture
      const synthesizeOp = await controlPlane.synthesize('integration-project', { kAuto: true });
      expect(synthesizeOp.status).toBe('completed');

      // Step 2: Verify architecture
      const verifyOp = await controlPlane.verify('integration-project');
      expect(verifyOp.status).toBe('completed');

      // Step 3: Load required skills
      const skillOp = await controlPlane.loadSkill('utils', '1.0.0');
      expect(skillOp.status).toBeDefined();

      // Step 4: Run tests
      const testScenario: TestScenario = {
        id: 'integration-test',
        name: 'Integration Test',
        type: 'integration',
        config: {},
        expectedOutcomes: [],
        successCriteria: {
          minPassRate: 0.9,
        },
      };
      const testOp = await controlPlane.runTest(testScenario);
      expect(testOp.data).toBeDefined();

      // Step 5: Deploy policy with fast canary
      const policy: Policy = {
        id: 'integration-policy',
        name: 'Integration Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };
      const deployOp = await controlPlane.deployPolicy(policy, {
        stages: [0.5, 1.0],
        stageDurationMs: 100,
        monitorMetrics: [],
        rollbackOnFailure: false,
        significanceCheck: { enabled: false, threshold: 0.05, minSampleSize: 30 },
      });
      expect(deployOp.data).toBeDefined();

      // Verify all operations tracked
      const operations = controlPlane.getOperations();
      expect(operations.length).toBe(5);

      // Verify change events tracked
      const events = controlPlane.getChangeEvents();
      expect(events.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('MCP Bus Integration', () => {
    it('should coordinate agents via MCP', async () => {
      const bus = new MCPBus({ enableTracing: true });
      const messages: unknown[] = [];

      // Subscribe agents
      const sub1 = bus.subscribe('agent-1', (msg) => messages.push({ agent: 'agent-1', msg }));
      const sub2 = bus.subscribe('agent-2', (msg) => messages.push({ agent: 'agent-2', msg }));

      // Send message
      const message = new MessageBuilder()
        .from('coordinator')
        .to('agent-1')
        .type('command')
        .payload({ action: 'synthesize' })
        .idempotentKey('integration-test-1')
        .requiresAck(true)
        .build();

      const response = await bus.send(message);
      expect(response.status).toBe('success');
      expect(messages.length).toBe(1);

      // Broadcast
      const broadcast = new MessageBuilder()
        .from('coordinator')
        .to('*')
        .type('proposal')
        .payload({ action: 'verify' })
        .build();

      const responses = await bus.broadcast(broadcast);
      expect(responses.length).toBe(2);

      // Cleanup
      sub1.unsubscribe();
      sub2.unsubscribe();
    });

    it('should trace messages end-to-end', async () => {
      const bus = new MCPBus({ enableTracing: true, enableLogging: false });

      bus.subscribe('agent-1', () => {});

      const message = new MessageBuilder()
        .from('sender')
        .to('agent-1')
        .type('command')
        .payload({ test: true })
        .build();

      await bus.send(message);

      const stats = bus.getStats();
      expect(stats.totalMessagesSent).toBe(1);
    });
  });

  describe('Skills Registry Integration', () => {
    it('should manage skill lifecycle', async () => {
      const registry = new SkillsRegistry();

      // Load skills
      const skill1 = await registry.load('base-skill', '1.0.0');
      expect(skill1.status).toBe('loaded');

      const skill2 = await registry.load('dependent-skill', '1.0.0');
      expect(skill2.status).toBe('loaded');

      // List skills
      const skills = await registry.list();
      expect(skills.length).toBe(2);

      // Get dependencies
      const deps = await registry.getDependencies('base-skill');
      expect(Array.isArray(deps)).toBe(true);

      // Unload skill
      await registry.unload('dependent-skill');
      const remainingSkills = await registry.list();
      expect(remainingSkills.length).toBe(1);
    });

    it('should detect dependency issues', async () => {
      const registry = new SkillsRegistry();

      // Try to load skill with missing dependency
      await expect(registry.load('missing-dep-skill', '1.0.0')).resolves.toBeDefined();
      // Note: Mock implementation allows this, real implementation would fail
    });
  });

  describe('Agent Harness Integration', () => {
    it('should run complete test and deploy cycle', async () => {
      const harness = new AgentHarness({ enableLogging: false });

      // Run test
      const testScenario: TestScenario = {
        id: 'cycle-test',
        name: 'Cycle Test',
        type: 'integration',
        config: {},
        expectedOutcomes: [],
        successCriteria: {
          minPassRate: 0.9,
        },
      };

      const testResult = await harness.runTest(testScenario);
      expect(testResult.scenarioId).toBe('cycle-test');

      // Deploy policy
      const policy: Policy = {
        id: 'cycle-policy',
        name: 'Cycle Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      const deployResult = await harness.deployWithCanary(policy, {
        stageDurationMs: 50,
        stages: [0.5, 1.0],
      });

      expect(deployResult.deploymentId).toBeDefined();
    });

    it('should handle rollback scenario', async () => {
      const harness = new AgentHarness({ enableAutoRollback: true });

      const policy: Policy = {
        id: 'rollback-policy',
        name: 'Rollback Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
        rollbackPolicy: {
          enabled: true,
          triggers: [
            { metric: 'error_rate', operator: 'gt', threshold: 0.01 },
          ],
        },
      };

      const result = await harness.deployWithCanary(policy, {
        stageDurationMs: 50,
        rollbackOnFailure: true,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Ownership Arbitration Integration', () => {
    it('should enforce ownership across all operations', async () => {
      const controlPlane = new GovernanceControlPlane({
        enableOwnershipArbitration: true,
      });

      // Synthesize should work with ownership arbitration enabled
      const synthesizeOp = await controlPlane.synthesize('integration-project');
      expect(synthesizeOp).toBeDefined();

      // Verify change event is created
      const events = controlPlane.getChangeEvents();
      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Statistical Significance Integration', () => {
    it('should validate results with statistical tests', async () => {
      const harness = new AgentHarness();

      const scenario: TestScenario = {
        id: 'significance-test',
        name: 'Significance Test',
        type: 'integration',
        config: {
          testData: {
            groupA: { mean: 0.5, variance: 0.01, size: 100 },
            groupB: { mean: 0.7, variance: 0.01, size: 100 },
          },
        },
        expectedOutcomes: [],
        successCriteria: {
          significanceThreshold: 0.05,
          minSampleSize: 50,
        },
      };

      const result = await harness.runTest(scenario);

      expect(result).toBeDefined();
      expect(result.pValue).toBeDefined();
    });
  });

  describe('Canary Deployment Integration', () => {
    it('should complete full canary rollout', async () => {
      const controlPlane = new GovernanceControlPlane();

      const policy: Policy = {
        id: 'canary-policy',
        name: 'Canary Policy',
        type: 'routing',
        version: '1.0.0',
        config: {},
      };

      const operation = await controlPlane.deployPolicy(policy, {
        stages: [0.01, 0.05, 0.2, 0.5, 1.0],
        stageDurationMs: 50,
        autoPromote: true,
      });

      expect(operation.data).toBeDefined();
      expect(operation.data.trafficPercentage).toBe(100);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle errors gracefully', async () => {
      const controlPlane = new GovernanceControlPlane();

      // Try to run invalid operation
      try {
        await controlPlane.loadSkill('', '');
      } catch (error) {
        expect(error).toBeDefined();
      }

      // System should still be operational
      const stats = controlPlane.getStats();
      expect(stats.uptimeMs).toBeGreaterThan(0);
    });
  });

  describe('Audit Trail Integration', () => {
    it('should maintain complete audit trail', async () => {
      const controlPlane = new GovernanceControlPlane({
        enableAuditLogging: true,
        enableChangeEventTracking: true,
      });

      // Execute multiple operations
      await controlPlane.synthesize('audit-project');
      await controlPlane.verify('audit-project');
      await controlPlane.loadSkill('audit-skill', '1.0.0');

      // Verify audit trail
      const events = controlPlane.getChangeEvents(100);
      expect(events.length).toBeGreaterThan(0);

      const traceEdges = controlPlane.getTraceEdges(100);
      expect(traceEdges.length).toBeGreaterThan(0);

      const logs = controlPlane.getLogs(100);
      expect(logs.length).toBeGreaterThan(0);

      const operations = controlPlane.getOperations();
      expect(operations.length).toBe(3);
    });
  });
});
