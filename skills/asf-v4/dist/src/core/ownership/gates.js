"use strict";
/**
 * ASF V4.0 Ownership Lattice - Contract Permission Gates
 *
 * Enforces access control for contract operations.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractGate = void 0;
exports.createDefaultContractGate = createDefaultContractGate;
exports.createStrictContractGate = createStrictContractGate;
/**
 * Contract Gate - Enforces permission rules for contract operations.
 */
class ContractGate {
    constructor(lattice, rules) {
        this.lattice = lattice;
        this.rules = rules || this.getDefaultRules();
    }
    /**
     * Get default permission rules.
     */
    getDefaultRules() {
        return [
            // Read: Everyone can read
            {
                contractType: '*',
                action: 'read',
                allowedRoles: ['*'],
            },
            // Propose: Any role can propose changes
            {
                contractType: '*',
                action: 'propose',
                allowedRoles: ['*'],
            },
            // Write (direct): Only Architect can write directly
            {
                contractType: '*',
                action: 'write',
                allowedRoles: ['architect', 'system'],
            },
            // Approve: Only Architect can approve
            {
                contractType: '*',
                action: 'approve',
                allowedRoles: ['architect'],
                conditions: [{ type: 'requires_review', value: true }],
            },
            // Reject: Only Architect can reject
            {
                contractType: '*',
                action: 'reject',
                allowedRoles: ['architect'],
            },
            // V1.5.0 NEW: UI Style resources - auto-approve for Frontend Role
            {
                contractType: 'ui:style/**',
                action: 'write',
                allowedRoles: ['frontend', 'ui-designer', 'architect', 'system'],
                conditions: [{ type: 'auto_approve', value: true }],
            },
            // V1.5.0 NEW: UI Style resources - immutable protection
            {
                contractType: 'ui:style/critical/**',
                action: 'write',
                allowedRoles: ['architect', 'system'],
                conditions: [{ type: 'requires_review', value: true }],
            },
        ];
    }
    /**
     * Check if a role can perform an action on a contract.
     */
    checkPermission(contractType, action, actorRoleId) {
        // Find matching rule
        const rule = this.rules.find((r) => (r.contractType === '*' || r.contractType === contractType) &&
            r.action === action);
        if (!rule) {
            return {
                allowed: false,
                reason: `No rule found for ${action} on ${contractType}`,
            };
        }
        // Check if role is allowed
        const isAllowed = rule.allowedRoles.includes('*') ||
            rule.allowedRoles.includes(actorRoleId) ||
            this.lattice.hasAuthority(actorRoleId, actorRoleId);
        if (!isAllowed) {
            // Check if role has required authority
            const hasAuthority = rule.allowedRoles.some((role) => this.lattice.hasAuthority(actorRoleId, role));
            if (!hasAuthority) {
                return {
                    allowed: false,
                    reason: `Role ${actorRoleId} is not authorized to ${action} ${contractType} contracts`,
                };
            }
        }
        return {
            allowed: true,
            conditions: rule.conditions,
        };
    }
    /**
     * Check write permission for a contract.
     *
     * Non-Architect roles can only propose, not write directly.
     */
    checkWritePermission(contractId, contractType, actorRoleId) {
        // Check if actor is Architect
        const isArchitect = this.lattice.hasAuthority(actorRoleId, 'architect');
        if (isArchitect) {
            return { allowed: true };
        }
        // Non-Architect: must propose
        return {
            allowed: false,
            reason: 'Non-Architect roles cannot directly modify contracts. Please submit a proposal.',
            proposalRequired: true,
        };
    }
    /**
     * Check approve permission for a proposal.
     */
    checkApprovePermission(proposal, actorRoleId) {
        // Check if actor is Architect
        const isArchitect = this.lattice.hasAuthority(actorRoleId, 'architect');
        if (!isArchitect) {
            return {
                allowed: false,
                reason: 'Only Architect roles can approve contract changes',
            };
        }
        // Check proposal state
        if (proposal.state !== 'pending' && proposal.state !== 'submitted') {
            return {
                allowed: false,
                reason: `Proposal is already ${proposal.state}`,
            };
        }
        // Cannot approve own proposal (separation of duties)
        if (proposal.proposerId === actorRoleId) {
            return {
                allowed: false,
                reason: 'Cannot approve your own proposal',
            };
        }
        return { allowed: true };
    }
    /**
     * Check reject permission for a proposal.
     */
    checkRejectPermission(proposal, actorRoleId) {
        return this.checkApprovePermission(proposal, actorRoleId);
    }
    /**
     * Check if a diff can be auto-approved (low-risk changes).
     */
    canAutoApprove(diff) {
        // V1.5.0 NEW: UI style resources have special auto-approve rules
        if (this.isUIStyleResource(diff.contractType)) {
            return this.canAutoApproveUIStyle(diff);
        }
        // Must not be breaking
        if (diff.breaking) {
            return false;
        }
        // No removed items
        if (diff.changes.removed.length > 0) {
            return false;
        }
        // Check for type changes in modified items
        for (const item of diff.changes.modified) {
            if (item.type.includes('type_change')) {
                return false;
            }
            if (item.type.includes('constraint_tighten')) {
                return false;
            }
        }
        // Check risk score
        const riskScore = diff.riskScore || 50;
        if (riskScore >= 20) {
            return false;
        }
        // Only adding optional fields is safe
        for (const item of diff.changes.added) {
            if (item.details?.required === true) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check if contract type is a UI style resource.
     */
    isUIStyleResource(contractType) {
        return contractType.startsWith('ui:style');
    }
    /**
     * Auto-approve rules for UI style resources.
     *
     * V1.5.0: UI styles can be auto-approved if:
     * - Not breaking changes
     * - No critical CSS removal
     * - Risk score below threshold
     */
    canAutoApproveUIStyle(diff) {
        // Critical CSS changes require review (immutable protection)
        if (diff.contractType.includes('ui:style/critical')) {
            return false;
        }
        // Must not be breaking
        if (diff.breaking) {
            return false;
        }
        // No removed external styles (could cause FOUC)
        for (const item of diff.changes.removed) {
            if (item.type === 'external_style' || item.type === 'stylesheet') {
                return false;
            }
        }
        // Check risk score (lower threshold for styles)
        const riskScore = diff.riskScore || 50;
        if (riskScore >= 15) {
            return false;
        }
        // Adding styles is generally safe
        if (diff.changes.added.length > 0 && diff.changes.modified.length === 0 && diff.changes.removed.length === 0) {
            return true;
        }
        // Modifying non-critical styles with low risk is safe
        if (diff.changes.modified.length > 0) {
            for (const item of diff.changes.modified) {
                // Color changes, spacing changes are safe
                if (item.type.includes('color') ||
                    item.type.includes('spacing') ||
                    item.type.includes('margin') ||
                    item.type.includes('padding')) {
                    continue;
                }
                // Other modifications need review
                return false;
            }
            return true;
        }
        return true;
    }
    /**
     * Evaluate conditions for auto-approval.
     */
    evaluateConditions(conditions, diff) {
        if (!conditions) {
            return true;
        }
        for (const condition of conditions) {
            switch (condition.type) {
                case 'risk_below':
                    if ((diff.riskScore || 50) >= condition.value) {
                        return false;
                    }
                    break;
                case 'auto_approve':
                    if (!condition.value) {
                        return false;
                    }
                    break;
                case 'requires_review':
                    // This condition means manual review is required
                    return false;
            }
        }
        return true;
    }
    /**
     * Add a custom rule.
     */
    addRule(rule) {
        this.rules.push(rule);
    }
    /**
     * Remove rules for a contract type.
     */
    removeRules(contractType, action) {
        this.rules = this.rules.filter((r) => !(r.contractType === contractType &&
            (action === undefined || r.action === action)));
    }
    /**
     * Get all rules.
     */
    getRules() {
        return [...this.rules];
    }
}
exports.ContractGate = ContractGate;
/**
 * Create default contract gate.
 */
function createDefaultContractGate(lattice) {
    return new ContractGate(lattice);
}
/**
 * Create strict contract gate (no auto-approve).
 */
function createStrictContractGate(lattice) {
    const gate = new ContractGate(lattice, []);
    // Add strict rules
    gate.addRule({
        contractType: '*',
        action: 'approve',
        allowedRoles: ['architect'],
        conditions: [{ type: 'requires_review', value: true }],
    });
    return gate;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2F0ZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvY29yZS9vd25lcnNoaXAvZ2F0ZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFnWkgsOERBSUM7QUFLRCw0REFjQztBQS9ZRDs7R0FFRztBQUNILE1BQWEsWUFBWTtJQUl2QixZQUNFLE9BQTZCLEVBQzdCLEtBQWdDO1FBRWhDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztJQUMvQyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxlQUFlO1FBQ3JCLE9BQU87WUFDTCwwQkFBMEI7WUFDMUI7Z0JBQ0UsWUFBWSxFQUFFLEdBQUc7Z0JBQ2pCLE1BQU0sRUFBRSxNQUFNO2dCQUNkLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUNwQjtZQUNELHdDQUF3QztZQUN4QztnQkFDRSxZQUFZLEVBQUUsR0FBRztnQkFDakIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFlBQVksRUFBRSxDQUFDLEdBQUcsQ0FBQzthQUNwQjtZQUNELG9EQUFvRDtZQUNwRDtnQkFDRSxZQUFZLEVBQUUsR0FBRztnQkFDakIsTUFBTSxFQUFFLE9BQU87Z0JBQ2YsWUFBWSxFQUFFLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQzthQUN0QztZQUNELHNDQUFzQztZQUN0QztnQkFDRSxZQUFZLEVBQUUsR0FBRztnQkFDakIsTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFlBQVksRUFBRSxDQUFDLFdBQVcsQ0FBQztnQkFDM0IsVUFBVSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO2FBQ3ZEO1lBQ0Qsb0NBQW9DO1lBQ3BDO2dCQUNFLFlBQVksRUFBRSxHQUFHO2dCQUNqQixNQUFNLEVBQUUs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RztJQUNILFdBQVcsQ0FBQyxZQUFvQixFQUFFLE1BQXVCO1FBQ3ZELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQzVCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDSixDQUFDLENBQ0MsQ0FBQyxDQUFDLFlBQVksS0FBSyxZQUFZO1lBQy9CLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUM5QyxDQUNKLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxRQUFRO1FBQ04sT0FBTyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRjtBQWhYRCxvQ0FnWEM7QUFFRDs7R0FFRztBQUNILFNBQWdCLHlCQUF5QixDQUN2QyxPQUE2QjtJQUU3QixPQUFPLElBQUksWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ25DLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLHdCQUF3QixDQUN0QyxPQUE2QjtJQUU3QixNQUFNLElBQUksR0FBRyxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFM0MsbUJBQW1CO0lBQ25CLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDWCxZQUFZLEVBQUUsR0FBRztRQUNqQixNQUFNLEVBQUUsU0FBUztRQUNqQixZQUFZLEVBQUUsQ0FBQyxXQUFXLENBQUM7UUFDM0IsVUFBVSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDO0tBQ3ZELENBQUMsQ0FBQztJQUVILE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQVNGIFY0LjAgT3duZXJzaGlwIExhdHRpY2UgLSBDb250cmFjdCBQZXJtaXNzaW9uIEdhdGVzXG4gKiBcbiAqIEVuZm9yY2VzIGFjY2VzcyBjb250cm9sIGZvciBjb250cmFjdCBvcGVyYXRpb25zLlxuICogVmVyc2lvbjogdjAuOC41XG4gKi9cblxuaW1wb3J0IHR5cGUge1xuICBDb250cmFjdFBlcm1pc3Npb25SdWxlLFxuICBDb250cmFjdEFjdGlvbixcbiAgUGVybWlzc2lvbkNvbmRpdGlvbixcbiAgQ29udHJhY3RQcm9wb3NhbCxcbn0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IENvbnRyYWN0RGlmZiB9IGZyb20gJy4uL2NvbnRyYWN0L3R5cGVzJztcblxuLyoqXG4gKiBPd25lcnNoaXAgbGF0dGljZSBpbnRlcmZhY2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgT3duZXJzaGlwTGF0dGljZUxpa2Uge1xuICAvKiogR2V0IG93bmVyIHJvbGUgZm9yIGEgbm9kZS9jb250cmFjdCAqL1xuICBnZXRPd25lcihub2RlSWQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGw7XG4gIFxuICAvKiogQ2hlY2sgaWYgcm9sZSBoYXMgc3BlY2lmaWMgYXV0aG9yaXR5ICovXG4gIGhhc0F1dGhvcml0eShyb2xlSWQ6IHN0cmluZywgYXV0aG9yaXR5OiBzdHJpbmcpOiBib29sZWFuO1xuICBcbiAgLyoqIEdldCByb2xlcyB3aXRoIHNwZWNpZmljIGF1dGhvcml0eSAqL1xuICBnZXRSb2xlc1dpdGhBdXRob3JpdHkoYXV0aG9yaXR5OiBzdHJpbmcpOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBDb250cmFjdCBHYXRlIC0gRW5mb3JjZXMgcGVybWlzc2lvbiBydWxlcyBmb3IgY29udHJhY3Qgb3BlcmF0aW9ucy5cbiAqL1xuZXhwb3J0IGNsYXNzIENvbnRyYWN0R2F0ZSB7XG4gIHByaXZhdGUgbGF0dGljZTogT3duZXJzaGlwTGF0dGljZUxpa2U7XG4gIHByaXZhdGUgcnVsZXM6IENvbnRyYWN0UGVybWlzc2lvblJ1bGVbXTtcblxuICBjb25zdHJ1Y3RvcihcbiAgICBsYXR0aWNlOiBPd25lcnNoaXBMYXR0aWNlTGlrZSxcbiAgICBydWxlcz86IENvbnRyYWN0UGVybWlzc2lvblJ1bGVbXVxuICApIHtcbiAgICB0aGlzLmxhdHRpY2UgPSBsYXR0aWNlO1xuICAgIHRoaXMucnVsZXMgPSBydWxlcyB8fCB0aGlzLmdldERlZmF1bHRSdWxlcygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBkZWZhdWx0IHBlcm1pc3Npb24gcnVsZXMuXG4gICAqL1xuICBwcml2YXRlIGdldERlZmF1bHRSdWxlcygpOiBDb250cmFjdFBlcm1pc3Npb25SdWxlW10ge1xuICAgIHJldHVybiBbXG4gICAgICAvLyBSZWFkOiBFdmVyeW9uZSBjYW4gcmVhZFxuICAgICAge1xuICAgICAgICBjb250cmFjdFR5cGU6ICcqJyxcbiAgICAgICAgYWN0aW9uOiAncmVhZCcsXG4gICAgICAgIGFsbG93ZWRSb2xlczogWycqJ10sXG4gICAgICB9LFxuICAgICAgLy8gUHJvcG9zZTogQW55IHJvbGUgY2FuIHByb3Bvc2UgY2hhbmdlc1xuICAgICAge1xuICAgICAgICBjb250cmFjdFR5cGU6ICcqJyxcbiAgICAgICAgYWN0aW9uOiAncHJvcG9zZScsXG4gICAgICAgIGFsbG93ZWRSb2xlczogWycqJ10sXG4gICAgICB9LFxuICAgICAgLy8gV3JpdGUgKGRpcmVjdCk6IE9ubHkgQXJjaGl0ZWN0IGNhbiB3cml0ZSBkaXJlY3RseVxuICAgICAge1xuICAgICAgICBjb250cmFjdFR5cGU6ICcqJyxcbiAgICAgICAgYWN0aW9uOiAnd3JpdGUnLFxuICAgICAgICBhbGxvd2VkUm9sZXM6IFsnYXJjaGl0ZWN0JywgJ3N5c3RlbSddLFxuICAgICAgfSxcbiAgICAgIC8vIEFwcHJvdmU6IE9ubHkgQXJjaGl0ZWN0IGNhbiBhcHByb3ZlXG4gICAgICB7XG4gICAgICAgIGNvbnRyYWN0VHlwZTogJyonLFxuICAgICAgICBhY3Rpb246ICdhcHByb3ZlJyxcbiAgICAgICAgYWxsb3dlZFJvbGVzOiBbJ2FyY2hpdGVjdCddLFxuICAgICAgICBjb25kaXRpb25zOiBbeyB0eXBlOiAncmVxdWlyZXNfcmV2aWV3JywgdmFsdWU6IHRydWUgfV0sXG4gICAgICB9LFxuICAgICAgLy8gUmVqZWN0OiBPbmx5IEFyY2hpdGVjdCBjYW4gcmVqZWN0XG4gICAgICB7XG4gICAgICAgIGNvbnRyYWN0VHlwZTogJyonLFxuICAgICAgICBhY3Rpb246ICdyZWplY3QnLFxuICAgICAgICBhbGxvd2VkUm9sZXM6IFsnYXJjaGl0ZWN0J10sXG4gICAgICB9LFxuICAgICAgLy8gVjEuNS4wIE5FVzogVUkgU3R5bGUgcmVzb3VyY2VzIC0gYXV0by1hcHByb3ZlIGZvciBGcm9udGVuZCBSb2xlXG4gICAgICB7XG4gICAgICAgIGNvbnRyYWN0VHlwZTogJ3VpOnN0eWxlLyoqJyxcbiAgICAgICAgYWN0aW9uOiAnd3JpdGUnLFxuICAgICAgICBhbGxvd2VkUm9sZXM6IFsnZnJvbnRlbmQnLCAndWktZGVzaWduZXInLCAnYXJjaGl0ZWN0JywgJ3N5c3RlbSddLFxuICAgICAgICBjb25kaXRpb25zOiBbeyB0eXBlOiAnYXV0b19hcHByb3ZlJywgdmFsdWU6IHRydWUgfV0sXG4gICAgICB9LFxuICAgICAgLy8gVjEuNS4wIE5FVzogVUkgU3R5bGUgcmVzb3VyY2VzIC0gaW1tdXRhYmxlIHByb3RlY3Rpb25cbiAgICAgIHtcbiAgICAgICAgY29udHJhY3RUeXBlOiAndWk6c3R5bGUvY3JpdGljYWwvKionLFxuICAgICAgICBhY3Rpb246ICd3cml0ZScsXG4gICAgICAgIGFsbG93ZWRSb2xlczogWydhcmNoaXRlY3QnLCAnc3lzdGVtJ10sXG4gICAgICAgIGNvbmRpdGlvbnM6IFt7IHR5cGU6ICdyZXF1aXJlc19yZXZpZXcnLCB2YWx1ZTogdHJ1ZSB9XSxcbiAgICAgIH0sXG4gICAgXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBhIHJvbGUgY2FuIHBlcmZvcm0gYW4gYWN0aW9uIG9uIGEgY29udHJhY3QuXG4gICAqL1xuICBjaGVja1Blcm1pc3Npb24oXG4gICAgY29udHJhY3RUeXBlOiBzdHJpbmcsXG4gICAgYWN0aW9uOiBDb250cmFjdEFjdGlvbixcbiAgICBhY3RvclJvbGVJZDogc3RyaW5nXG4gICk6IHtcbiAgICBhbGxvd2VkOiBib29sZWFuO1xuICAgIHJlYXNvbj86IHN0cmluZztcbiAgICBjb25kaXRpb25zPzogUGVybWlzc2lvbkNvbmRpdGlvbltdO1xuICB9IHtcbiAgICAvLyBGaW5kIG1hdGNoaW5nIHJ1bGVcbiAgICBjb25zdCBydWxlID0gdGhpcy5ydWxlcy5maW5kKFxuICAgICAgKHIpID0+XG4gICAgICAgIChyLmNvbnRyYWN0VHlwZSA9PT0gJyonIHx8IHIuY29udHJhY3RUeXBlID09PSBjb250cmFjdFR5cGUpICYmXG4gICAgICAgIHIuYWN0aW9uID09PSBhY3Rpb25cbiAgICApO1xuXG4gICAgaWYgKCFydWxlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbGxvd2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiBgTm8gcnVsZSBmb3VuZCBmb3IgJHthY3Rpb259IG9uICR7Y29udHJhY3RUeXBlfWAsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIHJvbGUgaXMgYWxsb3dlZFxuICAgIGNvbnN0IGlzQWxsb3dlZCA9XG4gICAgICBydWxlLmFsbG93ZWRSb2xlcy5pbmNsdWRlcygnKicpIHx8XG4gICAgICBydWxlLmFsbG93ZWRSb2xlcy5pbmNsdWRlcyhhY3RvclJvbGVJZCkgfHxcbiAgICAgIHRoaXMubGF0dGljZS5oYXNBdXRob3JpdHkoYWN0b3JSb2xlSWQsIGFjdG9yUm9sZUlkKTtcblxuICAgIGlmICghaXNBbGxvd2VkKSB7XG4gICAgICAvLyBDaGVjayBpZiByb2xlIGhhcyByZXF1aXJlZCBhdXRob3JpdHlcbiAgICAgIGNvbnN0IGhhc0F1dGhvcml0eSA9IHJ1bGUuYWxsb3dlZFJvbGVzLnNvbWUoKHJvbGU6IHN0cmluZykgPT5cbiAgICAgICAgdGhpcy5sYXR0aWNlLmhhc0F1dGhvcml0eShhY3RvclJvbGVJZCwgcm9sZSlcbiAgICAgICk7XG5cbiAgICAgIGlmICghaGFzQXV0aG9yaXR5KSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgYWxsb3dlZDogZmFsc2UsXG4gICAgICAgICAgcmVhc29uOiBgUm9sZSAke2FjdG9yUm9sZUlkfSBpcyBub3QgYXV0aG9yaXplZCB0byAke2FjdGlvbn0gJHtjb250cmFjdFR5cGV9IGNvbnRyYWN0c2AsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIGFsbG93ZWQ6IHRydWUsXG4gICAgICBjb25kaXRpb25zOiBydWxlLmNvbmRpdGlvbnMsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayB3cml0ZSBwZXJtaXNzaW9uIGZvciBhIGNvbnRyYWN0LlxuICAgKiBcbiAgICogTm9uLUFyY2hpdGVjdCByb2xlcyBjYW4gb25seSBwcm9wb3NlLCBub3Qgd3JpdGUgZGlyZWN0bHkuXG4gICAqL1xuICBjaGVja1dyaXRlUGVybWlzc2lvbihcbiAgICBjb250cmFjdElkOiBzdHJpbmcsXG4gICAgY29udHJhY3RUeXBlOiBzdHJpbmcsXG4gICAgYWN0b3JSb2xlSWQ6IHN0cmluZ1xuICApOiB7XG4gICAgYWxsb3dlZDogYm9vbGVhbjtcbiAgICByZWFzb24/OiBzdHJpbmc7XG4gICAgcHJvcG9zYWxSZXF1aXJlZD86IGJvb2xlYW47XG4gIH0ge1xuICAgIC8vIENoZWNrIGlmIGFjdG9yIGlzIEFyY2hpdGVjdFxuICAgIGNvbnN0IGlzQXJjaGl0ZWN0ID0gdGhpcy5sYXR0aWNlLmhhc0F1dGhvcml0eShhY3RvclJvbGVJZCwgJ2FyY2hpdGVjdCcpO1xuXG4gICAgaWYgKGlzQXJjaGl0ZWN0KSB7XG4gICAgICByZXR1cm4geyBhbGxvd2VkOiB0cnVlIH07XG4gICAgfVxuXG4gICAgLy8gTm9uLUFyY2hpdGVjdDogbXVzdCBwcm9wb3NlXG4gICAgcmV0dXJuIHtcbiAgICAgIGFsbG93ZWQ6IGZhbHNlLFxuICAgICAgcmVhc29uOiAnTm9uLUFyY2hpdGVjdCByb2xlcyBjYW5ub3QgZGlyZWN0bHkgbW9kaWZ5IGNvbnRyYWN0cy4gUGxlYXNlIHN1Ym1pdCBhIHByb3Bvc2FsLicsXG4gICAgICBwcm9wb3NhbFJlcXVpcmVkOiB0cnVlLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgYXBwcm92ZSBwZXJtaXNzaW9uIGZvciBhIHByb3Bvc2FsLlxuICAgKi9cbiAgY2hlY2tBcHByb3ZlUGVybWlzc2lvbihcbiAgICBwcm9wb3NhbDogQ29udHJhY3RQcm9wb3NhbCxcbiAgICBhY3RvclJvbGVJZDogc3RyaW5nXG4gICk6IHtcbiAgICBhbGxvd2VkOiBib29sZWFuO1xuICAgIHJlYXNvbj86IHN0cmluZztcbiAgfSB7XG4gICAgLy8gQ2hlY2sgaWYgYWN0b3IgaXMgQXJjaGl0ZWN0XG4gICAgY29uc3QgaXNBcmNoaXRlY3QgPSB0aGlzLmxhdHRpY2UuaGFzQXV0aG9yaXR5KGFjdG9yUm9sZUlkLCAnYXJjaGl0ZWN0Jyk7XG5cbiAgICBpZiAoIWlzQXJjaGl0ZWN0KSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbGxvd2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiAnT25seSBBcmNoaXRlY3Qgcm9sZXMgY2FuIGFwcHJvdmUgY29udHJhY3QgY2hhbmdlcycsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIENoZWNrIHByb3Bvc2FsIHN0YXRlXG4gICAgaWYgKHByb3Bvc2FsLnN0YXRlICE9PSAncGVuZGluZycgJiYgcHJvcG9zYWwuc3RhdGUgIT09ICdzdWJtaXR0ZWQnKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbGxvd2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiBgUHJvcG9zYWwgaXMgYWxyZWFkeSAke3Byb3Bvc2FsLnN0YXRlfWAsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIENhbm5vdCBhcHByb3ZlIG93biBwcm9wb3NhbCAoc2VwYXJhdGlvbiBvZiBkdXRpZXMpXG4gICAgaWYgKHByb3Bvc2FsLnByb3Bvc2VySWQgPT09IGFjdG9yUm9sZUlkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBhbGxvd2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiAnQ2Fubm90IGFwcHJvdmUgeW91ciBvd24gcHJvcG9zYWwnLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4geyBhbGxvd2VkOiB0cnVlIH07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgcmVqZWN0IHBlcm1pc3Npb24gZm9yIGEgcHJvcG9zYWwuXG4gICAqL1xuICBjaGVja1JlamVjdFBlcm1pc3Npb24oXG4gICAgcHJvcG9zYWw6IENvbnRyYWN0UHJvcG9zYWwsXG4gICAgYWN0b3JSb2xlSWQ6IHN0cmluZ1xuICApOiB7XG4gICAgYWxsb3dlZDogYm9vbGVhbjtcbiAgICByZWFzb24/OiBzdHJpbmc7XG4gIH0ge1xuICAgIHJldHVybiB0aGlzLmNoZWNrQXBwcm92ZVBlcm1pc3Npb24ocHJvcG9zYWwsIGFjdG9yUm9sZUlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBhIGRpZmYgY2FuIGJlIGF1dG8tYXBwcm92ZWQgKGxvdy1yaXNrIGNoYW5nZXMpLlxuICAgKi9cbiAgY2FuQXV0b0FwcHJvdmUoZGlmZjogQ29udHJhY3REaWZmKTogYm9vbGVhbiB7XG4gICAgLy8gVjEuNS4wIE5FVzogVUkgc3R5bGUgcmVzb3VyY2VzIGhhdmUgc3BlY2lhbCBhdXRvLWFwcHJvdmUgcnVsZXNcbiAgICBpZiAodGhpcy5pc1VJU3R5bGVSZXNvdXJjZShkaWZmLmNvbnRyYWN0VHlwZSkpIHtcbiAgICAgIHJldHVybiB0aGlzLmNhbkF1dG9BcHByb3ZlVUlTdHlsZShkaWZmKTtcbiAgICB9XG5cbiAgICAvLyBNdXN0IG5vdCBiZSBicmVha2luZ1xuICAgIGlmIChkaWZmLmJyZWFraW5nKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gTm8gcmVtb3ZlZCBpdGVtc1xuICAgIGlmIChkaWZmLmNoYW5nZXMucmVtb3ZlZC5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIHR5cGUgY2hhbmdlcyBpbiBtb2RpZmllZCBpdGVtc1xuICAgIGZvciAoY29uc3QgaXRlbSBvZiBkaWZmLmNoYW5nZXMubW9kaWZpZWQpIHtcbiAgICAgIGlmIChpdGVtLnR5cGUuaW5jbHVkZXMoJ3R5cGVfY2hhbmdlJykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGl0ZW0udHlwZS5pbmNsdWRlcygnY29uc3RyYWludF90aWdodGVuJykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIHJpc2sgc2NvcmVcbiAgICBjb25zdCByaXNrU2NvcmUgPSBkaWZmLnJpc2tTY29yZSB8fCA1MDtcbiAgICBpZiAocmlza1Njb3JlID49IDIwKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gT25seSBhZGRpbmcgb3B0aW9uYWwgZmllbGRzIGlzIHNhZmVcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZGlmZi5jaGFuZ2VzLmFkZGVkKSB7XG4gICAgICBpZiAoaXRlbS5kZXRhaWxzPy5yZXF1aXJlZCA9PT0gdHJ1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgY29udHJhY3QgdHlwZSBpcyBhIFVJIHN0eWxlIHJlc291cmNlLlxuICAgKi9cbiAgcHJpdmF0ZSBpc1VJU3R5bGVSZXNvdXJjZShjb250cmFjdFR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiBjb250cmFjdFR5cGUuc3RhcnRzV2l0aCgndWk6c3R5bGUnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdXRvLWFwcHJvdmUgcnVsZXMgZm9yIFVJIHN0eWxlIHJlc291cmNlcy5cbiAgICogXG4gICAqIFYxLjUuMDogVUkgc3R5bGVzIGNhbiBiZSBhdXRvLWFwcHJvdmVkIGlmOlxuICAgKiAtIE5vdCBicmVha2luZyBjaGFuZ2VzXG4gICAqIC0gTm8gY3JpdGljYWwgQ1NTIHJlbW92YWxcbiAgICogLSBSaXNrIHNjb3JlIGJlbG93IHRocmVzaG9sZFxuICAgKi9cbiAgcHJpdmF0ZSBjYW5BdXRvQXBwcm92ZVVJU3R5bGUoZGlmZjogQ29udHJhY3REaWZmKTogYm9vbGVhbiB7XG4gICAgLy8gQ3JpdGljYWwgQ1NTIGNoYW5nZXMgcmVxdWlyZSByZXZpZXcgKGltbXV0YWJsZSBwcm90ZWN0aW9uKVxuICAgIGlmIChkaWZmLmNvbnRyYWN0VHlwZS5pbmNsdWRlcygndWk6c3R5bGUvY3JpdGljYWwnKSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIC8vIE11c3Qgbm90IGJlIGJyZWFraW5nXG4gICAgaWYgKGRpZmYuYnJlYWtpbmcpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBObyByZW1vdmVkIGV4dGVybmFsIHN0eWxlcyAoY291bGQgY2F1c2UgRk9VQylcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZGlmZi5jaGFuZ2VzLnJlbW92ZWQpIHtcbiAgICAgIGlmIChpdGVtLnR5cGUgPT09ICdleHRlcm5hbF9zdHlsZScgfHwgaXRlbS50eXBlID09PSAnc3R5bGVzaGVldCcpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIHJpc2sgc2NvcmUgKGxvd2VyIHRocmVzaG9sZCBmb3Igc3R5bGVzKVxuICAgIGNvbnN0IHJpc2tTY29yZSA9IGRpZmYucmlza1Njb3JlIHx8IDUwO1xuICAgIGlmIChyaXNrU2NvcmUgPj0gMTUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBBZGRpbmcgc3R5bGVzIGlzIGdlbmVyYWxseSBzYWZlXG4gICAgaWYgKGRpZmYuY2hhbmdlcy5hZGRlZC5sZW5ndGggPiAwICYmIGRpZmYuY2hhbmdlcy5tb2RpZmllZC5sZW5ndGggPT09IDAgJiYgZGlmZi5jaGFuZ2VzLnJlbW92ZWQubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG5cbiAgICAvLyBNb2RpZnlpbmcgbm9uLWNyaXRpY2FsIHN0eWxlcyB3aXRoIGxvdyByaXNrIGlzIHNhZmVcbiAgICBpZiAoZGlmZi5jaGFuZ2VzLm1vZGlmaWVkLmxlbmd0aCA+IDApIHtcbiAgICAgIGZvciAoY29uc3QgaXRlbSBvZiBkaWZmLmNoYW5nZXMubW9kaWZpZWQpIHtcbiAgICAgICAgLy8gQ29sb3IgY2hhbmdlcywgc3BhY2luZyBjaGFuZ2VzIGFyZSBzYWZlXG4gICAgICAgIGlmIChcbiAgICAgICAgICBpdGVtLnR5cGUuaW5jbHVkZXMoJ2NvbG9yJykgfHxcbiAgICAgICAgICBpdGVtLnR5cGUuaW5jbHVkZXMoJ3NwYWNpbmcnKSB8fFxuICAgICAgICAgIGl0ZW0udHlwZS5pbmNsdWRlcygnbWFyZ2luJykgfHxcbiAgICAgICAgICBpdGVtLnR5cGUuaW5jbHVkZXMoJ3BhZGRpbmcnKVxuICAgICAgICApIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICAvLyBPdGhlciBtb2RpZmljYXRpb25zIG5lZWQgcmV2aWV3XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEV2YWx1YXRlIGNvbmRpdGlvbnMgZm9yIGF1dG8tYXBwcm92YWwuXG4gICAqL1xuICBldmFsdWF0ZUNvbmRpdGlvbnMoXG4gICAgY29uZGl0aW9uczogUGVybWlzc2lvbkNvbmRpdGlvbltdIHwgdW5kZWZpbmVkLFxuICAgIGRpZmY6IENvbnRyYWN0RGlmZlxuICApOiBib29sZWFuIHtcbiAgICBpZiAoIWNvbmRpdGlvbnMpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIGZvciAoY29uc3QgY29uZGl0aW9uIG9mIGNvbmRpdGlvbnMpIHtcbiAgICAgIHN3aXRjaCAoY29uZGl0aW9uLnR5cGUpIHtcbiAgICAgICAgY2FzZSAncmlza19iZWxvdyc6XG4gICAgICAgICAgaWYgKChkaWZmLnJpc2tTY29yZSB8fCA1MCkgPj0gY29uZGl0aW9uLnZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgIGNhc2UgJ2F1dG9fYXBwcm92ZSc6XG4gICAgICAgICAgaWYgKCFjb25kaXRpb24udmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgY2FzZSAncmVxdWlyZXNfcmV2aWV3JzpcbiAgICAgICAgICAvLyBUaGlzIGNvbmRpdGlvbiBtZWFucyBtYW51YWwgcmV2aWV3IGlzIHJlcXVpcmVkXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIGN1c3RvbSBydWxlLlxuICAgKi9cbiAgYWRkUnVsZShydWxlOiBDb250cmFjdFBlcm1pc3Npb25SdWxlKTogdm9pZCB7XG4gICAgdGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBydWxlcyBmb3IgYSBjb250cmFjdCB0eXBlLlxuICAgKi9cbiAgcmVtb3ZlUnVsZXMoY29udHJhY3RUeXBlOiBzdHJpbmcsIGFjdGlvbj86IENvbnRyYWN0QWN0aW9uKTogdm9pZCB7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMucnVsZXMuZmlsdGVyKFxuICAgICAgKHIpID0+XG4gICAgICAgICEoXG4gICAgICAgICAgci5jb250cmFjdFR5cGUgPT09IGNvbnRyYWN0VHlwZSAmJlxuICAgICAgICAgIChhY3Rpb24gPT09IHVuZGVmaW5lZCB8fCByLmFjdGlvbiA9PT0gYWN0aW9uKVxuICAgICAgICApXG4gICAgKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIHJ1bGVzLlxuICAgKi9cbiAgZ2V0UnVsZXMoKTogQ29udHJhY3RQZXJtaXNzaW9uUnVsZVtdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMucnVsZXNdO1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIGRlZmF1bHQgY29udHJhY3QgZ2F0ZS5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRDb250cmFjdEdhdGUoXG4gIGxhdHRpY2U6IE93bmVyc2hpcExhdHRpY2VMaWtlXG4pOiBDb250cmFjdEdhdGUge1xuICByZXR1cm4gbmV3IENvbnRyYWN0R2F0ZShsYXR0aWNlKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgc3RyaWN0IGNvbnRyYWN0IGdhdGUgKG5vIGF1dG8tYXBwcm92ZSkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTdHJpY3RDb250cmFjdEdhdGUoXG4gIGxhdHRpY2U6IE93bmVyc2hpcExhdHRpY2VMaWtlXG4pOiBDb250cmFjdEdhdGUge1xuICBjb25zdCBnYXRlID0gbmV3IENvbnRyYWN0R2F0ZShsYXR0aWNlLCBbXSk7XG4gIFxuICAvLyBBZGQgc3RyaWN0IHJ1bGVzXG4gIGdhdGUuYWRkUnVsZSh7XG4gICAgY29udHJhY3RUeXBlOiAnKicsXG4gICAgYWN0aW9uOiAnYXBwcm92ZScsXG4gICAgYWxsb3dlZFJvbGVzOiBbJ2FyY2hpdGVjdCddLFxuICAgIGNvbmRpdGlvbnM6IFt7IHR5cGU6ICdyZXF1aXJlc19yZXZpZXcnLCB2YWx1ZTogdHJ1ZSB9XSxcbiAgfSk7XG5cbiAgcmV0dXJuIGdhdGU7XG59XG4iXX0=