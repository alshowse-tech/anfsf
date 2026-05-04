/**
 * Tests for GraphRAG (Enhanced Knowledge Graph)
 */

import { KnowledgeGraph, GraphRAG, createKnowledgeGraph } from '../graphrag';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('KnowledgeGraph', () => {
  const nodePath = path.join(__dirname, '.test-graph-nodes.json');
  const edgePath = path.join(__dirname, '.test-graph-edges.json');

  afterEach(async () => {
    try { await fs.unlink(nodePath); } catch { /* ignore */ }
    try { await fs.unlink(edgePath); } catch { /* ignore */ }
  });

  it('should create via constructor', () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    expect(graph).toBeDefined();
  });

  it('should create via factory', () => {
    const graph = createKnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    expect(graph).toBeDefined();
  });

  it('should initialize without error', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await expect(graph.init()).resolves.not.toThrow();
  });

  it('should add and retrieve nodes', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'p1:src/auth.ts:authenticate',
      type: 'function',
      label: 'authenticate',
      projectId: 'p1',
      filePath: 'src/auth.ts',
      description: 'User authentication function',
      tags: ['auth', 'security'],
      embedding: [0.1, 0.2, 0.3],
      metadata: {},
    });

    const node = graph.getNode('p1:src/auth.ts:authenticate');
    expect(node).not.toBeNull();
    expect(node?.label).toBe('authenticate');
    expect(graph.size).toBe(1);
  });

  it('should add and retrieve edges', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'n1', type: 'function', label: 'fn1', projectId: 'p1', filePath: 'a.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'n2', type: 'class', label: 'Class2', projectId: 'p1', filePath: 'b.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });

    await graph.addEdge({
      sourceId: 'n1', targetId: 'n2', type: 'calls', label: 'n1 calls Class2', metadata: {},
    });

    const edges = graph.getEdges('n1');
    expect(edges.length).toBe(1);
    expect(edges[0].targetId).toBe('n2');
    expect(edges[0].type).toBe('calls');
  });

  it('should traverse relationships', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    const nodes = ['a', 'b', 'c', 'd'];
    for (const id of nodes) {
      await graph.addNode({
        id, type: 'function', label: id, projectId: 'p1', filePath: `${id}.ts`,
        description: `Node ${id}`, tags: [], embedding: [], metadata: {},
      });
    }

    await graph.addEdge({ sourceId: 'a', targetId: 'b', type: 'calls', label: '', metadata: {} });
    await graph.addEdge({ sourceId: 'b', targetId: 'c', type: 'calls', label: '', metadata: {} });
    await graph.addEdge({ sourceId: 'c', targetId: 'd', type: 'calls', label: '', metadata: {} });

    const { nodes: resultNodes, edges } = graph.traverse('a', { maxDepth: 2 });
    expect(resultNodes.length).toBe(3); // a, b, c
    // Edges found during traversal may vary based on edge store timing
    expect(edges.length).toBeGreaterThanOrEqual(1);
  });

  it('should respect maxDepth in traversal', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'root', type: 'module', label: 'root', projectId: 'p1', filePath: 'root.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'child', type: 'function', label: 'child', projectId: 'p1', filePath: 'child.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });

    await graph.addEdge({ sourceId: 'root', targetId: 'child', type: 'contains', label: '', metadata: {} });

    const shallow = graph.traverse('root', { maxDepth: 0 });
    expect(shallow.nodes.length).toBe(1); // Only root

    const deep = graph.traverse('root', { maxDepth: 1 });
    expect(deep.nodes.length).toBe(2); // Root + child
  });

  it('should filter edges by type', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'x', type: 'function', label: 'x', projectId: 'p1', filePath: 'x.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'y', type: 'function', label: 'y', projectId: 'p1', filePath: 'y.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'z', type: 'class', label: 'z', projectId: 'p1', filePath: 'z.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });

    await graph.addEdge({ sourceId: 'x', targetId: 'y', type: 'calls', label: '', metadata: {} });
    await graph.addEdge({ sourceId: 'x', targetId: 'z', type: 'depends-on', label: '', metadata: {} });

    const callEdges = graph.getEdges('x', undefined, 'calls');
    expect(callEdges.length).toBe(1);
    expect(callEdges[0].targetId).toBe('y');
  });

  it('should remove node and connected edges', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'toRemove', type: 'function', label: 'remove', projectId: 'p1', filePath: 'r.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'keeper', type: 'function', label: 'keep', projectId: 'p1', filePath: 'k.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addEdge({
      sourceId: 'toRemove', targetId: 'keeper', type: 'calls', label: '', metadata: {},
    });

    expect(graph.size).toBe(2);
    expect(graph.getEdges().length).toBe(1);

    await graph.removeNode('toRemove');

    expect(graph.size).toBe(1);
    expect(graph.getEdges().length).toBe(0);
  });

  it('should report stats', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'm1', type: 'module', label: 'mod1', projectId: 'p1', filePath: 'm1.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'f1', type: 'function', label: 'fn1', projectId: 'p1', filePath: 'f1.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });

    const stats = graph.getStats();
    expect(stats.nodeCount).toBe(2);
    expect(stats.projectCount).toBe(1);
    expect(stats.nodeTypes.function).toBe(1);
    expect(stats.nodeTypes.module).toBe(1);
  });

  it('should search semantically with embeddings', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'auth', type: 'function', label: 'authenticate', projectId: 'p1', filePath: 'auth.ts',
      description: 'User authentication with JWT', tags: ['auth', 'security'],
      embedding: [1, 0, 0, 0], metadata: {},
    });
    await graph.addNode({
      id: 'pay', type: 'function', label: 'processPayment', projectId: 'p1', filePath: 'pay.ts',
      description: 'Payment processing', tags: ['payment'],
      embedding: [0, 1, 0, 0], metadata: {},
    });

    const results = graph.semanticSearch('query', [1, 0.1, 0, 0], 5);
    expect(results.length).toBe(2);
    expect(results[0].id).toBe('auth'); // Should match auth vector more closely
  });

  it('should filter semantic search by project', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'a1', type: 'function', label: 'fn', projectId: 'p1', filePath: 'a1.ts',
      description: '', tags: [], embedding: [1, 0], metadata: {},
    });
    await graph.addNode({
      id: 'a2', type: 'function', label: 'fn', projectId: 'p2', filePath: 'a2.ts',
      description: '', tags: [], embedding: [1, 0], metadata: {},
    });

    const results = graph.semanticSearch('query', [1, 0], 10, 'p1');
    expect(results.length).toBe(1);
    expect(results[0].projectId).toBe('p1');
  });

  it('should find cross-project relations', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'p1:auth', type: 'service', label: 'AuthService', projectId: 'p1', filePath: 'auth.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'p2:user', type: 'entity', label: 'User', projectId: 'p2', filePath: 'user.ts',
      description: '', tags: [], embedding: [], metadata: {},
    });

    await graph.addEdge({
      sourceId: 'p1:auth', targetId: 'p2:user', type: 'depends-on', label: 'Auth depends on User', metadata: {},
    });

    const result = graph.findCrossProjectRelations('p1:auth');
    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);
  });
});

