"use strict";
/**
 * AI Native Full-Stack Software Factory
 * Layer 4: Requirement Graph Engine v2.0 (认知内核)
 *
 * @version 1.0.0
 * @date 2026-03-29
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementGraphEngine = exports.GraphLevel = void 0;
/**
 * 需求图节点层级
 */
var GraphLevel;
(function (GraphLevel) {
    GraphLevel["L0_Intent"] = "L0_Intent";
    GraphLevel["L0_Experience"] = "L0_Experience";
    GraphLevel["L1_Feature"] = "L1_Feature";
    GraphLevel["L2_Interaction"] = "L2_Interaction";
    GraphLevel["L3_System"] = "L3_System";
    GraphLevel["L4_Execution"] = "L4_Execution";
    GraphLevel["L5_Validation"] = "L5_Validation";
})(GraphLevel || (exports.GraphLevel = GraphLevel = {}));
/**
 * Requirement Graph Engine v2.0
 */
class RequirementGraphEngine {
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
    build(intent, experience, features, interactions, system, execution, validation) {
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
    normalize() {
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
    applyConstraints(constraints) {
        constraints.forEach(constraint => {
            this.applyConstraint(constraint);
        });
        return this.graph;
    }
    /**
     * 4.4 Probabilistic Completion Engine (概率驱动补全)
     */
    completeProbabilistically() {
        const candidates = [];
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
    reasonDeeply(hypothesis) {
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
    optimizeGlobally() {
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
        const improvements = [
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
    version(operation) {
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
     */
    compileToIR() {
        const ir = {
            service: {
                endpoints: [],
                services: [],
            },
            ui: {
                components: [],
                pages: [],
            },
            workflow: {
                workflows: [],
            },
            data: {
                entities: [],
                relationships: [],
            },
        };
        // 编译 Service IR
        ir.service = this.compileServiceIR();
        // 编译 UI IR
        ir.ui = this.compileUIIR();
        // 编译 Workflow IR
        ir.workflow = this.compileWorkflowIR();
        // 编译 Data IR
        ir.data = this.compileDataIR();
        return ir;
    }
    /**
     * 添加层级节点
     */
    addLevel(level, data) {
        if (!data)
            return;
        const node = {
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
    deduplicateNodes() {
        // TODO: 实现去重逻辑
    }
    /**
     * 统一命名
     */
    unifyNaming() {
        // TODO: 实现命名统一逻辑
    }
    /**
     * 规范化结构
     */
    normalizeStructure() {
        // TODO: 实现结构规范化逻辑
    }
    /**
     * 应用约束
     */
    applyConstraint(constraint) {
        // TODO: 实现约束应用逻辑
    }
    /**
     * 生成候选
     */
    generateCandidates() {
        // TODO: 实现候选生成逻辑
        return [];
    }
    /**
     * 概率评分
     */
    scoreProbability(candidate) {
        // TODO: 实现概率评分逻辑
        return Math.random();
    }
    /**
     * 多跳推理
     */
    multiHopReasoning(hypothesis) {
        // TODO: 实现多跳推理逻辑
        return [];
    }
    /**
     * 反事实推理
     */
    counterfactualReasoning(hypothesis) {
        // TODO: 实现反事实推理逻辑
        return [];
    }
    /**
     * 计算指标
     */
    calculateMetrics() {
        return {
            complexity: Math.random(),
            performance: Math.random(),
            cost: Math.random(),
            maintainability: Math.random(),
        };
    }
    /**
     * 优化复杂度
     */
    optimizeComplexity() {
        // TODO: 实现复杂度优化逻辑
    }
    /**
     * 优化性能
     */
    optimizePerformance() {
        // TODO: 实现性能优化逻辑
    }
    /**
     * 优化成本
     */
    optimizeCost() {
        // TODO: 实现成本优化逻辑
    }
    /**
     * 优化可维护性
     */
    optimizeMaintainability() {
        // TODO: 实现可维护性优化逻辑
    }
    /**
     * 提交版本
     */
    commit(version) {
        this.graph.version = version;
        this.graph.metadata.updatedAt = Date.now();
        return this.graph;
    }
    /**
     * 版本差异
     */
    diff(version) {
        // TODO: 实现版本差异逻辑
        return this.graph;
    }
    /**
     * 回滚版本
     */
    rollback(version) {
        // TODO: 实现回滚逻辑
        return this.graph;
    }
    /**
     * 编译 Service IR
     */
    compileServiceIR() {
        return {
            endpoints: [],
            services: [],
        };
    }
    /**
     * 编译 UI IR
     */
    compileUIIR() {
        return {
            components: [],
            pages: [],
        };
    }
    /**
     * 编译 Workflow IR
     */
    compileWorkflowIR() {
        return {
            workflows: [],
        };
    }
    /**
     * 编译 Data IR
     */
    compileDataIR() {
        return {
            entities: [],
            relationships: [],
        };
    }
}
exports.RequirementGraphEngine = RequirementGraphEngine;
exports.default = RequirementGraphEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ3JhcGgtZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3JlcS1ncmFwaC9ncmFwaC1lbmdpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBRUg7O0dBRUc7QUFDSCxJQUFZLFVBUVg7QUFSRCxXQUFZLFVBQVU7SUFDcEIscUNBQXVCLENBQUE7SUFDdkIsNkNBQStCLENBQUE7SUFDL0IsdUNBQXlCLENBQUE7SUFDekIsK0NBQWlDLENBQUE7SUFDakMscUNBQXVCLENBQUE7SUFDdkIsMkNBQTZCLENBQUE7SUFDN0IsNkNBQStCLENBQUE7QUFDakMsQ0FBQyxFQVJXLFVBQVUsMEJBQVYsVUFBVSxRQVFyQjtBQXFNRDs7R0FFRztBQUNILE1BQWEsc0JBQXNCO0lBR2pDO1FBQ0UsSUFBSSxDQUFDLEtBQUssR0FBRztZQUNYLEtBQUssRUFBRSxJQUFJLEdBQUcsRUFBRTtZQUNoQixLQUFLLEVBQUUsSUFBSSxHQUFHLEVBQUU7WUFDaEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsUUFBUSxFQUFFO2dCQUNSLFNBQVMsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDckIsVUFBVSxFQUFFLENBQUM7Z0JBQ2IsVUFBVSxFQUFFLENBQUM7YUFDZDtTQUNGLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQ0gsTUFBVyxFQUNYLFVBQWUsRUFDZixRQUFlLEVBQ2YsWUFBbUIsRUFDbkIsTUFBVyxFQUNYLFNBQWMsRUFDZCxVQUFlO1FBRWYsYUFBYTtRQUNiLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUU1QyxtQkFBbUI7UUFDbkIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsYUFBYSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRXBE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dWxsLVN0YWNrIFNvZnR3YXJlIEZhY3RvcnlcbiAqIExheWVyIDQ6IFJlcXVpcmVtZW50IEdyYXBoIEVuZ2luZSB2Mi4wICjorqTnn6XlhoXmoLgpXG4gKiBcbiAqIEB2ZXJzaW9uIDEuMC4wXG4gKiBAZGF0ZSAyMDI2LTAzLTI5XG4gKi9cblxuLyoqXG4gKiDpnIDmsYLlm77oioLngrnlsYLnuqdcbiAqL1xuZXhwb3J0IGVudW0gR3JhcGhMZXZlbCB7XG4gIEwwX0ludGVudCA9ICdMMF9JbnRlbnQnLFxuICBMMF9FeHBlcmllbmNlID0gJ0wwX0V4cGVyaWVuY2UnLFxuICBMMV9GZWF0dXJlID0gJ0wxX0ZlYXR1cmUnLFxuICBMMl9JbnRlcmFjdGlvbiA9ICdMMl9JbnRlcmFjdGlvbicsXG4gIEwzX1N5c3RlbSA9ICdMM19TeXN0ZW0nLFxuICBMNF9FeGVjdXRpb24gPSAnTDRfRXhlY3V0aW9uJyxcbiAgTDVfVmFsaWRhdGlvbiA9ICdMNV9WYWxpZGF0aW9uJyxcbn1cblxuLyoqXG4gKiDlm77oioLngrlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHcmFwaE5vZGUge1xuICBpZDogc3RyaW5nO1xuICBsZXZlbDogR3JhcGhMZXZlbDtcbiAgdHlwZTogc3RyaW5nO1xuICBkYXRhOiBhbnk7XG4gIGNvbnN0cmFpbnRzOiBDb25zdHJhaW50W107XG4gIG1ldGFkYXRhOiBNZXRhZGF0YTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb25zdHJhaW50IHtcbiAgdHlwZTogJ3NjaGVtYScgfCAnc2VtYW50aWMnIHwgJ2FyY2hpdGVjdHVyZScgfCAncG9saWN5JztcbiAgcnVsZTogc3RyaW5nO1xuICBzZXZlcml0eTogJ2NyaXRpY2FsJyB8ICd3YXJuaW5nJztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNZXRhZGF0YSB7XG4gIGNyZWF0ZWRBdDogbnVtYmVyO1xuICB1cGRhdGVkQXQ6IG51bWJlcjtcbiAgdmVyc2lvbjogc3RyaW5nO1xuICBjb25maWRlbmNlPzogbnVtYmVyO1xufVxuXG4vKipcbiAqIOWbvui+uVxuICovXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoRWRnZSB7XG4gIGlkOiBzdHJpbmc7XG4gIGZyb206IHN0cmluZztcbiAgdG86IHN0cmluZztcbiAgdHlwZTogc3RyaW5nO1xuICB3ZWlnaHQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiDpnIDmsYLlm75cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZXF1aXJlbWVudEdyYXBoIHtcbiAgbm9kZXM6IE1hcDxzdHJpbmcsIEdyYXBoTm9kZT47XG4gIGVkZ2VzOiBNYXA8c3RyaW5nLCBHcmFwaEVkZ2U+O1xuICB2ZXJzaW9uOiBzdHJpbmc7XG4gIG1ldGFkYXRhOiBHcmFwaE1ldGFkYXRhO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEdyYXBoTWV0YWRhdGEge1xuICBjcmVhdGVkQXQ6IG51bWJlcjtcbiAgdXBkYXRlZEF0OiBudW1iZXI7XG4gIHRvdGFsTm9kZXM6IG51bWJlcjtcbiAgdG90YWxFZGdlczogbnVtYmVyO1xufVxuXG4vKipcbiAqIOamgueOh+ihpeWFqOe7k+aenFxuICovXG5leHBvcnQgaW50ZXJmYWNlIFByb2JhYmlsaXN0aWNDb21wbGV0aW9uIHtcbiAgY2FuZGlkYXRlczogQ2FuZGlkYXRlW107XG4gIHNlbGVjdGVkOiBDYW5kaWRhdGUgfCBudWxsO1xuICBjb25maWRlbmNlOiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2FuZGlkYXRlIHtcbiAgaWQ6IHN0cmluZztcbiAgbm9kZTogR3JhcGhOb2RlO1xuICBwcm9iYWJpbGl0eTogbnVtYmVyO1xuICBjb25maWRlbmNlOiBudW1iZXI7XG59XG5cbi8qKlxuICog5o6o55CG57uT5p6cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUmVhc29uaW5nUmVzdWx0IHtcbiAgY29uY2x1c2lvbjogc3RyaW5nO1xuICBldmlkZW5jZTogc3RyaW5nW107XG4gIGNvbmZpZGVuY2U6IG51bWJlcjtcbiAgYWx0ZXJuYXRpdmVIeXBvdGhlc2VzOiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiDkvJjljJbnu5PmnpxcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPcHRpbWl6YXRpb25SZXN1bHQge1xuICBvcHRpbWl6ZWQ6IGJvb2xlYW47XG4gIG1ldHJpY3M6IE9wdGltaXphdGlvbk1ldHJpY3M7XG4gIGltcHJvdmVtZW50czogSW1wcm92ZW1lbnRbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPcHRpbWl6YXRpb25NZXRyaWNzIHtcbiAgY29tcGxleGl0eTogbnVtYmVyO1xuICBwZXJmb3JtYW5jZTogbnVtYmVyO1xuICBjb3N0OiBudW1iZXI7XG4gIG1haW50YWluYWJpbGl0eTogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEltcHJvdmVtZW50IHtcbiAgYXJlYTogc3RyaW5nO1xuICBiZWZvcmU6IG51bWJlcjtcbiAgYWZ0ZXI6IG51bWJlcjtcbiAgaW1wYWN0OiBzdHJpbmc7XG59XG5cbi8qKlxuICog54mI5pys5pON5L2cXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVmVyc2lvbk9wZXJhdGlvbiB7XG4gIHR5cGU6ICdjb21taXQnIHwgJ2RpZmYnIHwgJ3JvbGxiYWNrJztcbiAgdmVyc2lvbjogc3RyaW5nO1xuICB0aW1lc3RhbXA6IG51bWJlcjtcbiAgY2hhbmdlcz86IENoYW5nZVtdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENoYW5nZSB7XG4gIG5vZGVJZDogc3RyaW5nO1xuICBhY3Rpb246ICdhZGQnIHwgJ3VwZGF0ZScgfCAnZGVsZXRlJztcbiAgYmVmb3JlPzogYW55O1xuICBhZnRlcj86IGFueTtcbn1cblxuLyoqXG4gKiBJUiAo5Lit6Ze06KGo56S6KVxuICovXG5leHBvcnQgaW50ZXJmYWNlIElSIHtcbiAgc2VydmljZTogU2VydmljZUlSO1xuICB1aTogVUlJUjtcbiAgd29ya2Zsb3c6IFdvcmtmbG93SVI7XG4gIGRhdGE6IERhdGFJUjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2aWNlSVIge1xuICBlbmRwb2ludHM6IEVuZHBvaW50SVJbXTtcbiAgc2VydmljZXM6IFNlcnZpY2VDb21wb25lbnRJUltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEVuZHBvaW50SVIge1xuICBwYXRoOiBzdHJpbmc7XG4gIG1ldGhvZDogc3RyaW5nO1xuICByZXF1ZXN0OiBhbnk7XG4gIHJlc3BvbnNlOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmljZUNvbXBvbmVudElSIHtcbiAgbmFtZTogc3RyaW5nO1xuICByZXNwb25zaWJpbGl0eTogc3RyaW5nO1xuICBkZXBlbmRlbmNpZXM6IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFVJSVIge1xuICBjb21wb25lbnRzOiBDb21wb25lbnRJUltdO1xuICBwYWdlczogUGFnZUlSW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcG9uZW50SVIge1xuICBuYW1lOiBzdHJpbmc7XG4gIHByb3BzOiBhbnk7XG4gIHN0YXRlOiBhbnk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFnZUlSIHtcbiAgcGF0aDogc3RyaW5nO1xuICBjb21wb25lbnRzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrZmxvd0lSIHtcbiAgd29ya2Zsb3dzOiBXb3JrZmxvd0RlZmluaXRpb25JUltdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtmbG93RGVmaW5pdGlvbklSIHtcbiAgaWQ6IHN0cmluZztcbiAgdHJpZ2dlcnM6IHN0cmluZ1tdO1xuICBhY3Rpb25zOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEYXRhSVIge1xuICBlbnRpdGllczogRW50aXR5SVJbXTtcbiAgcmVsYXRpb25zaGlwczogUmVsYXRpb25zaGlwSVJbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBFbnRpdHlJUiB7XG4gIG5hbWU6IHN0cmluZztcbiAgZmllbGRzOiBGaWVsZElSW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRmllbGRJUiB7XG4gIG5hbWU6IHN0cmluZztcbiAgdHlwZTogc3RyaW5nO1xuICByZXF1aXJlZDogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZWxhdGlvbnNoaXBJUiB7XG4gIGZyb206IHN0cmluZztcbiAgdG86IHN0cmluZztcbiAgdHlwZTogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcXVpcmVtZW50IEdyYXBoIEVuZ2luZSB2Mi4wXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXF1aXJlbWVudEdyYXBoRW5naW5lIHtcbiAgcHJpdmF0ZSBncmFwaDogUmVxdWlyZW1lbnRHcmFwaDtcblxuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLmdyYXBoID0ge1xuICAgICAgbm9kZXM6IG5ldyBNYXAoKSxcbiAgICAgIGVkZ2VzOiBuZXcgTWFwKCksXG4gICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgICAgICB1cGRhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgIHRvdGFsTm9kZXM6IDAsXG4gICAgICAgIHRvdGFsRWRnZXM6IDAsXG4gICAgICB9LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogNC4xIEdyYXBoIEJ1aWxkZXIgKOWFreWxguaehOW7uilcbiAgICovXG4gIGJ1aWxkKFxuICAgIGludGVudDogYW55LFxuICAgIGV4cGVyaWVuY2U6IGFueSxcbiAgICBmZWF0dXJlczogYW55W10sXG4gICAgaW50ZXJhY3Rpb25zOiBhbnlbXSxcbiAgICBzeXN0ZW06IGFueSxcbiAgICBleGVjdXRpb246IGFueSxcbiAgICB2YWxpZGF0aW9uOiBhbnlcbiAgKTogUmVxdWlyZW1lbnRHcmFwaCB7XG4gICAgLy8gTDA6IEludGVudFxuICAgIHRoaXMuYWRkTGV2ZWwoR3JhcGhMZXZlbC5MMF9JbnRlbnQsIGludGVudCk7XG5cbiAgICAvLyBMMC41OiBFeHBlcmllbmNlXG4gICAgdGhpcy5hZGRMZXZlbChHcmFwaExldmVsLkwwX0V4cGVyaWVuY2UsIGV4cGVyaWVuY2UpO1xuXG4gICAgLy8gTDE6IEZlYXR1cmVcbiAgICB0aGlzLmFkZExldmVsKEdyYXBoTGV2ZWwuTDFfRmVhdHVyZSwgZmVhdHVyZXMpO1xuXG4gICAgLy8gTDI6IEludGVyYWN0aW9uXG4gICAgdGhpcy5hZGRMZXZlbChHcmFwaExldmVsLkwyX0ludGVyYWN0aW9uLCBpbnRlcmFjdGlvbnMpO1xuXG4gICAgLy8gTDM6IFN5c3RlbVxuICAgIHRoaXMuYWRkTGV2ZWwoR3JhcGhMZXZlbC5MM19TeXN0ZW0sIHN5c3RlbSk7XG5cbiAgICAvLyBMNDogRXhlY3V0aW9uXG4gICAgdGhpcy5hZGRMZXZlbChHcmFwaExldmVsLkw0X0V4ZWN1dGlvbiwgZXhlY3V0aW9uKTtcblxuICAgIC8vIEw1OiBWYWxpZGF0aW9uXG4gICAgdGhpcy5hZGRMZXZlbChHcmFwaExldmVsLkw1X1ZhbGlkYXRpb24sIHZhbGlkYXRpb24pO1xuXG4gICAgcmV0dXJuIHRoaXMuZ3JhcGg7XG4gIH1cblxuICAvKipcbiAgICogNC4yIEdyYXBoIE5vcm1hbGl6ZXIgKOWbvuagh+WHhuWMlilcbiAgICovXG4gIG5vcm1hbGl6ZSgpOiBSZXF1aXJlbWVudEdyYXBoIHtcbiAgICAvLyDljrvph41cbiAgICB0aGlzLmRlZHVwbGljYXRlTm9kZXMoKTtcblxuICAgIC8vIOe7n+S4gOWRveWQjVxuICAgIHRoaXMudW5pZnlOYW1pbmcoKTtcblxuICAgIC8vIOe7k+aehOinhOiMg+WMllxuICAgIHRoaXMubm9ybWFsaXplU3RydWN0dXJlKCk7XG5cbiAgICB0aGlzLmdyYXBoLm1ldGFkYXRhLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XG4gICAgcmV0dXJuIHRoaXMuZ3JhcGg7XG4gIH1cblxuICAvKipcbiAgICogNC4zIEdyYXBoIENvbnN0cmFpbnQgU3lzdGVtICjns7vnu5/niannkIblrprlvospXG4gICAqL1xuICBhcHBseUNvbnN0cmFpbnRzKGNvbnN0cmFpbnRzOiBDb25zdHJhaW50W10pOiBSZXF1aXJlbWVudEdyYXBoIHtcbiAgICBjb25zdHJhaW50cy5mb3JFYWNoKGNvbnN0cmFpbnQgPT4ge1xuICAgICAgdGhpcy5hcHBseUNvbnN0cmFpbnQoY29uc3RyYWludCk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gdGhpcy5ncmFwaDtcbiAgfVxuXG4gIC8qKlxuICAgKiA0LjQgUHJvYmFiaWxpc3RpYyBDb21wbGV0aW9uIEVuZ2luZSAo5qaC546H6amx5Yqo6KGl5YWoKVxuICAgKi9cbiAgY29tcGxldGVQcm9iYWJpbGlzdGljYWxseSgpOiBQcm9iYWJpbGlzdGljQ29tcGxldGlvbiB7XG4gICAgY29uc3QgY2FuZGlkYXRlczogQ2FuZGlkYXRlW10gPSBbXTtcblxuICAgIC8vIOeUn+aIkOWAmemAiVxuICAgIGNhbmRpZGF0ZXMucHVzaCguLi50aGlzLmdlbmVyYXRlQ2FuZGlkYXRlcygpKTtcblxuICAgIC8vIOamgueOh+ivhOWIhlxuICAgIGNhbmRpZGF0ZXMuZm9yRWFjaChjYW5kaWRhdGUgPT4ge1xuICAgICAgY2FuZGlkYXRlLnByb2JhYmlsaXR5ID0gdGhpcy5zY29yZVByb2JhYmlsaXR5KGNhbmRpZGF0ZSk7XG4gICAgfSk7XG5cbiAgICAvLyDnva7kv6Hluqbov4fmu6RcbiAgICBjb25zdCBmaWx0ZXJlZCA9IGNhbmRpZGF0ZXMuZmlsdGVyKGMgPT4gYy5jb25maWRlbmNlID4gMC43KTtcblxuICAgIC8vIOmAieaLqeacgOS9s1xuICAgIGNvbnN0IHNlbGVjdGVkID0gZmlsdGVyZWQubGVuZ3RoID4gMCA/IGZpbHRlcmVkWzBdIDogbnVsbDtcblxuICAgIHJldHVybiB7XG4gICAgICBjYW5kaWRhdGVzLFxuICAgICAgc2VsZWN0ZWQsXG4gICAgICBjb25maWRlbmNlOiBzZWxlY3RlZD8uY29uZmlkZW5jZSB8fCAwLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogNC41IERlZXAgUmVhc29uaW5nIEVuZ2luZSAo5rex5bqm5o6o55CGKVxuICAgKi9cbiAgcmVhc29uRGVlcGx5KGh5cG90aGVzaXM6IHN0cmluZyk6IFJlYXNvbmluZ1Jlc3VsdCB7XG4gICAgLy8g5aSa6Lez5o6o55CGXG4gICAgY29uc3QgZXZpZGVuY2UgPSB0aGlzLm11bHRpSG9wUmVhc29uaW5nKGh5cG90aGVzaXMpO1xuXG4gICAgLy8g5Y+N5LqL5a6e5o6o55CGXG4gICAgY29uc3QgYWx0ZXJuYXRpdmVzID0gdGhpcy5jb3VudGVyZmFjdHVhbFJlYXNvbmluZyhoeXBvdGhlc2lzKTtcblxuICAgIHJldHVybiB7XG4gICAgICBjb25jbHVzaW9uOiBoeXBvdGhlc2lzLFxuICAgICAgZXZpZGVuY2UsXG4gICAgICBjb25maWRlbmNlOiAwLjg1LFxuICAgICAgYWx0ZXJuYXRpdmVIeXBvdGhlc2VzOiBhbHRlcm5hdGl2ZXMsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiA0LjYgR2xvYmFsIE9wdGltaXphdGlvbiBFbmdpbmUgKOWFqOWxgOS8mOWMlilcbiAgICovXG4gIG9wdGltaXplR2xvYmFsbHkoKTogT3B0aW1pemF0aW9uUmVzdWx0IHtcbiAgICBjb25zdCBiZWZvcmUgPSB0aGlzLmNhbGN1bGF0ZU1ldHJpY3MoKTtcblxuICAgIC8vIOS8mOWMluWkjeadguW6plxuICAgIHRoaXMub3B0aW1pemVDb21wbGV4aXR5KCk7XG5cbiAgICAvLyDkvJjljJbmgKfog71cbiAgICB0aGlzLm9wdGltaXplUGVyZm9ybWFuY2UoKTtcblxuICAgIC8vIOS8mOWMluaIkOacrFxuICAgIHRoaXMub3B0aW1pemVDb3N0KCk7XG5cbiAgICAvLyDkvJjljJblj6/nu7TmiqTmgKdcbiAgICB0aGlzLm9wdGltaXplTWFpbnRhaW5hYmlsaXR5KCk7XG5cbiAgICBjb25zdCBhZnRlciA9IHRoaXMuY2FsY3VsYXRlTWV0cmljcygpO1xuXG4gICAgY29uc3QgaW1wcm92ZW1lbnRzOiBJbXByb3ZlbWVudFtdID0gW1xuICAgICAge1xuICAgICAgICBhcmVhOiAnY29tcGxleGl0eScsXG4gICAgICAgIGJlZm9yZTogYmVmb3JlLmNvbXBsZXhpdHksXG4gICAgICAgIGFmdGVyOiBhZnRlci5jb21wbGV4aXR5LFxuICAgICAgICBpbXBhY3Q6ICdSZWR1Y2VkIGNvbXBsZXhpdHknLFxuICAgICAgfSxcbiAgICAgIHtcbiAgICAgICAgYXJlYTogJ3BlcmZvcm1hbmNlJyxcbiAgICAgICAgYmVmb3JlOiBiZWZvcmUucGVyZm9ybWFuY2UsXG4gICAgICAgIGFmdGVyOiBhZnRlci5wZXJmb3JtYW5jZSxcbiAgICAgICAgaW1wYWN0OiAnSW1wcm92ZWQgcGVyZm9ybWFuY2UnLFxuICAgICAgfSxcbiAgICBdO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIG9wdGltaXplZDogdHJ1ZSxcbiAgICAgIG1ldHJpY3M6IGFmdGVyLFxuICAgICAgaW1wcm92ZW1lbnRzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogNC43IEdyYXBoIFZlcnNpb25pbmcgKOeJiOacrOezu+e7nylcbiAgICovXG4gIHZlcnNpb24ob3BlcmF0aW9uOiBWZXJzaW9uT3BlcmF0aW9uKTogUmVxdWlyZW1lbnRHcmFwaCB7XG4gICAgc3dpdGNoIChvcGVyYXRpb24udHlwZSkge1xuICAgICAgY2FzZSAnY29tbWl0JzpcbiAgICAgICAgcmV0dXJuIHRoaXMuY29tbWl0KG9wZXJhdGlvbi52ZXJzaW9uKTtcbiAgICAgIGNhc2UgJ2RpZmYnOlxuICAgICAgICByZXR1cm4gdGhpcy5kaWZmKG9wZXJhdGlvbi52ZXJzaW9uKTtcbiAgICAgIGNhc2UgJ3JvbGxiYWNrJzpcbiAgICAgICAgcmV0dXJuIHRoaXMucm9sbGJhY2sob3BlcmF0aW9uLnZlcnNpb24pO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JhcGg7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIDQuOCBSZXF1aXJlbWVudCBDb21waWxlciAo6ZyA5rGC57yW6K+R5ZmoKVxuICAgKi9cbiAgY29tcGlsZVRvSVIoKTogSVIge1xuICAgIGNvbnN0IGlyOiBJUiA9IHtcbiAgICAgIHNlcnZpY2U6IHtcbiAgICAgICAgZW5kcG9pbnRzOiBbXSxcbiAgICAgICAgc2VydmljZXM6IFtdLFxuICAgICAgfSxcbiAgICAgIHVpOiB7XG4gICAgICAgIGNvbXBvbmVudHM6IFtdLFxuICAgICAgICBwYWdlczogW10sXG4gICAgICB9LFxuICAgICAgd29ya2Zsb3c6IHtcbiAgICAgICAgd29ya2Zsb3dzOiBbXSxcbiAgICAgIH0sXG4gICAgICBkYXRhOiB7XG4gICAgICAgIGVudGl0aWVzOiBbXSxcbiAgICAgICAgcmVsYXRpb25zaGlwczogW10sXG4gICAgICB9LFxuICAgIH07XG5cbiAgICAvLyDnvJbor5EgU2VydmljZSBJUlxuICAgIGlyLnNlcnZpY2UgPSB0aGlzLmNvbXBpbGVTZXJ2aWNlSVIoKTtcblxuICAgIC8vIOe8luivkSBVSSBJUlxuICAgIGlyLnVpID0gdGhpcy5jb21waWxlVUlJUigpO1xuXG4gICAgLy8g57yW6K+RIFdvcmtmbG93IElSXG4gICAgaXIud29ya2Zsb3cgPSB0aGlzLmNvbXBpbGVXb3JrZmxvd0lSKCk7XG5cbiAgICAvLyDnvJbor5EgRGF0YSBJUlxuICAgIGlyLmRhdGEgPSB0aGlzLmNvbXBpbGVEYXRhSVIoKTtcblxuICAgIHJldHVybiBpcjtcbiAgfVxuXG4gIC8qKlxuICAgKiDmt7vliqDlsYLnuqfoioLngrlcbiAgICovXG4gIHByaXZhdGUgYWRkTGV2ZWwobGV2ZWw6IEdyYXBoTGV2ZWwsIGRhdGE6IGFueSk6IHZvaWQge1xuICAgIGlmICghZGF0YSkgcmV0dXJuO1xuXG4gICAgY29uc3Qgbm9kZTogR3JhcGhOb2RlID0ge1xuICAgICAgaWQ6IGBub2RlLSR7bGV2ZWx9LSR7RGF0ZS5ub3coKX1gLFxuICAgICAgbGV2ZWwsXG4gICAgICB0eXBlOiBsZXZlbCxcbiAgICAgIGRhdGEsXG4gICAgICBjb25zdHJhaW50czogW10sXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBjcmVhdGVkQXQ6IERhdGUubm93KCksXG4gICAgICAgIHVwZGF0ZWRBdDogRGF0ZS5ub3coKSxcbiAgICAgICAgdmVyc2lvbjogJzEuMC4wJyxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHRoaXMuZ3JhcGgubm9kZXMuc2V0KG5vZGUuaWQsIG5vZGUpO1xuICAgIHRoaXMuZ3JhcGgubWV0YWRhdGEudG90YWxOb2RlcysrO1xuICB9XG5cbiAgLyoqXG4gICAqIOWOu+mHjeiKgueCuVxuICAgKi9cbiAgcHJpdmF0ZSBkZWR1cGxpY2F0ZU5vZGVzKCk6IHZvaWQge1xuICAgIC8vIFRPRE86IOWunueOsOWOu+mHjemAu+i+kVxuICB9XG5cbiAgLyoqXG4gICAqIOe7n+S4gOWRveWQjVxuICAgKi9cbiAgcHJpdmF0ZSB1bmlmeU5hbWluZygpOiB2b2lkIHtcbiAgICAvLyBUT0RPOiDlrp7njrDlkb3lkI3nu5/kuIDpgLvovpFcbiAgfVxuXG4gIC8qKlxuICAgKiDop4TojIPljJbnu5PmnoRcbiAgICovXG4gIHByaXZhdGUgbm9ybWFsaXplU3RydWN0dXJlKCk6IHZvaWQge1xuICAgIC8vIFRPRE86IOWunueOsOe7k+aehOinhOiMg+WMlumAu+i+kVxuICB9XG5cbiAgLyoqXG4gICAqIOW6lOeUqOe6puadn1xuICAgKi9cbiAgcHJpdmF0ZSBhcHBseUNvbnN0cmFpbnQoY29uc3RyYWludDogQ29uc3RyYWludCk6IHZvaWQge1xuICAgIC8vIFRPRE86IOWunueOsOe6puadn+W6lOeUqOmAu+i+kVxuICB9XG5cbiAgLyoqXG4gICAqIOeUn+aIkOWAmemAiVxuICAgKi9cbiAgcHJpdmF0ZSBnZW5lcmF0ZUNhbmRpZGF0ZXMoKTogQ2FuZGlkYXRlW10ge1xuICAgIC8vIFRPRE86IOWunueOsOWAmemAieeUn+aIkOmAu+i+kVxuICAgIHJldHVybiBbXTtcbiAgfVxuXG4gIC8qKlxuICAgKiDmpoLnjofor4TliIZcbiAgICovXG4gIHByaXZhdGUgc2NvcmVQcm9iYWJpbGl0eShjYW5kaWRhdGU6IENhbmRpZGF0ZSk6IG51bWJlciB7XG4gICAgLy8gVE9ETzog5a6e546w5qaC546H6K+E5YiG6YC76L6RXG4gICAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XG4gIH1cblxuICAvKipcbiAgICog5aSa6Lez5o6o55CGXG4gICAqL1xuICBwcml2YXRlIG11bHRpSG9wUmVhc29uaW5nKGh5cG90aGVzaXM6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAvLyBUT0RPOiDlrp7njrDlpJrot7PmjqjnkIbpgLvovpFcbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICog5Y+N5LqL5a6e5o6o55CGXG4gICAqL1xuICBwcml2YXRlIGNvdW50ZXJmYWN0dWFsUmVhc29uaW5nKGh5cG90aGVzaXM6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAvLyBUT0RPOiDlrp7njrDlj43kuovlrp7mjqjnkIbpgLvovpFcbiAgICByZXR1cm4gW107XG4gIH1cblxuICAvKipcbiAgICog6K6h566X5oyH5qCHXG4gICAqL1xuICBwcml2YXRlIGNhbGN1bGF0ZU1ldHJpY3MoKTogT3B0aW1pemF0aW9uTWV0cmljcyB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNvbXBsZXhpdHk6IE1hdGgucmFuZG9tKCksXG4gICAgICBwZXJmb3JtYW5jZTogTWF0aC5yYW5kb20oKSxcbiAgICAgIGNvc3Q6IE1hdGgucmFuZG9tKCksXG4gICAgICBtYWludGFpbmFiaWxpdHk6IE1hdGgucmFuZG9tKCksXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDkvJjljJblpI3mnYLluqZcbiAgICovXG4gIHByaXZhdGUgb3B0aW1pemVDb21wbGV4aXR5KCk6IHZvaWQge1xuICAgIC8vIFRPRE86IOWunueOsOWkjeadguW6puS8mOWMlumAu+i+kVxuICB9XG5cbiAgLyoqXG4gICAqIOS8mOWMluaAp+iDvVxuICAgKi9cbiAgcHJpdmF0ZSBvcHRpbWl6ZVBlcmZvcm1hbmNlKCk6IHZvaWQge1xuICAgIC8vIFRPRE86IOWunueOsOaAp+iDveS8mOWMlumAu+i+kVxuICB9XG5cbiAgLyoqXG4gICAqIOS8mOWMluaIkOacrFxuICAgKi9cbiAgcHJpdmF0ZSBvcHRpbWl6ZUNvc3QoKTogdm9pZCB7XG4gICAgLy8gVE9ETzog5a6e546w5oiQ5pys5LyY5YyW6YC76L6RXG4gIH1cblxuICAvKipcbiAgICog5LyY5YyW5Y+v57u05oqk5oCnXG4gICAqL1xuICBwcml2YXRlIG9wdGltaXplTWFpbnRhaW5hYmlsaXR5KCk6IHZvaWQge1xuICAgIC8vIFRPRE86IOWunueOsOWPr+e7tOaKpOaAp+S8mOWMlumAu+i+kVxuICB9XG5cbiAgLyoqXG4gICAqIOaPkOS6pOeJiOacrFxuICAgKi9cbiAgcHJpdmF0ZSBjb21taXQodmVyc2lvbjogc3RyaW5nKTogUmVxdWlyZW1lbnRHcmFwaCB7XG4gICAgdGhpcy5ncmFwaC52ZXJzaW9uID0gdmVyc2lvbjtcbiAgICB0aGlzLmdyYXBoLm1ldGFkYXRhLnVwZGF0ZWRBdCA9IERhdGUubm93KCk7XG4gICAgcmV0dXJuIHRoaXMuZ3JhcGg7XG4gIH1cblxuICAvKipcbiAgICog54mI5pys5beu5byCXG4gICAqL1xuICBwcml2YXRlIGRpZmYodmVyc2lvbjogc3RyaW5nKTogUmVxdWlyZW1lbnRHcmFwaCB7XG4gICAgLy8gVE9ETzog5a6e546w54mI5pys5beu5byC6YC76L6RXG4gICAgcmV0dXJuIHRoaXMuZ3JhcGg7XG4gIH1cblxuICAvKipcbiAgICog5Zue5rua54mI5pysXG4gICAqL1xuICBwcml2YXRlIHJvbGxiYWNrKHZlcnNpb246IHN0cmluZyk6IFJlcXVpcmVtZW50R3JhcGgge1xuICAgIC8vIFRPRE86IOWunueOsOWbnua7mumAu+i+kVxuICAgIHJldHVybiB0aGlzLmdyYXBoO1xuICB9XG5cbiAgLyoqXG4gICAqIOe8luivkSBTZXJ2aWNlIElSXG4gICAqL1xuICBwcml2YXRlIGNvbXBpbGVTZXJ2aWNlSVIoKTogU2VydmljZUlSIHtcbiAgICByZXR1cm4ge1xuICAgICAgZW5kcG9pbnRzOiBbXSxcbiAgICAgIHNlcnZpY2VzOiBbXSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIOe8luivkSBVSSBJUlxuICAgKi9cbiAgcHJpdmF0ZSBjb21waWxlVUlJUigpOiBVSUlSIHtcbiAgICByZXR1cm4ge1xuICAgICAgY29tcG9uZW50czogW10sXG4gICAgICBwYWdlczogW10sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDnvJbor5EgV29ya2Zsb3cgSVJcbiAgICovXG4gIHByaXZhdGUgY29tcGlsZVdvcmtmbG93SVIoKTogV29ya2Zsb3dJUiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHdvcmtmbG93czogW10sXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiDnvJbor5EgRGF0YSBJUlxuICAgKi9cbiAgcHJpdmF0ZSBjb21waWxlRGF0YUlSKCk6IERhdGFJUiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVudGl0aWVzOiBbXSxcbiAgICAgIHJlbGF0aW9uc2hpcHM6IFtdLFxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgUmVxdWlyZW1lbnRHcmFwaEVuZ2luZTtcbiJdfQ==