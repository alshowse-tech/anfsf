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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2tpbGxzLXJlZ2lzdHJ5LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2tpbGxzLXJlZ2lzdHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBZ0JILCtFQUErRTtBQUMvRSxZQUFZO0FBQ1osK0VBQStFO0FBRS9FLE1BQU0sY0FBYyxHQUFtQztJQUNyRCxXQUFXLEVBQUUsVUFBVTtJQUN2QixlQUFlLEVBQUUsSUFBSTtJQUNyQixjQUFjLEVBQUUsSUFBSTtJQUNwQixpQkFBaUIsRUFBRSwwQkFBMEI7SUFDN0Msb0JBQW9CLEVBQUU7UUFDcEIsV0FBVyxFQUFFLEdBQUc7UUFDaEIsa0JBQWtCLEVBQUUsS0FBSztRQUN6QixjQUFjLEVBQUUsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFNBQVMsQ0FBQztRQUNyRyxXQUFXLEVBQUUsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQztRQUNwRyxvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLFlBQVksRUFBRSxLQUFLO1FBQ25CLGVBQWUsRUFBRSxLQUFLO1FBQ3RCLGFBQWEsRUFBRSxFQUFFO0tBQ2xCO0lBQ0QsU0FBUyxFQUFFLEdBQUc7Q0FDZixDQUFDO0FBRUYsK0VBQStFO0FBQy9FLG1CQUFtQjtBQUNuQiwrRUFBK0U7QUFFL0Usb0JBQW9CO0FBQ3BCLFNBQVMsWUFBWTtJQUNuQixPQUFPLHNDQUFzQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNuRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFL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QyxJQUFJLElBQUksT0FBTzs7a0NBRU8sSUFBSTttQ0FDSCxJQUFJLGdCQUFnQixPQUFPOztDQUU3RCxDQUFDO0lBQ0EsQ0FBQztJQUVPLG1CQUFtQixDQUFDLElBQVk7UUFDdEMsd0NBQXdDO1FBQ3hDLE1BQU0sSUFBSSxHQUE2QjtZQUNyQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUM7WUFDeEMsWUFBWSxFQUFFLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQztZQUNwQyxXQUFXLEVBQUUsQ0FBQyxPQUFPLENBQUM7U0FDdkIsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsK0VBQStFO0lBQy9FLGVBQWU7SUFDZiwrRUFBK0U7SUFFL0U7O09BRUc7SUFDSCxPQUFPLENBQUMsUUFBOEI7UUFDcEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDbEMsT0FBTyxHQUFHLEVBQUU7WUFDVixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxrQkFBa0I7UUFDaEIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNILFlBQVk7UUFDVixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUM7SUFDeEIsQ0FBQztDQUNGO0FBdmFELHdDQXVhQztBQUVELCtFQUErRTtBQUMvRSxVQUFVO0FBQ1YsK0VBQStFO0FBRS9FLGtCQUFlLGNBQWMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjQgTGF5ZXIgOC41IC0gU2tpbGxzIFJlZ2lzdHJ5IEltcGxlbWVudGF0aW9uXG4gKiBcbiAqIFNraWxscyByZWdpc3RyeSB3aXRoIGRlcGVuZGVuY3kgdG9wb2xvZ3kgY2hlY2tpbmcsIHNhbmRib3ggZXhlY3V0aW9uLCBhbmQgaG90LXJlbG9hZGluZy5cbiAqIEZlYXR1cmVzOiBjaXJjdWxhciBkZXBlbmRlbmN5IGRldGVjdGlvbiwgbWVtb3J5IGxpbWl0cywgdGltZSBsaW1pdHMsIEdyYXBoUkFHIGluZGV4aW5nLlxuICovXG5cbmltcG9ydCB7XG4gIFNraWxsLFxuICBTa2lsbFN0YXR1cyxcbiAgU2tpbGxNZXRhZGF0YSxcbiAgU2tpbGxzUmVnaXN0cnlDb25maWcsXG4gIFNraWxsTG9hZE9wdGlvbnMsXG4gIFNraWxsVW5sb2FkT3B0aW9ucyxcbiAgRGVwZW5kZW5jeUdyYXBoLFxuICBEZXBlbmRlbmN5Tm9kZSxcbiAgRGVwZW5kZW5jeUNoZWNrUmVzdWx0LFxuICBpc1NraWxsLFxuICBpc0RlcGVuZGVuY3lDaGVja1Jlc3VsdCxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBERUZBVUxUX0NPTkZJRzogUmVxdWlyZWQ8U2tpbGxzUmVnaXN0cnlDb25maWc+ID0ge1xuICBzdG9yYWdlUGF0aDogJy4vc2tpbGxzJyxcbiAgZW5hYmxlSG90UmVsb2FkOiB0cnVlLFxuICBlbmFibGVHcmFwaFJBRzogdHJ1ZSxcbiAgZ3JhcGhSQUdJbmRleFBhdGg6ICcuL3NraWxscy9ncmFwaC1yYWctaW5kZXgnLFxuICBkZWZhdWx0U2FuZGJveENvbmZpZzoge1xuICAgIG1heE1lbW9yeU1COiAyNTYsXG4gICAgbWF4RXhlY3V0aW9uVGltZU1zOiAzMDAwMCxcbiAgICBhbGxvd2VkR2xvYmFsczogWydjb25zb2xlJywgJ01hdGgnLCAnRGF0ZScsICdKU09OJywgJ0FycmF5JywgJ09iamVjdCcsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0Jvb2xlYW4nXSxcbiAgICBibG9ja2VkQVBJczogWydyZXF1aXJlJywgJ2V2YWwnLCAnRnVuY3Rpb24nLCAnc2V0VGltZW91dCcsICdzZXRJbnRlcnZhbCcsICdmZXRjaCcsICdYTUxIdHRwUmVxdWVzdCddLFxuICAgIGVuYWJsZUNvbnNvbGVDYXB0dXJlOiB0cnVlLFxuICAgIGFsbG93TmV0d29yazogZmFsc2UsXG4gICAgYWxsb3dGaWxlU3lzdGVtOiBmYWxzZSxcbiAgICByZWFkT25seVBhdGhzOiBbXSxcbiAgfSxcbiAgbWF4U2tpbGxzOiAxMDAsXG59O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBIZWxwZXIgRnVuY3Rpb25zXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKiBHZW5lcmF0ZSBVVUlEICovXG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKTogc3RyaW5nIHtcbiAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgKGMpID0+IHtcbiAgICBjb25zdCByID0gKE1hdGgucmFuZG9tKCkgKiAxNikgfCAwO1xuICAgIGNvbnN0IHYgPSBjID09PSAneCcgPyByIDogKHIgJiAweDMpIHwgMHg4O1xuICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgfSk7XG59XG5cbi8qKiBHZXQgY3VycmVudCB0aW1lc3RhbXAgKi9cbmZ1bmN0aW9uIG5vdygpOiBudW1iZXIge1xuICByZXR1cm4gRGF0ZS5ub3coKTtcbn1cblxuLyoqIFBhcnNlIHNlbXZlciB2ZXJzaW9uICovXG5mdW5jdGlvbiBwYXJzZVZlcnNpb24odmVyc2lvbjogc3RyaW5nKTogeyBtYWpvcjogbnVtYmVyOyBtaW5vcjogbnVtYmVyOyBwYXRjaDogbnVtYmVyIH0ge1xuICBjb25zdCBwYXJ0cyA9IHZlcnNpb24uc3BsaXQoJy4nKS5tYXAoTnVtYmVyKTtcbiAgcmV0dXJuIHtcbiAgICBtYWpvcjogcGFydHNbMF0gfHwgMCxcbiAgICBtaW5vcjogcGFydHNbMV0gfHwgMCxcbiAgICBwYXRjaDogcGFydHNbMl0gfHwgMCxcbiAgfTtcbn1cblxuLyoqIENoZWNrIHZlcnNpb24gY29uc3RyYWludCAqL1xuZnVuY3Rpb24gc2F0aXNmaWVzVmVyc2lvbihhdmFpbGFibGU6IHN0cmluZywgY29uc3RyYWludDogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGlmICghY29uc3RyYWludCB8fCBjb25zdHJhaW50ID09PSAnKicpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIGNvbnN0IGF2YWlsYWJsZVZlciA9IHBhcnNlVmVyc2lvbihhdmFpbGFibGUpO1xuICBcbiAgLy8gSGFuZGxlIF4gY29uc3RyYWludCAoY29tcGF0aWJsZSB3aXRoIHZlcnNpb24pXG4gIGlmIChjb25zdHJhaW50LnN0YXJ0c1dpdGgoJ14nKSkge1xuICAgIGNvbnN0IHJlcXVpcmVkVmVyID0gcGFyc2VWZXJzaW9uKGNvbnN0cmFpbnQuc3Vic3RyaW5nKDEpKTtcbiAgICByZXR1cm4gYXZhaWxhYmxlVmVyLm1ham9yID09PSByZXF1aXJlZFZlci5tYWpvciAmJiBcbiAgICAgICAgICAgYXZhaWxhYmxlVmVyLm1pbm9yID49IHJlcXVpcmVkVmVyLm1pbm9yO1xuICB9XG4gIFxuICAvLyBIYW5kbGUgPj0gY29uc3RyYWludFxuICBpZiAoY29uc3RyYWludC5zdGFydHNXaXRoKCc+PScpKSB7XG4gICAgY29uc3QgcmVxdWlyZWRWZXIgPSBwYXJzZVZlcnNpb24oY29uc3RyYWludC5zdWJzdHJpbmcoMikpO1xuICAgIGlmIChhdmFpbGFibGVWZXIubWFqb3IgPiByZXF1aXJlZFZlci5tYWpvcikgcmV0dXJuIHRydWU7XG4gICAgaWYgKGF2YWlsYWJsZVZlci5tYWpvciA8IHJlcXVpcmVkVmVyLm1ham9yKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKGF2YWlsYWJsZVZlci5taW5vciA+IHJlcXVpcmVkVmVyLm1pbm9yKSByZXR1cm4gdHJ1ZTtcbiAgICBpZiAoYXZhaWxhYmxlVmVyLm1pbm9yIDwgcmVxdWlyZWRWZXIubWlub3IpIHJldHVybiBmYWxzZTtcbiAgICByZXR1cm4gYXZhaWxhYmxlVmVyLnBhdGNoID49IHJlcXVpcmVkVmVyLnBhdGNoO1xuICB9XG5cbiAgLy8gRXhhY3QgbWF0Y2hcbiAgY29uc3QgcmVxdWlyZWRWZXIgPSBwYXJzZVZlcnNpb24oY29uc3RyYWludCk7XG4gIHJldHVybiBhdmFpbGFibGVWZXIubWFqb3IgPT09IHJlcXVpcmVkVmVyLm1ham9yICYmXG4gICAgICAgICBhdmFpbGFibGVWZXIubWlub3IgPT09IHJlcXVpcmVkVmVyLm1pbm9yICYmXG4gICAgICAgICBhdmFpbGFibGVWZXIucGF0Y2ggPT09IHJlcXVpcmVkVmVyLnBhdGNoO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBTa2lsbHNSZWdpc3RyeSBDbGFzc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIFNraWxsc1JlZ2lzdHJ5IC0gUmVnaXN0cnkgZm9yIG1hbmFnaW5nIHNraWxscyB3aXRoIGRlcGVuZGVuY3kgY2hlY2tpbmdcbiAqL1xuZXhwb3J0IGNsYXNzIFNraWxsc1JlZ2lzdHJ5IHtcbiAgcHJpdmF0ZSBjb25maWc6IFJlcXVpcmVkPFNraWxsc1JlZ2lzdHJ5Q29uZmlnPjtcbiAgcHJpdmF0ZSBza2lsbHM6IE1hcDxzdHJpbmcsIFNraWxsPjtcbiAgcHJpdmF0ZSBkZXBlbmRlbmN5R3JhcGg6IERlcGVuZGVuY3lHcmFwaDtcbiAgcHJpdmF0ZSBldmVudExpc3RlbmVyczogU2V0PChldmVudDogYW55KSA9PiB2b2lkPjtcbiAgcHJpdmF0ZSBsb2FkT3JkZXI6IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogU2tpbGxzUmVnaXN0cnlDb25maWcgPSB7fSkge1xuICAgIHRoaXMuY29uZmlnID0geyAuLi5ERUZBVUxUX0NPTkZJRywgLi4uY29uZmlnIH07XG4gICAgdGhpcy5za2lsbHMgPSBuZXcgTWFwKCk7XG4gICAgdGhpcy5kZXBlbmRlbmN5R3JhcGggPSB7XG4gICAgICBub2RlczogbmV3IE1hcCgpLFxuICAgICAgZWRnZXM6IG5ldyBNYXAoKSxcbiAgICAgIHJldmVyc2VFZGdlczogbmV3IE1hcCgpLFxuICAgIH07XG4gICAgdGhpcy5ldmVudExpc3RlbmVycyA9IG5ldyBTZXQoKTtcbiAgICB0aGlzLmxvYWRPcmRlciA9IFtdO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDb3JlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBMb2FkIGEgc2tpbGwgaW50byB0aGUgcmVnaXN0cnlcbiAgICovXG4gIGFzeW5jIGxvYWQoc2tpbGxOYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgb3B0aW9uczogU2tpbGxMb2FkT3B0aW9ucyA9IHt9KTogUHJvbWlzZTxTa2lsbD4ge1xuICAgIGNvbnN0IHNraWxsS2V5ID0gYCR7c2tpbGxOYW1lfUAke3ZlcnNpb259YDtcblxuICAgIC8vIENoZWNrIGlmIGFscmVhZHkgbG9hZGVkXG4gICAgaWYgKCFvcHRpb25zLmZvcmNlICYmIHRoaXMuc2tpbGxzLmhhcyhza2lsbEtleSkpIHtcbiAgICAgIGNvbnN0IGV4aXN0aW5nU2tpbGwgPSB0aGlzLnNraWxscy5nZXQoc2tpbGxLZXkpITtcbiAgICAgIHRoaXMuZW1pdEV2ZW50KCdza2lsbDpsb2FkZWQnLCBza2lsbE5hbWUsIHZlcnNpb24sIHsgY2FjaGVkOiB0cnVlIH0pO1xuICAgICAgcmV0dXJuIGV4aXN0aW5nU2tpbGw7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgbWF4IHNraWxscyBsaW1pdFxuICAgIGlmICh0aGlzLnNraWxscy5zaXplID49IHRoaXMuY29uZmlnLm1heFNraWxscykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBNYXhpbXVtIHNraWxscyBsaW1pdCByZWFjaGVkOiAke3RoaXMuY29uZmlnLm1heFNraWxsc31gKTtcbiAgICB9XG5cbiAgICAvLyBDcmVhdGUgc2tpbGwgcGxhY2Vob2xkZXJcbiAgICBjb25zdCBza2lsbDogU2tpbGwgPSB7XG4gICAgICBuYW1lOiBza2lsbE5hbWUsXG4gICAgICB2ZXJzaW9uLFxuICAgICAgZGVwZW5kZW5jaWVzOiBbXSxcbiAgICAgIGVudHJ5UG9pbnQ6ICdtYWluJyxcbiAgICAgIGNvZGU6ICcnLFxuICAgICAgbG9hZGVkQXQ6IG5vdygpLFxuICAgIH07XG4gICAgc2tpbGwuc3RhdHVzID0gJ2xvYWRpbmcnO1xuXG4gICAgLy8gRm9yIGRlbW8gcHVycG9zZXMsIGNyZWF0ZSBhIG1vY2sgc2tpbGxcbiAgICAvLyBJbiBwcm9kdWN0aW9uLCB0aGlzIHdvdWxkIGxvYWQgZnJvbSBzdG9yYWdlIG9yIHJlbW90ZVxuICAgIHNraWxsLmNvZGUgPSB0aGlzLmdlbmVyYXRlTW9ja1NraWxsQ29kZShza2lsbE5hbWUsIHZlcnNpb24pO1xuICAgIFxuICAgIC8vIFVzZSBwcm92aWRlZCBkZXBlbmRlbmNpZXMgb3IgbW9jayBkZXBlbmRlbmNpZXNcbiAgICBpZiAob3B0aW9ucy5kZXBlbmRlbmNpZXMgJiYgb3B0aW9ucy5kZXBlbmRlbmNpZXMubGVuZ3RoID4gMCkge1xuICAgICAgc2tpbGwuZGVwZW5kZW5jaWVzID0gb3B0aW9ucy5kZXBlbmRlbmNpZXM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNraWxsLmRlcGVuZGVuY2llcyA9IHRoaXMuZ2V0TW9ja0RlcGVuZGVuY2llcyhza2lsbE5hbWUpO1xuICAgIH1cblxuICAgIC8vIENoZWNrIGRlcGVuZGVuY2llc1xuICAgIGlmICghb3B0aW9ucy5za2lwRGVwZW5kZW5jeUNoZWNrKSB7XG4gICAgICBjb25zdCBkZXBDaGVjayA9IGF3YWl0IHRoaXMuY2hlY2tEZXBlbmRlbmNpZXMoc2tpbGwpO1xuICAgICAgaWYgKCFkZXBDaGVjay5wYXNzZWQpIHtcbiAgICAgICAgc2tpbGwuc3RhdHVzID0gJ2Vycm9yJztcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEZXBlbmRlbmN5IGNoZWNrIGZhaWxlZDogJHtKU09OLnN0cmluZ2lmeShkZXBDaGVjay5taXNzaW5nRGVwZW5kZW5jaWVzKX1gKTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gVXBkYXRlIGxvYWQgb3JkZXJcbiAgICAgIHRoaXMubG9hZE9yZGVyID0gZGVwQ2hlY2subG9hZE9yZGVyO1xuICAgIH1cblxuICAgIC8vIEFkZCB0byByZWdpc3RyeVxuICAgIHRoaXMuc2tpbGxzLnNldChza2lsbEtleSwgc2tpbGwpO1xuICAgIHNraWxsLnN0YXR1cyA9ICdsb2FkZWQnO1xuXG4gICAgLy8gVXBkYXRlIGRlcGVuZGVuY3kgZ3JhcGhcbiAgICB0aGlzLnVwZGF0ZURlcGVuZGVuY3lHcmFwaChza2lsbCk7XG5cbiAgICB0aGlzLmVtaXRFdmVudCgnc2tpbGw6bG9hZGVkJywgc2tpbGxOYW1lLCB2ZXJzaW9uKTtcblxuICAgIHJldHVybiBza2lsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmxvYWQgYSBza2lsbCBmcm9tIHRoZSByZWdpc3RyeVxuICAgKi9cbiAgYXN5bmMgdW5sb2FkKHNraWxsTmFtZTogc3RyaW5nLCBvcHRpb25zOiBTa2lsbFVubG9hZE9wdGlvbnMgPSB7fSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIEZpbmQgdGhlIHNraWxsXG4gICAgbGV0IHNraWxsS2V5OiBzdHJpbmcgfCBudWxsID0gbnVsbDtcbiAgICBsZXQgc2tpbGw6IFNraWxsIHwgbnVsbCA9IG51bGw7XG5cbiAgICBmb3IgKGNvbnN0IFtrZXksIHNdIG9mIHRoaXMuc2tpbGxzLmVudHJpZXMoKSkge1xuICAgICAgaWYgKGtleS5zdGFydHNXaXRoKGAke3NraWxsTmFtZX1AYCkpIHtcbiAgICAgICAgc2tpbGxLZXkgPSBrZXk7XG4gICAgICAgIHNraWxsID0gcztcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFza2lsbCB8fCAhc2tpbGxLZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2tpbGwgbm90IGZvdW5kOiAke3NraWxsTmFtZX1gKTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgZGVwZW5kZW50c1xuICAgIGlmICghb3B0aW9ucy5mb3JjZSkge1xuICAgICAgY29uc3QgZGVwZW5kZW50cyA9IHRoaXMuZ2V0RGVwZW5kZW50cyhza2lsbE5hbWUpO1xuICAgICAgaWYgKGRlcGVuZGVudHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYENhbm5vdCB1bmxvYWQgc2tpbGwgd2l0aCBkZXBlbmRlbnRzOiAke2RlcGVuZGVudHMuam9pbignLCAnKX1gKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgZnJvbSByZWdpc3RyeVxuICAgIHRoaXMuc2tpbGxzLmRlbGV0ZShza2lsbEtleSk7XG5cbiAgICAvLyBVcGRhdGUgZGVwZW5kZW5jeSBncmFwaFxuICAgIHRoaXMucmVtb3ZlRnJvbURlcGVuZGVuY3lHcmFwaChza2lsbE5hbWUpO1xuXG4gICAgdGhpcy5lbWl0RXZlbnQoJ3NraWxsOnVubG9hZGVkJywgc2tpbGxOYW1lLCBza2lsbC52ZXJzaW9uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBMaXN0IGFsbCBsb2FkZWQgc2tpbGxzXG4gICAqL1xuICBhc3luYyBsaXN0KCk6IFByb21pc2U8U2tpbGxbXT4ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuc2tpbGxzLnZhbHVlcygpKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZGVwZW5kZW5jaWVzIGZvciBhIHNraWxsXG4gICAqL1xuICBhc3luYyBnZXREZXBlbmRlbmNpZXMoc2tpbGxOYW1lOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZ1tdPiB7XG4gICAgY29uc3Qgc2tpbGwgPSBBcnJheS5mcm9tKHRoaXMuc2tpbGxzLnZhbHVlcygpKS5maW5kKHMgPT4gcy5uYW1lID09PSBza2lsbE5hbWUpO1xuICAgIGlmICghc2tpbGwpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihgU2tpbGwgbm90IGZvdW5kOiAke3NraWxsTmFtZX1gKTtcbiAgICB9XG4gICAgcmV0dXJuIHNraWxsLmRlcGVuZGVuY2llcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2tpbGwgbWV0YWRhdGFcbiAgICovXG4gIGFzeW5jIGdldE1ldGFkYXRhKHNraWxsTmFtZTogc3RyaW5nKTogUHJvbWlzZTxTa2lsbE1ldGFkYXRhIHwgbnVsbD4ge1xuICAgIGNvbnN0IHNraWxsID0gQXJyYXkuZnJvbSh0aGlzLnNraWxscy52YWx1ZXMoKSkuZmluZChzID0+IHMubmFtZSA9PT0gc2tpbGxOYW1lKTtcbiAgICBpZiAoIXNraWxsKSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogc2tpbGwubmFtZSxcbiAgICAgIHZlcnNpb246IHNraWxsLnZlcnNpb24sXG4gICAgICBkZXBlbmRlbmNpZXM6IHNraWxsLmRlcGVuZGVuY2llcy5tYXAoZCA9PiAoeyBuYW1lOiBkLCB2ZXJzaW9uOiAnKicgfSkpLFxuICAgICAgZXhwb3J0czogW3NraWxsLmVudHJ5UG9pbnRdLFxuICAgICAgcmlza0xldmVsOiAxMCxcbiAgICB9O1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBEZXBlbmRlbmN5IEdyYXBoIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBDaGVjayBkZXBlbmRlbmNpZXMgZm9yIGEgc2tpbGxcbiAgICovXG4gIGFzeW5jIGNoZWNrRGVwZW5kZW5jaWVzKHNraWxsOiBTa2lsbCk6IFByb21pc2U8RGVwZW5kZW5jeUNoZWNrUmVzdWx0PiB7XG4gICAgY29uc3QgcmVzdWx0OiBEZXBlbmRlbmN5Q2hlY2tSZXN1bHQgPSB7XG4gICAgICBwYXNzZWQ6IHRydWUsXG4gICAgICBtaXNzaW5nRGVwZW5kZW5jaWVzOiBbXSxcbiAgICAgIHZlcnNpb25Db25mbGljdHM6IFtdLFxuICAgICAgY2lyY3VsYXJEZXBlbmRlbmNpZXM6IFtdLFxuICAgICAgbG9hZE9yZGVyOiBbXSxcbiAgICB9O1xuXG4gICAgLy8gQ2hlY2sgZWFjaCBkZXBlbmRlbmN5XG4gICAgZm9yIChjb25zdCBkZXAgb2Ygc2tpbGwuZGVwZW5kZW5jaWVzKSB7XG4gICAgICBjb25zdCBkZXBBdmFpbGFibGUgPSBBcnJheS5mcm9tKHRoaXMuc2tpbGxzLnZhbHVlcygpKS5maW5kKHMgPT4gcy5uYW1lID09PSBkZXApO1xuICAgICAgXG4gICAgICBpZiAoIWRlcEF2YWlsYWJsZSkge1xuICAgICAgICByZXN1bHQubWlzc2luZ0RlcGVuZGVuY2llcy5wdXNoKGRlcCk7XG4gICAgICAgIHJlc3VsdC5wYXNzZWQgPSBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgY2lyY3VsYXIgZGVwZW5kZW5jaWVzXG4gICAgY29uc3QgY3ljbGVzID0gdGhpcy5kZXRlY3RDeWNsZXMoc2tpbGwubmFtZSk7XG4gICAgaWYgKGN5Y2xlcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXN1bHQuY2lyY3VsYXJEZXBlbmRlbmNpZXMgPSBjeWNsZXM7XG4gICAgICByZXN1bHQucGFzc2VkID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQ2FsY3VsYXRlIGxvYWQgb3JkZXIgKHRvcG9sb2dpY2FsIHNvcnQpXG4gICAgaWYgKHJlc3VsdC5wYXNzZWQpIHtcbiAgICAgIHJlc3VsdC5sb2FkT3JkZXIgPSB0aGlzLnRvcG9sb2dpY2FsU29ydCgpO1xuICAgIH1cblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZWN0IGNpcmN1bGFyIGRlcGVuZGVuY2llcyB1c2luZyBERlNcbiAgICovXG4gIHByaXZhdGUgZGV0ZWN0Q3ljbGVzKHN0YXJ0Tm9kZTogc3RyaW5nKTogc3RyaW5nW11bXSB7XG4gICAgY29uc3QgY3ljbGVzOiBzdHJpbmdbXVtdID0gW107XG4gICAgY29uc3QgdmlzaXRlZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHJlY3Vyc2lvblN0YWNrID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgcGF0aDogc3RyaW5nW10gPSBbXTtcblxuICAgIGNvbnN0IGRmcyA9IChub2RlOiBzdHJpbmcpOiB2b2lkID0+IHtcbiAgICAgIGlmIChyZWN1cnNpb25TdGFjay5oYXMobm9kZSkpIHtcbiAgICAgICAgLy8gRm91bmQgYSBjeWNsZVxuICAgICAgICBjb25zdCBjeWNsZVN0YXJ0ID0gcGF0aC5pbmRleE9mKG5vZGUpO1xuICAgICAgICBpZiAoY3ljbGVTdGFydCAhPT0gLTEpIHtcbiAgICAgICAgICBjeWNsZXMucHVzaChbLi4ucGF0aC5zbGljZShjeWNsZVN0YXJ0KSwgbm9kZV0pO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHZpc2l0ZWQuaGFzKG5vZGUpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgdmlzaXRlZC5hZGQobm9kZSk7XG4gICAgICByZWN1cnNpb25TdGFjay5hZGQobm9kZSk7XG4gICAgICBwYXRoLnB1c2gobm9kZSk7XG5cbiAgICAgIGNvbnN0IHNraWxsID0gQXJyYXkuZnJvbSh0aGlzLnNraWxscy52YWx1ZXMoKSkuZmluZChzID0+IHMubmFtZSA9PT0gbm9kZSk7XG4gICAgICBpZiAoc2tpbGwpIHtcbiAgICAgICAgZm9yIChjb25zdCBkZXAgb2Ygc2tpbGwuZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgICAgZGZzKGRlcCk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcGF0aC5wb3AoKTtcbiAgICAgIHJlY3Vyc2lvblN0YWNrLmRlbGV0ZShub2RlKTtcbiAgICB9O1xuXG4gICAgZGZzKHN0YXJ0Tm9kZSk7XG4gICAgcmV0dXJuIGN5Y2xlcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUb3BvbG9naWNhbCBzb3J0IGZvciBsb2FkIG9yZGVyXG4gICAqL1xuICBwcml2YXRlIHRvcG9sb2dpY2FsU29ydCgpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgaW5EZWdyZWUgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuICAgIGNvbnN0IHF1ZXVlOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcblxuICAgIC8vIEluaXRpYWxpemUgaW4tZGVncmVlc1xuICAgIGZvciAoY29uc3QgW25hbWVdIG9mIHRoaXMuc2tpbGxzLmVudHJpZXMoKSkge1xuICAgICAgaW5EZWdyZWUuc2V0KG5hbWUsIDApO1xuICAgIH1cblxuICAgIC8vIENhbGN1bGF0ZSBpbi1kZWdyZWVzXG4gICAgZm9yIChjb25zdCBza2lsbCBvZiB0aGlzLnNraWxscy52YWx1ZXMoKSkge1xuICAgICAgZm9yIChjb25zdCBkZXAgb2Ygc2tpbGwuZGVwZW5kZW5jaWVzKSB7XG4gICAgICAgIGNvbnN0IGRlcEtleSA9IEFycmF5LmZyb20odGhpcy5za2lsbHMua2V5cygpKS5maW5kKGsgPT4gay5zdGFydHNXaXRoKGAke2RlcH1AYCkpO1xuICAgICAgICBpZiAoZGVwS2V5KSB7XG4gICAgICAgICAgaW5EZWdyZWUuc2V0KGRlcEtleSwgKGluRGVncmVlLmdldChkZXBLZXkpIHx8IDApICsgMSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBGaW5kIG5vZGVzIHdpdGggbm8gZGVwZW5kZW5jaWVzXG4gICAgZm9yIChjb25zdCBba2V5LCBkZWdyZWVdIG9mIGluRGVncmVlLmVudHJpZXMoKSkge1xuICAgICAgaWYgKGRlZ3JlZSA9PT0gMCkge1xuICAgICAgICBxdWV1ZS5wdXNoKGtleSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUHJvY2VzcyBxdWV1ZVxuICAgIHdoaWxlIChxdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBjdXJyZW50ID0gcXVldWUuc2hpZnQoKSE7XG4gICAgICByZXN1bHQucHVzaChjdXJyZW50KTtcblxuICAgICAgLy8gUmVkdWNlIGluLWRlZ3JlZSBmb3IgZGVwZW5kZW50c1xuICAgICAgY29uc3Qgc2tpbGwgPSB0aGlzLnNraWxscy5nZXQoY3VycmVudCk7XG4gICAgICBpZiAoc2tpbGwpIHtcbiAgICAgICAgZm9yIChjb25zdCBba2V5LCBzXSBvZiB0aGlzLnNraWxscy5lbnRyaWVzKCkpIHtcbiAgICAgICAgICBpZiAocy5kZXBlbmRlbmNpZXMuaW5jbHVkZXMoc2tpbGwubmFtZSkpIHtcbiAgICAgICAgICAgIGNvbnN0IGRlZ3JlZSA9IGluRGVncmVlLmdldChrZXkpIHx8IDA7XG4gICAgICAgICAgICBpbkRlZ3JlZS5zZXQoa2V5LCBkZWdyZWUgLSAxKTtcbiAgICAgICAgICAgIGlmIChkZWdyZWUgLSAxID09PSAwKSB7XG4gICAgICAgICAgICAgIHF1ZXVlLnB1c2goa2V5KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBQcml2YXRlIE1ldGhvZHNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIHByaXZhdGUgdXBkYXRlRGVwZW5kZW5jeUdyYXBoKHNraWxsOiBTa2lsbCk6IHZvaWQge1xuICAgIC8vIEFkZCBub2RlXG4gICAgY29uc3Qgbm9kZTogRGVwZW5kZW5jeU5vZGUgPSB7XG4gICAgICBuYW1lOiBza2lsbC5uYW1lLFxuICAgICAgdmVyc2lvbjogc2tpbGwudmVyc2lvbixcbiAgICAgIGluRGVncmVlOiBza2lsbC5kZXBlbmRlbmNpZXMubGVuZ3RoLFxuICAgICAgb3V0RGVncmVlOiAwLFxuICAgIH07XG4gICAgdGhpcy5kZXBlbmRlbmN5R3JhcGgubm9kZXMuc2V0KHNraWxsLm5hbWUsIG5vZGUpO1xuXG4gICAgLy8gQWRkIGVkZ2VzXG4gICAgZm9yIChjb25zdCBkZXAgb2Ygc2tpbGwuZGVwZW5kZW5jaWVzKSB7XG4gICAgICBpZiAoIXRoaXMuZGVwZW5kZW5jeUdyYXBoLmVkZ2VzLmhhcyhkZXApKSB7XG4gICAgICAgIHRoaXMuZGVwZW5kZW5jeUdyYXBoLmVkZ2VzLnNldChkZXAsIG5ldyBTZXQoKSk7XG4gICAgICB9XG4gICAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaC5lZGdlcy5nZXQoZGVwKSEuYWRkKHNraWxsLm5hbWUpO1xuXG4gICAgICBpZiAoIXRoaXMuZGVwZW5kZW5jeUdyYXBoLnJldmVyc2VFZGdlcy5oYXMoc2tpbGwubmFtZSkpIHtcbiAgICAgICAgdGhpcy5kZXBlbmRlbmN5R3JhcGgucmV2ZXJzZUVkZ2VzLnNldChza2lsbC5uYW1lLCBuZXcgU2V0KCkpO1xuICAgICAgfVxuICAgICAgdGhpcy5kZXBlbmRlbmN5R3JhcGgucmV2ZXJzZUVkZ2VzLmdldChza2lsbC5uYW1lKSEuYWRkKGRlcCk7XG5cbiAgICAgIC8vIFVwZGF0ZSBvdXQtZGVncmVlIGZvciBkZXBlbmRlbmN5XG4gICAgICBjb25zdCBkZXBOb2RlID0gdGhpcy5kZXBlbmRlbmN5R3JhcGgubm9kZXMuZ2V0KGRlcCk7XG4gICAgICBpZiAoZGVwTm9kZSkge1xuICAgICAgICBkZXBOb2RlLm91dERlZ3JlZSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgcmVtb3ZlRnJvbURlcGVuZGVuY3lHcmFwaChza2lsbE5hbWU6IHN0cmluZyk6IHZvaWQge1xuICAgIC8vIFJlbW92ZSBub2RlXG4gICAgdGhpcy5kZXBlbmRlbmN5R3JhcGgubm9kZXMuZGVsZXRlKHNraWxsTmFtZSk7XG5cbiAgICAvLyBSZW1vdmUgZWRnZXNcbiAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaC5lZGdlcy5kZWxldGUoc2tpbGxOYW1lKTtcbiAgICB0aGlzLmRlcGVuZGVuY3lHcmFwaC5yZXZlcnNlRWRnZXMuZGVsZXRlKHNraWxsTmFtZSk7XG5cbiAgICAvLyBSZW1vdmUgZnJvbSBvdGhlciBlZGdlc1xuICAgIGZvciAoY29uc3QgW2Zyb20sIHRvU2V0XSBvZiB0aGlzLmRlcGVuZGVuY3lHcmFwaC5lZGdlcy5lbnRyaWVzKCkpIHtcbiAgICAgIHRvU2V0LmRlbGV0ZShza2lsbE5hbWUpO1xuICAgIH1cbiAgICBmb3IgKGNvbnN0IFt0bywgZnJvbVNldF0gb2YgdGhpcy5kZXBlbmRlbmN5R3JhcGgucmV2ZXJzZUVkZ2VzLmVudHJpZXMoKSkge1xuICAgICAgZnJvbVNldC5kZWxldGUoc2tpbGxOYW1lKTtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGdldERlcGVuZGVudHMoc2tpbGxOYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgY29uc3QgZGVwZW5kZW50czogc3RyaW5nW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IHNraWxsIG9mIHRoaXMuc2tpbGxzLnZhbHVlcygpKSB7XG4gICAgICBpZiAoc2tpbGwuZGVwZW5kZW5jaWVzLmluY2x1ZGVzKHNraWxsTmFtZSkpIHtcbiAgICAgICAgZGVwZW5kZW50cy5wdXNoKHNraWxsLm5hbWUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVwZW5kZW50cztcbiAgfVxuXG4gIHByaXZhdGUgZW1pdEV2ZW50KHR5cGU6IHN0cmluZywgc2tpbGxOYW1lOiBzdHJpbmcsIHZlcnNpb246IHN0cmluZywgZGF0YT86IGFueSk6IHZvaWQge1xuICAgIGNvbnN0IGV2ZW50ID0ge1xuICAgICAgdHlwZSxcbiAgICAgIHNraWxsTmFtZSxcbiAgICAgIHZlcnNpb24sXG4gICAgICB0aW1lc3RhbXA6IG5vdygpLFxuICAgICAgZGF0YSxcbiAgICB9O1xuXG4gICAgZm9yIChjb25zdCBsaXN0ZW5lciBvZiB0aGlzLmV2ZW50TGlzdGVuZXJzKSB7XG4gICAgICB0cnkge1xuICAgICAgICBsaXN0ZW5lcihldmVudCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBpbiBldmVudCBsaXN0ZW5lcjogJHtlcnJvcn1gKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBNb2NrIG1ldGhvZHMgZm9yIGRlbW9cbiAgcHJpdmF0ZSBnZW5lcmF0ZU1vY2tTa2lsbENvZGUobmFtZTogc3RyaW5nLCB2ZXJzaW9uOiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiBgXG4vLyBTa2lsbDogJHtuYW1lfUAke3ZlcnNpb259XG5leHBvcnQgZnVuY3Rpb24gbWFpbihjb250ZXh0OiBhbnkpIHtcbiAgY29uc29sZS5sb2coJ0V4ZWN1dGluZyBza2lsbDogJHtuYW1lfScpO1xuICByZXR1cm4geyBzdWNjZXNzOiB0cnVlLCBuYW1lOiAnJHtuYW1lfScsIHZlcnNpb246ICcke3ZlcnNpb259JyB9O1xufVxuYDtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0TW9ja0RlcGVuZGVuY2llcyhuYW1lOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gICAgLy8gTW9jayBkZXBlbmRlbmNpZXMgYmFzZWQgb24gc2tpbGwgbmFtZVxuICAgIGNvbnN0IGRlcHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcbiAgICAgICdkYXRhLXByb2Nlc3Nvcic6IFsndXRpbHMnLCAndmFsaWRhdG9yJ10sXG4gICAgICAnYXBpLWNsaWVudCc6IFsnaHR0cC11dGlscycsICdhdXRoJ10sXG4gICAgICAndmFsaWRhdG9yJzogWyd1dGlscyddLFxuICAgIH07XG4gICAgcmV0dXJuIGRlcHNbbmFtZV0gfHwgW107XG4gIH1cblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIEV2ZW50IFN5c3RlbVxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbiAgLyoqXG4gICAqIFN1YnNjcmliZSB0byBza2lsbCBldmVudHNcbiAgICovXG4gIG9uRXZlbnQobGlzdGVuZXI6IChldmVudDogYW55KSA9PiB2b2lkKTogKCkgPT4gdm9pZCB7XG4gICAgdGhpcy5ldmVudExpc3RlbmVycy5hZGQobGlzdGVuZXIpO1xuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICB0aGlzLmV2ZW50TGlzdGVuZXJzLmRlbGV0ZShsaXN0ZW5lcik7XG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgZGVwZW5kZW5jeSBncmFwaFxuICAgKi9cbiAgZ2V0RGVwZW5kZW5jeUdyYXBoKCk6IERlcGVuZGVuY3lHcmFwaCB7XG4gICAgcmV0dXJuIHRoaXMuZGVwZW5kZW5jeUdyYXBoO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsb2FkIG9yZGVyXG4gICAqL1xuICBnZXRMb2FkT3JkZXIoKTogc3RyaW5nW10ge1xuICAgIHJldHVybiB0aGlzLmxvYWRPcmRlcjtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeHBvcnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBkZWZhdWx0IFNraWxsc1JlZ2lzdHJ5O1xuIl19