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
export declare function canonicalizeResource(resource: RawResource): ResourceKey;
/**
 * Check if a resource matches a pattern.
 */
export declare function matchesSelector(resource: ResourceKey, pattern: string): boolean;
/**
 * Generate ownership proofs for resources.
 *
 * Implements single-writer proof:
 * - Write permission must be unique (only one role)
 * - Higher priority rules override lower
 */
export declare function generateOwnershipProof(resources: ResourceKey[], roles: Array<{
    id: string;
}>, ownershipRules: OwnershipRule[]): OwnershipProof[];
/**
 * Validate ownership proofs.
 */
export declare function validateProofs(proofs: OwnershipProof[]): {
    valid: boolean;
    invalidProofs: OwnershipProof[];
    singleWriterViolations: OwnershipProof[];
};
/**
 * Default ownership rules.
 */
export declare const DEFAULT_OWNERSHIP_RULES: OwnershipRule[];
/**
 * Generate proofs with default rules.
 */
export declare function generateDefaultProofs(resources: ResourceKey[], roles: Array<{
    id: string;
}>): OwnershipProof[];
