/**
 * ASF V4.0 Graph Kernel - Traversal Algorithms
 * 
 * Blast radius calculation and graph traversal utilities.
 * Version: v0.8.5
 */

import type { GraphNode, BlastRadiusResult, TraceEdge } from './types';
import { NODE_TYPES, BLAST_RADIUS_DEFAULTS } from './constants';

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
export function calculateBlastRadius(
  graph: GraphStoreLike,
  nodeId: string,
  maxDepth: number = BLAST_RADIUS_DEFAULTS.MAX_DEPTH
): BlastRadiusResult {
  const visited = new Set<string>();
  const impactedNodes: string[] = [];
  const criticalPath: string[] = [];
  
  // BFS queue: { nodeId, depth, isOnCriticalPath }
  const queue: Array<{
    id: string;
    depth: number;
    isOnCriticalPath: boolean;
  }> = [];
  
  // Start from the target node
  queue.push({ id: nodeId, depth: 0, isOnCriticalPath: false });
  visited.add(nodeId);
  
  let directImpact = 0;
  let indirectImpact = 0;
  let actualMaxDepth = 0;
  
  // Critical node types that indicate high-impact paths
  const criticalTypes = new Set([
    NODE_TYPES.API_CONTRACT,
    NODE_TYPES.DB_SCHEMA,
    NODE_TYPES.PROBE,
    NODE_TYPES.AUTH_MODULE,
    NODE_TYPES.PAYMENT_SERVICE,
  ]);
  
  while (queue.length > 0) {
    const { id, depth, isOnCriticalPath } = queue.shift()!;
    
    // Track max depth reached
    if (depth > actualMaxDepth) {
      actualMaxDepth = depth;
    }
    
    // Record impacted nodes (exclude the starting node)
    if (depth > 0) {
      impactedNodes.push(id);
      
      if (depth === 1) {
        directImpact++;
      } else {
        indirectImpact++;
      }
      
      if (isOnCriticalPath) {
        criticalPath.push(id);
      }
    }
    
    // Stop if we've reached max depth
    if (depth >= maxDepth) {
      continue;
    }
    
    // Get downstream edges (nodes that depend on this node)
    const downstreamEdges = graph.getDownstreamEdges(id);
    
    for (const edge of downstreamEdges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        
        // Check if this node is on a critical path
        const nodeType = graph.getNodeType(edge.to);
        const isCritical = criticalTypes.has(nodeType as any) || isOnCriticalPath;
        
        queue.push({
          id: edge.to,
          depth: depth + 1,
          isOnCriticalPath: isCritical,
        });
      }
    }
  }
  
  return {
    directImpact,
    indirectImpact,
    totalBlastRadius: impactedNodes.length,
    impactedNodes,
    criticalPath,
    maxDepth: actualMaxDepth,
  };
}

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
export function calculateUpstreamDependencies(
  graph: GraphStoreLike,
  nodeId: string,
  maxDepth: number = BLAST_RADIUS_DEFAULTS.MAX_DEPTH
): string[] {
  const visited = new Set<string>();
  const upstreamNodes: string[] = [];
  
  const queue: Array<{ id: string; depth: number }> = [];
  queue.push({ id: nodeId, depth: 0 });
  visited.add(nodeId);
  
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    
    if (depth >= maxDepth) {
      continue;
    }
    
    // Get upstream edges (nodes this node depends on)
    // This would need an getUpstreamEdges method on the graph store
    // For now, we'll note this as a TODO
    const upstreamEdges = getUpstreamEdgesImpl(graph, id);
    
    for (const edge of upstreamEdges) {
      if (!visited.has(edge.from)) {
        visited.add(edge.from);
        upstreamNodes.push(edge.from);
        
        queue.push({
          id: edge.from,
          depth: depth + 1,
        });
      }
    }
  }
  
  return upstreamNodes;
}

/**
 * Internal helper to get upstream edges.
 * Scans all downstream edges from other nodes to find edges pointing to this node.
 * An edge where `edge.to === nodeId` means `edge.from` is an upstream dependency.
 */
