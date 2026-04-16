"use strict";
/**
 * ASF V4.0 Integration Tests
 *
 * End-to-end flow tests for ownership lattice and contract workflow.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const state_machine_1 = require("../../core/ownership/state-machine");
const proposals_1 = require("../../core/ownership/proposals");
const gates_1 = require("../../core/ownership/gates");
const auto_approve_1 = require("../../core/dod/auto-approve");
const compile_gate_1 = require("../../core/dod/compile-gate");
/**
 * Mock ownership lattice for testing.
 */
class MockOwnershipLattice {
    constructor() {
        this.authorities = new Map();
    }
    setAuthority(roleId, authority) {
        if (!this.authorities.has(roleId)) {
            this.authorities.set(roleId, new Set());
        }
        this.authorities.get(roleId).add(authority);
    }
    hasAuthority(roleId, authority) {
        return this.authorities.get(roleId)?.has(authority) || false;
    }
    getOwner(nodeId) {
        // Simplified: return role based on node prefix
        if (nodeId.startsWith('api-'))
            return 'api-team';
        if (nodeId.startsWith('db-'))
            return 'db-team';
        return null;
    }
    getRolesWithAuthority(authority) {
        const roles = [];
        for (const [roleId, auths] of this.authorities.entries()) {
            if (auths.has(authority)) {
                roles.push(roleId);
            }
        }
        return roles;
    }
}
/**
 * Mock contract state provider for compile gate testing.
 */
