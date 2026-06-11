import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AgentOS } from '../agent-os';
import { createAgentOS } from '../agent-os-factory';
import { OrchestrationHarness } from '../../harness/orchestration-harness';
import { MCPBus } from '../../mcp/mcp-bus';
import { getDefaultAgentOS, resetDefaultAgentOS } from '../agent-os-factory';

describe('AgentOS Integration Tests', () => {
  let agentOS: AgentOS;
  let orchestrationHarness: OrchestrationHarness;

  beforeEach(async () => {
    agentOS = createAgentOS({ enableHealthMonitoring: false });
    const bus = new MCPBus({ enableLogging: false });
    agentOS.setMCPBus(bus);
    orchestrationHarness = new OrchestrationHarness();

    await agentOS.start();
    orchestrationHarness.setAgentOS(agentOS);
  });

  afterEach(() => {
    agentOS.dispose();
    resetDefaultAgentOS();
  });

  it('should register agents in both AgentOS and OrchestrationHarness', () => {
    orchestrationHarness.registerAgent('architect-agent', {
      name: 'Architect',
      capabilities: [{ name: 'architecture', version: '1.0.0' }],
    });

    expect(orchestrationHarness.getActiveAgentCount()).toBe(1);

    const agentEntry = agentOS.getAgent('architect-agent');
    expect(agentEntry).not.toBeNull();
    expect(agentEntry!.name).toBe('Architect');
    expect(agentEntry!.capabilities.length).toBe(1);
  });

  it('should use AgentOS MCPBus for communication', async () => {
    const bus = agentOS.getMCPBus()!;
    const received: any[] = [];
    bus.subscribe('listener', (msg) => received.push(msg));

    await agentOS.delegateTask('sender', 'listener', {
      taskId: 'integration-task',
      type: 'test',
      input: { message: 'hello' },
    });

    expect(received.length).toBeGreaterThanOrEqual(1);
  });

  it('should support multi-agent delegation', async () => {
    agentOS.registerAgent({ id: 'sender', name: 'Sender' });
    agentOS.registerAgent({ id: 'worker-1', name: 'Worker 1' });
    agentOS.registerAgent({ id: 'worker-2', name: 'Worker 2' });

    const responses = await agentOS.delegateToMany('sender', ['worker-1', 'worker-2'], {
      taskId: 'multi-task',
      type: 'parallel',
      input: { data: 'process this' },
    });

    expect(responses.length).toBe(2);
  });

  it('should track memory across task executions', () => {
    agentOS.registerAgent({ id: 'agent-1', name: 'A1' });

    agentOS.storeMemory('agent-1', {
      type: 'episodic',
      content: { task: 'build-api', outcome: 'success' },
      tags: ['task:api'],
    });

    agentOS.storeMemory('agent-1', {
      type: 'semantic',
      content: { pattern: 'REST best practices' },
      importance: 0.8,
    });

    const episodic = agentOS.retrieveMemory('agent-1', { type: 'episodic' });
    const semantic = agentOS.retrieveMemory('agent-1', { type: 'semantic' });

    expect(episodic.length).toBe(1);
    expect(semantic.length).toBe(1);
  });

  it('should consolidate memories after tasks', async () => {
    agentOS.registerAgent({ id: 'agent-1', name: 'A1' });

    agentOS.storeMemory('agent-1', {
      type: 'episodic',
      content: { task: 'test-task', outcome: 'done' },
      tags: ['task:test'],
    });

    const result = await agentOS.consolidateMemories('agent-1');
    expect(result.consolidatedCount).toBeGreaterThanOrEqual(0);
  });

  it('should maintain health monitoring during operations', () => {
    agentOS.registerAgent({ id: 'agent-1', name: 'A1' });
    agentOS.recordHeartbeat('agent-1', { memoryMB: 256 });

    const health = agentOS.getHealthStatus('agent-1');
    expect(health).not.toBeNull();
    expect(health!.health).toBe('healthy');
    expect(health!.missedHeartbeats).toBe(0);
  });

  it('should get overall system health', () => {
    agentOS.registerAgent({ id: 'a1', name: 'A1' });
    agentOS.registerAgent({ id: 'a2', name: 'A2' });
    agentOS.registerAgent({ id: 'a3', name: 'A3' });

    const health = agentOS.getOverallHealth();
    expect(health.size).toBe(3);
  });

  it('should return accurate metrics', async () => {
    agentOS.registerAgent({ id: 'a1', name: 'A1' });
    agentOS.registerAgent({ id: 'a2', name: 'A2' });
    agentOS.storeMemory('a1', { type: 'working', content: {} });

    const metrics = agentOS.getMetrics();
    expect(metrics.totalAgents).toBe(2);
    expect(metrics.totalMemories).toBe(1);
  });

  it('should handle full lifecycle: start -> register -> task -> stop', async () => {
    agentOS.registerAgent({ id: 'worker', name: 'Worker' });
    agentOS.registerAgent({ id: 'coordinator', name: 'Coordinator' });

    agentOS.storeMemory('worker', {
      type: 'episodic',
      content: { task: 'full-lifecycle-test' },
    });

    await agentOS.delegateTask('coordinator', 'worker', {
      taskId: 'lifecycle-task',
      type: 'lifecycle-test',
      input: {},
    });

    await agentOS.stop();
    expect(agentOS.getState()).toBe('stopped');
  });

  describe('singleton pattern', () => {
    it('should return same instance from getDefaultAgentOS', () => {
      const os1 = getDefaultAgentOS();
      const os2 = getDefaultAgentOS();
      expect(os1).toBe(os2);
    });

    it('should create new instance after reset', () => {
      const os1 = getDefaultAgentOS();
      resetDefaultAgentOS();
      const os2 = getDefaultAgentOS();
      expect(os1).not.toBe(os2);
    });
  });

  describe('capability-based routing', () => {
    it('should find agents by capability for task delegation', () => {
      agentOS.registerAgent({
        id: 'coder',
        name: 'Coder',
        capabilities: [{ name: 'code-gen', version: '1.0.0' }],
      });
      agentOS.registerAgent({
        id: 'tester',
        name: 'Tester',
        capabilities: [{ name: 'test-gen', version: '1.0.0' }],
      });

      const coders = agentOS.listAgentsByCapability('code-gen');
      expect(coders.length).toBe(1);
      expect(coders[0].id).toBe('coder');
    });
  });
});
