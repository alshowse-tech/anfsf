/**
 * ASF V4.0 Graph Kernel - Traversal Tests
 * 
 * Unit tests for blast radius and graph traversal algorithms.
 * Version: v0.8.5
 */

import { describe, it, expect } from '@jest/globals';
import { calculateBlastRadius, findShortestPath, getNodesAtDepth } from '../traversal';
import type { GraphNode, TraceEdge } from '../types';

/**
 * Mock graph store for testing.
 */
class MockGraphStore {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, TraceEdge[]>;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
  }

  addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
  }

  addEdge(edge: TraceEdge): void {
    const existing = this.edges.get(edge.from) || [];
    existing.push(edge);
    this.edges.set(edge.from, existing);
  }

  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) || null;
  }

  getDownstreamEdges(nodeId: string): TraceEdge[] {
    return this.edges.get(nodeId) || [];
  }

  getNodeType(nodeId: string): string {
    return this.nodes.get(nodeId)?.type || 'Unknown';
  }
}

describe('calculateBlastRadius', () => {
  it('should calculate blast radius for a simple chain', () => {
    const graph = new MockGraphStore();
    
    // Create chain: A -> B -> C -> D
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'B', type: 'APIContract', name: 'B', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'C', type: 'DBSchema', name: 'C', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'D', type: 'Service', name: 'D', createdAt: 0, updatedAt: 0 });

    graph.addEdge({ id: 'e1', from: 'A', to: 'B', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e2', from: 'B', to: 'C', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e3', from: 'C', to: 'D', relation: 'DEPENDS_ON', ts: 0 });

    const result = calculateBlastRadius(graph as any, 'A', 5);

    expect(result.totalBlastRadius).toBe(3);
    expect(result.directImpact).toBe(1);
    expect(result.indirectImpact).toBe(2);
    expect(result.impactedNodes).toEqual(['B', 'C', 'D']);
    expect(result.criticalPath).toContain('B'); // APIContract
    expect(result.criticalPath).toContain('C'); // DBSchema
  });

  it('should respect max depth', () => {
    const graph = new MockGraphStore();
    
    // Create chain: A -> B -> C -> D
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'B', type: 'Service', name: 'B', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'C', type: 'Service', name: 'C', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'D', type: 'Service', name: 'D', createdAt: 0, updatedAt: 0 });

    graph.addEdge({ id: 'e1', from: 'A', to: 'B', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e2', from: 'B', to: 'C', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e3', from: 'C', to: 'D', relation: 'DEPENDS_ON', ts: 0 });

    const result = calculateBlastRadius(graph as any, 'A', 2);

    expect(result.totalBlastRadius).toBe(2);
    expect(result.impactedNodes).toEqual(['B', 'C']);
    expect(result.maxDepth).toBe(2);
  });

  it('should handle node with no downstream dependencies', () => {
    const graph = new MockGraphStore();
    
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });

    const result = calculateBlastRadius(graph as any, 'A', 5);

    expect(result.totalBlastRadius).toBe(0);
    expect(result.directImpact).toBe(0);
    expect(result.indirectImpact).toBe(0);
  });

  it('should identify critical path nodes', () => {
    const graph = new MockGraphStore();
    
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'B', type: 'DBSchema', name: 'B', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'C', type: 'Service', name: 'C', createdAt: 0, updatedAt: 0 });

    graph.addEdge({ id: 'e1', from: 'A', to: 'B', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e2', from: 'B', to: 'C', relation: 'DEPENDS_ON', ts: 0 });

    const result = calculateBlastRadius(graph as any, 'A', 5);

    expect(result.criticalPath).toContain('B');
  });
});

describe('findShortestPath', () => {
  it('should find shortest path in a graph', () => {
    const graph = new MockGraphStore();
    
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'B', type: 'Service', name: 'B', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'C', type: 'Service', name: 'C', createdAt: 0, updatedAt: 0 });

    graph.addEdge({ id: 'e1', from: 'A', to: 'B', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e2', from: 'B', to: 'C', relation: 'DEPENDS_ON', ts: 0 });

    const path = findShortestPath(graph as any, 'A', 'C');

    expect(path).toEqual(['A', 'B', 'C']);
  });

  it('should return null when no path exists', () => {
    const graph = new MockGraphStore();
    
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'B', type: 'Service', name: 'B', createdAt: 0, updatedAt: 0 });

    const path = findShortestPath(graph as any, 'A', 'B');

    expect(path).toBeNull();
  });

  it('should return single node path when from === to', () => {
    const graph = new MockGraphStore();
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });

    const path = findShortestPath(graph as any, 'A', 'A');

    expect(path).toEqual(['A']);
  });
});

describe('getNodesAtDepth', () => {
  it('should get nodes at specific depth', () => {
    const graph = new MockGraphStore();
    
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'B', type: 'Service', name: 'B', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'C', type: 'Service', name: 'C', createdAt: 0, updatedAt: 0 });
    graph.addNode({ id: 'D', type: 'Service', name: 'D', createdAt: 0, updatedAt: 0 });

    graph.addEdge({ id: 'e1', from: 'A', to: 'B', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e2', from: 'A', to: 'C', relation: 'DEPENDS_ON', ts: 0 });
    graph.addEdge({ id: 'e3', from: 'B', to: 'D', relation: 'DEPENDS_ON', ts: 0 });

    const depth1 = getNodesAtDepth(graph as any, 'A', 1);
    expect(depth1).toEqual(['B', 'C']);

    const depth2 = getNodesAtDepth(graph as any, 'A', 2);
    expect(depth2).toEqual(['D']);
  });

  it('should return starting node at depth 0', () => {
    const graph = new MockGraphStore();
    graph.addNode({ id: 'A', type: 'Service', name: 'A', createdAt: 0, updatedAt: 0 });

    const result = getNodesAtDepth(graph as any, 'A', 0);

    expect(result).toEqual(['A']);
  });
});
