 /**
  * ANFSF Pipeline — Compile Learning Database
  *
  * Accumulates compilation error patterns across projects.
  * Provides query methods for prompt injection into CodeGenLoop/DevFixLoop.
  *
  * Architecture:
  *   CodeGenLoop/DevFixLoop.verify()
  *       ↓ 记录错误模式
  *   CompileLearningDB.recordErrors()
  *       ↓ 跨项目聚合统计
  *   CompileLearningDB.getTopPatterns()
  *       ↓ 注入到 generate() 的 prompt
  *   buildSkeletonPrompt() / DevFixLoop
  *
  * 正常性: GAP-03, 进化二: 编译学习
  */
 
 import * as fs from "fs";
 import * as path from "path";
 
 // ============================================================================
 // Types
 // ============================================================================
 
 export interface NormalizedError {
   /** Normalized error code + message (e.g. "TS2322: Type X is not assignable to type Y") */
   pattern: string;
   /** Original error message before normalization */
   raw: string;
   /** File extension where the error occurred */
   fileExt: string;
   /** Project type context */
   projectType: string;
   /** Brief description of the fix applied */
   fixHint: string;
   /** Which agent loop round resolved it (0 = generation, 1+ = fix rounds) */
   resolvedAtRound: number;
   /** Whether the error was eventually fixed or abandoned */
   outcome: "fixed" | "abandoned";
 }
 
 export interface PatternStats {
   pattern: string;
   frequency: number;
   firstSeen: number;
   lastSeen: number;
   avgFixRound: number;
   commonFixHint: string;
   projectTypes: string[];
 }
 
 export interface CompiledRecord {
   id: string;
   pattern: string;
   raw: string;
   fileExt: string;
   projectType: string;
   fixHint: string;
   resolvedAtRound: number;
   outcome: "fixed" | "abandoned";
   timestamp: number;
 }
 
 // ============================================================================
 // Error Normalization
 // ============================================================================
 
 /** Normalization replacement pairs: first match wins */
 const NORMALIZATION_RULES: Array<{ regex: RegExp; replacement: string }> = [
   // Type arguments: "Type 'string[]'" -> "Type X"
   { regex: /'[^']*'/g, replacement: "X" },
   // Module paths: "./models/user" -> "X"
   { regex: /"[^"]*"/g, replacement: "X" },
   // Line/column numbers: ":42:10" -> ""
   { regex: /:\d+:\d+/g, replacement: "" },
   // TS error codes: "TS2322" -> keep as-is
   // Specific hashes and IDs
   { regex: /\b[a-f0-9]{8,}\b/g, replacement: "ID" },
 ];
 
 function normalizeError(message: string): string {
   let normalized = message.trim();
   for (const rule of NORMALIZATION_RULES) {
     normalized = normalized.replace(rule.regex, rule.replacement);
   }
   // Collapse multiple spaces
   normalized = normalized.replace(/\s+/g, " ").trim();
   return normalized;
 }
 
 /**
  * Extract a fix hint from a (raw error, outcome) pair.
  * These are heuristic; over time the DB learns better hints from actual fix rounds.
  */
 function inferFixHint(raw: string, resolvedAtRound: number): string {
   const lower = raw.toLowerCase();
   if (lower.includes("cannot find module") || lower.includes("cannot find name")) {
     return "Check import or install missing dependency";
   }
   if (lower.includes("not assignable")) {
     return "Adjust type signature or add type cast";
   }
   if (lower.includes("does not exist on type")) {
     return "Add the missing property to the interface definition";
   }
   if (lower.includes("has no initializer")) {
     return "Add initializer or make the property optional with '?'";
   }
   if (lower.includes("unused")) {
     return "Remove the unused variable or use it";
   }
   if (lower.includes("cannot be used as a jsx component")) {
     return "Ensure the component returns JSX.Element and has correct typing";
   }
   if (lower.includes("expected") && lower.includes("arguments")) {
     return "Check function signature and call-site parameter count";
   }
   if (resolvedAtRound <= 1) {
     return "Simple fix — check type annotations";
   }
   return "Review code around the error location";
 }
 
 // ============================================================================
 // Compile Learning Database
 // ============================================================================
 
 const DEFAULT_DB_PATH = path.join(process.cwd(), ".anfsf", "compile-learning.json");
 
 export class CompileLearningDB {
   private records: CompiledRecord[] = [];
   private dbPath: string;
   private dirty = false;
   private saveTimer: ReturnType<typeof setInterval> | null = null;
 
   constructor(dbPath?: string) {
     this.dbPath = dbPath || DEFAULT_DB_PATH;
     this.load();
     // Auto-save every 30 seconds if dirty
     this.saveTimer = setInterval(() => this.saveIfDirty(), 30_000);
   }
 
   // ========================================================================
   // Public API
   // ========================================================================
 
   /**
    * Record one or more normalized errors after a verification round.
    */
   recordErrors(errors: NormalizedError[]): void {
     for (const err of errors) {
       this.records.push({
         id: `err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
         pattern: err.pattern,
         raw: err.raw,
         fileExt: err.fileExt,
         projectType: err.projectType,
         fixHint: err.fixHint,
         resolvedAtRound: err.resolvedAtRound,
         outcome: err.outcome,
         timestamp: Date.now(),
       });
     }
     this.dirty = true;
   }
 
   /**
    * Get the most frequent error patterns, grouped by project type.
    * Frequency threshold filters out noise (patterns seen fewer than N times).
    */
  getTopPatterns(
    projectType?: string,
    options: { minFrequency?: number; limit?: number } = {},
  ): PatternStats[] {
    const minFreq = options.minFrequency ?? 1;
    const limit = options.limit ?? 5;
 
     // Group by pattern
     const groupMap = new Map<string, CompiledRecord[]>();
     for (const r of this.records) {
       if (projectType && r.projectType !== projectType) continue;
       const existing = groupMap.get(r.pattern);
       if (existing) existing.push(r);
       else groupMap.set(r.pattern, [r]);
     }
 
     // Compute stats per pattern
     const stats: PatternStats[] = [];
     for (const [pattern, group] of groupMap) {
       if (group.length < minFreq) continue;
 
       const fixedRounds = group
         .filter(r => r.outcome === "fixed")
         .map(r => r.resolvedAtRound);
       const avgRound =
         fixedRounds.length > 0
           ? fixedRounds.reduce((a, b) => a + b, 0) / fixedRounds.length
           : 0;
 
       // Most common fix hint
       const hintCounts = new Map<string, number>();
       for (const r of group) {
         hintCounts.set(r.fixHint, (hintCounts.get(r.fixHint) || 0) + 1);
       }
       let commonFixHint = "";
       let maxCount = 0;
       for (const [hint, count] of hintCounts) {
         if (count > maxCount) { commonFixHint = hint; maxCount = count; }
       }
 
       const projectTypes = [...new Set(group.map(r => r.projectType))];
 
       stats.push({
         pattern,
         frequency: group.length,
         firstSeen: Math.min(...group.map(r => r.timestamp)),
         lastSeen: Math.max(...group.map(r => r.timestamp)),
         avgFixRound: avgRound,
         commonFixHint,
         projectTypes,
       });
     }
 
     // Sort by frequency descending, take top N
     stats.sort((a, b) => b.frequency - a.frequency);
     return stats.slice(0, limit);
   }
 
   /**
   * Generate a formatted prompt injection string.
   * Ready to be prepended to any generate() prompt.
   */
  getPromptInjection(projectType?: string, limit?: number): string {
    const patterns = this.getTopPatterns(projectType, { minFrequency: 2, limit: limit ?? 5 });
     if (patterns.length === 0) return "";
 
     const lines: string[] = [
       "",
       "Learn from past compilation errors in similar projects:",
       "",
     ];
     for (const p of patterns) {
       lines.push(
         `- ${p.pattern}` +
         (p.commonFixHint ? ` → ${p.commonFixHint}` : ""),
       );
     }
     lines.push("");
     return lines.join("\n");
   }
 
   /**
    * Generate a Markdown summary of all recorded patterns.
    * Useful for developer workspace and debugging.
    */
   getSummary(projectType?: string): string {
     const patterns = this.getTopPatterns(projectType, {
       minFrequency: 1,
       limit: 20,
     });
     if (patterns.length === 0) return "No compilation data recorded yet.";
 
     const lines: string[] = [
       "## Compile Learning Summary",
       "",
       `| Pattern | Freq | Avg Fix Round | First Seen | Common Fix |`,
       `|---------|------|--------------|------------|------------|`,
     ];
     for (const p of patterns) {
       lines.push(
         `| ${p.pattern.slice(0, 60)}... | ${p.frequency} | ${p.avgFixRound.toFixed(1)} | ${new Date(p.firstSeen).toLocaleDateString()} | ${p.commonFixHint} |`,
       );
     }
     return lines.join("\n");
   }
 
   /**
    * Total number of recorded error events.
    */
   get totalRecords(): number {
     return this.records.length;
   }
 
   /**
    * Number of unique patterns observed.
    */
   get uniquePatterns(): number {
     return new Set(this.records.map(r => r.pattern)).size;
   }
 
   /**
    * Clean up old records (older than N days).
    */
   pruneOlderThan(days: number): number {
     const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
     const before = this.records.length;
     this.records = this.records.filter(r => r.timestamp >= cutoff);
     const pruned = before - this.records.length;
     if (pruned > 0) this.dirty = true;
     return pruned;
   }
 
   /**
    * Persist to disk immediately.
    */
   flush(): void {
     this.save();
   }
 
   /**
    * Stop the auto-save timer and persist.
    */
   dispose(): void {
     if (this.saveTimer) {
       clearInterval(this.saveTimer);
       this.saveTimer = null;
     }
     this.save();
   }
 
   // ========================================================================
   // Persistence
   // ========================================================================
 
   private load(): void {
     try {
       if (fs.existsSync(this.dbPath)) {
         const raw = fs.readFileSync(this.dbPath, "utf-8");
         const data = JSON.parse(raw);
         this.records = Array.isArray(data) ? data : [];
       }
     } catch {
       console.warn("[CompileLearningDB] Failed to load:", this.dbPath);
       this.records = [];
     }
   }
 
   private save(): void {
     if (!this.dirty) return;
     try {
       const dir = path.dirname(this.dbPath);
       if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
       fs.writeFileSync(this.dbPath, JSON.stringify(this.records, null, 2), "utf-8");
       this.dirty = false;
     } catch (error) {
       console.error("[CompileLearningDB] Failed to save:", error);
     }
   }
 
   private saveIfDirty(): void {
     if (this.dirty) this.save();
   }
 }
 
 // ============================================================================
 // Convenience: convert VerificationError[] to NormalizedError[]
 // ============================================================================
 
 /**
  * Convert from VerificationError[] (from VerificationRunner) to NormalizedError[].
  * This is the bridge between the verification layer and the learning DB.
  */
 export function verificationErrorsToNormalized(
   errors: Array<{ message: string; file: string; rule?: string }>,
   projectType: string,
   resolvedAtRound: number,
   outcome: "fixed" | "abandoned",
 ): NormalizedError[] {
   return errors.map(err => {
     const raw = err.message;
     const pattern = normalizeError(raw);
     const fileExt = path.extname(err.file) || ".ts";
     return {
       pattern,
       raw,
       fileExt,
       projectType,
       fixHint: inferFixHint(raw, resolvedAtRound),
       resolvedAtRound,
       outcome,
     };
   });
 }
 
 // ============================================================================
 // Singleton
 // ============================================================================
 
 let defaultInstance: CompileLearningDB | null = null;
 
 /**
  * Get or create the default singleton instance.
  * All modules that share the same process boundary should use this.
  */
 export function getCompileLearningDB(dbPath?: string): CompileLearningDB {
   if (!defaultInstance) {
     defaultInstance = new CompileLearningDB(dbPath);
   }
   return defaultInstance;
 }
