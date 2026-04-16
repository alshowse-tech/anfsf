/**
 * Core Synthesizer - ANFSF 工业化增强模块核心
 *
 * 包含治理门禁、成本模型、安全优化等核心功能
 *
 * @module asf-v4/core/synthesizer
 */
export { computeRoleCost, computeEconomicsScore, computeInterfaceCost, determineOptimalRoleCount, computeContractCouplingBound, generateOwnershipProof, validateProofs, canonicalizeResource, predictReworkRisk, computeTotalReworkRisk, } from '../utils/core-utils';
export interface VetoRule {
    type: 'hard' | 'soft';
    check: (change: any) => boolean;
    description: string;
}
export interface VetoEnforcer {
    enforce(changes: any, approvals?: any, rules?: VetoRule[]): Promise<boolean>;
}
export declare class DefaultVetoEnforcer implements VetoEnforcer {
    private rules;
    enforce(changes: any, approvals?: any, rules?: VetoRule[]): Promise<boolean>;
    private hasApproval;
}
export declare const DEFAULT_VETO_RULES: VetoRule[];
export declare function createDefaultVetoEnforcer(): VetoEnforcer;
export declare class SafeOnlineOptimizer {
    private enabled;
    private optimizationThreshold;
    constructor(config?: {
        enabled?: boolean;
        threshold?: number;
    });
    optimize(task: any): Promise<boolean>;
    safeDeploy(config: any): Promise<boolean>;
}
export declare function createSafeOptimizer(config?: any): SafeOnlineOptimizer;
export declare function resolveOwnershipConflict(conflict: any): {
    resolved: boolean;
    solution: any;
};
export declare function generateConflictReport(conflicts: any[]): any;
