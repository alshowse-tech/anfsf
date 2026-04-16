/**
 * Dynamic Router - ANFSF V1.5.0 中大型项目优化补丁
 *
 * 补丁版本：v2.1-minimal-patch (2026-04-12)
 * 作用：当 Graph 为模块化且跨模块依赖>8 时，自动切换到 multi-module-orchestration 策略
 *
 * @module asf-v4/providers/dynamic-router
 */
import { RefinedGraph } from '../core/types';
import { Strategy } from '../core/strategy-config';
export type RouterStrategy = 'standard' | 'multi-module-orchestration';
export declare class DynamicRouter {
    /**
     * 选择执行策略
     */
    selectStrategy(graph: RefinedGraph): Strategy;
    /**
     * 获取 Graph 元数据 - 新增辅助方法
     */
    private getGraphMetadata;
    /**
     * 计算跨模块依赖数 - 复用 GraphRAG 已有方法
     */
    private countCrossModuleDeps;
    /**
     * 创建多模块编排策略 - 复用 Layer 8.5 Orchestration Harness 已有能力
     */
    private createMultiModuleOrchestrationStrategy;
    /**
     * 创建标准策略
     */
    private createStandardStrategy;
    /**
     * 计算模块执行顺序 - 拓扑排序
     */
    private computeExecutionOrder;
    /**
     * 计算模块间同步点
     */
    private computeSyncPoints;
}
export declare function createDynamicRouter(): DynamicRouter;
