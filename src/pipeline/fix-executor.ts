 /**
  * ANFSF Pipeline — Fix Executor (GAP-06)
  *
  * Executes auto-fixes (L1) and generates diff suggestions (L2).
  * Separated from FixEngine (which classifies) to keep the matrix logic
  * pure and LLM-free.
  *
  * L1: reads file → calls LLM for fix → applies patch → commits
  * L2: reads file → calls LLM for diff → returns suggestion (no file change)
  */

 import * as fs from "fs";
 import * as path from "path";
 import { LLMClient, type LLMMessage } from "../integrations/llm-client";
 import { getCompileLearningDB, verificationErrorsToNormalized } from "./compile-learning-db";
 import type { FixRecord, ProblemType } from "./fix-engine";

 // ============================================================================
 // Types
 // ============================================================================

 export interface FixExecutionResult {
   success: boolean;
   record: FixRecord;
   /** The patch or diff text that was applied (L1) or suggested (L2) */
   patchText: string;
   /** Path to the file that was modified (L1) */
   modifiedFile?: string;
   /** Error message if execution failed */
   error?: string;
 }

 // ============================================================================
 // Prompt builders
 // ============================================================================

 /**
  * Build a prompt for L1 auto-fix.
  * Includes the file content around the error location and the error description.
  */
 function buildL1FixPrompt(
   filePath: string,
   fileContent: string,
   line: number,
   errorDescription: string,
   problemType: ProblemType,
 ): LLMMessage[] {
   // Extract context around the error line
   const lines = fileContent.split("\n");
   const contextStart = Math.max(0, line - 10);
   const contextEnd = Math.min(lines.length, line + 10);
   const context = lines.slice(contextStart, contextEnd)
     .map((l, i) => `  ${contextStart + i + 1}: ${l}`)
     .join("\n");

   return [
     {
       role: "system",
       content: "You are a precision code fixer. Fix ONLY the specific error shown below.\n"
         + "Do NOT add features, refactor, or change anything beyond the error.\n"
         + "Output ONLY the corrected file content, no explanations, no markdown fences.",
     },
     {
       role: "user",
       content: [
         `File: ${path.basename(filePath)}`,
         `Error type: ${problemType}`,
         `Error: ${errorDescription}`,
         `Error location: line ${line}`,
         "",
         "File content (context around the error):",
         context,
         "",
         "Output the ENTIRE corrected file content. Only change what is necessary to fix the error.",
       ].join("\n"),
     },
   ];
 }

 /**
  * Build a prompt for L2 fix suggestion (generates a diff, doesn't modify files).
  */
 function buildL2DiffPrompt(
   filePath: string,
   fileContent: string,
   line: number,
   errorDescription: string,
   problemType: ProblemType,
 ): LLMMessage[] {
   const errorLine = fileContent.split("\n")[line - 1] || "";

   return [
     {
       role: "system",
       content: "You generate unified diff patches for code fixes.\n"
         + "Output ONLY the diff, no explanations. Use standard unified diff format.\n"
         + "Only change what is necessary to fix the error.",
     },
     {
       role: "user",
       content: [
         `File: ${path.basename(filePath)}`,
         `Error type: ${problemType}`,
         `Error: ${errorDescription}`,
         `Error line (${line}): ${errorLine}`,
         "",
         "Generate a unified diff to fix this error.",
       ].join("\n"),
     },
   ];
 }

 // ============================================================================
 // Fix Executor
 // ============================================================================

 export class FixExecutor {
   private llm: LLMClient;
   private projectPath: string;

   constructor(llm: LLMClient, projectPath: string) {
     this.llm = llm;
     this.projectPath = projectPath;
   }

   /**
    * Execute an L1 auto-fix.
    * Reads the file, calls LLM, applies the fix, and writes back.
    */
   async executeL1(record: FixRecord): Promise<FixExecutionResult> {
     const filePath = path.join(this.projectPath, record.file);
     if (!fs.existsSync(filePath)) {
       return {
         success: false,
         record: { ...record, fixStatus: "pending" },
         patchText: "",
         error: `File not found: ${record.file}`,
       };
     }

     const fileContent = fs.readFileSync(filePath, "utf-8");
     const messages = buildL1FixPrompt(
       filePath, fileContent, record.line,
       record.issueDescription, record.problemType,
     );

     const response = await this.llm.chat({
       messages,
       max_tokens: 4096,
       timeoutMs: 60_000,
     });

     if (!response.ok) {
       return {
         success: false,
         record: { ...record, fixStatus: "pending" },
         patchText: "",
         error: `LLM fix call failed: ${response.error || "Unknown error"}`,
       };
     }

     const fixedContent = response.content.trim();
     if (fixedContent.length < 10) {
       return {
         success: false,
         record: { ...record, fixStatus: "pending" },
         patchText: "",
         error: "LLM returned empty or too-short fix",
       };
     }

     // Safety: reject partial-file writes (LLM may return only a snippet)
     const origMinLines = Math.max(1, fileContent.split("\n").length * 0.5);
     const fixedLines = fixedContent.split("\n").length;
     if (fixedLines < origMinLines) {
       return {
         success: false,
         record: { ...record, fixStatus: "pending" },
         patchText: "",
         error: `Incomplete fix: output ${fixedLines} lines vs expected ~${Math.round(origMinLines)} (50% threshold)`,
       };
     }

     // Write the fix
     fs.writeFileSync(filePath, fixedContent, "utf-8");

     // Record in compile learning DB (outcome unconfirmed — fix may still fail verification)
     try {
       const db = getCompileLearningDB();
       const normalized = verificationErrorsToNormalized(
         [{ message: record.issueDescription, file: record.file }],
         "web",
         1,
         "abandoned",  // conservative: not yet verified
       );
       db.recordErrors(normalized);
     } catch { /* non-blocking */ }

     return {
       success: true,
       record: {
         ...record,
         fixStatus: "auto_fixed",
         fixedBy: "system",
         fixedAt: Date.now(),
       },
       patchText: this.computePatch(fileContent, fixedContent, record),
       modifiedFile: record.file,
     };
   }

   /**
    * Execute an L2 suggestion (generates a diff, does NOT modify the file).
    */
   async executeL2(record: FixRecord): Promise<FixExecutionResult> {
     const filePath = path.join(this.projectPath, record.file);
     if (!fs.existsSync(filePath)) {
       return {
         success: false,
         record: { ...record, fixStatus: "pending" },
         patchText: "",
         error: `File not found: ${record.file}`,
       };
     }

     const fileContent = fs.readFileSync(filePath, "utf-8");
     const messages = buildL2DiffPrompt(
       filePath, fileContent, record.line,
       record.issueDescription, record.problemType,
     );

     const response = await this.llm.chat({
       messages,
       max_tokens: 4096,
       timeoutMs: 60_000,
     });

     if (!response.ok) {
       return {
         success: false,
         record: { ...record, fixStatus: "suggestion_ready" },
         patchText: "",
         error: `LLM diff call failed: ${response.error || "Unknown error"}`,
       };
     }

     return {
       success: true,
       record: {
         ...record,
         fixStatus: "suggestion_ready",
       },
       patchText: response.content.trim(),
     };
   }

   /**
    * Compute a simple unified-diff-like patch between original and fixed content.
    */
   private computePatch(original: string, fixed: string, record: FixRecord): string {
     const orig = original.split("\n");
     const fix = fixed.split("\n");

     if (orig.length === fix.length && orig.every((l, i) => l === fix[i])) {
       return ""; // No changes
     }

     const relPath = record.file.replace(/\\/g, "/");
     return [
       `--- a/${relPath}`,
       `+++ b/${relPath}`,
       `@@ -1,${orig.length} +1,${fix.length} @@`,
       ...fix.map((l, i) => {
         if (i < orig.length && l === orig[i]) return " " + l;
         return "+" + l;
       }),
     ].join("\n");
   }
 }

