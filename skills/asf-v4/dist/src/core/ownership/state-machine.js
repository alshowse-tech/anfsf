"use strict";
/**
 * ASF V4.0 Ownership Lattice - Contract State Machine
 *
 * Manages contract lifecycle states: draft → approved/rejected
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.StateMachineManager = exports.ContractStateMachine = void 0;
exports.getDefaultStateMachineManager = getDefaultStateMachineManager;
exports.resetDefaultStateMachineManager = resetDefaultStateMachineManager;
/**
 * Valid state transitions.
 */
const VALID_TRANSITIONS = {
    draft: ['approved', 'rejected'],
    approved: ['draft'], // Can revert to draft for modifications
    rejected: ['draft'], // Can resubmit after rejection
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
class ContractStateMachine {
    constructor(contractId, initialState = 'draft', initialVersion = '0.0.0') {
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
    canTransition(to) {
        return VALID_TRANSITIONS[this.state.currentState].includes(to);
    }
    /**
     * Get valid next states.
     */
    getNextStates() {
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
    transition(to, actorRoleId, reason) {
        // Validate transition
        if (!this.canTransition(to)) {
            return {
                success: false,
                error: `Cannot transition from ${this.state.currentState} to ${to}. Valid transitions: ${this.getNextStates().join(', ')}`,
            };
        }
        // Create transition record
        const transition = {
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
    bumpVersion() {
        const approvedCount = this.state.history.filter((t) => t.to === 'approved').length;
        // Parse current version
        const parts = this.state.version.split('.').map(Number);
        const [major, minor] = parts;
        // Increment patch for re-approvals of same major.minor
        return `${major}.${minor}.${approvedCount}`;
    }
    /**
     * Get current state.
     */
    getState() {
        return { ...this.state };
    }
    /**
     * Get current state enum.
     */
    getCurrentState() {
        return this.state.currentState;
    }
    /**
     * Get current version.
     */
    getVersion() {
        return this.state.version;
    }
    /**
     * Get transition history.
     */
    getHistory() {
        return [...this.state.history];
    }
    /**
     * Check if contract is approved.
     */
    isApproved() {
        return this.state.currentState === 'approved';
    }
    /**
     * Check if contract is in draft state.
     */
    isDraft() {
        return this.state.currentState === 'draft';
    }
    /**
     * Check if contract is rejected.
     */
    isRejected() {
        return this.state.currentState === 'rejected';
    }
    /**
     * Get last transition.
     */
    getLastTransition() {
        if (this.state.history.length === 0)
            return null;
        return this.state.history[this.state.history.length - 1];
    }
    /**
     * Get who last modified the contract.
     */
    getLastActor() {
        const last = this.getLastTransition();
        return last?.actorRoleId || null;
    }
    /**
     * Get when contract was last modified.
     */
    getLastModified() {
        const last = this.getLastTransition();
        return last?.timestamp || null;
    }
    /**
     * Export state for persistence.
     */
    toJSON() {
        return { ...this.state };
    }
    /**
     * Import state from persistence.
     */
    static fromJSON(data) {
        const machine = new ContractStateMachine(data.id, data.currentState, data.version);
        machine.state.history = data.history;
        return machine;
    }
}
exports.ContractStateMachine = ContractStateMachine;
/**
 * State machine manager for multiple contracts.
 */
class StateMachineManager {
    constructor() {
        this.machines = new Map();
    }
    /**
     * Get or create state machine for a contract.
     */
    getOrCreate(contractId, initialState = 'draft') {
        if (!this.machines.has(contractId)) {
            this.machines.set(contractId, new ContractStateMachine(contractId, initialState));
        }
        return this.machines.get(contractId);
    }
    /**
     * Get state machine for a contract.
     */
    get(contractId) {
        return this.machines.get(contractId) || null;
    }
    /**
     * Remove state machine.
     */
    remove(contractId) {
        return this.machines.delete(contractId);
    }
    /**
     * Get all contract IDs.
     */
    getAllContractIds() {
        return Array.from(this.machines.keys());
    }
    /**
     * Get all state machines.
     */
    getAll() {
        return new Map(this.machines);
    }
    /**
     * Get contracts by state.
     */
    getByState(state) {
        const result = [];
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
    getDraftContracts() {
        return this.getByState('draft');
    }
    /**
     * Get approved contracts.
     */
    getApprovedContracts() {
        return this.getByState('approved');
    }
    /**
     * Export all states.
     */
    export() {
        const result = {};
        for (const [id, machine] of this.machines) {
            result[id] = machine.toJSON();
        }
        return result;
    }
    /**
     * Import states.
     */
    import(states) {
        this.machines.clear();
        for (const [id, data] of Object.entries(states)) {
            this.machines.set(id, ContractStateMachine.fromJSON(data));
        }
    }
}
exports.StateMachineManager = StateMachineManager;
/**
 * Singleton manager instance.
 */
let defaultManager = null;
function getDefaultStateMachineManager() {
    if (!defaultManager) {
        defaultManager = new StateMachineManager();
    }
    return defaultManager;
}
function resetDefaultStateMachineManager() {
    defaultManager = null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdGUtbWFjaGluZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb3JlL293bmVyc2hpcC9zdGF0ZS1tYWNoaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBZ1RILHNFQUtDO0FBRUQsMEVBRUM7QUFyVEQ7O0dBRUc7QUFDSCxNQUFNLGlCQUFpQixHQUEyQztJQUNoRSxLQUFLLEVBQUUsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDO0lBQy9CLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFPLHdDQUF3QztJQUNsRSxRQUFRLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBTywrQkFBK0I7Q0FDMUQsQ0FBQztBQUVGOzs7Ozs7Ozs7Ozs7Ozs7O0dBZ0JHO0FBQ0gsTUFBYSxvQkFBb0I7SUFHL0IsWUFBWSxVQUFrQixFQUFFLGVBQThCLE9BQU8sRUFBRSxpQkFBeUIsT0FBTztRQUNyRyxJQUFJLENBQUMsS0FBSyxHQUFHO1lBQ1gsRUFBRSxFQUFFLFVBQVU7WUFDZCxZQUFZLEVBQUUsWUFBWTtZQUMxQixPQUFPLEVBQUUsY0FBYztZQUN2QixPQUFPLEVBQUUsRUFBRTtTQUNaLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhLENBQUMsRUFBaUI7UUFDN0IsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxhQUFhO1FBQ1gsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsVUFBVSxDQUNSLEVBQWlCLEVBQ2pCLFdBQW1CLEVBQ25CLE1BQWU7UUFFZixzQkFBc0I7UUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLENB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QUFFLENBQUM7UUFDekQsS0FBSyxNQUFNLENBQUMsRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUMxQyxNQUFNLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2hDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNoQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNLENBQUMsTUFBNkM7UUFDbEQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN0QixLQUFLLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLElBQUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBNUZELGtEQTRGQztBQUVEOztHQUVHO0FBQ0gsSUFBSSxjQUFjLEdBQStCLElBQUksQ0FBQztBQUV0RCxTQUFnQiw2QkFBNkI7SUFDM0MsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3BCLGNBQWMsR0FBRyxJQUFJLG1CQUFtQixFQUFFLENBQUM7SUFDN0MsQ0FBQztJQUNELE9BQU8sY0FBYyxDQUFDO0FBQ3hCLENBQUM7QUFFRCxTQUFnQiwrQkFBK0I7SUFDN0MsY0FBYyxHQUFHLElBQUksQ0FBQztBQUN4QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBPd25lcnNoaXAgTGF0dGljZSAtIENvbnRyYWN0IFN0YXRlIE1hY2hpbmVcbiAqIFxuICogTWFuYWdlcyBjb250cmFjdCBsaWZlY3ljbGUgc3RhdGVzOiBkcmFmdCDihpIgYXBwcm92ZWQvcmVqZWN0ZWRcbiAqIFZlcnNpb246IHYwLjguNVxuICovXG5cbmltcG9ydCB0eXBlIHsgQ29udHJhY3RTdGF0ZSwgU3RhdGVUcmFuc2l0aW9uLCBDb250cmFjdFN0YXRlTWFjaGluZSBhcyBJQ29udHJhY3RTdGF0ZU1hY2hpbmUsIFByb3Bvc2FsU3RhdGUgfSBmcm9tICcuL3R5cGVzJztcblxuLyoqXG4gKiBWYWxpZCBzdGF0ZSB0cmFuc2l0aW9ucy5cbiAqL1xuY29uc3QgVkFMSURfVFJBTlNJVElPTlM6IFJlY29yZDxDb250cmFjdFN0YXRlLCBDb250cmFjdFN0YXRlW10+ID0ge1xuICBkcmFmdDogWydhcHByb3ZlZCcsICdyZWplY3RlZCddLFxuICBhcHByb3ZlZDogWydkcmFmdCddLCAgICAgIC8vIENhbiByZXZlcnQgdG8gZHJhZnQgZm9yIG1vZGlmaWNhdGlvbnNcbiAgcmVqZWN0ZWQ6IFsnZHJhZnQnXSwgICAgICAvLyBDYW4gcmVzdWJtaXQgYWZ0ZXIgcmVqZWN0aW9uXG59O1xuXG4vKipcbiAqIENvbnRyYWN0IFN0YXRlIE1hY2hpbmUgY2xhc3MuXG4gKiBcbiAqIE1hbmFnZXMgdGhlIGxpZmVjeWNsZSBvZiBhIGNvbnRyYWN0IHRocm91Z2ggaXRzIHN0YXRlcy5cbiAqIEVuZm9yY2VzIHZhbGlkIHRyYW5zaXRpb25zIGFuZCBtYWludGFpbnMgYXVkaXQgaGlzdG9yeS5cbiAqIFxuICogQGV4YW1wbGVcbiAqIGBgYHR5cGVzY3JpcHRcbiAqIGNvbnN0IG1hY2hpbmUgPSBuZXcgQ29udHJhY3RTdGF0ZU1hY2hpbmUoJ2FwaS1nYXRld2F5LXYxJywgJ2RyYWZ0Jyk7XG4gKiBcbiAqIC8vIFN1Ym1pdCBmb3IgYXBwcm92YWxcbiAqIGNvbnN0IHJlc3VsdCA9IG1hY2hpbmUudHJhbnNpdGlvbignYXBwcm92ZWQnLCAnYXJjaGl0ZWN0LXRlYW0nLCAnTEdUTScpO1xuICogaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gKiAgIGNvbnNvbGUubG9nKGBDb250cmFjdCBhcHByb3ZlZCwgbmV3IHZlcnNpb246ICR7bWFjaGluZS5nZXRTdGF0ZSgpLnZlcnNpb259YCk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRyYWN0U3RhdGVNYWNoaW5lIHtcbiAgcHJpdmF0ZSBzdGF0ZTogSUNvbnRyYWN0U3RhdGVNYWNoaW5lO1xuXG4gIGNvbnN0cnVjdG9yKGNvbnRyYWN0SWQ6IHN0cmluZywgaW5pdGlhbFN0YXRlOiBDb250cmFjdFN0YXRlID0gJ2RyYWZ0JywgaW5pdGlhbFZlcnNpb246IHN0cmluZyA9ICcwLjAuMCcpIHtcbiAgICB0aGlzLnN0YXRlID0ge1xuICAgICAgaWQ6IGNvbnRyYWN0SWQsXG4gICAgICBjdXJyZW50U3RhdGU6IGluaXRpYWxTdGF0ZSxcbiAgICAgIHZlcnNpb246IGluaXRpYWxWZXJzaW9uLFxuICAgICAgaGlzdG9yeTogW10sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBhIHRyYW5zaXRpb24gaXMgdmFsaWQuXG4gICAqL1xuICBjYW5UcmFuc2l0aW9uKHRvOiBDb250cmFjdFN0YXRlKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIFZBTElEX1RSQU5TSVRJT05TW3RoaXMuc3RhdGUuY3VycmVudFN0YXRlXS5pbmNsdWRlcyh0byk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHZhbGlkIG5leHQgc3RhdGVzLlxuICAgKi9cbiAgZ2V0TmV4dFN0YXRlcygpOiBDb250cmFjdFN0YXRlW10ge1xuICAgIHJldHVybiBWQUxJRF9UUkFOU0lUSU9OU1t0aGlzLnN0YXRlLmN1cnJlbnRTdGF0ZV07XG4gIH1cblxuICAvKipcbiAgICogQXR0ZW1wdCBhIHN0YXRlIHRyYW5zaXRpb24uXG4gICAqIFxuICAgKiBAcGFyYW0gdG8gLSBUYXJnZXQgc3RhdGVcbiAgICogQHBhcmFtIGFjdG9yUm9sZUlkIC0gUm9sZSBwZXJmb3JtaW5nIHRoZSB0cmFuc2l0aW9uXG4gICAqIEBwYXJhbSByZWFzb24gLSBPcHRpb25hbCByZWFzb24vY29tbWVudFxuICAgKiBAcmV0dXJucyBSZXN1bHQgd2l0aCBzdWNjZXNzIGZsYWcgYW5kIG9wdGlvbmFsIGVycm9yXG4gICAqL1xuICB0cmFuc2l0aW9uKFxuICAgIHRvOiBDb250cmFjdFN0YXRlLFxuICAgIGFjdG9yUm9sZUlkOiBzdHJpbmcsXG4gICAgcmVhc29uPzogc3RyaW5nXG4gICk6IHsgc3VjY2VzczogYm9vbGVhbjsgZXJyb3I/OiBzdHJpbmcgfSB7XG4gICAgLy8gVmFsaWRhdGUgdHJhbnNpdGlvblxuICAgIGlmICghdGhpcy5jYW5UcmFuc2l0aW9uKHRvKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIGVycm9yOiBgQ2Fubm90IHRyYW5zaXRpb24gZnJvbSAke3RoaXMuc3RhdGUuY3VycmVudFN0YXRlfSB0byAke3RvfS4gVmFsaWQgdHJhbnNpdGlvbnM6ICR7dGhpcy5nZXROZXh0U3RhdGVzKCkuam9pbignLCAnKX1gLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgdHJhbnNpdGlvbiByZWNvcmRcbiAgICBjb25zdCB0cmFuc2l0aW9uOiBTdGF0ZVRyYW5zaXRpb24gPSB7XG4gICAgICBmcm9tOiB0aGlzLnN0YXRlLmN1cnJlbnRTdGF0ZSxcbiAgICAgIHRvLFxuICAgICAgYWN0b3JSb2xlSWQsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICByZWFzb24sXG4gICAgfTtcblxuICAgIC8vIFVwZGF0ZSBzdGF0ZVxuICAgIHRoaXMuc3RhdGUuaGlzdG9yeS5wdXNoKHRyYW5zaXRpb24pO1xuICAgIHRoaXMuc3RhdGUuY3VycmVudFN0YXRlID0gdG87XG5cbiAgICAvLyBCdW1wIHZlcnNpb24gb24gYXBwcm92YWxcbiAgICBpZiAodG8gPT09ICdhcHByb3ZlZCcpIHtcbiAgICAgIHRoaXMuc3RhdGUudmVyc2lvbiA9IHRoaXMuYnVtcFZlcnNpb24oKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gIH1cblxuICAvKipcbiAgICogQnVtcCB2ZXJzaW9uIGJhc2VkIG9uIGFwcHJvdmFsIGNvdW50LlxuICAgKi9cbiAgcHJpdmF0ZSBidW1wVmVyc2lvbigpOiBzdHJpbmcge1xuICAgIGNvbnN0IGFwcHJvdmVkQ291bnQgPSB0aGlzLnN0YXRlLmhpc3RvcnkuZmlsdGVyKCh0OiBTdGF0ZVRyYW5zaXRpb24pID0+IHQudG8gPT09ICdhcHByb3ZlZCcpLmxlbmd0aDtcbiAgICBcbiAgICAvLyBQYXJzZSBjdXJyZW50IHZlcnNpb25cbiAgICBjb25zdCBwYXJ0cyA9IHRoaXMuc3RhdGUudmVyc2lvbi5zcGxpdCgnLicpLm1hcChOdW1iZXIpO1xuICAgIGNvbnN0IFttYWpvciwgbWlub3JdID0gcGFydHM7XG5cbiAgICAvLyBJbmNyZW1lbnQgcGF0Y2ggZm9yIHJlLWFwcHJvdmFscyBvZiBzYW1lIG1ham9yLm1pbm9yXG4gICAgcmV0dXJuIGAke21ham9yfS4ke21pbm9yfS4ke2FwcHJvdmVkQ291bnR9YDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY3VycmVudCBzdGF0ZS5cbiAgICovXG4gIGdldFN0YXRlKCk6IElDb250cmFjdFN0YXRlTWFjaGluZSB7XG4gICAgcmV0dXJuIHsgLi4udGhpcy5zdGF0ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjdXJyZW50IHN0YXRlIGVudW0uXG4gICAqL1xuICBnZXRDdXJyZW50U3RhdGUoKTogQ29udHJhY3RTdGF0ZSB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUuY3VycmVudFN0YXRlO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjdXJyZW50IHZlcnNpb24uXG4gICAqL1xuICBnZXRWZXJzaW9uKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUudmVyc2lvbjtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdHJhbnNpdGlvbiBoaXN0b3J5LlxuICAgKi9cbiAgZ2V0SGlzdG9yeSgpOiBTdGF0ZVRyYW5zaXRpb25bXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnN0YXRlLmhpc3RvcnldO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGNvbnRyYWN0IGlzIGFwcHJvdmVkLlxuICAgKi9cbiAgaXNBcHByb3ZlZCgpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5zdGF0ZS5jdXJyZW50U3RhdGUgPT09ICdhcHByb3ZlZCc7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgY29udHJhY3QgaXMgaW4gZHJhZnQgc3RhdGUuXG4gICAqL1xuICBpc0RyYWZ0KCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnN0YXRlLmN1cnJlbnRTdGF0ZSA9PT0gJ2RyYWZ0JztcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBjb250cmFjdCBpcyByZWplY3RlZC5cbiAgICovXG4gIGlzUmVqZWN0ZWQoKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUuY3VycmVudFN0YXRlID09PSAncmVqZWN0ZWQnO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsYXN0IHRyYW5zaXRpb24uXG4gICAqL1xuICBnZXRMYXN0VHJhbnNpdGlvbigpOiBTdGF0ZVRyYW5zaXRpb24gfCBudWxsIHtcbiAgICBpZiAodGhpcy5zdGF0ZS5oaXN0b3J5Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIG51bGw7XG4gICAgcmV0dXJuIHRoaXMuc3RhdGUuaGlzdG9yeVt0aGlzLnN0YXRlLmhpc3RvcnkubGVuZ3RoIC0gMV07XG4gIH1cblxuICAvKipcbiAgICogR2V0IHdobyBsYXN0IG1vZGlmaWVkIHRoZSBjb250cmFjdC5cbiAgICovXG4gIGdldExhc3RBY3RvcigpOiBzdHJpbmcgfCBudWxsIHtcbiAgICBjb25zdCBsYXN0ID0gdGhpcy5nZXRMYXN0VHJhbnNpdGlvbigpO1xuICAgIHJldHVybiBsYXN0Py5hY3RvclJvbGVJZCB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB3aGVuIGNvbnRyYWN0IHdhcyBsYXN0IG1vZGlmaWVkLlxuICAgKi9cbiAgZ2V0TGFzdE1vZGlmaWVkKCk6IG51bWJlciB8IG51bGwge1xuICAgIGNvbnN0IGxhc3QgPSB0aGlzLmdldExhc3RUcmFuc2l0aW9uKCk7XG4gICAgcmV0dXJuIGxhc3Q/LnRpbWVzdGFtcCB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEV4cG9ydCBzdGF0ZSBmb3IgcGVyc2lzdGVuY2UuXG4gICAqL1xuICB0b0pTT04oKTogSUNvbnRyYWN0U3RhdGVNYWNoaW5lIHtcbiAgICByZXR1cm4geyAuLi50aGlzLnN0YXRlIH07XG4gIH1cblxuICAvKipcbiAgICogSW1wb3J0IHN0YXRlIGZyb20gcGVyc2lzdGVuY2UuXG4gICAqL1xuICBzdGF0aWMgZnJvbUpTT04oZGF0YTogSUNvbnRyYWN0U3RhdGVNYWNoaW5lKTogQ29udHJhY3RTdGF0ZU1hY2hpbmUge1xuICAgIGNvbnN0IG1hY2hpbmUgPSBuZXcgQ29udHJhY3RTdGF0ZU1hY2hpbmUoZGF0YS5pZCwgZGF0YS5jdXJyZW50U3RhdGUsIGRhdGEudmVyc2lvbik7XG4gICAgbWFjaGluZS5zdGF0ZS5oaXN0b3J5ID0gZGF0YS5oaXN0b3J5O1xuICAgIHJldHVybiBtYWNoaW5lO1xuICB9XG59XG5cbi8qKlxuICogU3RhdGUgbWFjaGluZSBtYW5hZ2VyIGZvciBtdWx0aXBsZSBjb250cmFjdHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBTdGF0ZU1hY2hpbmVNYW5hZ2VyIHtcbiAgcHJpdmF0ZSBtYWNoaW5lczogTWFwPHN0cmluZywgQ29udHJhY3RTdGF0ZU1hY2hpbmU+O1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMubWFjaGluZXMgPSBuZXcgTWFwKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IG9yIGNyZWF0ZSBzdGF0ZSBtYWNoaW5lIGZvciBhIGNvbnRyYWN0LlxuICAgKi9cbiAgZ2V0T3JDcmVhdGUoY29udHJhY3RJZDogc3RyaW5nLCBpbml0aWFsU3RhdGU6IENvbnRyYWN0U3RhdGUgPSAnZHJhZnQnKTogQ29udHJhY3RTdGF0ZU1hY2hpbmUge1xuICAgIGlmICghdGhpcy5tYWNoaW5lcy5oYXMoY29udHJhY3RJZCkpIHtcbiAgICAgIHRoaXMubWFjaGluZXMuc2V0KGNvbnRyYWN0SWQsIG5ldyBDb250cmFjdFN0YXRlTWFjaGluZShjb250cmFjdElkLCBpbml0aWFsU3RhdGUpKTtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMubWFjaGluZXMuZ2V0KGNvbnRyYWN0SWQpITtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc3RhdGUgbWFjaGluZSBmb3IgYSBjb250cmFjdC5cbiAgICovXG4gIGdldChjb250cmFjdElkOiBzdHJpbmcpOiBDb250cmFjdFN0YXRlTWFjaGluZSB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLm1hY2hpbmVzLmdldChjb250cmFjdElkKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBzdGF0ZSBtYWNoaW5lLlxuICAgKi9cbiAgcmVtb3ZlKGNvbnRyYWN0SWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLm1hY2hpbmVzLmRlbGV0ZShjb250cmFjdElkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIGNvbnRyYWN0IElEcy5cbiAgICovXG4gIGdldEFsbENvbnRyYWN0SWRzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLm1hY2hpbmVzLmtleXMoKSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBzdGF0ZSBtYWNoaW5lcy5cbiAgICovXG4gIGdldEFsbCgpOiBNYXA8c3RyaW5nLCBDb250cmFjdFN0YXRlTWFjaGluZT4ge1xuICAgIHJldHVybiBuZXcgTWFwKHRoaXMubWFjaGluZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb250cmFjdHMgYnkgc3RhdGUuXG4gICAqL1xuICBnZXRCeVN0YXRlKHN0YXRlOiBDb250cmFjdFN0YXRlKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IFtpZCwgbWFjaGluZV0gb2YgdGhpcy5tYWNoaW5lcykge1xuICAgICAgaWYgKG1hY2hpbmUuZ2V0Q3VycmVudFN0YXRlKCkgPT09IHN0YXRlKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGlkKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZHJhZnQgY29udHJhY3RzIChwZW5kaW5nIGFwcHJvdmFsKS5cbiAgICovXG4gIGdldERyYWZ0Q29udHJhY3RzKCk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gdGhpcy5nZXRCeVN0YXRlKCdkcmFmdCcpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhcHByb3ZlZCBjb250cmFjdHMuXG4gICAqL1xuICBnZXRBcHByb3ZlZENvbnRyYWN0cygpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMuZ2V0QnlTdGF0ZSgnYXBwcm92ZWQnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeHBvcnQgYWxsIHN0YXRlcy5cbiAgICovXG4gIGV4cG9ydCgpOiBSZWNvcmQ8c3RyaW5nLCBJQ29udHJhY3RTdGF0ZU1hY2hpbmU+IHtcbiAgICBjb25zdCByZXN1bHQ6IFJlY29yZDxzdHJpbmcsIElDb250cmFjdFN0YXRlTWFjaGluZT4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IFtpZCwgbWFjaGluZV0gb2YgdGhpcy5tYWNoaW5lcykge1xuICAgICAgcmVzdWx0W2lkXSA9IG1hY2hpbmUudG9KU09OKCk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogSW1wb3J0IHN0YXRlcy5cbiAgICovXG4gIGltcG9ydChzdGF0ZXM6IFJlY29yZDxzdHJpbmcsIElDb250cmFjdFN0YXRlTWFjaGluZT4pOiB2b2lkIHtcbiAgICB0aGlzLm1hY2hpbmVzLmNsZWFyKCk7XG4gICAgZm9yIChjb25zdCBbaWQsIGRhdGFdIG9mIE9iamVjdC5lbnRyaWVzKHN0YXRlcykpIHtcbiAgICAgIHRoaXMubWFjaGluZXMuc2V0KGlkLCBDb250cmFjdFN0YXRlTWFjaGluZS5mcm9tSlNPTihkYXRhKSk7XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogU2luZ2xldG9uIG1hbmFnZXIgaW5zdGFuY2UuXG4gKi9cbmxldCBkZWZhdWx0TWFuYWdlcjogU3RhdGVNYWNoaW5lTWFuYWdlciB8IG51bGwgPSBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFN0YXRlTWFjaGluZU1hbmFnZXIoKTogU3RhdGVNYWNoaW5lTWFuYWdlciB7XG4gIGlmICghZGVmYXVsdE1hbmFnZXIpIHtcbiAgICBkZWZhdWx0TWFuYWdlciA9IG5ldyBTdGF0ZU1hY2hpbmVNYW5hZ2VyKCk7XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRNYW5hZ2VyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzZXREZWZhdWx0U3RhdGVNYWNoaW5lTWFuYWdlcigpOiB2b2lkIHtcbiAgZGVmYXVsdE1hbmFnZXIgPSBudWxsO1xufVxuIl19