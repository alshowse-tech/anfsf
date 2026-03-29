/**
 * ASF V4.0 Role Synthesizer - Conflict Resolver
 * 
 * Resolves ownership conflicts with budget-driven decisions.
 * Version: v0.9.0
 */

import type { Role, Contract } from '../types';

/**
 * Resource for conflict resolution.
 */
export interface ConflictResource {
  id: string;
  type: string;
  path: string;
}

/**
 * Resolution action.
 */
export type ResolutionAction = 'merge_roles' | 'introduce_contract';

/**
 * Resolution result.
 */
export interface Resolution {
  action: ResolutionAction;
  reason: string;
  contractCost?: number;
  rolesToMerge?: string[];
  contract?: Contract;
}

/**
 * Estimate contract cost.
 */
export function estimateContractCost(
  resource: ConflictResource,
  roles: Role[]
): number {
  // Base cost by type
  const baseCosts: Record<string, number> = {
    OpenAPI: 1.6,
    DBSchema: 1.7,
    UIProps: 1.2,
    EventSchema: 1.5,
  };

  const baseCost = baseCosts[resource.type] || 1.0;

  // Scale by number of roles involved
  const roleMultiplier = 1 + (roles.length - 1) * 0.2;

  return Math.round(baseCost * roleMultiplier * 10) / 10;
}

/**
 * Generate contract between roles.
 */
export function generateContractBetween(
  roles: Role[],
  resource: ConflictResource
): Contract {
  return {
    id: `contract-${resource.id}-${Date.now()}`,
    type: resource.type as Contract['type'],
    version: '1.0.0',
    ownerRoleId: roles[0]?.id,
  };
}

/**
 * Resolve ownership conflict.
 * 
 * Decision logic:
 * - If adding contract would exceed budget → merge roles
 * - Otherwise → introduce contract
 */
export function resolveOwnershipConflict(
  resource: ConflictResource,
  conflictingRoles: Role[],
  currentBudget: number,
  budgetLimit: number
): Resolution {
  const contractCost = estimateContractCost(resource, conflictingRoles);

  // If adding contract would exceed budget → merge roles
  if (currentBudget + contractCost > budgetLimit) {
    return {
      action: 'merge_roles',
      rolesToMerge: conflictingRoles.map((r) => r.id),
      reason: `Adding contract would exceed budget (${currentBudget + contractCost} > ${budgetLimit})`,
      contractCost,
    };
  }

  // Otherwise → introduce contract
  return {
    action: 'introduce_contract',
    contract: generateContractBetween(conflictingRoles, resource),
    reason: `Resolving conflict with contract (cost: ${contractCost})`,
    contractCost,
  };
}

/**
 * Batch conflict resolution.
 */
export interface ConflictBatch {
  resource: ConflictResource;
  conflictingRoles: Role[];
}

export function resolveConflicts(
  conflicts: ConflictBatch[],
  currentBudget: number,
  budgetLimit: number
): Resolution[] {
  const resolutions: Resolution[] = [];

  for (const conflict of conflicts) {
    const resolution = resolveOwnershipConflict(
      conflict.resource,
      conflict.conflictingRoles,
      currentBudget,
      budgetLimit
    );
    resolutions.push(resolution);

    // Update budget if contract was added
    if (resolution.action === 'introduce_contract' && resolution.contractCost) {
      // Budget would be updated in real implementation
    }
  }

  return resolutions;
}

/**
 * Generate conflict resolution report.
 */
export function generateConflictReport(resolutions: Resolution[]): string {
  const lines = ['Conflict Resolution Report', '=========================', ''];

  const mergeCount = resolutions.filter((r) => r.action === 'merge_roles').length;
  const contractCount = resolutions.filter(
    (r) => r.action === 'introduce_contract'
  ).length;

  lines.push(`Total conflicts: ${resolutions.length}`);
  lines.push(`Role merges: ${mergeCount}`);
  lines.push(`New contracts: ${contractCount}`);
  lines.push('');

  if (resolutions.length > 0) {
    lines.push('Resolutions:');
    for (const res of resolutions) {
      lines.push(`  - ${res.action === 'merge_roles' ? 'Merge' : 'Contract'}: ${res.reason}`);
    }
  }

  return lines.join('\n');
}
