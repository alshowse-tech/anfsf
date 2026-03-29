/**
 * ASF V4.0 Role Synthesizer - Ownership Proof Generator
 * 
 * Resource canonicalization and single-writer proof generation.
 * Version: v0.9.0
 */

/**
 * Resource key (normalized form).
 */
export type ResourceKey = {
  type: 'contract' | 'graph' | 'code';
  path: string;
  version?: string;
  subpath?: string;
};

/**
 * Raw resource (before canonicalization).
 */
export interface RawResource {
  type: string;
  path: string;
  format?: string;
  entityType?: string;
  entityId?: string;
  filePath?: string;
  symbol?: string;
  version?: string;
}

/**
 * Permission type.
 */
export type Permission = 'read' | 'write' | 'propose' | 'approve' | 'deny';

/**
 * Ownership rule.
 */
export interface OwnershipRule {
  resourcePattern: string;
  roleId: string;
  permission: Permission;
  priority: number;
}

/**
 * Ownership proof output.
 */
export interface OwnershipProof {
  resource: ResourceKey;
  writer: string | null;
  proposer: string | string[] | null;
  approver: string | null;
  rulesApplied: OwnershipRule[];
  valid: boolean;
  error?: string;
}

/**
 * Canonicalize resource to normalized key.
 * 
 * Examples:
 * - openapi:/orders#POST -> contract:OpenAPI:/orders#POST
 * - graph:Entity:Order -> graph:Entity:Order
 * - frontend/pages/Order.tsx -> code:frontend/pages/Order.tsx
 */
export function canonicalizeResource(resource: RawResource): ResourceKey {
  // OpenAPI contract
  if (resource.type === 'contract' && resource.format === 'openapi') {
    const [path, method] = resource.path.split('#');
    return {
      type: 'contract',
      path: `OpenAPI:${path}`,
      subpath: method,
      version: resource.version,
    };
  }

  // DB Schema contract
  if (resource.type === 'contract' && resource.format === 'dbschema') {
    return {
      type: 'contract',
      path: `DBSchema:${resource.path}`,
      version: resource.version,
    };
  }

  // Graph entity
  if (resource.type === 'graph') {
    return {
      type: 'graph',
      path: `Graph:${resource.entityType}:${resource.entityId}`,
      version: resource.version,
    };
  }

  // Code file
  if (resource.type === 'code') {
    return {
      type: 'code',
      path: resource.filePath ?? resource.path,
      subpath: resource.symbol,
      version: resource.version,
    };
  }

  // Generic
  return {
    type: resource.type as ResourceKey['type'],
    path: resource.path,
    version: resource.version,
  };
}

/**
 * Check if a resource matches a pattern.
 */
export function matchesSelector(resource: ResourceKey, pattern: string): boolean {
  const resourceStr = `${resource.type}:${resource.path}${
    resource.subpath ? `#${resource.subpath}` : ''
  }`;

  // Wildcard at end
  if (pattern.endsWith('*')) {
    return resourceStr.startsWith(pattern.slice(0, -1));
  }

  // Wildcard at start
  if (pattern.startsWith('*')) {
    return resourceStr.endsWith(pattern.slice(1));
  }

  // Exact match
  return resourceStr === pattern;
}

/**
 * Generate ownership proofs for resources.
 * 
 * Implements single-writer proof:
 * - Write permission must be unique (only one role)
 * - Higher priority rules override lower
 */
export function generateOwnershipProof(
  resources: ResourceKey[],
  roles: Array<{ id: string }>,
  ownershipRules: OwnershipRule[]
): OwnershipProof[] {
  const proofs: OwnershipProof[] = [];

  for (const resource of resources) {
    // 1. Collect all rules matching this resource
    const matchedRules = ownershipRules.filter((rule) =>
      matchesSelector(resource, rule.resourcePattern)
    );

    // 2. Sort by priority (higher first)
    matchedRules.sort((a, b) => b.priority - a.priority);

    // 3. Determine final permission (highest priority wins)
    let finalPermission: Permission | null = null;
    let finalRoleId: string | null = null;
    const appliedRules: OwnershipRule[] = [];

    const proposers: string[] = [];

    for (const rule of matchedRules) {
      if (rule.roleId === '*' || roles.some((r) => r.id === rule.roleId)) {
        appliedRules.push(rule);

        if (finalPermission === null) {
          finalPermission = rule.permission;
          finalRoleId = rule.roleId === '*' ? 'any' : rule.roleId;
        }

        if (rule.permission === 'propose') {
          proposers.push(rule.roleId === '*' ? 'any' : rule.roleId);
        }
      }
    }

    // 4. Verify single-writer (write permission must be unique)
    const writers = matchedRules.filter((r) => r.permission === 'write');
    const uniqueWriters = new Set(writers.map((w) => w.roleId));

    if (finalPermission === 'write' && uniqueWriters.size > 1) {
      proofs.push({
        resource,
        writer: null,
        proposer: null,
        approver: null,
        rulesApplied: appliedRules,
        valid: false,
        error: `Multiple potential writers: ${Array.from(uniqueWriters).join(', ')}`,
      });
      continue;
    }

    // 5. Find approver
    const approverRule = matchedRules.find((r) => r.permission === 'approve');
    const approver = approverRule
      ? approverRule.roleId === '*'
        ? 'any'
        : approverRule.roleId
      : null;

    // 6. Generate proof
    proofs.push({
      resource,
      writer: finalPermission === 'write' ? finalRoleId : null,
      proposer: proposers.length > 0 ? proposers : null,
      approver,
      rulesApplied: appliedRules,
      valid: finalPermission !== 'deny',
    });
  }

  return proofs;
}

/**
 * Validate ownership proofs.
 */
export function validateProofs(proofs: OwnershipProof[]): {
  valid: boolean;
  invalidProofs: OwnershipProof[];
  singleWriterViolations: OwnershipProof[];
} {
  const invalidProofs = proofs.filter((p) => !p.valid);
  const singleWriterViolations = proofs.filter(
    (p) => p.error?.includes('Multiple potential writers')
  );

  return {
    valid: invalidProofs.length === 0,
    invalidProofs,
    singleWriterViolations,
  };
}

/**
 * Default ownership rules.
 */
export const DEFAULT_OWNERSHIP_RULES: OwnershipRule[] = [
  // Read: Everyone
  {
    resourcePattern: '*',
    roleId: '*',
    permission: 'read',
    priority: 1,
  },
  // Propose: Any role
  {
    resourcePattern: '*',
    roleId: '*',
    permission: 'propose',
    priority: 10,
  },
  // Non-architect: Cannot write contracts directly
  {
    resourcePattern: 'contract:*',
    roleId: 'non_architect',
    permission: 'deny',
    priority: 90,
  },
  // Architect: Can approve contracts
  {
    resourcePattern: 'contract:*',
    roleId: 'architect',
    permission: 'approve',
    priority: 100,
  },
  // Architect: Can write contracts
  {
    resourcePattern: 'contract:*',
    roleId: 'architect',
    permission: 'write',
    priority: 100,
  },
];

/**
 * Generate proofs with default rules.
 */
export function generateDefaultProofs(
  resources: ResourceKey[],
  roles: Array<{ id: string }>
): OwnershipProof[] {
  return generateOwnershipProof(resources, roles, DEFAULT_OWNERSHIP_RULES);
}
