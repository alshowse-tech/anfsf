/**
 * ANFSF L4 — Deep Reasoning Skill
 *
 * Multi-hop reasoning capability over the Requirement Graph.
 * Performs causal chain analysis, dependency tracing, and impact assessment.
 * Answers "why" and "what if" questions by traversing the graph.
 */

import { Skill, SkillResult } from './base';
import { RequirementGraph, GraphNode, GraphEdge } from '../req-graph/graph-engine';

export interface DeepReasoningContext {
  graph: RequirementGraph;
  /** Question to reason about */
  question: string;
  /** Focus node ID (optional) */
  focusNodeId?: string;
  /** Maximum reasoning depth */
  maxDepth?: number;
  /** Reasoning mode */
  mode?: 'causal' | 'impact' | 'dependency' | 'consistency';
}

export interface ReasoningStep {
  /** Step number */
  step: number;
  /** Node involved */
  nodeId: string;
  /** Inference made */
  inference: string;
  /** Confidence (0-1) */
  confidence: number;
  /** Edge type used to reach this node */
  edgeType?: string;
}

export interface CausalChain {
  /** Chain ID */
  id: string;
  /** Sequence of nodes forming the chain */
  nodes: string[];
  /** Description of the causal relationship */
  description: string;
  /** Chain confidence */
  confidence: number;
  /** Strength of each link */
  linkStrengths: number[];
}

export interface ImpactAssessment {
  /** Affected node ID */
  nodeId: string;
  /** Impact type */
  type: 'direct' | 'indirect' | 'transitive';
  /** Impact severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Description */
  description: string;
}

export interface ConsistencyIssue {
  /** Conflicting node IDs */
  nodes: string[];
  /** Issue description */
  issue: string;
  /** Severity */
  severity: 'warning' | 'error';
  /** Suggested resolution */
  suggestion?: string;
}

export interface DeepReasoningResult extends SkillResult {
  /** Reasoning steps taken */
  steps: ReasoningStep[];
  /** Causal chains found */
  causalChains: CausalChain[];
  /** Impact assessment (if applicable) */
  impactAssessment: ImpactAssessment[];
  /** Consistency issues found */
  consistencyIssues: ConsistencyIssue[];
  /** Final answer */
  answer: string;
  /** Overall confidence */
  confidence: number;
  /** Whether the reasoning was conclusive */
  conclusive: boolean;
}

const DEFAULT_MAX_DEPTH = 5;

/**
 * Deep Reasoning Skill — multi-hop reasoning over requirement graphs.
 */
export class DeepReasoningSkill extends Skill {
  name = 'deep-reasoning';
  version = '1.0.0';
  description = '深度推理 Skill — 基于需求图谱的多跳因果链分析';

  execute(ctx: DeepReasoningContext): Promise<DeepReasoningResult> {
    const startTime = Date.now();
    const { graph, question, maxDepth = DEFAULT_MAX_DEPTH, mode = 'causal' } = ctx;

    const steps: ReasoningStep[] = [];
    const causalChains: CausalChain[] = [];
    const impactAssessment: ImpactAssessment[] = [];
    const consistencyIssues: ConsistencyIssue[] = [];

    // Identify starting point
    const startNode = this.findStartingNode(graph, ctx);
    if (!startNode) {
      return Promise.resolve({
        steps,
        causalChains,
        impactAssessment,
        consistencyIssues,
        answer: `无法找到推理起点。问题: "${question}"`,
        confidence: 0,
        conclusive: false,
        executionTime: Date.now() - startTime,
        metadata: { name: this.name, version: this.version, mode },
      });
    }

    switch (mode) {
      case 'causal':
        this.performCausalReasoning(graph, startNode, maxDepth, steps, causalChains);
        break;
      case 'impact':
        this.performImpactReasoning(graph, startNode, maxDepth, steps, impactAssessment);
        break;
      case 'dependency':
        this.performDependencyReasoning(graph, startNode, maxDepth, steps, causalChains);
        break;
      case 'consistency':
        this.performConsistencyReasoning(graph, startNode, maxDepth, steps, consistencyIssues);
        break;
    }

    const answer = this.generateAnswer(question, mode, startNode, steps, causalChains, impactAssessment, consistencyIssues);
    const confidence = this.computeConfidence(steps, causalChains);

    return Promise.resolve({
      steps,
      causalChains,
      impactAssessment,
      consistencyIssues,
      answer,
      confidence,
      conclusive: steps.length > 0,
      executionTime: Date.now() - startTime,
      metadata: { name: this.name, version: this.version, mode },
    });
  }

