import { describe, it, expect } from '@jest/globals';
import {
  calculateBlastRadius,
  calculateUpstreamDependencies,
  findAllPaths,
  findShortestPath,
  isReachable,
  getNodesAtDepth,
  type GraphStoreLike,
} from '../traversal';
import type { GraphNode, TraceEdge } from '../types';

// ============================================================================
// Mock Graph Store
// ============================================================================

function createMockGraph(
  nodes: { id: string; type: string; name: string }[],
  edges: { from: string; to: string; relation?: string }[]
): GraphStoreLike {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap: Map<string, TraceEdge[]> = new Map();
  const nodeEdges: Map<string, TraceEdge[]> = new Map();

  for (const n of nodes) {
    nodeMap.set(n.id, {
      id: n.id,
      type: n.type as any,
      name: n.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    nodeEdges.set(n.id, []);
  }

  let edgeId = 0;
  for (const e of edges) {
    const edge: TraceEdge = {
      id: `edge-${edgeId++}`,
      from: e.from,
      to: e.to,
      relation: (e.relation as any) || 'DEPENDS_ON',
      ts: Date.now(),
    };

    if (!nodeEdges.has(e.from)) {
      nodeEdges.set(e.from, []);
    }
    nodeEdges.get(e.from)!.push(edge);
  }

  return {
    getNode(id: string) {
      return nodeMap.get(id) || null;
    },
    getDownstreamEdges(nodeId: string) {
      return nodeEdges.get(nodeId) || [];
    },
    getNodeType(nodeId: string) {
      return nodeMap.get(nodeId)?.type || '';
    },
  };
}

describe('Graph Traversal - Extended', () => {
  // ============================================================================
  // calculateUpstreamDependencies
  // ============================================================================

  describe('calculateUpstreamDependencies', () => {
    it('should find upstream dependencies via getUpstreamEdges on custom store', () => {
      // Since GraphStoreLike doesn't have getUpstreamEdges, a custom store
      // that provides it should be used by duck typing.
      const edges: Record<string, TraceEdge[]> = {
        A: [{ id: 'e1', from: 'B', to: 'A', relation: 'DEPENDS_ON', ts: Date.now() }],
        B: [{ id: 'e2', from: 'C', to: 'B', relation: 'DEPENDS_ON', ts: Date.now() }],
        C: [],
      };

      const customGraph: GraphStoreLike & { getUpstreamEdges(nodeId: string): TraceEdge[] } = {
        getNode(id: string) {
          return { id, type: 'Role', name: id, createdAt: Date.now(), updatedAt: Date.now() };
        },
        getDownstreamEdges(nodeId: string) {
          return [];
        },
        getNodeType(nodeId: string) {
          return 'Role';
        },
        getUpstreamEdges(nodeId: string) {
          return edges[nodeId] || [];
        },
      };

      const upstreamA = calculateUpstreamDependencies(customGraph, 'A');
      expect(upstreamA).toContain('B');

      const upstreamB = calculateUpstreamDependencies(customGraph, 'B');
      expect(upstreamB).toContain('C');

      const upstreamC = calculateUpstreamDependencies(customGraph, 'C');
      expect(upstreamC).toHaveLength(0);
    });

    it('should respect maxDepth', () => {
      const edges: Record<string, TraceEdge[]> = {
        A: [{ id: 'e1', from: 'B', to: 'A', relation: 'DEPENDS_ON', ts: Date.now() }],
        B: [{ id: 'e2', from: 'C', to: 'B', relation: 'DEPENDS_ON', ts: Date.now() }],
        C: [{ id: 'e3', from: 'D', to: 'C', relation: 'DEPENDS_ON', ts: Date.now() }],
        D: [],
      };

      const customGraph: GraphStoreLike & { getUpstreamEdges(nodeId: string): TraceEdge[] } = {
        getNode(id: string) {
          return { id, type: 'Role', name: id, createdAt: Date.now(), updatedAt: Date.now() };
        },
        getDownstreamEdges() {
          return [];
        },
        getNodeType() {
          return 'Role';
        },
        getUpstreamEdges(nodeId: string) {
          return edges[nodeId] || [];
        },
      };

      const upstream = calculateUpstreamDependencies(customGraph, 'A', 2);
      // A's upstream: B (depth 1) -> C (depth 2). D is depth 3, excluded.
      expect(upstream).toContain('B');
      expect(upstream).toContain('C');
      expect(upstream).not.toContain('D');
    });

    it('should handle nodes with no upstream', () => {
      const graph = createMockGraph(
        [{ id: 'A', type: 'Role', name: 'A' }],
        []
      );

      const upstream = calculateUpstreamDependencies(graph, 'A');
      expect(upstream).toHaveLength(0);
    });

    it('should use getUpstreamEdges if available on the store', () => {
      const edge: TraceEdge = {
        id: 'upstream-1',
        from: 'dep-A',
        to: 'target',
        relation: 'DEPENDS_ON',
        ts: Date.now(),
      };

      const customGraph: GraphStoreLike & { getUpstreamEdges(nodeId: string): TraceEdge[] } = {
        getNode(id: string) {
          return { id, type: 'Role', name: id, createdAt: Date.now(), updatedAt: Date.now() };
        },
        getDownstreamEdges() {
          return [];
        },
        getNodeType() {
          return 'Role';
        },
        getUpstreamEdges(nodeId: string) {
          return nodeId === 'target' ? [edge] : [];
        },
      };

      const upstream = calculateUpstreamDependencies(customGraph, 'target');
      expect(upstream).toContain('dep-A');
    });
  });

  // ============================================================================
  // findAllPaths
  // ============================================================================

  describe('findAllPaths', () => {
    it('should find all paths between two nodes', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
          { id: 'C', type: 'APIContract', name: 'C' },
          { id: 'D', type: 'DBSchema', name: 'D' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
          { from: 'B', to: 'D' },
          { from: 'C', to: 'D' },
        ]
      );

      const paths = findAllPaths(graph, 'A', 'D');
      expect(paths.length).toBe(2);
      expect(paths).toContainEqual(['A', 'B', 'D']);
      expect(paths).toContainEqual(['A', 'C', 'D']);
    });

    it('should return empty array when no path exists', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
        ],
        []
      );

      const paths = findAllPaths(graph, 'A', 'B');
      expect(paths).toHaveLength(0);
    });

    it('should limit results to maxPaths', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
          { id: 'C', type: 'APIContract', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
          { from: 'B', to: 'C' },
        ]
      );

      const paths = findAllPaths(graph, 'A', 'C', 1);
      expect(paths.length).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // findShortestPath
  // ============================================================================

  describe('findShortestPath', () => {
    it('should find the shortest path using BFS', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
          { id: 'C', type: 'APIContract', name: 'C' },
          { id: 'D', type: 'DBSchema', name: 'D' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'D' },
          { from: 'A', to: 'C' },
          { from: 'C', to: 'B' },
          { from: 'B', to: 'C' },
        ]
      );

      const path = findShortestPath(graph, 'A', 'D');
      expect(path).not.toBeNull();
      expect(path![0]).toBe('A');
      expect(path![path!.length - 1]).toBe('D');
      // Shortest: A -> B -> D (length 3)
      expect(path!.length).toBe(3);
    });

    it('should return null when no path exists', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
        ],
        []
      );

      expect(findShortestPath(graph, 'A', 'B')).toBeNull();
    });

    it('should return single-element array for same node', () => {
      const graph = createMockGraph(
        [{ id: 'A', type: 'Role', name: 'A' }],
        []
      );

      const path = findShortestPath(graph, 'A', 'A');
      expect(path).toEqual(['A']);
    });
  });

  // ============================================================================
  // isReachable
  // ============================================================================

  describe('isReachable', () => {
    it('should return true when path exists', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
        ],
        [{ from: 'A', to: 'B' }]
      );

      expect(isReachable(graph, 'A', 'B')).toBe(true);
    });

    it('should return false when no path exists', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
        ],
        []
      );

      expect(isReachable(graph, 'A', 'B')).toBe(false);
    });
  });

  // ============================================================================
  // getNodesAtDepth
  // ============================================================================

  describe('getNodesAtDepth', () => {
    it('should return the starting node at depth 0', () => {
      const graph = createMockGraph(
        [{ id: 'A', type: 'Role', name: 'A' }],
        []
      );

      const nodes = getNodesAtDepth(graph, 'A', 0);
      expect(nodes).toEqual(['A']);
    });

    it('should return direct dependencies at depth 1', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
          { id: 'C', type: 'APIContract', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'A', to: 'C' },
        ]
      );

      const nodes = getNodesAtDepth(graph, 'A', 1);
      expect(nodes).toContain('B');
      expect(nodes).toContain('C');
      expect(nodes.length).toBe(2);
    });

    it('should return empty array when depth exceeds graph', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
        ],
        [{ from: 'A', to: 'B' }]
      );

      const nodes = getNodesAtDepth(graph, 'A', 5);
      expect(nodes).toHaveLength(0);
    });

    it('should return nodes at depth 2 in a chain', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
          { id: 'C', type: 'APIContract', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
        ]
      );

      const nodes = getNodesAtDepth(graph, 'A', 2);
      expect(nodes).toEqual(['C']);
    });
  });

  // ============================================================================
  // calculateBlastRadius (existing function, verifying with mock)
  // ============================================================================

  describe('calculateBlastRadius', () => {
    it('should calculate impact for a chain graph', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
          { id: 'C', type: 'APIContract', name: 'C' },
          { id: 'D', type: 'DBSchema', name: 'D' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
          { from: 'C', to: 'D' },
        ]
      );

      const result = calculateBlastRadius(graph, 'A');
      expect(result.totalBlastRadius).toBe(3);
      expect(result.directImpact).toBe(1);
      expect(result.indirectImpact).toBe(2);
    });

    it('should identify critical path nodes', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'APIContract', name: 'B' },
          { id: 'C', type: 'DBSchema', name: 'C' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
        ]
      );

      const result = calculateBlastRadius(graph, 'A');
      // APIContract and DBSchema are critical types
      expect(result.criticalPath.length).toBeGreaterThan(0);
    });

    it('should respect maxDepth', () => {
      const graph = createMockGraph(
        [
          { id: 'A', type: 'Role', name: 'A' },
          { id: 'B', type: 'Service', name: 'B' },
          { id: 'C', type: 'Service', name: 'C' },
          { id: 'D', type: 'Service', name: 'D' },
        ],
        [
          { from: 'A', to: 'B' },
          { from: 'B', to: 'C' },
          { from: 'C', to: 'D' },
        ]
      );

      const result = calculateBlastRadius(graph, 'A', 1);
      expect(result.directImpact).toBe(1);
      expect(result.totalBlastRadius).toBe(1);
    });
  });
});