function getUpstreamEdgesImpl(graph: GraphStoreLike, nodeId: string): TraceEdge[] {
  // We need to find all edges where this node is the target (to === nodeId).
  // Since GraphStoreLike only exposes getDownstreamEdges, we scan by iterating
  // known nodes isn't available — instead, use the relation semantics:
  // getDownstreamEdges returns edges from a node to its dependents.
  // For upstream, we need edges from dependencies TO this node.
  // Without a reverse index, we track upstream via DEPENDS_ON relation.

  // Best-effort: collect all nodes that have this node as a downstream dependency.
  // We'll need to iterate possible upstream candidates. Since we don't have a
  // getAllNodes method, we use the GraphStoreLike interface limitations.
  // The caller should ideally extend GraphStoreLike with getUpstreamEdges.

  // Attempt to use getUpstreamEdges if the store provides it (duck typing)
  const storeWithUpstream = graph as GraphStoreLike & { getUpstreamEdges(nodeId: string): TraceEdge[] };
  if (typeof storeWithUpstream.getUpstreamEdges === 'function') {
    return storeWithUpstream.getUpstreamEdges(nodeId);
  }

  // Fallback: scan downstream edges from all reachable nodes to find reverse edges.
  // This is O(n*m) but works without schema changes.
  const upstreamEdges: TraceEdge[] = [];

  // First, collect all unique node IDs we can reach
  const allNodeIds = new Set<string>();
  allNodeIds.add(nodeId);

  // BFS to discover all nodes via downstream edges
  const queue: string[] = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const edges = graph.getDownstreamEdges(current);
    for (const edge of edges) {
      allNodeIds.add(edge.from);
      allNodeIds.add(edge.to);
      if (!allNodeIds.has(edge.to)) {
        queue.push(edge.to);
      }
    }
  }

  // Now scan each node's downstream edges to find edges targeting our nodeId
  for (const candidateId of allNodeIds) {
    if (candidateId === nodeId) continue;
    const edges = graph.getDownstreamEdges(candidateId);
    for (const edge of edges) {
      if (edge.to === nodeId) {
        upstreamEdges.push(edge);
      }
    }
  }

  return upstreamEdges;
}

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
export function findAllPaths(
  graph: GraphStoreLike,
  fromId: string,
  toId: string,
  maxPaths: number = 100
): string[][] {
  const paths: string[][] = [];
  const visited = new Set<string>();
  
  function dfs(currentId: string, path: string[]): void {
    if (paths.length >= maxPaths) {
      return;
    }
    
    if (currentId === toId) {
      paths.push([...path]);
      return;
    }
    
    visited.add(currentId);
    
    const downstreamEdges = graph.getDownstreamEdges(currentId);
    
    for (const edge of downstreamEdges) {
      if (!visited.has(edge.to)) {
        path.push(edge.to);
        dfs(edge.to, path);
        path.pop();
      }
    }
    
    visited.delete(currentId);
  }
  
  dfs(fromId, [fromId]);
  
  return paths;
}

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
export function findShortestPath(
  graph: GraphStoreLike,
  fromId: string,
  toId: string
): string[] | null {
  if (fromId === toId) {
    return [fromId];
  }
  
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  
  const queue: string[] = [];
  queue.push(fromId);
  visited.add(fromId);
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const downstreamEdges = graph.getDownstreamEdges(currentId);
    
    for (const edge of downstreamEdges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        parent.set(edge.to, currentId);
        
        if (edge.to === toId) {
          // Reconstruct path
          const path: string[] = [];
          let node: string | undefined = toId;
          
          while (node !== undefined) {
            path.unshift(node);
            node = parent.get(node);
          }
          
          return path;
        }
        
        queue.push(edge.to);
      }
    }
  }
  
  return null; // No path found
}

/**
 * Check if a node is reachable from another node.
 * 
 * @param graph - Graph store implementation
 * @param fromId - Source node ID
 * @param toId - Target node ID
 * @returns True if toId is reachable from fromId
 */
export function isReachable(
  graph: GraphStoreLike,
  fromId: string,
  toId: string
): boolean {
  const path = findShortestPath(graph, fromId, toId);
  return path !== null;
}

/**
 * Get all nodes at a specific depth from a starting node.
 * 
 * @param graph - Graph store implementation
 * @param nodeId - Starting node ID
 * @param depth - Target depth (1 = direct dependencies)
 * @returns Array of node IDs at the specified depth
 */
export function getNodesAtDepth(
  graph: GraphStoreLike,
  nodeId: string,
  depth: number
): string[] {
  if (depth === 0) {
    return [nodeId];
  }
  
  const visited = new Set<string>();
  const result: string[] = [];
  
  const queue: Array<{ id: string; currentDepth: number }> = [];
  queue.push({ id: nodeId, currentDepth: 0 });
  visited.add(nodeId);
  
  while (queue.length > 0) {
    const { id, currentDepth } = queue.shift()!;
    
    if (currentDepth === depth) {
      result.push(id);
      continue;
    }
    
    if (currentDepth > depth) {
      continue;
    }
    
    const downstreamEdges = graph.getDownstreamEdges(id);
    
    for (const edge of downstreamEdges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push({
          id: edge.to,
          currentDepth: currentDepth + 1,
        });
      }
    }
  }
  
  return result;
}
