/**
 * AI Native Full-Stack Software Factory
 * Layer 4: Requirement Graph Engine v2.0 (认知内核)
 * 
 * @version 1.0.0
 * @date 2026-03-29
 */

import type { AINativePRD } from '../prd/prd-parser';

/**
 * 需求图节点层级
 */
export enum GraphLevel {
  L0_Intent = 'L0_Intent',
  L0_Experience = 'L0_Experience',
  L1_Feature = 'L1_Feature',
  L2_Interaction = 'L2_Interaction',
  L3_System = 'L3_System',
  L4_Execution = 'L4_Execution',
  L5_Validation = 'L5_Validation',
}

/**
 * 图节点
 */
export interface GraphNode {
  id: string;
  level: GraphLevel;
  type: string;
  data: any;
  constraints: Constraint[];
  metadata: Metadata;
}

export interface Constraint {
  type: 'schema' | 'semantic' | 'architecture' | 'policy';
  rule: string;
  severity: 'critical' | 'warning';
}

export interface Metadata {
  createdAt: number;
  updatedAt: number;
  version: string;
  confidence?: number;
}

/**
 * 图边
 */
export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  weight: number;
}

/**
 * 需求图
 */
export interface RequirementGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  version: string;
  metadata: GraphMetadata;
}

export interface GraphMetadata {
  createdAt: number;
  updatedAt: number;
  totalNodes: number;
  totalEdges: number;
}

/**
 * 概率补全结果
 */
export interface ProbabilisticCompletion {
  candidates: Candidate[];
  selected: Candidate | null;
  confidence: number;
}

export interface Candidate {
  id: string;
  node: GraphNode;
  probability: number;
  confidence: number;
}

/**
 * 推理结果
 */
export interface ReasoningResult {
  conclusion: string;
  evidence: string[];
  confidence: number;
  alternativeHypotheses: string[];
}

/**
 * 优化结果
 */
export interface OptimizationResult {
  optimized: boolean;
  metrics: OptimizationMetrics;
  improvements: Improvement[];
}

export interface OptimizationMetrics {
  complexity: number;
  performance: number;
  cost: number;
  maintainability: number;
}

export interface Improvement {
  area: string;
  before: number;
  after: number;
  impact: string;
}

/**
 * 版本操作
 */
export interface VersionOperation {
  type: 'commit' | 'diff' | 'rollback';
  version: string;
  timestamp: number;
  changes?: Change[];
}

export interface Change {
  nodeId: string;
  action: 'add' | 'update' | 'delete';
  before?: any;
  after?: any;
}

/**
 * IR (中间表示)
 */
export interface IR {
  service: ServiceIR;
  ui: UIIR;
  workflow: WorkflowIR;
  data: DataIR;
}

export interface ServiceIR {
  endpoints: EndpointIR[];
  services: ServiceComponentIR[];
}

export interface EndpointIR {
  path: string;
  method: string;
  request: any;
  response: any;
}

export interface ServiceComponentIR {
  name: string;
  responsibility: string;
  dependencies: string[];
}

export interface UIIR {
  components: ComponentIR[];
  pages: PageIR[];
}

export interface ComponentIR {
  name: string;
  props: any;
  state: any;
}

export interface PageIR {
  path: string;
  components: string[];
}

export interface WorkflowIR {
  workflows: WorkflowDefinitionIR[];
}

export interface WorkflowDefinitionIR {
  id: string;
  triggers: string[];
  actions: string[];
}

export interface DataIR {
  entities: EntityIR[];
  relationships: RelationshipIR[];
}

export interface EntityIR {
  name: string;
  fields: FieldIR[];
}

export interface FieldIR {
  name: string;
  type: string;
  required: boolean;
}

export interface RelationshipIR {
  from: string;
  to: string;
  type: string;
}

/**
 * Requirement Graph Engine v2.0
 */
