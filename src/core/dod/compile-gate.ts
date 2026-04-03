/**
 * ASF V4.0 DoD Guard - Compile Gate
 * 
 * Blocks compilation/runtime when contract gates are not satisfied.
 * Version: v0.8.5
 */

import type { ContractProposal } from '../ownership/types';
import type { ContractDiff } from '../contract/types';

/**
 * Compile gate check result.
 */
export interface CompileGateResult {
  /** Whether compilation is allowed */
  allowed: boolean;
  
  /** List of blocking errors */
  errors: string[];
  
  /** List of warnings (non-blocking) */
  warnings: string[];
  
  /** Contracts that need approval */
  pendingApprovals: string[];
}

/**
 * Contract state provider interface.
 */
export interface ContractStateProvider {
  /** Get state of a contract (draft/approved/rejected) */
  getContractState(contractId: string): 'draft' | 'approved' | 'rejected' | null;
  
  /** Get pending proposals for contracts */
  getPendingProposals(contractIds: string[]): Promise<ContractProposal[]>;
  
  /** Get approved version of a contract */
  getApprovedContract(contractId: string): Promise<any | null>;
}

/**
 * Check compile gate before compilation/runtime.
 * 
 * This is the "Gate 2" in the dual-gate system:
 * - Gate 1: Ownership Lattice (who can write)
 * - Gate 2: DoD Compile Gate (what can be compiled)
 * 
 * @param params - Gate check parameters
 * @returns Compile gate result
 * 
 * @example
 * ```typescript
 * const result = await checkCompileGate({
 *   contractIds: ['api-gateway-v1', 'user-service-schema'],
 *   stateProvider: contractStateProvider,
 * });
 * 
 * if (!result.allowed) {
 *   console.error('Compilation blocked:');
 *   for (const error of result.errors) {
 *     console.error(`  - ${error}`);
 *   }
 *   process.exit(1);
 * }
 * ```
 */
export async function checkCompileGate(params: {
  contractIds: string[];
  stateProvider: ContractStateProvider;
}): Promise<CompileGateResult> {
  const { contractIds, stateProvider } = params;
  const errors: string[] = [];
  const warnings: string[] = [];
  const pendingApprovals: string[] = [];

  // Check state of each contract
  for (const contractId of contractIds) {
    const state = stateProvider.getContractState(contractId);

    if (state === null) {
      warnings.push(`Contract ${contractId} has no registered state`);
      continue;
    }

    if (state === 'draft') {
      errors.push(
        `Contract ${contractId} is in DRAFT state. Must be approved before compilation.`
      );
      pendingApprovals.push(contractId);
    }

    if (state === 'rejected') {
      errors.push(
        `Contract ${contractId} is in REJECTED state. Cannot compile rejected contracts.`
      );
    }
  }

  // Check for pending proposals
  const pendingProposals = await stateProvider.getPendingProposals(contractIds);

  for (const proposal of pendingProposals) {
    // Check if the contract is referenced in runtime path
    if (contractIds.includes(proposal.contractId)) {
      errors.push(
        `Contract ${proposal.contractId} has pending proposal ${proposal.id}. ` +
        `Must be approved or rejected before compilation.`
      );
      if (!pendingApprovals.includes(proposal.contractId)) {
        pendingApprovals.push(proposal.contractId);
      }
    }
  }

  // Check that all contracts have approved versions
  for (const contractId of contractIds) {
    const approved = await stateProvider.getApprovedContract(contractId);
    if (!approved) {
      // Only error if not already in draft/rejected state
      const state = stateProvider.getContractState(contractId);
      if (state !== 'draft' && state !== 'rejected') {
        errors.push(
          `Contract ${contractId} has no approved version available.`
        );
      }
    }
  }

  return {
    allowed: errors.length === 0,
    errors,
    warnings,
    pendingApprovals,
  };
}

/**
 * Check if a specific contract change would block compilation.
 */
export function wouldBlockCompilation(
  contractId: string,
  diff: ContractDiff,
  runtimeDependencies: string[]
): {
  wouldBlock: boolean;
  reason?: string;
} {
  // Breaking changes to contracts in runtime path always block
  if (diff.breaking && runtimeDependencies.includes(contractId)) {
    return {
      wouldBlock: true,
      reason: `Breaking changes to ${contractId} affect runtime dependencies`,
    };
  }

  // Changes to core contracts (API, DB) always require review
  if (['OpenAPI', 'DBSchema'].includes(diff.contractType)) {
    if (runtimeDependencies.includes(contractId)) {
      return {
        wouldBlock: true,
        reason: `${diff.contractType} changes to ${contractId} require approval`,
      };
    }
  }

  return { wouldBlock: false };
}

/**
 * Get contracts that would be affected by a change.
 */
export function getAffectedContracts(
  contractId: string,
  dependencyGraph: Map<string, string[]>
): string[] {
  const affected = new Set<string>();
  const queue = [contractId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const dependents = dependencyGraph.get(current) || [];

    for (const dependent of dependents) {
      if (!affected.has(dependent)) {
        affected.add(dependent);
        queue.push(dependent);
      }
    }
  }

  return Array.from(affected);
}

/**
 * Middleware for blocking compilation in build tools.
 */
export function createCompileGateMiddleware(
  stateProvider: ContractStateProvider,
  contractIds: string[]
) {
  return async function compileGateMiddleware(
    next: () => Promise<void>
  ): Promise<void> {
    const result = await checkCompileGate({
      contractIds,
      stateProvider,
    });

    if (!result.allowed) {
      const error = new Error(
        `Compilation blocked by DoD Gate:\n${result.errors.join('\n')}`
      );
      (error as any).compileGateResult = result;
      throw error;
    }

    // Log warnings
    for (const warning of result.warnings) {
      console.warn(`[DoD Gate Warning] ${warning}`);
    }

    await next();
  };
}

/**
 * CLI command for checking compile gate.
 */
export async function compileGateCommand(contractIds: string[]): Promise<void> {
  console.log('DoD Compile Gate Check');
  console.log('======================');
  console.log('');
  console.log(`Checking ${contractIds.length} contracts...`);
  console.log('');

  // This is a placeholder - actual implementation needs state provider
  console.log('Note: Compile gate check requires ContractStateProvider implementation.');
  console.log('');
  console.log('Example output:');
  console.log('');
  console.log('✅ api-gateway-v1: approved (v1.2.3)');
  console.log('✅ user-service-schema: approved (v2.0.1)');
  console.log('❌ payment-schema: DRAFT - requires approval');
  console.log('');
  console.log('Status: BLOCKED');
  console.log('');
  console.log('Pending Approvals:');
  console.log('  - payment-schema (proposal-123)');
  console.log('');
}
