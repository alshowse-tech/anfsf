/**
 * ANFSF V4 Layer 8.5 - Skills Registry Type Definitions
 *
 * Skills registry types for skill loading, dependency management, and sandbox execution.
 * Supports dependency topology checking, sandbox isolation, and hot-reloading.
 */
/** Skill execution status */
export type SkillStatus = 'loaded' | 'unloaded' | 'error' | 'disabled' | 'loading';
/** Skill execution result status */
export type ExecutionStatus = 'success' | 'error' | 'timeout' | 'memory_exceeded';
/**
 * Skill - Represents a loadable skill module
 */
export interface Skill {
    /** Unique skill name */
    name: string;
    /** Skill version (semver) */
    version: string;
    /** List of dependency skill names */
    dependencies: string[];
    /** Entry point function name */
    entryPoint: string;
    /** Skill source code */
    code: string;
    /** Skill description */
    description?: string;
    /** Skill author */
    author?: string;
    /** Skill tags for categorization */
    tags?: string[];
    /** Required permissions */
    permissions?: string[];
    /** Configuration schema */
    configSchema?: any;
    /** Current status */
    status?: SkillStatus;
    /** Timestamp when skill was loaded */
    loadedAt?: number;
}
/**
 * SkillMetadata - Extended skill metadata
 */
export interface SkillMetadata {
    /** Skill name */
    name: string;
    /** Skill version */
    version: string;
    /** Dependencies with version constraints */
    dependencies: Array<{
        name: string;
        version: string;
        constraint?: string;
    }>;
    /** Exported functions */
    exports: string[];
    /** Required memory in MB */
    memoryRequirement?: number;
    /** Estimated execution time in ms */
    estimatedExecutionTime?: number;
    /** Risk level (0-100) */
    riskLevel?: number;
    /** GraphRAG index */
    graphRAGIndex?: any;
}
/**
 * ExecutionResult - Result of sandbox execution
 */
export interface ExecutionResult {
    /** Execution status */
    status: ExecutionStatus;
    /** Return value (if successful) */
    returnValue?: any;
    /** Error message (if failed) */
    error?: string;
    /** Stack trace (if failed) */
    stackTrace?: string;
    /** Execution time in milliseconds */
    executionTime: number;
    /** Memory used in MB */
    memoryUsed: number;
    /** Console output */
    consoleOutput?: string[];
}
/**
 * SandboxConfig - Configuration for sandbox execution
 */
export interface SandboxConfig {
    /** Maximum memory in MB (default: 256) */
    maxMemoryMB?: number;
    /** Maximum execution time in milliseconds (default: 30000) */
    maxExecutionTimeMs?: number;
    /** Allowed globals */
    allowedGlobals?: string[];
    /** Blocked APIs */
    blockedAPIs?: string[];
    /** Enable console capture */
    enableConsoleCapture?: boolean;
    /** Enable network access (default: false) */
    allowNetwork?: boolean;
    /** Enable file system access (default: false) */
    allowFileSystem?: boolean;
    /** Read-only file system paths */
    readOnlyPaths?: string[];
}
/**
 * SandboxContext - Context passed to sandbox execution
 */
export interface SandboxContext {
    /** Available APIs */
    apis: Record<string, any>;
    /** Environment variables */
    env: Record<string, string>;
    /** Skill configuration */
    config: Record<string, any>;
    /** Logger */
    logger: {
        info: (msg: string) => void;
        warn: (msg: string) => void;
        error: (msg: string) => void;
        debug: (msg: string) => void;
    };
}
/**
 * DependencyNode - Node in dependency graph
 */
export interface DependencyNode {
    /** Skill name */
    name: string;
    /** Skill version */
    version: string;
    /** In-degree (number of dependencies) */
    inDegree: number;
    /** Out-degree (number of dependents) */
    outDegree: number;
}
/**
 * DependencyGraph - Directed acyclic graph of skill dependencies
 */
export interface DependencyGraph {
    /** Nodes */
    nodes: Map<string, DependencyNode>;
    /** Edges (from -> to) */
    edges: Map<string, Set<string>>;
    /** Reverse edges (to -> from) */
    reverseEdges: Map<string, Set<string>>;
}
/**
 * DependencyCheckResult - Result of dependency check
 */
export interface DependencyCheckResult {
    /** Whether check passed */
    passed: boolean;
    /** Missing dependencies */
    missingDependencies: string[];
    /** Version conflicts */
    versionConflicts: Array<{
        skill: string;
        dependency: string;
        required: string;
        available: string;
    }>;
    /** Circular dependencies detected */
    circularDependencies: string[][];
    /** Load order (topological sort) */
    loadOrder: string[];
}
/**
 * SkillsRegistryConfig - Configuration for skills registry
 */
export interface SkillsRegistryConfig {
    /** Registry storage path */
    storagePath?: string;
    /** Enable hot-reloading */
    enableHotReload?: boolean;
    /** Enable GraphRAG indexing */
    enableGraphRAG?: boolean;
    /** GraphRAG index path */
    graphRAGIndexPath?: string;
    /** Default sandbox config */
    defaultSandboxConfig?: SandboxConfig;
    /** Maximum skills allowed */
    maxSkills?: number;
}
/**
 * SkillLoadOptions - Options for loading a skill
 */
export interface SkillLoadOptions {
    /** Force reload even if already loaded */
    force?: boolean;
    /** Skip dependency check */
    skipDependencyCheck?: boolean;
    /** Custom sandbox config */
    sandboxConfig?: SandboxConfig;
    /** Initialize with config */
    initConfig?: Record<string, any>;
    /** Skill dependencies */
    dependencies?: string[];
}
/**
 * SkillUnloadOptions - Options for unloading a skill
 */
export interface SkillUnloadOptions {
    /** Force unload even if dependents exist */
    force?: boolean;
    /** Cleanup resources */
    cleanup?: boolean;
}
/**
 * GraphRAGIndex - Index for skill discovery
 */
export interface GraphRAGIndex {
    /** Skill embeddings */
    embeddings: Map<string, number[]>;
    /** Skill keywords */
    keywords: Map<string, string[]>;
    /** Skill categories */
    categories: Map<string, string[]>;
    /** Search function */
    search: (query: string, limit?: number) => Promise<SkillSearchResult[]>;
}
/**
 * SkillSearchResult - Result of skill search
 */
export interface SkillSearchResult {
    /** Skill name */
    name: string;
    /** Relevance score (0-1) */
    score: number;
    /** Matched keywords */
    matchedKeywords: string[];
    /** Skill metadata */
    metadata: SkillMetadata;
}
/**
 * SkillEvent - Events emitted by skills registry
 */
export interface SkillEvent {
    /** Event type */
    type: 'skill:loaded' | 'skill:unloaded' | 'skill:error' | 'skill:updated';
    /** Skill name */
    skillName: string;
    /** Skill version */
    version: string;
    /** Timestamp */
    timestamp: number;
    /** Additional data */
    data?: any;
}
/**
 * SkillEventListener - Listener for skill events
 */
export type SkillEventListener = (event: SkillEvent) => void;
export declare function isSkill(obj: any): obj is Skill;
export declare function isExecutionResult(obj: any): obj is ExecutionResult;
export declare function isDependencyCheckResult(obj: any): obj is DependencyCheckResult;
