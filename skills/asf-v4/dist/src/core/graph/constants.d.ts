/**
 * ASF V4.0 Graph Kernel - Constants
 *
 * Edge types, node type weights, and configuration constants.
 * Version: v0.8.5
 */
/** Edge types for interface budget calculation */
export declare const EDGE_TYPES: {
    readonly DEPENDS_ON: "depends_on";
    readonly CALLS: "calls";
    readonly UPDATES: "updates";
    readonly IMPLEMENTS: "implements";
    readonly VALIDATES: "validates";
    readonly SUBSCRIBES: "subscribes";
    readonly OWNS: "owns";
    readonly AUTHORED: "AUTHORED";
    readonly TOUCHED: "TOUCHED";
    readonly GOVERNED: "GOVERNED";
};
export type EdgeType = typeof EDGE_TYPES[keyof typeof EDGE_TYPES];
export declare const NODE_TYPES: {
    readonly ROLE: "Role";
    readonly SERVICE: "Service";
    readonly API_CONTRACT: "APIContract";
    readonly DB_SCHEMA: "DBSchema";
    readonly UI_COMPONENT: "UIComponent";
    readonly EVENT_SCHEMA: "EventSchema";
    readonly CONFIG_SCHEMA: "ConfigSchema";
    readonly PROBE: "Probe";
    readonly UTILITY: "Utility";
    readonly AUTH_MODULE: "AuthModule";
    readonly PAYMENT_SERVICE: "PaymentService";
};
export type NodeType = typeof NODE_TYPES[keyof typeof NODE_TYPES];
export declare const CHANGE_ACTIONS: {
    readonly CREATE: "create";
    readonly UPDATE: "update";
    readonly DELETE: "delete";
    readonly APPROVE: "approve";
    readonly REJECT: "reject";
};
export type ChangeAction = typeof CHANGE_ACTIONS[keyof typeof CHANGE_ACTIONS];
export declare const CONTRACT_TYPES: {
    readonly OPEN_API: "OpenAPI";
    readonly DB_SCHEMA: "DBSchema";
    readonly UI_PROPS: "UIProps";
    readonly EVENT_SCHEMA: "EventSchema";
    readonly CONFIG_SCHEMA: "ConfigSchema";
};
export type ContractType = typeof CONTRACT_TYPES[keyof typeof CONTRACT_TYPES];
/**
 * Node type weights for heat score calculation.
 * Higher weight = more critical/impactful node type.
 */
export declare const NODE_TYPE_WEIGHTS: Record<NodeType, number>;
/**
 * Risk score thresholds for weight multipliers.
 */
export declare const RISK_THRESHOLDS: {
    HIGH: number;
    MEDIUM: number;
    LOW: number;
};
/**
 * Get risk weight multiplier based on risk score.
 */
export declare function getRiskWeight(riskScore: number): number;
export declare const TRACE_RELATIONS: {
    readonly AUTHORED: "AUTHORED";
    readonly TOUCHED: "TOUCHED";
    readonly GOVERNED: "GOVERNED";
    readonly DEPENDS_ON: "DEPENDS_ON";
    readonly CALLS: "CALLS";
    readonly UPDATES: "UPDATES";
};
export type TraceRelation = typeof TRACE_RELATIONS[keyof typeof TRACE_RELATIONS];
/** Default blast radius calculation settings */
export declare const BLAST_RADIUS_DEFAULTS: {
    MAX_DEPTH: number;
    INCLUDE_CRITICAL_PATH: boolean;
};
/** Default heatmap query settings */
export declare const HEATMAP_DEFAULTS: {
    WINDOW_MS: number;
    LIMIT: number;
    MIN_HEAT_SCORE: number;
};
/** Default change event metadata */
export declare const CHANGE_EVENT_DEFAULTS: {
    RISK_SCORE: number;
};
/** UUID pattern for ID validation */
export declare const UUID_PATTERN: RegExp;
/** Semantic version pattern */
export declare const SEMVER_PATTERN: RegExp;
export declare const GRAPH_CONSTANTS: {
    readonly EDGE_TYPES: {
        readonly DEPENDS_ON: "depends_on";
        readonly CALLS: "calls";
        readonly UPDATES: "updates";
        readonly IMPLEMENTS: "implements";
        readonly VALIDATES: "validates";
        readonly SUBSCRIBES: "subscribes";
        readonly OWNS: "owns";
        readonly AUTHORED: "AUTHORED";
        readonly TOUCHED: "TOUCHED";
        readonly GOVERNED: "GOVERNED";
    };
    readonly NODE_TYPES: {
        readonly ROLE: "Role";
        readonly SERVICE: "Service";
        readonly API_CONTRACT: "APIContract";
        readonly DB_SCHEMA: "DBSchema";
        readonly UI_COMPONENT: "UIComponent";
        readonly EVENT_SCHEMA: "EventSchema";
        readonly CONFIG_SCHEMA: "ConfigSchema";
        readonly PROBE: "Probe";
        readonly UTILITY: "Utility";
        readonly AUTH_MODULE: "AuthModule";
        readonly PAYMENT_SERVICE: "PaymentService";
    };
    readonly CHANGE_ACTIONS: {
        readonly CREATE: "create";
        readonly UPDATE: "update";
        readonly DELETE: "delete";
        readonly APPROVE: "approve";
        readonly REJECT: "reject";
    };
    readonly CONTRACT_TYPES: {
        readonly OPEN_API: "OpenAPI";
        readonly DB_SCHEMA: "DBSchema";
        readonly UI_PROPS: "UIProps";
        readonly EVENT_SCHEMA: "EventSchema";
        readonly CONFIG_SCHEMA: "ConfigSchema";
    };
    readonly NODE_TYPE_WEIGHTS: Record<NodeType, number>;
    readonly RISK_THRESHOLDS: {
        HIGH: number;
        MEDIUM: number;
        LOW: number;
    };
    readonly TRACE_RELATIONS: {
        readonly AUTHORED: "AUTHORED";
        readonly TOUCHED: "TOUCHED";
        readonly GOVERNED: "GOVERNED";
        readonly DEPENDS_ON: "DEPENDS_ON";
        readonly CALLS: "CALLS";
        readonly UPDATES: "UPDATES";
    };
    readonly BLAST_RADIUS_DEFAULTS: {
        MAX_DEPTH: number;
        INCLUDE_CRITICAL_PATH: boolean;
    };
    readonly HEATMAP_DEFAULTS: {
        WINDOW_MS: number;
        LIMIT: number;
        MIN_HEAT_SCORE: number;
    };
    readonly CHANGE_EVENT_DEFAULTS: {
        RISK_SCORE: number;
    };
    readonly UUID_PATTERN: RegExp;
    readonly SEMVER_PATTERN: RegExp;
};
