"use strict";
/**
 * ANFSF V4 Layer 8.5 - Skills Registry Implementation
 *
 * Skills registry with dependency topology checking, sandbox execution, and hot-reloading.
 * Features: circular dependency detection, memory limits, time limits, GraphRAG indexing.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillsRegistry = void 0;
// ============================================================================
// Constants
// ============================================================================
const DEFAULT_CONFIG = {
    storagePath: './skills',
    enableHotReload: true,
    enableGraphRAG: true,
    graphRAGIndexPath: './skills/graph-rag-index',
    defaultSandboxConfig: {
        maxMemoryMB: 256,
        maxExecutionTimeMs: 30000,
        allowedGlobals: ['console', 'Math', 'Date', 'JSON', 'Array', 'Object', 'String', 'Number', 'Boolean'],
        blockedAPIs: ['require', 'eval', 'Function', 'setTimeout', 'setInterval', 'fetch', 'XMLHttpRequest'],
        enableConsoleCapture: true,
        allowNetwork: false,
        allowFileSystem: false,
        readOnlyPaths: [],
    },
    maxSkills: 100,
};
// ============================================================================
// Helper Functions
// ============================================================================
/** Generate UUID */
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
/** Get current timestamp */
function now() {
    return Date.now();
}
/** Parse semver version */
function parseVersion(version) {
    const parts = version.split('.').map(Number);
    return {
        major: parts[0] || 0,
        minor: parts[1] || 0,
        patch: parts[2] || 0,
    };
}
/** Check version constraint */
function satisfiesVersion(available, constraint) {
    if (!constraint || constraint === '*') {
        return true;
    }
    const availableVer = parseVersion(available);
    // Handle ^ constraint (compatible with version)
    if (constraint.startsWith('^')) {
        const requiredVer = parseVersion(constraint.substring(1));
        return availableVer.major === requiredVer.major &&
            availableVer.minor >= requiredVer.minor;
    }
    // Handle >= constraint
    if (constraint.startsWith('>=')) {
        const requiredVer = parseVersion(constraint.substring(2));
        if (availableVer.major > requiredVer.major)
            return true;
        if (availableVer.major < requiredVer.major)
            return false;
        if (availableVer.minor > requiredVer.minor)
            return true;
        if (availableVer.minor < requiredVer.minor)
            return false;
        return availableVer.patch >= requiredVer.patch;
    }
    // Exact match
    const requiredVer = parseVersion(constraint);
    return availableVer.major === requiredVer.major &&
        availableVer.minor === requiredVer.minor &&
        availableVer.patch === requiredVer.patch;
}
// ============================================================================
// SkillsRegistry Class
// ============================================================================
/**
 * SkillsRegistry - Registry for managing skills with dependency checking
 */
