/**
 * GraphRAG Visualizer - 需求图谱可视化增强
 * 
 * Mermaid 导出、影响范围分析、依赖关系可视化、图谱导航
 * 
 * @module asf-v4/harness/graph-rag-visualizer
 * @version 1.0.0
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('GraphRAG');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 图谱节点
 */
export interface GraphNode {
  id: string;
  label: string;
  type: 'requirement' | 'feature' | 'module' | 'entity' | 'flow';
  description?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 图谱边
 */
export interface GraphEdge {
  from: string;
  to: string;
  type: 'depends_on' | 'implements' | 'relates_to' | 'contains' | 'triggers';
  label?: string;
  weight?: number;
}

/**
 * 需求图谱
 */
export interface RequirementGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: {
    projectId?: string;
    version?: string;
    createdAt?: Date;
  };
}

/**
 * 影响范围报告
 */
export interface ImpactReport {
  nodeId: string;
  direct: string[];      // 直接影响
  indirect: string[];    // 间接影响
  total: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedModules: string[];
  estimatedEffort: number; // 小时
}

/**
 * 依赖分析报告
 */
export interface DependencyReport {
  nodeId: string;
  dependencies: string[];     // 依赖其他节点
  dependents: string[];       // 被其他节点依赖
  cycles: string[][];         // 循环依赖
  depth: number;              // 依赖深度
  criticalPath: string[];     // 关键路径
}

// ============================================================================
// GraphRAG Visualizer 主类
// ============================================================================

export class GraphRAGVisualizer {
  private graphs: Map<string, RequirementGraph> = new Map();

  constructor() {
    logger.info('🕸️ GraphRAG Visualizer 初始化完成');
  }

  /**
   * 导出为 Mermaid 流程图 - 核心方法
   */
  async exportToMermaid(graph: RequirementGraph, options?: {
    direction?: 'TD' | 'LR' | 'RL' | 'BT';
    style?: 'graph' | 'flowchart' | 'classDiagram';
    compact?: boolean;
  }): Promise<string> {
    const config = {
      direction: 'TD',
      style: 'flowchart',
      compact: false,
      ...options
    };

    let mermaid = `${config.style} ${config.direction}\n`;

    // 添加节点
    for (const node of graph.nodes) {
      const style = this.getNodeStyle(node.type);
      const label = config.compact ? node.label : `${node.label}\\n${node.description || ''}`;
      mermaid += `  ${node.id}[${label}]${style}\n`;
    }

    // 添加边
    for (const edge of graph.edges) {
      const arrow = this.getEdgeArrow(edge.type);
      const label = edge.label ? `|${edge.label}|` : '';
      mermaid += `  ${edge.from}${arrow}${label}${edge.to}\n`;
    }

    // 添加样式定义
    mermaid += '\n' + this.generateStyles(graph);

    return mermaid;
  }

  /**
   * 导出为 Mermaid 类图
   */
  async exportToClassDiagram(graph: RequirementGraph): Promise<string> {
    let mermaid = 'classDiagram\n';

    // 按类型分组节点
    const byType = new Map<string, GraphNode[]>();
    for (const node of graph.nodes) {
      if (!byType.has(node.type)) {
        byType.set(node.type, []);
      }
      byType.get(node.type)!.push(node);
    }

    // 生成类定义
    for (const [type, nodes] of byType.entries()) {
      mermaid += `  class ${type} {\n`;
      for (const node of nodes) {
        mermaid += `    +${node.id} ${node.label}\n`;
      }
      mermaid += `  }\n\n`;
    }

    // 生成关系
    for (const edge of graph.edges) {
      const relation = this.getClassRelation(edge.type);
      mermaid += `  ${edge.from} ${relation} ${edge.to}\n`;
    }

    return mermaid;
  }

  /**
   * 影响范围分析 - 核心方法
   */
  async analyzeImpact(graph: RequirementGraph, nodeId: string): Promise<ImpactReport> {
    logger.info(`🔍 分析影响范围：${nodeId}`);

    const direct = this.findDirectDependencies(graph, nodeId);
    const indirect = this.findIndirectDependencies(graph, direct);
    const affectedModules = this.findAffectedModules(graph, [nodeId, ...direct, ...indirect]);

    const total = direct.length + indirect.length;
    const severity = this.calculateImpactSeverity(total, affectedModules.length);
    const estimatedEffort = this.estimateEffort(total, severity);

    const report: ImpactReport = {
      nodeId,
      direct,
      indirect,
      total,
      severity,
      affectedModules,
      estimatedEffort
    };

    logger.info(`✅ 影响分析完成：直接影响${direct.length}个，间接影响${indirect.length}个，严重程度=${severity}`);

    return report;
  }