  // ---------------------------------------------------------------------------
  // Reasoning Modes
  // ---------------------------------------------------------------------------

  private performCausalReasoning(
    graph: RequirementGraph,
    startNode: GraphNode,
    maxDepth: number,
    steps: ReasoningStep[],
    chains: CausalChain[]
  ): void {
    // Forward traversal: what does this node cause?
    const forwardPath: string[] = [startNode.id];
    const visited = new Set<string>([startNode.id]);
    let step = 1;

    this.traverseForward(graph, startNode.id, forwardPath, visited, maxDepth, 0, (nodeId, edge, depth) => {
      steps.push({
        step: step++,
        nodeId,
        inference: `Node "${nodeId}" is a downstream effect (depth ${depth})`,
        confidence: Math.max(0.1, 1 - depth * 0.15),
        edgeType: edge?.type,
      });
      forwardPath.push(nodeId);
    });

    if (forwardPath.length > 1) {
      chains.push({
        id: `causal-${startNode.id}`,
        nodes: [...forwardPath],
        description: `Causal chain from "${startNode.id}" to ${forwardPath.length - 1} downstream nodes`,
        confidence: Math.max(0.1, 1 - forwardPath.length * 0.05),
        linkStrengths: forwardPath.slice(1).map((_, i) => Math.max(0.1, 1 - i * 0.1)),
      });
    }

    // Backward traversal: what causes this node?
    const backwardPath: string[] = [startNode.id];
    const visitedBack = new Set<string>([startNode.id]);

    this.traverseBackward(graph, startNode.id, backwardPath, visitedBack, maxDepth, 0, (nodeId, edge, depth) => {
      steps.push({
        step: step++,
        nodeId,
        inference: `Node "${nodeId}" is an upstream cause (depth ${depth})`,
        confidence: Math.max(0.1, 1 - depth * 0.15),
        edgeType: edge?.type,
      });
      backwardPath.unshift(nodeId);
    });

    if (backwardPath.length > 1) {
      chains.push({
        id: `causal-reverse-${startNode.id}`,
        nodes: [...backwardPath],
        description: `Reverse causal chain from ${backwardPath.length - 1} upstream causes to "${startNode.id}"`,
        confidence: Math.max(0.1, 1 - backwardPath.length * 0.05),
        linkStrengths: backwardPath.slice(0, -1).map((_, i) => Math.max(0.1, 1 - i * 0.1)),
      });
    }
  }

