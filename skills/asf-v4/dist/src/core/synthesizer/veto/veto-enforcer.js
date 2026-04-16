"use strict";
/**
 * ASF V4.0 Role Synthesizer - Veto Enforcer
 *
 * Hard/soft veto execution for governance constraints.
 * Version: v0.9.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_VETO_RULES = exports.VetoEnforcer = void 0;
exports.createDefaultVetoEnforcer = createDefaultVetoEnforcer;
/**
 * Veto Enforcer - Executes hard/soft veto rules.
 */
class VetoEnforcer {
    constructor(rules = []) {
        this.rules = rules;
    }
    /**
     * Enforce veto rules against a change set.
     */
    enforce(changes, approvals) {
        for (const rule of this.rules) {
            const matchedChanges = this.matchScope(changes, rule.scopeSelector);
            if (matchedChanges.length === 0) {
                continue;
            }
            if (rule.mode === 'hard') {
                const hasApproval = approvals.some((a) => a.authority === rule.authority &&
                    a.scope === rule.scopeSelector &&
                    a.status === 'approved');
                if (!hasApproval) {
                    return {
                        passed: false,
                        reason: `Hard veto: ${rule.authority} required for ${rule.scopeSelector}${rule.reason ? ` - ${rule.reason}` : ''}`,
                        requiredRole: rule.requiredApprovalRole,
                    };
                }
            }
            else if (rule.mode === 'soft') {
                return {
                    passed: true,
                    warnings: [
                        `Soft veto: ${rule.authority} recommends review for ${rule.scopeSelector}${rule.reason ? ` - ${rule.reason}` : ''}`,
                    ],
                    riskMultiplier: 1.5,
                    requireProbe: true,
                };
            }
        }
        return { passed: true };
    }
    /**
     * Match changes against a scope selector.
     */
    matchScope(changes, scopeSelector) {
        return changes.changes.filter((change) => {
            const resourceKey = `${change.resourceType}:${change.resourcePath}`;
            // Wildcard matching
            if (scopeSelector.endsWith('*')) {
                const prefix = scopeSelector.slice(0, -1);
                return resourceKey.startsWith(prefix);
            }
            // Exact matching
            return resourceKey === scopeSelector;
        });
    }
    /**
     * Add a veto rule.
     */
    addRule(rule) {
        this.rules.push(rule);
    }
    /**
     * Remove veto rules by authority.
     */
    removeRulesByAuthority(authority) {
        this.rules = this.rules.filter((r) => r.authority !== authority);
    }
    /**
     * Get all rules.
     */
    getRules() {
        return [...this.rules];
    }
    /**
     * Check if any hard veto exists for a scope.
     */
    hasHardVeto(scopeSelector) {
        return this.rules.some((r) => r.mode === 'hard' && this.scopeMatches(r.scopeSelector, scopeSelector));
    }
    /**
     * Check if any soft veto exists for a scope.
     */
    hasSoftVeto(scopeSelector) {
        return this.rules.some((r) => r.mode === 'soft' && this.scopeMatches(r.scopeSelector, scopeSelector));
    }
    /**
     * Check if two scope selectors match.
     */
    scopeMatches(selector, scope) {
        if (selector.endsWith('*')) {
            return scope.startsWith(selector.slice(0, -1));
        }
        return selector === scope;
    }
}
exports.VetoEnforcer = VetoEnforcer;
/**
 * Default veto rules for common scenarios.
 */
exports.DEFAULT_VETO_RULES = [
    {
        authority: 'architect',
        mode: 'hard',
        scopeSelector: 'contract:OpenAPI:*',
        reason: 'API contract changes require architect approval',
        requiredApprovalRole: 'architect',
    },
    {
        authority: 'architect',
        mode: 'hard',
        scopeSelector: 'contract:DBSchema:*',
        reason: 'Database schema changes require architect approval',
        requiredApprovalRole: 'architect',
    },
    {
        authority: 'security',
        mode: 'hard',
        scopeSelector: 'contract:*:auth*',
        reason: 'Auth-related changes require security approval',
        requiredApprovalRole: 'security-team',
    },
    {
        authority: 'backend-lead',
        mode: 'soft',
        scopeSelector: 'graph:Entity:*',
        reason: 'Entity changes should be reviewed by backend lead',
    },
];
/**
 * Create veto enforcer with default rules.
 */
