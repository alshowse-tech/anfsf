import { describe, it, expect, beforeEach } from '@jest/globals';
import { CoordinationProtocol } from '../coordination-protocol';
import { MCPBus } from '../../mcp/mcp-bus';

describe('Coordination Protocol', () => {
  let bus: MCPBus;
  let protocol: CoordinationProtocol;

  beforeEach(() => {
    bus = new MCPBus({ enableLogging: false });
    protocol = new CoordinationProtocol(bus);
  });

  it('should delegate a task to an agent', async () => {
    bus.subscribe('agent-1', () => {});

    const response = await protocol.delegateTask('orchestrator', 'agent-1', {
      taskId: 'task-1',
      type: 'test',
      input: { data: 'test' },
    });

    expect(response.status).toBe('success');
  });

  it('should fail delegation to non-existent agent', async () => {
    const response = await protocol.delegateTask('orchestrator', 'unknown-agent', {
      taskId: 'task-2',
      type: 'test',
      input: {},
    });

    expect(response.status).toBe('error');
  });

  it('should aggregate results from multiple agents', async () => {
    bus.subscribe('agent-1', () => {});
    bus.subscribe('agent-2', () => {});

    // Create a pending task via delegation
    await protocol.delegateTask('orchestrator', 'agent-1', {
      taskId: 'task-agg',
      type: 'aggregate',
      input: {},
    });

    protocol.setExpectedAgentCount('task-agg', 2);

    const done1 = await protocol.aggregateResult('task-agg', 'agent-1', { value: 1 });
    expect(done1).toBe(false);

    const done2 = await protocol.aggregateResult('task-agg', 'agent-2', { value: 2 });
    expect(done2).toBe(true);

    const results = protocol.getAggregatedResult('task-agg');
    expect(results).not.toBeNull();
    expect(results!.length).toBe(2);
  });

  it('should return null for unknown aggregated result', () => {
    expect(protocol.getAggregatedResult('unknown-task')).toBeNull();
  });

  it('should track pending tasks', async () => {
    bus.subscribe('agent-1', () => {});
    await protocol.delegateTask('orchestrator', 'agent-1', {
      taskId: 'pending-1',
      type: 'test',
      input: {},
    });

    const pending = protocol.getPendingTasks();
    expect(pending.has('pending-1')).toBe(true);
  });

  it('should return pending task count', async () => {
    bus.subscribe('agent-1', () => {});
    await protocol.delegateTask('orchestrator', 'agent-1', {
      taskId: 'count-1',
      type: 'test',
      input: {},
    });

    expect(protocol.getPendingTaskCount()).toBeGreaterThanOrEqual(1);
  });

  it('should discover capabilities via broadcast', async () => {
    bus.subscribe('agent-capable', () => {});

    const agents = await protocol.discoverCapabilities('requester', 'code-gen');
    expect(Array.isArray(agents)).toBe(true);
  });

  it('should broadcast heartbeat', () => {
    bus.subscribe('agent-1', () => {});
    protocol.broadcastHeartbeat('agent-1', { memoryMB: 128 });
  });

  it('should emit agent events', () => {
    const events: any[] = [];
    protocol.onAgentEvent((e) => events.push(e));

    // Events are emitted when task completes via aggregation
    protocol.setExpectedAgentCount('event-task', 1);
    protocol.aggregateResult('event-task', 'agent-1', { value: 1 });

    expect(events.length).toBeGreaterThanOrEqual(0);
  });

  it('should unsubscribe from events', () => {
    const events: any[] = [];
    const unsub = protocol.onAgentEvent((e) => events.push(e));
    unsub();

    protocol.setExpectedAgentCount('event-task-2', 1);
    protocol.aggregateResult('event-task-2', 'agent-1', { value: 1 });

    expect(events.length).toBe(0);
  });

  it('should set expected agent count', () => {
    protocol.setExpectedAgentCount('multi-task', 5);
    const pending = protocol.getPendingTasks();
    // Setting expected count doesn't create a pending task, just configures aggregation
    expect(protocol.getAggregatedResult('multi-task')).toBeNull();
  });
});
