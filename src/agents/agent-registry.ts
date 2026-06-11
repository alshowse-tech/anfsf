/**
 * ANFSF V4 Layer 9 - Agent Registry
 *
 * Central registry for agent metadata, capabilities, state, and health.
 * Replaces bare Set<string> in OrchestrationHarness with full metadata tracking.
 */

import type { AgentEntry, AgentCapability, AgentState, AgentHealth } from './types';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class AgentRegistry {
  private agents: Map<string, AgentEntry>;

  constructor() {
    this.agents = new Map();
  }

  register(config: {
    id?: string;
    name: string;
    capabilities?: AgentCapability[];
    metadata?: Record<string, any>;
  }): AgentEntry {
    const id = config.id || generateUUID();

    if (this.agents.has(id)) {
      throw new Error(`Agent already registered: ${id}`);
    }

    const entry: AgentEntry = {
      id,
      name: config.name,
      capabilities: config.capabilities || [],
      state: 'initializing',
      health: 'healthy',
      lastSeen: Date.now(),
      createdAt: Date.now(),
      metadata: config.metadata,
    };

    this.agents.set(id, entry);
    return entry;
  }

  unregister(agentId: string): boolean {
    return this.agents.delete(agentId);
  }

  get(agentId: string): AgentEntry | null {
    return this.agents.get(agentId) || null;
  }

  list(): AgentEntry[] {
    return Array.from(this.agents.values());
  }

  getByState(state: AgentState): AgentEntry[] {
    return Array.from(this.agents.values()).filter((a: AgentEntry) => a.state === state);
  }

  getByHealth(health: AgentHealth): AgentEntry[] {
    return Array.from(this.agents.values()).filter((a: AgentEntry) => a.health === health);
  }

  findByCapability(capabilityName: string): AgentEntry[] {
    return Array.from(this.agents.values()).filter((a: AgentEntry) =>
      a.capabilities.some((c: AgentCapability) => c.name === capabilityName)
    );
  }

  updateState(agentId: string, state: AgentState): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.state = state;
    return true;
  }

  updateHealth(agentId: string, health: AgentHealth): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.health = health;
    return true;
  }

  updateLastSeen(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.lastSeen = Date.now();
    return true;
  }

  updateCapabilities(agentId: string, capabilities: AgentCapability[]): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.capabilities = capabilities;
    return true;
  }

  getActiveCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.state !== 'stopped' && agent.state !== 'error') {
        count++;
      }
    }
    return count;
  }

  getHealthyCount(): number {
    let count = 0;
    for (const agent of this.agents.values()) {
      if (agent.health === 'healthy') count++;
    }
    return count;
  }

  size(): number {
    return this.agents.size;
  }
}
