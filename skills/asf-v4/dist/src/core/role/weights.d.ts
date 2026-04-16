/**
 * ASF V4.0 Role Engine - Interface Budget Weights
 *
 * Weight matrices for interface budget calculation.
 * Version: v0.8.5
 */
/**
 * Edge type costs for interface budget calculation.
 *
 * Higher cost = higher communication/collaboration overhead.
 * These values represent the "cost" of cross-role dependencies.
 */
export declare const EDGE_COST: Record<string, number>;
/**
 * Get edge cost by type.
 */
export declare function getEdgeCost(edgeType: string): number;
/**
 * Contract type costs for interface budget calculation.
 *
 * Higher cost = higher stability impact when changed.
 * These represent the "cost" of touching different contract types.
 */
export declare const CONTRACT_COST: Record<string, number>;
/**
 * Get contract cost by type.
 */
export declare function getContractCost(contractType: string): number;
/**
 * Node type risk multipliers.
 *
 * Higher weight = higher risk when this node type changes.
 */
export declare const NODE_RISK_WEIGHTS: Record<string, number>;
/**
 * Get node risk weight by type.
 */
export declare function getNodeRiskWeight(nodeType: string): number;
/**
 * Risk score thresholds for multiplier calculation.
 */
export declare const RISK_THRESHOLDS: {
    /** High risk: score >= 70, multiplier = 1.5 */
    HIGH: number;
    HIGH_MULTIPLIER: number;
    /** Medium risk: score >= 40, multiplier = 1.2 */
    MEDIUM: number;
    MEDIUM_MULTIPLIER: number;
    /** Low risk: score < 40, multiplier = 1.0 */
    LOW_MULTIPLIER: number;
};
/**
 * Calculate risk weight multiplier from risk score.
 */
export declare function calculateRiskWeight(riskScore: number): number;
/**
 * Calculate combined risk weight from multiple factors.
 */
export declare function calculateCombinedRiskWeight(params: {
    baseRiskScore: number;
    nodeType?: string;
    contractType?: string;
    changeFrequency?: number;
}): number;
/**
 * Default weight configuration.
 */
export declare const DEFAULT_WEIGHT_CONFIG: {
    readonly edgeCost: Record<string, number>;
    readonly contractCost: Record<string, number>;
    readonly nodeRiskWeight: Record<string, number>;
    readonly riskThresholds: {
        /** High risk: score >= 70, multiplier = 1.5 */
        HIGH: number;
        HIGH_MULTIPLIER: number;
        /** Medium risk: score >= 40, multiplier = 1.2 */
        MEDIUM: number;
        MEDIUM_MULTIPLIER: number;
        /** Low risk: score < 40, multiplier = 1.0 */
        LOW_MULTIPLIER: number;
    };
};
/**
 * Weight configuration interface (for YAML/JSON config files).
 */
export interface WeightConfig {
    edgeCosts?: Record<string, number>;
    contractCosts?: Record<string, number>;
    nodeRiskWeights?: Record<string, number>;
    riskThresholds?: {
        high?: number;
        medium?: number;
    };
}
/**
 * Merge custom config with defaults.
 */
export declare function mergeWeightConfig(custom: WeightConfig): typeof DEFAULT_WEIGHT_CONFIG;
export declare const WEIGHT_CONSTANTS: {
    readonly EDGE_COST: Record<string, number>;
    readonly CONTRACT_COST: Record<string, number>;
    readonly NODE_RISK_WEIGHTS: Record<string, number>;
    readonly RISK_THRESHOLDS: {
        /** High risk: score >= 70, multiplier = 1.5 */
        HIGH: number;
        HIGH_MULTIPLIER: number;
        /** Medium risk: score >= 40, multiplier = 1.2 */
        MEDIUM: number;
        MEDIUM_MULTIPLIER: number;
        /** Low risk: score < 40, multiplier = 1.0 */
        LOW_MULTIPLIER: number;
    };
    readonly DEFAULT_WEIGHT_CONFIG: {
        readonly edgeCost: Record<string, number>;
        readonly contractCost: Record<string, number>;
        readonly nodeRiskWeight: Record<string, number>;
        readonly riskThresholds: {
            /** High risk: score >= 70, multiplier = 1.5 */
            HIGH: number;
            HIGH_MULTIPLIER: number;
            /** Medium risk: score >= 40, multiplier = 1.2 */
            MEDIUM: number;
            MEDIUM_MULTIPLIER: number;
            /** Low risk: score < 40, multiplier = 1.0 */
            LOW_MULTIPLIER: number;
        };
    };
};