function createDefaultVetoEnforcer() {
    return new VetoEnforcer(exports.DEFAULT_VETO_RULES);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmV0by1lbmZvcmNlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb3JlL3N5bnRoZXNpemVyL3ZldG8vdmV0by1lbmZvcmNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQTROSCw4REFFQztBQXBLRDs7R0FFRztBQUNILE1BQWEsWUFBWTtJQUd2QixZQUFZLFFBQW9CLEVBQUU7UUFDaEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTyxDQUNMLE9BQWtCLEVBQ2xCLFNBQTJCO1FBRTNCLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzlCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUVwRSxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2hDLFNBQVM7WUFDWCxDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO2dCQUN6QixNQUFNLFdBQVcsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUNoQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0osQ0FBQyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsU0FBUztvQkFDOUIsQ0FBQyxDQUFDLEtBQUssS0FBSyxJQUFJLENBQUMsYUFBYTtvQkFDOUIsQ0FBQyxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQzFCLENBQUM7Z0JBRUYsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO29CQUNqQixPQUFPO3dCQUNMLE1BQU0sRUFBRSxLQUFLO3dCQUNiLE1BQU0sRUFBRSxjQUFjLElBQUksQ0FBQyxTQUFTLGlCQUFpQixJQUFJLENBQUMsYUFBYSxHQUNyRSxJQUFJLENBQUMsTUFBTSxDQUFD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QUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFDRCxPQUFPLFFBQVEsS0FBSyxLQUFLLENBQUM7SUFDNUIsQ0FBQztDQUNGO0FBekhELG9DQXlIQztBQUVEOztHQUVHO0FBQ1UsUUFBQSxrQkFBa0IsR0FBZTtJQUM1QztRQUNFLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLElBQUksRUFBRSxNQUFNO1FBQ1osYUFBYSxFQUFFLG9CQUFvQjtRQUNuQyxNQUFNLEVBQUUsaURBQWlEO1FBQ3pELG9CQUFvQixFQUFFLFdBQVc7S0FDbEM7SUFDRDtRQUNFLFNBQVMsRUFBRSxXQUFXO1FBQ3RCLElBQUksRUFBRSxNQUFNO1FBQ1osYUFBYSxFQUFFLHFCQUFxQjtRQUNwQyxNQUFNLEVBQUUsb0RBQW9EO1FBQzVELG9CQUFvQixFQUFFLFdBQVc7S0FDbEM7SUFDRDtRQUNFLFNBQVMsRUFBRSxVQUFVO1FBQ3JCLElBQUksRUFBRSxNQUFNO1FBQ1osYUFBYSxFQUFFLGtCQUFrQjtRQUNqQyxNQUFNLEVBQUUsZ0RBQWdEO1FBQ3hELG9CQUFvQixFQUFFLGVBQWU7S0FDdEM7SUFDRDtRQUNFLFNBQVMsRUFBRSxjQUFjO1FBQ3pCLElBQUksRUFBRSxNQUFNO1FBQ1osYUFBYSxFQUFFLGdCQUFnQjtRQUMvQixNQUFNLEVBQUUsbURBQW1EO0tBQzVEO0NBQ0YsQ0FBQztBQUVGOztHQUVHO0FBQ0gsU0FBZ0IseUJBQXlCO0lBQ3ZDLE9BQU8sSUFBSSxZQUFZLENBQUMsMEJBQWtCLENBQUMsQ0FBQztBQUM5QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBSb2xlIFN5bnRoZXNpemVyIC0gVmV0byBFbmZvcmNlclxuICogXG4gKiBIYXJkL3NvZnQgdmV0byBleGVjdXRpb24gZm9yIGdvdmVybmFuY2UgY29uc3RyYWludHMuXG4gKiBWZXJzaW9uOiB2MC45LjBcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IENoYW5nZUF1dGhvcml0eSwgQXBwcm92YWxSZWNvcmQgfSBmcm9tICcuLi90eXBlcyc7XG5cbi8qKlxuICogVmV0byBydWxlIGRlZmluaXRpb24uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVmV0b1J1bGUge1xuICAvKiogQXV0aG9yaXR5IHJlcXVpcmVkIHRvIG92ZXJyaWRlICovXG4gIGF1dGhvcml0eTogQ2hhbmdlQXV0aG9yaXR5O1xuICBcbiAgLyoqIEhhcmQgdmV0byBibG9ja3MsIHNvZnQgdmV0byB3YXJucyAqL1xuICBtb2RlOiAnaGFyZCcgfCAnc29mdCc7XG4gIFxuICAvKiogU2NvcGUgc2VsZWN0b3IgKGUuZy4sIFwiY29udHJhY3Q6T3BlbkFQSToqXCIsIFwiZ3JhcGg6RW50aXR5Ok9yZGVyXCIpICovXG4gIHNjb3BlU2VsZWN0b3I6IHN0cmluZztcbiAgXG4gIC8qKiBPcHRpb25hbCByZWFzb24gZm9yIHRoZSB2ZXRvICovXG4gIHJlYXNvbj86IHN0cmluZztcbiAgXG4gIC8qKiBGb3IgaGFyZCB2ZXRvOiB3aGljaCByb2xlIG11c3QgYXBwcm92ZSAqL1xuICByZXF1aXJlZEFwcHJvdmFsUm9sZT86IHN0cmluZztcbn1cblxuLyoqXG4gKiBWZXRvIHJlc3VsdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBWZXRvUmVzdWx0IHtcbiAgLyoqIFdoZXRoZXIgdmV0byBjaGVjayBwYXNzZWQgKi9cbiAgcGFzc2VkOiBib29sZWFuO1xuICBcbiAgLyoqIFJlamVjdGlvbiByZWFzb24gKGlmIGZhaWxlZCkgKi9cbiAgcmVhc29uPzogc3RyaW5nO1xuICBcbiAgLyoqIFJlcXVpcmVkIHJvbGUgZm9yIGFwcHJvdmFsIChoYXJkIHZldG8pICovXG4gIHJlcXVpcmVkUm9sZT86IHN0cmluZztcbiAgXG4gIC8qKiBXYXJuaW5ncyAoc29mdCB2ZXRvKSAqL1xuICB3YXJuaW5ncz86IHN0cmluZ1tdO1xuICBcbiAgLyoqIFJpc2sgbXVsdGlwbGllciBmb3Igc29mdCB2ZXRvICovXG4gIHJpc2tNdWx0aXBsaWVyPzogbnVtYmVyO1xuICBcbiAgLyoqIFJlcXVpcmUgYWRkaXRpb25hbCBwcm9iZSAqL1xuICByZXF1aXJlUHJvYmU/OiBib29sZWFuO1xufVxuXG4vKipcbiAqIENoYW5nZSBzZXQgZm9yIHZldG8gbWF0Y2hpbmcuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhbmdlU2V0IHtcbiAgY2hhbmdlczogQXJyYXk8e1xuICAgIHJlc291cmNlVHlwZTogc3RyaW5nO1xuICAgIHJlc291cmNlUGF0aDogc3RyaW5nO1xuICAgIGFjdGlvbjogJ2NyZWF0ZScgfCAndXBkYXRlJyB8ICdkZWxldGUnO1xuICB9Pjtcbn1cblxuLyoqXG4gKiBWZXRvIEVuZm9yY2VyIC0gRXhlY3V0ZXMgaGFyZC9zb2Z0IHZldG8gcnVsZXMuXG4gKi9cbmV4cG9ydCBjbGFzcyBWZXRvRW5mb3JjZXIge1xuICBwcml2YXRlIHJ1bGVzOiBWZXRvUnVsZVtdO1xuXG4gIGNvbnN0cnVjdG9yKHJ1bGVzOiBWZXRvUnVsZVtdID0gW10pIHtcbiAgICB0aGlzLnJ1bGVzID0gcnVsZXM7XG4gIH1cblxuICAvKipcbiAgICogRW5mb3JjZSB2ZXRvIHJ1bGVzIGFnYWluc3QgYSBjaGFuZ2Ugc2V0LlxuICAgKi9cbiAgZW5mb3JjZShcbiAgICBjaGFuZ2VzOiBDaGFuZ2VTZXQsXG4gICAgYXBwcm92YWxzOiBBcHByb3ZhbFJlY29yZFtdXG4gICk6IFZldG9SZXN1bHQge1xuICAgIGZvciAoY29uc3QgcnVsZSBvZiB0aGlzLnJ1bGVzKSB7XG4gICAgICBjb25zdCBtYXRjaGVkQ2hhbmdlcyA9IHRoaXMubWF0Y2hTY29wZShjaGFuZ2VzLCBydWxlLnNjb3BlU2VsZWN0b3IpO1xuICAgICAgXG4gICAgICBpZiAobWF0Y2hlZENoYW5nZXMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBpZiAocnVsZS5tb2RlID09PSAnaGFyZCcpIHtcbiAgICAgICAgY29uc3QgaGFzQXBwcm92YWwgPSBhcHByb3ZhbHMuc29tZShcbiAgICAgICAgICAoYSkgPT5cbiAgICAgICAgICAgIGEuYXV0aG9yaXR5ID09PSBydWxlLmF1dGhvcml0eSAmJlxuICAgICAgICAgICAgYS5zY29wZSA9PT0gcnVsZS5zY29wZVNlbGVjdG9yICYmXG4gICAgICAgICAgICBhLnN0YXR1cyA9PT0gJ2FwcHJvdmVkJ1xuICAgICAgICApO1xuXG4gICAgICAgIGlmICghaGFzQXBwcm92YWwpIHtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgcGFzc2VkOiBmYWxzZSxcbiAgICAgICAgICAgIHJlYXNvbjogYEhhcmQgdmV0bzogJHtydWxlLmF1dGhvcml0eX0gcmVxdWlyZWQgZm9yICR7cnVsZS5zY29wZVNlbGVjdG9yfSR7XG4gICAgICAgICAgICAgIHJ1bGUucmVhc29uID8gYCAtICR7cnVsZS5yZWFzb259YCA6ICcnXG4gICAgICAgICAgICB9YCxcbiAgICAgICAgICAgIHJlcXVpcmVkUm9sZTogcnVsZS5yZXF1aXJlZEFwcHJvdmFsUm9sZSxcbiAgICAgICAgICB9O1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKHJ1bGUubW9kZSA9PT0gJ3NvZnQnKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGFzc2VkOiB0cnVlLFxuICAgICAgICAgIHdhcm5pbmdzOiBbXG4gICAgICAgICAgICBgU29mdCB2ZXRvOiAke3J1bGUuYXV0aG9yaXR5fSByZWNvbW1lbmRzIHJldmlldyBmb3IgJHtydWxlLnNjb3BlU2VsZWN0b3J9JHtcbiAgICAgICAgICAgICAgcnVsZS5yZWFzb24gPyBgIC0gJHtydWxlLnJlYXNvbn1gIDogJydcbiAgICAgICAgICAgIH1gLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgcmlza011bHRpcGxpZXI6IDEuNSxcbiAgICAgICAgICByZXF1aXJlUHJvYmU6IHRydWUsXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHsgcGFzc2VkOiB0cnVlIH07XG4gIH1cblxuICAvKipcbiAgICogTWF0Y2ggY2hhbmdlcyBhZ2FpbnN0IGEgc2NvcGUgc2VsZWN0b3IuXG4gICAqL1xuICBwcml2YXRlIG1hdGNoU2NvcGUoY2hhbmdlczogQ2hhbmdlU2V0LCBzY29wZVNlbGVjdG9yOiBzdHJpbmcpOiBDaGFuZ2VTZXRbJ2NoYW5nZXMnXSB7XG4gICAgcmV0dXJuIGNoYW5nZXMuY2hhbmdlcy5maWx0ZXIoKGNoYW5nZSkgPT4ge1xuICAgICAgY29uc3QgcmVzb3VyY2VLZXkgPSBgJHtjaGFuZ2UucmVzb3VyY2VUeXBlfToke2NoYW5nZS5yZXNvdXJjZVBhdGh9YDtcbiAgICAgIFxuICAgICAgLy8gV2lsZGNhcmQgbWF0Y2hpbmdcbiAgICAgIGlmIChzY29wZVNlbGVjdG9yLmVuZHNXaXRoKCcqJykpIHtcbiAgICAgICAgY29uc3QgcHJlZml4ID0gc2NvcGVTZWxlY3Rvci5zbGljZSgwLCAtMSk7XG4gICAgICAgIHJldHVybiByZXNvdXJjZUtleS5zdGFydHNXaXRoKHByZWZpeCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIEV4YWN0IG1hdGNoaW5nXG4gICAgICByZXR1cm4gcmVzb3VyY2VLZXkgPT09IHNjb3BlU2VsZWN0b3I7XG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogQWRkIGEgdmV0byBydWxlLlxuICAgKi9cbiAgYWRkUnVsZShydWxlOiBWZXRvUnVsZSk6IHZvaWQge1xuICAgIHRoaXMucnVsZXMucHVzaChydWxlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdmV0byBydWxlcyBieSBhdXRob3JpdHkuXG4gICAqL1xuICByZW1vdmVSdWxlc0J5QXV0aG9yaXR5KGF1dGhvcml0eTogQ2hhbmdlQXV0aG9yaXR5KTogdm9pZCB7XG4gICAgdGhpcy5ydWxlcyA9IHRoaXMucnVsZXMuZmlsdGVyKChyKSA9PiByLmF1dGhvcml0eSAhPT0gYXV0aG9yaXR5KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIHJ1bGVzLlxuICAgKi9cbiAgZ2V0UnVsZXMoKTogVmV0b1J1bGVbXSB7XG4gICAgcmV0dXJuIFsuLi50aGlzLnJ1bGVzXTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBhbnkgaGFyZCB2ZXRvIGV4aXN0cyBmb3IgYSBzY29wZS5cbiAgICovXG4gIGhhc0hhcmRWZXRvKHNjb3BlU2VsZWN0b3I6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiB0aGlzLnJ1bGVzLnNvbWUoXG4gICAgICAocikgPT4gci5tb2RlID09PSAnaGFyZCcgJiYgdGhpcy5zY29wZU1hdGNoZXMoci5zY29wZVNlbGVjdG9yLCBzY29wZVNlbGVjdG9yKVxuICAgICk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgYW55IHNvZnQgdmV0byBleGlzdHMgZm9yIGEgc2NvcGUuXG4gICAqL1xuICBoYXNTb2Z0VmV0byhzY29wZVNlbGVjdG9yOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gdGhpcy5ydWxlcy5zb21lKFxuICAgICAgKHIpID0+IHIubW9kZSA9PT0gJ3NvZnQnICYmIHRoaXMuc2NvcGVNYXRjaGVzKHIuc2NvcGVTZWxlY3Rvciwgc2NvcGVTZWxlY3RvcilcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIHR3byBzY29wZSBzZWxlY3RvcnMgbWF0Y2guXG4gICAqL1xuICBwcml2YXRlIHNjb3BlTWF0Y2hlcyhzZWxlY3Rvcjogc3RyaW5nLCBzY29wZTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgaWYgKHNlbGVjdG9yLmVuZHNXaXRoKCcqJykpIHtcbiAgICAgIHJldHVybiBzY29wZS5zdGFydHNXaXRoKHNlbGVjdG9yLnNsaWNlKDAsIC0xKSk7XG4gICAgfVxuICAgIHJldHVybiBzZWxlY3RvciA9PT0gc2NvcGU7XG4gIH1cbn1cblxuLyoqXG4gKiBEZWZhdWx0IHZldG8gcnVsZXMgZm9yIGNvbW1vbiBzY2VuYXJpb3MuXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1ZFVE9fUlVMRVM6IFZldG9SdWxlW10gPSBbXG4gIHtcbiAgICBhdXRob3JpdHk6ICdhcmNoaXRlY3QnLFxuICAgIG1vZGU6ICdoYXJkJyxcbiAgICBzY29wZVNlbGVjdG9yOiAnY29udHJhY3Q6T3BlbkFQSToqJyxcbiAgICByZWFzb246ICdBUEkgY29udHJhY3QgY2hhbmdlcyByZXF1aXJlIGFyY2hpdGVjdCBhcHByb3ZhbCcsXG4gICAgcmVxdWlyZWRBcHByb3ZhbFJvbGU6ICdhcmNoaXRlY3QnLFxuICB9LFxuICB7XG4gICAgYXV0aG9yaXR5OiAnYXJjaGl0ZWN0JyxcbiAgICBtb2RlOiAnaGFyZCcsXG4gICAgc2NvcGVTZWxlY3RvcjogJ2NvbnRyYWN0OkRCU2NoZW1hOionLFxuICAgIHJlYXNvbjogJ0RhdGFiYXNlIHNjaGVtYSBjaGFuZ2VzIHJlcXVpcmUgYXJjaGl0ZWN0IGFwcHJvdmFsJyxcbiAgICByZXF1aXJlZEFwcHJvdmFsUm9sZTogJ2FyY2hpdGVjdCcsXG4gIH0sXG4gIHtcbiAgICBhdXRob3JpdHk6ICdzZWN1cml0eScsXG4gICAgbW9kZTogJ2hhcmQnLFxuICAgIHNjb3BlU2VsZWN0b3I6ICdjb250cmFjdDoqOmF1dGgqJyxcbiAgICByZWFzb246ICdBdXRoLXJlbGF0ZWQgY2hhbmdlcyByZXF1aXJlIHNlY3VyaXR5IGFwcHJvdmFsJyxcbiAgICByZXF1aXJlZEFwcHJvdmFsUm9sZTogJ3NlY3VyaXR5LXRlYW0nLFxuICB9LFxuICB7XG4gICAgYXV0aG9yaXR5OiAnYmFja2VuZC1sZWFkJyxcbiAgICBtb2RlOiAnc29mdCcsXG4gICAgc2NvcGVTZWxlY3RvcjogJ2dyYXBoOkVudGl0eToqJyxcbiAgICByZWFzb246ICdFbnRpdHkgY2hhbmdlcyBzaG91bGQgYmUgcmV2aWV3ZWQgYnkgYmFja2VuZCBsZWFkJyxcbiAgfSxcbl07XG5cbi8qKlxuICogQ3JlYXRlIHZldG8gZW5mb3JjZXIgd2l0aCBkZWZhdWx0IHJ1bGVzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlRGVmYXVsdFZldG9FbmZvcmNlcigpOiBWZXRvRW5mb3JjZXIge1xuICByZXR1cm4gbmV3IFZldG9FbmZvcmNlcihERUZBVUxUX1ZFVE9fUlVMRVMpO1xufVxuIl19