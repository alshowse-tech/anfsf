"use strict";
/**
 * ASF V4.0 Role Synthesizer - Ownership Proof Generator
 *
 * Resource canonicalization and single-writer proof generation.
 * Version: v0.9.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OWNERSHIP_RULES = void 0;
exports.canonicalizeResource = canonicalizeResource;
exports.matchesSelector = matchesSelector;
exports.generateOwnershipProof = generateOwnershipProof;
exports.validateProofs = validateProofs;
exports.generateDefaultProofs = generateDefaultProofs;
/**
 * Canonicalize resource to normalized key.
 *
 * Examples:
 * - openapi:/orders#POST -> contract:OpenAPI:/orders#POST
 * - graph:Entity:Order -> graph:Entity:Order
 * - frontend/pages/Order.tsx -> code:frontend/pages/Order.tsx
 */
function canonicalizeResource(resource) {
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
        type: resource.type,
        path: resource.path,
        version: resource.version,
    };
}
/**
 * Check if a resource matches a pattern.
 */
function matchesSelector(resource, pattern) {
    const resourceStr = `${resource.type}:${resource.path}${resource.subpath ? `#${resource.subpath}` : ''}`;
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
function generateOwnershipProof(resources, roles, ownershipRules) {
    const proofs = [];
    for (const resource of resources) {
        // 1. Collect all rules matching this resource
        const matchedRules = ownershipRules.filter((rule) => matchesSelector(resource, rule.resourcePattern));
        // 2. Sort by priority (higher first)
        matchedRules.sort((a, b) => b.priority - a.priority);
        // 3. Determine final permission (highest priority wins)
        let finalPermission = null;
        let finalRoleId = null;
        const appliedRules = [];
        const proposers = [];
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
function validateProofs(proofs) {
    const invalidProofs = proofs.filter((p) => !p.valid);
    const singleWriterViolations = proofs.filter((p) => p.error?.includes('Multiple potential writers'));
    return {
        valid: invalidProofs.length === 0,
        invalidProofs,
        singleWriterViolations,
    };
}
/**
 * Default ownership rules.
 */
exports.DEFAULT_OWNERSHIP_RULES = [
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
function generateDefaultProofs(resources, roles) {
    return generateOwnershipProof(resources, roles, exports.DEFAULT_OWNERSHIP_RULES);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvb2YtZ2VuZXJhdG9yLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvc3ludGhlc2l6ZXIvb3duZXJzaGlwL3Byb29mLWdlbmVyYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQThESCxvREE4Q0M7QUFLRCwwQ0FpQkM7QUFTRCx3REEyRUM7QUFLRCx3Q0FlQztBQThDRCxzREFLQztBQXZPRDs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQUMsUUFBcUI7SUFDeEQsbUJBQW1CO0lBQ25CLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUNsRSxNQUFNLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hELE9BQU87WUFDTCxJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJLEVBQUUsV0FBVyxJQUFJLEVBQUU7WUFDdkIsT0FBTyxFQUFFLE1BQU07WUFDZixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87U0FDMUIsQ0FBQztJQUNKLENBQUM7SUFFRCxxQkFBcUI7SUFDckIsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVUsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLFVBQVUsRUFBRSxDQUFDO1FBQ25FLE9BQU87WUFDTCxJQUFJLEVBQUUsVUFBVTtZQUNoQixJQUFJLEVBQUUsWUFBWSxRQUFRLENBQUMsSUFBSSxFQUFFO1lBQ2pDLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztTQUMxQixDQUFDO0lBQ0osQ0FBQztJQUVELGVBQWU7SUFDZixJQUFJLFFBQVEsQ0FBQyxJQUFJLEtBQUssT0FBTyxFQUFFLENBQUM7UUFDOUIsT0FBTztZQUNMLElBQUksRUFBRSxPQUFPO1lBQ2Is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Q3ZCLENBQUM7QUFDSixDQUFDO0FBRUQ7O0dBRUc7QUFDVSxRQUFBLHVCQUF1QixHQUFvQjtJQUN0RCxpQkFBaUI7SUFDakI7UUFDRSxlQUFlLEVBQUUsR0FBRztRQUNwQixNQUFNLEVBQUUsR0FBRztRQUNYLFVBQVUsRUFBRSxNQUFNO1FBQ2xCLFFBQVEsRUFBRSxDQUFDO0tBQ1o7SUFDRCxvQkFBb0I7SUFDcEI7UUFDRSxlQUFlLEVBQUUsR0FBRztRQUNwQixNQUFNLEVBQUUsR0FBRztRQUNYLFVBQVUsRUFBRSxTQUFTO1FBQ3JCLFFBQVEsRUFBRSxFQUFFO0tBQ2I7SUFDRCxpREFBaUQ7SUFDakQ7UUFDRSxlQUFlLEVBQUUsWUFBWTtRQUM3QixNQUFNLEVBQUUsZUFBZTtRQUN2QixVQUFVLEVBQUUsTUFBTTtRQUNsQixRQUFRLEVBQUUsRUFBRTtLQUNiO0lBQ0QsbUNBQW1DO0lBQ25DO1FBQ0UsZUFBZSxFQUFFLFlBQVk7UUFDN0IsTUFBTSxFQUFFLFdBQVc7UUFDbkIsVUFBVSxFQUFFLFNBQVM7UUFDckIsUUFBUSxFQUFFLEdBQUc7S0FDZDtJQUNELGlDQUFpQztJQUNqQztRQUNFLGVBQWUsRUFBRSxZQUFZO1FBQzdCLE1BQU0sRUFBRSxXQUFXO1FBQ25CLFVBQVUsRUFBRSxPQUFPO1FBQ25CLFFBQVEsRUFBRSxHQUFHO0tBQ2Q7Q0FDRixDQUFDO0FBRUY7O0dBRUc7QUFDSCxTQUFnQixxQkFBcUIsQ0FDbkMsU0FBd0IsRUFDeEIsS0FBNEI7SUFFNUIsT0FBTyxzQkFBc0IsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLCtCQUF1QixDQUFDLENBQUM7QUFDM0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQVNGIFY0LjAgUm9sZSBTeW50aGVzaXplciAtIE93bmVyc2hpcCBQcm9vZiBHZW5lcmF0b3JcbiAqIFxuICogUmVzb3VyY2UgY2Fub25pY2FsaXphdGlvbiBhbmQgc2luZ2xlLXdyaXRlciBwcm9vZiBnZW5lcmF0aW9uLlxuICogVmVyc2lvbjogdjAuOS4wXG4gKi9cblxuLyoqXG4gKiBSZXNvdXJjZSBrZXkgKG5vcm1hbGl6ZWQgZm9ybSkuXG4gKi9cbmV4cG9ydCB0eXBlIFJlc291cmNlS2V5ID0ge1xuICB0eXBlOiAnY29udHJhY3QnIHwgJ2dyYXBoJyB8ICdjb2RlJztcbiAgcGF0aDogc3RyaW5nO1xuICB2ZXJzaW9uPzogc3RyaW5nO1xuICBzdWJwYXRoPzogc3RyaW5nO1xufTtcblxuLyoqXG4gKiBSYXcgcmVzb3VyY2UgKGJlZm9yZSBjYW5vbmljYWxpemF0aW9uKS5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSYXdSZXNvdXJjZSB7XG4gIHR5cGU6IHN0cmluZztcbiAgcGF0aDogc3RyaW5nO1xuICBmb3JtYXQ/OiBzdHJpbmc7XG4gIGVudGl0eVR5cGU/OiBzdHJpbmc7XG4gIGVudGl0eUlkPzogc3RyaW5nO1xuICBmaWxlUGF0aD86IHN0cmluZztcbiAgc3ltYm9sPzogc3RyaW5nO1xuICB2ZXJzaW9uPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFBlcm1pc3Npb24gdHlwZS5cbiAqL1xuZXhwb3J0IHR5cGUgUGVybWlzc2lvbiA9ICdyZWFkJyB8ICd3cml0ZScgfCAncHJvcG9zZScgfCAnYXBwcm92ZScgfCAnZGVueSc7XG5cbi8qKlxuICogT3duZXJzaGlwIHJ1bGUuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3duZXJzaGlwUnVsZSB7XG4gIHJlc291cmNlUGF0dGVybjogc3RyaW5nO1xuICByb2xlSWQ6IHN0cmluZztcbiAgcGVybWlzc2lvbjogUGVybWlzc2lvbjtcbiAgcHJpb3JpdHk6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBPd25lcnNoaXAgcHJvb2Ygb3V0cHV0LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIE93bmVyc2hpcFByb29mIHtcbiAgcmVzb3VyY2U6IFJlc291cmNlS2V5O1xuICB3cml0ZXI6IHN0cmluZyB8IG51bGw7XG4gIHByb3Bvc2VyOiBzdHJpbmcgfCBzdHJpbmdbXSB8IG51bGw7XG4gIGFwcHJvdmVyOiBzdHJpbmcgfCBudWxsO1xuICBydWxlc0FwcGxpZWQ6IE93bmVyc2hpcFJ1bGVbXTtcbiAgdmFsaWQ6IGJvb2xlYW47XG4gIGVycm9yPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIENhbm9uaWNhbGl6ZSByZXNvdXJjZSB0byBub3JtYWxpemVkIGtleS5cbiAqIFxuICogRXhhbXBsZXM6XG4gKiAtIG9wZW5hcGk6L29yZGVycyNQT1NUIC0+IGNvbnRyYWN0Ok9wZW5BUEk6L29yZGVycyNQT1NUXG4gKiAtIGdyYXBoOkVudGl0eTpPcmRlciAtPiBncmFwaDpFbnRpdHk6T3JkZXJcbiAqIC0gZnJvbnRlbmQvcGFnZXMvT3JkZXIudHN4IC0+IGNvZGU6ZnJvbnRlbmQvcGFnZXMvT3JkZXIudHN4XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW5vbmljYWxpemVSZXNvdXJjZShyZXNvdXJjZTogUmF3UmVzb3VyY2UpOiBSZXNvdXJjZUtleSB7XG4gIC8vIE9wZW5BUEkgY29udHJhY3RcbiAgaWYgKHJlc291cmNlLnR5cGUgPT09ICdjb250cmFjdCcgJiYgcmVzb3VyY2UuZm9ybWF0ID09PSAnb3BlbmFwaScpIHtcbiAgICBjb25zdCBbcGF0aCwgbWV0aG9kXSA9IHJlc291cmNlLnBhdGguc3BsaXQoJyMnKTtcbiAgICByZXR1cm4ge1xuICAgICAgdHlwZTogJ2NvbnRyYWN0JyxcbiAgICAgIHBhdGg6IGBPcGVuQVBJOiR7cGF0aH1gLFxuICAgICAgc3VicGF0aDogbWV0aG9kLFxuICAgICAgdmVyc2lvbjogcmVzb3VyY2UudmVyc2lvbixcbiAgICB9O1xuICB9XG5cbiAgLy8gREIgU2NoZW1hIGNvbnRyYWN0XG4gIGlmIChyZXNvdXJjZS50eXBlID09PSAnY29udHJhY3QnICYmIHJlc291cmNlLmZvcm1hdCA9PT0gJ2Ric2NoZW1hJykge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY29udHJhY3QnLFxuICAgICAgcGF0aDogYERCU2NoZW1hOiR7cmVzb3VyY2UucGF0aH1gLFxuICAgICAgdmVyc2lvbjogcmVzb3VyY2UudmVyc2lvbixcbiAgICB9O1xuICB9XG5cbiAgLy8gR3JhcGggZW50aXR5XG4gIGlmIChyZXNvdXJjZS50eXBlID09PSAnZ3JhcGgnKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHR5cGU6ICdncmFwaCcsXG4gICAgICBwYXRoOiBgR3JhcGg6JHtyZXNvdXJjZS5lbnRpdHlUeXBlfToke3Jlc291cmNlLmVudGl0eUlkfWAsXG4gICAgICB2ZXJzaW9uOiByZXNvdXJjZS52ZXJzaW9uLFxuICAgIH07XG4gIH1cblxuICAvLyBDb2RlIGZpbGVcbiAgaWYgKHJlc291cmNlLnR5cGUgPT09ICdjb2RlJykge1xuICAgIHJldHVybiB7XG4gICAgICB0eXBlOiAnY29kZScsXG4gICAgICBwYXRoOiByZXNvdXJjZS5maWxlUGF0aCA/PyByZXNvdXJjZS5wYXRoLFxuICAgICAgc3VicGF0aDogcmVzb3VyY2Uuc3ltYm9sLFxuICAgICAgdmVyc2lvbjogcmVzb3VyY2UudmVyc2lvbixcbiAgICB9O1xuICB9XG5cbiAgLy8gR2VuZXJpY1xuICByZXR1cm4ge1xuICAgIHR5cGU6IHJlc291cmNlLnR5cGUgYXMgUmVzb3VyY2VLZXlbJ3R5cGUnXSxcbiAgICBwYXRoOiByZXNvdXJjZS5wYXRoLFxuICAgIHZlcnNpb246IHJlc291cmNlLnZlcnNpb24sXG4gIH07XG59XG5cbi8qKlxuICogQ2hlY2sgaWYgYSByZXNvdXJjZSBtYXRjaGVzIGEgcGF0dGVybi5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hdGNoZXNTZWxlY3RvcihyZXNvdXJjZTogUmVzb3VyY2VLZXksIHBhdHRlcm46IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCByZXNvdXJjZVN0ciA9IGAke3Jlc291cmNlLnR5cGV9OiR7cmVzb3VyY2UucGF0aH0ke1xuICAgIHJlc291cmNlLnN1YnBhdGggPyBgIyR7cmVzb3VyY2Uuc3VicGF0aH1gIDogJydcbiAgfWA7XG5cbiAgLy8gV2lsZGNhcmQgYXQgZW5kXG4gIGlmIChwYXR0ZXJuLmVuZHNXaXRoKCcqJykpIHtcbiAgICByZXR1cm4gcmVzb3VyY2VTdHIuc3RhcnRzV2l0aChwYXR0ZXJuLnNsaWNlKDAsIC0xKSk7XG4gIH1cblxuICAvLyBXaWxkY2FyZCBhdCBzdGFydFxuICBpZiAocGF0dGVybi5zdGFydHNXaXRoKCcqJykpIHtcbiAgICByZXR1cm4gcmVzb3VyY2VTdHIuZW5kc1dpdGgocGF0dGVybi5zbGljZSgxKSk7XG4gIH1cblxuICAvLyBFeGFjdCBtYXRjaFxuICByZXR1cm4gcmVzb3VyY2VTdHIgPT09IHBhdHRlcm47XG59XG5cbi8qKlxuICogR2VuZXJhdGUgb3duZXJzaGlwIHByb29mcyBmb3IgcmVzb3VyY2VzLlxuICogXG4gKiBJbXBsZW1lbnRzIHNpbmdsZS13cml0ZXIgcHJvb2Y6XG4gKiAtIFdyaXRlIHBlcm1pc3Npb24gbXVzdCBiZSB1bmlxdWUgKG9ubHkgb25lIHJvbGUpXG4gKiAtIEhpZ2hlciBwcmlvcml0eSBydWxlcyBvdmVycmlkZSBsb3dlclxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVPd25lcnNoaXBQcm9vZihcbiAgcmVzb3VyY2VzOiBSZXNvdXJjZUtleVtdLFxuICByb2xlczogQXJyYXk8eyBpZDogc3RyaW5nIH0+LFxuICBvd25lcnNoaXBSdWxlczogT3duZXJzaGlwUnVsZVtdXG4pOiBPd25lcnNoaXBQcm9vZltdIHtcbiAgY29uc3QgcHJvb2ZzOiBPd25lcnNoaXBQcm9vZltdID0gW107XG5cbiAgZm9yIChjb25zdCByZXNvdXJjZSBvZiByZXNvdXJjZXMpIHtcbiAgICAvLyAxLiBDb2xsZWN0IGFsbCBydWxlcyBtYXRjaGluZyB0aGlzIHJlc291cmNlXG4gICAgY29uc3QgbWF0Y2hlZFJ1bGVzID0gb3duZXJzaGlwUnVsZXMuZmlsdGVyKChydWxlKSA9PlxuICAgICAgbWF0Y2hlc1NlbGVjdG9yKHJlc291cmNlLCBydWxlLnJlc291cmNlUGF0dGVybilcbiAgICApO1xuXG4gICAgLy8gMi4gU29ydCBieSBwcmlvcml0eSAoaGlnaGVyIGZpcnN0KVxuICAgIG1hdGNoZWRSdWxlcy5zb3J0KChhLCBiKSA9PiBiLnByaW9yaXR5IC0gYS5wcmlvcml0eSk7XG5cbiAgICAvLyAzLiBEZXRlcm1pbmUgZmluYWwgcGVybWlzc2lvbiAoaGlnaGVzdCBwcmlvcml0eSB3aW5zKVxuICAgIGxldCBmaW5hbFBlcm1pc3Npb246IFBlcm1pc3Npb24gfCBudWxsID0gbnVsbDtcbiAgICBsZXQgZmluYWxSb2xlSWQ6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGNvbnN0IGFwcGxpZWRSdWxlczogT3duZXJzaGlwUnVsZVtdID0gW107XG5cbiAgICBjb25zdCBwcm9wb3NlcnM6IHN0cmluZ1tdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHJ1bGUgb2YgbWF0Y2hlZFJ1bGVzKSB7XG4gICAgICBpZiAocnVsZS5yb2xlSWQgPT09ICcqJyB8fCByb2xlcy5zb21lKChyKSA9PiByLmlkID09PSBydWxlLnJvbGVJZCkpIHtcbiAgICAgICAgYXBwbGllZFJ1bGVzLnB1c2gocnVsZSk7XG5cbiAgICAgICAgaWYgKGZpbmFsUGVybWlzc2lvbiA9PT0gbnVsbCkge1xuICAgICAgICAgIGZpbmFsUGVybWlzc2lvbiA9IHJ1bGUucGVybWlzc2lvbjtcbiAgICAgICAgICBmaW5hbFJvbGVJZCA9IHJ1bGUucm9sZUlkID09PSAnKicgPyAnYW55JyA6IHJ1bGUucm9sZUlkO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJ1bGUucGVybWlzc2lvbiA9PT0gJ3Byb3Bvc2UnKSB7XG4gICAgICAgICAgcHJvcG9zZXJzLnB1c2gocnVsZS5yb2xlSWQgPT09ICcqJyA/ICdhbnknIDogcnVsZS5yb2xlSWQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gNC4gVmVyaWZ5IHNpbmdsZS13cml0ZXIgKHdyaXRlIHBlcm1pc3Npb24gbXVzdCBiZSB1bmlxdWUpXG4gICAgY29uc3Qgd3JpdGVycyA9IG1hdGNoZWRSdWxlcy5maWx0ZXIoKHIpID0+IHIucGVybWlzc2lvbiA9PT0gJ3dyaXRlJyk7XG4gICAgY29uc3QgdW5pcXVlV3JpdGVycyA9IG5ldyBTZXQod3JpdGVycy5tYXAoKHcpID0+IHcucm9sZUlkKSk7XG5cbiAgICBpZiAoZmluYWxQZXJtaXNzaW9uID09PSAnd3JpdGUnICYmIHVuaXF1ZVdyaXRlcnMuc2l6ZSA+IDEpIHtcbiAgICAgIHByb29mcy5wdXNoKHtcbiAgICAgICAgcmVzb3VyY2UsXG4gICAgICAgIHdyaXRlcjogbnVsbCxcbiAgICAgICAgcHJvcG9zZXI6IG51bGwsXG4gICAgICAgIGFwcHJvdmVyOiBudWxsLFxuICAgICAgICBydWxlc0FwcGxpZWQ6IGFwcGxpZWRSdWxlcyxcbiAgICAgICAgdmFsaWQ6IGZhbHNlLFxuICAgICAgICBlcnJvcjogYE11bHRpcGxlIHBvdGVudGlhbCB3cml0ZXJzOiAke0FycmF5LmZyb20odW5pcXVlV3JpdGVycykuam9pbignLCAnKX1gLFxuICAgICAgfSk7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG5cbiAgICAvLyA1LiBGaW5kIGFwcHJvdmVyXG4gICAgY29uc3QgYXBwcm92ZXJSdWxlID0gbWF0Y2hlZFJ1bGVzLmZpbmQoKHIpID0+IHIucGVybWlzc2lvbiA9PT0gJ2FwcHJvdmUnKTtcbiAgICBjb25zdCBhcHByb3ZlciA9IGFwcHJvdmVyUnVsZVxuICAgICAgPyBhcHByb3ZlclJ1bGUucm9sZUlkID09PSAnKidcbiAgICAgICAgPyAnYW55J1xuICAgICAgICA6IGFwcHJvdmVyUnVsZS5yb2xlSWRcbiAgICAgIDogbnVsbDtcblxuICAgIC8vIDYuIEdlbmVyYXRlIHByb29mXG4gICAgcHJvb2ZzLnB1c2goe1xuICAgICAgcmVzb3VyY2UsXG4gICAgICB3cml0ZXI6IGZpbmFsUGVybWlzc2lvbiA9PT0gJ3dyaXRlJyA/IGZpbmFsUm9sZUlkIDogbnVsbCxcbiAgICAgIHByb3Bvc2VyOiBwcm9wb3NlcnMubGVuZ3RoID4gMCA/IHByb3Bvc2VycyA6IG51bGwsXG4gICAgICBhcHByb3ZlcixcbiAgICAgIHJ1bGVzQXBwbGllZDogYXBwbGllZFJ1bGVzLFxuICAgICAgdmFsaWQ6IGZpbmFsUGVybWlzc2lvbiAhPT0gJ2RlbnknLFxuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHByb29mcztcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBvd25lcnNoaXAgcHJvb2ZzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gdmFsaWRhdGVQcm9vZnMocHJvb2ZzOiBPd25lcnNoaXBQcm9vZltdKToge1xuICB2YWxpZDogYm9vbGVhbjtcbiAgaW52YWxpZFByb29mczogT3duZXJzaGlwUHJvb2ZbXTtcbiAgc2luZ2xlV3JpdGVyVmlvbGF0aW9uczogT3duZXJzaGlwUHJvb2ZbXTtcbn0ge1xuICBjb25zdCBpbnZhbGlkUHJvb2ZzID0gcHJvb2ZzLmZpbHRlcigocCkgPT4gIXAudmFsaWQpO1xuICBjb25zdCBzaW5nbGVXcml0ZXJWaW9sYXRpb25zID0gcHJvb2ZzLmZpbHRlcihcbiAgICAocCkgPT4gcC5lcnJvcj8uaW5jbHVkZXMoJ011bHRpcGxlIHBvdGVudGlhbCB3cml0ZXJzJylcbiAgKTtcblxuICByZXR1cm4ge1xuICAgIHZhbGlkOiBpbnZhbGlkUHJvb2ZzLmxlbmd0aCA9PT0gMCxcbiAgICBpbnZhbGlkUHJvb2ZzLFxuICAgIHNpbmdsZVdyaXRlclZpb2xhdGlvbnMsXG4gIH07XG59XG5cbi8qKlxuICogRGVmYXVsdCBvd25lcnNoaXAgcnVsZXMuXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX09XTkVSU0hJUF9SVUxFUzogT3duZXJzaGlwUnVsZVtdID0gW1xuICAvLyBSZWFkOiBFdmVyeW9uZVxuICB7XG4gICAgcmVzb3VyY2VQYXR0ZXJuOiAnKicsXG4gICAgcm9sZUlkOiAnKicsXG4gICAgcGVybWlzc2lvbjogJ3JlYWQnLFxuICAgIHByaW9yaXR5OiAxLFxuICB9LFxuICAvLyBQcm9wb3NlOiBBbnkgcm9sZVxuICB7XG4gICAgcmVzb3VyY2VQYXR0ZXJuOiAnKicsXG4gICAgcm9sZUlkOiAnKicsXG4gICAgcGVybWlzc2lvbjogJ3Byb3Bvc2UnLFxuICAgIHByaW9yaXR5OiAxMCxcbiAgfSxcbiAgLy8gTm9uLWFyY2hpdGVjdDogQ2Fubm90IHdyaXRlIGNvbnRyYWN0cyBkaXJlY3RseVxuICB7XG4gICAgcmVzb3VyY2VQYXR0ZXJuOiAnY29udHJhY3Q6KicsXG4gICAgcm9sZUlkOiAnbm9uX2FyY2hpdGVjdCcsXG4gICAgcGVybWlzc2lvbjogJ2RlbnknLFxuICAgIHByaW9yaXR5OiA5MCxcbiAgfSxcbiAgLy8gQXJjaGl0ZWN0OiBDYW4gYXBwcm92ZSBjb250cmFjdHNcbiAge1xuICAgIHJlc291cmNlUGF0dGVybjogJ2NvbnRyYWN0OionLFxuICAgIHJvbGVJZDogJ2FyY2hpdGVjdCcsXG4gICAgcGVybWlzc2lvbjogJ2FwcHJvdmUnLFxuICAgIHByaW9yaXR5OiAxMDAsXG4gIH0sXG4gIC8vIEFyY2hpdGVjdDogQ2FuIHdyaXRlIGNvbnRyYWN0c1xuICB7XG4gICAgcmVzb3VyY2VQYXR0ZXJuOiAnY29udHJhY3Q6KicsXG4gICAgcm9sZUlkOiAnYXJjaGl0ZWN0JyxcbiAgICBwZXJtaXNzaW9uOiAnd3JpdGUnLFxuICAgIHByaW9yaXR5OiAxMDAsXG4gIH0sXG5dO1xuXG4vKipcbiAqIEdlbmVyYXRlIHByb29mcyB3aXRoIGRlZmF1bHQgcnVsZXMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZURlZmF1bHRQcm9vZnMoXG4gIHJlc291cmNlczogUmVzb3VyY2VLZXlbXSxcbiAgcm9sZXM6IEFycmF5PHsgaWQ6IHN0cmluZyB9PlxuKTogT3duZXJzaGlwUHJvb2ZbXSB7XG4gIHJldHVybiBnZW5lcmF0ZU93bmVyc2hpcFByb29mKHJlc291cmNlcywgcm9sZXMsIERFRkFVTFRfT1dORVJTSElQX1JVTEVTKTtcbn1cbiJdfQ==