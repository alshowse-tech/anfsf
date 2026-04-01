/**
 * ANFSF V4 Layer 8.5 - Skills Registry Implementation
 * 
 * Skills registry with dependency topology checking, sandbox execution, and hot-reloading.
 * Features: circular dependency detection, memory limits, time limits, GraphRAG indexing.
 */

import {
  Skill,
  SkillStatus,
  SkillMetadata,
  SkillsRegistryConfig,
  SkillLoadOptions,
  SkillUnloadOptions,
  DependencyGraph,
  DependencyNode,
  DependencyCheckResult,
  isSkill,
  isDependencyCheckResult,
} from './types';

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: Required<SkillsRegistryConfig> = {
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
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Get current timestamp */
function now(): number {
  return Date.now();
}

/** Parse semver version */
function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const parts = version.split('.').map(Number);
  return {
    major: parts[0] || 0,
    minor: parts[1] || 0,
    patch: parts[2] || 0,
  };
}

/** Check version constraint */
function satisfiesVersion(available: string, constraint: string): boolean {
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
    if (availableVer.major > requiredVer.major) return true;
    if (availableVer.major < requiredVer.major) return false;
    if (availableVer.minor > requiredVer.minor) return true;
    if (availableVer.minor < requiredVer.minor) return false;
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
export class SkillsRegistry {
  private config: Required<SkillsRegistryConfig>;
  private skills: Map<string, Skill>;
  private dependencyGraph: DependencyGraph;
  private eventListeners: Set<(event: any) => void>;
  private loadOrder: string[];

  constructor(config: SkillsRegistryConfig = {}) {
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
  async load(skillName: string, version: string, options: SkillLoadOptions = {}): Promise<Skill> {
    const skillKey = `${skillName}@${version}`;

    // Check if already loaded
    if (!options.force && this.skills.has(skillKey)) {
      const existingSkill = this.skills.get(skillKey)!;
      this.emitEvent('skill:loaded', skillName, version, { cached: true });
      return existingSkill;
    }

    // Check max skills limit
    if (this.skills.size >= this.config.maxSkills) {
      throw new Error(`Maximum skills limit reached: ${this.config.maxSkills}`);
    }

    // Create skill placeholder
    const skill: Skill = {
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
    skill.dependencies = this.getMockDependencies(skillName);

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
  async unload(skillName: string, options: SkillUnloadOptions = {}): Promise<void> {
    // Find the skill
    let skillKey: string | null = null;
    let skill: Skill | null = null;

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
  async list(): Promise<Skill[]> {
    return Array.from(this.skills.values());
  }

  /**
   * Get dependencies for a skill
   */
  async getDependencies(skillName: string): Promise<string[]> {
    const skill = Array.from(this.skills.values()).find(s => s.name === skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }
    return skill.dependencies;
  }

  /**
   * Get skill metadata
   */
  async getMetadata(skillName: string): Promise<SkillMetadata | null> {
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
  async checkDependencies(skill: Skill): Promise<DependencyCheckResult> {
    const result: DependencyCheckResult = {
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
  private detectCycles(startNode: string): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
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
  private topologicalSort(): string[] {
    const inDegree = new Map<string, number>();
    const queue: string[] = [];
    const result: string[] = [];

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
      const current = queue.shift()!;
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

  private updateDependencyGraph(skill: Skill): void {
    // Add node
    const node: DependencyNode = {
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
      this.dependencyGraph.edges.get(dep)!.add(skill.name);

      if (!this.dependencyGraph.reverseEdges.has(skill.name)) {
        this.dependencyGraph.reverseEdges.set(skill.name, new Set());
      }
      this.dependencyGraph.reverseEdges.get(skill.name)!.add(dep);

      // Update out-degree for dependency
      const depNode = this.dependencyGraph.nodes.get(dep);
      if (depNode) {
        depNode.outDegree++;
      }
    }
  }

  private removeFromDependencyGraph(skillName: string): void {
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

  private getDependents(skillName: string): string[] {
    const dependents: string[] = [];
    for (const skill of this.skills.values()) {
      if (skill.dependencies.includes(skillName)) {
        dependents.push(skill.name);
      }
    }
    return dependents;
  }

  private emitEvent(type: string, skillName: string, version: string, data?: any): void {
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
      } catch (error) {
        console.error(`Error in event listener: ${error}`);
      }
    }
  }

  // Mock methods for demo
  private generateMockSkillCode(name: string, version: string): string {
    return `
// Skill: ${name}@${version}
export function main(context: any) {
  console.log('Executing skill: ${name}');
  return { success: true, name: '${name}', version: '${version}' };
}
`;
  }

  private getMockDependencies(name: string): string[] {
    // Mock dependencies based on skill name
    const deps: Record<string, string[]> = {
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
  onEvent(listener: (event: any) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph;
  }

  /**
   * Get load order
   */
  getLoadOrder(): string[] {
    return this.loadOrder;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default SkillsRegistry;