  private performImpactReasoning(
    graph: RequirementGraph,
    startNode: GraphNode,
    maxDepth: number,
    steps: ReasoningStep[],
    assessments: ImpactAssessment[]
  ): void {
    const visited = new Set<string>();
    let step = 1;

    // BFS to find all downstream impacts
    const queue: Array<{ nodeId: string; depth: number }> = [{ nodeId: startNode.id, depth: 0 }];

    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      const { nodeId, depth } = item;
      if (depth > maxDepth || visited.has(nodeId)) continue;
      visited.add(nodeId);

      if (nodeId !== startNode.id) {
        const type = depth === 1 ? 'direct' : depth === 2 ? 'indirect' : 'transitive';
        const severity = depth === 1 ? 'high' : depth === 2 ? 'medium' : 'low';

        assessments.push({
          nodeId,
          type,
          severity,
          description: `${type} impact on "${nodeId}" at depth ${depth}`,
        });

        steps.push({
          step: step++,
          nodeId,
          inference: `Change propagates to "${nodeId}" (${type}, ${severity})`,
          confidence: Math.max(0.1, 1 - depth * 0.2),
        });
      }

      // Enqueue neighbors
      for (const [, edge] of graph.edges) {
        if (edge.from === nodeId && !visited.has(edge.to)) {
          queue.push({ nodeId: edge.to, depth: depth + 1 });
        }
      }
    }
  }

  private performDependencyReasoning(
    graph: RequirementGraph,
    startNode: GraphNode,
    maxDepth: number,
    steps: ReasoningStep[],
    chains: CausalChain[]
  ): void {
    const dependencies: string[] = [];
    const visited = new Set<string>([startNode.id]);
    let step = 1;

    this.collectDependencies(graph, startNode.id, visited, maxDepth, 0, (nodeId, edge, depth) => {
      dependencies.push(nodeId);
      steps.push({
        step: step++,
        nodeId,
        inference: `"${nodeId}" is a dependency (depth ${depth})`,
        confidence: Math.max(0.1, 1 - depth * 0.12),
        edgeType: edge?.type,
      });
    });

    chains.push({
      id: `dependency-${startNode.id}`,
      nodes: [startNode.id, ...dependencies],
      description: `Dependency chain: "${startNode.id}" depends on ${dependencies.length} nodes`,
      confidence: Math.max(0.1, 1 - dependencies.length * 0.03),
      linkStrengths: dependencies.map((_, i) => Math.max(0.1, 1 - i * 0.08)),
    });
  }

  private performConsistencyReasoning(
    graph: RequirementGraph,
    startNode: GraphNode,
    maxDepth: number,
    steps: ReasoningStep[],
    issues: ConsistencyIssue[]
  ): void {
    const visited = new Set<string>([startNode.id]);
    let step = 1;

    // Check for conflicting nodes in the reachable subgraph
    const reachableNodes: GraphNode[] = [startNode];
    this.traverseForward(graph, startNode.id, [], visited, maxDepth, 0, (nodeId) => {
      const node = graph.nodes.get(nodeId);
      if (node) reachableNodes.push(node);
      steps.push({
        step: step++,
        nodeId,
        inference: `Checking consistency of "${nodeId}"`,
        confidence: 1.0,
      });
    });

    // Detect conflicts: nodes with same type but contradictory data
    for (let i = 0; i < reachableNodes.length; i++) {
      for (let j = i + 1; j < reachableNodes.length; j++) {
        const a = reachableNodes[i];
        const b = reachableNodes[j];

        if (a.type === b.type && a.data?.name && b.data?.name) {
          // Same name, different IDs = potential duplicate
          if (a.data.name === b.data.name && a.id !== b.id) {
            issues.push({
              nodes: [a.id, b.id],
              issue: `Duplicate requirement: "${a.data.name}" appears in both "${a.id}" and "${b.id}"`,
              severity: 'warning',
              suggestion: `Merge "${a.id}" and "${b.id}" into a single node`,
            });
          }
        }

        // Check for contradictory constraints
        if (a.constraints && b.constraints) {
          for (const ca of a.constraints) {
            for (const cb of b.constraints) {
              if (ca.rule && cb.rule && this.rulesConflict(ca.rule, cb.rule)) {
                issues.push({
                  nodes: [a.id, b.id],
                  issue: `Contradictory constraints between "${a.id}" and "${b.id}": "${ca.rule}" vs "${cb.rule}"`,
                  severity: 'error',
                  suggestion: `Resolve the constraint conflict between "${a.id}" and "${b.id}"`,
                });
              }
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Graph Traversal
  // ---------------------------------------------------------------------------

  private traverseForward(
    graph: RequirementGraph,
    nodeId: string,
    path: string[],
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number,
    callback: (nodeId: string, edge: GraphEdge | undefined, depth: number) => void
  ): void {
    if (currentDepth >= maxDepth) return;

    for (const [, edge] of graph.edges) {
      if (edge.from === nodeId && !visited.has(edge.to)) {
        visited.add(edge.to);
        callback(edge.to, edge, currentDepth + 1);
        this.traverseForward(graph, edge.to, path, visited, maxDepth, currentDepth + 1, callback);
      }
    }
  }

  private traverseBackward(
    graph: RequirementGraph,
    nodeId: string,
    path: string[],
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number,
    callback: (nodeId: string, edge: GraphEdge | undefined, depth: number) => void
  ): void {
    if (currentDepth >= maxDepth) return;

    for (const [, edge] of graph.edges) {
      if (edge.to === nodeId && !visited.has(edge.from)) {
        visited.add(edge.from);
        callback(edge.from, edge, currentDepth + 1);
        this.traverseBackward(graph, edge.from, path, visited, maxDepth, currentDepth + 1, callback);
      }
    }
  }

  private collectDependencies(
    graph: RequirementGraph,
    nodeId: string,
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number,
    callback: (nodeId: string, edge: GraphEdge | undefined, depth: number) => void
  ): void {
    if (currentDepth >= maxDepth) return;

    for (const [, edge] of graph.edges) {
      if (edge.to === nodeId && !visited.has(edge.from)) {
        visited.add(edge.from);
        callback(edge.from, edge, currentDepth + 1);
        this.collectDependencies(graph, edge.from, visited, maxDepth, currentDepth + 1, callback);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Answer Generation
  // ---------------------------------------------------------------------------

  private generateAnswer(
    question: string,
    mode: string,
    startNode: GraphNode,
    steps: ReasoningStep[],
    chains: CausalChain[],
    impacts: ImpactAssessment[],
    issues: ConsistencyIssue[]
  ): string {
    const parts: string[] = [];

    parts.push(`针对问题: "${question}"`);
    parts.push(`推理起点: "${startNode.id}" (${startNode.type})`);
    parts.push(`推理模式: ${mode}`);
    parts.push(`推理步骤数: ${steps.length}`);

    if (chains.length > 0) {
      parts.push(`发现 ${chains.length} 条因果/依赖链`);
      for (const chain of chains.slice(0, 3)) {
        parts.push(`  - ${chain.description}`);
      }
    }

    if (impacts.length > 0) {
      const direct = impacts.filter(i => i.type === 'direct').length;
      const indirect = impacts.filter(i => i.type === 'indirect').length;
      const transitive = impacts.filter(i => i.type === 'transitive').length;
      parts.push(`影响评估: ${direct} 直接影响, ${indirect} 间接影响, ${transitive} 传递影响`);
    }

    if (issues.length > 0) {
      parts.push(`发现 ${issues.length} 个一致性问题`);
      for (const issue of issues.slice(0, 3)) {
        parts.push(`  - ${issue.issue}`);
      }
    }

    return parts.join('\n');
  }

  private computeConfidence(steps: ReasoningStep[], chains: CausalChain[]): number {
    if (steps.length === 0) return 0;

    const avgStepConfidence = steps.reduce((s, r) => s + r.confidence, 0) / steps.length;
    const avgChainConfidence = chains.length > 0
      ? chains.reduce((s, c) => s + c.confidence, 0) / chains.length
      : 0.5;

    return (avgStepConfidence * 0.6 + avgChainConfidence * 0.4);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private findStartingNode(graph: RequirementGraph, ctx: DeepReasoningContext): GraphNode | null {
    // Try explicit focus node
    if (ctx.focusNodeId) {
      const node = graph.nodes.get(ctx.focusNodeId);
      if (node) return node;
    }

    // Try matching question keywords
    const keywords = ctx.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    for (const node of graph.nodes.values()) {
      const nodeText = `${node.id} ${node.type} ${JSON.stringify(node.data)}`.toLowerCase();
      if (keywords.some(kw => nodeText.includes(kw))) return node;
    }

    // Fallback to first node
    return graph.nodes.values().next().value ?? null;
  }

  private rulesConflict(ruleA: string, ruleB: string): boolean {
    // Simple conflict detection: opposing keywords
    const positiveWords = ['required', 'must', 'always', 'allow', 'enable', 'include', 'greater', 'more', 'higher'];
    const negativeWords = ['forbidden', 'never', 'disallow', 'disable', 'exclude', 'remove', 'less', 'lower', 'maximum'];

    const a = ruleA.toLowerCase();
    const b = ruleB.toLowerCase();

    const aPositive = positiveWords.some(w => a.includes(w));
    const aNegative = negativeWords.some(w => a.includes(w));
    const bPositive = positiveWords.some(w => b.includes(w));
    const bNegative = negativeWords.some(w => b.includes(w));

    return (aPositive && bNegative) || (aNegative && bPositive);
  }
}

/**
 * Create a DeepReasoningSkill instance.
 */
export function createDeepReasoningSkill(): DeepReasoningSkill {
  return new DeepReasoningSkill();
}