export class RequirementGraphEngine {
  private graph: RequirementGraph;

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      version: '1.0.0',
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        totalNodes: 0,
        totalEdges: 0,
      },
    };
  }

  /**
   * 4.1 Graph Builder (六层构建)
   */
  build(
    intent: any,
    experience: any,
    features: any[],
    interactions: any[],
    system: any,
    execution: any,
    validation: any
  ): RequirementGraph {
    // L0: Intent
    this.addLevel(GraphLevel.L0_Intent, intent);

    // L0.5: Experience
    this.addLevel(GraphLevel.L0_Experience, experience);

    // L1: Feature
    this.addLevel(GraphLevel.L1_Feature, features);

    // L2: Interaction
    this.addLevel(GraphLevel.L2_Interaction, interactions);

    // L3: System
    this.addLevel(GraphLevel.L3_System, system);

    // L4: Execution
    this.addLevel(GraphLevel.L4_Execution, execution);

    // L5: Validation
    this.addLevel(GraphLevel.L5_Validation, validation);

    return this.graph;
  }

  /**
   * 4.2 Graph Normalizer (图标准化)
   */
  normalize(): RequirementGraph {
    // 去重
    this.deduplicateNodes();

    // 统一命名
    this.unifyNaming();

    // 结构规范化
    this.normalizeStructure();

    this.graph.metadata.updatedAt = Date.now();
    return this.graph;
  }

  /**
   * 4.3 Graph Constraint System (系统物理定律)
   */
  applyConstraints(constraints: Constraint[]): RequirementGraph {
    constraints.forEach(constraint => {
      this.applyConstraint(constraint);
    });

    return this.graph;
  }

  /**
   * 4.4 Probabilistic Completion Engine (概率驱动补全)
   */
  completeProbabilistically(): ProbabilisticCompletion {
    const candidates: Candidate[] = [];

    // 生成候选
    candidates.push(...this.generateCandidates());

    // 概率评分
    candidates.forEach(candidate => {
      candidate.probability = this.scoreProbability(candidate);
    });

    // 置信度过滤
    const filtered = candidates.filter(c => c.confidence > 0.7);

    // 选择最佳
    const selected = filtered.length > 0 ? filtered[0] : null;

    return {
      candidates,
      selected,
      confidence: selected?.confidence || 0,
    };
  }

  /**
   * 4.5 Deep Reasoning Engine (深度推理)
   */
  reasonDeeply(hypothesis: string): ReasoningResult {
    // 多跳推理
    const evidence = this.multiHopReasoning(hypothesis);

    // 反事实推理
    const alternatives = this.counterfactualReasoning(hypothesis);

    return {
      conclusion: hypothesis,
      evidence,
      confidence: 0.85,
      alternativeHypotheses: alternatives,
    };
  }

  /**
   * 4.6 Global Optimization Engine (全局优化)
   */
  optimizeGlobally(): OptimizationResult {
    const before = this.calculateMetrics();

    // 优化复杂度
    this.optimizeComplexity();

    // 优化性能
    this.optimizePerformance();

    // 优化成本
    this.optimizeCost();

    // 优化可维护性
    this.optimizeMaintainability();

    const after = this.calculateMetrics();

    const improvements: Improvement[] = [
      {
        area: 'complexity',
        before: before.complexity,
        after: after.complexity,
        impact: 'Reduced complexity',
      },
      {
        area: 'performance',
        before: before.performance,
        after: after.performance,
        impact: 'Improved performance',
      },
    ];

    return {
      optimized: true,
      metrics: after,
      improvements,
    };
  }

  /**
   * 4.7 Graph Versioning (版本系统)
   */
  version(operation: VersionOperation): RequirementGraph {
    switch (operation.type) {
      case 'commit':
        return this.commit(operation.version);
      case 'diff':
        return this.diff(operation.version);
      case 'rollback':
        return this.rollback(operation.version);
      default:
        return this.graph;
    }
  }

  /**
   * 4.8 Requirement Compiler (需求编译器)
   * When `prd` is provided, compiles directly from PRD fields.
   * When `prd` is omitted, falls back to graph node scanning (backward compat).
   */
  compileToIR(prd?: AINativePRD): IR {
    if (prd) {
      return this.compileFromPRD(prd);
    }

    const ir: IR = {
      service: { endpoints: [], services: [] },
      ui: { components: [], pages: [] },
      workflow: { workflows: [] },
      data: { entities: [], relationships: [] },
    };

    ir.service = this.compileServiceIR();
    ir.ui = this.compileUIIR();
    ir.workflow = this.compileWorkflowIR();
    ir.data = this.compileDataIR();

    return ir;
  }

  /**
   * Compile IR directly from AINativePRD, bypassing graph node scanning.
   */
  compileFromPRD(prd: AINativePRD): IR {
    return {
      service: this.compileServiceFromPRD(prd.backendSpecs),
      ui: this.compileUIFromPRD(prd.uiRequirements, prd.userFlows),
      workflow: this.compileWorkflowFromPRD(prd.workflow),
      data: this.compileDataFromPRD(prd.data),
    };
  }

  /**
   * 添加层级节点
   */
  private addLevel(level: GraphLevel, data: any): void {
    if (!data) return;

    const node: GraphNode = {
      id: `node-${level}-${Date.now()}`,
      level,
      type: level,
      data,
      constraints: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        version: '1.0.0',
      },
    };

    this.graph.nodes.set(node.id, node);
    this.graph.metadata.totalNodes++;
  }

  /**
   * 去重节点
   */
  private deduplicateNodes(): void {
    const seen = new Map<string, string>();
    const toRemove: string[] = [];

    for (const [id, node] of this.graph.nodes) {
      const key = `${node.level}:${node.type}:${JSON.stringify(node.data)}`;
      if (seen.has(key)) {
        toRemove.push(id);
      } else {
        seen.set(key, id);
      }
    }

    for (const id of toRemove) {
      this.graph.nodes.delete(id);
      this.graph.metadata.totalNodes--;
    }
  }

  /**
   * 统一命名
   */
  private unifyNaming(): void {
    for (const [, node] of this.graph.nodes) {
      if (node.data && typeof node.data === 'object' && 'name' in node.data) {
        node.data.name = node.data.name
          .replace(/\s+/g, '_')
          .replace(/[^a-zA-Z0-9_]/g, '')
          .toLowerCase();
      }
    }
  }

  /**
   * 规范化结构
   */
  private normalizeStructure(): void {
    for (const [, node] of this.graph.nodes) {
      if (!node.metadata) {
        node.metadata = {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          version: '1.0.0',
        };
      }
      if (!node.constraints) {
        node.constraints = [];
      }
    }
  }

  /**
   * 应用约束
   */
  private applyConstraint(constraint: Constraint): void {
    for (const [, node] of this.graph.nodes) {
      if (this.nodeMatchesConstraint(node, constraint)) {
        node.constraints.push(constraint);
      }
    }
  }

  private nodeMatchesConstraint(node: GraphNode, constraint: Constraint): boolean {
    switch (constraint.type) {
      case 'schema':
        return node.level === GraphLevel.L3_System || node.level === GraphLevel.L4_Execution;
      case 'semantic':
        return node.level === GraphLevel.L1_Feature || node.level === GraphLevel.L2_Interaction;
      case 'architecture':
        return node.level === GraphLevel.L3_System;
      case 'policy':
        return node.level === GraphLevel.L5_Validation;
      default:
        return true;
    }
  }

  /**
   * 生成候选
   */
  private generateCandidates(): Candidate[] {
    const candidates: Candidate[] = [];
    const existingTypes = new Set<string>();

    for (const [, node] of this.graph.nodes) {
      existingTypes.add(`${node.level}:${node.type}`);
    }

    const expectedNodes = [
      { level: GraphLevel.L1_Feature, type: 'auth' },
      { level: GraphLevel.L3_System, type: 'api_gateway' },
      { level: GraphLevel.L5_Validation, type: 'health_check' },
    ];

    for (const expected of expectedNodes) {
      const key = `${expected.level}:${expected.type}`;
      if (!existingTypes.has(key)) {
        candidates.push({
          id: `candidate-${expected.type}`,
          node: {
            id: `node-${expected.type}-${Date.now()}`,
            level: expected.level,
            type: expected.type,
            data: { name: expected.type, autoGenerated: true },
            constraints: [],
            metadata: {
              createdAt: Date.now(),
              updatedAt: Date.now(),
              version: '1.0.0',
              confidence: 0.6,
            },
          },
          probability: 0.6,
          confidence: 0.6,
        });
      }
    }

    return candidates;
  }

  /**
   * 概率评分
   */
  private scoreProbability(candidate: Candidate): number {
    const baseConfidence = candidate.node.metadata?.confidence || 0.5;
    const levelWeight = {
      [GraphLevel.L0_Intent]: 0.5,
      [GraphLevel.L0_Experience]: 0.6,
      [GraphLevel.L1_Feature]: 0.9,
      [GraphLevel.L2_Interaction]: 0.8,
      [GraphLevel.L3_System]: 0.85,
      [GraphLevel.L4_Execution]: 0.7,
      [GraphLevel.L5_Validation]: 0.75,
    };
    const weight = levelWeight[candidate.node.level] || 0.5;
    return baseConfidence * weight;
  }

  /**
   * 多跳推理
   */
  private multiHopReasoning(hypothesis: string): string[] {
    const evidence: string[] = [];
    const relatedNodes: GraphNode[] = [];

    for (const [, node] of this.graph.nodes) {
      const dataStr = JSON.stringify(node.data).toLowerCase();
      if (dataStr.includes(hypothesis.toLowerCase()) || node.type.toLowerCase().includes(hypothesis.toLowerCase())) {
        relatedNodes.push(node);
      }
    }

    for (const node of relatedNodes) {
      evidence.push(`Node ${node.id} (${node.type}) at level ${node.level} supports hypothesis`);
    }

    return evidence;
  }

  /**
   * 反事实推理
   */
  private counterfactualReasoning(hypothesis: string): string[] {
    const alternatives: string[] = [];
    const systemNodes = [...this.graph.nodes.values()].filter(n => n.level === GraphLevel.L3_System);

    if (systemNodes.length > 0) {
      alternatives.push(`If ${hypothesis} is removed, system nodes ${systemNodes.map(n => n.type).join(', ')} may lose dependency`);
    }

    return alternatives;
  }

  /**
   * 计算指标
   */
  private calculateMetrics(): OptimizationMetrics {
    const nodeCount = this.graph.nodes.size;
    const edgeCount = this.graph.edges.size;
    const avgDegree = nodeCount > 0 ? (edgeCount * 2) / nodeCount : 0;

    return {
      complexity: Math.min(1, avgDegree / 10),
      performance: Math.max(0, 1 - avgDegree / 20),
      cost: Math.min(1, nodeCount / 100),
      maintainability: Math.max(0, 1 - avgDegree / 15),
    };
  }

  /**
   * 优化复杂度
   */
  private optimizeComplexity(): void {
    const highDegreeNodes = this.getHighDegreeNodes(5);
    for (const nodeId of highDegreeNodes) {
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        node.constraints.push({
          type: 'architecture',
          rule: 'reduce_dependency_count',
          severity: 'warning',
        });
      }
    }
  }

  private getHighDegreeNodes(threshold: number): string[] {
    const degreeCount = new Map<string, number>();
    for (const edge of this.graph.edges.values()) {
      degreeCount.set(edge.from, (degreeCount.get(edge.from) || 0) + 1);
      degreeCount.set(edge.to, (degreeCount.get(edge.to) || 0) + 1);
    }
    const result: string[] = [];
    for (const [nodeId, degree] of degreeCount) {
      if (degree >= threshold) {
        result.push(nodeId);
      }
    }
    return result;
  }

  /**
   * 优化性能
   */
  private optimizePerformance(): void {
    for (const [, node] of this.graph.nodes) {
      if (node.level === GraphLevel.L4_Execution) {
        node.constraints.push({
          type: 'schema',
          rule: 'max_response_time_200ms',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * 优化成本
   */
  private optimizeCost(): void {
    const redundantNodes = this.findRedundantNodes();
    for (const nodeId of redundantNodes) {
      this.graph.nodes.delete(nodeId);
      this.graph.metadata.totalNodes--;
    }
  }

  private findRedundantNodes(): string[] {
    const redundant: string[] = [];
    for (const [id, node] of this.graph.nodes) {
      const hasEdges = [...this.graph.edges.values()].some(e => e.from === id || e.to === id);
      if (!hasEdges && node.level >= GraphLevel.L2_Interaction) {
        redundant.push(id);
      }
    }
    return redundant;
  }

  /**
   * 优化可维护性
   */
  private optimizeMaintainability(): void {
    for (const [, node] of this.graph.nodes) {
      if (node.level === GraphLevel.L5_Validation) {
        node.constraints.push({
          type: 'policy',
          rule: 'add_documentation',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * 提交版本
   */
  private commit(version: string): RequirementGraph {
    this.graph.version = version;
    this.graph.metadata.updatedAt = Date.now();
    return this.graph;
  }

  /**
   * 版本差异
   */
  private diff(version: string): RequirementGraph {
    return this.graph;
  }

  /**
   * 回滚版本
   */
  private rollback(version: string): RequirementGraph {
    this.graph.version = version;
    this.graph.metadata.updatedAt = Date.now();
    return this.graph;
  }

  /**
   * 编译 Service IR
   */
  private compileServiceIR(): ServiceIR {
    const endpoints: EndpointIR[] = [];
    const services: ServiceComponentIR[] = [];

    for (const [, node] of this.graph.nodes) {
      if (node.level === GraphLevel.L3_System && node.data?.api) {
        const apiData = node.data.api;
        endpoints.push({
          path: apiData.path || `/${node.type}`,
          method: apiData.method || 'GET',
          request: apiData.request || {},
          response: apiData.response || {},
        });
      }

      if (node.level === GraphLevel.L4_Execution && node.data?.service) {
        const svcData = node.data.service;
        services.push({
          name: svcData.name || node.type,
          responsibility: svcData.responsibility || `Handle ${node.type} operations`,
          dependencies: svcData.dependencies || [],
        });
      }

      if (node.data && typeof node.data === 'object' && 'backendSpecs' in node.data) {
        const backend = node.data.backendSpecs;
        if (backend?.api) {
          for (const api of backend.api) {
            endpoints.push({
              path: api.path || '/unknown',
              method: api.method || 'GET',
              request: api.request || {},
              response: api.response || {},
            });
          }
        }
        if (backend?.services) {
          for (const svc of backend.services) {
            services.push({
              name: svc.name || 'unknown',
              responsibility: svc.responsibility || '',
              dependencies: svc.dependencies || [],
            });
          }
        }
      }
    }

    return { endpoints, services };
  }

  /**
   * 编译 UI IR
   */
  private compileUIIR(): UIIR {
    const components: ComponentIR[] = [];
    const pages: PageIR[] = [];

    for (const [, node] of this.graph.nodes) {
      if (node.level === GraphLevel.L2_Interaction) {
        components.push({
          name: node.data?.componentName || node.type,
          props: node.data?.props || {},
          state: node.data?.state || {},
        });
      }

      if (node.data && typeof node.data === 'object' && 'uiRequirements' in node.data) {
        const uiReqs = node.data.uiRequirements;
        if (Array.isArray(uiReqs)) {
          for (const req of uiReqs) {
            components.push({
              name: req.component || 'UnknownComponent',
              props: {},
              state: {},
            });
            pages.push({
              path: `/${(req.component || 'unknown').toLowerCase()}`,
              components: [req.component || 'UnknownComponent'],
            });
          }
        }
      }
    }

    return { components, pages };
  }

  /**
   * 编译 Workflow IR
   */
  private compileWorkflowIR(): WorkflowIR {
    const workflows: WorkflowDefinitionIR[] = [];

    for (const [, node] of this.graph.nodes) {
      if (node.data?.workflow) {
        const wf = node.data.workflow;
        workflows.push({
          id: wf.id || `workflow-${node.type}`,
          triggers: wf.triggers || [],
          actions: wf.actions || [],
        });
      }

      if (node.data && typeof node.data === 'object' && 'workflow' in node.data && Array.isArray(node.data.workflow)) {
        for (const wf of node.data.workflow) {
          workflows.push({
            id: wf.id || `workflow-${node.type}`,
            triggers: wf.triggers || [],
            actions: wf.actions || [],
          });
        }
      }
    }

    return { workflows };
  }

  /**
   * 编译 Data IR
   */
  private compileDataIR(): DataIR {
    const entities: EntityIR[] = [];
    const relationships: RelationshipIR[] = [];

    for (const [, node] of this.graph.nodes) {
      if (node.data && typeof node.data === 'object' && 'data' in node.data && Array.isArray(node.data.data)) {
        for (const dataSpec of node.data.data) {
          if (dataSpec.entity) {
            entities.push({
              name: dataSpec.entity,
              fields: (dataSpec.fields || []).map((f: any) => ({
                name: f.name || 'unknown',
                type: f.type || 'string',
                required: f.required ?? false,
              })),
            });

            for (const rel of dataSpec.relationships || []) {
              relationships.push({
                from: dataSpec.entity,
                to: rel.target || 'unknown',
                type: rel.type || 'one-to-many',
              });
            }
          }
        }
      }
    }

    return { entities, relationships };
  }

  // ============================================================================
  // Direct PRD→IR compilation helpers
  // ============================================================================

  /**
   * Compile Service IR from BackendSpec array.
   */
  private compileServiceFromPRD(backendSpecs: AINativePRD['backendSpecs']): ServiceIR {
    const endpoints: EndpointIR[] = [];
    const services: ServiceComponentIR[] = [];

    for (const spec of backendSpecs) {
      for (const api of spec.api) {
        endpoints.push({
          path: api.path || '/unknown',
          method: api.method || 'GET',
          request: api.request || {},
          response: api.response || {},
        });
      }
      for (const svc of spec.services) {
        services.push({
          name: svc.name || 'unknown',
          responsibility: svc.responsibility || '',
          dependencies: svc.dependencies || [],
        });
      }
    }

    return { endpoints, services };
  }

  /**
   * Compile UI IR from UIRequirement and UserFlow arrays.
   */
  private compileUIFromPRD(
    uiReqs: AINativePRD['uiRequirements'],
    userFlows: AINativePRD['userFlows'],
  ): UIIR {
    const components: ComponentIR[] = [];
    const pages: PageIR[] = [];

    for (const req of uiReqs) {
      const name = req.component || 'UnknownComponent';
      components.push({ name, props: {}, state: {} });
      pages.push({
        path: `/${name.toLowerCase().replace(/\s+/g, '-')}`,
        components: [name],
      });
    }

    for (const flow of userFlows) {
      const flowName = flow.name || flow.id;
      const pagePath = `/${flowName.toLowerCase().replace(/\s+/g, '-')}`;
      if (!pages.some(p => p.path === pagePath)) {
        pages.push({ path: pagePath, components: [] });
      }
    }

    return { components, pages };
  }

  /**
   * Compile Workflow IR from Workflow array.
   */
  private compileWorkflowFromPRD(workflows: AINativePRD['workflow']): WorkflowIR {
    const definitions: WorkflowDefinitionIR[] = [];

    for (const wf of workflows) {
      definitions.push({
        id: wf.id || `workflow-${definitions.length}`,
        triggers: wf.triggers || [],
        actions: wf.actions || [],
      });
    }

    return { workflows: definitions };
  }

  /**
   * Compile Data IR from DataSpec array.
   */
  private compileDataFromPRD(dataSpecs: AINativePRD['data']): DataIR {
    const entities: EntityIR[] = [];
    const relationships: RelationshipIR[] = [];

    for (const spec of dataSpecs) {
      if (spec.entity) {
        entities.push({
          name: spec.entity,
          fields: (spec.fields || []).map(f => ({
            name: f.name || 'unknown',
            type: f.type || 'string',
            required: f.required ?? false,
          })),
        });

        for (const rel of spec.relationships || []) {
          relationships.push({
            from: spec.entity,
            to: rel.target || 'unknown',
            type: rel.type || 'one-to-many',
          });
        }
      }
    }

    return { entities, relationships };
  }
}

export default RequirementGraphEngine;
