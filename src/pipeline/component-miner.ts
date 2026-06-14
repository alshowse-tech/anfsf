/**
 * ANFSF Pipeline — Component Miner (进化一: 前端组件沉淀)
 *
 * Extracts React/TSX component patterns from [modified] developer code.
 * Feeds into SkeletonGenerator for component-aware code generation.
 *
 * Flow:
 *   CodeAnnotator → [modified] file list
 *     → ComponentMiner.scan() → ComponentPattern[]
 *     → deduplicate + store → knowledge-base
 *     → SkeletonGenerator.generate() → querySimilar() → prompt injection
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// Types
// ============================================================================

export interface ComponentPattern {
  name: string;
  /** Props interface name + simplified signature (e.g. "{ name: string; age?: number }") */
  propsSignature: string;
  /** React hooks used (useState, useEffect, useCallback, custom hooks) */
  hooks: string[];
  /** External module imports (e.g. "react-router-dom", "axios") */
  dependencies: string[];
  /** Component file path relative to project root */
  filePath: string;
  /** Project type context */
  projectType: string;
  /** How many times this component has been seen (for dedup) */
  occurrenceCount: number;
  /** When this pattern was first seen */
  firstSeen: number;
  /** When last seen */
  lastSeen: number;
}

export interface ComponentPatternRecord {
  id: string;
  name: string;
  propsSignature: string;
  hooks: string[];
  dependencies: string[];
  projectType: string;
  occurrenceCount: number;
  firstSeen: number;
  lastSeen: number;
}

// ============================================================================
// Simple TSX Parser (regex-based, not full AST)
// ============================================================================

/** Regex to find React component declarations */
const COMPONENT_RE = /(?:export\s+)?(?:default\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*[=:]\s*(?:React\.)?memo\s*\(|const\s+(\w+)\s*[=:]\s*\([^)]*\)\s*=>)/g;

/** Regex to find props interface */
const PROPS_INTERFACE_RE = /interface\s+(\w+Props)\s*\{([^}]*)\}/g;

/** Regex to find React hooks */
const HOOK_RE = /(useState|useEffect|useCallback|useMemo|useRef|useContext|useReducer|useLayoutEffect|useImperativeHandle|useDebugValue)\s*\(/g;

/** Regex to find import statements */
const IMPORT_RE = /import\s+\{[^}]*\}\s*from\s+['"]([^'"]+)['"]/g;

// ============================================================================
// Component Miner
// ============================================================================

const DEFAULT_DB_PATH = path.join(process.cwd(), ".anfsf", "component-patterns.json");

export class ComponentMiner {
  private patterns: ComponentPatternRecord[] = [];
  private dbPath: string;
  private dirty = false;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || DEFAULT_DB_PATH;
    this.load();
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Scan a project directory for [modified] files and extract component patterns.
   * @param projectPath — root of the generated project
   * @param projectType — "web" | "h5" | "miniprogram"
   * @param modifiedFiles — list of [modified] file paths (relative to projectPath)
   */
  scan(projectPath: string, projectType: string, modifiedFiles: string[]): ComponentPattern[] {
    const discovered: ComponentPattern[] = [];

    for (const relFile of modifiedFiles) {
      const ext = path.extname(relFile).toLowerCase();
      if (![".tsx", ".jsx", ".ts", ".js"].includes(ext)) continue;
      // Skip non-component files
      if (relFile.includes("node_modules") || relFile.includes("__tests__")) continue;

      const fullPath = path.join(projectPath, relFile);
      if (!fs.existsSync(fullPath)) continue;

      const pattern = this.parseComponent(fullPath, relFile, projectType);
      if (pattern) discovered.push(pattern);
    }

    // Deduplicate and store
    for (const p of discovered) this.matchAndStore(p);

    return discovered;
  }

  /**
   * Get saved patterns matching a project type.
   */
  query(projectType?: string, limit = 5): ComponentPattern[] {
    let filtered = [...this.patterns];
    if (projectType) filtered = filtered.filter(p => p.projectType === projectType);
    filtered.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    return filtered.slice(0, limit).map(r => ({
      name: r.name, propsSignature: r.propsSignature,
      hooks: r.hooks, dependencies: r.dependencies,
      filePath: "", projectType: r.projectType,
      occurrenceCount: r.occurrenceCount,
      firstSeen: r.firstSeen, lastSeen: r.lastSeen,
    }));
  }

  /**
   * Generate a formatted injection string for the skeleton generator prompt.
   */
  getPromptInjection(projectType?: string, limit = 3): string {
    const items = this.query(projectType, limit);
    if (items.length === 0) return "";

    const lines: string[] = ["", "Reusable UI components from past projects:", ""];
    for (const c of items) {
      const deps = c.dependencies.length > 0 ? " (uses: " + c.dependencies.join(", ") + ")" : "";
      const hooks = c.hooks.length > 0 ? " [hooks: " + c.hooks.join(", ") + "]" : "";
      lines.push("- " + c.name + deps + hooks);
    }
    lines.push("");
    return lines.join("\n");
  }

