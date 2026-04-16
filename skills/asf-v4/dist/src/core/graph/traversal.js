"use strict";
/**
 * ASF V4.0 Graph Kernel - Traversal Algorithms
 *
 * Blast radius calculation and graph traversal utilities.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBlastRadius = calculateBlastRadius;
exports.calculateUpstreamDependencies = calculateUpstreamDependencies;
exports.findAllPaths = findAllPaths;
exports.findShortestPath = findShortestPath;
exports.isReachable = isReachable;
exports.getNodesAtDepth = getNodesAtDepth;
const constants_1 = require("./constants");
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
function calculateBlastRadius(graph, nodeId, maxDepth = constants_1.BLAST_RADIUS_DEFAULTS.MAX_DEPTH) {
    const visited = new Set();
    const impactedNodes = [];
    const criticalPath = [];
    // BFS queue: { nodeId, depth, isOnCriticalPath }
    const queue = [];
    // Start from the target node
    queue.push({ id: nodeId, depth: 0, isOnCriticalPath: false });
    visited.add(nodeId);
    let directImpact = 0;
    let indirectImpact = 0;
    let actualMaxDepth = 0;
    // Critical node types that indicate high-impact paths
    const criticalTypes = new Set([
        constants_1.NODE_TYPES.API_CONTRACT,
        constants_1.NODE_TYPES.DB_SCHEMA,
        constants_1.NODE_TYPES.PROBE,
        constants_1.NODE_TYPES.AUTH_MODULE,
        constants_1.NODE_TYPES.PAYMENT_SERVICE,
    ]);
    while (queue.length > 0) {
        const { id, depth, isOnCriticalPath } = queue.shift();
        // Track max depth reached
        if (depth > actualMaxDepth) {
            actualMaxDepth = depth;
        }
        // Record impacted nodes (exclude the starting node)
        if (depth > 0) {
            impactedNodes.push(id);
            if (depth === 1) {
                directImpact++;
            }
            else {
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
                const isCritical = criticalTypes.has(nodeType) || isOnCriticalPath;
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
function calculateUpstreamDependencies(graph, nodeId, maxDepth = constants_1.BLAST_RADIUS_DEFAULTS.MAX_DEPTH) {
    const visited = new Set();
    const upstreamNodes = [];
    const queue = [];
    queue.push({ id: nodeId, depth: 0 });
    visited.add(nodeId);
    while (queue.length > 0) {
        const { id, depth } = queue.shift();
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
 * TODO: This should be provided by the GraphStore implementation.
 */
