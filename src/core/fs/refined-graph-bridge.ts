/**
 * ANFSF — L2→L4 Bridge.
 *
 * Converts a RefinedGraph (L2 simple requirement graph) into a
 * RequirementGraph (L4 7-layer directed graph) so downstream L4
 * engines (normalizer, constraint system, IR compiler) can consume it.
 */

import {
  RequirementGraph,
  GraphNode,
  GraphEdge,
  GraphLevel,
  Constraint,
} from '../../req-graph/graph-engine';

/**
 * Simple node from L2 RefinedGraph.
 */
export interface SimpleNode {
  id: string;
  type: string;
  content: string;
}

/**
 * Simple edge from L2 RefinedGraph.
 */
export interface SimpleEdge {
  from: string;
  to: string;
  type: string;
}

/**
 * RefinedGraph interface (L2 output).
 */
export interface RefinedGraph {
  nodes: SimpleNode[];
  edges: SimpleEdge[];
  quality: number;
  completeness: number;
  traceId: string;
}

// ---------------------------------------------------------------------------
// Heuristic level classifier.
// Assigns each simple node to one of the 7 graph levels based on content
// keywords and the declared type string.
// ---------------------------------------------------------------------------

const LEVEL_KEYWORDS: Record<GraphLevel, string[]> = {
  [GraphLevel.L0_Intent]: ['goal', 'purpose', 'vision', 'intent', 'objective', 'why', 'target', 'business'],
  [GraphLevel.L0_Experience]: ['user', 'experience', 'ux', 'persona', 'journey', 'flow', 'happy path'],
  [GraphLevel.L1_Feature]: ['feature', 'module', 'capability', 'functionality', 'epic', 'story'],
  [GraphLevel.L2_Interaction]: ['interaction', 'ui', 'component', 'screen', 'page', 'form', 'button', 'view'],
  [GraphLevel.L3_System]: ['system', 'service', 'api', 'database', 'infra', 'server', 'backend', 'middleware'],
  [GraphLevel.L4_Execution]: ['execution', 'task', 'job', 'schedule', 'cron', 'worker', 'queue', 'pipeline'],
  [GraphLevel.L5_Validation]: ['test', 'validate', 'verify', 'assert', 'acceptance', 'qa', 'check'],
};

function classifyLevel(node: SimpleNode): GraphLevel {
  const text = `${node.type} ${node.content}`.toLowerCase();

  for (const [level, keywords] of Object.entries(LEVEL_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        return level as GraphLevel;
      }
    }
  }

  // Default: treat as feature-level
  return GraphLevel.L1_Feature;
}

// ---------------------------------------------------------------------------
// Bridge function
// ---------------------------------------------------------------------------

/**
 * Convert a RefinedGraph (L2) to a RequirementGraph (L4).
 *
 * Each simple node is classified into a 7-layer level based on keyword
 * heuristics. Edges are preserved with weight derived from edge type.
 */
export function refineGraphToRequirementGraph(refined: RefinedGraph): RequirementGraph {
  const nodes = new Map<string, GraphNode>();
  const edges = new Map<string, GraphEdge>();
  const now = Date.now();

  // Convert nodes
  for (const sn of refined.nodes) {
    const level = classifyLevel(sn);
    const node: GraphNode = {
      id: sn.id,
      level,
      type: sn.type,
      data: { content: sn.content, sourceRefinement: refined.traceId },
      constraints: [],
      metadata: {
        createdAt: now,
        updatedAt: now,
        version: '1.0.0',
        confidence: refined.quality,
      },
    };
    nodes.set(sn.id, node);
  }

  // Convert edges
  for (const se of refined.edges) {
    const weight = edgeTypeWeight(se.type);
    const edge: GraphEdge = {
      id: `edge-${se.from}-${se.to}`,
      from: se.from,
      to: se.to,
      type: se.type,
      weight,
    };
    edges.set(edge.id, edge);
  }

  return {
    nodes,
    edges,
    version: '1.0.0',
    metadata: {
      createdAt: now,
      updatedAt: now,
      totalNodes: nodes.size,
      totalEdges: edges.size,
    },
  };
}

/**
 * Assign numeric weight to edge type for graph algorithms.
 */
function edgeTypeWeight(type: string): number {
  switch (type.toLowerCase()) {
    case 'depends_on':
    case 'dependency':
      return 1.0;
    case 'blocks':
      return 0.9;
    case 'relates_to':
    case 'related':
      return 0.5;
    case 'implements':
      return 0.8;
    case 'tests':
      return 0.6;
    default:
      return 0.5;
  }
}

/**
 * Attach domain-specific constraints to a RequirementGraph that was
 * bridged from a RefinedGraph, based on the refinement quality score.
 */
export function applyRefinementConstraints(graph: RequirementGraph, quality: number): void {
  for (const node of graph.nodes.values()) {
    if (quality < 0.5) {
      node.constraints.push({
        type: 'semantic',
        rule: 'low_refinement_quality_requires_manual_review',
        severity: 'critical',
      });
    }
    if (node.level === GraphLevel.L3_System) {
      node.constraints.push({
        type: 'schema',
        rule: 'system_node_must_have_api_contract',
        severity: 'warning',
      });
    }
  }
}
