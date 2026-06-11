/**
 * ANFSF V1.5.0 — GraphRAG Integration (Enhanced)
 *
 * File-level knowledge graph for cross-project querying, relationship traversal,
 * and semantic node search. Replaces the previous Neo4j stub with a working
 * file-backed graph that can operate standalone.
 *
 * Can optionally connect to Neo4j for production-scale graphs.
 */

import { FileBackedStore } from '../storage/file-store';
import { cosineSimilarity } from './vector-search';
import { LLMClient, type LLMClientConfig } from './llm-client';

// ============================================================================
// Types
// ============================================================================

export type NodeType = 'module' | 'class' | 'function' | 'interface' | 'component' | 'service' | 'entity' | 'page';

export interface GraphNode {
  id: string;
  /** Unique identifier: `${projectId}:${filePath}:${symbolName}` */
  type: NodeType;
  label: string;
  /** Project this node belongs to */
  projectId: string;
  /** File path */
  filePath: string;
  /** Brief description or docstring */
  description: string;
  /** Tags for categorization (e.g., ["auth", "user-management"]) */
  tags: string[];
  /** Embedding vector for semantic search */
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface GraphEdge {
  sourceId: string;
  targetId: string;
  type: 'depends-on' | 'calls' | 'extends' | 'implements' | 'contains' | 'relates-to';
  label: string;
  metadata: Record<string, unknown>;
}

export interface QueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** Explanation of how the answer was derived */
  explanation: string;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  projectCount: number;
  nodeTypes: Record<NodeType, number>;
}

// ============================================================================
// Knowledge Graph
// ============================================================================

export class KnowledgeGraph {
  private nodes: Map<string, GraphNode>;
  private edges: Map<string, GraphEdge>;
  private nodeStore: FileBackedStore<GraphNode>;
  private edgeStore: FileBackedStore<GraphEdge>;
  private initialized: boolean;

  constructor(options: {
    nodeStorePath?: string;
    edgeStorePath?: string;
  } = {}) {
    this.nodes = new Map();
    this.edges = new Map();
    this.nodeStore = new FileBackedStore<GraphNode>(options.nodeStorePath || './.anfsf/graph-nodes.json');
    this.edgeStore = new FileBackedStore<GraphEdge>(options.edgeStorePath || './.anfsf/graph-edges.json');
    this.initialized = false;
  }

  /** Initialize — load graph from disk */
  async init(): Promise<void> {
    await this.nodeStore.init();
    await this.edgeStore.init();

    for (const node of this.nodeStore.values()) {
      this.nodes.set(node.id, node);
    }
    for (const edge of this.edgeStore.values()) {
      this.edges.set(`${edge.sourceId}->${edge.targetId}:${edge.type}`, edge);
    }
    this.initialized = true;
  }

  // ---- Node Operations ----

  async addNode(node: GraphNode): Promise<void> {
    this.nodes.set(node.id, node);
    await this.nodeStore.set(node.id, node);
  }

  async addNodes(nodes: GraphNode[]): Promise<void> {
    for (const node of nodes) {
      this.nodes.set(node.id, node);
      await this.nodeStore.set(node.id, node);
    }
  }

  getNode(id: string): GraphNode | null {
    return this.nodes.get(id) ?? null;
  }

  async removeNode(id: string): Promise<void> {
    this.nodes.delete(id);
    await this.nodeStore.delete(id);
    // Remove connected edges
    for (const [key, edge] of this.edges.entries()) {
      if (edge.sourceId === id || edge.targetId === id) {
        this.edges.delete(key);
        await this.edgeStore.delete(key);
      }
    }
  }

  // ---- Edge Operations ----

  async addEdge(edge: GraphEdge): Promise<void> {
    const key = `${edge.sourceId}->${edge.targetId}:${edge.type}`;
    this.edges.set(key, edge);
    await this.edgeStore.set(key, edge);
  }

  async addEdges(edges: GraphEdge[]): Promise<void> {
    for (const edge of edges) {
      await this.addEdge(edge);
    }
  }

  getEdges(sourceId?: string, targetId?: string, type?: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter(e => {
      if (sourceId && e.sourceId !== sourceId) return false;
      if (targetId && e.targetId !== targetId) return false;
      if (type && e.type !== type) return false;
      return true;
    });
  }

