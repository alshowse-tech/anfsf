/**
 * AI Native Full-Stack Software Factory
 * Layer 4: Requirement Graph Engine v2.0 (认知内核)
 *
 * @version 1.0.0
 * @date 2026-03-29
 */
/**
 * 需求图节点层级
 */
export declare enum GraphLevel {
    L0_Intent = "L0_Intent",
    L0_Experience = "L0_Experience",
    L1_Feature = "L1_Feature",
    L2_Interaction = "L2_Interaction",
    L3_System = "L3_System",
    L4_Execution = "L4_Execution",
    L5_Validation = "L5_Validation"
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
export declare class RequirementGraphEngine {
    private graph;
    constructor();
    /**
     * 4.1 Graph Builder (六层构建)
     */
    build(intent: any, experience: any, features: any[], interactions: any[], system: any, execution: any, validation: any): RequirementGraph;
    /**
     * 4.2 Graph Normalizer (图标准化)
     */
    normalize(): RequirementGraph;
    /**
     * 4.3 Graph Constraint System (系统物理定律)
     */
    applyConstraints(constraints: Constraint[]): RequirementGraph;
    /**
     * 4.4 Probabilistic Completion Engine (概率驱动补全)
     */
    completeProbabilistically(): ProbabilisticCompletion;
    /**
     * 4.5 Deep Reasoning Engine (深度推理)
     */
    reasonDeeply(hypothesis: string): ReasoningResult;
    /**
     * 4.6 Global Optimization Engine (全局优化)
     */
    optimizeGlobally(): OptimizationResult;
    /**
     * 4.7 Graph Versioning (版本系统)
     */
    version(operation: VersionOperation): RequirementGraph;
    /**
     * 4.8 Requirement Compiler (需求编译器)
     */
    compileToIR(): IR;
    /**
     * 添加层级节点
     */
    private addLevel;
    /**
     * 去重节点
     */
    private deduplicateNodes;
    /**
     * 统一命名
     */
    private unifyNaming;
    /**
     * 规范化结构
     */
    private normalizeStructure;
    /**
     * 应用约束
     */
    private applyConstraint;
    /**
     * 生成候选
     */
    private generateCandidates;
    /**
     * 概率评分
     */
    private scoreProbability;
    /**
     * 多跳推理
     */
    private multiHopReasoning;
    /**
     * 反事实推理
     */
    private counterfactualReasoning;
    /**
     * 计算指标
     */
    private calculateMetrics;
    /**
     * 优化复杂度
     */
    private optimizeComplexity;
    /**
     * 优化性能
     */
    private optimizePerformance;
    /**
     * 优化成本
     */
    private optimizeCost;
    /**
     * 优化可维护性
     */
    private optimizeMaintainability;
    /**
     * 提交版本
     */
    private commit;
    /**
     * 版本差异
     */
    private diff;
    /**
     * 回滚版本
     */
    private rollback;
    /**
     * 编译 Service IR
     */
    private compileServiceIR;
    /**
     * 编译 UI IR
     */
    private compileUIIR;
    /**
     * 编译 Workflow IR
     */
    private compileWorkflowIR;
    /**
     * 编译 Data IR
     */
    private compileDataIR;
}
export default RequirementGraphEngine;
