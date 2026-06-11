import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AgentOS } from '../agent-os';
import { MCPBus } from '../../mcp/mcp-bus';
import { resetDefaultAgentOS } from '../agent-os-factory';

describe('AgentOS', () => {
  let agentOS: AgentOS;
  let bus: MCPBus;

  beforeEach(() => {
    agentOS = new AgentOS({ enableHealthMonitoring: false });
    bus = new MCPBus({ enableLogging: false });
    agentOS.setMCPBus(bus);
    jest.useFakeTimers();
  });

  afterEach(() => {
    agentOS.dispose();
    resetDefaultAgentOS();
    jest.useRealTimers();
  });

  describe('lifecycle', () => {
    it('should start in stopped state', () => {
      expect(agentOS.getState()).toBe('stopped');
    });

    it('should start successfully', async () => {
      await agentOS.start();
      expect(agentOS.getState()).toBe('running');
    });

    it('should stop successfully', async () => {
      await agentOS.start();
      await agentOS.stop();
      expect(agentOS.getState()).toBe('stopped');
    });
  });

  describe('agent management', () => {
    beforeEach(async () => {
      await agentOS.start();
    });

    it('should register an agent', () => {
      const entry = agentOS.registerAgent({
        id: 'agent-1',
        name: 'Test Agent',
        capabilities: [{ name: 'code-gen', version: '1.0.0' }],
      });

      expect(entry.id).toBe('agent-1');
      expect(entry.name).toBe('Test Agent');
      expect(entry.state).toBe('idle');
    });

    it('should set agent to idle on registration', () => {
      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });
      expect(agentOS.getAgentState('agent-1')).toBe('idle');
    });

    it('should unregister an agent', () => {
      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });
      expect(agentOS.unregisterAgent('agent-1')).toBe(true);
      expect(agentOS.getAgent('agent-1')).toBeNull();
    });

    it('should return null for unknown agent', () => {
      expect(agentOS.getAgent('unknown')).toBeNull();
    });

    it('should list all agents', () => {
      agentOS.registerAgent({ id: 'a1', name: 'A1' });
      agentOS.registerAgent({ id: 'a2', name: 'A2' });
      expect(agentOS.listAgents().length).toBe(2);
    });

    it('should list agents by state', () => {
      agentOS.registerAgent({ id: 'a1', name: 'A1' });
      agentOS.registerAgent({ id: 'a2', name: 'A2' });
      agentOS.transitionAgentState('a1', 'working', 'task');

      const working = agentOS.listAgentsByState('working');
      expect(working.length).toBe(1);
      expect(working[0].id).toBe('a1');
    });

    it('should list agents by capability', () => {
      agentOS.registerAgent({
        id: 'coder',
        name: 'Coder',
        capabilities: [{ name: 'code-gen', version: '1.0.0' }],
      });
      agentOS.registerAgent({ id: 'other', name: 'Other' });

      const coders = agentOS.listAgentsByCapability('code-gen');
      expect(coders.length).toBe(1);
      expect(coders[0].id).toBe('coder');
    });

    it('should reject registration beyond max agents limit', () => {
      const limitedOS = new AgentOS({ maxAgents: 1, enableHealthMonitoring: false });
      limitedOS.setMCPBus(new MCPBus({ enableLogging: false }));
      limitedOS.start();

      limitedOS.registerAgent({ id: 'a1', name: 'A1' });
      expect(() => limitedOS.registerAgent({ id: 'a2', name: 'A2' })).toThrow(
        'Maximum agents limit reached'
      );
    });
  });

  describe('state transitions', () => {
    beforeEach(async () => {
      await agentOS.start();
      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });
    });

    it('should transition agent state', () => {
      expect(agentOS.transitionAgentState('agent-1', 'working', 'task assigned')).toBe(true);
      expect(agentOS.getAgentState('agent-1')).toBe('working');
    });

    it('should reject invalid transitions', () => {
      expect(agentOS.transitionAgentState('agent-1', 'blocked', 'direct block')).toBe(false);
    });

    it('should return null for unknown agent state', () => {
      expect(agentOS.getAgentState('unknown')).toBeNull();
    });
  });

  describe('task delegation', () => {
    beforeEach(async () => {
      await agentOS.start();
      agentOS.registerAgent({ id: 'sender', name: 'Sender' });
      agentOS.registerAgent({ id: 'receiver', name: 'Receiver' });
    });

    it('should delegate a task', async () => {
      const response = await agentOS.delegateTask('sender', 'receiver', {
        taskId: 'task-1',
        type: 'test',
        input: { data: 'hello' },
      });

      expect(response.status).toBe('success');
    });
  });

  describe('memory', () => {
    beforeEach(async () => {
      await agentOS.start();
      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });
    });

    it('should store memory', () => {
      const memory = agentOS.storeMemory('agent-1', {
        type: 'working',
        content: { key: 'value' },
      });

      expect(memory.id).toBeDefined();
      expect(memory.agentId).toBe('agent-1');
    });

    it('should retrieve memory', () => {
      agentOS.storeMemory('agent-1', { type: 'working', content: { a: 1 } });
      const memories = agentOS.retrieveMemory('agent-1', { type: 'working' });
      expect(memories.length).toBe(1);
    });

    it('should search memory', () => {
      agentOS.storeMemory('agent-1', { type: 'working', content: { query: 'sorting' } });
      const results = agentOS.searchMemory('agent-1', 'sorting');
      expect(results.length).toBe(1);
    });

    it('should get memory stats', () => {
      agentOS.storeMemory('agent-1', { type: 'working', content: {} });
      agentOS.storeMemory('agent-1', { type: 'episodic', content: {} });

      const stats = agentOS.getMemoryStats('agent-1');
      expect(stats.working).toBe(1);
      expect(stats.episodic).toBe(1);
    });

    it('should consolidate memories', async () => {
      agentOS.storeMemory('agent-1', {
        type: 'episodic',
        content: { task: 'test' },
        tags: ['task:consolid-test'],
      });

      const result = await agentOS.consolidateMemories('agent-1');
      expect(result.consolidatedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('health', () => {
    beforeEach(async () => {
      await agentOS.start();
      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });
    });

    it('should get health status', () => {
      const health = agentOS.getHealthStatus('agent-1');
      expect(health).not.toBeNull();
      expect(health!.health).toBe('healthy');
    });

    it('should get overall health', () => {
      const health = agentOS.getOverallHealth();
      expect(health.size).toBeGreaterThanOrEqual(1);
    });

    it('should record heartbeat', () => {
      agentOS.recordHeartbeat('agent-1', { memoryMB: 128 });
      const health = agentOS.getHealthStatus('agent-1');
      expect(health!.missedHeartbeats).toBe(0);
    });
  });

  describe('events', () => {
    beforeEach(async () => {
      await agentOS.start();
    });

    it('should emit registration events', () => {
      const events: any[] = [];
      agentOS.onEvent((e) => events.push(e));

      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });

      const registered = events.find(e => e.type === 'agent:registered');
      expect(registered).toBeDefined();
      expect(registered.agentId).toBe('agent-1');
    });

    it('should emit state change events', () => {
      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });

      const events: any[] = [];
      agentOS.onEvent((e) => events.push(e));

      agentOS.transitionAgentState('agent-1', 'working', 'task');

      const stateChange = events.find(e => e.type === 'agent:state_changed');
      expect(stateChange).toBeDefined();
    });

    it('should unsubscribe from events', () => {
      const events: any[] = [];
      const unsub = agentOS.onEvent((e) => events.push(e));
      unsub();

      agentOS.registerAgent({ id: 'agent-2', name: 'A2' });
      expect(events.length).toBe(0);
    });
  });

  describe('metrics', () => {
    beforeEach(async () => {
      await agentOS.start();
      agentOS.registerAgent({ id: 'agent-1', name: 'A1' });
      agentOS.registerAgent({ id: 'agent-2', name: 'A2' });
    });

    it('should return metrics', () => {
      const metrics = agentOS.getMetrics();

      expect(metrics.totalAgents).toBe(2);
      expect(metrics.activeAgents).toBeGreaterThanOrEqual(0);
      expect(metrics.totalMemories).toBe(0);
      expect(metrics.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('MCP Bus access', () => {
    it('should return the MCP bus', async () => {
      await agentOS.start();
      expect(agentOS.getMCPBus()).toBe(bus);
    });

    it('should return coordination protocol', async () => {
      await agentOS.start();
      expect(agentOS.getCoordination()).not.toBeNull();
    });
  });
});
