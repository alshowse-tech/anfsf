"use strict";
/**
 * ASF V4.0 DoD Guard - Auto-Approve Rules
 *
 * Defines conditions for automatic contract approval.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutoApproveManager = exports.DEFAULT_AUTO_APPROVE_RULES = void 0;
exports.canAutoApprove = canAutoApprove;
exports.getAutoApproveReport = getAutoApproveReport;
exports.createAutoApproveRule = createAutoApproveRule;
exports.getDefaultAutoApproveManager = getDefaultAutoApproveManager;
exports.resetDefaultAutoApproveManager = resetDefaultAutoApproveManager;
const diff_openapi_1 = require("../contract/diff-openapi");
const diff_dbschema_1 = require("../contract/diff-dbschema");
/**
 * Default auto-approve rules.
 */
exports.DEFAULT_AUTO_APPROVE_RULES = [
    {
        contractType: 'OpenAPI',
        conditions: {
            onlyAddOptionalFields: true,
            noTypeChanges: true,
            noConstraintTighten: true,
            riskScoreBelow: 20,
        },
        autoApprove: true,
    },
    {
        contractType: 'DBSchema',
        conditions: {
            onlyAddOptionalFields: true,
            noTypeChanges: true,
            noConstraintTighten: true,
            riskScoreBelow: 15,
        },
        autoApprove: true,
    },
    {
        contractType: 'UIProps',
        conditions: {
            onlyAddFields: true,
            noRemovedFields: true,
            riskScoreBelow: 15,
        },
        autoApprove: true,
    },
    {
        contractType: 'EventSchema',
        conditions: {
            onlyAddOptionalFields: true,
            noRemovedFields: true,
            riskScoreBelow: 20,
        },
        autoApprove: true,
    },
];
/**
 * Check if a diff meets auto-approve conditions.
 *
 * @param diff - Contract diff to evaluate
 * @param rules - Auto-approve rules (default: DEFAULT_AUTO_APPROVE_RULES)
 * @returns Whether the diff can be auto-approved
 */
function canAutoApprove(diff, rules = exports.DEFAULT_AUTO_APPROVE_RULES) {
    // Find matching rule
    const rule = rules.find((r) => r.contractType === diff.contractType || r.contractType === '*');
    if (!rule || !rule.autoApprove) {
        return false;
    }
    // Check contract-type specific rules
    switch (diff.contractType) {
        case 'OpenAPI':
            return (0, diff_openapi_1.canAutoApproveOpenAPI)(diff);
        case 'DBSchema':
            return (0, diff_dbschema_1.canAutoApproveDBSchema)(diff);
    }
    // Generic checks for other contract types
    return evaluateGenericAutoApprove(diff, rule);
}
/**
 * Evaluate generic auto-approve conditions.
 */
function evaluateGenericAutoApprove(diff, rule) {
    const { conditions } = rule;
    // Check risk score threshold
    if (conditions.riskScoreBelow !== undefined) {
        if ((diff.riskScore || 50) >= conditions.riskScoreBelow) {
            return false;
        }
    }
    // Check for breaking changes
    if (diff.breaking) {
        return false;
    }
    // Check no removed items
    if (conditions.noRemovedFields && diff.changes.removed.length > 0) {
        return false;
    }
    // Check only adding optional fields
    if (conditions.onlyAddOptionalFields) {
        for (const item of diff.changes.added) {
            if (item.details?.required === true) {
                return false;
            }
        }
    }
    // Check no type changes
    if (conditions.noTypeChanges) {
        for (const item of diff.changes.modified) {
            if (item.type.includes('type_change')) {
                return false;
            }
        }
    }
    // Check no constraint tightening
    if (conditions.noConstraintTighten) {
        for (const item of diff.changes.modified) {
            if (item.type.includes('constraint')) {
                return false;
            }
        }
    }
    return true;
}
/**
 * Get auto-approve eligibility report.
 */
