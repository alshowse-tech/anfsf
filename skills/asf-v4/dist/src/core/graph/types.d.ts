/**
 * ASF V4.0 Graph Kernel - Type Definitions
 *
 * Core types for ChangeEvent tracking and TraceEdge relationships.
 * Version: v0.8.5
 */
/** Change action types */
export type ChangeAction = 'create' | 'update' | 'delete' | 'approve' | 'reject';
/** Change target kind */
export type ChangeTargetKind = 'graph' | 'code' | 'contract';
/** Contract types for diff tracking */
export type ContractType = 'OpenAPI' | 'DBSchema' | 'UIProps' | 'EventSchema' | 'ConfigSchema';
/** Change diff details */
export interface ChangeDiff {
    added?: Record<string, any>;
    removed?: Record<string, any>;
    modified?: Record<string, {
        before: any;
        after: any;
    }>;
    contractType?: ContractType;
    paths?: {
        added?: string[];
        removed?: string[];
        modified?: string[];
    };
    tables?: {
        added?: string[];
        removed?: string[];
        modified?: string[];
    };
}
/**
 * ChangeEvent - Tracks all modifications to graph nodes, contracts, and code artifacts
 *
 * This is the core audit trail for the ownership lattice system.
 * Every write operation should emit a ChangeEvent.
 */
export interface ChangeEvent {
    /** Unique event ID (UUID) */
    id: string;
    /** Timestamp in milliseconds */
    ts: number;
    /** Role ID that triggered this change */
    actorRoleId: string;
    /** Action performed */
    action: ChangeAction;
    /** Target of the change */
    target: {
        kind: ChangeTargetKind;
        idOrPath: string;
    };
    /** Ownership rule that governed this change */
    ownershipRuleId: string;
    /** Detailed diff of what changed */
    diff: ChangeDiff;
    /** Risk score 0-100 (higher = more risky) */
    riskScore?: number;
    /** Blast radius - number of downstream nodes affected (calculated) */
    blastRadius?: number;
    /** Heat score for visualization (calculated) */
    heatScore?: number;
    /** Optional metadata */
    metadata?: Record<string, any>;
}
/** Trace edge relation types */
export type TraceRelation = 'AUTHORED' | 'TOUCHED' | 'GOVERNED' | 'DEPENDS_ON' | 'CALLS' | 'UPDATES';
/**
 * TraceEdge - Creates auditable relationships between entities
 *
 * Used for:
 * - (Role)-[:AUTHORED]->(ChangeEvent)
 * - (ChangeEvent)-[:TOUCHED]->(Node|Contract|CodeArtifact)
 * - (OwnershipRule)-[:GOVERNED]->(ChangeEvent)
 * - (Node)-[:DEPENDS_ON]->(Node)
 */
export interface TraceEdge {
    /** Unique edge ID */
    id: string;
    /** Source node ID */
    from: string;
    /** Target node ID */
    to: string;
    /** Relationship type */
    relation: TraceRelation;
    /** Timestamp when edge was created */
    ts: number;
    /** Optional edge metadata */
    metadata?: {
        edgeType?: string;
        contractType?: string;
        weight?: number;
        [key: string]: any;
    };
}
/** Node types in the ownership graph */
export type NodeType = 'Role' | 'Service' | 'APIContract' | 'DBSchema' | 'UIComponent' | 'EventSchema' | 'ConfigSchema' | 'Probe' | 'Utility' | 'AuthModule' | 'PaymentService';
/** Base graph node */
export interface GraphNode {
    id: string;
    type: NodeType;
    name: string;
    description?: string;
    roleId?: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, any>;
}
/** Heatmap data point */
export interface HeatmapEntry {
    nodeId: string;
    nodeType: NodeType;
    heatScore: number;
    rank: number;
    changeCount: number;
    blastRadius: number;
    riskWeight: number;
}
/** Heatmap query parameters */
export interface HeatmapQuery {
    window?: number;
    nodeTypes?: NodeType[];
    minHeatScore?: number;
    limit?: number;
}
/** Blast radius calculation result */
export interface BlastRadiusResult {
    /** Directly impacted nodes (depth=1) */
    directImpact: number;
    /** Indirectly impacted nodes (depth>1) */
    indirectImpact: number;
    /** Total blast radius */
    totalBlastRadius: number;
    /** List of impacted node IDs */
    impactedNodes: string[];
    /** Critical path nodes (API/DB/Probe) */
    criticalPath: string[];
    /** Maximum depth reached */
    maxDepth: number;
}
export declare function isChangeEvent(obj: any): obj is ChangeEvent;
export declare function isTraceEdge(obj: any): obj is TraceEdge;
export declare function isGraphNode(obj: any): obj is GraphNode;
