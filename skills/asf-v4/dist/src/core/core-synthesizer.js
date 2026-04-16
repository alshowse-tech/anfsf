"use strict";
/**
 * Core Synthesizer - ANFSF 工业化增强模块核心
 *
 * 包含治理门禁、成本模型、安全优化等核心功能
 *
 * @module asf-v4/core/synthesizer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeOnlineOptimizer = exports.DEFAULT_VETO_RULES = exports.DefaultVetoEnforcer = exports.computeTotalReworkRisk = exports.predictReworkRisk = exports.canonicalizeResource = exports.validateProofs = exports.generateOwnershipProof = exports.computeContractCouplingBound = exports.determineOptimalRoleCount = exports.computeInterfaceCost = exports.computeEconomicsScore = exports.computeRoleCost = void 0;
exports.createDefaultVetoEnforcer = createDefaultVetoEnforcer;
exports.createSafeOptimizer = createSafeOptimizer;
exports.resolveOwnershipConflict = resolveOwnershipConflict;
exports.generateConflictReport = generateConflictReport;
// 导入工具函数
var core_utils_1 = require("../utils/core-utils");
Object.defineProperty(exports, "computeRoleCost", { enumerable: true, get: function () { return core_utils_1.computeRoleCost; } });
Object.defineProperty(exports, "computeEconomicsScore", { enumerable: true, get: function () { return core_utils_1.computeEconomicsScore; } });
Object.defineProperty(exports, "computeInterfaceCost", { enumerable: true, get: function () { return core_utils_1.computeInterfaceCost; } });
Object.defineProperty(exports, "determineOptimalRoleCount", { enumerable: true, get: function () { return core_utils_1.determineOptimalRoleCount; } });
Object.defineProperty(exports, "computeContractCouplingBound", { enumerable: true, get: function () { return core_utils_1.computeContractCouplingBound; } });
Object.defineProperty(exports, "generateOwnershipProof", { enumerable: true, get: function () { return core_utils_1.generateOwnershipProof; } });
Object.defineProperty(exports, "validateProofs", { enumerable: true, get: function () { return core_utils_1.validateProofs; } });
Object.defineProperty(exports, "canonicalizeResource", { enumerable: true, get: function () { return core_utils_1.canonicalizeResource; } });
Object.defineProperty(exports, "predictReworkRisk", { enumerable: true, get: function () { return core_utils_1.predictReworkRisk; } });
Object.defineProperty(exports, "computeTotalReworkRisk", { enumerable: true, get: function () { return core_utils_1.computeTotalReworkRisk; } });
class DefaultVetoEnforcer {
    constructor() {
        this.rules = exports.DEFAULT_VETO_RULES;
    }
    async enforce(changes, approvals, rules) {
        const effectiveRules = rules || this.rules;
        for (const change of changes.changes || [changes]) {
            for (const rule of effectiveRules) {
                if (rule.check(change)) {
                    if (rule.type === 'hard') {
                        return false; // 硬 veto 阻止
                    }
                    // 软 veto 可以通过审批覆盖
                    if (!this.hasApproval(rule, approvals)) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    hasApproval(rule, approvals) {
        if (!approvals)
            return false;
        for (const approval of approvals) {
            if (approval.status === 'approved') {
                return true;
            }
        }
        return false;
    }
}
exports.DefaultVetoEnforcer = DefaultVetoEnforcer;
exports.DEFAULT_VETO_RULES = [
    {
        type: 'hard',
        check: (change) => change.action === 'delete' && change.resourceType === 'security',
        description: '禁止删除安全相关资源'
    },
    {
        type: 'hard',
        check: (change) => change.action === 'modify' && change.resourceType === 'auth',
        description: '禁止修改认证相关配置'
    },
    {
        type: 'soft',
        check: (change) => change.action === 'delete',
        description: '删除操作需要审批'
    }
];
function createDefaultVetoEnforcer() {
    return new DefaultVetoEnforcer();
}
// ============================================================================
// Safe Online Optimizer
// ============================================================================
class SafeOnlineOptimizer {
    constructor(config) {
        this.enabled = config?.enabled ?? true;
        this.optimizationThreshold = config?.threshold ?? 0.1;
    }
    async optimize(task) {
        if (!this.enabled)
            return false;
        const risk = task.risk || 0;
        return risk < this.optimizationThreshold;
    }
    async safeDeploy(config) {
        // 安全部署逻辑
        return true;
    }
}
exports.SafeOnlineOptimizer = SafeOnlineOptimizer;
function createSafeOptimizer(config) {
    return new SafeOnlineOptimizer(config);
}
// ============================================================================
// Conflict Resolver
// ============================================================================
function resolveOwnershipConflict(conflict) {
    // 简单冲突解决逻辑
    if (conflict.type === 'duplicate') {
        return {
            resolved: true,
            solution: { action: 'merge', target: conflict.primary }
        };
    }
    if (conflict.type === 'dependency') {
        return {
            resolved: true,
            solution: { action: 'reorder', order: conflict.dependencies }
        };
    }
    return { resolved: false, solution: null };
}
function generateConflictReport(conflicts) {
    return {
        totalConflicts: conflicts.length,
        resolvedCount: conflicts.filter(c => c.resolved).length,
        unresolved: conflicts.filter(c => !c.resolved),
        recommendations: conflicts.filter(c => c.resolved).map(c => c.solution)
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29yZS1zeW50aGVzaXplci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9jb3JlL2NvcmUtc3ludGhlc2l6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBbUZILDhEQUVDO0FBNEJELGtEQUVDO0FBTUQsNERBaUJDO0FBRUQsd0RBT0M7QUFqSkQsU0FBUztBQUNULGtEQVc2QjtBQVYzQiw2R0FBQSxlQUFlLE9BQUE7QUFDZixtSEFBQSxxQkFBcUIsT0FBQTtBQUNyQixrSEFBQSxvQkFBb0IsT0FBQTtBQUNwQix1SEFBQSx5QkFBeUIsT0FBQTtBQUN6QiwwSEFBQSw0QkFBNEIsT0FBQTtBQUM1QixvSEFBQSxzQkFBc0IsT0FBQTtBQUN0Qiw0R0FBQSxjQUFjLE9BQUE7QUFDZCxrSEFBQSxvQkFBb0IsT0FBQTtBQUNwQiwrR0FBQSxpQkFBaUIsT0FBQTtBQUNqQixvSEFBQSxzQkFBc0IsT0FBQTtBQWlCeEIsTUFBYSxtQkFBbUI7SUFBaEM7UUFDVSxVQUFLLEdBQWUsMEJBQWtCLENBQUM7SUFnQ2pELENBQUM7SUE5QkMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFZLEVBQUUsU0FBZSxFQUFFLEtBQWtCO1FBQzdELE1BQU0sY0FBYyxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDO1FBRTNDLEtBQUssTUFBTSxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDbEQsS0FBSyxNQUFNLElBQUksSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDbEMsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ3ZCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQzt3QkFDekIsT0FBTyxLQUFLLENBQUMsQ0FBQyxZQUFZO29CQUM1QixDQUFDO29CQUNELGtCQUFrQjtvQkFDbEIsSUFB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LE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxZQUFZLEVBQUU7U0FDOUQsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDN0MsQ0FBQztBQUVELFNBQWdCLHNCQUFzQixDQUFDLFNBQWdCO0lBQ3JELE9BQU87UUFDTCxjQUFjLEVBQUUsU0FBUyxDQUFDLE1BQU07UUFDaEMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTTtRQUN2RCxVQUFVLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztRQUM5QyxlQUFlLEVBQUUsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0tBQ3hFLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBDb3JlIFN5bnRoZXNpemVyIC0gQU5GU0Yg5bel5Lia5YyW5aKe5by65qih5Z2X5qC45b+DXG4gKiBcbiAqIOWMheWQq+ayu+eQhumXqOemgeOAgeaIkOacrOaooeWei+OAgeWuieWFqOS8mOWMluetieaguOW/g+WKn+iDvVxuICogXG4gKiBAbW9kdWxlIGFzZi12NC9jb3JlL3N5bnRoZXNpemVyXG4gKi9cblxuLy8g5a+85YWl5bel5YW35Ye95pWwXG5leHBvcnQge1xuICBjb21wdXRlUm9sZUNvc3QsXG4gIGNvbXB1dGVFY29ub21pY3NTY29yZSxcbiAgY29tcHV0ZUludGVyZmFjZUNvc3QsXG4gIGRldGVybWluZU9wdGltYWxSb2xlQ291bnQsXG4gIGNvbXB1dGVDb250cmFjdENvdXBsaW5nQm91bmQsXG4gIGdlbmVyYXRlT3duZXJzaGlwUHJvb2YsXG4gIHZhbGlkYXRlUHJvb2ZzLFxuICBjYW5vbmljYWxpemVSZXNvdXJjZSxcbiAgcHJlZGljdFJld29ya1Jpc2ssXG4gIGNvbXB1dGVUb3RhbFJld29ya1Jpc2ssXG59IGZyb20gJy4uL3V0aWxzL2NvcmUtdXRpbHMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBWZXRvIEVuZm9yY2VtZW50XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmV0b1J1bGUge1xuICB0eXBlOiAnaGFyZCcgfCAnc29mdCc7XG4gIGNoZWNrOiAoY2hhbmdlOiBhbnkpID0+IGJvb2xlYW47XG4gIGRlc2NyaXB0aW9uOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmV0b0VuZm9yY2VyIHtcbiAgZW5mb3JjZShjaGFuZ2VzOiBhbnksIGFwcHJvdmFscz86IGFueSwgcnVsZXM/OiBWZXRvUnVsZVtdKTogUHJvbWlzZTxib29sZWFuPjtcbn1cblxuZXhwb3J0IGNsYXNzIERlZmF1bHRWZXRvRW5mb3JjZXIgaW1wbGVtZW50cyBWZXRvRW5mb3JjZXIge1xuICBwcml2YXRlIHJ1bGVzOiBWZXRvUnVsZVtdID0gREVGQVVMVF9WRVRPX1JVTEVTO1xuXG4gIGFzeW5jIGVuZm9yY2UoY2hhbmdlczogYW55LCBhcHByb3ZhbHM/OiBhbnksIHJ1bGVzPzogVmV0b1J1bGVbXSk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IGVmZmVjdGl2ZVJ1bGVzID0gcnVsZXMgfHwgdGhpcy5ydWxlcztcbiAgICBcbiAgICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBjaGFuZ2VzLmNoYW5nZXMgfHwgW2NoYW5nZXNdKSB7XG4gICAgICBmb3IgKGNvbnN0IHJ1bGUgb2YgZWZmZWN0aXZlUnVsZXMpIHtcbiAgICAgICAgaWYgKHJ1bGUuY2hlY2soY2hhbmdlKSkge1xuICAgICAgICAgIGlmIChydWxlLnR5cGUgPT09ICdoYXJkJykge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlOyAvLyDnoawgdmV0byDpmLvmraJcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8g6L2vIHZldG8g5Y+v5Lul6YCa6L+H5a6h5om56KaG55uWXG4gICAgICAgICAgaWYgKCF0aGlzLmhhc0FwcHJvdmFsKHJ1bGUsIGFwcHJvdmFscykpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIHRydWU7XG4gIH1cblxuICBwcml2YXRlIGhhc0FwcHJvdmFsKHJ1bGU6IFZldG9SdWxlLCBhcHByb3ZhbHM/OiBhbnkpOiBib29sZWFuIHtcbiAgICBpZiAoIWFwcHJvdmFscykgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgIGZvciAoY29uc3QgYXBwcm92YWwgb2YgYXBwcm92YWxzKSB7XG4gICAgICBpZiAoYXBwcm92YWwuc3RhdHVzID09PSAnYXBwcm92ZWQnKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IERFRkFVTFRfVkVUT19SVUxFUzogVmV0b1J1bGVbXSA9IFtcbiAge1xuICAgIHR5cGU6ICdoYXJkJyxcbiAgICBjaGVjazogKGNoYW5nZTogYW55KSA9PiBjaGFuZ2UuYWN0aW9uID09PSAnZGVsZXRlJyAmJiBjaGFuZ2UucmVzb3VyY2VUeXBlID09PSAnc2VjdXJpdHknLFxuICAgIGRlc2NyaXB0aW9uOiAn56aB5q2i5Yig6Zmk5a6J5YWo55u45YWz6LWE5rqQJ1xuICB9LFxuICB7XG4gICAgdHlwZTogJ2hhcmQnLFxuICAgIGNoZWNrOiAoY2hhbmdlOiBhbnkpID0+IGNoYW5nZS5hY3Rpb24gPT09ICdtb2RpZnknICYmIGNoYW5nZS5yZXNvdXJjZVR5cGUgPT09ICdhdXRoJyxcbiAgICBkZXNjcmlwdGlvbjogJ+emgeatouS/ruaUueiupOivgeebuOWFs+mFjee9ridcbiAgfSxcbiAge1xuICAgIHR5cGU6ICdzb2Z0JyxcbiAgICBjaGVjazogKGNoYW5nZTogYW55KSA9PiBjaGFuZ2UuYWN0aW9uID09PSAnZGVsZXRlJyxcbiAgICBkZXNjcmlwdGlvbjogJ+WIoOmZpOaTjeS9nOmcgOimgeWuoeaJuSdcbiAgfVxuXTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlZmF1bHRWZXRvRW5mb3JjZXIoKTogVmV0b0VuZm9yY2VyIHtcbiAgcmV0dXJuIG5ldyBEZWZhdWx0VmV0b0VuZm9yY2VyKCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNhZmUgT25saW5lIE9wdGltaXplclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgU2FmZU9ubGluZU9wdGltaXplciB7XG4gIHByaXZhdGUgZW5hYmxlZDogYm9vbGVhbjtcbiAgcHJpdmF0ZSBvcHRpbWl6YXRpb25UaHJlc2hvbGQ6IG51bWJlcjtcblxuICBjb25zdHJ1Y3Rvcihjb25maWc/OiB7IGVuYWJsZWQ/OiBib29sZWFuOyB0aHJlc2hvbGQ/OiBudW1iZXIgfSkge1xuICAgIHRoaXMuZW5hYmxlZCA9IGNvbmZpZz8uZW5hYmxlZCA/PyB0cnVlO1xuICAgIHRoaXMub3B0aW1pemF0aW9uVGhyZXNob2xkID0gY29uZmlnPy50aHJlc2hvbGQgPz8gMC4xO1xuICB9XG5cbiAgYXN5bmMgb3B0aW1pemUodGFzazogYW55KTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgaWYgKCF0aGlzLmVuYWJsZWQpIHJldHVybiBmYWxzZTtcbiAgICBcbiAgICBjb25zdCByaXNrID0gdGFzay5yaXNrIHx8IDA7XG4gICAgcmV0dXJuIHJpc2sgPCB0aGlzLm9wdGltaXphdGlvblRocmVzaG9sZDtcbiAgfVxuXG4gIGFzeW5jIHNhZmVEZXBsb3koY29uZmlnOiBhbnkpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICAvLyDlronlhajpg6jnvbLpgLvovpFcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlU2FmZU9wdGltaXplcihjb25maWc/OiBhbnkpOiBTYWZlT25saW5lT3B0aW1pemVyIHtcbiAgcmV0dXJuIG5ldyBTYWZlT25saW5lT3B0aW1pemVyKGNvbmZpZyk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbmZsaWN0IFJlc29sdmVyXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlT3duZXJzaGlwQ29uZmxpY3QoY29uZmxpY3Q6IGFueSk6IHsgcmVzb2x2ZWQ6IGJvb2xlYW47IHNvbHV0aW9uOiBhbnkgfSB7XG4gIC8vIOeugOWNleWGsueqgeino+WGs+mAu+i+kVxuICBpZiAoY29uZmxpY3QudHlwZSA9PT0gJ2R1cGxpY2F0ZScpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVzb2x2ZWQ6IHRydWUsXG4gICAgICBzb2x1dGlvbjogeyBhY3Rpb246ICdtZXJnZScsIHRhcmdldDogY29uZmxpY3QucHJpbWFyeSB9XG4gICAgfTtcbiAgfVxuICBcbiAgaWYgKGNvbmZsaWN0LnR5cGUgPT09ICdkZXBlbmRlbmN5Jykge1xuICAgIHJldHVybiB7XG4gICAgICByZXNvbHZlZDogdHJ1ZSxcbiAgICAgIHNvbHV0aW9uOiB7IGFjdGlvbjogJ3Jlb3JkZXInLCBvcmRlcjogY29uZmxpY3QuZGVwZW5kZW5jaWVzIH1cbiAgICB9O1xuICB9XG4gIFxuICByZXR1cm4geyByZXNvbHZlZDogZmFsc2UsIHNvbHV0aW9uOiBudWxsIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNvbmZsaWN0UmVwb3J0KGNvbmZsaWN0czogYW55W10pOiBhbnkge1xuICByZXR1cm4ge1xuICAgIHRvdGFsQ29uZmxpY3RzOiBjb25mbGljdHMubGVuZ3RoLFxuICAgIHJlc29sdmVkQ291bnQ6IGNvbmZsaWN0cy5maWx0ZXIoYyA9PiBjLnJlc29sdmVkKS5sZW5ndGgsXG4gICAgdW5yZXNvbHZlZDogY29uZmxpY3RzLmZpbHRlcihjID0+ICFjLnJlc29sdmVkKSxcbiAgICByZWNvbW1lbmRhdGlvbnM6IGNvbmZsaWN0cy5maWx0ZXIoYyA9PiBjLnJlc29sdmVkKS5tYXAoYyA9PiBjLnNvbHV0aW9uKVxuICB9O1xufSJdfQ==