function getAutoApproveReport(diff, rules = exports.DEFAULT_AUTO_APPROVE_RULES) {
    const failedConditions = [];
    // Find matching rule
    const rule = rules.find((r) => r.contractType === diff.contractType || r.contractType === '*');
    if (!rule) {
        return {
            eligible: false,
            reason: `No auto-approve rule for ${diff.contractType}`,
            failedConditions,
        };
    }
    if (!rule.autoApprove) {
        return {
            eligible: false,
            reason: `Auto-approve disabled for ${diff.contractType}`,
            failedConditions,
            rule,
        };
    }
    // Check breaking
    if (diff.breaking) {
        failedConditions.push('Breaking changes not allowed');
    }
    // Check risk score
    if (rule.conditions.riskScoreBelow !== undefined) {
        const riskScore = diff.riskScore || 50;
        if (riskScore >= rule.conditions.riskScoreBelow) {
            failedConditions.push(`Risk score ${riskScore} >= threshold ${rule.conditions.riskScoreBelow}`);
        }
    }
    // Check removed items
    if (rule.conditions.noRemovedFields && diff.changes.removed.length > 0) {
        failedConditions.push(`Removed ${diff.changes.removed.length} items (not allowed)`);
    }
    // Check type changes
    if (rule.conditions.noTypeChanges) {
        const typeChanges = diff.changes.modified.filter((item) => item.type.includes('type_change'));
        if (typeChanges.length > 0) {
            failedConditions.push(`Type changes detected (${typeChanges.length} items)`);
        }
    }
    // Check constraint tightening
    if (rule.conditions.noConstraintTighten) {
        const constraintChanges = diff.changes.modified.filter((item) => item.type.includes('constraint'));
        if (constraintChanges.length > 0) {
            failedConditions.push(`Constraint changes detected (${constraintChanges.length} items)`);
        }
    }
    // Check optional fields only
    if (rule.conditions.onlyAddOptionalFields) {
        const requiredAdds = diff.changes.added.filter((item) => item.details?.required === true);
        if (requiredAdds.length > 0) {
            failedConditions.push(`Added ${requiredAdds.length} required fields (must be optional)`);
        }
    }
    return {
        eligible: failedConditions.length === 0,
        reason: failedConditions.length === 0 ? 'All conditions met' : undefined,
        failedConditions,
        rule,
    };
}
/**
 * Create custom auto-approve rule.
 */
function createAutoApproveRule(params) {
    const { contractType, maxRiskScore = 20, allowBreaking = false, allowTypeChanges = false, allowRemovedFields = false, } = params;
    return {
        contractType,
        conditions: {
            riskScoreBelow: maxRiskScore,
            noTypeChanges: !allowTypeChanges,
            noConstraintTighten: true,
            onlyAddOptionalFields: true,
        },
        autoApprove: true,
    };
}
/**
 * Auto-approve manager.
 */
class AutoApproveManager {
    constructor(rules = []) {
        this.rules = rules.length > 0 ? rules : exports.DEFAULT_AUTO_APPROVE_RULES;
    }
    /**
     * Check if a diff can be auto-approved.
     */
    check(diff) {
        return canAutoApprove(diff, this.rules);
    }
    /**
     * Get detailed eligibility report.
     */
    getReport(diff) {
        return getAutoApproveReport(diff, this.rules);
    }
    /**
     * Add a custom rule.
     */
    addRule(rule) {
        // Remove existing rule for same contract type
        this.rules = this.rules.filter((r) => r.contractType !== rule.contractType);
        this.rules.push(rule);
    }
    /**
     * Remove rule for contract type.
     */
    removeRule(contractType) {
        this.rules = this.rules.filter((r) => r.contractType !== contractType);
    }
    /**
     * Enable/disable auto-approve for contract type.
     */
    setEnabled(contractType, enabled) {
        const rule = this.rules.find((r) => r.contractType === contractType);
        if (rule) {
            rule.autoApprove = enabled;
        }
    }
    /**
     * Get all rules.
     */
    getRules() {
        return [...this.rules];
    }
    /**
     * Get stats on auto-approve eligibility.
     */
    getStats() {
        return {
            totalRules: this.rules.length,
            enabledRules: this.rules.filter((r) => r.autoApprove).length,
            contractTypes: [...new Set(this.rules.map((r) => r.contractType))],
        };
    }
}
exports.AutoApproveManager = AutoApproveManager;
/**
 * Singleton auto-approve manager.
 */
