/**
 * ANFSF V4 Layer 9 - Agent Lifecycle State Machine
 *
 * Manages agent lifecycle transitions with audit history.
 * Pattern follows ContractStateMachine from src/core/ownership/state-machine.ts.
 */

import type { AgentState, AgentStateEvent } from './types';

const VALID_TRANSITIONS: Record<AgentState, AgentState[]> = {
  initializing: ['idle', 'error'],
  idle: ['working', 'stopped', 'error'],
  working: ['idle', 'blocked', 'error'],
  blocked: ['idle', 'error'],
  error: ['idle', 'stopped'],
  stopped: [],
};

export class AgentStateMachine {
  private agentId: string;
  private state: AgentState;
  private history: AgentStateEvent[];

  constructor(agentId: string, initialState: AgentState = 'initializing') {
    this.agentId = agentId;
    this.state = initialState;
    this.history = [];
  }

  canTransition(to: AgentState): boolean {
    return VALID_TRANSITIONS[this.state].includes(to);
  }

  getNextStates(): AgentState[] {
    return [...VALID_TRANSITIONS[this.state]];
  }

  transition(to: AgentState, reason: string = ''): { success: boolean; error?: string } {
    if (!this.canTransition(to)) {
      return {
        success: false,
        error: `Invalid transition: ${this.state} -> ${to} for agent ${this.agentId}`,
      };
    }

    const event: AgentStateEvent = {
      from: this.state,
      to,
      agentId: this.agentId,
      reason,
      timestamp: Date.now(),
    };

    this.history.push(event);
    this.state = to;
    return { success: true };
  }

  getState(): AgentState {
    return this.state;
  }

  getHistory(): AgentStateEvent[] {
    return [...this.history];
  }

  getLastTransition(): AgentStateEvent | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  toJSON(): { agentId: string; state: AgentState; history: AgentStateEvent[] } {
    return {
      agentId: this.agentId,
      state: this.state,
      history: [...this.history],
    };
  }

  static fromJSON(json: { agentId: string; state: AgentState; history: AgentStateEvent[] }): AgentStateMachine {
    const machine = new AgentStateMachine(json.agentId, json.state);
    machine.history = [...json.history];
    return machine;
  }
}

export class AgentStateMachineManager {
  private machines: Map<string, AgentStateMachine>;

  constructor() {
    this.machines = new Map();
  }

  getOrCreate(agentId: string, initialState: AgentState = 'initializing'): AgentStateMachine {
    if (!this.machines.has(agentId)) {
      this.machines.set(agentId, new AgentStateMachine(agentId, initialState));
    }
    return this.machines.get(agentId)!;
  }

  get(agentId: string): AgentStateMachine | null {
    return this.machines.get(agentId) || null;
  }

  remove(agentId: string): boolean {
    return this.machines.delete(agentId);
  }

  getByState(state: AgentState): AgentStateMachine[] {
    const result: AgentStateMachine[] = [];
    for (const machine of this.machines.values()) {
      if (machine.getState() === state) {
        result.push(machine);
      }
    }
    return result;
  }

  getAll(): AgentStateMachine[] {
    return Array.from(this.machines.values());
  }

  getAllStates(): Map<string, AgentState> {
    const states = new Map<string, AgentState>();
    for (const [id, machine] of this.machines.entries()) {
      states.set(id, machine.getState());
    }
    return states;
  }

  size(): number {
    return this.machines.size;
  }
}
