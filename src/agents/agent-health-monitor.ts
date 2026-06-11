/**
 * ANFSF V4 Layer 9 - Agent Health Monitor
 *
 * Heartbeat-based health monitoring with resource usage tracking.
 * Health degrades based on missed heartbeats: 0=healthy, 1=degraded, 2+=unhealthy.
 */

import type { AgentHealth, HealthCheckResult, AgentOSConfig, AgentOSEvent } from './types';

interface AgentHealthState {
  lastHeartbeat: number;
  missedHeartbeats: number;
  resourceHistory: Array<{ memoryMB?: number; cpuPercent?: number; timestamp: number }>;
  health: AgentHealth;
}

export class AgentHealthMonitor {
  private agents: Map<string, AgentHealthState>;
  private heartbeatTimeoutMs: number;
  private healthCheckIntervalMs: number;
  private resourceTrackingEnabled: boolean;
  private monitorInterval: ReturnType<typeof setInterval> | null;
  private eventListeners: Set<(event: AgentOSEvent) => void>;

  constructor(config: Pick<AgentOSConfig, 'heartbeatTimeoutMs' | 'healthCheckIntervalMs' | 'resourceTrackingEnabled'>) {
    this.agents = new Map();
    this.heartbeatTimeoutMs = config.heartbeatTimeoutMs ?? 15000;
    this.healthCheckIntervalMs = config.healthCheckIntervalMs ?? 10000;
    this.resourceTrackingEnabled = config.resourceTrackingEnabled ?? false;
    this.monitorInterval = null;
    this.eventListeners = new Set();
  }

  registerAgent(agentId: string): void {
    this.agents.set(agentId, {
      lastHeartbeat: Date.now(),
      missedHeartbeats: 0,
      resourceHistory: [],
      health: 'healthy',
    });
  }

  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
  }

  recordHeartbeat(agentId: string, resourceUsage?: { memoryMB?: number; cpuPercent?: number }): void {
    const state = this.agents.get(agentId);
    if (!state) return;

    state.lastHeartbeat = Date.now();
    state.missedHeartbeats = 0;

    if (this.resourceTrackingEnabled && resourceUsage) {
      state.resourceHistory.push({ ...resourceUsage, timestamp: Date.now() });
      if (state.resourceHistory.length > 100) {
        state.resourceHistory.shift();
      }
    }

    if (state.health !== 'healthy') {
      const prevHealth = state.health;
      state.health = 'healthy';
      this.emitHealthChange(agentId, prevHealth, 'healthy');
    }
  }

  checkHealth(agentId: string): HealthCheckResult | null {
    const state = this.agents.get(agentId);
    if (!state) return null;

    const elapsed = Date.now() - state.lastHeartbeat;
    const missed = Math.floor(elapsed / this.heartbeatTimeoutMs);

    const newHealth = this.computeHealth(missed);
    if (newHealth !== state.health) {
      const prevHealth = state.health;
      state.health = newHealth;
      this.emitHealthChange(agentId, prevHealth, newHealth);
    }

    state.missedHeartbeats = missed;

    return {
      agentId,
      health: state.health,
      lastHeartbeat: state.lastHeartbeat,
      missedHeartbeats: missed,
      resourceUsage: this.resourceTrackingEnabled && state.resourceHistory.length > 0
        ? state.resourceHistory[state.resourceHistory.length - 1]
        : undefined,
      checkedAt: Date.now(),
    };
  }

  checkAll(): Map<string, HealthCheckResult> {
    const results = new Map<string, HealthCheckResult>();
    for (const agentId of this.agents.keys()) {
      const result = this.checkHealth(agentId);
      if (result) {
        results.set(agentId, result);
      }
    }
    return results;
  }

  detectDegradation(agentId: string): boolean {
    const state = this.agents.get(agentId);
    if (!state) return false;

    if (state.health !== 'healthy') return true;

    if (this.resourceTrackingEnabled && state.resourceHistory.length >= 5) {
      const recent = state.resourceHistory.slice(-5);
      const memoryValues = recent.map(r => r.memoryMB ?? 0).filter(v => v > 0);
      if (memoryValues.length >= 3) {
        const avg = memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length;
        const recentMemory = memoryValues[memoryValues.length - 1];
        if (recentMemory > avg * 1.5) return true;
      }
    }

    return false;
  }

  getHealth(agentId: string): AgentHealth | null {
    const state = this.agents.get(agentId);
    return state ? state.health : null;
  }

  startMonitoring(): void {
    if (this.monitorInterval) return;
    this.monitorInterval = setInterval(() => {
      this.checkAll();
    }, this.healthCheckIntervalMs);
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  onEvent(listener: (event: AgentOSEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => { this.eventListeners.delete(listener); };
  }

  private computeHealth(missedHeartbeats: number): AgentHealth {
    if (missedHeartbeats === 0) return 'healthy';
    if (missedHeartbeats === 1) return 'degraded';
    return 'unhealthy';
  }

  private emitHealthChange(agentId: string, from: AgentHealth, to: AgentHealth): void {
    const event: AgentOSEvent = {
      type: 'agent:health_changed',
      agentId,
      timestamp: Date.now(),
      data: { from, to },
    };
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }
}