  /**
   * 依赖分析
   */
  async analyzeDependencies(graph: RequirementGraph, nodeId: string): Promise<DependencyReport> {
    logger.info(`🔗 分析依赖关系：${nodeId}`);

    // 查找依赖（该节点依赖的其他节点）
    const dependencies = graph.edges
      .filter(e => e.from === nodeId)
      .map(e => e.to);

    // 查找被依赖（依赖该节点的其他节点）
    const dependents = graph.edges
      .filter(e => e.to === nodeId)
      .map(e => e.from);

    // 检测循环依赖
    const cycles = this.detectCycles(graph);

    // 计算依赖深度
    const depth = this.calculateDependencyDepth(graph, nodeId);

    // 查找关键路径
    const criticalPath = this.findCriticalPath(graph, nodeId);

    return {
      nodeId,
      dependencies,
      dependents,
      cycles,
      depth,
      criticalPath
    };
  }

  /**
   * 图谱相似度对比
   */
  async compareGraphs(graph1: RequirementGraph, graph2: RequirementGraph): Promise<Record<string, unknown>> {
    const nodes1 = new Set(graph1.nodes.map(n => n.id));
    const nodes2 = new Set(graph2.nodes.map(n => n.id));

    const added = graph2.nodes.filter(n => !nodes1.has(n.id)).map(n => n.id);
    const removed = graph1.nodes.filter(n => !nodes2.has(n.id)).map(n => n.id);
    const common = graph1.nodes.filter(n => nodes2.has(n.id)).map(n => n.id);

    // 边变化
    const edges1 = new Set(graph1.edges.map(e => `${e.from}-${e.to}`));
    const edges2 = new Set(graph2.edges.map(e => `${e.from}-${e.to}`));

    const edgesAdded = graph2.edges.filter(e => !edges1.has(`${e.from}-${e.to}`)).length;
    const edgesRemoved = graph1.edges.filter(e => !edges2.has(`${e.from}-${e.to}`)).length;

    return {
      nodesAdded: added.length,
      nodesRemoved: removed.length,
      nodesCommon: common.length,
      edgesAdded,
      edgesRemoved,
      similarity: common.length / Math.max(nodes1.size, nodes2.size),
      changes: {
        added,
        removed,
        edgesAdded,
        edgesRemoved
      }
    };
  }

  /**
   * 保存图谱
   */
  saveGraph(projectId: string, graph: RequirementGraph): void {
    graph.metadata = {
      ...graph.metadata,
      projectId,
      createdAt: new Date()
    };
    this.graphs.set(projectId, graph);
    logger.info(`💾 保存图谱：${projectId} (${graph.nodes.length}节点，${graph.edges.length}边)`);
  }

  /**
   * 获取图谱
   */
  getGraph(projectId: string): RequirementGraph | undefined {
    return this.graphs.get(projectId);
  }

  /**
   * 获取统计
   */
  getStats(): Record<string, unknown> {
    const graphs = Array.from(this.graphs.values());
    
    return {
      totalGraphs: graphs.length,
      totalNodes: graphs.reduce((sum, g) => sum + g.nodes.length, 0),
      totalEdges: graphs.reduce((sum, g) => sum + g.edges.length, 0),
      avgNodesPerGraph: graphs.length > 0
        ? graphs.reduce((sum, g) => sum + g.nodes.length, 0) / graphs.length
        : 0
    };
  }

  // ============================================================================
  // 私有辅助方法
  // ============================================================================

  /**
   * 查找直接依赖
   */
  private findDirectDependencies(graph: RequirementGraph, nodeId: string): string[] {
    return graph.edges
      .filter(e => e.from === nodeId)
      .map(e => e.to);
  }

  /**
   * 查找间接依赖
   */
  private findIndirectDependencies(graph: RequirementGraph, direct: string[], visited: Set<string> = new Set()): string[] {
    const indirect: string[] = [];
    
    for (const nodeId of direct) {
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const deps = this.findDirectDependencies(graph, nodeId);
      for (const dep of deps) {
        if (!direct.includes(dep) && !indirect.includes(dep)) {
          indirect.push(dep);
          const deeper = this.findIndirectDependencies(graph, [dep], visited);
          indirect.push(...deeper.filter(d => !indirect.includes(d)));
        }
      }
    }

    return indirect;
  }

