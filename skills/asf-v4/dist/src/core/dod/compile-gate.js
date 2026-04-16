"use strict";
/**
 * ASF V4.0 DoD Guard - Compile Gate
 *
 * Blocks compilation/runtime when contract gates are not satisfied.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkCompileGate = checkCompileGate;
exports.wouldBlockCompilation = wouldBlockCompilation;
exports.getAffectedContracts = getAffectedContracts;
exports.createCompileGateMiddleware = createCompileGateMiddleware;
exports.compileGateCommand = compileGateCommand;
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
async function checkCompileGate(params) {
    const { contractIds, stateProvider } = params;
    const errors = [];
    const warnings = [];
    const pendingApprovals = [];
    // Check state of each contract
    for (const contractId of contractIds) {
        const state = stateProvider.getContractState(contractId);
        if (state === null) {
            warnings.push(`Contract ${contractId} has no registered state`);
            continue;
        }
        if (state === 'draft') {
            errors.push(`Contract ${contractId} is in DRAFT state. Must be approved before compilation.`);
            pendingApprovals.push(contractId);
        }
        if (state === 'rejected') {
            errors.push(`Contract ${contractId} is in REJECTED state. Cannot compile rejected contracts.`);
        }
    }
    // Check for pending proposals
    const pendingProposals = await stateProvider.getPendingProposals(contractIds);
    for (const proposal of pendingProposals) {
        // Check if the contract is referenced in runtime path
        if (contractIds.includes(proposal.contractId)) {
            errors.push(`Contract ${proposal.contractId} has pending proposal ${proposal.id}. ` +
                `Must be approved or rejected before compilation.`);
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
                errors.push(`Contract ${contractId} has no approved version available.`);
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
function wouldBlockCompilation(contractId, diff, runtimeDependencies) {
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
function getAffectedContracts(contractId, dependencyGraph) {
    const affected = new Set();
    const queue = [contractId];
    while (queue.length > 0) {
        const current = queue.shift();
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
function createCompileGateMiddleware(stateProvider, contractIds) {
    return async function compileGateMiddleware(next) {
        const result = await checkCompileGate({
            contractIds,
            stateProvider,
        });
        if (!result.allowed) {
            const error = new Error(`Compilation blocked by DoD Gate:\n${result.errors.join('\n')}`);
            error.compileGateResult = result;
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
async function compileGateCommand(contractIds) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcGlsZS1nYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvZG9kL2NvbXBpbGUtZ2F0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7O0FBOERILDRDQW9FQztBQUtELHNEQTJCQztBQUtELG9EQW9CQztBQUtELGtFQTJCQztBQUtELGdEQXFCQztBQWpORDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztHQXlCRztBQUNJLEtBQUssVUFBVSxnQkFBZ0IsQ0FBQyxNQUd0QztJQUNDLE1BQU0sRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLEdBQUcsTUFBTSxDQUFDO0lBQzlDLE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztJQUM1QixNQUFNLFFBQVEsR0FBYSxFQUFFLENBQUM7SUFDOUIsTUFBTSxnQkFBZ0IsR0FBYSxFQUFFLENBQUM7SUFFdEMsK0JBQStCO0lBQy9CLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7UUFDckMsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXpELElBQUksS0FBSyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQ25CLFFBQVEsQ0FBQyxJQUFJLENBQUMsWUFBWSxVQUFVLDBCQUEwQixDQUFDLENBQUM7WUFDaEUsU0FBUztRQUNYLENBQUM7UUFFRCxJQUFJLEtBQUssS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN0QixNQUFNLENBQUMsSUFBSSxDQUNULFlBQVksVUFBVSwwREFBMEQsQ0FDakYsQ0FBQztZQUNGLGdCQUFnQixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsSUFBSSxLQUFLLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLElBQUksQ0FDVCxZQUFZLFVBQVUsMkRBQTJELENBQ2xGLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FB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O0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLFdBQVcsQ0FBQyxNQUFNLGVBQWUsQ0FBQyxDQUFDO0lBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFaEIscUVBQXFFO0lBQ3JFLE9BQU8sQ0FBQyxHQUFHLENBQUMseUVBQXlFLENBQUMsQ0FBQztJQUN2RixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUMvQixPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2hCLE9BQU8sQ0FBQyxHQUFHLENBQUMscUNBQXFDLENBQUMsQ0FBQztJQUNuRCxPQUFPLENBQUMsR0FBRyxDQUFDLDBDQUEwQyxDQUFDLENBQUM7SUFDeEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2Q0FBNkMsQ0FBQyxDQUFDO0lBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0lBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDaEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUNBQW1DLENBQUMsQ0FBQztJQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFTRiBWNC4wIERvRCBHdWFyZCAtIENvbXBpbGUgR2F0ZVxuICogXG4gKiBCbG9ja3MgY29tcGlsYXRpb24vcnVudGltZSB3aGVuIGNvbnRyYWN0IGdhdGVzIGFyZSBub3Qgc2F0aXNmaWVkLlxuICogVmVyc2lvbjogdjAuOC41XG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb250cmFjdFByb3Bvc2FsIH0gZnJvbSAnLi4vb3duZXJzaGlwL3R5cGVzJztcbmltcG9ydCB0eXBlIHsgQ29udHJhY3REaWZmIH0gZnJvbSAnLi4vY29udHJhY3QvdHlwZXMnO1xuXG4vKipcbiAqIENvbXBpbGUgZ2F0ZSBjaGVjayByZXN1bHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZUdhdGVSZXN1bHQge1xuICAvKiogV2hldGhlciBjb21waWxhdGlvbiBpcyBhbGxvd2VkICovXG4gIGFsbG93ZWQ6IGJvb2xlYW47XG4gIFxuICAvKiogTGlzdCBvZiBibG9ja2luZyBlcnJvcnMgKi9cbiAgZXJyb3JzOiBzdHJpbmdbXTtcbiAgXG4gIC8qKiBMaXN0IG9mIHdhcm5pbmdzIChub24tYmxvY2tpbmcpICovXG4gIHdhcm5pbmdzOiBzdHJpbmdbXTtcbiAgXG4gIC8qKiBDb250cmFjdHMgdGhhdCBuZWVkIGFwcHJvdmFsICovXG4gIHBlbmRpbmdBcHByb3ZhbHM6IHN0cmluZ1tdO1xufVxuXG4vKipcbiAqIENvbnRyYWN0IHN0YXRlIHByb3ZpZGVyIGludGVyZmFjZS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb250cmFjdFN0YXRlUHJvdmlkZXIge1xuICAvKiogR2V0IHN0YXRlIG9mIGEgY29udHJhY3QgKGRyYWZ0L2FwcHJvdmVkL3JlamVjdGVkKSAqL1xuICBnZXRDb250cmFjdFN0YXRlKGNvbnRyYWN0SWQ6IHN0cmluZyk6ICdkcmFmdCcgfCAnYXBwcm92ZWQnIHwgJ3JlamVjdGVkJyB8IG51bGw7XG4gIFxuICAvKiogR2V0IHBlbmRpbmcgcHJvcG9zYWxzIGZvciBjb250cmFjdHMgKi9cbiAgZ2V0UGVuZGluZ1Byb3Bvc2Fscyhjb250cmFjdElkczogc3RyaW5nW10pOiBQcm9taXNlPENvbnRyYWN0UHJvcG9zYWxbXT47XG4gIFxuICAvKiogR2V0IGFwcHJvdmVkIHZlcnNpb24gb2YgYSBjb250cmFjdCAqL1xuICBnZXRBcHByb3ZlZENvbnRyYWN0KGNvbnRyYWN0SWQ6IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD47XG59XG5cbi8qKlxuICogQ2hlY2sgY29tcGlsZSBnYXRlIGJlZm9yZSBjb21waWxhdGlvbi9ydW50aW1lLlxuICogXG4gKiBUaGlzIGlzIHRoZSBcIkdhdGUgMlwiIGluIHRoZSBkdWFsLWdhdGUgc3lzdGVtOlxuICogLSBHYXRlIDE6IE93bmVyc2hpcCBMYXR0aWNlICh3aG8gY2FuIHdyaXRlKVxuICogLSBHYXRlIDI6IERvRCBDb21waWxlIEdhdGUgKHdoYXQgY2FuIGJlIGNvbXBpbGVkKVxuICogXG4gKiBAcGFyYW0gcGFyYW1zIC0gR2F0ZSBjaGVjayBwYXJhbWV0ZXJzXG4gKiBAcmV0dXJucyBDb21waWxlIGdhdGUgcmVzdWx0XG4gKiBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCByZXN1bHQgPSBhd2FpdCBjaGVja0NvbXBpbGVHYXRlKHtcbiAqICAgY29udHJhY3RJZHM6IFsnYXBpLWdhdGV3YXktdjEnLCAndXNlci1zZXJ2aWNlLXNjaGVtYSddLFxuICogICBzdGF0ZVByb3ZpZGVyOiBjb250cmFjdFN0YXRlUHJvdmlkZXIsXG4gKiB9KTtcbiAqIFxuICogaWYgKCFyZXN1bHQuYWxsb3dlZCkge1xuICogICBjb25zb2xlLmVycm9yKCdDb21waWxhdGlvbiBibG9ja2VkOicpO1xuICogICBmb3IgKGNvbnN0IGVycm9yIG9mIHJlc3VsdC5lcnJvcnMpIHtcbiAqICAgICBjb25zb2xlLmVycm9yKGAgIC0gJHtlcnJvcn1gKTtcbiAqICAgfVxuICogICBwcm9jZXNzLmV4aXQoMSk7XG4gKiB9XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNoZWNrQ29tcGlsZUdhdGUocGFyYW1zOiB7XG4gIGNvbnRyYWN0SWRzOiBzdHJpbmdbXTtcbiAgc3RhdGVQcm92aWRlcjogQ29udHJhY3RTdGF0ZVByb3ZpZGVyO1xufSk6IFByb21pc2U8Q29tcGlsZUdhdGVSZXN1bHQ+IHtcbiAgY29uc3QgeyBjb250cmFjdElkcywgc3RhdGVQcm92aWRlciB9ID0gcGFyYW1zO1xuICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IHdhcm5pbmdzOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBwZW5kaW5nQXBwcm92YWxzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIENoZWNrIHN0YXRlIG9mIGVhY2ggY29udHJhY3RcbiAgZm9yIChjb25zdCBjb250cmFjdElkIG9mIGNvbnRyYWN0SWRzKSB7XG4gICAgY29uc3Qgc3RhdGUgPSBzdGF0ZVByb3ZpZGVyLmdldENvbnRyYWN0U3RhdGUoY29udHJhY3RJZCk7XG5cbiAgICBpZiAoc3RhdGUgPT09IG51bGwpIHtcbiAgICAgIHdhcm5pbmdzLnB1c2goYENvbnRyYWN0ICR7Y29udHJhY3RJZH0gaGFzIG5vIHJlZ2lzdGVyZWQgc3RhdGVgKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZSA9PT0gJ2RyYWZ0Jykge1xuICAgICAgZXJyb3JzLnB1c2goXG4gICAgICAgIGBDb250cmFjdCAke2NvbnRyYWN0SWR9IGlzIGluIERSQUZUIHN0YXRlLiBNdXN0IGJlIGFwcHJvdmVkIGJlZm9yZSBjb21waWxhdGlvbi5gXG4gICAgICApO1xuICAgICAgcGVuZGluZ0FwcHJvdmFscy5wdXNoKGNvbnRyYWN0SWQpO1xuICAgIH1cblxuICAgIGlmIChzdGF0ZSA9PT0gJ3JlamVjdGVkJykge1xuICAgICAgZXJyb3JzLnB1c2goXG4gICAgICAgIGBDb250cmFjdCAke2NvbnRyYWN0SWR9IGlzIGluIFJFSkVDVEVEIHN0YXRlLiBDYW5ub3QgY29tcGlsZSByZWplY3RlZCBjb250cmFjdHMuYFxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvLyBDaGVjayBmb3IgcGVuZGluZyBwcm9wb3NhbHNcbiAgY29uc3QgcGVuZGluZ1Byb3Bvc2FscyA9IGF3YWl0IHN0YXRlUHJvdmlkZXIuZ2V0UGVuZGluZ1Byb3Bvc2Fscyhjb250cmFjdElkcyk7XG5cbiAgZm9yIChjb25zdCBwcm9wb3NhbCBvZiBwZW5kaW5nUHJvcG9zYWxzKSB7XG4gICAgLy8gQ2hlY2sgaWYgdGhlIGNvbnRyYWN0IGlzIHJlZmVyZW5jZWQgaW4gcnVudGltZSBwYXRoXG4gICAgaWYgKGNvbnRyYWN0SWRzLmluY2x1ZGVzKHByb3Bvc2FsLmNvbnRyYWN0SWQpKSB7XG4gICAgICBlcnJvcnMucHVzaChcbiAgICAgICAgYENvbnRyYWN0ICR7cHJvcG9zYWwuY29udHJhY3RJZH0gaGFzIHBlbmRpbmcgcHJvcG9zYWwgJHtwcm9wb3NhbC5pZH0uIGAgK1xuICAgICAgICBgTXVzdCBiZSBhcHByb3ZlZCBvciByZWplY3RlZCBiZWZvcmUgY29tcGlsYXRpb24uYFxuICAgICAgKTtcbiAgICAgIGlmICghcGVuZGluZ0FwcHJvdmFscy5pbmNsdWRlcyhwcm9wb3NhbC5jb250cmFjdElkKSkge1xuICAgICAgICBwZW5kaW5nQXBwcm92YWxzLnB1c2gocHJvcG9zYWwuY29udHJhY3RJZCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgdGhhdCBhbGwgY29udHJhY3RzIGhhdmUgYXBwcm92ZWQgdmVyc2lvbnNcbiAgZm9yIChjb25zdCBjb250cmFjdElkIG9mIGNvbnRyYWN0SWRzKSB7XG4gICAgY29uc3QgYXBwcm92ZWQgPSBhd2FpdCBzdGF0ZVByb3ZpZGVyLmdldEFwcHJvdmVkQ29udHJhY3QoY29udHJhY3RJZCk7XG4gICAgaWYgKCFhcHByb3ZlZCkge1xuICAgICAgLy8gT25seSBlcnJvciBpZiBub3QgYWxyZWFkeSBpbiBkcmFmdC9yZWplY3RlZCBzdGF0ZVxuICAgICAgY29uc3Qgc3RhdGUgPSBzdGF0ZVByb3ZpZGVyLmdldENvbnRyYWN0U3RhdGUoY29udHJhY3RJZCk7XG4gICAgICBpZiAoc3RhdGUgIT09ICdkcmFmdCcgJiYgc3RhdGUgIT09ICdyZWplY3RlZCcpIHtcbiAgICAgICAgZXJyb3JzLnB1c2goXG4gICAgICAgICAgYENvbnRyYWN0ICR7Y29udHJhY3RJZH0gaGFzIG5vIGFwcHJvdmVkIHZlcnNpb24gYXZhaWxhYmxlLmBcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGFsbG93ZWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXG4gICAgZXJyb3JzLFxuICAgIHdhcm5pbmdzLFxuICAgIHBlbmRpbmdBcHByb3ZhbHMsXG4gIH07XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBzcGVjaWZpYyBjb250cmFjdCBjaGFuZ2Ugd291bGQgYmxvY2sgY29tcGlsYXRpb24uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3b3VsZEJsb2NrQ29tcGlsYXRpb24oXG4gIGNvbnRyYWN0SWQ6IHN0cmluZyxcbiAgZGlmZjogQ29udHJhY3REaWZmLFxuICBydW50aW1lRGVwZW5kZW5jaWVzOiBzdHJpbmdbXVxuKToge1xuICB3b3VsZEJsb2NrOiBib29sZWFuO1xuICByZWFzb24/OiBzdHJpbmc7XG59IHtcbiAgLy8gQnJlYWtpbmcgY2hhbmdlcyB0byBjb250cmFjdHMgaW4gcnVudGltZSBwYXRoIGFsd2F5cyBibG9ja1xuICBpZiAoZGlmZi5icmVha2luZyAmJiBydW50aW1lRGVwZW5kZW5jaWVzLmluY2x1ZGVzKGNvbnRyYWN0SWQpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvdWxkQmxvY2s6IHRydWUsXG4gICAgICByZWFzb246IGBCcmVha2luZyBjaGFuZ2VzIHRvICR7Y29udHJhY3RJZH0gYWZmZWN0IHJ1bnRpbWUgZGVwZW5kZW5jaWVzYCxcbiAgICB9O1xuICB9XG5cbiAgLy8gQ2hhbmdlcyB0byBjb3JlIGNvbnRyYWN0cyAoQVBJLCBEQikgYWx3YXlzIHJlcXVpcmUgcmV2aWV3XG4gIGlmIChbJ09wZW5BUEknLCAnREJTY2hlbWEnXS5pbmNsdWRlcyhkaWZmLmNvbnRyYWN0VHlwZSkpIHtcbiAgICBpZiAocnVudGltZURlcGVuZGVuY2llcy5pbmNsdWRlcyhjb250cmFjdElkKSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgd291bGRCbG9jazogdHJ1ZSxcbiAgICAgICAgcmVhc29uOiBgJHtkaWZmLmNvbnRyYWN0VHlwZX0gY2hhbmdlcyB0byAke2NvbnRyYWN0SWR9IHJlcXVpcmUgYXBwcm92YWxgLFxuICAgICAgfTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4geyB3b3VsZEJsb2NrOiBmYWxzZSB9O1xufVxuXG4vKipcbiAqIEdldCBjb250cmFjdHMgdGhhdCB3b3VsZCBiZSBhZmZlY3RlZCBieSBhIGNoYW5nZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEFmZmVjdGVkQ29udHJhY3RzKFxuICBjb250cmFjdElkOiBzdHJpbmcsXG4gIGRlcGVuZGVuY3lHcmFwaDogTWFwPHN0cmluZywgc3RyaW5nW10+XG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IGFmZmVjdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHF1ZXVlID0gW2NvbnRyYWN0SWRdO1xuXG4gIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgY3VycmVudCA9IHF1ZXVlLnNoaWZ0KCkhO1xuICAgIGNvbnN0IGRlcGVuZGVudHMgPSBkZXBlbmRlbmN5R3JhcGguZ2V0KGN1cnJlbnQpIHx8IFtdO1xuXG4gICAgZm9yIChjb25zdCBkZXBlbmRlbnQgb2YgZGVwZW5kZW50cykge1xuICAgICAgaWYgKCFhZmZlY3RlZC5oYXMoZGVwZW5kZW50KSkge1xuICAgICAgICBhZmZlY3RlZC5hZGQoZGVwZW5kZW50KTtcbiAgICAgICAgcXVldWUucHVzaChkZXBlbmRlbnQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiBBcnJheS5mcm9tKGFmZmVjdGVkKTtcbn1cblxuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBibG9ja2luZyBjb21waWxhdGlvbiBpbiBidWlsZCB0b29scy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUNvbXBpbGVHYXRlTWlkZGxld2FyZShcbiAgc3RhdGVQcm92aWRlcjogQ29udHJhY3RTdGF0ZVByb3ZpZGVyLFxuICBjb250cmFjdElkczogc3RyaW5nW11cbikge1xuICByZXR1cm4gYXN5bmMgZnVuY3Rpb24gY29tcGlsZUdhdGVNaWRkbGV3YXJlKFxuICAgIG5leHQ6ICgpID0+IFByb21pc2U8dm9pZD5cbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2hlY2tDb21waWxlR2F0ZSh7XG4gICAgICBjb250cmFjdElkcyxcbiAgICAgIHN0YXRlUHJvdmlkZXIsXG4gICAgfSk7XG5cbiAgICBpZiAoIXJlc3VsdC5hbGxvd2VkKSB7XG4gICAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcihcbiAgICAgICAgYENvbXBpbGF0aW9uIGJsb2NrZWQgYnkgRG9EIEdhdGU6XFxuJHtyZXN1bHQuZXJyb3JzLmpvaW4oJ1xcbicpfWBcbiAgICAgICk7XG4gICAgICAoZXJyb3IgYXMgYW55KS5jb21waWxlR2F0ZVJlc3VsdCA9IHJlc3VsdDtcbiAgICAgIHRocm93IGVycm9yO1xuICAgIH1cblxuICAgIC8vIExvZyB3YXJuaW5nc1xuICAgIGZvciAoY29uc3Qgd2FybmluZyBvZiByZXN1bHQud2FybmluZ3MpIHtcbiAgICAgIGNvbnNvbGUud2FybihgW0RvRCBHYXRlIFdhcm5pbmddICR7d2FybmluZ31gKTtcbiAgICB9XG5cbiAgICBhd2FpdCBuZXh0KCk7XG4gIH07XG59XG5cbi8qKlxuICogQ0xJIGNvbW1hbmQgZm9yIGNoZWNraW5nIGNvbXBpbGUgZ2F0ZS5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNvbXBpbGVHYXRlQ29tbWFuZChjb250cmFjdElkczogc3RyaW5nW10pOiBQcm9taXNlPHZvaWQ+IHtcbiAgY29uc29sZS5sb2coJ0RvRCBDb21waWxlIEdhdGUgQ2hlY2snKTtcbiAgY29uc29sZS5sb2coJz09PT09PT09PT09PT09PT09PT09PT0nKTtcbiAgY29uc29sZS5sb2coJycpO1xuICBjb25zb2xlLmxvZyhgQ2hlY2tpbmcgJHtjb250cmFjdElkcy5sZW5ndGh9IGNvbnRyYWN0cy4uLmApO1xuICBjb25zb2xlLmxvZygnJyk7XG5cbiAgLy8gVGhpcyBpcyBhIHBsYWNlaG9sZGVyIC0gYWN0dWFsIGltcGxlbWVudGF0aW9uIG5lZWRzIHN0YXRlIHByb3ZpZGVyXG4gIGNvbnNvbGUubG9nKCdOb3RlOiBDb21waWxlIGdhdGUgY2hlY2sgcmVxdWlyZXMgQ29udHJhY3RTdGF0ZVByb3ZpZGVyIGltcGxlbWVudGF0aW9uLicpO1xuICBjb25zb2xlLmxvZygnJyk7XG4gIGNvbnNvbGUubG9nKCdFeGFtcGxlIG91dHB1dDonKTtcbiAgY29uc29sZS5sb2coJycpO1xuICBjb25zb2xlLmxvZygn4pyFIGFwaS1nYXRld2F5LXYxOiBhcHByb3ZlZCAodjEuMi4zKScpO1xuICBjb25zb2xlLmxvZygn4pyFIHVzZXItc2VydmljZS1zY2hlbWE6IGFwcHJvdmVkICh2Mi4wLjEpJyk7XG4gIGNvbnNvbGUubG9nKCfinYwgcGF5bWVudC1zY2hlbWE6IERSQUZUIC0gcmVxdWlyZXMgYXBwcm92YWwnKTtcbiAgY29uc29sZS5sb2coJycpO1xuICBjb25zb2xlLmxvZygnU3RhdHVzOiBCTE9DS0VEJyk7XG4gIGNvbnNvbGUubG9nKCcnKTtcbiAgY29uc29sZS5sb2coJ1BlbmRpbmcgQXBwcm92YWxzOicpO1xuICBjb25zb2xlLmxvZygnICAtIHBheW1lbnQtc2NoZW1hIChwcm9wb3NhbC0xMjMpJyk7XG4gIGNvbnNvbGUubG9nKCcnKTtcbn1cbiJdfQ==