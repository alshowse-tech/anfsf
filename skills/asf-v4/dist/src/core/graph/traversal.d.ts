/**
 * ASF V4.0 Graph Kernel - Traversal Algorithms
 *
 * Blast radius calculation and graph traversal utilities.
 * Version: v0.8.5
 */
import type { GraphNode, BlastRadiusResult, TraceEdge } from './types';
/**
 * Graph store interface for traversal operations.
 * This is an abstraction - actual implementation depends on storage layer.
 */
export interface GraphStoreLike {
    getNode(id: string): GraphNode | null;
    getDownstreamEdges(nodeId: string): TraceEdge[];
    getNodeType(nodeId: string): string;
}
/**
 * Calculate the blast radius of a node change.
 *
 * Uses BFS traversal to find all downstream dependencies.
 * The blast radius represents how many nodes would be affected
 * if this node changes.
 *
 * @param graph - Graph store implementation
 * @param nodeId - Starting node ID
 * @param maxDepth - Maximum traversal depth (default: 5)
 * @returns BlastRadiusResult with impact metrics
 *
 * @example
 * ```typescript
 * const result = calculateBlastRadius(graph, 'api-gateway-v1');
 * console.log(`Blast radius: ${result.totalBlastRadius}`);
 * console.log(`Critical path: ${result.criticalPath}`);
 * ```
 */
export declare function calculateBlastRadius(graph: GraphStoreLike, nodeId: string, maxDepth?: number): BlastRadiusResult;
/**
 * Calculate the upstream dependencies of a node.
 *
 * This is the reverse of blast radius - it finds all nodes
 * that the given node depends on.
 *
 * @param graph - Graph store implementation
 * @param nodeId - Starting node ID
 * @param maxDepth - Maximum traversal depth
 * @returns Array of upstream node IDs
 */
export declare function calculateUpstreamDependencies(graph: GraphStoreLike, nodeId: string, maxDepth?: number): string[];
/**
 * Find all paths between two nodes.
 *
 * Uses DFS to enumerate all possible paths.
 * Warning: Can be expensive on large graphs.
 *
 * @param graph - Graph store implementation
 * @param fromId - Source node ID
 * @param toId - Target node ID
 * @param maxPaths - Maximum paths to return (default: 100)
 * @returns Array of paths (each path is an array of node IDs)
 */
export declare function findAllPaths(graph: GraphStoreLike, fromId: string, toId: string, maxPaths?: number): string[][];
/**
 * Find the shortest path between two nodes.
 *
 * Uses BFS for unweighted shortest path.
 *
 * @param graph - Graph store implementation
 * @param fromId - Source node ID
 * @param toId - Target node ID
 * @returns Shortest path as array of node IDs, or null if no path exists
 */
export declare function findShortestPath(graph: GraphStoreLike, fromId: string, toId: string): string[] | null;
/**
 * Check if a node is reachable from another node.
 *
 * @param graph - Graph store implementation
 * @param fromId - Source node ID
 * @param toId - Target node ID
 * @returns True if toId is reachable from fromId
 */
export declare function isReachable(graph: GraphStoreLike, fromId: string, toId: string): boolean;
/**
 * Get all nodes at a specific depth from a starting node.
 *
 * @param graph - Graph store implementation
 * @param nodeId - Starting node ID
 * @param depth - Target depth (1 = direct dependencies)
 * @returns Array of node IDs at the specified depth
 */
export declare function getNodesAtDepth(graph: GraphStoreLike, nodeId: string, depth: number): string[];
