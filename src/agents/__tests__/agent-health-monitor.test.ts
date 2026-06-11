import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { AgentHealthMonitor } from '../agent-health-monitor';

describe('Agent Health Monitor', () => {
  let monitor: AgentHealthMonitor;

  beforeEach(() => {
    jest.useFakeTimers();
    monitor = new AgentHealthMonitor({
      heartbeatTimeoutMs: 100,
      healthCheckIntervalMs: 50,
      resourceTrackingEnabled: true,
    });
  });

  afterEach(() => {
    monitor.stopMonitoring();
  });

  it('should register an agent', () => {
    monitor.registerAgent('agent-1');
    const result = monitor.checkHealth('agent-1');
    expect(result).not.toBeNull();
    expect(result!.health).toBe('healthy');
  });

  it('should unregister an agent', () => {
    monitor.registerAgent('agent-1');
    monitor.unregisterAgent('agent-1');
    expect(monitor.checkHealth('agent-1')).toBeNull();
  });

  it('should update lastHeartbeat on heartbeat', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1');
    const result = monitor.checkHealth('agent-1');
    expect(result!.missedHeartbeats).toBe(0);
    expect(result!.health).toBe('healthy');
  });

  it('should transition to degraded after 1 missed heartbeat', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1');

    jest.advanceTimersByTime(150);

    const result = monitor.checkHealth('agent-1');
    expect(result!.health).toBe('degraded');
    expect(result!.missedHeartbeats).toBe(1);
  });

  it('should transition to unhealthy after 2+ missed heartbeats', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1');

    jest.advanceTimersByTime(250);

    const result = monitor.checkHealth('agent-1');
    expect(result!.health).toBe('unhealthy');
    expect(result!.missedHeartbeats).toBeGreaterThanOrEqual(2);
  });

  it('should recover to healthy on new heartbeat', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1');
    jest.advanceTimersByTime(250);
    monitor.checkHealth('agent-1');

    monitor.recordHeartbeat('agent-1');
    const result = monitor.checkHealth('agent-1');
    expect(result!.health).toBe('healthy');
  });

  it('should track resource usage', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1', { memoryMB: 256, cpuPercent: 45 });
    const result = monitor.checkHealth('agent-1');
    expect(result!.resourceUsage).toBeDefined();
    expect(result!.resourceUsage!.memoryMB).toBe(256);
  });

  it('should check all agents', () => {
    monitor.registerAgent('a1');
    monitor.registerAgent('a2');
    const results = monitor.checkAll();
    expect(results.size).toBe(2);
  });

  it('should detect degradation via health status', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1');
    jest.advanceTimersByTime(150);
    monitor.checkHealth('agent-1');
    expect(monitor.detectDegradation('agent-1')).toBe(true);
  });

  it('should get health status', () => {
    monitor.registerAgent('agent-1');
    expect(monitor.getHealth('agent-1')).toBe('healthy');
  });

  it('should return null for unknown agent health', () => {
    expect(monitor.getHealth('unknown')).toBeNull();
  });

  it('should start and stop monitoring', () => {
    monitor.registerAgent('agent-1');
    monitor.startMonitoring();
    monitor.stopMonitoring();
  });

  it('should emit health change events', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1');

    const events: any[] = [];
    monitor.onEvent((e) => events.push(e));

    jest.advanceTimersByTime(250);
    monitor.checkHealth('agent-1');

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].type).toBe('agent:health_changed');
  });

  it('should unsubscribe from events', () => {
    monitor.registerAgent('agent-1');
    monitor.recordHeartbeat('agent-1');

    const events: any[] = [];
    const unsub = monitor.onEvent((e) => events.push(e));
    unsub();

    jest.advanceTimersByTime(250);
    monitor.checkHealth('agent-1');

    expect(events.length).toBe(0);
  });
});