class MockContractStateProvider {
    constructor() {
        this.states = new Map();
        this.proposals = [];
    }
    setContractState(contractId, state) {
        this.states.set(contractId, state);
    }
    getContractState(contractId) {
        return this.states.get(contractId) || null;
    }
    addProposal(proposal) {
        this.proposals.push(proposal);
    }
    async getPendingProposals(contractIds) {
        return this.proposals.filter((p) => contractIds.includes(p.contractId) && p.state === 'pending');
    }
    async getApprovedContract(contractId) {
        const state = this.states.get(contractId);
        return state === 'approved' ? { id: contractId } : null;
    }
}
(0, globals_1.describe)('Ownership Flow Integration', () => {
    let lattice;
    let proposalStore;
    let proposalManager;
    let gate;
    (0, globals_1.beforeEach)(() => {
        lattice = new MockOwnershipLattice();
        lattice.setAuthority('architect', 'architect');
        lattice.setAuthority('backend-team', 'developer');
        proposalStore = new proposals_1.InMemoryProposalStore();
        proposalManager = new proposals_1.ProposalManager(proposalStore, lattice);
        gate = new gates_1.ContractGate(lattice);
    });
    (0, globals_1.it)('should complete full contract approval workflow', async () => {
        // 1. Create contract state machine
        const machine = new state_machine_1.ContractStateMachine('api-gateway-v1', 'draft', '1.0.0');
        (0, globals_1.expect)(machine.isDraft()).toBe(true);
        // 2. Non-architect tries to write directly (should fail)
        const writeResult = gate.checkWritePermission('api-gateway-v1', 'OpenAPI', 'backend-team');
        (0, globals_1.expect)(writeResult.allowed).toBe(false);
        (0, globals_1.expect)(writeResult.proposalRequired).toBe(true);
        // 3. Non-architect submits proposal
        const mockDiff = {
            contractType: 'OpenAPI',
            version: { before: '1.0.0', after: '1.0.1', bump: 'patch' },
            changes: { added: [], removed: [], modified: [] },
            breaking: false,
            requiresApproval: false,
            changelog: 'Added new endpoint',
            riskScore: 15,
        };
        const proposal = await proposalManager.submit({
            contractId: 'api-gateway-v1',
            proposerRoleId: 'backend-team',
            diff: mockDiff,
        });
        (0, globals_1.expect)(proposal.state).toBe('pending');
        (0, globals_1.expect)(proposal.proposerId).toBe('backend-team');
        // 4. Architect approves proposal
        const approveResult = await proposalManager.approve(proposal.id, 'architect', 'LGTM');
        (0, globals_1.expect)(approveResult.success).toBe(true);
        // 5. State machine transitions to approved
        const transitionResult = machine.transition('approved', 'architect', 'Proposal approved');
        (0, globals_1.expect)(transitionResult.success).toBe(true);
        (0, globals_1.expect)(machine.isApproved()).toBe(true);
        // 6. Version is bumped
        (0, globals_1.expect)(machine.getVersion()).toBe('1.0.1');
    });
    (0, globals_1.it)('should block non-architect from approving', async () => {
        const proposal = await proposalManager.submit({
            contractId: 'api-gateway-v1',
            proposerRoleId: 'backend-team',
            diff: {
                contractType: 'OpenAPI',
                version: { before: '1.0.0', after: '1.0.1', bump: 'patch' },
                changes: { added: [], removed: [], modified: [] },
                breaking: false,
                requiresApproval: false,
                changelog: 'Test',
            },
        });
        // Non-architect tries to approve
        const result = await proposalManager.approve(proposal.id, 'backend-team', 'Approving my own proposal');
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('architect');
    });
    (0, globals_1.it)('should prevent approving own proposal', async () => {
        lattice.setAuthority('architect-dev', 'architect');
        const proposal = await proposalManager.submit({
            contractId: 'api-gateway-v1',
            proposerRoleId: 'architect-dev',
            diff: {
                contractType: 'OpenAPI',
                version: { before: '1.0.0', after: '1.0.1', bump: 'patch' },
                changes: { added: [], removed: [], modified: [] },
                breaking: false,
                requiresApproval: false,
                changelog: 'Test',
            },
        });
        // Same person tries to approve their own proposal
        const result = await proposalManager.approve(proposal.id, 'architect-dev', 'Self-approval');
        (0, globals_1.expect)(result.success).toBe(false);
        (0, globals_1.expect)(result.error).toContain('own proposal');
    });
});
(0, globals_1.describe)('Auto-Approve + Compile Gate Integration', () => {
    let stateProvider;
    (0, globals_1.beforeEach)(() => {
        stateProvider = new MockContractStateProvider();
    });
    (0, globals_1.it)('should auto-approve low-risk changes and pass compile gate', async () => {
        // Low-risk diff (only adding optional fields)
        const lowRiskDiff = {
            contractType: 'OpenAPI',
            version: { before: '1.0.0', after: '1.0.1', bump: 'patch' },
            changes: {
                added: [
                    {
                        path: '/users/age',
                        type: 'field_add',
                        description: 'Added optional field',
                        severity: 'low',
                        details: { required: false },
                    },
                ],
                removed: [],
                modified: [],
            },
            breaking: false,
            requiresApproval: false,
            changelog: 'Added optional age field',
            riskScore: 10,
        };
        // Should be auto-approvable
        (0, globals_1.expect)((0, auto_approve_1.canAutoApprove)(lowRiskDiff)).toBe(true);
        // Set contract as approved
        stateProvider.setContractState('api-gateway-v1', 'approved');
        // Compile gate should pass
        const compileResult = await (0, compile_gate_1.checkCompileGate)({
            contractIds: ['api-gateway-v1'],
            stateProvider: stateProvider,
        });
        (0, globals_1.expect)(compileResult.allowed).toBe(true);
        (0, globals_1.expect)(compileResult.errors).toHaveLength(0);
    });
    (0, globals_1.it)('should block compilation for draft contracts', async () => {
        stateProvider.setContractState('api-gateway-v1', 'draft');
        const compileResult = await (0, compile_gate_1.checkCompileGate)({
            contractIds: ['api-gateway-v1'],
            stateProvider: stateProvider,
        });
        (0, globals_1.expect)(compileResult.allowed).toBe(false);
        (0, globals_1.expect)(compileResult.errors).toContainEqual(globals_1.expect.stringContaining('DRAFT state'));
        (0, globals_1.expect)(compileResult.pendingApprovals).toContain('api-gateway-v1');
    });
    (0, globals_1.it)('should block compilation for contracts with pending proposals', async () => {
        stateProvider.setContractState('api-gateway-v1', 'approved');
        stateProvider.addProposal({
            id: 'prop-1',
            contractId: 'api-gateway-v1',
            proposerId: 'backend-team',
            state: 'pending',
            diff: {},
            submittedAt: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            contractType: 'OpenAPI',
        });
        const compileResult = await (0, compile_gate_1.checkCompileGate)({
            contractIds: ['api-gateway-v1'],
            stateProvider: stateProvider,
        });
        (0, globals_1.expect)(compileResult.allowed).toBe(false);
        (0, globals_1.expect)(compileResult.errors).toContainEqual(globals_1.expect.stringContaining('pending proposal'));
    });
    (0, globals_1.it)('should allow compilation when all contracts are approved', async () => {
        stateProvider.setContractState('api-gateway-v1', 'approved');
        stateProvider.setContractState('user-service', 'approved');
        const compileResult = await (0, compile_gate_1.checkCompileGate)({
            contractIds: ['api-gateway-v1', 'user-service'],
            stateProvider: stateProvider,
        });
        (0, globals_1.expect)(compileResult.allowed).toBe(true);
        (0, globals_1.expect)(compileResult.errors).toHaveLength(0);
        (0, globals_1.expect)(compileResult.warnings).toHaveLength(0);
    });
});
(0, globals_1.describe)('Full Workflow: Propose → Approve → Compile', () => {
    (0, globals_1.it)('should complete full workflow for low-risk change', async () => {
        const lattice = new MockOwnershipLattice();
        lattice.setAuthority('architect', 'architect');
        const proposalStore = new proposals_1.InMemoryProposalStore();
        const proposalManager = new proposals_1.ProposalManager(proposalStore, lattice);
        const stateMachine = new state_machine_1.ContractStateMachine('api-v1', 'draft', '1.0.0');
        const stateProvider = new MockContractStateProvider();
        // Step 1: Submit proposal
        const proposal = await proposalManager.submit({
            contractId: 'api-v1',
            proposerRoleId: 'dev-team',
            diff: {
                contractType: 'OpenAPI',
                version: { before: '1.0.0', after: '1.0.1', bump: 'patch' },
                changes: { added: [], removed: [], modified: [] },
                breaking: false,
                requiresApproval: false,
                changelog: 'Minor change',
                riskScore: 10,
            },
        });
        // Step 2: Architect approves
        await proposalManager.approve(proposal.id, 'architect', 'Approved');
        // Step 3: Update state machine
        stateMachine.transition('approved', 'architect');
        // Step 4: Update state provider
        stateProvider.setContractState('api-v1', 'approved');
        // Step 5: Check compile gate
        const compileResult = await (0, compile_gate_1.checkCompileGate)({
            contractIds: ['api-v1'],
            stateProvider: stateProvider,
        });
        (0, globals_1.expect)(compileResult.allowed).toBe(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3duZXJzaGlwLWZsb3cudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9fX3Rlc3RzX18vaW50ZWdyYXRpb24vb3duZXJzaGlwLWZsb3cudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7O0FBRUgsMkNBQWlFO0FBQ2pFLHNFQUEwRTtBQUMxRSw4REFBd0Y7QUFDeEYsc0RBQTBEO0FBQzFELDhEQUE2RDtBQUM3RCw4REFBK0Q7QUFHL0Q7O0dBRUc7QUFDSCxNQUFNLG9CQUFvQjtJQUd4QjtRQUNFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRUQsWUFBWSxDQUFDLE1BQWMsRUFBRSxTQUFpQjtRQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQzFDLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUUsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELFlBQVksQ0FBQyxNQUFjLEVBQUUsU0FBaUI7UUFDNUMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDO0lBQy9ELENBQUM7SUFFRCxRQUFRLENBQUMsTUFBYztRQUNyQiwrQ0FBK0M7UUFDL0MsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQztZQUFFLE9BQU8sVUFBVSxDQUFDO1FBQ2pELElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7WUFBRSxPQUFPLFNBQVMsQ0FBQztRQUMvQyxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxTQUFpQjtRQUNyQyxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7UUFDM0IsS0FBSyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUN6RCxJQUFJLEtBQUssQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztnQkFDekIsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNyQixDQUFDO1FBQ0gsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztDQUNGO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLHlCQUF5QjtJQUk3QjtRQUNFLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN4QixJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRUQsZ0JBQWdCLENBQUMsVUFBa0IsRUFBRSxLQUF3QztRQUMzRSxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELGdCQUFnQixDQUFDLFVBQWtCO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDO0lBQzdDLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBMEI7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxXQUFxQjtRQUM3QyxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUMxQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssS0FBSyxTQUFTLENBQ25FLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFVBQWtCO1FBQzFDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzFDLE9BQU8sS0FBSyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUMxRCxDQUFDO0NBQ0Y7QUFFRCxJQUFBLGtCQUFRLEVBQUMsNEJBQTRCLEVBQUUsR0FBRyxFQUFFO0lBQzFDLElBQUksT0FBNkIsQ0FBQztJQUNsQyxJQUFJLGFBQW9DLENBQUM7SUFDekMsSUFBSSxlQUFnQyxDQUFDO0lBQ3JDLElBQUksSUFBa0IsQ0FBQztJQUV2QixJQUFBLG9CQUFVLEVBQUMsR0FBRyxFQUFFO1FBQ2QsT0FBTyxHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQztRQUNyQyxPQUFPLENBQUMsWUFBWSxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUMvQyxPQUFPLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVsRCxhQUFhLEdBQUcsSUFBSSxpQ0FBcUIsRUFBRSxDQUFDO1FBQzVDLGVBQWUsR0FBRyxJQUFJLDJCQUFlLENBQUMsYUFBYSxFQUFFLE9BQWMsQ0FBQyxDQUFDO1FBQ3JFLElBQUksR0FBRyxJQUFJLG9CQUFZLENBQUMsT0FBYyxDQUFDLENBQUM7SUFDMUMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLFlBQUUsRUFBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMvRCxtQ0FBbUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxvQ0FBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDN0UsSUFBQSxnQkFBTSxFQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVyQyx5REFBeUQ7UUFDekQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUMzQyxnQkFBZ0IsRUFDaEIsU0FBUyxFQUNULGNBQWMsQ0FDZixDQUFDO1FBQ0YsSUFBQSxnQkFBTSxFQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsSUFBQSxnQkFBTSxFQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVoRCxvQ0FBb0M7UUFDcEMsTUFBTSxRQUFRLEdBQWlCO1lBQzdCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQzNELE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFO1lBQ2pELFFBQVEsRUFBRSxLQUFLO1lBQ2YsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixTQUFTLEVBQUUsb0JBQW9CO1lBQy9CLFNBQVMsRUFBRSxFQUFFO1NBQ2QsQ0FBQztRQUVGLE1BQU0sUUFBUSxHQUFHLE1BQU0sZUFBZSxDQUFDLE1BQU0sQ0FBQztZQUM1QyxVQUFVLEVBQUUsZ0JBQWdCO1lBQzVCLGNBQWMsRUFBRSxjQUFjO1lBQzlCLElBQUksRUFBRSxRQUFRO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsSUFBQSxnQkFBTSxFQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsSUFBQSxnQkFBTSxFQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFakQsaUNBQWlDO1FBQ2pDLE1BQU0sYUFBYSxHQUFHLE1BQU0sZUFBZSxDQUFDLE9BQU8sQ0FDakQsUUFBUSxDQUFDLEVBQUUsRUFDWCxXQUFXLEVBQ1gsTUFBTSxDQUNQLENBQUM7UUFDRixJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QywyQ0FBMkM7UUFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUMxRixJQUFBLGdCQUFNLEVBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUEsZ0JBQU0sRUFBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFeEMsdUJBQXVCO1FBQ3ZCLElBQUEsZ0JBQU0sRUFBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLFlBQUUsRUFBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RCxNQUFNLFFBQVEsR0FBRyxNQUFNLGVBQWUsQ0FBQyxNQUFNLENBQUM7WUFDNUMsVUFBVSxFQUFFLGdCQUFnQjtZQUM1QixjQUFjLEVBQUUsY0FBYztZQUM5QixJQUFJLEVBQUU7Z0JBQ0osWUFBWSxFQUFFLFNBQVM7Z0JBQ3ZCLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFO2dCQUMzRCxPQUFPLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRTtnQkFDakQsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsZ0JBQWdCLEVBQUUsS0FBSztnQkFDdkIsU0FBUyxFQUFFLE1BQU07YUFDRjtTQUNsQixDQUFDLENBQUM7UUFFSCxpQ0FBaUM7UUFDakMsTUFBTSxNQUFNLEdBQUcsTUFBTSxlQUFlLENBQUMsT0FBTyxDQUMxQyxRQUFRLENBQUMsRUFBRSxFQUNYLGNBQWMsRUFDZCwyQkFBMkIsQ0FDNUIsQ0FBQztRQUVGLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25DLElBQUEsZ0JBQU0sRUFBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzlDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxZQUFFLEVBQUMsdUNBQXVDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckQsT0FBTyxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFbkQsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFlLENBQUMsTUFBTSxDQUFDO1lBQzVDLFVBQVUsRUFBRSxnQkFBZ0I7WUFDNUIsY0FBYyxFQUFFLGVBQWU7WUFDL0IsSUFBSSxFQUFFO2dCQUNKLFlBQVksRUFBRSxTQUFTO2dCQUN2QixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtnQkFDM0QsT0FBTyxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUU7Z0JBQ2pELFFBQVEsRUFBRSxLQUFLO2dCQUNmLGdCQUFnQixFQUFFLEtBQUs7Z0JBQ3ZCLFNBQVMsRUFBRSxNQUFNO2FBQ0Y7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sZUFBZSxDQUFDLE9BQU8sQ0FDMUMsUUFBUSxDQUFDLEVBQUUsRUFDWCxlQUFlLEVBQ2YsZUFBZSxDQUNoQixDQUFDO1FBRUYsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkMsSUFBQSxnQkFBTSxFQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDakQsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUVILElBQUEsa0JBQVEsRUFBQyx5Q0FBeUMsRUFBRSxHQUFHLEVBQUU7SUFDdkQsSUFBSSxhQUF3QyxDQUFDO0lBRTdDLElBQUEsb0JBQVUsRUFBQyxHQUFHLEVBQUU7UUFDZCxhQUFhLEdBQUcsSUFBSSx5QkFBeUIsRUFBRSxDQUFDO0lBQ2xELENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxZQUFFLEVBQUMsNERBQTRELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUUsOENBQThDO1FBQzlDLE1BQU0sV0FBVyxHQUFpQjtZQUNoQyxZQUFZLEVBQUUsU0FBUztZQUN2QixPQUFPLEVBQUUsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtZQUMzRCxPQUFPLEVBQUU7Z0JBQ1AsS0FBSyxFQUFFO29CQUNMO3dCQUNFLElBQUksRUFBRSxZQUFZO3dCQUNsQixJQUFJLEVBQUUsV0FBVzt3QkFDakIsV0FBVyxFQUFFLHNCQUFzQjt3QkFDbkMsUUFBUSxFQUFFLEtBQUs7d0JBQ2YsT0FBTyxFQUFFLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRTtxQkFDN0I7aUJBQ0Y7Z0JBQ0QsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsUUFBUSxFQUFFLEVBQUU7YUFDYjtZQUNELFFBQVEsRUFBRSxLQUFLO1lBQ2YsZ0JBQWdCLEVBQUUsS0FBSztZQUN2QixTQUFTLEVBQUUsMEJBQTBCO1lBQ3JDLFNBQVMsRUFBRSxFQUFFO1NBQ2QsQ0FBQztRQUVGLDRCQUE0QjtRQUM1QixJQUFBLGdCQUFNLEVBQUMsSUFBQSw2QkFBYyxFQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBRS9DLDJCQUEyQjtRQUMzQixhQUFhLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFN0QsMkJBQTJCO1FBQzNCLE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBQSwrQkFBZ0IsRUFBQztZQUMzQyxXQUFXLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztZQUMvQixhQUFhLEVBQUUsYUFBb0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBQSxnQkFBTSxFQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekMsSUFBQSxnQkFBTSxFQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDL0MsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLFlBQUUsRUFBQyw4Q0FBOEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxhQUFhLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFMUQsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFBLCtCQUFnQixFQUFDO1lBQzNDLFdBQVcsRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQy9CLGFBQWEsRUFBRSxhQUFvQjtTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQyxJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FDekMsZ0JBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FDdkMsQ0FBQztRQUNGLElBQUEsZ0JBQU0sRUFBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUNyRSxDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsWUFBRSxFQUFDLCtEQUErRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdFLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUM3RCxhQUFhLENBQUMsV0FBVyxDQUFDO1lBQ3hCLEVBQUUsRUFBRSxRQUFRO1lBQ1osVUFBVSxFQUFFLGdCQUFnQjtZQUM1QixVQUFVLEVBQUUsY0FBYztZQUMxQixLQUFLLEVBQUUsU0FBUztZQUNoQixJQUFJLEVBQUUsRUFBa0I7WUFDeEIsV0FBVyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDdkIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDckIsWUFBWSxFQUFFLFNBQVM7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFBLCtCQUFnQixFQUFDO1lBQzNDLFdBQVcsRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQy9CLGFBQWEsRUFBRSxhQUFvQjtTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQyxJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGNBQWMsQ0FDekMsZ0JBQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUM1QyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFBLFlBQUUsRUFBQywwREFBMEQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4RSxhQUFhLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDN0QsYUFBYSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUUzRCxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUEsK0JBQWdCLEVBQUM7WUFDM0MsV0FBVyxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxDQUFDO1lBQy9DLGFBQWEsRUFBRSxhQUFvQjtTQUNwQyxDQUFDLENBQUM7UUFFSCxJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN6QyxJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxJQUFBLGdCQUFNLEVBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqRCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBRUgsSUFBQSxrQkFBUSxFQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtJQUMxRCxJQUFBLFlBQUUsRUFBQyxtREFBbUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNqRSxNQUFNLE9BQU8sR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUM7UUFDM0MsT0FBTyxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFL0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxpQ0FBcUIsRUFBRSxDQUFDO1FBQ2xELE1BQU0sZUFBZSxHQUFHLElBQUksMkJBQWUsQ0FBQyxhQUFhLEVBQUUsT0FBYyxDQUFDLENBQUM7UUFDM0UsTUFBTSxZQUFZLEdBQUcsSUFBSSxvQ0FBb0IsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzFFLE1BQU0sYUFBYSxHQUFHLElBQUkseUJBQXlCLEVBQUUsQ0FBQztRQUV0RCwwQkFBMEI7UUFDMUIsTUFBTSxRQUFRLEdBQUcsTUFBTSxlQUFlLENBQUMsTUFBTSxDQUFDO1lBQzVDLFVBQVUsRUFBRSxRQUFRO1lBQ3BCLGNBQWMsRUFBRSxVQUFVO1lBQzFCLElBQUksRUFBRTtnQkFDSixZQUFZLEVBQUUsU0FBUztnQkFDdkIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUU7Z0JBQzNELE9BQU8sRUFBRSxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFO2dCQUNqRCxRQUFRLEVBQUUsS0FBSztnQkFDZixnQkFBZ0IsRUFBRSxLQUFLO2dCQUN2QixTQUFTLEVBQUUsY0FBYztnQkFDekIsU0FBUyxFQUFFLEVBQUU7YUFDRTtTQUNsQixDQUFDLENBQUM7UUFFSCw2QkFBNkI7UUFDN0IsTUFBTSxlQUFlLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXBFLCtCQUErQjtRQUMvQixZQUFZLENBQUMsVUFBVSxDQUFDLFVBQVUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUVqRCxnQ0FBZ0M7UUFDaEMsYUFBYSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVyRCw2QkFBNkI7UUFDN0IsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFBLCtCQUFnQixFQUFDO1lBQzNDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQztZQUN2QixhQUFhLEVBQUUsYUFBb0I7U0FDcEMsQ0FBQyxDQUFDO1FBRUgsSUFBQSxnQkFBTSxFQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0MsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQVNGIFY0LjAgSW50ZWdyYXRpb24gVGVzdHNcbiAqIFxuICogRW5kLXRvLWVuZCBmbG93IHRlc3RzIGZvciBvd25lcnNoaXAgbGF0dGljZSBhbmQgY29udHJhY3Qgd29ya2Zsb3cuXG4gKiBWZXJzaW9uOiB2MC44LjVcbiAqL1xuXG5pbXBvcnQgeyBkZXNjcmliZSwgaXQsIGV4cGVjdCwgYmVmb3JlRWFjaCB9IGZyb20gJ0BqZXN0L2dsb2JhbHMnO1xuaW1wb3J0IHsgQ29udHJhY3RTdGF0ZU1hY2hpbmUgfSBmcm9tICcuLi8uLi9jb3JlL293bmVyc2hpcC9zdGF0ZS1tYWNoaW5lJztcbmltcG9ydCB7IEluTWVtb3J5UHJvcG9zYWxTdG9yZSwgUHJvcG9zYWxNYW5hZ2VyIH0gZnJvbSAnLi4vLi4vY29yZS9vd25lcnNoaXAvcHJvcG9zYWxzJztcbmltcG9ydCB7IENvbnRyYWN0R2F0ZSB9IGZyb20gJy4uLy4uL2NvcmUvb3duZXJzaGlwL2dhdGVzJztcbmltcG9ydCB7IGNhbkF1dG9BcHByb3ZlIH0gZnJvbSAnLi4vLi4vY29yZS9kb2QvYXV0by1hcHByb3ZlJztcbmltcG9ydCB7IGNoZWNrQ29tcGlsZUdhdGUgfSBmcm9tICcuLi8uLi9jb3JlL2RvZC9jb21waWxlLWdhdGUnO1xuaW1wb3J0IHR5cGUgeyBDb250cmFjdERpZmYsIENvbnRyYWN0UHJvcG9zYWwgfSBmcm9tICcuLi8uLi9jb3JlL293bmVyc2hpcC90eXBlcyc7XG5cbi8qKlxuICogTW9jayBvd25lcnNoaXAgbGF0dGljZSBmb3IgdGVzdGluZy5cbiAqL1xuY2xhc3MgTW9ja093bmVyc2hpcExhdHRpY2Uge1xuICBwcml2YXRlIGF1dGhvcml0aWVzOiBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj47XG5cbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5hdXRob3JpdGllcyA9IG5ldyBNYXAoKTtcbiAgfVxuXG4gIHNldEF1dGhvcml0eShyb2xlSWQ6IHN0cmluZywgYXV0aG9yaXR5OiBzdHJpbmcpOiB2b2lkIHtcbiAgICBpZiAoIXRoaXMuYXV0aG9yaXRpZXMuaGFzKHJvbGVJZCkpIHtcbiAgICAgIHRoaXMuYXV0aG9yaXRpZXMuc2V0KHJvbGVJZCwgbmV3IFNldCgpKTtcbiAgICB9XG4gICAgdGhpcy5hdXRob3JpdGllcy5nZXQocm9sZUlkKSEuYWRkKGF1dGhvcml0eSk7XG4gIH1cblxuICBoYXNBdXRob3JpdHkocm9sZUlkOiBzdHJpbmcsIGF1dGhvcml0eTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIHRoaXMuYXV0aG9yaXRpZXMuZ2V0KHJvbGVJZCk/LmhhcyhhdXRob3JpdHkpIHx8IGZhbHNlO1xuICB9XG5cbiAgZ2V0T3duZXIobm9kZUlkOiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHtcbiAgICAvLyBTaW1wbGlmaWVkOiByZXR1cm4gcm9sZSBiYXNlZCBvbiBub2RlIHByZWZpeFxuICAgIGlmIChub2RlSWQuc3RhcnRzV2l0aCgnYXBpLScpKSByZXR1cm4gJ2FwaS10ZWFtJztcbiAgICBpZiAobm9kZUlkLnN0YXJ0c1dpdGgoJ2RiLScpKSByZXR1cm4gJ2RiLXRlYW0nO1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgZ2V0Um9sZXNXaXRoQXV0aG9yaXR5KGF1dGhvcml0eTogc3RyaW5nKTogc3RyaW5nW10ge1xuICAgIGNvbnN0IHJvbGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgW3JvbGVJZCwgYXV0aHNdIG9mIHRoaXMuYXV0aG9yaXRpZXMuZW50cmllcygpKSB7XG4gICAgICBpZiAoYXV0aHMuaGFzKGF1dGhvcml0eSkpIHtcbiAgICAgICAgcm9sZXMucHVzaChyb2xlSWQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcm9sZXM7XG4gIH1cbn1cblxuLyoqXG4gKiBNb2NrIGNvbnRyYWN0IHN0YXRlIHByb3ZpZGVyIGZvciBjb21waWxlIGdhdGUgdGVzdGluZy5cbiAqL1xuY2xhc3MgTW9ja0NvbnRyYWN0U3RhdGVQcm92aWRlciB7XG4gIHByaXZhdGUgc3RhdGVzOiBNYXA8c3RyaW5nLCAnZHJhZnQnIHwgJ2FwcHJvdmVkJyB8ICdyZWplY3RlZCc+O1xuICBwcml2YXRlIHByb3Bvc2FsczogQ29udHJhY3RQcm9wb3NhbFtdO1xuXG4gIGNvbnN0cnVjdG9yKCkge1xuICAgIHRoaXMuc3RhdGVzID0gbmV3IE1hcCgpO1xuICAgIHRoaXMucHJvcG9zYWxzID0gW107XG4gIH1cblxuICBzZXRDb250cmFjdFN0YXRlKGNvbnRyYWN0SWQ6IHN0cmluZywgc3RhdGU6ICdkcmFmdCcgfCAnYXBwcm92ZWQnIHwgJ3JlamVjdGVkJyk6IHZvaWQge1xuICAgIHRoaXMuc3RhdGVzLnNldChjb250cmFjdElkLCBzdGF0ZSk7XG4gIH1cblxuICBnZXRDb250cmFjdFN0YXRlKGNvbnRyYWN0SWQ6IHN0cmluZyk6ICdkcmFmdCcgfCAnYXBwcm92ZWQnIHwgJ3JlamVjdGVkJyB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLnN0YXRlcy5nZXQoY29udHJhY3RJZCkgfHwgbnVsbDtcbiAgfVxuXG4gIGFkZFByb3Bvc2FsKHByb3Bvc2FsOiBDb250cmFjdFByb3Bvc2FsKTogdm9pZCB7XG4gICAgdGhpcy5wcm9wb3NhbHMucHVzaChwcm9wb3NhbCk7XG4gIH1cblxuICBhc3luYyBnZXRQZW5kaW5nUHJvcG9zYWxzKGNvbnRyYWN0SWRzOiBzdHJpbmdbXSk6IFByb21pc2U8Q29udHJhY3RQcm9wb3NhbFtdPiB7XG4gICAgcmV0dXJuIHRoaXMucHJvcG9zYWxzLmZpbHRlcihcbiAgICAgIChwKSA9PiBjb250cmFjdElkcy5pbmNsdWRlcyhwLmNvbnRyYWN0SWQpICYmIHAuc3RhdGUgPT09ICdwZW5kaW5nJ1xuICAgICk7XG4gIH1cblxuICBhc3luYyBnZXRBcHByb3ZlZENvbnRyYWN0KGNvbnRyYWN0SWQ6IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xuICAgIGNvbnN0IHN0YXRlID0gdGhpcy5zdGF0ZXMuZ2V0KGNvbnRyYWN0SWQpO1xuICAgIHJldHVybiBzdGF0ZSA9PT0gJ2FwcHJvdmVkJyA/IHsgaWQ6IGNvbnRyYWN0SWQgfSA6IG51bGw7XG4gIH1cbn1cblxuZGVzY3JpYmUoJ093bmVyc2hpcCBGbG93IEludGVncmF0aW9uJywgKCkgPT4ge1xuICBsZXQgbGF0dGljZTogTW9ja093bmVyc2hpcExhdHRpY2U7XG4gIGxldCBwcm9wb3NhbFN0b3JlOiBJbk1lbW9yeVByb3Bvc2FsU3RvcmU7XG4gIGxldCBwcm9wb3NhbE1hbmFnZXI6IFByb3Bvc2FsTWFuYWdlcjtcbiAgbGV0IGdhdGU6IENvbnRyYWN0R2F0ZTtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBsYXR0aWNlID0gbmV3IE1vY2tPd25lcnNoaXBMYXR0aWNlKCk7XG4gICAgbGF0dGljZS5zZXRBdXRob3JpdHkoJ2FyY2hpdGVjdCcsICdhcmNoaXRlY3QnKTtcbiAgICBsYXR0aWNlLnNldEF1dGhvcml0eSgnYmFja2VuZC10ZWFtJywgJ2RldmVsb3BlcicpO1xuICAgIFxuICAgIHByb3Bvc2FsU3RvcmUgPSBuZXcgSW5NZW1vcnlQcm9wb3NhbFN0b3JlKCk7XG4gICAgcHJvcG9zYWxNYW5hZ2VyID0gbmV3IFByb3Bvc2FsTWFuYWdlcihwcm9wb3NhbFN0b3JlLCBsYXR0aWNlIGFzIGFueSk7XG4gICAgZ2F0ZSA9IG5ldyBDb250cmFjdEdhdGUobGF0dGljZSBhcyBhbnkpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGNvbXBsZXRlIGZ1bGwgY29udHJhY3QgYXBwcm92YWwgd29ya2Zsb3cnLCBhc3luYyAoKSA9PiB7XG4gICAgLy8gMS4gQ3JlYXRlIGNvbnRyYWN0IHN0YXRlIG1hY2hpbmVcbiAgICBjb25zdCBtYWNoaW5lID0gbmV3IENvbnRyYWN0U3RhdGVNYWNoaW5lKCdhcGktZ2F0ZXdheS12MScsICdkcmFmdCcsICcxLjAuMCcpO1xuICAgIGV4cGVjdChtYWNoaW5lLmlzRHJhZnQoKSkudG9CZSh0cnVlKTtcblxuICAgIC8vIDIuIE5vbi1hcmNoaXRlY3QgdHJpZXMgdG8gd3JpdGUgZGlyZWN0bHkgKHNob3VsZCBmYWlsKVxuICAgIGNvbnN0IHdyaXRlUmVzdWx0ID0gZ2F0ZS5jaGVja1dyaXRlUGVybWlzc2lvbihcbiAgICAgICdhcGktZ2F0ZXdheS12MScsXG4gICAgICAnT3BlbkFQSScsXG4gICAgICAnYmFja2VuZC10ZWFtJ1xuICAgICk7XG4gICAgZXhwZWN0KHdyaXRlUmVzdWx0LmFsbG93ZWQpLnRvQmUoZmFsc2UpO1xuICAgIGV4cGVjdCh3cml0ZVJlc3VsdC5wcm9wb3NhbFJlcXVpcmVkKS50b0JlKHRydWUpO1xuXG4gICAgLy8gMy4gTm9uLWFyY2hpdGVjdCBzdWJtaXRzIHByb3Bvc2FsXG4gICAgY29uc3QgbW9ja0RpZmY6IENvbnRyYWN0RGlmZiA9IHtcbiAgICAgIGNvbnRyYWN0VHlwZTogJ09wZW5BUEknLFxuICAgICAgdmVyc2lvbjogeyBiZWZvcmU6ICcxLjAuMCcsIGFmdGVyOiAnMS4wLjEnLCBidW1wOiAncGF0Y2gnIH0sXG4gICAgICBjaGFuZ2VzOiB7IGFkZGVkOiBbXSwgcmVtb3ZlZDogW10sIG1vZGlmaWVkOiBbXSB9LFxuICAgICAgYnJlYWtpbmc6IGZhbHNlLFxuICAgICAgcmVxdWlyZXNBcHByb3ZhbDogZmFsc2UsXG4gICAgICBjaGFuZ2Vsb2c6ICdBZGRlZCBuZXcgZW5kcG9pbnQnLFxuICAgICAgcmlza1Njb3JlOiAxNSxcbiAgICB9O1xuXG4gICAgY29uc3QgcHJvcG9zYWwgPSBhd2FpdCBwcm9wb3NhbE1hbmFnZXIuc3VibWl0KHtcbiAgICAgIGNvbnRyYWN0SWQ6ICdhcGktZ2F0ZXdheS12MScsXG4gICAgICBwcm9wb3NlclJvbGVJZDogJ2JhY2tlbmQtdGVhbScsXG4gICAgICBkaWZmOiBtb2NrRGlmZixcbiAgICB9KTtcblxuICAgIGV4cGVjdChwcm9wb3NhbC5zdGF0ZSkudG9CZSgncGVuZGluZycpO1xuICAgIGV4cGVjdChwcm9wb3NhbC5wcm9wb3NlcklkKS50b0JlKCdiYWNrZW5kLXRlYW0nKTtcblxuICAgIC8vIDQuIEFyY2hpdGVjdCBhcHByb3ZlcyBwcm9wb3NhbFxuICAgIGNvbnN0IGFwcHJvdmVSZXN1bHQgPSBhd2FpdCBwcm9wb3NhbE1hbmFnZXIuYXBwcm92ZShcbiAgICAgIHByb3Bvc2FsLmlkLFxuICAgICAgJ2FyY2hpdGVjdCcsXG4gICAgICAnTEdUTSdcbiAgICApO1xuICAgIGV4cGVjdChhcHByb3ZlUmVzdWx0LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XG5cbiAgICAvLyA1LiBTdGF0ZSBtYWNoaW5lIHRyYW5zaXRpb25zIHRvIGFwcHJvdmVkXG4gICAgY29uc3QgdHJhbnNpdGlvblJlc3VsdCA9IG1hY2hpbmUudHJhbnNpdGlvbignYXBwcm92ZWQnLCAnYXJjaGl0ZWN0JywgJ1Byb3Bvc2FsIGFwcHJvdmVkJyk7XG4gICAgZXhwZWN0KHRyYW5zaXRpb25SZXN1bHQuc3VjY2VzcykudG9CZSh0cnVlKTtcbiAgICBleHBlY3QobWFjaGluZS5pc0FwcHJvdmVkKCkpLnRvQmUodHJ1ZSk7XG5cbiAgICAvLyA2LiBWZXJzaW9uIGlzIGJ1bXBlZFxuICAgIGV4cGVjdChtYWNoaW5lLmdldFZlcnNpb24oKSkudG9CZSgnMS4wLjEnKTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCBibG9jayBub24tYXJjaGl0ZWN0IGZyb20gYXBwcm92aW5nJywgYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IHByb3Bvc2FsID0gYXdhaXQgcHJvcG9zYWxNYW5hZ2VyLnN1Ym1pdCh7XG4gICAgICBjb250cmFjdElkOiAnYXBpLWdhdGV3YXktdjEnLFxuICAgICAgcHJvcG9zZXJSb2xlSWQ6ICdiYWNrZW5kLXRlYW0nLFxuICAgICAgZGlmZjoge1xuICAgICAgICBjb250cmFjdFR5cGU6ICdPcGVuQVBJJyxcbiAgICAgICAgdmVyc2lvbjogeyBiZWZvcmU6ICcxLjAuMCcsIGFmdGVyOiAnMS4wLjEnLCBidW1wOiAncGF0Y2gnIH0sXG4gICAgICAgIGNoYW5nZXM6IHsgYWRkZWQ6IFtdLCByZW1vdmVkOiBbXSwgbW9kaWZpZWQ6IFtdIH0sXG4gICAgICAgIGJyZWFraW5nOiBmYWxzZSxcbiAgICAgICAgcmVxdWlyZXNBcHByb3ZhbDogZmFsc2UsXG4gICAgICAgIGNoYW5nZWxvZzogJ1Rlc3QnLFxuICAgICAgfSBhcyBDb250cmFjdERpZmYsXG4gICAgfSk7XG5cbiAgICAvLyBOb24tYXJjaGl0ZWN0IHRyaWVzIHRvIGFwcHJvdmVcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBwcm9wb3NhbE1hbmFnZXIuYXBwcm92ZShcbiAgICAgIHByb3Bvc2FsLmlkLFxuICAgICAgJ2JhY2tlbmQtdGVhbScsXG4gICAgICAnQXBwcm92aW5nIG15IG93biBwcm9wb3NhbCdcbiAgICApO1xuXG4gICAgZXhwZWN0KHJlc3VsdC5zdWNjZXNzKS50b0JlKGZhbHNlKTtcbiAgICBleHBlY3QocmVzdWx0LmVycm9yKS50b0NvbnRhaW4oJ2FyY2hpdGVjdCcpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIHByZXZlbnQgYXBwcm92aW5nIG93biBwcm9wb3NhbCcsIGFzeW5jICgpID0+IHtcbiAgICBsYXR0aWNlLnNldEF1dGhvcml0eSgnYXJjaGl0ZWN0LWRldicsICdhcmNoaXRlY3QnKTtcbiAgICBcbiAgICBjb25zdCBwcm9wb3NhbCA9IGF3YWl0IHByb3Bvc2FsTWFuYWdlci5zdWJtaXQoe1xuICAgICAgY29udHJhY3RJZDogJ2FwaS1nYXRld2F5LXYxJyxcbiAgICAgIHByb3Bvc2VyUm9sZUlkOiAnYXJjaGl0ZWN0LWRldicsXG4gICAgICBkaWZmOiB7XG4gICAgICAgIGNvbnRyYWN0VHlwZTogJ09wZW5BUEknLFxuICAgICAgICB2ZXJzaW9uOiB7IGJlZm9yZTogJzEuMC4wJywgYWZ0ZXI6ICcxLjAuMScsIGJ1bXA6ICdwYXRjaCcgfSxcbiAgICAgICAgY2hhbmdlczogeyBhZGRlZDogW10sIHJlbW92ZWQ6IFtdLCBtb2RpZmllZDogW10gfSxcbiAgICAgICAgYnJlYWtpbmc6IGZhbHNlLFxuICAgICAgICByZXF1aXJlc0FwcHJvdmFsOiBmYWxzZSxcbiAgICAgICAgY2hhbmdlbG9nOiAnVGVzdCcsXG4gICAgICB9IGFzIENvbnRyYWN0RGlmZixcbiAgICB9KTtcblxuICAgIC8vIFNhbWUgcGVyc29uIHRyaWVzIHRvIGFwcHJvdmUgdGhlaXIgb3duIHByb3Bvc2FsXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcHJvcG9zYWxNYW5hZ2VyLmFwcHJvdmUoXG4gICAgICBwcm9wb3NhbC5pZCxcbiAgICAgICdhcmNoaXRlY3QtZGV2JyxcbiAgICAgICdTZWxmLWFwcHJvdmFsJ1xuICAgICk7XG5cbiAgICBleHBlY3QocmVzdWx0LnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xuICAgIGV4cGVjdChyZXN1bHQuZXJyb3IpLnRvQ29udGFpbignb3duIHByb3Bvc2FsJyk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdBdXRvLUFwcHJvdmUgKyBDb21waWxlIEdhdGUgSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gIGxldCBzdGF0ZVByb3ZpZGVyOiBNb2NrQ29udHJhY3RTdGF0ZVByb3ZpZGVyO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIHN0YXRlUHJvdmlkZXIgPSBuZXcgTW9ja0NvbnRyYWN0U3RhdGVQcm92aWRlcigpO1xuICB9KTtcblxuICBpdCgnc2hvdWxkIGF1dG8tYXBwcm92ZSBsb3ctcmlzayBjaGFuZ2VzIGFuZCBwYXNzIGNvbXBpbGUgZ2F0ZScsIGFzeW5jICgpID0+IHtcbiAgICAvLyBMb3ctcmlzayBkaWZmIChvbmx5IGFkZGluZyBvcHRpb25hbCBmaWVsZHMpXG4gICAgY29uc3QgbG93Umlza0RpZmY6IENvbnRyYWN0RGlmZiA9IHtcbiAgICAgIGNvbnRyYWN0VHlwZTogJ09wZW5BUEknLFxuICAgICAgdmVyc2lvbjogeyBiZWZvcmU6ICcxLjAuMCcsIGFmdGVyOiAnMS4wLjEnLCBidW1wOiAncGF0Y2gnIH0sXG4gICAgICBjaGFuZ2VzOiB7XG4gICAgICAgIGFkZGVkOiBbXG4gICAgICAgICAge1xuICAgICAgICAgICAgcGF0aDogJy91c2Vycy9hZ2UnLFxuICAgICAgICAgICAgdHlwZTogJ2ZpZWxkX2FkZCcsXG4gICAgICAgICAgICBkZXNjcmlwdGlvbjogJ0FkZGVkIG9wdGlvbmFsIGZpZWxkJyxcbiAgICAgICAgICAgIHNldmVyaXR5OiAnbG93JyxcbiAgICAgICAgICAgIGRldGFpbHM6IHsgcmVxdWlyZWQ6IGZhbHNlIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgXSxcbiAgICAgICAgcmVtb3ZlZDogW10sXG4gICAgICAgIG1vZGlmaWVkOiBbXSxcbiAgICAgIH0sXG4gICAgICBicmVha2luZzogZmFsc2UsXG4gICAgICByZXF1aXJlc0FwcHJvdmFsOiBmYWxzZSxcbiAgICAgIGNoYW5nZWxvZzogJ0FkZGVkIG9wdGlvbmFsIGFnZSBmaWVsZCcsXG4gICAgICByaXNrU2NvcmU6IDEwLFxuICAgIH07XG5cbiAgICAvLyBTaG91bGQgYmUgYXV0by1hcHByb3ZhYmxlXG4gICAgZXhwZWN0KGNhbkF1dG9BcHByb3ZlKGxvd1Jpc2tEaWZmKSkudG9CZSh0cnVlKTtcblxuICAgIC8vIFNldCBjb250cmFjdCBhcyBhcHByb3ZlZFxuICAgIHN0YXRlUHJvdmlkZXIuc2V0Q29udHJhY3RTdGF0ZSgnYXBpLWdhdGV3YXktdjEnLCAnYXBwcm92ZWQnKTtcblxuICAgIC8vIENvbXBpbGUgZ2F0ZSBzaG91bGQgcGFzc1xuICAgIGNvbnN0IGNvbXBpbGVSZXN1bHQgPSBhd2FpdCBjaGVja0NvbXBpbGVHYXRlKHtcbiAgICAgIGNvbnRyYWN0SWRzOiBbJ2FwaS1nYXRld2F5LXYxJ10sXG4gICAgICBzdGF0ZVByb3ZpZGVyOiBzdGF0ZVByb3ZpZGVyIGFzIGFueSxcbiAgICB9KTtcblxuICAgIGV4cGVjdChjb21waWxlUmVzdWx0LmFsbG93ZWQpLnRvQmUodHJ1ZSk7XG4gICAgZXhwZWN0KGNvbXBpbGVSZXN1bHQuZXJyb3JzKS50b0hhdmVMZW5ndGgoMCk7XG4gIH0pO1xuXG4gIGl0KCdzaG91bGQgYmxvY2sgY29tcGlsYXRpb24gZm9yIGRyYWZ0IGNvbnRyYWN0cycsIGFzeW5jICgpID0+IHtcbiAgICBzdGF0ZVByb3ZpZGVyLnNldENvbnRyYWN0U3RhdGUoJ2FwaS1nYXRld2F5LXYxJywgJ2RyYWZ0Jyk7XG5cbiAgICBjb25zdCBjb21waWxlUmVzdWx0ID0gYXdhaXQgY2hlY2tDb21waWxlR2F0ZSh7XG4gICAgICBjb250cmFjdElkczogWydhcGktZ2F0ZXdheS12MSddLFxuICAgICAgc3RhdGVQcm92aWRlcjogc3RhdGVQcm92aWRlciBhcyBhbnksXG4gICAgfSk7XG5cbiAgICBleHBlY3QoY29tcGlsZVJlc3VsdC5hbGxvd2VkKS50b0JlKGZhbHNlKTtcbiAgICBleHBlY3QoY29tcGlsZVJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbkVxdWFsKFxuICAgICAgZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ0RSQUZUIHN0YXRlJylcbiAgICApO1xuICAgIGV4cGVjdChjb21waWxlUmVzdWx0LnBlbmRpbmdBcHByb3ZhbHMpLnRvQ29udGFpbignYXBpLWdhdGV3YXktdjEnKTtcbiAgfSk7XG5cbiAgaXQoJ3Nob3VsZCBibG9jayBjb21waWxhdGlvbiBmb3IgY29udHJhY3RzIHdpdGggcGVuZGluZyBwcm9wb3NhbHMnLCBhc3luYyAoKSA9PiB7XG4gICAgc3RhdGVQcm92aWRlci5zZXRDb250cmFjdFN0YXRlKCdhcGktZ2F0ZXdheS12MScsICdhcHByb3ZlZCcpO1xuICAgIHN0YXRlUHJvdmlkZXIuYWRkUHJvcG9zYWwoe1xuICAgICAgaWQ6ICdwcm9wLTEnLFxuICAgICAgY29udHJhY3RJZDogJ2FwaS1nYXRld2F5LXYxJyxcbiAgICAgIHByb3Bvc2VySWQ6ICdiYWNrZW5kLXRlYW0nLFxuICAgICAgc3RhdGU6ICdwZW5kaW5nJyxcbiAgICAgIGRpZmY6IHt9IGFzIENvbnRyYWN0RGlmZixcbiAgICAgIHN1Ym1pdHRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgdXBkYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgY29udHJhY3RUeXBlOiAnT3BlbkFQSScsXG4gICAgfSk7XG5cbiAgICBjb25zdCBjb21waWxlUmVzdWx0ID0gYXdhaXQgY2hlY2tDb21waWxlR2F0ZSh7XG4gICAgICBjb250cmFjdElkczogWydhcGktZ2F0ZXdheS12MSddLFxuICAgICAgc3RhdGVQcm92aWRlcjogc3RhdGVQcm92aWRlciBhcyBhbnksXG4gICAgfSk7XG5cbiAgICBleHBlY3QoY29tcGlsZVJlc3VsdC5hbGxvd2VkKS50b0JlKGZhbHNlKTtcbiAgICBleHBlY3QoY29tcGlsZVJlc3VsdC5lcnJvcnMpLnRvQ29udGFpbkVxdWFsKFxuICAgICAgZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ3BlbmRpbmcgcHJvcG9zYWwnKVxuICAgICk7XG4gIH0pO1xuXG4gIGl0KCdzaG91bGQgYWxsb3cgY29tcGlsYXRpb24gd2hlbiBhbGwgY29udHJhY3RzIGFyZSBhcHByb3ZlZCcsIGFzeW5jICgpID0+IHtcbiAgICBzdGF0ZVByb3ZpZGVyLnNldENvbnRyYWN0U3RhdGUoJ2FwaS1nYXRld2F5LXYxJywgJ2FwcHJvdmVkJyk7XG4gICAgc3RhdGVQcm92aWRlci5zZXRDb250cmFjdFN0YXRlKCd1c2VyLXNlcnZpY2UnLCAnYXBwcm92ZWQnKTtcblxuICAgIGNvbnN0IGNvbXBpbGVSZXN1bHQgPSBhd2FpdCBjaGVja0NvbXBpbGVHYXRlKHtcbiAgICAgIGNvbnRyYWN0SWRzOiBbJ2FwaS1nYXRld2F5LXYxJywgJ3VzZXItc2VydmljZSddLFxuICAgICAgc3RhdGVQcm92aWRlcjogc3RhdGVQcm92aWRlciBhcyBhbnksXG4gICAgfSk7XG5cbiAgICBleHBlY3QoY29tcGlsZVJlc3VsdC5hbGxvd2VkKS50b0JlKHRydWUpO1xuICAgIGV4cGVjdChjb21waWxlUmVzdWx0LmVycm9ycykudG9IYXZlTGVuZ3RoKDApO1xuICAgIGV4cGVjdChjb21waWxlUmVzdWx0Lndhcm5pbmdzKS50b0hhdmVMZW5ndGgoMCk7XG4gIH0pO1xufSk7XG5cbmRlc2NyaWJlKCdGdWxsIFdvcmtmbG93OiBQcm9wb3NlIOKGkiBBcHByb3ZlIOKGkiBDb21waWxlJywgKCkgPT4ge1xuICBpdCgnc2hvdWxkIGNvbXBsZXRlIGZ1bGwgd29ya2Zsb3cgZm9yIGxvdy1yaXNrIGNoYW5nZScsIGFzeW5jICgpID0+IHtcbiAgICBjb25zdCBsYXR0aWNlID0gbmV3IE1vY2tPd25lcnNoaXBMYXR0aWNlKCk7XG4gICAgbGF0dGljZS5zZXRBdXRob3JpdHkoJ2FyY2hpdGVjdCcsICdhcmNoaXRlY3QnKTtcbiAgICBcbiAgICBjb25zdCBwcm9wb3NhbFN0b3JlID0gbmV3IEluTWVtb3J5UHJvcG9zYWxTdG9yZSgpO1xuICAgIGNvbnN0IHByb3Bvc2FsTWFuYWdlciA9IG5ldyBQcm9wb3NhbE1hbmFnZXIocHJvcG9zYWxTdG9yZSwgbGF0dGljZSBhcyBhbnkpO1xuICAgIGNvbnN0IHN0YXRlTWFjaGluZSA9IG5ldyBDb250cmFjdFN0YXRlTWFjaGluZSgnYXBpLXYxJywgJ2RyYWZ0JywgJzEuMC4wJyk7XG4gICAgY29uc3Qgc3RhdGVQcm92aWRlciA9IG5ldyBNb2NrQ29udHJhY3RTdGF0ZVByb3ZpZGVyKCk7XG5cbiAgICAvLyBTdGVwIDE6IFN1Ym1pdCBwcm9wb3NhbFxuICAgIGNvbnN0IHByb3Bvc2FsID0gYXdhaXQgcHJvcG9zYWxNYW5hZ2VyLnN1Ym1pdCh7XG4gICAgICBjb250cmFjdElkOiAnYXBpLXYxJyxcbiAgICAgIHByb3Bvc2VyUm9sZUlkOiAnZGV2LXRlYW0nLFxuICAgICAgZGlmZjoge1xuICAgICAgICBjb250cmFjdFR5cGU6ICdPcGVuQVBJJyxcbiAgICAgICAgdmVyc2lvbjogeyBiZWZvcmU6ICcxLjAuMCcsIGFmdGVyOiAnMS4wLjEnLCBidW1wOiAncGF0Y2gnIH0sXG4gICAgICAgIGNoYW5nZXM6IHsgYWRkZWQ6IFtdLCByZW1vdmVkOiBbXSwgbW9kaWZpZWQ6IFtdIH0sXG4gICAgICAgIGJyZWFraW5nOiBmYWxzZSxcbiAgICAgICAgcmVxdWlyZXNBcHByb3ZhbDogZmFsc2UsXG4gICAgICAgIGNoYW5nZWxvZzogJ01pbm9yIGNoYW5nZScsXG4gICAgICAgIHJpc2tTY29yZTogMTAsXG4gICAgICB9IGFzIENvbnRyYWN0RGlmZixcbiAgICB9KTtcblxuICAgIC8vIFN0ZXAgMjogQXJjaGl0ZWN0IGFwcHJvdmVzXG4gICAgYXdhaXQgcHJvcG9zYWxNYW5hZ2VyLmFwcHJvdmUocHJvcG9zYWwuaWQsICdhcmNoaXRlY3QnLCAnQXBwcm92ZWQnKTtcblxuICAgIC8vIFN0ZXAgMzogVXBkYXRlIHN0YXRlIG1hY2hpbmVcbiAgICBzdGF0ZU1hY2hpbmUudHJhbnNpdGlvbignYXBwcm92ZWQnLCAnYXJjaGl0ZWN0Jyk7XG5cbiAgICAvLyBTdGVwIDQ6IFVwZGF0ZSBzdGF0ZSBwcm92aWRlclxuICAgIHN0YXRlUHJvdmlkZXIuc2V0Q29udHJhY3RTdGF0ZSgnYXBpLXYxJywgJ2FwcHJvdmVkJyk7XG5cbiAgICAvLyBTdGVwIDU6IENoZWNrIGNvbXBpbGUgZ2F0ZVxuICAgIGNvbnN0IGNvbXBpbGVSZXN1bHQgPSBhd2FpdCBjaGVja0NvbXBpbGVHYXRlKHtcbiAgICAgIGNvbnRyYWN0SWRzOiBbJ2FwaS12MSddLFxuICAgICAgc3RhdGVQcm92aWRlcjogc3RhdGVQcm92aWRlciBhcyBhbnksXG4gICAgfSk7XG5cbiAgICBleHBlY3QoY29tcGlsZVJlc3VsdC5hbGxvd2VkKS50b0JlKHRydWUpO1xuICB9KTtcbn0pO1xuIl19