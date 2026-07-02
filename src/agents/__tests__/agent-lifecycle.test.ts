import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentRegistry } from '../agent-registry';

describe('Agent Lifecycle', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register an agent with initializing state', () => {
    const entry = registry.register({
      id: 'lifecycle-agent-1',
      name: 'Lifecycle Test Agent',
      capabilities: [{ name: 'test-capability', version: '1.0' }],
    });

    expect(entry.id).toBe('lifecycle-agent-1');
    expect(entry.name).toBe('Lifecycle Test Agent');
    expect(entry.state).toBe('initializing');
    expect(entry.health).toBe('healthy');
    expect(registry.size()).toBe(1);
  });

  it('should transition through valid states', () => {
    const entry = registry.register({ name: 'State Test' });

    // initializing → idle
    expect(registry.updateState(entry.id, 'idle')).toBe(true);
    expect(registry.get(entry.id)!.state).toBe('idle');

    // idle → working
    expect(registry.updateState(entry.id, 'working')).toBe(true);
    expect(registry.get(entry.id)!.state).toBe('working');

    // working → blocked
    expect(registry.updateState(entry.id, 'blocked')).toBe(true);
    expect(registry.get(entry.id)!.state).toBe('blocked');

    // blocked → working
    expect(registry.updateState(entry.id, 'working')).toBe(true);
    expect(registry.get(entry.id)!.state).toBe('working');

    // working → error
    expect(registry.updateState(entry.id, 'error')).toBe(true);
    expect(registry.get(entry.id)!.state).toBe('error');

    // error → stopped
    expect(registry.updateState(entry.id, 'stopped')).toBe(true);
    expect(registry.get(entry.id)!.state).toBe('stopped');
  });

  it('should return false when updating state of nonexistent agent', () => {
    expect(registry.updateState('nonexistent', 'idle')).toBe(false);
  });

  it('should list registered agents', () => {
    registry.register({ id: 'a1', name: 'Agent 1' });
    registry.register({ id: 'a2', name: 'Agent 2' });
    registry.register({ id: 'a3', name: 'Agent 3' });

    const all = registry.list();
    expect(all.length).toBe(3);
    expect(all.map(a => a.id)).toEqual(expect.arrayContaining(['a1', 'a2', 'a3']));
  });

  it('should find agents by state', () => {
    const e1 = registry.register({ id: 'idle-agent', name: 'Idle' });
    const e2 = registry.register({ id: 'working-agent', name: 'Working' });

    registry.updateState(e1.id, 'idle');
    registry.updateState(e2.id, 'working');

    const idleAgents = registry.getByState('idle');
    expect(idleAgents.length).toBe(1);
    expect(idleAgents[0].id).toBe('idle-agent');

    const workingAgents = registry.getByState('working');
    expect(workingAgents.length).toBe(1);
    expect(workingAgents[0].id).toBe('working-agent');
  });

  it('should unregister an agent', () => {
    const entry = registry.register({ id: 'to-remove', name: 'Remove Me' });
    expect(registry.size()).toBe(1);

    const removed = registry.unregister('to-remove');
    expect(removed).toBe(true);
    expect(registry.size()).toBe(0);
    expect(registry.get('to-remove')).toBeNull();
  });

  it('should return false when unregistering nonexistent agent', () => {
    expect(registry.unregister('nonexistent')).toBe(false);
  });

  it('should report healthy and active counts', () => {
    registry.register({ id: 'a1', name: 'Agent 1' });
    registry.register({ id: 'a2', name: 'Agent 2' });
    registry.register({ id: 'a3', name: 'Agent 3' });

    expect(registry.getActiveCount()).toBe(3);
    expect(registry.getHealthyCount()).toBe(3);

    // Mark one as stopped
    registry.updateState('a1', 'stopped');
    expect(registry.getActiveCount()).toBe(2);
    expect(registry.getHealthyCount()).toBe(3); // health unchanged

    // Mark another as error
    registry.updateState('a2', 'error');
    expect(registry.getActiveCount()).toBe(1);
  });

  it('should find agents by capability', () => {
    registry.register({
      id: 'code-gen', name: 'Code Gen',
      capabilities: [{ name: 'code-generation', version: '1.0' }, { name: 'fix', version: '1.0' }],
    });
    registry.register({
      id: 'test-gen', name: 'Test Gen',
      capabilities: [{ name: 'test-generation', version: '1.0' }],
    });

    const codeAgents = registry.findByCapability('code-generation');
    expect(codeAgents.length).toBe(1);
    expect(codeAgents[0].id).toBe('code-gen');

    const testAgents = registry.findByCapability('test-generation');
    expect(testAgents.length).toBe(1);
    expect(testAgents[0].id).toBe('test-gen');

    const noMatch = registry.findByCapability('nonexistent');
    expect(noMatch.length).toBe(0);
  });
});
