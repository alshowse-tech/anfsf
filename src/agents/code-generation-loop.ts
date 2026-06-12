/**
 * ANFSF Agent — Code Generation Loop
 *
 * "generate -> verify -> fix" loop for producing verified skeleton code.
 * Extends AgentLoop<RequirementSpec, GeneratedCode, VerificationError>.
 *
 * Task: T-002, refactored GAP-01
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { LLMClient, type LLMMessage } from "../integrations/llm-client";
import { getCompileLearningDB, verificationErrorsToNormalized } from "../pipeline/compile-learning-db";
import {
  AgentLoop,
  type AgentRoundTokenUsage,
  type AgentLoopConfig,
  type AgentLoopResult,
  DEFAULT_AGENT_CONFIG,
} from "./agent-loop-base";
import { VerificationRunner, type VerificationResult, type VerificationError } from "./verification-runner";

export { AgentLoop, AgentRoundTokenUsage, AgentLoopConfig, DEFAULT_AGENT_CONFIG } from "./agent-loop-base";
export type { AgentLoopResult } from "./agent-loop-base";
export type { VerificationError } from "./verification-runner";

export interface RequirementSpec {
  intent: string;
  features: Array<{
    id: string;
    name: string;
    description: string;
    priority: string;
  }>;
  architecture?: Record<string, unknown>;
  deploymentForm?: "web" | "h5" | "miniprogram";
  context?: Record<string, unknown>;
}

export interface GeneratedFile {
  path: string;
  content: string;
  source: "generated" | "modified" | "new";
}

export interface GeneratedCode {
  files: GeneratedFile[];
  contracts?: {
    openapi?: object;
    dbSchema?: object;
  };
}

export type LegacyCodeGenResult = {
  success: boolean;
  code: GeneratedCode;
  rounds: number;
  errors: VerificationError[];
  tokenUsage: AgentRoundTokenUsage[];
  message: string;
};

const FILE_DELIMITER = "===FILE:";
const FILE_END = "===END===";
function buildSkeletonPrompt(spec: RequirementSpec, historyInjection?: string): LLMMessage[] {
  const featureList = spec.features
    .map(f => "- " + f.name + " (" + f.priority + "): " + f.description)
    .join("\n");
  return [
    {
      role: "system",
      content: "You are a project skeleton generator. Generate a minimal, compilable TypeScript project.\n\n"
        + "OUTPUT FORMAT — use EXACTLY this delimiter format (NOT JSON):\n\n"
        + FILE_DELIMITER + " package.json\n{ \"name\": \"...\", \"dependencies\": {...} }\n"
        + FILE_END + "\n\n"
        + (historyInjection || "")
        + "Rules:\n1. Every file MUST start with: " + FILE_DELIMITER + " <relative/path>\n"
        + "2. Every file MUST end with: " + FILE_END + "\n"
        + "3. All .ts files MUST be valid TypeScript with strict mode\n"
        + "4. Output ONLY the delimited files, no explanations",
    },
    { role: "user", content: "Project: " + spec.intent + "\n\nFeatures:\n" + featureList
      + "\n\nGenerate the full project skeleton." },
  ];
}

function buildFixPrompt(errors: VerificationError[], currentFiles: GeneratedFile[]): LLMMessage[] {
  const errorFiles = new Set(errors.map(e => e.file).filter(f => f.length > 0));
  const relevantFiles = errorFiles.size > 0
    ? currentFiles.filter(f => errorFiles.has(f.path) || errorFiles.has(f.path.replace(/\\/g, "/")))
    : currentFiles;
  return [
    { role: "system", content: "You are fixing compilation errors.\n"
      + "Fix ONLY the listed errors. Use the EXACT same delimiter format.\n"
      + "Output ONLY the fixed files." },
    { role: "user", content: "Errors to fix:\n" + errors.map(e => {
      const loc = e.file ? e.file + ":" + e.line + ":" + e.column : "unknown";
      return "- " + loc + ": " + e.message;
    }).join("\n") + "\n\nCurrent files:\n" + relevantFiles.map(f =>
      FILE_DELIMITER + " " + f.path + "\n" + f.content + "\n" + FILE_END).join("\n\n")
      + "\n\nOutput the fixed files using the delimiter format." },
  ];
}
export class CodeGenerationLoop extends AgentLoop<RequirementSpec, GeneratedCode, VerificationError> {
  private llm: LLMClient;
  private verifier: VerificationRunner;
  private config: AgentLoopConfig;
  private currentProjectType: string = "web";

  get maxRetries(): number { return this.config.maxRetries; }

  constructor(
    llm: LLMClient,
    config: Partial<AgentLoopConfig> = {},
  ) {
    super();
    this.llm = llm;
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.verifier = new VerificationRunner();
  }

  // ================================================================
  // Abstract implementations
  // ================================================================

  async generate(spec: RequirementSpec): Promise<GeneratedCode> {
    this.currentProjectType = spec.deploymentForm || "web";
    const db = getCompileLearningDB();
    const history = db.getPromptInjection(this.currentProjectType);
    const messages = buildSkeletonPrompt(spec, history);
    const response = await this.llm.chat({
      messages,
      max_tokens: this.config.maxTokens,
      timeoutMs: this.config.llmTimeout,
    });
    if (!response.ok) {
      throw new Error("LLM generation failed: " + (response.error || "Unknown error"));
    }
    // Record token usage for AgentLoop tracking
    if (response.usage) {
      this.roundTokenUsages.push({
        round: 0,
        promptTokens: response.usage.prompt_tokens || 0,
        completionTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      });
    }
    const code = parseCodeFromResponse(response.content);
    if (code.files.length === 0) {
      throw new Error("LLM returned 0 parseable files. Response length: " + response.content.length);
    }
    return code;
  }

  async verify(code: GeneratedCode): Promise<VerificationError[]> {
    if (!this.outputPath) throw new Error("outputPath not set — cannot verify");
    await installDependencies(this.outputPath);
    const results = await this.verifier.runAll(this.outputPath);
    const errors = collectErrors(results);
    if (errors.length > 0) {
      const db = getCompileLearningDB();
      const normalized = verificationErrorsToNormalized(
        errors.map(e => ({ message: e.message, file: e.file, rule: e.rule })),
        this.currentProjectType,
        0,
        "fixed",
      );
      db.recordErrors(normalized);
    }
    return errors;
  }

  async fix(errors: VerificationError[], code: GeneratedCode): Promise<GeneratedCode> {
    const fixMessages = buildFixPrompt(errors, code.files);
    const fixResponse = await this.llm.chat({
      messages: fixMessages,
      max_tokens: this.config.maxTokens,
      timeoutMs: this.config.llmTimeout,
    });
    if (!fixResponse.ok) {
      throw new Error("LLM fix failed: " + (fixResponse.error || "Unknown error"));
    }
    // Record token usage for fix round
    if (fixResponse.usage) {
      this.roundTokenUsages.push({
        round: this.roundTokenUsages.length,
        promptTokens: fixResponse.usage.prompt_tokens || 0,
        completionTokens: fixResponse.usage.completion_tokens || 0,
        totalTokens: fixResponse.usage.total_tokens || 0,
      });
    }
    const fixedFiles = parseCodeFromResponse(fixResponse.content);
    if (fixedFiles.files.length > 0) {
      return mergeFixedFiles(code, fixedFiles.files);
    }
    console.error("[AgentLoop] Fix round returned 0 files, keeping previous code");
    return code;
  }

  async writeOutput(code: GeneratedCode): Promise<void> {
    if (!this.outputPath) {
      throw new Error("outputPath not set — cannot write output");
    }
    writeCodeToDisk(code, this.outputPath);
  }

  // ================================================================
  // Legacy backward-compatible API
  // ================================================================

  async generateOld(spec: RequirementSpec, outputPath: string): Promise<LegacyCodeGenResult> {
    const result = await this.run(spec, outputPath);
    return {
      ...result,
      code: result.output ?? { files: [], contracts: {} },
    };
  }
}
// ================================================================
// Helper functions
// ================================================================

function mergeFixedFiles(original: GeneratedCode, fixedFiles: GeneratedFile[]): GeneratedCode {
  const fixMap = new Map(fixedFiles.map(f => [f.path.replace(/\\/g, "/"), f]));
  const merged = original.files.map(f => {
    const normalizedPath = f.path.replace(/\\/g, "/");
    return fixMap.get(normalizedPath) || f;
  });
  return { ...original, files: merged };
}

export function parseCodeFromResponse(content: string): GeneratedCode {
  const files: GeneratedFile[] = [];
  const delimiterRegex = new RegExp(
    "\\" + FILE_DELIMITER.slice(0, 1) + FILE_DELIMITER.slice(1).replace(/[.*+?^()|[\]\\]/g, "\\$&")
    + "\\s*(.+?)\\s*\\n([\\s\\S]*?)\\" + FILE_END.slice(0, 1) + FILE_END.slice(1).replace(/[.*+?^()|[\]\\]/g, "\\$&"),
    "g");
  let match: RegExpExecArray | null;
  while ((match = delimiterRegex.exec(content)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2].trim();
    if (filePath && fileContent) files.push({ path: filePath, content: fileContent, source: "generated" });
  }
  if (files.length > 0) return { files };
  // Fallback: try JSON (strip markdown code fences first)
  try {
    let cleaned = content.trim();
    // Strip leading/trailing markdown code fences: ```json ... ``` or ``` ... ```
    cleaned = cleaned.replace(/^```(?:json|javascript|typescript|ts)?\s*\n?/i, "");
    cleaned = cleaned.replace(/\n?```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    const jsonFiles = (parsed.files || []).map((f: any) => ({ path: f.path, content: f.content, source: "generated" as const }));
    if (jsonFiles.length > 0) return { files: jsonFiles, contracts: parsed.contracts };
  } catch { /* fall through */ }
  // Fallback: try file: headers
  const fileBlocks = content.split(/(?=^(?:\/\/|#)\s*(?:File|file):\s*)/m);
  for (const block of fileBlocks) {
    const headerMatch = block.match(/^(?:\/\/|#)\s*(?:File|file):\s*(.+)/);
    if (headerMatch) files.push({ path: headerMatch[1].trim(), content: block.slice(headerMatch[0].length).trim(), source: "generated" });
  }
  return { files };
}

function writeCodeToDisk(code: GeneratedCode, basePath: string): void {
  fs.mkdirSync(basePath, { recursive: true });
  for (const file of code.files) {
    const filePath = path.join(basePath, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, "utf-8");
  }
}

async function installDependencies(outputPath: string): Promise<void> {
  const dirs = [outputPath];
  const entries = fs.readdirSync(outputPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPkg = path.join(outputPath, entry.name, "package.json");
      if (fs.existsSync(subPkg)) dirs.push(path.join(outputPath, entry.name));
    }
  }
  for (const dir of dirs) {
    const pkgPath = path.join(dir, "package.json");
    if (!fs.existsSync(pkgPath)) continue;
    console.log("[AgentLoop] Running npm install in", dir);
    await new Promise<void>((resolve) => {
      const child = spawn("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], {
        cwd: dir, timeout: 120_000, stdio: ["ignore", "pipe", "pipe"], shell: true,
      });
      child.stderr?.on("data", () => {});
      child.on("close", () => resolve());
      child.on("error", () => resolve());
    });
  }
}

function collectErrors(results: VerificationResult[]): VerificationError[] {
  const errors: VerificationError[] = [];
  for (const r of results) errors.push(...r.errors);
  return errors;
}
