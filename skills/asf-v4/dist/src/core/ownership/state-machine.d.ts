/**
 * ASF V4.0 Ownership Lattice - Contract State Machine
 *
 * Manages contract lifecycle states: draft → approved/rejected
 * Version: v0.8.5
 */
import type { ContractState, StateTransition, ContractStateMachine as IContractStateMachine } from './types';
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
export declare class ContractStateMachine {
    private state;
    constructor(contractId: string, initialState?: ContractState, initialVersion?: string);
    /**
     * Check if a transition is valid.
     */
    canTransition(to: ContractState): boolean;
    /**
     * Get valid next states.
     */
    getNextStates(): ContractState[];
    /**
     * Attempt a state transition.
     *
     * @param to - Target state
     * @param actorRoleId - Role performing the transition
     * @param reason - Optional reason/comment
     * @returns Result with success flag and optional error
     */
    transition(to: ContractState, actorRoleId: string, reason?: string): {
        success: boolean;
        error?: string;
    };
    /**
     * Bump version based on approval count.
     */
    private bumpVersion;
    /**
     * Get current state.
     */
    getState(): IContractStateMachine;
    /**
     * Get current state enum.
     */
    getCurrentState(): ContractState;
    /**
     * Get current version.
     */
    getVersion(): string;
    /**
     * Get transition history.
     */
    getHistory(): StateTransition[];
    /**
     * Check if contract is approved.
     */
    isApproved(): boolean;
    /**
     * Check if contract is in draft state.
     */
    isDraft(): boolean;
    /**
     * Check if contract is rejected.
     */
    isRejected(): boolean;
    /**
     * Get last transition.
     */
    getLastTransition(): StateTransition | null;
    /**
     * Get who last modified the contract.
     */
    getLastActor(): string | null;
    /**
     * Get when contract was last modified.
     */
    getLastModified(): number | null;
    /**
     * Export state for persistence.
     */
    toJSON(): IContractStateMachine;
    /**
     * Import state from persistence.
     */
    static fromJSON(data: IContractStateMachine): ContractStateMachine;
}
/**
 * State machine manager for multiple contracts.
 */
export declare class StateMachineManager {
    private machines;
    constructor();
    /**
     * Get or create state machine for a contract.
     */
    getOrCreate(contractId: string, initialState?: ContractState): ContractStateMachine;
    /**
     * Get state machine for a contract.
     */
    get(contractId: string): ContractStateMachine | null;
    /**
     * Remove state machine.
     */
    remove(contractId: string): boolean;
    /**
     * Get all contract IDs.
     */
    getAllContractIds(): string[];
    /**
     * Get all state machines.
     */
    getAll(): Map<string, ContractStateMachine>;
    /**
     * Get contracts by state.
     */
    getByState(state: ContractState): string[];
    /**
     * Get draft contracts (pending approval).
     */
    getDraftContracts(): string[];
    /**
     * Get approved contracts.
     */
    getApprovedContracts(): string[];
    /**
     * Export all states.
     */
    export(): Record<string, IContractStateMachine>;
    /**
     * Import states.
     */
    import(states: Record<string, IContractStateMachine>): void;
}
export declare function getDefaultStateMachineManager(): StateMachineManager;
export declare function resetDefaultStateMachineManager(): void;