function getUpstreamEdgesImpl(graph, nodeId) {
    // This is a placeholder - actual implementation depends on graph store
    // For now, return empty array
    return [];
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
function findAllPaths(graph, fromId, toId, maxPaths = 100) {
    const paths = [];
    const visited = new Set();
    function dfs(currentId, path) {
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
function findShortestPath(graph, fromId, toId) {
    if (fromId === toId) {
        return [fromId];
    }
    const visited = new Set();
    const parent = new Map();
    const queue = [];
    queue.push(fromId);
    visited.add(fromId);
    while (queue.length > 0) {
        const currentId = queue.shift();
        const downstreamEdges = graph.getDownstreamEdges(currentId);
        for (const edge of downstreamEdges) {
            if (!visited.has(edge.to)) {
                visited.add(edge.to);
                parent.set(edge.to, currentId);
                if (edge.to === toId) {
                    // Reconstruct path
                    const path = [];
                    let node = toId;
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
function isReachable(graph, fromId, toId) {
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
function getNodesAtDepth(graph, nodeId, depth) {
    if (depth === 0) {
        return [nodeId];
    }
    const visited = new Set();
    const result = [];
    const queue = [];
    queue.push({ id: nodeId, currentDepth: 0 });
    visited.add(nodeId);
    while (queue.length > 0) {
        const { id, currentDepth } = queue.shift();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJhdmVyc2FsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvZ3JhcGgvdHJhdmVyc2FsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7QUFrQ0gsb0RBeUZDO0FBYUQsc0VBc0NDO0FBd0JELG9DQXFDQztBQVlELDRDQTRDQztBQVVELGtDQU9DO0FBVUQsMENBMENDO0FBcldELDJDQUFnRTtBQVloRTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0gsU0FBZ0Isb0JBQW9CLENBQ2xDLEtBQXFCLEVBQ3JCLE1BQWMsRUFDZCxXQUFtQixpQ0FBcUIsQ0FBQyxTQUFTO0lBRWxELE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDbEMsTUFBTSxhQUFhLEdBQWEsRUFBRSxDQUFDO0lBQ25DLE1BQU0sWUFBWSxHQUFhLEVBQUUsQ0FBQztJQUVsQyxpREFBaUQ7SUFDakQsTUFBTSxLQUFLLEdBSU4sRUFBRSxDQUFDO0lBRVIsNkJBQTZCO0lBQzdCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM5RCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXBCLElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztJQUNyQixJQUFJLGNBQWMsR0FBRyxDQUFDLENBQUM7SUFDdkIsSUFBSSxjQUFjLEdBQUcsQ0FBQyxDQUFDO0lBRXZCLHNEQUFzRDtJQUN0RCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQztRQUM1QixzQkFBVSxDQUFDLFlBQVk7UUFDdkIsc0JBQVUsQ0FBQyxTQUFTO1FBQ3BCLHNCQUFVLENBQUMsS0FBSztRQUNoQixzQkFBVSxDQUFDLFdBQVc7UUFDdEIsc0JBQVUsQ0FBQyxlQUFlO0tBQzNCLENBQUMs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LFlBQVksR0FBRyxDQUFDO2lCQUMvQixDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztJQUNILENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBHcmFwaCBLZXJuZWwgLSBUcmF2ZXJzYWwgQWxnb3JpdGhtc1xuICogXG4gKiBCbGFzdCByYWRpdXMgY2FsY3VsYXRpb24gYW5kIGdyYXBoIHRyYXZlcnNhbCB1dGlsaXRpZXMuXG4gKiBWZXJzaW9uOiB2MC44LjVcbiAqL1xuXG5pbXBvcnQgdHlwZSB7IEdyYXBoTm9kZSwgQmxhc3RSYWRpdXNSZXN1bHQsIFRyYWNlRWRnZSB9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHsgTk9ERV9UWVBFUywgQkxBU1RfUkFESVVTX0RFRkFVTFRTIH0gZnJvbSAnLi9jb25zdGFudHMnO1xuXG4vKipcbiAqIEdyYXBoIHN0b3JlIGludGVyZmFjZSBmb3IgdHJhdmVyc2FsIG9wZXJhdGlvbnMuXG4gKiBUaGlzIGlzIGFuIGFic3RyYWN0aW9uIC0gYWN0dWFsIGltcGxlbWVudGF0aW9uIGRlcGVuZHMgb24gc3RvcmFnZSBsYXllci5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaFN0b3JlTGlrZSB7XG4gIGdldE5vZGUoaWQ6IHN0cmluZyk6IEdyYXBoTm9kZSB8IG51bGw7XG4gIGdldERvd25zdHJlYW1FZGdlcyhub2RlSWQ6IHN0cmluZyk6IFRyYWNlRWRnZVtdO1xuICBnZXROb2RlVHlwZShub2RlSWQ6IHN0cmluZyk6IHN0cmluZztcbn1cblxuLyoqXG4gKiBDYWxjdWxhdGUgdGhlIGJsYXN0IHJhZGl1cyBvZiBhIG5vZGUgY2hhbmdlLlxuICogXG4gKiBVc2VzIEJGUyB0cmF2ZXJzYWwgdG8gZmluZCBhbGwgZG93bnN0cmVhbSBkZXBlbmRlbmNpZXMuXG4gKiBUaGUgYmxhc3QgcmFkaXVzIHJlcHJlc2VudHMgaG93IG1hbnkgbm9kZXMgd291bGQgYmUgYWZmZWN0ZWRcbiAqIGlmIHRoaXMgbm9kZSBjaGFuZ2VzLlxuICogXG4gKiBAcGFyYW0gZ3JhcGggLSBHcmFwaCBzdG9yZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtIG5vZGVJZCAtIFN0YXJ0aW5nIG5vZGUgSURcbiAqIEBwYXJhbSBtYXhEZXB0aCAtIE1heGltdW0gdHJhdmVyc2FsIGRlcHRoIChkZWZhdWx0OiA1KVxuICogQHJldHVybnMgQmxhc3RSYWRpdXNSZXN1bHQgd2l0aCBpbXBhY3QgbWV0cmljc1xuICogXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgcmVzdWx0ID0gY2FsY3VsYXRlQmxhc3RSYWRpdXMoZ3JhcGgsICdhcGktZ2F0ZXdheS12MScpO1xuICogY29uc29sZS5sb2coYEJsYXN0IHJhZGl1czogJHtyZXN1bHQudG90YWxCbGFzdFJhZGl1c31gKTtcbiAqIGNvbnNvbGUubG9nKGBDcml0aWNhbCBwYXRoOiAke3Jlc3VsdC5jcml0aWNhbFBhdGh9YCk7XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZUJsYXN0UmFkaXVzKFxuICBncmFwaDogR3JhcGhTdG9yZUxpa2UsXG4gIG5vZGVJZDogc3RyaW5nLFxuICBtYXhEZXB0aDogbnVtYmVyID0gQkxBU1RfUkFESVVTX0RFRkFVTFRTLk1BWF9ERVBUSFxuKTogQmxhc3RSYWRpdXNSZXN1bHQge1xuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGltcGFjdGVkTm9kZXM6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IGNyaXRpY2FsUGF0aDogc3RyaW5nW10gPSBbXTtcbiAgXG4gIC8vIEJGUyBxdWV1ZTogeyBub2RlSWQsIGRlcHRoLCBpc09uQ3JpdGljYWxQYXRoIH1cbiAgY29uc3QgcXVldWU6IEFycmF5PHtcbiAgICBpZDogc3RyaW5nO1xuICAgIGRlcHRoOiBudW1iZXI7XG4gICAgaXNPbkNyaXRpY2FsUGF0aDogYm9vbGVhbjtcbiAgfT4gPSBbXTtcbiAgXG4gIC8vIFN0YXJ0IGZyb20gdGhlIHRhcmdldCBub2RlXG4gIHF1ZXVlLnB1c2goeyBpZDogbm9kZUlkLCBkZXB0aDogMCwgaXNPbkNyaXRpY2FsUGF0aDogZmFsc2UgfSk7XG4gIHZpc2l0ZWQuYWRkKG5vZGVJZCk7XG4gIFxuICBsZXQgZGlyZWN0SW1wYWN0ID0gMDtcbiAgbGV0IGluZGlyZWN0SW1wYWN0ID0gMDtcbiAgbGV0IGFjdHVhbE1heERlcHRoID0gMDtcbiAgXG4gIC8vIENyaXRpY2FsIG5vZGUgdHlwZXMgdGhhdCBpbmRpY2F0ZSBoaWdoLWltcGFjdCBwYXRoc1xuICBjb25zdCBjcml0aWNhbFR5cGVzID0gbmV3IFNldChbXG4gICAgTk9ERV9UWVBFUy5BUElfQ09OVFJBQ1QsXG4gICAgTk9ERV9UWVBFUy5EQl9TQ0hFTUEsXG4gICAgTk9ERV9UWVBFUy5QUk9CRSxcbiAgICBOT0RFX1RZUEVTLkFVVEhfTU9EVUxFLFxuICAgIE5PREVfVFlQRVMuUEFZTUVOVF9TRVJWSUNFLFxuICBdKTtcbiAgXG4gIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgeyBpZCwgZGVwdGgsIGlzT25Dcml0aWNhbFBhdGggfSA9IHF1ZXVlLnNoaWZ0KCkhO1xuICAgIFxuICAgIC8vIFRyYWNrIG1heCBkZXB0aCByZWFjaGVkXG4gICAgaWYgKGRlcHRoID4gYWN0dWFsTWF4RGVwdGgpIHtcbiAgICAgIGFjdHVhbE1heERlcHRoID0gZGVwdGg7XG4gICAgfVxuICAgIFxuICAgIC8vIFJlY29yZCBpbXBhY3RlZCBub2RlcyAoZXhjbHVkZSB0aGUgc3RhcnRpbmcgbm9kZSlcbiAgICBpZiAoZGVwdGggPiAwKSB7XG4gICAgICBpbXBhY3RlZE5vZGVzLnB1c2goaWQpO1xuICAgICAgXG4gICAgICBpZiAoZGVwdGggPT09IDEpIHtcbiAgICAgICAgZGlyZWN0SW1wYWN0Kys7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBpbmRpcmVjdEltcGFjdCsrO1xuICAgICAgfVxuICAgICAgXG4gICAgICBpZiAoaXNPbkNyaXRpY2FsUGF0aCkge1xuICAgICAgICBjcml0aWNhbFBhdGgucHVzaChpZCk7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIC8vIFN0b3AgaWYgd2UndmUgcmVhY2hlZCBtYXggZGVwdGhcbiAgICBpZiAoZGVwdGggPj0gbWF4RGVwdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBcbiAgICAvLyBHZXQgZG93bnN0cmVhbSBlZGdlcyAobm9kZXMgdGhhdCBkZXBlbmQgb24gdGhpcyBub2RlKVxuICAgIGNvbnN0IGRvd25zdHJlYW1FZGdlcyA9IGdyYXBoLmdldERvd25zdHJlYW1FZGdlcyhpZCk7XG4gICAgXG4gICAgZm9yIChjb25zdCBlZGdlIG9mIGRvd25zdHJlYW1FZGdlcykge1xuICAgICAgaWYgKCF2aXNpdGVkLmhhcyhlZGdlLnRvKSkge1xuICAgICAgICB2aXNpdGVkLmFkZChlZGdlLnRvKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIHRoaXMgbm9kZSBpcyBvbiBhIGNyaXRpY2FsIHBhdGhcbiAgICAgICAgY29uc3Qgbm9kZVR5cGUgPSBncmFwaC5nZXROb2RlVHlwZShlZGdlLnRvKTtcbiAgICAgICAgY29uc3QgaXNDcml0aWNhbCA9IGNyaXRpY2FsVHlwZXMuaGFzKG5vZGVUeXBlIGFzIGFueSkgfHwgaXNPbkNyaXRpY2FsUGF0aDtcbiAgICAgICAgXG4gICAgICAgIHF1ZXVlLnB1c2goe1xuICAgICAgICAgIGlkOiBlZGdlLnRvLFxuICAgICAgICAgIGRlcHRoOiBkZXB0aCArIDEsXG4gICAgICAgICAgaXNPbkNyaXRpY2FsUGF0aDogaXNDcml0aWNhbCxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4ge1xuICAgIGRpcmVjdEltcGFjdCxcbiAgICBpbmRpcmVjdEltcGFjdCxcbiAgICB0b3RhbEJsYXN0UmFkaXVzOiBpbXBhY3RlZE5vZGVzLmxlbmd0aCxcbiAgICBpbXBhY3RlZE5vZGVzLFxuICAgIGNyaXRpY2FsUGF0aCxcbiAgICBtYXhEZXB0aDogYWN0dWFsTWF4RGVwdGgsXG4gIH07XG59XG5cbi8qKlxuICogQ2FsY3VsYXRlIHRoZSB1cHN0cmVhbSBkZXBlbmRlbmNpZXMgb2YgYSBub2RlLlxuICogXG4gKiBUaGlzIGlzIHRoZSByZXZlcnNlIG9mIGJsYXN0IHJhZGl1cyAtIGl0IGZpbmRzIGFsbCBub2Rlc1xuICogdGhhdCB0aGUgZ2l2ZW4gbm9kZSBkZXBlbmRzIG9uLlxuICogXG4gKiBAcGFyYW0gZ3JhcGggLSBHcmFwaCBzdG9yZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtIG5vZGVJZCAtIFN0YXJ0aW5nIG5vZGUgSURcbiAqIEBwYXJhbSBtYXhEZXB0aCAtIE1heGltdW0gdHJhdmVyc2FsIGRlcHRoXG4gKiBAcmV0dXJucyBBcnJheSBvZiB1cHN0cmVhbSBub2RlIElEc1xuICovXG5leHBvcnQgZnVuY3Rpb24gY2FsY3VsYXRlVXBzdHJlYW1EZXBlbmRlbmNpZXMoXG4gIGdyYXBoOiBHcmFwaFN0b3JlTGlrZSxcbiAgbm9kZUlkOiBzdHJpbmcsXG4gIG1heERlcHRoOiBudW1iZXIgPSBCTEFTVF9SQURJVVNfREVGQVVMVFMuTUFYX0RFUFRIXG4pOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHZpc2l0ZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgdXBzdHJlYW1Ob2Rlczogc3RyaW5nW10gPSBbXTtcbiAgXG4gIGNvbnN0IHF1ZXVlOiBBcnJheTx7IGlkOiBzdHJpbmc7IGRlcHRoOiBudW1iZXIgfT4gPSBbXTtcbiAgcXVldWUucHVzaCh7IGlkOiBub2RlSWQsIGRlcHRoOiAwIH0pO1xuICB2aXNpdGVkLmFkZChub2RlSWQpO1xuICBcbiAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICBjb25zdCB7IGlkLCBkZXB0aCB9ID0gcXVldWUuc2hpZnQoKSE7XG4gICAgXG4gICAgaWYgKGRlcHRoID49IG1heERlcHRoKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgXG4gICAgLy8gR2V0IHVwc3RyZWFtIGVkZ2VzIChub2RlcyB0aGlzIG5vZGUgZGVwZW5kcyBvbilcbiAgICAvLyBUaGlzIHdvdWxkIG5lZWQgYW4gZ2V0VXBzdHJlYW1FZGdlcyBtZXRob2Qgb24gdGhlIGdyYXBoIHN0b3JlXG4gICAgLy8gRm9yIG5vdywgd2UnbGwgbm90ZSB0aGlzIGFzIGEgVE9ET1xuICAgIGNvbnN0IHVwc3RyZWFtRWRnZXMgPSBnZXRVcHN0cmVhbUVkZ2VzSW1wbChncmFwaCwgaWQpO1xuICAgIFxuICAgIGZvciAoY29uc3QgZWRnZSBvZiB1cHN0cmVhbUVkZ2VzKSB7XG4gICAgICBpZiAoIXZpc2l0ZWQuaGFzKGVkZ2UuZnJvbSkpIHtcbiAgICAgICAgdmlzaXRlZC5hZGQoZWRnZS5mcm9tKTtcbiAgICAgICAgdXBzdHJlYW1Ob2Rlcy5wdXNoKGVkZ2UuZnJvbSk7XG4gICAgICAgIFxuICAgICAgICBxdWV1ZS5wdXNoKHtcbiAgICAgICAgICBpZDogZWRnZS5mcm9tLFxuICAgICAgICAgIGRlcHRoOiBkZXB0aCArIDEsXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBcbiAgcmV0dXJuIHVwc3RyZWFtTm9kZXM7XG59XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIHRvIGdldCB1cHN0cmVhbSBlZGdlcy5cbiAqIFRPRE86IFRoaXMgc2hvdWxkIGJlIHByb3ZpZGVkIGJ5IHRoZSBHcmFwaFN0b3JlIGltcGxlbWVudGF0aW9uLlxuICovXG5mdW5jdGlvbiBnZXRVcHN0cmVhbUVkZ2VzSW1wbChncmFwaDogR3JhcGhTdG9yZUxpa2UsIG5vZGVJZDogc3RyaW5nKTogVHJhY2VFZGdlW10ge1xuICAvLyBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgLSBhY3R1YWwgaW1wbGVtZW50YXRpb24gZGVwZW5kcyBvbiBncmFwaCBzdG9yZVxuICAvLyBGb3Igbm93LCByZXR1cm4gZW1wdHkgYXJyYXlcbiAgcmV0dXJuIFtdO1xufVxuXG4vKipcbiAqIEZpbmQgYWxsIHBhdGhzIGJldHdlZW4gdHdvIG5vZGVzLlxuICogXG4gKiBVc2VzIERGUyB0byBlbnVtZXJhdGUgYWxsIHBvc3NpYmxlIHBhdGhzLlxuICogV2FybmluZzogQ2FuIGJlIGV4cGVuc2l2ZSBvbiBsYXJnZSBncmFwaHMuXG4gKiBcbiAqIEBwYXJhbSBncmFwaCAtIEdyYXBoIHN0b3JlIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0gZnJvbUlkIC0gU291cmNlIG5vZGUgSURcbiAqIEBwYXJhbSB0b0lkIC0gVGFyZ2V0IG5vZGUgSURcbiAqIEBwYXJhbSBtYXhQYXRocyAtIE1heGltdW0gcGF0aHMgdG8gcmV0dXJuIChkZWZhdWx0OiAxMDApXG4gKiBAcmV0dXJucyBBcnJheSBvZiBwYXRocyAoZWFjaCBwYXRoIGlzIGFuIGFycmF5IG9mIG5vZGUgSURzKVxuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbFBhdGhzKFxuICBncmFwaDogR3JhcGhTdG9yZUxpa2UsXG4gIGZyb21JZDogc3RyaW5nLFxuICB0b0lkOiBzdHJpbmcsXG4gIG1heFBhdGhzOiBudW1iZXIgPSAxMDBcbik6IHN0cmluZ1tdW10ge1xuICBjb25zdCBwYXRoczogc3RyaW5nW11bXSA9IFtdO1xuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIFxuICBmdW5jdGlvbiBkZnMoY3VycmVudElkOiBzdHJpbmcsIHBhdGg6IHN0cmluZ1tdKTogdm9pZCB7XG4gICAgaWYgKHBhdGhzLmxlbmd0aCA+PSBtYXhQYXRocykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICBpZiAoY3VycmVudElkID09PSB0b0lkKSB7XG4gICAgICBwYXRocy5wdXNoKFsuLi5wYXRoXSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIHZpc2l0ZWQuYWRkKGN1cnJlbnRJZCk7XG4gICAgXG4gICAgY29uc3QgZG93bnN0cmVhbUVkZ2VzID0gZ3JhcGguZ2V0RG93bnN0cmVhbUVkZ2VzKGN1cnJlbnRJZCk7XG4gICAgXG4gICAgZm9yIChjb25zdCBlZGdlIG9mIGRvd25zdHJlYW1FZGdlcykge1xuICAgICAgaWYgKCF2aXNpdGVkLmhhcyhlZGdlLnRvKSkge1xuICAgICAgICBwYXRoLnB1c2goZWRnZS50byk7XG4gICAgICAgIGRmcyhlZGdlLnRvLCBwYXRoKTtcbiAgICAgICAgcGF0aC5wb3AoKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgdmlzaXRlZC5kZWxldGUoY3VycmVudElkKTtcbiAgfVxuICBcbiAgZGZzKGZyb21JZCwgW2Zyb21JZF0pO1xuICBcbiAgcmV0dXJuIHBhdGhzO1xufVxuXG4vKipcbiAqIEZpbmQgdGhlIHNob3J0ZXN0IHBhdGggYmV0d2VlbiB0d28gbm9kZXMuXG4gKiBcbiAqIFVzZXMgQkZTIGZvciB1bndlaWdodGVkIHNob3J0ZXN0IHBhdGguXG4gKiBcbiAqIEBwYXJhbSBncmFwaCAtIEdyYXBoIHN0b3JlIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0gZnJvbUlkIC0gU291cmNlIG5vZGUgSURcbiAqIEBwYXJhbSB0b0lkIC0gVGFyZ2V0IG5vZGUgSURcbiAqIEByZXR1cm5zIFNob3J0ZXN0IHBhdGggYXMgYXJyYXkgb2Ygbm9kZSBJRHMsIG9yIG51bGwgaWYgbm8gcGF0aCBleGlzdHNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRTaG9ydGVzdFBhdGgoXG4gIGdyYXBoOiBHcmFwaFN0b3JlTGlrZSxcbiAgZnJvbUlkOiBzdHJpbmcsXG4gIHRvSWQ6IHN0cmluZ1xuKTogc3RyaW5nW10gfCBudWxsIHtcbiAgaWYgKGZyb21JZCA9PT0gdG9JZCkge1xuICAgIHJldHVybiBbZnJvbUlkXTtcbiAgfVxuICBcbiAgY29uc3QgdmlzaXRlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBjb25zdCBwYXJlbnQgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBcbiAgY29uc3QgcXVldWU6IHN0cmluZ1tdID0gW107XG4gIHF1ZXVlLnB1c2goZnJvbUlkKTtcbiAgdmlzaXRlZC5hZGQoZnJvbUlkKTtcbiAgXG4gIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgY3VycmVudElkID0gcXVldWUuc2hpZnQoKSE7XG4gICAgY29uc3QgZG93bnN0cmVhbUVkZ2VzID0gZ3JhcGguZ2V0RG93bnN0cmVhbUVkZ2VzKGN1cnJlbnRJZCk7XG4gICAgXG4gICAgZm9yIChjb25zdCBlZGdlIG9mIGRvd25zdHJlYW1FZGdlcykge1xuICAgICAgaWYgKCF2aXNpdGVkLmhhcyhlZGdlLnRvKSkge1xuICAgICAgICB2aXNpdGVkLmFkZChlZGdlLnRvKTtcbiAgICAgICAgcGFyZW50LnNldChlZGdlLnRvLCBjdXJyZW50SWQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGVkZ2UudG8gPT09IHRvSWQpIHtcbiAgICAgICAgICAvLyBSZWNvbnN0cnVjdCBwYXRoXG4gICAgICAgICAgY29uc3QgcGF0aDogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBsZXQgbm9kZTogc3RyaW5nIHwgdW5kZWZpbmVkID0gdG9JZDtcbiAgICAgICAgICBcbiAgICAgICAgICB3aGlsZSAobm9kZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICBwYXRoLnVuc2hpZnQobm9kZSk7XG4gICAgICAgICAgICBub2RlID0gcGFyZW50LmdldChub2RlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgcmV0dXJuIHBhdGg7XG4gICAgICAgIH1cbiAgICAgICAgXG4gICAgICAgIHF1ZXVlLnB1c2goZWRnZS50byk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4gbnVsbDsgLy8gTm8gcGF0aCBmb3VuZFxufVxuXG4vKipcbiAqIENoZWNrIGlmIGEgbm9kZSBpcyByZWFjaGFibGUgZnJvbSBhbm90aGVyIG5vZGUuXG4gKiBcbiAqIEBwYXJhbSBncmFwaCAtIEdyYXBoIHN0b3JlIGltcGxlbWVudGF0aW9uXG4gKiBAcGFyYW0gZnJvbUlkIC0gU291cmNlIG5vZGUgSURcbiAqIEBwYXJhbSB0b0lkIC0gVGFyZ2V0IG5vZGUgSURcbiAqIEByZXR1cm5zIFRydWUgaWYgdG9JZCBpcyByZWFjaGFibGUgZnJvbSBmcm9tSWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzUmVhY2hhYmxlKFxuICBncmFwaDogR3JhcGhTdG9yZUxpa2UsXG4gIGZyb21JZDogc3RyaW5nLFxuICB0b0lkOiBzdHJpbmdcbik6IGJvb2xlYW4ge1xuICBjb25zdCBwYXRoID0gZmluZFNob3J0ZXN0UGF0aChncmFwaCwgZnJvbUlkLCB0b0lkKTtcbiAgcmV0dXJuIHBhdGggIT09IG51bGw7XG59XG5cbi8qKlxuICogR2V0IGFsbCBub2RlcyBhdCBhIHNwZWNpZmljIGRlcHRoIGZyb20gYSBzdGFydGluZyBub2RlLlxuICogXG4gKiBAcGFyYW0gZ3JhcGggLSBHcmFwaCBzdG9yZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtIG5vZGVJZCAtIFN0YXJ0aW5nIG5vZGUgSURcbiAqIEBwYXJhbSBkZXB0aCAtIFRhcmdldCBkZXB0aCAoMSA9IGRpcmVjdCBkZXBlbmRlbmNpZXMpXG4gKiBAcmV0dXJucyBBcnJheSBvZiBub2RlIElEcyBhdCB0aGUgc3BlY2lmaWVkIGRlcHRoXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXROb2Rlc0F0RGVwdGgoXG4gIGdyYXBoOiBHcmFwaFN0b3JlTGlrZSxcbiAgbm9kZUlkOiBzdHJpbmcsXG4gIGRlcHRoOiBudW1iZXJcbik6IHN0cmluZ1tdIHtcbiAgaWYgKGRlcHRoID09PSAwKSB7XG4gICAgcmV0dXJuIFtub2RlSWRdO1xuICB9XG4gIFxuICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgXG4gIGNvbnN0IHF1ZXVlOiBBcnJheTx7IGlkOiBzdHJpbmc7IGN1cnJlbnREZXB0aDogbnVtYmVyIH0+ID0gW107XG4gIHF1ZXVlLnB1c2goeyBpZDogbm9kZUlkLCBjdXJyZW50RGVwdGg6IDAgfSk7XG4gIHZpc2l0ZWQuYWRkKG5vZGVJZCk7XG4gIFxuICB3aGlsZSAocXVldWUubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IHsgaWQsIGN1cnJlbnREZXB0aCB9ID0gcXVldWUuc2hpZnQoKSE7XG4gICAgXG4gICAgaWYgKGN1cnJlbnREZXB0aCA9PT0gZGVwdGgpIHtcbiAgICAgIHJlc3VsdC5wdXNoKGlkKTtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBcbiAgICBpZiAoY3VycmVudERlcHRoID4gZGVwdGgpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBcbiAgICBjb25zdCBkb3duc3RyZWFtRWRnZXMgPSBncmFwaC5nZXREb3duc3RyZWFtRWRnZXMoaWQpO1xuICAgIFxuICAgIGZvciAoY29uc3QgZWRnZSBvZiBkb3duc3RyZWFtRWRnZXMpIHtcbiAgICAgIGlmICghdmlzaXRlZC5oYXMoZWRnZS50bykpIHtcbiAgICAgICAgdmlzaXRlZC5hZGQoZWRnZS50byk7XG4gICAgICAgIHF1ZXVlLnB1c2goe1xuICAgICAgICAgIGlkOiBlZGdlLnRvLFxuICAgICAgICAgIGN1cnJlbnREZXB0aDogY3VycmVudERlcHRoICsgMSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4gcmVzdWx0O1xufVxuIl19