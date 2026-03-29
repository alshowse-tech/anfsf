/**
 * ASF V4.0 Role Engine - Interface Budget Weights
 * 
 * Weight matrices for interface budget calculation.
 * Version: v0.8.5
 */

// ============================================================================
// Edge Cost Matrix
// ============================================================================

/**
 * Edge type costs for interface budget calculation.
 * 
 * Higher cost = higher communication/collaboration overhead.
 * These values represent the "cost" of cross-role dependencies.
 */
export const EDGE_COST: Record<string, number> = {
  /** Simple dependency - lowest cost */
  depends_on: 1.0,
  
  /** API/function calls - moderate cost */
  calls: 1.2,
  
  /** Data updates - high cost (state changes) */
  updates: 1.4,
  
  /** Interface implementation - lower cost (contract-driven) */
  implements: 0.8,
  
  /** Validation relationships - moderate-high cost */
  validates: 1.3,
  
  /** Event subscriptions - moderate cost */
  subscribes: 1.1,
  
  /** Ownership relationships - lowest cost (internal) */
  owns: 0.5,
  
  /** Default cost for unknown edge types */
  default: 1.0,
} as const;

/**
 * Get edge cost by type.
 */
export function getEdgeCost(edgeType: string): number {
  return EDGE_COST[edgeType as keyof typeof EDGE_COST] ?? EDGE_COST.default;
}

// ============================================================================
// Contract Cost Matrix
// ============================================================================

/**
 * Contract type costs for interface budget calculation.
 * 
 * Higher cost = higher stability impact when changed.
 * These represent the "cost" of touching different contract types.
 */
export const CONTRACT_COST: Record<string, number> = {
  /** OpenAPI/Swagger contracts - high cost (external-facing) */
  OpenAPI: 1.6,
  
  /** Database schema - highest cost (data persistence) */
  DBSchema: 1.7,
  
  /** UI component props - moderate cost */
  UIProps: 1.2,
  
  /** Event schemas - moderate-high cost */
  EventSchema: 1.5,
  
  /** Configuration schemas - lower cost */
  ConfigSchema: 1.1,
  
  /** Default cost for unknown contract types */
  default: 1.0,
} as const;

/**
 * Get contract cost by type.
 */
export function getContractCost(contractType: string): number {
  return CONTRACT_COST[contractType as keyof typeof CONTRACT_COST] ?? CONTRACT_COST.default;
}

// ============================================================================
// Node Type Risk Weights
// ============================================================================

/**
 * Node type risk multipliers.
 * 
 * Higher weight = higher risk when this node type changes.
 */
export const NODE_RISK_WEIGHTS: Record<string, number> = {
  /** Authentication modules - highest risk */
  AuthModule: 1.8,
  
  /** Payment services - highest risk */
  PaymentService: 1.9,
  
  /** Database schemas - high risk */
  DBSchema: 1.7,
  
  /** API contracts - high risk */
  APIContract: 1.5,
  
  /** Probes/monitors - moderate-high risk */
  Probe: 1.4,
  
  /** Event schemas - moderate risk */
  EventSchema: 1.3,
  
  /** Services - moderate risk */
  Service: 1.2,
  
  /** Config schemas - lower risk */
  ConfigSchema: 1.1,
  
  /** UI components - lower risk */
  UIComponent: 1.0,
  
  /** Utilities - lowest risk */
  Utility: 0.8,
  
  /** Default risk weight */
  default: 1.0,
} as const;

/**
 * Get node risk weight by type.
 */
export function getNodeRiskWeight(nodeType: string): number {
  return NODE_RISK_WEIGHTS[nodeType as keyof typeof NODE_RISK_WEIGHTS] ?? NODE_RISK_WEIGHTS.default;
}

// ============================================================================
// Risk Score Thresholds
// ============================================================================

/**
 * Risk score thresholds for multiplier calculation.
 */
export const RISK_THRESHOLDS = {
  /** High risk: score >= 70, multiplier = 1.5 */
  HIGH: 70,
  HIGH_MULTIPLIER: 1.5,
  
  /** Medium risk: score >= 40, multiplier = 1.2 */
  MEDIUM: 40,
  MEDIUM_MULTIPLIER: 1.2,
  
  /** Low risk: score < 40, multiplier = 1.0 */
  LOW_MULTIPLIER: 1.0,
} as const;

/**
 * Calculate risk weight multiplier from risk score.
 */
export function calculateRiskWeight(riskScore: number): number {
  if (riskScore >= RISK_THRESHOLDS.HIGH) {
    return RISK_THRESHOLDS.HIGH_MULTIPLIER;
  }
  if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
    return RISK_THRESHOLDS.MEDIUM_MULTIPLIER;
  }
  return RISK_THRESHOLDS.LOW_MULTIPLIER;
}

/**
 * Calculate combined risk weight from multiple factors.
 */
export function calculateCombinedRiskWeight(params: {
  baseRiskScore: number;
  nodeType?: string;
  contractType?: string;
  changeFrequency?: number;
}): number {
  const { baseRiskScore, nodeType, contractType, changeFrequency } = params;
  
  // Start with base risk weight
  let weight = calculateRiskWeight(baseRiskScore);
  
  // Apply node type weight
  if (nodeType) {
    const nodeWeight = getNodeRiskWeight(nodeType);
    weight = Math.max(weight, nodeWeight);
  }
  
  // Apply contract type weight
  if (contractType) {
    const contractWeight = getContractCost(contractType);
    weight = Math.max(weight, contractWeight);
  }
  
  // Apply change frequency penalty (frequent changes = higher risk)
  if (changeFrequency !== undefined && changeFrequency > 10) {
    weight *= 1.2;
  }
  
  // Cap at reasonable maximum
  return Math.min(weight, 2.5);
}

// ============================================================================
// Configuration Loading
// ============================================================================

/**
 * Default weight configuration.
 */
export const DEFAULT_WEIGHT_CONFIG = {
  edgeCost: EDGE_COST,
  contractCost: CONTRACT_COST,
  nodeRiskWeight: NODE_RISK_WEIGHTS,
  riskThresholds: RISK_THRESHOLDS,
} as const;

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
export function mergeWeightConfig(custom: WeightConfig): typeof DEFAULT_WEIGHT_CONFIG {
  return {
    edgeCost: { ...EDGE_COST, ...(custom.edgeCosts || {}) },
    contractCost: { ...CONTRACT_COST, ...(custom.contractCosts || {}) },
    nodeRiskWeight: { ...NODE_RISK_WEIGHTS, ...(custom.nodeRiskWeights || {}) },
    riskThresholds: {
      HIGH: custom.riskThresholds?.high ?? RISK_THRESHOLDS.HIGH,
      MEDIUM: custom.riskThresholds?.medium ?? RISK_THRESHOLDS.MEDIUM,
      HIGH_MULTIPLIER: RISK_THRESHOLDS.HIGH_MULTIPLIER,
      MEDIUM_MULTIPLIER: RISK_THRESHOLDS.MEDIUM_MULTIPLIER,
      LOW_MULTIPLIER: RISK_THRESHOLDS.LOW_MULTIPLIER,
    },
  };
}

// ============================================================================
// Exports
// ============================================================================

export const WEIGHT_CONSTANTS = {
  EDGE_COST,
  CONTRACT_COST,
  NODE_RISK_WEIGHTS,
  RISK_THRESHOLDS,
  DEFAULT_WEIGHT_CONFIG,
} as const;
