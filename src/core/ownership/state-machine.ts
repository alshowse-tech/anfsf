/**
 * ASF V4.0 Ownership Lattice - Contract State Machine
 * 
 * Manages contract lifecycle states: draft → approved/rejected
 * Version: v0.8.5
 */

import type { ContractState, StateTransition, ContractStateMachine as IContractStateMachine, ProposalState } from './types';

/**
 * Valid state transitions.
 */
const VALID_TRANSITIONS: Record<ContractState, ContractState[]> = {
  draft: ['approved', 'rejected'],
  approved: ['draft'],      // Can revert to draft for modifications
  rejected: ['draft'],      // Can resubmit after rejection
};

/**
 * Contract State Machine class.
 * 
 * Manages the lifecycle of a contract through its states.
 * Enforces valid transitions and maintains audit history.
 * 
 * @example
 * ```typescript
 * const machine = new ContractStateMachine('api-gateway-v1', 'draft');
 * 
 * // Submit for approval
 * const result = machine.transition('approved', 'architect-team', 'LGTM');
 * if (result.success) {
 *   console.log(`Contract approved, new version: ${machine.getState().version}`);
 * }
 * ```
 */
export class ContractStateMachine {
  private state: IContractStateMachine;

  constructor(contractId: string, initialState: ContractState = 'draft', initialVersion: string = '0.0.0') {
    this.state = {
      id: contractId,
      currentState: initialState,
      version: initialVersion,
      history: [],
    };
  }

  /**
   * Check if a transition is valid.
   */
  canTransition(to: ContractState): boolean {
    return VALID_TRANSITIONS[this.state.currentState].includes(to);
  }

  /**
   * Get valid next states.
   */
  getNextStates(): ContractState[] {
    return VALID_TRANSITIONS[this.state.currentState];
  }

  /**
   * Attempt a state transition.
   * 
   * @param to - Target state
   * @param actorRoleId - Role performing the transition
   * @param reason - Optional reason/comment
   * @returns Result with success flag and optional error
   */
  transition(
    to: ContractState,
    actorRoleId: string,
    reason?: string
  ): { success: boolean; error?: string } {
    // Validate transition
    if (!this.canTransition(to)) {
      return {
        success: false,
        error: `Cannot transition from ${this.state.currentState} to ${to}. Valid transitions: ${this.getNextStates().join(', ')}`,
      };
    }

    // Create transition record
    const transition: StateTransition = {
      from: this.state.currentState,
      to,
      actorRoleId,
      timestamp: Date.now(),
      reason,
    };

    // Update state
    this.state.history.push(transition);
    this.state.currentState = to;

    // Bump version on approval
    if (to === 'approved') {
      this.state.version = this.bumpVersion();
    }

    return { success: true };
  }

  /**
   * Bump version based on approval count.
   */
  private bumpVersion(): string {
    const approvedCount = this.state.history.filter((t: StateTransition) => t.to === 'approved').length;
    
    // Parse current version
    const parts = this.state.version.split('.').map(Number);
    const [major, minor] = parts;

    // Increment patch for re-approvals of same major.minor
    return `${major}.${minor}.${approvedCount}`;
  }

  /**
   * Get current state.
   */
  getState(): IContractStateMachine {
    return { ...this.state };
  }

  /**
   * Get current state enum.
   */
  getCurrentState(): ContractState {
    return this.state.currentState;
  }

  /**
   * Get current version.
   */
  getVersion(): string {
    return this.state.version;
  }

  /**
   * Get transition history.
   */
  getHistory(): StateTransition[] {
    return [...this.state.history];
  }

  /**
   * Check if contract is approved.
   */
  isApproved(): boolean {
    return this.state.currentState === 'approved';
  }

  /**
   * Check if contract is in draft state.
   */
  isDraft(): boolean {
    return this.state.currentState === 'draft';
  }

  /**
   * Check if contract is rejected.
   */
  isRejected(): boolean {
    return this.state.currentState === 'rejected';
  }

  /**
   * Get last transition.
   */
  getLastTransition(): StateTransition | null {
    if (this.state.history.length === 0) return null;
    return this.state.history[this.state.history.length - 1];
  }

  /**
   * Get who last modified the contract.
   */
  getLastActor(): string | null {
    const last = this.getLastTransition();
    return last?.actorRoleId || null;
  }

  /**
   * Get when contract was last modified.
   */
  getLastModified(): number | null {
    const last = this.getLastTransition();
    return last?.timestamp || null;
  }

  /**
   * Export state for persistence.
   */
  toJSON(): IContractStateMachine {
    return { ...this.state };
  }

  /**
   * Import state from persistence.
   */
  static fromJSON(data: IContractStateMachine): ContractStateMachine {
    const machine = new ContractStateMachine(data.id, data.currentState, data.version);
    machine.state.history = data.history;
    return machine;
  }
}

/**
 * State machine manager for multiple contracts.
 */
export class StateMachineManager {
  private machines: Map<string, ContractStateMachine>;

  constructor() {
    this.machines = new Map();
  }

  /**
   * Get or create state machine for a contract.
   */
  getOrCreate(contractId: string, initialState: ContractState = 'draft'): ContractStateMachine {
    if (!this.machines.has(contractId)) {
      this.machines.set(contractId, new ContractStateMachine(contractId, initialState));
    }
    return this.machines.get(contractId)!;
  }

  /**
   * Get state machine for a contract.
   */
  get(contractId: string): ContractStateMachine | null {
    return this.machines.get(contractId) || null;
  }

  /**
   * Remove state machine.
   */
  remove(contractId: string): boolean {
    return this.machines.delete(contractId);
  }

  /**
   * Get all contract IDs.
   */
  getAllContractIds(): string[] {
    return Array.from(this.machines.keys());
  }

  /**
   * Get all state machines.
   */
  getAll(): Map<string, ContractStateMachine> {
    return new Map(this.machines);
  }

  /**
   * Get contracts by state.
   */
  getByState(state: ContractState): string[] {
    const result: string[] = [];
    for (const [id, machine] of this.machines) {
      if (machine.getCurrentState() === state) {
        result.push(id);
      }
    }
    return result;
  }

  /**
   * Get draft contracts (pending approval).
   */
  getDraftContracts(): string[] {
    return this.getByState('draft');
  }

  /**
   * Get approved contracts.
   */
  getApprovedContracts(): string[] {
    return this.getByState('approved');
  }

  /**
   * Export all states.
   */
  export(): Record<string, IContractStateMachine> {
    const result: Record<string, IContractStateMachine> = {};
    for (const [id, machine] of this.machines) {
      result[id] = machine.toJSON();
    }
    return result;
  }

  /**
   * Import states.
   */
  import(states: Record<string, IContractStateMachine>): void {
    this.machines.clear();
    for (const [id, data] of Object.entries(states)) {
      this.machines.set(id, ContractStateMachine.fromJSON(data));
    }
  }
}

/**
 * Singleton manager instance.
 */
let defaultManager: StateMachineManager | null = null;

export function getDefaultStateMachineManager(): StateMachineManager {
  if (!defaultManager) {
    defaultManager = new StateMachineManager();
  }
  return defaultManager;
}

export function resetDefaultStateMachineManager(): void {
  defaultManager = null;
}
