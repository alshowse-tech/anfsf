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
export declare function checkCompileGate(params: {
    contractIds: string[];
    stateProvider: ContractStateProvider;
}): Promise<CompileGateResult>;
/**
 * Check if a specific contract change would block compilation.
 */
export declare function wouldBlockCompilation(contractId: string, diff: ContractDiff, runtimeDependencies: string[]): {
    wouldBlock: boolean;
    reason?: string;
};
/**
 * Get contracts that would be affected by a change.
 */
export declare function getAffectedContracts(contractId: string, dependencyGraph: Map<string, string[]>): string[];
/**
 * Middleware for blocking compilation in build tools.
 */
export declare function createCompileGateMiddleware(stateProvider: ContractStateProvider, contractIds: string[]): (next: () => Promise<void>) => Promise<void>;
/**
 * CLI command for checking compile gate.
 */
export declare function compileGateCommand(contractIds: string[]): Promise<void>;