class SkillsRegistry {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.skills = new Map();
        this.dependencyGraph = {
            nodes: new Map(),
            edges: new Map(),
            reverseEdges: new Map(),
        };
        this.eventListeners = new Set();
        this.loadOrder = [];
    }
    // ============================================================================
    // Core Methods
    // ============================================================================
    /**
     * Load a skill into the registry
     */
    async load(skillName, version, options = {}) {
        const skillKey = `${skillName}@${version}`;
        // Check if already loaded
        if (!options.force && this.skills.has(skillKey)) {
            const existingSkill = this.skills.get(skillKey);
            this.emitEvent('skill:loaded', skillName, version, { cached: true });
            return existingSkill;
        }
        // Check max skills limit
        if (this.skills.size >= this.config.maxSkills) {
            throw new Error(`Maximum skills limit reached: ${this.config.maxSkills}`);
        }
        // Create skill placeholder
        const skill = {
            name: skillName,
            version,
            dependencies: [],
            entryPoint: 'main',
            code: '',
            loadedAt: now(),
        };
        skill.status = 'loading';
        // For demo purposes, create a mock skill
        // In production, this would load from storage or remote
        skill.code = this.generateMockSkillCode(skillName, version);
        // Use provided dependencies or mock dependencies
        if (options.dependencies && options.dependencies.length > 0) {
            skill.dependencies = options.dependencies;
        }
        else {
            skill.dependencies = this.getMockDependencies(skillName);
        }
        // Check dependencies
        if (!options.skipDependencyCheck) {
            const depCheck = await this.checkDependencies(skill);
            if (!depCheck.passed) {
                skill.status = 'error';
                throw new Error(`Dependency check failed: ${JSON.stringify(depCheck.missingDependencies)}`);
            }
            // Update load order
            this.loadOrder = depCheck.loadOrder;
        }
        // Add to registry
        this.skills.set(skillKey, skill);
        skill.status = 'loaded';
        // Update dependency graph
        this.updateDependencyGraph(skill);
        this.emitEvent('skill:loaded', skillName, version);
        return skill;
    }
    /**
     * Unload a skill from the registry
     */
    async unload(skillName, options = {}) {
        // Find the skill
        let skillKey = null;
        let skill = null;
        for (const [key, s] of this.skills.entries()) {
            if (key.startsWith(`${skillName}@`)) {
                skillKey = key;
                skill = s;
                break;
            }
        }
        if (!skill || !skillKey) {
            throw new Error(`Skill not found: ${skillName}`);
        }
        // Check for dependents
        if (!options.force) {
            const dependents = this.getDependents(skillName);
            if (dependents.length > 0) {
                throw new Error(`Cannot unload skill with dependents: ${dependents.join(', ')}`);
            }
        }
        // Remove from registry
        this.skills.delete(skillKey);
        // Update dependency graph
        this.removeFromDependencyGraph(skillName);
        this.emitEvent('skill:unloaded', skillName, skill.version);
    }
    /**
     * List all loaded skills
     */
    async list() {
        return Array.from(this.skills.values());
    }
    /**
     * Get dependencies for a skill
     */
    async getDependencies(skillName) {
        const skill = Array.from(this.skills.values()).find(s => s.name === skillName);
        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }
        return skill.dependencies;
    }
    /**
     * Get skill metadata
     */
    async getMetadata(skillName) {
        const skill = Array.from(this.skills.values()).find(s => s.name === skillName);
        if (!skill) {
            return null;
        }
        return {
            name: skill.name,
            version: skill.version,
            dependencies: skill.dependencies.map(d => ({ name: d, version: '*' })),
            exports: [skill.entryPoint],
            riskLevel: 10,
        };
    }
    // ============================================================================
    // Dependency Graph Methods
    // ============================================================================
    /**
     * Check dependencies for a skill
     */
    async checkDependencies(skill) {
        const result = {
            passed: true,
            missingDependencies: [],
            versionConflicts: [],
            circularDependencies: [],
            loadOrder: [],
        };
        // Check each dependency
        for (const dep of skill.dependencies) {
            const depAvailable = Array.from(this.skills.values()).find(s => s.name === dep);
            if (!depAvailable) {
                result.missingDependencies.push(dep);
                result.passed = false;
            }
        }
        // Check for circular dependencies
        const cycles = this.detectCycles(skill.name);
        if (cycles.length > 0) {
            result.circularDependencies = cycles;
            result.passed = false;
        }
        // Calculate load order (topological sort)
        if (result.passed) {
            result.loadOrder = this.topologicalSort();
        }
        return result;
    }
    /**
     * Detect circular dependencies using DFS
     */
    detectCycles(startNode) {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const path = [];
        const dfs = (node) => {
            if (recursionStack.has(node)) {
                // Found a cycle
                const cycleStart = path.indexOf(node);
                if (cycleStart !== -1) {
                    cycles.push([...path.slice(cycleStart), node]);
                }
                return;
            }
            if (visited.has(node)) {
                return;
            }
            visited.add(node);
            recursionStack.add(node);
            path.push(node);
            const skill = Array.from(this.skills.values()).find(s => s.name === node);
            if (skill) {
                for (const dep of skill.dependencies) {
                    dfs(dep);
                }
            }
            path.pop();
            recursionStack.delete(node);
        };
        dfs(startNode);
        return cycles;
    }
    /**
     * Topological sort for load order
     */
    topologicalSort() {
        const inDegree = new Map();
        const queue = [];
        const result = [];
        // Initialize in-degrees
        for (const [name] of this.skills.entries()) {
            inDegree.set(name, 0);
        }
        // Calculate in-degrees
        for (const skill of this.skills.values()) {
            for (const dep of skill.dependencies) {
                const depKey = Array.from(this.skills.keys()).find(k => k.startsWith(`${dep}@`));
                if (depKey) {
                    inDegree.set(depKey, (inDegree.get(depKey) || 0) + 1);
                }
            }
        }
        // Find nodes with no dependencies
        for (const [key, degree] of inDegree.entries()) {
            if (degree === 0) {
                queue.push(key);
            }
        }
        // Process queue
        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            // Reduce in-degree for dependents
            const skill = this.skills.get(current);
            if (skill) {
                for (const [key, s] of this.skills.entries()) {
                    if (s.dependencies.includes(skill.name)) {
                        const degree = inDegree.get(key) || 0;
                        inDegree.set(key, degree - 1);
                        if (degree - 1 === 0) {
                            queue.push(key);
                        }
                    }
                }
            }
        }
        return result;
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    updateDependencyGraph(skill) {
        // Add node
        const node = {
            name: skill.name,
            version: skill.version,
            inDegree: skill.dependencies.length,
            outDegree: 0,
        };
        this.dependencyGraph.nodes.set(skill.name, node);
        // Add edges
        for (const dep of skill.dependencies) {
            if (!this.dependencyGraph.edges.has(dep)) {
                this.dependencyGraph.edges.set(dep, new Set());
            }
            this.dependencyGraph.edges.get(dep).add(skill.name);
            if (!this.dependencyGraph.reverseEdges.has(skill.name)) {
                this.dependencyGraph.reverseEdges.set(skill.name, new Set());
            }
            this.dependencyGraph.reverseEdges.get(skill.name).add(dep);
            // Update out-degree for dependency
            const depNode = this.dependencyGraph.nodes.get(dep);
            if (depNode) {
                depNode.outDegree++;
            }
        }
    }
    removeFromDependencyGraph(skillName) {
        // Remove node
        this.dependencyGraph.nodes.delete(skillName);
        // Remove edges
        this.dependencyGraph.edges.delete(skillName);
        this.dependencyGraph.reverseEdges.delete(skillName);
        // Remove from other edges
        for (const [from, toSet] of this.dependencyGraph.edges.entries()) {
            toSet.delete(skillName);
        }
        for (const [to, fromSet] of this.dependencyGraph.reverseEdges.entries()) {
            fromSet.delete(skillName);
        }
    }
    getDependents(skillName) {
        const dependents = [];
        for (const skill of this.skills.values()) {
            if (skill.dependencies.includes(skillName)) {
                dependents.push(skill.name);
            }
        }
        return dependents;
    }
    emitEvent(type, skillName, version, data) {
        const event = {
            type,
            skillName,
            version,
            timestamp: now(),
            data,
        };
        for (const listener of this.eventListeners) {
            try {
                listener(event);
            }
            catch (error) {
                console.error(`Error in event listener: ${error}`);
            }
        }
    }
    // Mock methods for demo
    generateMockSkillCode(name, version) {
        return `
// Skill: ${name}@${version}
export function main(context: any) {
  console.log('Executing skill: ${name}');
  return { success: true, name: '${name}', version: '${version}' };
}
`;
    }
    getMockDependencies(name) {
        // Mock dependencies based on skill name
        const deps = {
            'data-processor': ['utils', 'validator'],
            'api-client': ['http-utils', 'auth'],
            'validator': ['utils'],
        };
        return deps[name] || [];
    }
    // ============================================================================
    // Event System
    // ============================================================================
    /**
     * Subscribe to skill events
     */
    onEvent(listener) {
        this.eventListeners.add(listener);
        return () => {
            this.eventListeners.delete(listener);
        };
    }
    /**
     * Get dependency graph
     */
    getDependencyGraph() {
        return this.dependencyGraph;
    }
    /**
     * Get load order
     */
    getLoadOrder() {
        return this.loadOrder;
    }
}
exports.SkillsRegistry = SkillsRegistry;
// ============================================================================
// Exports
// ============================================================================
exports.default = SkillsRegistry;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzLXJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3NraWxscy9za2lsbHMtcmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFnQkgsK0VBQStFO0FBQy9FLFlBQVk7QUFDWiwrRUFBK0U7QUFFL0UsTUFBTSxjQUFjLEdBQW1DO0lBQ3JELFdBQVcsRUFBRSxVQUFVO0lBQ3ZCLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGlCQUFpQixFQUFFLDBCQUEwQjtJQUM3QyxvQkFBb0IsRUFBRTtRQUNwQixXQUFXLEVBQUUsR0FBRztRQUNoQixrQkFBa0IsRUFBRSxLQUFLO1FBQ3pCLGNBQWMsRUFBRSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDO1FBQ3JHLFdBQVcsRUFBRSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixDQUFDO1FBQ3BHLG9CQUFvQixFQUFFLElBQUk7UUFDMUIsWUFBWSxFQUFFLEtBQUs7UUFDbkIsZUFBZSxFQUFFLEtBQUs7UUFDdEIsYUFBYSxFQUFFLEVBQUU7S0FDbEI7SUFDRCxTQUFTLEVBQUUsR0FBRztDQUNmLENBQUM7QUFFRiwrRUFBK0U7QUFDL0UsbUJBQW1CO0FBQ25CLCtFQUErRTtBQUUvRSxvQkFBb0I7QUFDcEIsU0FBUyxZQUFZO0lBQ25CLE9BQU8sc0NBQXNDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ25FLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNu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WSxFQUFFLE9BQWU7UUFDekQsT0FBTztZQUNDLElBQUksSUFBSSxPQUFPOztrQ0FFTyxJQUFJO21DQUNILElBQUksZ0JBQWdCLE9BQU87O0NBRTdELENBQUM7SUFDQSxDQUFDO0lBRU8sbUJBQW1CLENBQUMsSUFBWTtRQUN0Qyx3Q0FBd0M7UUFDeEMsTUFBTSxJQUFJLEdBQTZCO1lBQ3JDLGdCQUFnQixFQUFFLENBQUMsT0FBTyxFQUFFLFdBQVcsQ0FBQztZQUN4QyxZQUFZLEVBQUUsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQztTQUN2QixDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQzFCLENBQUM7SUFFRCwrRUFBK0U7SUFDL0UsZUFBZTtJQUNmLCtFQUErRTtJQUUvRTs7T0FFRztJQUNILE9BQU8sQ0FBQyxRQUE4QjtRQUNwQyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNsQyxPQUFPLEdBQUcsRUFBRTtZQUNWLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILGtCQUFrQjtRQUNoQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsWUFBWTtRQUNWLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN4QixDQUFDO0NBQ0Y7QUF2YUQsd0NBdWFDO0FBRUQsK0VBQStFO0FBQy9FLFVBQVU7QUFDViwrRUFBK0U7QUFFL0Usa0JBQWUsY0FBYyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWNCBMYXllciA4LjUgLSBTa2lsbHMgUmVnaXN0cnkgSW1wbGVtZW50YXRpb25cbiAqIFxuICogU2tpbGxzIHJlZ2lzdHJ5IHdpdGggZGVwZW5kZW5jeSB0b3BvbG9neSBjaGVja2luZywgc2FuZGJveCBleGVjdXRpb24sIGFuZCBob3QtcmVsb2FkaW5nLlxuICogRmVhdHVyZXM6IGNpcmN1bGFyIGRlcGVuZGVuY3kgZGV0ZWN0aW9uLCBtZW1vcnkgbGltaXRzLCB0aW1lIGxpbWl0cywgR3JhcGhSQUcgaW5kZXhpbmcuXG4gKi9cblxuaW1wb3J0IHtcbiAgU2tpbGwsXG4gIFNraWxsU3RhdHVzLFxuICBTa2lsbE1ldGFkYXRhLFxuICBTa2lsbHNSZWdpc3RyeUNvbmZpZyxcbiAgU2tpbGxMb2FkT3B0aW9ucyxcbiAgU2tpbGxVbmxvYWRPcHRpb25zLFxuICBEZXBlbmRlbmN5R3JhcGgsXG4gIERlcGVuZGVuY3lOb2RlLFxuICBEZXBlbmRlbmN5Q2hlY2tSZXN1bHQsXG4gIGlzU2tpbGwsXG4gIGlzRGVwZW5kZW5jeUNoZWNrUmVzdWx0LFxufSBmcm9tICcuL3R5cGVzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHOiBSZXF1aXJlZDxTa2lsbHNSZWdpc3RyeUNvbmZpZz4gPSB7XG4gIHN0b3JhZ2VQYXRoOiAnLi9za2lsbHMnLFxuICBlbmFibGVIb3RSZWxvYWQ6IHRydWUsXG4gIGVuYWJsZUdyYXBoUkFHOiB0cnVlLFxuICBncmFwaFJBR0luZGV4UGF0aDogJy4vc2tpbGxzL2dyYXBoLXJhZy1pbmRleCcsXG4gIGRlZmF1bHRTYW5kYm94Q29uZmlnOiB7XG4gICAgbWF4TWVtb3J5TUI6IDI1NixcbiAgICBtYXhFeGVjdXRpb25UaW1lTXM6IDMwMDAwLFxuICAgIGFsbG93ZWRHbG9iYWxzOiBbJ2NvbnNvbGUnLCAnTWF0aCcsICdEYXRlJywgJ0pTT04nLCAnQXJyYXknLCAnT2JqZWN0JywgJ1N0cmluZycsICdOdW1iZXInLCAnQm9vbGVhbiddLFxuICAgIGJsb2NrZWRBUElzOiBbJ3JlcXVpcmUnLCAnZXZhbCcsICdGdW5jdGlvbicsICdzZXRUaW1lb3V0JywgJ3NldEludGVydmFsJywgJ2ZldGNoJywgJ1hNTEh0dHBSZXF1ZXN0J10sXG4gICAgZW5hYmxlQ29uc29sZUNhcHR1cmU6IHRydWUsXG4gICAgYWxsb3dOZXR3b3JrOiBmYWxzZSxcbiAgICBhbGxvd0ZpbGVTeXN0ZW06IGZhbHNlLFxuICAgIHJlYWRPbmx5UGF0aHM6IFtdLFxuICB9LFxuICBtYXhTa2lsbHM6IDEwMCxcbn07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlciBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqIEdlbmVyYXRlIFVVSUQgKi9cbmZ1bmN0aW9uIGdlbmVyYXRlVVVJRCgpOiBzdHJpbmcge1xuICByZXR1cm4gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCAoYykgPT4ge1xuICAgIGNvbnN0IHIgPSAoTWF0aC5yYW5kb20oKSAqIDE2KSB8IDA7XG4gICAgY29uc3QgdiA9IGMgPT09ICd4JyA/IHIgOiAociAmIDB4MykgfCAweDg7XG4gICAgcmV0dXJuIHYudG9TdHJpbmcoMTYpO1xuICB9KTtcbn1cblxuLyoqIEdldCBjdXJyZW50IHRpbWVzdGFtcCAqL1xuZnVuY3Rpb24gbm93KCk6IG51bWJlciB7XG4gIHJldHVybiBEYXRlLm5vdygpO1xufVxuXG4vKiogUGFyc2Ugc2VtdmVyIHZlcnNpb24gKi9cbmZ1bmN0aW9uIHBhcnNlVmVyc2lvbih2ZXJzaW9uOiBzdHJpbmcpOiB7IG1ham9yOiBudW1iZXI7IG1pbm9yOiBudW1iZXI7IHBhdGNoOiBudW1iZXIgfSB7XG4gIGNvbnN0IHBhcnRzID0gdmVyc2lvbi5zcGxpdCgnLicpLm1hcChOdW1iZXIpO1xuICByZXR1cm4ge1xuICAgIG1ham9yOiBwYXJ0c1swXSB8fCAwLFxuICAgIG1pbm9yOiBwYXJ0c1sxXSB8fCAwLFxuICAgIHBhdGNoOiBwYXJ0c1syXSB8fCAwLFxuICB9O1xufVxuXG4vKiogQ2hlY2sgdmVyc2lvbiBjb25zdHJhaW50ICovXG5mdW5jdGlvbiBzYXRpc2ZpZXNWZXJzaW9uKGF2YWlsYWJsZTogc3RyaW5nLCBjb25zdHJhaW50OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKCFjb25zdHJhaW50IHx8IGNvbnN0cmFpbnQgPT09ICcqJykge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgY29uc3QgYXZhaWxhYmxlVmVyID0gcGFyc2VWZXJzaW9uKGF2YWlsYWJsZSk7XG4gIFxuICAvLyBIYW5kbGUgXiBjb25zdHJhaW50IChjb21wYXRpYmxlIHdpdGggdmVyc2lvbilcbiAgaWYgKGNvbnN0cmFpbnQuc3RhcnRzV2l0aCgnXicpKSB7XG4gICAgY29uc3QgcmVxdWlyZWRWZXIgPSBwYXJzZVZlcnNpb24oY29uc3RyYWludC5zdWJzdHJpbmcoMSkpO1xuICAgIHJldHVybiBhdmFpbGFibGVWZXIubWFqb3IgPT09IHJlcXVpcmVkVmVyLm1ham9yICYmIFxuICAgICAgICAgICBhdmFpbGFibGVWZXIubWlub3IgPj0gcmVxdWlyZWRWZXIubWlub3I7XG4gIH1cbiAgXG4gIC8vIEhhbmRsZSA+PSBjb25zdHJhaW50XG4gIGlmIChjb25zdHJhaW50LnN0YXJ0c1dpdGgoJz49JykpIHtcbiAgICBjb25zdCByZXF1aXJlZFZlciA9IHBhcnNlVmVyc2lvbihjb25zdHJhaW50LnN1YnN0cmluZygyKSk7XG4gICAgaWYgKGF2YWlsYWJsZVZlci5tYWpvciA+IHJlcXVpcmVkVmVyLm1ham9yKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoYXZhaWxhYmxlVmVyLm1ham9yIDwgcmVxdWlyZWRWZXIubWFqb3IpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoYXZhaWxhYmxlVmVyLm1pbm9yID4gcmVxdWlyZWRWZXIubWlub3IpIHJldHVybiB0cnVlO1xuICAgIGlmIChhdmFpbGFibGVWZXIubWlub3IgPCByZXF1aXJlZFZlci5taW5vcikgcmV0dXJuIGZhbHNlO1xuICAgIHJldHVybiBhdmFpbGFibGVWZXIucGF0Y2ggPj0gcmVxdWlyZWRWZXIucGF0Y2g7XG4gIH1cblxuICAvLyBFeGFjdCBtYXRjaFxuICBjb25zdCByZXF1aXJlZFZlciA9IHBhcnNlVmVyc2lvbihjb25zdHJhaW50KTtcbiAgcmV0dXJuIGF2YWlsYWJsZVZlci5tYWpvciA9PT0gcmVxdWlyZWRWZXIubWFqb3IgJiZcbiAgICAgICAgIGF2YWlsYWJsZVZlci5taW5vciA9PT0gcmVxdWlyZWRWZXIubWlub3IgJiZcbiAgICAgICAgIGF2YWlsYWJsZVZlci5wYXRjaCA9PT0gcmVxdWlyZWRWZXIucGF0Y2g7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNraWxsc1JlZ2lzdHJ5IENsYXNzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU2tpbGxzUmVnaXN0cnkgLSBSZWdpc3RyeSBmb3IgbWFuYWdpbmcgc2tpbGxzIHdpdGggZGVwZW5kZW5jeSBjaGVja2luZ1xuICovXG5leHBvcnQgY2xhc3MgU2tpbGxzUmVnaXN0cnkge1xuICBwcml2YXRlIGNvbmZpZzogUmVxdWlyZWQ8U2tpbGxzUmVnaXN0cnlDb25maWc+O1xuICBwcml2YXRlIHNraWxsczogTWFwPHN0cmluZywgU2tpbGw+O1xuICBwcml2YXRlIGRlcGVuZGVuY3lHcmFwaDogRGVwZW5kZW5jeUdyYXBoO1xuICBwcml2YXRlIGV2ZW50TGlzdGVuZXJzOiBTZXQ8KGV2ZW50OiBhbnkpID0+IHZvaWQ+O1xuICBwcml2YXRlIGxvYWRPcmRlcjogc3RyaW5nW107XG5cbiAgY29uc3RydWN0b3IoY29uZmlnOiBTa2lsbHNSZWdpc3RyeUNvbmZpZyA9IHt9KSB7XG4gICAgdGhpcy5jb25maWcgPSB7IC4uLkRFRkFVTFRfQ09ORklHLCAuLi5jb25maWcgfTtcbiAgICB0aGlzLnNraWxscyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaCA9IHtcbiAgICAgIG5vZGVzOiBuZXcgTWFwKCksXG4gICAgICBlZGdlczogbmV3IE1hcCgpLFxuICAgICAgcmV2ZXJzZUVkZ2VzOiBuZXcgTWFwKCksXG4gICAgfTtcbiAgICB0aGlzLmV2ZW50TGlzdGVuZXJzID0gbmV3IFNldCgpO1xuICAgIHRoaXMubG9hZE9yZGVyID0gW107XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIENvcmUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIExvYWQgYSBza2lsbCBpbnRvIHRoZSByZWdpc3RyeVxuICAgKi9cbiAgYXN5bmMgbG9hZChza2lsbE5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBvcHRpb25zOiBTa2lsbExvYWRPcHRpb25zID0ge30pOiBQcm9taXNlPFNraWxsPiB7XG4gICAgY29uc3Qgc2tpbGxLZXkgPSBgJHtza2lsbE5hbWV9QCR7dmVyc2lvbn1gO1xuXG4gICAgLy8gQ2hlY2sgaWYgYWxyZWFkeSBsb2FkZWRcbiAgICBpZiAoIW9wdGlvbnMuZm9yY2UgJiYgdGhpcy5za2lsbHMuaGFzKHNraWxsS2V5KSkge1xuICAgICAgY29uc3QgZXhpc3RpbmdTa2lsbCA9IHRoaXMuc2tpbGxzLmdldChza2lsbEtleSkhO1xuICAgICAgdGhpcy5lbWl0RXZlbnQoJ3NraWxsOmxvYWRlZCcsIHNraWxsTmFtZSwgdmVyc2lvbiwgeyBjYWNoZWQ6IHRydWUgfSk7XG4gICAgICByZXR1cm4gZXhpc3RpbmdTa2lsbDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBtYXggc2tpbGxzIGxpbWl0XG4gICAgaWYgKHRoaXMuc2tpbGxzLnNpemUgPj0gdGhpcy5jb25maWcubWF4U2tpbGxzKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1heGltdW0gc2tpbGxzIGxpbWl0IHJlYWNoZWQ6ICR7dGhpcy5jb25maWcubWF4U2tpbGxzfWApO1xuICAgIH1cblxuICAgIC8vIENyZWF0ZSBza2lsbCBwbGFjZWhvbGRlclxuICAgIGNvbnN0IHNraWxsOiBTa2lsbCA9IHtcbiAgICAgIG5hbWU6IHNraWxsTmFtZSxcbiAgICAgIHZlcnNpb24sXG4gICAgICBkZXBlbmRlbmNpZXM6IFtdLFxuICAgICAgZW50cnlQb2ludDogJ21haW4nLFxuICAgICAgY29kZTogJycsXG4gICAgICBsb2FkZWRBdDogbm93KCksXG4gICAgfTtcbiAgICBza2lsbC5zdGF0dXMgPSAnbG9hZGluZyc7XG5cbiAgICAvLyBGb3IgZGVtbyBwdXJwb3NlcywgY3JlYXRlIGEgbW9jayBza2lsbFxuICAgIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgbG9hZCBmcm9tIHN0b3JhZ2Ugb3IgcmVtb3RlXG4gICAgc2tpbGwuY29kZSA9IHRoaXMuZ2VuZXJhdGVNb2NrU2tpbGxDb2RlKHNraWxsTmFtZSwgdmVyc2lvbik7XG4gICAgXG4gICAgLy8gVXNlIHByb3ZpZGVkIGRlcGVuZGVuY2llcyBvciBtb2NrIGRlcGVuZGVuY2llc1xuICAgIGlmIChvcHRpb25zLmRlcGVuZGVuY2llcyAmJiBvcHRpb25zLmRlcGVuZGVuY2llcy5sZW5ndGggPiAwKSB7XG4gICAgICBza2lsbC5kZXBlbmRlbmNpZXMgPSBvcHRpb25zLmRlcGVuZGVuY2llcztcbiAgICB9IGVsc2Uge1xuICAgICAgc2tpbGwuZGVwZW5kZW5jaWVzID0gdGhpcy5nZXRNb2NrRGVwZW5kZW5jaWVzKHNraWxsTmFtZSk7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZGVwZW5kZW5jaWVzXG4gICAgaWYgKCFvcHRpb25zLnNraXBEZXBlbmRlbmN5Q2hlY2spIHtcbiAgICAgIGNvbnN0IGRlcENoZWNrID0gYXdhaXQgdGhpcy5jaGVja0RlcGVuZGVuY2llcyhza2lsbCk7XG4gICAgICBpZiAoIWRlcENoZWNrLnBhc3NlZCkge1xuICAgICAgICBza2lsbC5zdGF0dXMgPSAnZXJyb3InO1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERlcGVuZGVuY3kgY2hlY2sgZmFpbGVkOiAke0pTT04uc3RyaW5naWZ5KGRlcENoZWNrLm1pc3NpbmdEZXBlbmRlbmNpZXMpfWApO1xuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBVcGRhdGUgbG9hZCBvcmRlclxuICAgICAgdGhpcy5sb2FkT3JkZXIgPSBkZXBDaGVjay5sb2FkT3JkZXI7XG4gICAgfVxuXG4gICAgLy8gQWRkIHRvIHJlZ2lzdHJ5XG4gICAgdGhpcy5za2lsbHMuc2V0KHNraWxsS2V5LCBza2lsbCk7XG4gICAgc2tpbGwuc3RhdHVzID0gJ2xvYWRlZCc7XG5cbiAgICAvLyBVcGRhdGUgZGVwZW5kZW5jeSBncmFwaFxuICAgIHRoaXMudXBkYXRlRGVwZW5kZW5jeUdyYXBoKHNraWxsKTtcblxuICAgIHRoaXMuZW1pdEV2ZW50KCdza2lsbDpsb2FkZWQnLCBza2lsbE5hbWUsIHZlcnNpb24pO1xuXG4gICAgcmV0dXJuIHNraWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIFVubG9hZCBhIHNraWxsIGZyb20gdGhlIHJlZ2lzdHJ5XG4gICAqL1xuICBhc3luYyB1bmxvYWQoc2tpbGxOYW1lOiBzdHJpbmcsIG9wdGlvbnM6IFNraWxsVW5sb2FkT3B0aW9ucyA9IHt9KTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gRmluZCB0aGUgc2tpbGxcbiAgICBsZXQgc2tpbGxLZXk6IHN0cmluZyB8IG51bGwgPSBudWxsO1xuICAgIGxldCBza2lsbDogU2tpbGwgfCBudWxsID0gbnVsbDtcblxuICAgIGZvciAoY29uc3QgW2tleSwgc10gb2YgdGhpcy5za2lsbHMuZW50cmllcygpKSB7XG4gICAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoYCR7c2tpbGxOYW1lfUBgKSkge1xuICAgICAgICBza2lsbEtleSA9IGtleTtcbiAgICAgICAgc2tpbGwgPSBzO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIXNraWxsIHx8ICFza2lsbEtleSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTa2lsbCBub3QgZm91bmQ6ICR7c2tpbGxOYW1lfWApO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBkZXBlbmRlbnRzXG4gICAgaWYgKCFvcHRpb25zLmZvcmNlKSB7XG4gICAgICBjb25zdCBkZXBlbmRlbnRzID0gdGhpcy5nZXREZXBlbmRlbnRzKHNraWxsTmFtZSk7XG4gICAgICBpZiAoZGVwZW5kZW50cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgQ2Fubm90IHVubG9hZCBza2lsbCB3aXRoIGRlcGVuZGVudHM6ICR7ZGVwZW5kZW50cy5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSBmcm9tIHJlZ2lzdHJ5XG4gICAgdGhpcy5za2lsbHMuZGVsZXRlKHNraWxsS2V5KTtcblxuICAgIC8vIFVwZGF0ZSBkZXBlbmRlbmN5IGdyYXBoXG4gICAgdGhpcy5yZW1vdmVGcm9tRGVwZW5kZW5jeUdyYXBoKHNraWxsTmFtZSk7XG5cbiAgICB0aGlzLmVtaXRFdmVudCgnc2tpbGw6dW5sb2FkZWQnLCBza2lsbE5hbWUsIHNraWxsLnZlcnNpb24pO1xuICB9XG5cbiAgLyoqXG4gICAqIExpc3QgYWxsIGxvYWRlZCBza2lsbHNcbiAgICovXG4gIGFzeW5jIGxpc3QoKTogUHJvbWlzZTxTa2lsbFtdPiB7XG4gICAgcmV0dXJuIEFycmF5LmZyb20odGhpcy5za2lsbHMudmFsdWVzKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBkZXBlbmRlbmNpZXMgZm9yIGEgc2tpbGxcbiAgICovXG4gIGFzeW5jIGdldERlcGVuZGVuY2llcyhza2lsbE5hbWU6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgICBjb25zdCBza2lsbCA9IEFycmF5LmZyb20odGhpcy5za2lsbHMudmFsdWVzKCkpLmZpbmQocyA9PiBzLm5hbWUgPT09IHNraWxsTmFtZSk7XG4gICAgaWYgKCFza2lsbCkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBTa2lsbCBub3QgZm91bmQ6ICR7c2tpbGxOYW1lfWApO1xuICAgIH1cbiAgICByZXR1cm4gc2tpbGwuZGVwZW5kZW5jaWVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBza2lsbCBtZXRhZGF0YVxuICAgKi9cbiAgYXN5bmMgZ2V0TWV0YWRhdGEoc2tpbGxOYW1lOiBzdHJpbmcpOiBQcm9taXNlPFNraWxsTWV0YWRhdGEgfCBudWxsPiB7XG4gICAgY29uc3Qgc2tpbGwgPSBBcnJheS5mcm9tKHRoaXMuc2tpbGxzLnZhbHVlcygpKS5maW5kKHMgPT4gcy5uYW1lID09PSBza2lsbE5hbWUpO1xuICAgIGlmICghc2tpbGwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiBza2lsbC5uYW1lLFxuICAgICAgdmVyc2lvbjogc2tpbGwudmVyc2lvbixcbiAgICAgIGRlcGVuZGVuY2llczogc2tpbGwuZGVwZW5kZW5jaWVzLm1hcChkID0+ICh7IG5hbWU6IGQsIHZlcnNpb246ICcqJyB9KSksXG4gICAgICBleHBvcnRzOiBbc2tpbGwuZW50cnlQb2ludF0sXG4gICAgICByaXNrTGV2ZWw6IDEwLFxuICAgIH07XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIERlcGVuZGVuY3kgR3JhcGggTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIENoZWNrIGRlcGVuZGVuY2llcyBmb3IgYSBza2lsbFxuICAgKi9cbiAgYXN5bmMgY2hlY2tEZXBlbmRlbmNpZXMoc2tpbGw6IFNraWxsKTogUHJvbWlzZTxEZXBlbmRlbmN5Q2hlY2tSZXN1bHQ+IHtcbiAgICBjb25zdCByZXN1bHQ6IERlcGVuZGVuY3lDaGVja1Jlc3VsdCA9IHtcbiAgICAgIHBhc3NlZDogdHJ1ZSxcbiAgICAgIG1pc3NpbmdEZXBlbmRlbmNpZXM6IFtdLFxuICAgICAgdmVyc2lvbkNvbmZsaWN0czogW10sXG4gICAgICBjaXJjdWxhckRlcGVuZGVuY2llczogW10sXG4gICAgICBsb2FkT3JkZXI6IFtdLFxuICAgIH07XG5cbiAgICAvLyBDaGVjayBlYWNoIGRlcGVuZGVuY3lcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBza2lsbC5kZXBlbmRlbmNpZXMpIHtcbiAgICAgIGNvbnN0IGRlcEF2YWlsYWJsZSA9IEFycmF5LmZyb20odGhpcy5za2lsbHMudmFsdWVzKCkpLmZpbmQocyA9PiBzLm5hbWUgPT09IGRlcCk7XG4gICAgICBcbiAgICAgIGlmICghZGVwQXZhaWxhYmxlKSB7XG4gICAgICAgIHJlc3VsdC5taXNzaW5nRGVwZW5kZW5jaWVzLnB1c2goZGVwKTtcbiAgICAgICAgcmVzdWx0LnBhc3NlZCA9IGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBjaXJjdWxhciBkZXBlbmRlbmNpZXNcbiAgICBjb25zdCBjeWNsZXMgPSB0aGlzLmRldGVjdEN5Y2xlcyhza2lsbC5uYW1lKTtcbiAgICBpZiAoY3ljbGVzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJlc3VsdC5jaXJjdWxhckRlcGVuZGVuY2llcyA9IGN5Y2xlcztcbiAgICAgIHJlc3VsdC5wYXNzZWQgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDYWxjdWxhdGUgbG9hZCBvcmRlciAodG9wb2xvZ2ljYWwgc29ydClcbiAgICBpZiAocmVzdWx0LnBhc3NlZCkge1xuICAgICAgcmVzdWx0LmxvYWRPcmRlciA9IHRoaXMudG9wb2xvZ2ljYWxTb3J0KCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlY3QgY2lyY3VsYXIgZGVwZW5kZW5jaWVzIHVzaW5nIERGU1xuICAgKi9cbiAgcHJpdmF0ZSBkZXRlY3RDeWNsZXMoc3RhcnROb2RlOiBzdHJpbmcpOiBzdHJpbmdbXVtdIHtcbiAgICBjb25zdCBjeWNsZXM6IHN0cmluZ1tdW10gPSBbXTtcbiAgICBjb25zdCB2aXNpdGVkID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgcmVjdXJzaW9uU3RhY2sgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCBwYXRoOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc3QgZGZzID0gKG5vZGU6IHN0cmluZyk6IHZvaWQgPT4ge1xuICAgICAgaWYgKHJlY3Vyc2lvblN0YWNrLmhhcyhub2RlKSkge1xuICAgICAgICAvLyBGb3VuZCBhIGN5Y2xlXG4gICAgICAgIGNvbnN0IGN5Y2xlU3RhcnQgPSBwYXRoLmluZGV4T2Yobm9kZSk7XG4gICAgICAgIGlmIChjeWNsZVN0YXJ0ICE9PSAtMSkge1xuICAgICAgICAgIGN5Y2xlcy5wdXNoKFsuLi5wYXRoLnNsaWNlKGN5Y2xlU3RhcnQpLCBub2RlXSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAodmlzaXRlZC5oYXMobm9kZSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICB2aXNpdGVkLmFkZChub2RlKTtcbiAgICAgIHJlY3Vyc2lvblN0YWNrLmFkZChub2RlKTtcbiAgICAgIHBhdGgucHVzaChub2RlKTtcblxuICAgICAgY29uc3Qgc2tpbGwgPSBBcnJheS5mcm9tKHRoaXMuc2tpbGxzLnZhbHVlcygpKS5maW5kKHMgPT4gcy5uYW1lID09PSBub2RlKTtcbiAgICAgIGlmIChza2lsbCkge1xuICAgICAgICBmb3IgKGNvbnN0IGRlcCBvZiBza2lsbC5kZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgICBkZnMoZGVwKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBwYXRoLnBvcCgpO1xuICAgICAgcmVjdXJzaW9uU3RhY2suZGVsZXRlKG5vZGUpO1xuICAgIH07XG5cbiAgICBkZnMoc3RhcnROb2RlKTtcbiAgICByZXR1cm4gY3ljbGVzO1xuICB9XG5cbiAgLyoqXG4gICAqIFRvcG9sb2dpY2FsIHNvcnQgZm9yIGxvYWQgb3JkZXJcbiAgICovXG4gIHByaXZhdGUgdG9wb2xvZ2ljYWxTb3J0KCk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBpbkRlZ3JlZSA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG4gICAgY29uc3QgcXVldWU6IHN0cmluZ1tdID0gW107XG4gICAgY29uc3QgcmVzdWx0OiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSBpbi1kZWdyZWVzXG4gICAgZm9yIChjb25zdCBbbmFtZV0gb2YgdGhpcy5za2lsbHMuZW50cmllcygpKSB7XG4gICAgICBpbkRlZ3JlZS5zZXQobmFtZSwgMCk7XG4gICAgfVxuXG4gICAgLy8gQ2FsY3VsYXRlIGluLWRlZ3JlZXNcbiAgICBmb3IgKGNvbnN0IHNraWxsIG9mIHRoaXMuc2tpbGxzLnZhbHVlcygpKSB7XG4gICAgICBmb3IgKGNvbnN0IGRlcCBvZiBza2lsbC5kZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgY29uc3QgZGVwS2V5ID0gQXJyYXkuZnJvbSh0aGlzLnNraWxscy5rZXlzKCkpLmZpbmQoayA9PiBrLnN0YXJ0c1dpdGgoYCR7ZGVwfUBgKSk7XG4gICAgICAgIGlmIChkZXBLZXkpIHtcbiAgICAgICAgICBpbkRlZ3JlZS5zZXQoZGVwS2V5LCAoaW5EZWdyZWUuZ2V0KGRlcEtleSkgfHwgMCkgKyAxKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpbmQgbm9kZXMgd2l0aCBubyBkZXBlbmRlbmNpZXNcbiAgICBmb3IgKGNvbnN0IFtrZXksIGRlZ3JlZV0gb2YgaW5EZWdyZWUuZW50cmllcygpKSB7XG4gICAgICBpZiAoZGVncmVlID09PSAwKSB7XG4gICAgICAgIHF1ZXVlLnB1c2goa2V5KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBQcm9jZXNzIHF1ZXVlXG4gICAgd2hpbGUgKHF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IGN1cnJlbnQgPSBxdWV1ZS5zaGlmdCgpITtcbiAgICAgIHJlc3VsdC5wdXNoKGN1cnJlbnQpO1xuXG4gICAgICAvLyBSZWR1Y2UgaW4tZGVncmVlIGZvciBkZXBlbmRlbnRzXG4gICAgICBjb25zdCBza2lsbCA9IHRoaXMuc2tpbGxzLmdldChjdXJyZW50KTtcbiAgICAgIGlmIChza2lsbCkge1xuICAgICAgICBmb3IgKGNvbnN0IFtrZXksIHNdIG9mIHRoaXMuc2tpbGxzLmVudHJpZXMoKSkge1xuICAgICAgICAgIGlmIChzLmRlcGVuZGVuY2llcy5pbmNsdWRlcyhza2lsbC5uYW1lKSkge1xuICAgICAgICAgICAgY29uc3QgZGVncmVlID0gaW5EZWdyZWUuZ2V0KGtleSkgfHwgMDtcbiAgICAgICAgICAgIGluRGVncmVlLnNldChrZXksIGRlZ3JlZSAtIDEpO1xuICAgICAgICAgICAgaWYgKGRlZ3JlZSAtIDEgPT09IDApIHtcbiAgICAgICAgICAgICAgcXVldWUucHVzaChrZXkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFByaXZhdGUgTWV0aG9kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgcHJpdmF0ZSB1cGRhdGVEZXBlbmRlbmN5R3JhcGgoc2tpbGw6IFNraWxsKTogdm9pZCB7XG4gICAgLy8gQWRkIG5vZGVcbiAgICBjb25zdCBub2RlOiBEZXBlbmRlbmN5Tm9kZSA9IHtcbiAgICAgIG5hbWU6IHNraWxsLm5hbWUsXG4gICAgICB2ZXJzaW9uOiBza2lsbC52ZXJzaW9uLFxuICAgICAgaW5EZWdyZWU6IHNraWxsLmRlcGVuZGVuY2llcy5sZW5ndGgsXG4gICAgICBvdXREZWdyZWU6IDAsXG4gICAgfTtcbiAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaC5ub2Rlcy5zZXQoc2tpbGwubmFtZSwgbm9kZSk7XG5cbiAgICAvLyBBZGQgZWRnZXNcbiAgICBmb3IgKGNvbnN0IGRlcCBvZiBza2lsbC5kZXBlbmRlbmNpZXMpIHtcbiAgICAgIGlmICghdGhpcy5kZXBlbmRlbmN5R3JhcGguZWRnZXMuaGFzKGRlcCkpIHtcbiAgICAgICAgdGhpcy5kZXBlbmRlbmN5R3JhcGguZWRnZXMuc2V0KGRlcCwgbmV3IFNldCgpKTtcbiAgICAgIH1cbiAgICAgIHRoaXMuZGVwZW5kZW5jeUdyYXBoLmVkZ2VzLmdldChkZXApIS5hZGQoc2tpbGwubmFtZSk7XG5cbiAgICAgIGlmICghdGhpcy5kZXBlbmRlbmN5R3JhcGgucmV2ZXJzZUVkZ2VzLmhhcyhza2lsbC5uYW1lKSkge1xuICAgICAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaC5yZXZlcnNlRWRnZXMuc2V0KHNraWxsLm5hbWUsIG5ldyBTZXQoKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaC5yZXZlcnNlRWRnZXMuZ2V0KHNraWxsLm5hbWUpIS5hZGQoZGVwKTtcblxuICAgICAgLy8gVXBkYXRlIG91dC1kZWdyZWUgZm9yIGRlcGVuZGVuY3lcbiAgICAgIGNvbnN0IGRlcE5vZGUgPSB0aGlzLmRlcGVuZGVuY3lHcmFwaC5ub2Rlcy5nZXQoZGVwKTtcbiAgICAgIGlmIChkZXBOb2RlKSB7XG4gICAgICAgIGRlcE5vZGUub3V0RGVncmVlKys7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSByZW1vdmVGcm9tRGVwZW5kZW5jeUdyYXBoKHNraWxsTmFtZTogc3RyaW5nKTogdm9pZCB7XG4gICAgLy8gUmVtb3ZlIG5vZGVcbiAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaC5ub2Rlcy5kZWxldGUoc2tpbGxOYW1lKTtcblxuICAgIC8vIFJlbW92ZSBlZGdlc1xuICAgIHRoaXMuZGVwZW5kZW5jeUdyYXBoLmVkZ2VzLmRlbGV0ZShza2lsbE5hbWUpO1xuICAgIHRoaXMuZGVwZW5kZW5jeUdyYXBoLnJldmVyc2VFZGdlcy5kZWxldGUoc2tpbGxOYW1lKTtcblxuICAgIC8vIFJlbW92ZSBmcm9tIG90aGVyIGVkZ2VzXG4gICAgZm9yIChjb25zdCBbZnJvbSwgdG9TZXRdIG9mIHRoaXMuZGVwZW5kZW5jeUdyYXBoLmVkZ2VzLmVudHJpZXMoKSkge1xuICAgICAgdG9TZXQuZGVsZXRlKHNraWxsTmFtZSk7XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3RvLCBmcm9tU2V0XSBvZiB0aGlzLmRlcGVuZGVuY3lHcmFwaC5yZXZlcnNlRWRnZXMuZW50cmllcygpKSB7XG4gICAgICBmcm9tU2V0LmRlbGV0ZShza2lsbE5hbWUpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgZ2V0RGVwZW5kZW50cyhza2lsbE5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICBjb25zdCBkZXBlbmRlbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgc2tpbGwgb2YgdGhpcy5za2lsbHMudmFsdWVzKCkpIHtcbiAgICAgIGlmIChza2lsbC5kZXBlbmRlbmNpZXMuaW5jbHVkZXMoc2tpbGxOYW1lKSkge1xuICAgICAgICBkZXBlbmRlbnRzLnB1c2goc2tpbGwubmFtZSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBkZXBlbmRlbnRzO1xuICB9XG5cbiAgcHJpdmF0ZSBlbWl0RXZlbnQodHlwZTogc3RyaW5nLCBza2lsbE5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nLCBkYXRhPzogYW55KTogdm9pZCB7XG4gICAgY29uc3QgZXZlbnQgPSB7XG4gICAgICB0eXBlLFxuICAgICAgc2tpbGxOYW1lLFxuICAgICAgdmVyc2lvbixcbiAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgICBkYXRhLFxuICAgIH07XG5cbiAgICBmb3IgKGNvbnN0IGxpc3RlbmVyIG9mIHRoaXMuZXZlbnRMaXN0ZW5lcnMpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGxpc3RlbmVyKGV2ZW50KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGluIGV2ZW50IGxpc3RlbmVyOiAke2Vycm9yfWApO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIE1vY2sgbWV0aG9kcyBmb3IgZGVtb1xuICBwcml2YXRlIGdlbmVyYXRlTW9ja1NraWxsQ29kZShuYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZyk6IHN0cmluZyB7XG4gICAgcmV0dXJuIGBcbi8vIFNraWxsOiAke25hbWV9QCR7dmVyc2lvbn1cbmV4cG9ydCBmdW5jdGlvbiBtYWluKGNvbnRleHQ6IGFueSkge1xuICBjb25zb2xlLmxvZygnRXhlY3V0aW5nIHNraWxsOiAke25hbWV9Jyk7XG4gIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUsIG5hbWU6ICcke25hbWV9JywgdmVyc2lvbjogJyR7dmVyc2lvbn0nIH07XG59XG5gO1xuICB9XG5cbiAgcHJpdmF0ZSBnZXRNb2NrRGVwZW5kZW5jaWVzKG5hbWU6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICAvLyBNb2NrIGRlcGVuZGVuY2llcyBiYXNlZCBvbiBza2lsbCBuYW1lXG4gICAgY29uc3QgZGVwczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xuICAgICAgJ2RhdGEtcHJvY2Vzc29yJzogWyd1dGlscycsICd2YWxpZGF0b3InXSxcbiAgICAgICdhcGktY2xpZW50JzogWydodHRwLXV0aWxzJywgJ2F1dGgnXSxcbiAgICAgICd2YWxpZGF0b3InOiBbJ3V0aWxzJ10sXG4gICAgfTtcbiAgICByZXR1cm4gZGVwc1tuYW1lXSB8fCBbXTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gRXZlbnQgU3lzdGVtXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogU3Vic2NyaWJlIHRvIHNraWxsIGV2ZW50c1xuICAgKi9cbiAgb25FdmVudChsaXN0ZW5lcjogKGV2ZW50OiBhbnkpID0+IHZvaWQpOiAoKSA9PiB2b2lkIHtcbiAgICB0aGlzLmV2ZW50TGlzdGVuZXJzLmFkZChsaXN0ZW5lcik7XG4gICAgcmV0dXJuICgpID0+IHtcbiAgICAgIHRoaXMuZXZlbnRMaXN0ZW5lcnMuZGVsZXRlKGxpc3RlbmVyKTtcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBkZXBlbmRlbmN5IGdyYXBoXG4gICAqL1xuICBnZXREZXBlbmRlbmN5R3JhcGgoKTogRGVwZW5kZW5jeUdyYXBoIHtcbiAgICByZXR1cm4gdGhpcy5kZXBlbmRlbmN5R3JhcGg7XG4gIH1cblxuICAvKipcbiAgICogR2V0IGxvYWQgb3JkZXJcbiAgICovXG4gIGdldExvYWRPcmRlcigpOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMubG9hZE9yZGVyO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4cG9ydHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGRlZmF1bHQgU2tpbGxzUmVnaXN0cnk7XG4iXX0=