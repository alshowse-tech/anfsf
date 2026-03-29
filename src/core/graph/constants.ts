/**
 * ASF V4.0 Graph Kernel - Constants
 * 
 * Edge types, node type weights, and configuration constants.
 * Version: v0.8.5
 */

// ============================================================================
// Edge Type Constants
// ============================================================================

/** Edge types for interface budget calculation */
export const EDGE_TYPES = {
  DEPENDS_ON: 'depends_on',
  CALLS: 'calls',
  UPDATES: 'updates',
  IMPLEMENTS: 'implements',
  VALIDATES: 'validates',
  SUBSCRIBES: 'subscribes',
  OWNS: 'owns',
  AUTHORED: 'AUTHORED',
  TOUCHED: 'TOUCHED',
  GOVERNED: 'GOVERNED',
} as const;

export type EdgeType = typeof EDGE_TYPES[keyof typeof EDGE_TYPES];

// ============================================================================
// Node Type Constants
// ============================================================================

export const NODE_TYPES = {
  ROLE: 'Role',
  SERVICE: 'Service',
  API_CONTRACT: 'APIContract',
  DB_SCHEMA: 'DBSchema',
  UI_COMPONENT: 'UIComponent',
  EVENT_SCHEMA: 'EventSchema',
  CONFIG_SCHEMA: 'ConfigSchema',
  PROBE: 'Probe',
  UTILITY: 'Utility',
  AUTH_MODULE: 'AuthModule',
  PAYMENT_SERVICE: 'PaymentService',
} as const;

export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];

// ============================================================================
// Change Action Constants
// ============================================================================

export const CHANGE_ACTIONS = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  APPROVE: 'approve',
  REJECT: 'reject',
} as const;

export type ChangeAction = typeof CHANGE_ACTIONS[keyof typeof CHANGE_ACTIONS];

// ============================================================================
// Contract Type Constants
// ============================================================================

export const CONTRACT_TYPES = {
  OPEN_API: 'OpenAPI',
  DB_SCHEMA: 'DBSchema',
  UI_PROPS: 'UIProps',
  EVENT_SCHEMA: 'EventSchema',
  CONFIG_SCHEMA: 'ConfigSchema',
} as const;

export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];

// ============================================================================
// Node Type Weights (for Heat Score Calculation)
// ============================================================================

/**
 * Node type weights for heat score calculation.
 * Higher weight = more critical/impactful node type.
 */
export const NODE_TYPE_WEIGHTS: Record<NodeType, number> = {
  [NODE_TYPES.API_CONTRACT]: 1.5,
  [NODE_TYPES.DB_SCHEMA]: 1.6,
  [NODE_TYPES.SERVICE]: 1.2,
  [NODE_TYPES.UI_COMPONENT]: 1.0,
  [NODE_TYPES.UTILITY]: 0.8,
  [NODE_TYPES.EVENT_SCHEMA]: 1.3,
  [NODE_TYPES.CONFIG_SCHEMA]: 1.1,
  [NODE_TYPES.PROBE]: 1.4,
  [NODE_TYPES.ROLE]: 0.5,
  [NODE_TYPES.AUTH_MODULE]: 1.8,
  [NODE_TYPES.PAYMENT_SERVICE]: 1.9,
};

// ============================================================================
// Risk Thresholds
// ============================================================================

/**
 * Risk score thresholds for weight multipliers.
 */
export const RISK_THRESHOLDS = {
  HIGH: 70,    // ×1.5 multiplier
  MEDIUM: 40,  // ×1.2 multiplier
  LOW: 0,      // ×1.0 multiplier
};

/**
 * Get risk weight multiplier based on risk score.
 */
export function getRiskWeight(riskScore: number): number {
  if (riskScore >= RISK_THRESHOLDS.HIGH) {
    return 1.5;
  } else if (riskScore >= RISK_THRESHOLDS.MEDIUM) {
    return 1.2;
  }
  return 1.0;
}

// ============================================================================
// Trace Relation Constants
// ============================================================================

export const TRACE_RELATIONS = {
  AUTHORED: 'AUTHORED',
  TOUCHED: 'TOUCHED',
  GOVERNED: 'GOVERNED',
  DEPENDS_ON: 'DEPENDS_ON',
  CALLS: 'CALLS',
  UPDATES: 'UPDATES',
} as const;

export type TraceRelation = typeof TRACE_RELATIONS[keyof typeof TRACE_RELATIONS];

// ============================================================================
// Default Configuration
// ============================================================================

/** Default blast radius calculation settings */
export const BLAST_RADIUS_DEFAULTS = {
  MAX_DEPTH: 5,
  INCLUDE_CRITICAL_PATH: true,
};

/** Default heatmap query settings */
export const HEATMAP_DEFAULTS = {
  WINDOW_MS: 7 * 24 * 60 * 60 * 1000, // 7 days
  LIMIT: 100,
  MIN_HEAT_SCORE: 0,
};

/** Default change event metadata */
export const CHANGE_EVENT_DEFAULTS = {
  RISK_SCORE: 50,
};

// ============================================================================
// Validation Patterns
// ============================================================================

/** UUID pattern for ID validation */
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Semantic version pattern */
export const SEMVER_PATTERN = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

// ============================================================================
// Export All Constants
// ============================================================================

export const GRAPH_CONSTANTS = {
  EDGE_TYPES,
  NODE_TYPES,
  CHANGE_ACTIONS,
  CONTRACT_TYPES,
  NODE_TYPE_WEIGHTS,
  RISK_THRESHOLDS,
  TRACE_RELATIONS,
  BLAST_RADIUS_DEFAULTS,
  HEATMAP_DEFAULTS,
  CHANGE_EVENT_DEFAULTS,
  UUID_PATTERN,
  SEMVER_PATTERN,
} as const;