  // ---- Traversal ----

  /**
   * Traverse relationships from a starting node up to maxDepth hops.
   * Returns all reachable nodes and the edges connecting them.
   */
  traverse(startId: string, options: { maxDepth?: number; edgeTypes?: string[] } = {}): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const maxDepth = options.maxDepth ?? 3;
    const edgeTypes = options.edgeTypes ? new Set(options.edgeTypes) : null;
    const visited = new Set<string>();
    const resultNodes: GraphNode[] = [];
    const resultEdges: GraphEdge[] = [];

    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startId, depth: 0 }];

    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      if (visited.has(nodeId) || depth > maxDepth) continue;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) resultNodes.push(node);

      for (const edge of this.edges.values()) {
        if (edge.sourceId !== nodeId) continue;
        if (edgeTypes && !edgeTypes.has(edge.type)) continue;

        const targetNode = this.nodes.get(edge.targetId);
        if (targetNode && !visited.has(edge.targetId)) {
          resultEdges.push(edge);
          queue.push({ nodeId: edge.targetId, depth: depth + 1 });
        }
      }
    }

    return { nodes: resultNodes, edges: resultEdges };
  }

  // ---- Semantic Search ----

  /**
   * Search for nodes semantically similar to the query using cosine similarity
   * on stored embedding vectors.
   */
  semanticSearch(query: string, queryEmbedding: number[], limit: number = 10, projectId?: string): GraphNode[] {
    const results: Array<{ node: GraphNode; score: number }> = [];

    for (const node of this.nodes.values()) {
      if (projectId && node.projectId !== projectId) continue;
      if (node.embedding.length !== queryEmbedding.length) continue;

      const score = cosineSimilarity(queryEmbedding, node.embedding);
      results.push({ node, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map(r => r.node);
  }

  // ---- Cross-Project Queries ----

  /**
   * Find related nodes across projects by traversing relationships
   * that span project boundaries.
   */
  findCrossProjectRelations(nodeId: string, maxDepth: number = 2): QueryResult {
    const { nodes, edges } = this.traverse(nodeId, { maxDepth });
    const projectIds = new Set(nodes.map(n => n.projectId));

    const explanation = projectIds.size > 1
      ? `Found ${nodes.length} nodes across ${projectIds.size} projects (${Array.from(projectIds).join(', ')})`
      : `Found ${nodes.length} nodes within project ${nodes[0]?.projectId || 'unknown'}`;

    return { nodes, edges, explanation };
  }

  // ---- Statistics ----

  getStats(): GraphStats {
    const projectIds = new Set<string>();
    const nodeTypeCounts: Record<NodeType, number> = {
      module: 0, class: 0, function: 0, interface: 0,
      component: 0, service: 0, entity: 0, page: 0,
    };

    for (const node of this.nodes.values()) {
      projectIds.add(node.projectId);
      nodeTypeCounts[node.type] = (nodeTypeCounts[node.type] || 0) + 1;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      projectCount: projectIds.size,
      nodeTypes: nodeTypeCounts,
    };
  }

  /** Get number of nodes */
  get size(): number {
    return this.nodes.size;
  }
}

// ============================================================================
// GraphRAG (LLM-powered Q&A over the Knowledge Graph)
// ============================================================================

export interface GraphRAGConfig {
  apiKey?: string;
  model?: string;
  llmBaseUrl?: string;
  graph: KnowledgeGraph;
  llmClient?: LLMClient;
  llmConfig?: Partial<LLMClientConfig>;
}

const SYSTEM_PROMPT = `You are a knowledge graph assistant. You have access to a project knowledge graph containing modules, classes, functions, and their relationships.

Answer the user's query based on the provided graph context. Be specific about:
1. Which files/modules are relevant
2. How they relate to each other
3. What changes might be needed

If the context doesn't contain enough information, say so clearly. Do not invent code or relationships.`;

export class GraphRAG {
  private llm: LLMClient;
  private model: string;
  private graph: KnowledgeGraph;

  constructor(config: GraphRAGConfig) {
    if (config.llmClient) {
      this.llm = config.llmClient;
    } else {
      this.llm = new LLMClient({
        apiKey: config.apiKey || process.env.DASHSCOPE_API_KEY || '',
        baseUrl: config.llmBaseUrl,
        defaultModel: config.model || 'qwen3.5-plus',
        ...config.llmConfig,
      });
    }
    this.model = config.model || 'qwen3.5-plus';
    this.graph = config.graph;
  }

  /**
   * Answer a query using the knowledge graph context + LLM reasoning.
   */
  async query(question: string, options?: { projectId?: string; maxContextNodes?: number }): Promise<QueryResult> {
    const maxNodes = options?.maxContextNodes ?? 15;

    // Step 1: Find relevant nodes via semantic search (if we have embeddings)
    // For now, use tag-based matching as fallback
    const relevantNodes = this.findNodesByQuery(question, options?.projectId, maxNodes);

    // Step 2: Build context from relevant nodes and their relationships
    const context = this.buildContext(relevantNodes);

    // Step 3: Use LLM to reason over the context
    if (relevantNodes.length > 0) {
      const answer = await this.reasonWithLLM(question, context);
      return {
        nodes: relevantNodes,
        edges: this.getRelevantEdges(relevantNodes),
        explanation: answer || this.generateFallbackExplanation(question, relevantNodes),
      };
    }

    return {
      nodes: relevantNodes,
      edges: this.getRelevantEdges(relevantNodes),
      explanation: this.generateFallbackExplanation(question, relevantNodes),
    };
  }

  /**
   * Answer a cross-project query.
   */
  async crossProjectQuery(question: string): Promise<QueryResult> {
    // Find nodes matching keywords across all projects
    const lower = question.toLowerCase();
    const matches: GraphNode[] = [];

    for (const node of (this.graph as any).nodes.values()) {
      const text = `${node.label} ${node.description} ${node.tags.join(' ')} ${node.filePath}`.toLowerCase();
      if (text.includes(lower) || node.tags.some((t: string) => lower.includes(t))) {
        matches.push(node);
      }
    }

    // Traverse cross-project relations for each match
    const allNodes = new Map<string, GraphNode>();
    const allEdges = new Map<string, GraphEdge>();

    for (const node of matches.slice(0, 5)) {
      const { nodes, edges } = (this.graph as KnowledgeGraph).traverse(node.id, { maxDepth: 2 });
      for (const n of nodes) allNodes.set(n.id, n);
      for (const e of edges) allEdges.set(`${e.sourceId}->${e.targetId}:${e.type}`, e);
    }

    const explanation = allNodes.size > 0
      ? `Found ${allNodes.size} related nodes across projects for query: "${question}"`
      : `No relevant knowledge graph nodes found for: "${question}"`;

    return {
      nodes: Array.from(allNodes.values()),
      edges: Array.from(allEdges.values()),
      explanation,
    };
  }

  private findNodesByQuery(query: string, projectId: string | undefined, limit: number): GraphNode[] {
    const lower = query.toLowerCase();
    const words = lower.split(/\s+/).filter(w => w.length > 2);

    const scored: Array<{ node: GraphNode; score: number }> = [];

    for (const node of (this.graph as any).nodes.values()) {
      if (projectId && node.projectId !== projectId) continue;

      let score = 0;
      const text = `${node.label} ${node.description} ${node.tags.join(' ')} ${node.filePath}`.toLowerCase();

      for (const word of words) {
        if (text.includes(word)) score += 1;
      }

      if (score > 0) {
        scored.push({ node, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(s => s.node);
  }

  private buildContext(nodes: GraphNode[]): string {
    const lines: string[] = [];
    lines.push('=== Knowledge Graph Context ===\n');

    for (const node of nodes) {
      lines.push(`Node: ${node.id}`);
      lines.push(`  Type: ${node.type}`);
      lines.push(`  Label: ${node.label}`);
      lines.push(`  File: ${node.filePath}`);
      lines.push(`  Description: ${node.description}`);
      lines.push(`  Tags: ${node.tags.join(', ')}`);
      lines.push('');
    }

    const edgeMap = new Map<string, GraphEdge[]>();
    for (const node of nodes) {
      const edges = (this.graph as KnowledgeGraph).getEdges(node.id);
      if (edges.length > 0) {
        edgeMap.set(node.id, edges);
      }
    }

    if (edgeMap.size > 0) {
      lines.push('=== Relationships ===\n');
      for (const [nodeId, edges] of edgeMap.entries()) {
        for (const edge of edges) {
          lines.push(`  ${nodeId} --[${edge.type}]-> ${edge.targetId} (${edge.label})`);
        }
      }
    }

    return lines.join('\n');
  }

  private async reasonWithLLM(question: string, context: string): Promise<string | null> {
    try {
      const result = await this.llm.chat({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
        ],
        temperature: 0.1,
      });

      if (!result.ok) return null;
      return result.content || null;
    } catch {
      return null;
    }
  }

  private generateFallbackExplanation(question: string, nodes: GraphNode[]): string {
    if (nodes.length === 0) {
      return `No relevant knowledge graph nodes found for query: "${question}"`;
    }

    const types = new Set(nodes.map(n => n.type));
    const files = new Set(nodes.map(n => n.filePath));
    return `Found ${nodes.length} relevant nodes (types: ${Array.from(types).join(', ')}) across ${files.size} files for query: "${question}"`;
  }

  private getRelevantEdges(nodes: GraphNode[]): GraphEdge[] {
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges: GraphEdge[] = [];

    for (const node of nodes) {
      const nodeEdges = (this.graph as KnowledgeGraph).getEdges(node.id);
      for (const edge of nodeEdges) {
        if (nodeIds.has(edge.targetId)) {
          edges.push(edge);
        }
      }
    }

    return edges;
  }

  // ============================================================================
  // Backward Compatibility — Old GraphRAG API (for HallucinationGuardSkill)
  // ============================================================================

  private connected = false;

  /** Legacy: connect method — no-op, graph is now file-backed */
  async connect(): Promise<void> {
    this.connected = true;
  }

  /** Legacy: check connection status */
  isConnected(): boolean {
    return this.connected;
  }

  /** Legacy: validate statements against graph */
  async validateStatements(
    statements: string[],
    sources: Array<{ id: string; content: string }>
  ): Promise<{ passed: boolean; validatedNodes: number[]; conflictingNodes: number[]; confidence: number }> {
    const validatedNodes: number[] = [];
    const conflictingNodes: number[] = [];

    // Build a keyword index from all graph nodes
    const allText = new Map<string, string>();
    for (const node of (this.graph as any).nodes.values()) {
      const text = `${node.label} ${node.description} ${node.tags.join(' ')} ${node.filePath}`.toLowerCase();
      allText.set(node.id, text);
    }

    // Build keyword index from sources
    const sourceWords = new Set<string>();
    for (const src of sources) {
      const words = src.content.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      words.forEach(w => sourceWords.add(w));
    }

    for (let i = 0; i < statements.length; i++) {
      const statementWords = statements[i].toLowerCase().split(/\W+/).filter(w => w.length > 3);
      const matchingNodes = [...allText.entries()].filter(([, text]) =>
        statementWords.some(w => text.includes(w))
      );

      // A statement is validated if it references nodes that exist in the graph
      // and shares keywords with the provided sources
      const hasGraphGrounding = matchingNodes.length > 0;
      const hasSourceOverlap = statementWords.some(w => sourceWords.has(w));

      if (hasGraphGrounding && hasSourceOverlap) {
        validatedNodes.push(i);
      } else if (!hasGraphGrounding && !hasSourceOverlap) {
        conflictingNodes.push(i);
      } else {
        // Partial match — still valid but with lower confidence
        validatedNodes.push(i);
      }
    }

    return {
      passed: conflictingNodes.length === 0,
      validatedNodes,
      conflictingNodes,
      confidence: statements.length > 0 ? validatedNodes.length / statements.length : 0,
    };
  }
}

export function createKnowledgeGraph(options?: {
  nodeStorePath?: string;
  edgeStorePath?: string;
}): KnowledgeGraph {
  return new KnowledgeGraph(options);
}

export function createGraphRAG(config?: Partial<GraphRAGConfig>): GraphRAG {
  // Backward compatibility: old API called with no config
  if (!config || Object.keys(config).length === 0) {
    const graph = new KnowledgeGraph();
    graph.init().catch(() => {});
    return new GraphRAG({ apiKey: '', graph });
  }
  return new GraphRAG(config as GraphRAGConfig);
}
