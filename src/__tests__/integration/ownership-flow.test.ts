/**
 * ASF V4.0 Integration Tests
 * 
 * End-to-end flow tests for ownership lattice and contract workflow.
 * Version: v0.8.5
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ContractStateMachine } from '../../core/ownership/state-machine';
import { InMemoryProposalStore, ProposalManager } from '../../core/ownership/proposals';
import { ContractGate } from '../../core/ownership/gates';
import { canAutoApprove } from '../../core/dod/auto-approve';
import { checkCompileGate } from '../../core/dod/compile-gate';
import type { ContractDiff, ContractProposal } from '../../core/ownership/types';

/**
 * Mock ownership lattice for testing.
 */
class MockOwnershipLattice {
  private authorities: Map<string, Set<string>>;

  constructor() {
    this.authorities = new Map();
  }

  setAuthority(roleId: string, authority: string): void {
    if (!this.authorities.has(roleId)) {
      this.authorities.set(roleId, new Set());
    }
    this.authorities.get(roleId)!.add(authority);
  }

  hasAuthority(roleId: string, authority: string): boolean {
    return this.authorities.get(roleId)?.has(authority) || false;
  }

  getOwner(nodeId: string): string | null {
    // Simplified: return role based on node prefix
    if (nodeId.startsWith('api-')) return 'api-team';
    if (nodeId.startsWith('db-')) return 'db-team';
    return null;
  }

  getRolesWithAuthority(authority: string): string[] {
    const roles: string[] = [];
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
  private states: Map<string, 'draft' | 'approved' | 'rejected'>;
  private proposals: ContractProposal[];

  constructor() {
    this.states = new Map();
    this.proposals = [];
  }

  setContractState(contractId: string, state: 'draft' | 'approved' | 'rejected'): void {
    this.states.set(contractId, state);
  }

  getContractState(contractId: string): 'draft' | 'approved' | 'rejected' | null {
    return this.states.get(contractId) || null;
  }

  addProposal(proposal: ContractProposal): void {
    this.proposals.push(proposal);
  }

  async getPendingProposals(contractIds: string[]): Promise<ContractProposal[]> {
    return this.proposals.filter(
      (p) => contractIds.includes(p.contractId) && p.state === 'pending'
    );
  }

  async getApprovedContract(contractId: string): Promise<any | null> {
    const state = this.states.get(contractId);
    return state === 'approved' ? { id: contractId } : null;
  }
}

describe('Ownership Flow Integration', () => {
  let lattice: MockOwnershipLattice;
  let proposalStore: InMemoryProposalStore;
  let proposalManager: ProposalManager;
  let gate: ContractGate;

  beforeEach(() => {
    lattice = new MockOwnershipLattice();
    lattice.setAuthority('architect', 'architect');
    lattice.setAuthority('backend-team', 'developer');
    
    proposalStore = new InMemoryProposalStore();
    proposalManager = new ProposalManager(proposalStore);
    gate = new ContractGate(lattice as any);
  });

  it('should complete full contract approval workflow', async () => {
    // 1. Create contract state machine
    const machine = new ContractStateMachine('api-gateway-v1', 'draft', '1.0.0');
    expect(machine.isDraft()).toBe(true);

    // 2. Non-architect tries to write directly (should fail)
    const writeResult = gate.checkWritePermission(
      'api-gateway-v1',
      'OpenAPI',
      'backend-team'
    );
    expect(writeResult.allowed).toBe(false);
    expect(writeResult.proposalRequired).toBe(true);

    // 3. Non-architect submits proposal
    const mockDiff: ContractDiff = {
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

    expect(proposal.state).toBe('pending');
    expect(proposal.proposerRoleId).toBe('backend-team');

    // 4. Architect approves proposal
    const approveResult = await proposalManager.approve(
      proposal.id,
      'architect',
      'LGTM'
    );
    expect(approveResult.success).toBe(true);

    // 5. State machine transitions to approved
    const transitionResult = machine.transition('approved', 'architect', 'Proposal approved');
    expect(transitionResult.success).toBe(true);
    expect(machine.isApproved()).toBe(true);

    // 6. Version is bumped
    expect(machine.getVersion()).toBe('1.0.1');
  });

  it('should block non-architect from approving', async () => {
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
      } as ContractDiff,
    });

    // Non-architect tries to approve
    const result = await proposalManager.approve(
      proposal.id,
      'backend-team',
      'Approving my own proposal'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Architect');
  });

  it('should prevent approving own proposal', async () => {
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
      } as ContractDiff,
    });

