/**
 * ANFSF V4 Layer 8.5 - Skills Registry Implementation
 *
 * Skills registry with dependency topology checking, sandbox execution, and hot-reloading.
 * Features: circular dependency detection, memory limits, time limits, GraphRAG indexing.
 */
import { Skill, SkillMetadata, SkillsRegistryConfig, SkillLoadOptions, SkillUnloadOptions, DependencyGraph, DependencyCheckResult } from './types';
/**
 * SkillsRegistry - Registry for managing skills with dependency checking
 */
export declare class SkillsRegistry {
    private config;
    private skills;
    private dependencyGraph;
    private eventListeners;
    private loadOrder;
    constructor(config?: SkillsRegistryConfig);
    /**
     * Load a skill into the registry
     */
    load(skillName: string, version: string, options?: SkillLoadOptions): Promise<Skill>;
    /**
     * Unload a skill from the registry
     */
    unload(skillName: string, options?: SkillUnloadOptions): Promise<void>;
    /**
     * List all loaded skills
     */
    list(): Promise<Skill[]>;
    /**
     * Get dependencies for a skill
     */
    getDependencies(skillName: string): Promise<string[]>;
    /**
     * Get skill metadata
     */
    getMetadata(skillName: string): Promise<SkillMetadata | null>;
    /**
     * Check dependencies for a skill
     */
    checkDependencies(skill: Skill): Promise<DependencyCheckResult>;
    /**
     * Detect circular dependencies using DFS
     */
    private detectCycles;
    /**
     * Topological sort for load order
     */
    private topologicalSort;
    private updateDependencyGraph;
    private removeFromDependencyGraph;
    private getDependents;
    private emitEvent;
    private generateMockSkillCode;
    private getMockDependencies;
    /**
     * Subscribe to skill events
     */
    onEvent(listener: (event: any) => void): () => void;
    /**
     * Get dependency graph
     */
    getDependencyGraph(): DependencyGraph;
    /**
     * Get load order
     */
    getLoadOrder(): string[];
}
export default SkillsRegistry;