  /**
   * 查找受影响模块
   */
  private findAffectedModules(graph: RequirementGraph, nodeIds: string[]): string[] {
    const modules = new Set<string>();
    
    for (const nodeId of nodeIds) {
      const node = graph.nodes.find(n => n.id === nodeId);
      if (node?.metadata?.module) {
        modules.add(node.metadata.module);
      }
    }

    return Array.from(modules);
  }

  /**
   * 计算影响严重程度
   */
  private calculateImpactSeverity(total: number, moduleCount: number): 'low' | 'medium' | 'high' | 'critical' {
    if (total === 0) return 'low';
    if (total >= 20 || moduleCount >= 5) return 'critical';
    if (total >= 10 || moduleCount >= 3) return 'high';
    if (total >= 5) return 'medium';
    return 'low';
  }

  /**
   * 估算工作量
   */
  private estimateEffort(total: number, severity: string): number {
    const baseEffort = total * 2; // 每个影响点 2 小时
    
    const severityMultiplier: Record<string, number> = {
      low: 1,
      medium: 1.5,
      high: 2,
      critical: 3
    };

    return Math.round(baseEffort * (severityMultiplier[severity] || 1));
  }

  /**
   * 检测循环依赖
   */
  private detectCycles(graph: RequirementGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (nodeId: string): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = graph.edges
        .filter(e => e.from === nodeId)
        .map(e => e.to);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          // 发现循环
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycle.push(neighbor); // 闭合循环
          cycles.push(cycle);
        }
      }

      path.pop();
      recursionStack.delete(nodeId);
    };

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        dfs(node.id);
      }
    }

    return cycles;
  }

  /**
   * 计算依赖深度
   */
  private calculateDependencyDepth(graph: RequirementGraph, nodeId: string): number {
    const visited = new Set<string>();
    
    const dfs = (id: string, depth: number): number => {
      if (visited.has(id)) return depth;
      visited.add(id);

      const neighbors = graph.edges
        .filter(e => e.from === id)
        .map(e => e.to);

      if (neighbors.length === 0) return depth;

      return Math.max(...neighbors.map(n => dfs(n, depth + 1)));
    };

    return dfs(nodeId, 0);
  }

  /**
   * 查找关键路径
   */
  private findCriticalPath(graph: RequirementGraph, nodeId: string): string[] {
    const longestPath: string[] = [];
    const visited = new Set<string>();

    const dfs = (id: string, path: string[]): void => {
      if (visited.has(id)) return;
      visited.add(id);
      path.push(id);

      const neighbors = graph.edges
        .filter(e => e.from === id)
        .map(e => e.to);

      if (neighbors.length === 0) {
        if (path.length > longestPath.length) {
          longestPath.push(...path);
        }
      } else {
        for (const neighbor of neighbors) {
          dfs(neighbor, [...path]);
        }
      }
    };

    dfs(nodeId, []);
    return longestPath;
  }

  /**
   * 获取节点样式
   */
  private getNodeStyle(type: string): string {
    const styles: Record<string, string> = {
      requirement: ':::requirement',
      feature: ':::feature',
      module: ':::module',
      entity: ':::entity',
      flow: ':::flow'
    };
    return styles[type] || '';
  }

  /**
   * 获取边箭头样式
   */
  private getEdgeArrow(type: string): string {
    const arrows: Record<string, string> = {
      depends_on: '-->',
      implements: '-.->',
      relates_to: '---',
      contains: '-->',
      triggers: '==>'
    };
    return arrows[type] || '-->';
  }

  /**
   * 获取类图关系
   */
  private getClassRelation(type: string): string {
    const relations: Record<string, string> = {
      depends_on: '..>',
      implements: '--|>',
      relates_to: '--',
      contains: '--*',
      triggers: '..>'
    };
    return relations[type] || '--';
  }

  /**
   * 生成样式定义
   */
  private generateStyles(_graph: RequirementGraph): string {
    void _graph;
    const styles = [
      'classDef requirement fill:#e3f2fd,stroke:#1976d2,stroke-width:2px',
      'classDef feature fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px',
      'classDef module fill:#e8f5e9,stroke:#388e3c,stroke-width:2px',
      'classDef entity fill:#fff3e0,stroke:#f57c00,stroke-width:2px',
      'classDef flow fill:#ffebee,stroke:#d32f2f,stroke-width:2px'
    ];

    return styles.join('\n');
  }

  /**
   * 清除图谱
   */
  clearGraph(projectId?: string): void {
    if (projectId) {
      this.graphs.delete(projectId);
    } else {
      this.graphs.clear();
    }
    logger.info('🗑️ 已清除图谱');
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createGraphRAGVisualizer(): GraphRAGVisualizer {
  return new GraphRAGVisualizer();
}