    // Same person tries to approve their own proposal
    const result = await proposalManager.approve(
      proposal.id,
      'architect-dev',
      'Self-approval'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('own proposal');
  });
});

describe('Auto-Approve + Compile Gate Integration', () => {
  let stateProvider: MockContractStateProvider;

  beforeEach(() => {
    stateProvider = new MockContractStateProvider();
  });

  it('should auto-approve low-risk changes and pass compile gate', async () => {
    // Low-risk diff (only adding optional fields)
    const lowRiskDiff: ContractDiff = {
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
    expect(canAutoApprove(lowRiskDiff)).toBe(true);

    // Set contract as approved
    stateProvider.setContractState('api-gateway-v1', 'approved');

    // Compile gate should pass
    const compileResult = await checkCompileGate({
      contractIds: ['api-gateway-v1'],
      stateProvider: stateProvider as any,
    });

    expect(compileResult.allowed).toBe(true);
    expect(compileResult.errors).toHaveLength(0);
  });

  it('should block compilation for draft contracts', async () => {
    stateProvider.setContractState('api-gateway-v1', 'draft');

    const compileResult = await checkCompileGate({
      contractIds: ['api-gateway-v1'],
      stateProvider: stateProvider as any,
    });

    expect(compileResult.allowed).toBe(false);
    expect(compileResult.errors).toContainEqual(
      expect.stringContaining('DRAFT state')
    );
    expect(compileResult.pendingApprovals).toContain('api-gateway-v1');
  });

  it('should block compilation for contracts with pending proposals', async () => {
    stateProvider.setContractState('api-gateway-v1', 'approved');
    stateProvider.addProposal({
      id: 'prop-1',
      contractId: 'api-gateway-v1',
      proposerRoleId: 'backend-team',
      state: 'pending',
      diff: {} as ContractDiff,
      submittedAt: Date.now(),
    });

    const compileResult = await checkCompileGate({
      contractIds: ['api-gateway-v1'],
      stateProvider: stateProvider as any,
    });

    expect(compileResult.allowed).toBe(false);
    expect(compileResult.errors).toContainEqual(
      expect.stringContaining('pending proposal')
    );
  });

  it('should allow compilation when all contracts are approved', async () => {
    stateProvider.setContractState('api-gateway-v1', 'approved');
    stateProvider.setContractState('user-service', 'approved');

    const compileResult = await checkCompileGate({
      contractIds: ['api-gateway-v1', 'user-service'],
      stateProvider: stateProvider as any,
    });

    expect(compileResult.allowed).toBe(true);
    expect(compileResult.errors).toHaveLength(0);
    expect(compileResult.warnings).toHaveLength(0);
  });
});

describe('Full Workflow: Propose → Approve → Compile', () => {
  it('should complete full workflow for low-risk change', async () => {
    const lattice = new MockOwnershipLattice();
    lattice.setAuthority('architect', 'architect');
    
    const proposalStore = new InMemoryProposalStore();
    const proposalManager = new ProposalManager(proposalStore);
    const stateMachine = new ContractStateMachine('api-v1', 'draft', '1.0.0');
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
      } as ContractDiff,
    });

    // Step 2: Architect approves
    await proposalManager.approve(proposal.id, 'architect', 'Approved');

    // Step 3: Update state machine
    stateMachine.transition('approved', 'architect');

    // Step 4: Update state provider
    stateProvider.setContractState('api-v1', 'approved');

    // Step 5: Check compile gate
    const compileResult = await checkCompileGate({
      contractIds: ['api-v1'],
      stateProvider: stateProvider as any,
    });

    expect(compileResult.allowed).toBe(true);
  });
});