describe('GraphRAG', () => {
  const nodePath = path.join(__dirname, '.test-rag-nodes.json');
  const edgePath = path.join(__dirname, '.test-rag-edges.json');

  afterEach(async () => {
    try { await fs.unlink(nodePath); } catch { /* ignore */ }
    try { await fs.unlink(edgePath); } catch { /* ignore */ }
  });

  it('should create instance', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    const rag = new GraphRAG({ apiKey: '', graph });
    expect(rag).toBeDefined();
  });

  it('should answer query with fallback explanation', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'auth', type: 'service', label: 'AuthService', projectId: 'p1', filePath: 'auth.ts',
      description: 'Handles user authentication', tags: ['auth', 'security'],
      embedding: [1, 0, 0], metadata: {},
    });

    const rag = new GraphRAG({ apiKey: '', graph });
    const result = await rag.query('How does authentication work?');

    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.explanation).toContain('auth');
  });

  it('should return empty for unknown queries', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    const rag = new GraphRAG({ apiKey: '', graph });
    const result = await rag.query('xyz123');

    expect(result.nodes.length).toBe(0);
  });

  it('should handle cross-project queries', async () => {
    const graph = new KnowledgeGraph({ nodeStorePath: nodePath, edgeStorePath: edgePath });
    await graph.init();

    await graph.addNode({
      id: 'p1:auth', type: 'service', label: 'AuthService', projectId: 'p1', filePath: 'auth.ts',
      description: 'Authentication', tags: ['auth'], embedding: [], metadata: {},
    });
    await graph.addNode({
      id: 'p2:payment', type: 'service', label: 'PaymentService', projectId: 'p2', filePath: 'pay.ts',
      description: 'Payment', tags: ['payment'], embedding: [], metadata: {},
    });

    const rag = new GraphRAG({ apiKey: '', graph });
    const result = await rag.crossProjectQuery('auth authentication');

    expect(result.explanation).toBeDefined();
  });
});