  /** Total unique patterns stored */
  get totalPatterns(): number { return this.patterns.length; }

  /** Persist to disk */
  flush(): void { this.save(); this.dirty = false; }

  /** Clean up — call when shutting down */
  dispose(): void { this.save(); }

  // ========================================================================
  // Parsing
  // ========================================================================

  /**
   * Parse a single file to extract a component pattern.
   */
  parseComponent(fullPath: string, relPath: string, projectType: string): ComponentPattern | null {
    const content = fs.readFileSync(fullPath, "utf-8");
    if (!this.isComponentFile(content)) return null;

    const name = this.extractComponentName(content);
    if (!name) return null;

    const propsSig = this.extractPropsSignature(content);
    const hooks = [...new Set(this.extractHooks(content))];
    const deps = [...new Set(this.extractDependencies(content))];

    return {
      name,
      propsSignature: propsSig,
      hooks,
      dependencies: deps,
      filePath: relPath,
      projectType,
      occurrenceCount: 1,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
    };
  }

  private isComponentFile(content: string): boolean {
    // Heuristic: contains JSX or React import
    return content.includes("React") || /\breturn\s*\(?\s*</.test(content);
  }

  private extractComponentName(content: string): string | null {
    COMPONENT_RE.lastIndex = 0;
    const match = COMPONENT_RE.exec(content);
    if (match) return match[1] || match[2] || match[3] || null;

    // Fallback: look for named exports
    const exportMatch = content.match(/export\s+(?:default\s+)?(?:function|const)\s+(\w+)/);
    return exportMatch?.[1] || null;
  }

  private extractPropsSignature(content: string): string {
    // Look for Props interface
    PROPS_INTERFACE_RE.lastIndex = 0;
    const ifaceMatch = PROPS_INTERFACE_RE.exec(content);
    if (ifaceMatch) return ifaceMatch[1] + " { " + ifaceMatch[2].replace(/\s+/g, " ").trim() + " }";

    // Look for type Props
    const typeMatch = content.match(/type\s+(\w+Props)\s*=\s*\{([^}]*)\}/);
    if (typeMatch) return typeMatch[1] + " { " + typeMatch[2].replace(/\s+/g, " ").trim() + " }";

    return "{}";
  }

  private extractHooks(content: string): string[] {
    HOOK_RE.lastIndex = 0;
    const hooks: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = HOOK_RE.exec(content)) !== null) hooks.push(m[1]);
    return hooks;
  }

  private extractDependencies(content: string): string[] {
    IMPORT_RE.lastIndex = 0;
    const deps: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = IMPORT_RE.exec(content)) !== null) deps.push(m[1]);
    return deps;
  }

  // ========================================================================
  // Storage & Dedup
  // ========================================================================

  private matchAndStore(pattern: ComponentPattern): void {
    const existing = this.patterns.find(
      p => p.name === pattern.name && p.projectType === pattern.projectType
    );
    if (existing) {
      existing.occurrenceCount++;
      existing.lastSeen = Date.now();
      // Update props/hooks/deps if this is a richer version
      if (pattern.propsSignature.length > existing.propsSignature.length) existing.propsSignature = pattern.propsSignature;
      for (const h of pattern.hooks) if (!existing.hooks.includes(h)) existing.hooks.push(h);
      for (const d of pattern.dependencies) if (!existing.dependencies.includes(d)) existing.dependencies.push(d);
    } else {
      this.patterns.push({
        id: "cp_" + pattern.name + "_" + Date.now(),
        name: pattern.name,
        propsSignature: pattern.propsSignature,
        hooks: pattern.hooks,
        dependencies: pattern.dependencies,
        projectType: pattern.projectType,
        occurrenceCount: 1,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      });
    }
    this.dirty = true;
  }

  // ========================================================================
  // Persistence
  // ========================================================================

  private load(): void {
    try {
      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, "utf-8");
        this.patterns = JSON.parse(raw);
      }
    } catch { this.patterns = []; }
  }

  private save(): void {
    if (!this.dirty) return;
    try {
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.dbPath, JSON.stringify(this.patterns, null, 2), "utf-8");
      this.dirty = false;
    } catch (e) {
      console.error("[ComponentMiner] Save failed:", e);
    }
  }
}

// ============================================================================
// Singleton
// ============================================================================

let _defaultMiner: ComponentMiner | null = null;

export function getComponentMiner(dbPath?: string): ComponentMiner {
  if (!_defaultMiner) _defaultMiner = new ComponentMiner(dbPath);
  return _defaultMiner;
}

