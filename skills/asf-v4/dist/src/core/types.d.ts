/**
 * Core Types - ANFSF 核心类型定义
 *
 * @module asf-v4/core/types
 */
export interface RefinedModule {
    name: string;
    description: string;
    dependencies?: Array<{
        target: string;
        type: string;
    }>;
    components?: RefinedComponent[];
}
export interface RefinedComponent {
    name: string;
    type: string;
    properties?: Record<string, any>;
}
export declare class RefinedGraph {
    id: string;
    name: string;
    description: string;
    modules?: RefinedModule[];
    dependencies?: Array<{
        source: string;
        target: string;
        type: string;
    }>;
    crossModuleEdges?: Array<{
        from: string;
        to: string;
    }>;
    metadata?: {
        complexity?: number;
        isModular?: boolean;
        creationTime?: number;
        error?: string;
        templateId?: string;
        confidence?: number;
        moduleName?: string;
        scope?: string;
        priority?: number;
    };
    constructor(id?: string, name?: string, description?: string);
    addModule(name: string, module: RefinedModule): void;
    setCrossModuleProtocol(protocol: string): void;
}
export interface RefinedRequirement {
    id: string;
    title: string;
    description: string;
    module?: string;
    dependencies?: string[];
    priority: number;
}
export interface RefinedStrategy {
    name: string;
    type: 'standard' | 'multi-module-orchestration';
    config: any;
}
export interface SkillContext {
    workspace: string;
    options?: Record<string, any>;
    courseOfAction?: string;
}
export interface TaskContext {
    id: string;
    name: string;
    deps?: string[];
    description?: string;
}
export interface ToolResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, any>;
}
export interface TestResult {
    name: string;
    passed: boolean;
    duration: number;
    error?: string;
}
export interface SkillConfig {
    name: string;
    version: string;
    type: string;
    options?: Record<string, any>;
}
export interface HarnessConfig {
    name: string;
    type: string;
    modules: string[];
    options?: Record<string, any>;
}