let defaultManager = null;
function getDefaultAutoApproveManager() {
    if (!defaultManager) {
        defaultManager = new AutoApproveManager();
    }
    return defaultManager;
}
function resetDefaultAutoApproveManager() {
    defaultManager = null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0by1hcHByb3ZlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvZG9kL2F1dG8tYXBwcm92ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQTJESCx3Q0F3QkM7QUE2REQsb0RBaUdDO0FBS0Qsc0RBeUJDO0FBa0ZELG9FQUtDO0FBRUQsd0VBRUM7QUFyV0QsMkRBQWlFO0FBQ2pFLDZEQUFtRTtBQUVuRTs7R0FFRztBQUNVLFFBQUEsMEJBQTBCLEdBQXNCO0lBQzNEO1FBQ0UsWUFBWSxFQUFFLFNBQVM7UUFDdkIsVUFBVSxFQUFFO1lBQ1YscUJBQXFCLEVBQUUsSUFBSTtZQUMzQixhQUFhLEVBQUUsSUFBSTtZQUNuQixtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLGNBQWMsRUFBRSxFQUFFO1NBQ25CO1FBQ0QsV0FBVyxFQUFFLElBQUk7S0FDbEI7SUFDRDtRQUNFLFlBQVksRUFBRSxVQUFVO1FBQ3hCLFVBQVUsRUFBRTtZQUNWLHFCQUFxQixFQUFFLElBQUk7WUFDM0IsYUFBYSxFQUFFLElBQUk7WUFDbkIsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixjQUFjLEVBQUUsRUFBRTtTQUNuQjtRQUNELFdBQVcsRUFBRSxJQUFJO0tBQ2xCO0lBQ0Q7UUFDRSxZQUFZLEVBQUUsU0FBUztRQUN2QixVQUFVLEVBQUU7WUFDVixhQUFhLEVBQUUsSUFBSTtZQUNuQixlQUFlLEVBQUUsSUFBSTtZQUNyQixjQUFjLEVBQUUsRUFBRTtTQUNuQjtRQUNELFdBQVcsRUFBRSxJQUFJO0tBQ2xCO0lBQ0Q7UUFDRSxZQUFZLEVBQUUsYUFBYTtRQUMzQixVQUFVLEVBQUU7WUFDVixxQkFBcUIsRUFBRSxJQUFJO1lBQzNCLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLGNBQWMsRUFBRSxFQUFFO1NBQ25CO1FBQ0QsV0FBVyxFQUFFLElBQUk7S0FDbEI7Q0FDRixDQUFDO0FBRUY7Ozs7OztHQU1HO0FBQ0gs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QUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsUUFBUTtRQUtOLE9BQU87WUFDTCxVQUFVLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNO1lBQzdCLFlBQVksRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU07WUFDNUQsYUFBYSxFQUFFLENBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7U0FDbkUsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXRFRCxnREFzRUM7QUFFRDs7R0FFRztBQUNILElBQUksY0FBYyxHQUE4QixJQUFJLENBQUM7QUFFckQsU0FBZ0IsNEJBQTRCO0lBQzFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNwQixjQUFjLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFDRCxPQUFPLGNBQWMsQ0FBQztBQUN4QixDQUFDO0FBRUQsU0FBZ0IsOEJBQThCO0lBQzVDLGNBQWMsR0FBRyxJQUFJLENBQUM7QUFDeEIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQVNGIFY0LjAgRG9EIEd1YXJkIC0gQXV0by1BcHByb3ZlIFJ1bGVzXG4gKiBcbiAqIERlZmluZXMgY29uZGl0aW9ucyBmb3IgYXV0b21hdGljIGNvbnRyYWN0IGFwcHJvdmFsLlxuICogVmVyc2lvbjogdjAuOC41XG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb250cmFjdERpZmYgfSBmcm9tICcuLi9jb250cmFjdC90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IEF1dG9BcHByb3ZlUnVsZSB9IGZyb20gJy4uL293bmVyc2hpcC90eXBlcyc7XG5pbXBvcnQgdHlwZSB7IERpZmZJdGVtIH0gZnJvbSAnLi4vY29udHJhY3QvdHlwZXMnO1xuaW1wb3J0IHsgY2FuQXV0b0FwcHJvdmVPcGVuQVBJIH0gZnJvbSAnLi4vY29udHJhY3QvZGlmZi1vcGVuYXBpJztcbmltcG9ydCB7IGNhbkF1dG9BcHByb3ZlREJTY2hlbWEgfSBmcm9tICcuLi9jb250cmFjdC9kaWZmLWRic2NoZW1hJztcblxuLyoqXG4gKiBEZWZhdWx0IGF1dG8tYXBwcm92ZSBydWxlcy5cbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfQVVUT19BUFBST1ZFX1JVTEVTOiBBdXRvQXBwcm92ZVJ1bGVbXSA9IFtcbiAge1xuICAgIGNvbnRyYWN0VHlwZTogJ09wZW5BUEknLFxuICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgIG9ubHlBZGRPcHRpb25hbEZpZWxkczogdHJ1ZSxcbiAgICAgIG5vVHlwZUNoYW5nZXM6IHRydWUsXG4gICAgICBub0NvbnN0cmFpbnRUaWdodGVuOiB0cnVlLFxuICAgICAgcmlza1Njb3JlQmVsb3c6IDIwLFxuICAgIH0sXG4gICAgYXV0b0FwcHJvdmU6IHRydWUsXG4gIH0sXG4gIHtcbiAgICBjb250cmFjdFR5cGU6ICdEQlNjaGVtYScsXG4gICAgY29uZGl0aW9uczoge1xuICAgICAgb25seUFkZE9wdGlvbmFsRmllbGRzOiB0cnVlLFxuICAgICAgbm9UeXBlQ2hhbmdlczogdHJ1ZSxcbiAgICAgIG5vQ29uc3RyYWludFRpZ2h0ZW46IHRydWUsXG4gICAgICByaXNrU2NvcmVCZWxvdzogMTUsXG4gICAgfSxcbiAgICBhdXRvQXBwcm92ZTogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGNvbnRyYWN0VHlwZTogJ1VJUHJvcHMnLFxuICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgIG9ubHlBZGRGaWVsZHM6IHRydWUsXG4gICAgICBub1JlbW92ZWRGaWVsZHM6IHRydWUsXG4gICAgICByaXNrU2NvcmVCZWxvdzogMTUsXG4gICAgfSxcbiAgICBhdXRvQXBwcm92ZTogdHJ1ZSxcbiAgfSxcbiAge1xuICAgIGNvbnRyYWN0VHlwZTogJ0V2ZW50U2NoZW1hJyxcbiAgICBjb25kaXRpb25zOiB7XG4gICAgICBvbmx5QWRkT3B0aW9uYWxGaWVsZHM6IHRydWUsXG4gICAgICBub1JlbW92ZWRGaWVsZHM6IHRydWUsXG4gICAgICByaXNrU2NvcmVCZWxvdzogMjAsXG4gICAgfSxcbiAgICBhdXRvQXBwcm92ZTogdHJ1ZSxcbiAgfSxcbl07XG5cbi8qKlxuICogQ2hlY2sgaWYgYSBkaWZmIG1lZXRzIGF1dG8tYXBwcm92ZSBjb25kaXRpb25zLlxuICogXG4gKiBAcGFyYW0gZGlmZiAtIENvbnRyYWN0IGRpZmYgdG8gZXZhbHVhdGVcbiAqIEBwYXJhbSBydWxlcyAtIEF1dG8tYXBwcm92ZSBydWxlcyAoZGVmYXVsdDogREVGQVVMVF9BVVRPX0FQUFJPVkVfUlVMRVMpXG4gKiBAcmV0dXJucyBXaGV0aGVyIHRoZSBkaWZmIGNhbiBiZSBhdXRvLWFwcHJvdmVkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW5BdXRvQXBwcm92ZShcbiAgZGlmZjogQ29udHJhY3REaWZmLFxuICBydWxlczogQXV0b0FwcHJvdmVSdWxlW10gPSBERUZBVUxUX0FVVE9fQVBQUk9WRV9SVUxFU1xuKTogYm9vbGVhbiB7XG4gIC8vIEZpbmQgbWF0Y2hpbmcgcnVsZVxuICBjb25zdCBydWxlID0gcnVsZXMuZmluZChcbiAgICAocikgPT4gci5jb250cmFjdFR5cGUgPT09IGRpZmYuY29udHJhY3RUeXBlIHx8IHIuY29udHJhY3RUeXBlID09PSAnKidcbiAgKTtcblxuICBpZiAoIXJ1bGUgfHwgIXJ1bGUuYXV0b0FwcHJvdmUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBDaGVjayBjb250cmFjdC10eXBlIHNwZWNpZmljIHJ1bGVzXG4gIHN3aXRjaCAoZGlmZi5jb250cmFjdFR5cGUpIHtcbiAgICBjYXNlICdPcGVuQVBJJzpcbiAgICAgIHJldHVybiBjYW5BdXRvQXBwcm92ZU9wZW5BUEkoZGlmZiBhcyBhbnkpO1xuXG4gICAgY2FzZSAnREJTY2hlbWEnOlxuICAgICAgcmV0dXJuIGNhbkF1dG9BcHByb3ZlREJTY2hlbWEoZGlmZiBhcyBhbnkpO1xuICB9XG5cbiAgLy8gR2VuZXJpYyBjaGVja3MgZm9yIG90aGVyIGNvbnRyYWN0IHR5cGVzXG4gIHJldHVybiBldmFsdWF0ZUdlbmVyaWNBdXRvQXBwcm92ZShkaWZmLCBydWxlKTtcbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSBnZW5lcmljIGF1dG8tYXBwcm92ZSBjb25kaXRpb25zLlxuICovXG5mdW5jdGlvbiBldmFsdWF0ZUdlbmVyaWNBdXRvQXBwcm92ZShcbiAgZGlmZjogQ29udHJhY3REaWZmLFxuICBydWxlOiBBdXRvQXBwcm92ZVJ1bGVcbik6IGJvb2xlYW4ge1xuICBjb25zdCB7IGNvbmRpdGlvbnMgfSA9IHJ1bGU7XG5cbiAgLy8gQ2hlY2sgcmlzayBzY29yZSB0aHJlc2hvbGRcbiAgaWYgKGNvbmRpdGlvbnMucmlza1Njb3JlQmVsb3cgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICgoZGlmZi5yaXNrU2NvcmUgfHwgNTApID49IGNvbmRpdGlvbnMucmlza1Njb3JlQmVsb3cpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cblxuICAvLyBDaGVjayBmb3IgYnJlYWtpbmcgY2hhbmdlc1xuICBpZiAoZGlmZi5icmVha2luZykge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIC8vIENoZWNrIG5vIHJlbW92ZWQgaXRlbXNcbiAgaWYgKGNvbmRpdGlvbnMubm9SZW1vdmVkRmllbGRzICYmIGRpZmYuY2hhbmdlcy5yZW1vdmVkLmxlbmd0aCA+IDApIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBDaGVjayBvbmx5IGFkZGluZyBvcHRpb25hbCBmaWVsZHNcbiAgaWYgKGNvbmRpdGlvbnMub25seUFkZE9wdGlvbmFsRmllbGRzKSB7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGRpZmYuY2hhbmdlcy5hZGRlZCkge1xuICAgICAgaWYgKGl0ZW0uZGV0YWlscz8ucmVxdWlyZWQgPT09IHRydWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIG5vIHR5cGUgY2hhbmdlc1xuICBpZiAoY29uZGl0aW9ucy5ub1R5cGVDaGFuZ2VzKSB7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGRpZmYuY2hhbmdlcy5tb2RpZmllZCkge1xuICAgICAgaWYgKGl0ZW0udHlwZS5pbmNsdWRlcygndHlwZV9jaGFuZ2UnKSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgbm8gY29uc3RyYWludCB0aWdodGVuaW5nXG4gIGlmIChjb25kaXRpb25zLm5vQ29uc3RyYWludFRpZ2h0ZW4pIHtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgZGlmZi5jaGFuZ2VzLm1vZGlmaWVkKSB7XG4gICAgICBpZiAoaXRlbS50eXBlLmluY2x1ZGVzKCdjb25zdHJhaW50JykpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufVxuXG4vKipcbiAqIEdldCBhdXRvLWFwcHJvdmUgZWxpZ2liaWxpdHkgcmVwb3J0LlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXV0b0FwcHJvdmVSZXBvcnQoXG4gIGRpZmY6IENvbnRyYWN0RGlmZixcbiAgcnVsZXM6IEF1dG9BcHByb3ZlUnVsZVtdID0gREVGQVVMVF9BVVRPX0FQUFJPVkVfUlVMRVNcbik6IHtcbiAgZWxpZ2libGU6IGJvb2xlYW47XG4gIHJlYXNvbj86IHN0cmluZztcbiAgZmFpbGVkQ29uZGl0aW9uczogc3RyaW5nW107XG4gIHJ1bGU/OiBBdXRvQXBwcm92ZVJ1bGU7XG59IHtcbiAgY29uc3QgZmFpbGVkQ29uZGl0aW9uczogc3RyaW5nW10gPSBbXTtcblxuICAvLyBGaW5kIG1hdGNoaW5nIHJ1bGVcbiAgY29uc3QgcnVsZSA9IHJ1bGVzLmZpbmQoXG4gICAgKHIpID0+IHIuY29udHJhY3RUeXBlID09PSBkaWZmLmNvbnRyYWN0VHlwZSB8fCByLmNvbnRyYWN0VHlwZSA9PT0gJyonXG4gICk7XG5cbiAgaWYgKCFydWxlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVsaWdpYmxlOiBmYWxzZSxcbiAgICAgIHJlYXNvbjogYE5vIGF1dG8tYXBwcm92ZSBydWxlIGZvciAke2RpZmYuY29udHJhY3RUeXBlfWAsXG4gICAgICBmYWlsZWRDb25kaXRpb25zLFxuICAgIH07XG4gIH1cblxuICBpZiAoIXJ1bGUuYXV0b0FwcHJvdmUpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZWxpZ2libGU6IGZhbHNlLFxuICAgICAgcmVhc29uOiBgQXV0by1hcHByb3ZlIGRpc2FibGVkIGZvciAke2RpZmYuY29udHJhY3RUeXBlfWAsXG4gICAgICBmYWlsZWRDb25kaXRpb25zLFxuICAgICAgcnVsZSxcbiAgICB9O1xuICB9XG5cbiAgLy8gQ2hlY2sgYnJlYWtpbmdcbiAgaWYgKGRpZmYuYnJlYWtpbmcpIHtcbiAgICBmYWlsZWRDb25kaXRpb25zLnB1c2goJ0JyZWFraW5nIGNoYW5nZXMgbm90IGFsbG93ZWQnKTtcbiAgfVxuXG4gIC8vIENoZWNrIHJpc2sgc2NvcmVcbiAgaWYgKHJ1bGUuY29uZGl0aW9ucy5yaXNrU2NvcmVCZWxvdyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3Qgcmlza1Njb3JlID0gZGlmZi5yaXNrU2NvcmUgfHwgNTA7XG4gICAgaWYgKHJpc2tTY29yZSA+PSBydWxlLmNvbmRpdGlvbnMucmlza1Njb3JlQmVsb3cpIHtcbiAgICAgIGZhaWxlZENvbmRpdGlvbnMucHVzaChcbiAgICAgICAgYFJpc2sgc2NvcmUgJHtyaXNrU2NvcmV9ID49IHRocmVzaG9sZCAke3J1bGUuY29uZGl0aW9ucy5yaXNrU2NvcmVCZWxvd31gXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIHJlbW92ZWQgaXRlbXNcbiAgaWYgKHJ1bGUuY29uZGl0aW9ucy5ub1JlbW92ZWRGaWVsZHMgJiYgZGlmZi5jaGFuZ2VzLnJlbW92ZWQubGVuZ3RoID4gMCkge1xuICAgIGZhaWxlZENvbmRpdGlvbnMucHVzaChcbiAgICAgIGBSZW1vdmVkICR7ZGlmZi5jaGFuZ2VzLnJlbW92ZWQubGVuZ3RofSBpdGVtcyAobm90IGFsbG93ZWQpYFxuICAgICk7XG4gIH1cblxuICAvLyBDaGVjayB0eXBlIGNoYW5nZXNcbiAgaWYgKHJ1bGUuY29uZGl0aW9ucy5ub1R5cGVDaGFuZ2VzKSB7XG4gICAgY29uc3QgdHlwZUNoYW5nZXMgPSBkaWZmLmNoYW5nZXMubW9kaWZpZWQuZmlsdGVyKChpdGVtOiBEaWZmSXRlbSkgPT5cbiAgICAgIGl0ZW0udHlwZS5pbmNsdWRlcygndHlwZV9jaGFuZ2UnKVxuICAgICk7XG4gICAgaWYgKHR5cGVDaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZhaWxlZENvbmRpdGlvbnMucHVzaChcbiAgICAgICAgYFR5cGUgY2hhbmdlcyBkZXRlY3RlZCAoJHt0eXBlQ2hhbmdlcy5sZW5ndGh9IGl0ZW1zKWBcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgY29uc3RyYWludCB0aWdodGVuaW5nXG4gIGlmIChydWxlLmNvbmRpdGlvbnMubm9Db25zdHJhaW50VGlnaHRlbikge1xuICAgIGNvbnN0IGNvbnN0cmFpbnRDaGFuZ2VzID0gZGlmZi5jaGFuZ2VzLm1vZGlmaWVkLmZpbHRlcigoaXRlbTogRGlmZkl0ZW0pID0+XG4gICAgICBpdGVtLnR5cGUuaW5jbHVkZXMoJ2NvbnN0cmFpbnQnKVxuICAgICk7XG4gICAgaWYgKGNvbnN0cmFpbnRDaGFuZ2VzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZhaWxlZENvbmRpdGlvbnMucHVzaChcbiAgICAgICAgYENvbnN0cmFpbnQgY2hhbmdlcyBkZXRlY3RlZCAoJHtjb25zdHJhaW50Q2hhbmdlcy5sZW5ndGh9IGl0ZW1zKWBcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLy8gQ2hlY2sgb3B0aW9uYWwgZmllbGRzIG9ubHlcbiAgaWYgKHJ1bGUuY29uZGl0aW9ucy5vbmx5QWRkT3B0aW9uYWxGaWVsZHMpIHtcbiAgICBjb25zdCByZXF1aXJlZEFkZHMgPSBkaWZmLmNoYW5nZXMuYWRkZWQuZmlsdGVyKFxuICAgICAgKGl0ZW06IERpZmZJdGVtKSA9PiBpdGVtLmRldGFpbHM/LnJlcXVpcmVkID09PSB0cnVlXG4gICAgKTtcbiAgICBpZiAocmVxdWlyZWRBZGRzLmxlbmd0aCA+IDApIHtcbiAgICAgIGZhaWxlZENvbmRpdGlvbnMucHVzaChcbiAgICAgICAgYEFkZGVkICR7cmVxdWlyZWRBZGRzLmxlbmd0aH0gcmVxdWlyZWQgZmllbGRzIChtdXN0IGJlIG9wdGlvbmFsKWBcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBlbGlnaWJsZTogZmFpbGVkQ29uZGl0aW9ucy5sZW5ndGggPT09IDAsXG4gICAgcmVhc29uOiBmYWlsZWRDb25kaXRpb25zLmxlbmd0aCA9PT0gMCA/ICdBbGwgY29uZGl0aW9ucyBtZXQnIDogdW5kZWZpbmVkLFxuICAgIGZhaWxlZENvbmRpdGlvbnMsXG4gICAgcnVsZSxcbiAgfTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgY3VzdG9tIGF1dG8tYXBwcm92ZSBydWxlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlQXV0b0FwcHJvdmVSdWxlKHBhcmFtczoge1xuICBjb250cmFjdFR5cGU6IHN0cmluZztcbiAgbWF4Umlza1Njb3JlPzogbnVtYmVyO1xuICBhbGxvd0JyZWFraW5nPzogYm9vbGVhbjtcbiAgYWxsb3dUeXBlQ2hhbmdlcz86IGJvb2xlYW47XG4gIGFsbG93UmVtb3ZlZEZpZWxkcz86IGJvb2xlYW47XG59KTogQXV0b0FwcHJvdmVSdWxlIHtcbiAgY29uc3Qge1xuICAgIGNvbnRyYWN0VHlwZSxcbiAgICBtYXhSaXNrU2NvcmUgPSAyMCxcbiAgICBhbGxvd0JyZWFraW5nID0gZmFsc2UsXG4gICAgYWxsb3dUeXBlQ2hhbmdlcyA9IGZhbHNlLFxuICAgIGFsbG93UmVtb3ZlZEZpZWxkcyA9IGZhbHNlLFxuICB9ID0gcGFyYW1zO1xuXG4gIHJldHVybiB7XG4gICAgY29udHJhY3RUeXBlLFxuICAgIGNvbmRpdGlvbnM6IHtcbiAgICAgIHJpc2tTY29yZUJlbG93OiBtYXhSaXNrU2NvcmUsXG4gICAgICBub1R5cGVDaGFuZ2VzOiAhYWxsb3dUeXBlQ2hhbmdlcyxcbiAgICAgIG5vQ29uc3RyYWludFRpZ2h0ZW46IHRydWUsXG4gICAgICBvbmx5QWRkT3B0aW9uYWxGaWVsZHM6IHRydWUsXG4gICAgfSxcbiAgICBhdXRvQXBwcm92ZTogdHJ1ZSxcbiAgfTtcbn1cblxuLyoqXG4gKiBBdXRvLWFwcHJvdmUgbWFuYWdlci5cbiAqL1xuZXhwb3J0IGNsYXNzIEF1dG9BcHByb3ZlTWFuYWdlciB7XG4gIHByaXZhdGUgcnVsZXM6IEF1dG9BcHByb3ZlUnVsZVtdO1xuXG4gIGNvbnN0cnVjdG9yKHJ1bGVzOiBBdXRvQXBwcm92ZVJ1bGVbXSA9IFtdKSB7XG4gICAgdGhpcy5ydWxlcyA9IHJ1bGVzLmxlbmd0aCA+IDAgPyBydWxlcyA6IERFRkFVTFRfQVVUT19BUFBST1ZFX1JVTEVTO1xuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIGlmIGEgZGlmZiBjYW4gYmUgYXV0by1hcHByb3ZlZC5cbiAgICovXG4gIGNoZWNrKGRpZmY6IENvbnRyYWN0RGlmZik6IGJvb2xlYW4ge1xuICAgIHJldHVybiBjYW5BdXRvQXBwcm92ZShkaWZmLCB0aGlzLnJ1bGVzKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZGV0YWlsZWQgZWxpZ2liaWxpdHkgcmVwb3J0LlxuICAgKi9cbiAgZ2V0UmVwb3J0KGRpZmY6IENvbnRyYWN0RGlmZik6IFJldHVyblR5cGU8dHlwZW9mIGdldEF1dG9BcHByb3ZlUmVwb3J0PiB7XG4gICAgcmV0dXJuIGdldEF1dG9BcHByb3ZlUmVwb3J0KGRpZmYsIHRoaXMucnVsZXMpO1xuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBhIGN1c3RvbSBydWxlLlxuICAgKi9cbiAgYWRkUnVsZShydWxlOiBBdXRvQXBwcm92ZVJ1bGUpOiB2b2lkIHtcbiAgICAvLyBSZW1vdmUgZXhpc3RpbmcgcnVsZSBmb3Igc2FtZSBjb250cmFjdCB0eXBlXG4gICAgdGhpcy5ydWxlcyA9IHRoaXMucnVsZXMuZmlsdGVyKFxuICAgICAgKHIpID0+IHIuY29udHJhY3RUeXBlICE9PSBydWxlLmNvbnRyYWN0VHlwZVxuICAgICk7XG4gICAgdGhpcy5ydWxlcy5wdXNoKHJ1bGUpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBydWxlIGZvciBjb250cmFjdCB0eXBlLlxuICAgKi9cbiAgcmVtb3ZlUnVsZShjb250cmFjdFR5cGU6IHN0cmluZyk6IHZvaWQge1xuICAgIHRoaXMucnVsZXMgPSB0aGlzLnJ1bGVzLmZpbHRlcigocikgPT4gci5jb250cmFjdFR5cGUgIT09IGNvbnRyYWN0VHlwZSk7XG4gIH1cblxuICAvKipcbiAgICogRW5hYmxlL2Rpc2FibGUgYXV0by1hcHByb3ZlIGZvciBjb250cmFjdCB0eXBlLlxuICAgKi9cbiAgc2V0RW5hYmxlZChjb250cmFjdFR5cGU6IHN0cmluZywgZW5hYmxlZDogYm9vbGVhbik6IHZvaWQge1xuICAgIGNvbnN0IHJ1bGUgPSB0aGlzLnJ1bGVzLmZpbmQoKHIpID0+IHIuY29udHJhY3RUeXBlID09PSBjb250cmFjdFR5cGUpO1xuICAgIGlmIChydWxlKSB7XG4gICAgICBydWxlLmF1dG9BcHByb3ZlID0gZW5hYmxlZDtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogR2V0IGFsbCBydWxlcy5cbiAgICovXG4gIGdldFJ1bGVzKCk6IEF1dG9BcHByb3ZlUnVsZVtdIHtcbiAgICByZXR1cm4gWy4uLnRoaXMucnVsZXNdO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzdGF0cyBvbiBhdXRvLWFwcHJvdmUgZWxpZ2liaWxpdHkuXG4gICAqL1xuICBnZXRTdGF0cygpOiB7XG4gICAgdG90YWxSdWxlczogbnVtYmVyO1xuICAgIGVuYWJsZWRSdWxlczogbnVtYmVyO1xuICAgIGNvbnRyYWN0VHlwZXM6IHN0cmluZ1tdO1xuICB9IHtcbiAgICByZXR1cm4ge1xuICAgICAgdG90YWxSdWxlczogdGhpcy5ydWxlcy5sZW5ndGgsXG4gICAgICBlbmFibGVkUnVsZXM6IHRoaXMucnVsZXMuZmlsdGVyKChyKSA9PiByLmF1dG9BcHByb3ZlKS5sZW5ndGgsXG4gICAgICBjb250cmFjdFR5cGVzOiBbLi4ubmV3IFNldCh0aGlzLnJ1bGVzLm1hcCgocikgPT4gci5jb250cmFjdFR5cGUpKV0sXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFNpbmdsZXRvbiBhdXRvLWFwcHJvdmUgbWFuYWdlci5cbiAqL1xubGV0IGRlZmF1bHRNYW5hZ2VyOiBBdXRvQXBwcm92ZU1hbmFnZXIgfCBudWxsID0gbnVsbDtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldERlZmF1bHRBdXRvQXBwcm92ZU1hbmFnZXIoKTogQXV0b0FwcHJvdmVNYW5hZ2VyIHtcbiAgaWYgKCFkZWZhdWx0TWFuYWdlcikge1xuICAgIGRlZmF1bHRNYW5hZ2VyID0gbmV3IEF1dG9BcHByb3ZlTWFuYWdlcigpO1xuICB9XG4gIHJldHVybiBkZWZhdWx0TWFuYWdlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc2V0RGVmYXVsdEF1dG9BcHByb3ZlTWFuYWdlcigpOiB2b2lkIHtcbiAgZGVmYXVsdE1hbmFnZXIgPSBudWxsO1xufVxuIl19