import { describe, it, expect, beforeEach } from '@jest/globals';
import { AgentRegistry } from '../agent-registry';

describe('Agent Registry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  it('should register an agent with capabilities', () => {
    const entry = registry.register({
      id: 'agent-1',
      name: 'Test Agent',
      capabilities: [{ name: 'code-gen', version: '1.0.0' }],
    });

    expect(entry.id).toBe('agent-1');
    expect(entry.name).toBe('Test Agent');
    expect(entry.capabilities.length).toBe(1);
    expect(entry.state).toBe('initializing');
    expect(entry.health).toBe('healthy');
  });

  it('should auto-generate ID if not provided', () => {
    const entry = registry.register({ name: 'Auto ID Agent' });
    expect(entry.id).toBeDefined();
    expect(entry.id.length).toBeGreaterThan(0);
  });

  it('should reject duplicate registration', () => {
    registry.register({ id: 'dup', name: 'First' });
    expect(() => registry.register({ id: 'dup', name: 'Second' })).toThrow(
      'Agent already registered: dup'
    );
  });

  it('should unregister an agent', () => {
    registry.register({ id: 'agent-1', name: 'Test' });
    expect(registry.unregister('agent-1')).toBe(true);
    expect(registry.get('agent-1')).toBeNull();
  });

  it('should return null for unknown agent', () => {
    expect(registry.get('unknown')).toBeNull();
  });

  it('should list all agents', () => {
    registry.register({ id: 'a1', name: 'A1' });
    registry.register({ id: 'a2', name: 'A2' });
    expect(registry.list().length).toBe(2);
  });

  it('should filter by state', () => {
    registry.register({ id: 'a1', name: 'A1' });
    registry.register({ id: 'a2', name: 'A2' });
    registry.updateState('a1', 'working');

    const working = registry.getByState('working');
    expect(working.length).toBe(1);
    expect(working[0].id).toBe('a1');
  });

  it('should filter by health', () => {
    registry.register({ id: 'a1', name: 'A1' });
    registry.register({ id: 'a2', name: 'A2' });
    registry.updateHealth('a1', 'degraded');

    const degraded = registry.getByHealth('degraded');
    expect(degraded.length).toBe(1);
    expect(degraded[0].id).toBe('a1');
  });

  it('should find agents by capability', () => {
    registry.register({
      id: 'coder',
      name: 'Coder',
      capabilities: [{ name: 'code-gen', version: '1.0.0' }],
    });
    registry.register({
      id: 'tester',
      name: 'Tester',
      capabilities: [{ name: 'test-exec', version: '1.0.0' }],
    });

    const coders = registry.findByCapability('code-gen');
    expect(coders.length).toBe(1);
    expect(coders[0].id).toBe('coder');
  });

  it('should update state', () => {
    registry.register({ id: 'a1', name: 'A1' });
    expect(registry.updateState('a1', 'working')).toBe(true);
    expect(registry.get('a1')!.state).toBe('working');
  });

  it('should update health', () => {
    registry.register({ id: 'a1', name: 'A1' });
    expect(registry.updateHealth('a1', 'unhealthy')).toBe(true);
    expect(registry.get('a1')!.health).toBe('unhealthy');
  });

  it('should update lastSeen', () => {
    registry.register({ id: 'a1', name: 'A1' });
    const before = registry.get('a1')!.lastSeen;
    registry.updateLastSeen('a1');
    expect(registry.get('a1')!.lastSeen).toBeGreaterThanOrEqual(before);
  });

  it('should update capabilities', () => {
    registry.register({ id: 'a1', name: 'A1' });
    registry.updateCapabilities('a1', [{ name: 'new-cap', version: '2.0.0' }]);
    expect(registry.get('a1')!.capabilities.length).toBe(1);
    expect(registry.get('a1')!.capabilities[0].name).toBe('new-cap');
  });

  it('should return active count (excludes stopped and error)', () => {
    registry.register({ id: 'a1', name: 'A1' });
    registry.register({ id: 'a2', name: 'A2' });
    registry.register({ id: 'a3', name: 'A3' });
    registry.updateState('a2', 'stopped');
    registry.updateState('a3', 'error');
    expect(registry.getActiveCount()).toBe(1);
  });

  it('should return healthy count', () => {
    registry.register({ id: 'a1', name: 'A1' });
    registry.register({ id: 'a2', name: 'A2' });
    registry.updateHealth('a2', 'degraded');
    expect(registry.getHealthyCount()).toBe(1);
  });

  it('should return size', () => {
    expect(registry.size()).toBe(0);
    registry.register({ id: 'a1', name: 'A1' });
    expect(registry.size()).toBe(1);
  });
});
