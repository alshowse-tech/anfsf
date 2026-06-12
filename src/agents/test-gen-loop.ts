/**
 * ANFSF Agent â€?TestGenLoop (GAP-03)
 *
 * "generate -> verify -> fix" loop for producing automated test scripts
 * (Playwright/Jest/Vitest) from requirement specs.
 * Extends AgentLoop<RequirementSpec, TestSuite, RunError>.
 *
 * Task: GAP-03
 */

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";
import { LLMClient, type LLMMessage } from "../integrations/llm-client";
import {
  AgentLoop,
  type AgentRoundTokenUsage,
  type AgentLoopConfig,
  type AgentLoopResult,
  DEFAULT_AGENT_CONFIG,
} from "./agent-loop-base";
import {
  type RequirementSpec,
} from "./code-generation-loop";

export { AgentLoop, AgentRoundTokenUsage, AgentLoopConfig, DEFAULT_AGENT_CONFIG } from "./agent-loop-base";
export type { AgentLoopResult } from "./agent-loop-base";
export type { RequirementSpec } from "./code-generation-loop";

// ============================================================================
// Types
// ============================================================================

export interface TestFile {
  path: string;
  content: string;
  source: "generated" | "modified";
  framework: "playwright" | "jest" | "vitest";
}

export interface TestSuite {
  files: TestFile[];
}

export interface RunError {
  file: string;
  line: number;
  message: string;
  type: "syntax" | "assertion" | "timeout" | "missing";
  severity: "error" | "warning";
}

// ============================================================================
// Constants
// ============================================================================

const FILE_DELIMITER = "===FILE:";
const FILE_END = "===END===";

// ============================================================================
// Prompt builders
// ============================================================================

function buildTestGenPrompt(spec: RequirementSpec): LLMMessage[] {
  const featureList = spec.features
    .map(f => "- " + f.name + " (" + f.priority + "): " + f.description)
    .join("\n");

  return [
    {
      role: "system",
      content:
        "You are a test script generator. Generate automated test files using Playwright, Jest, or Vitest.\n\n"
        + "OUTPUT FORMAT \u2014 use EXACTLY this delimiter format (NOT JSON):\n\n"
        + FILE_DELIMITER + " tests/example.spec.ts\n"
        + "import { test, expect } from '@playwright/test';\n"
        + "test.describe('...', () => { ... });\n"
        + FILE_END + "\n\n"
        + "Rules:\n"
        + "1. Every file MUST start with: " + FILE_DELIMITER + " <relative/path>\n"
        + "2. Every file MUST end with: " + FILE_END + "\n"
        + "3. Each test file MUST include '// [generated]' annotation at the top\n"
        + "4. Use describe/it/expect or test/expect patterns\n"
        + "5. Generate meaningful test cases covering edge cases and happy paths\n"
        + "6. Output ONLY the delimited files, no explanations",
    },
    {
      role: "user",
      content:
        "Requirement: " + spec.intent + "\n\nFeatures:\n" + featureList
        + "\n\nGenerate comprehensive test files for all features.",
    },
  ];
}

function buildTestFixPrompt(errors: RunError[], suite: TestSuite): LLMMessage[] {
  const errorFiles = new Set(errors.map(e => e.file).filter(f => f.length > 0));
  const relevantFiles = errorFiles.size > 0
    ? suite.files.filter(f => errorFiles.has(f.path) || errorFiles.has(f.path.replace(/\\/g, "/")))
    : suite.files;

  return [
    {
      role: "system",
      content:
        "You are fixing errors in generated test files.\n"
        + "Fix ONLY the listed errors. Use the EXACT same delimiter format.\n"
        + "Output ONLY the fixed files.",
    },
    {
      role: "user",
      content:
        "Errors to fix:\n"
        + errors.map(e => {
          const loc = e.file ? e.file + ":" + e.line : "unknown";
          return "- " + loc + " (" + e.type + "/" + e.severity + "): " + e.message;
        }).join("\n")
        + "\n\nCurrent test files:\n"
        + relevantFiles.map(f =>
          FILE_DELIMITER + " " + f.path + "\n" + f.content + "\n" + FILE_END
        ).join("\n\n")
        + "\n\nOutput the fixed test files using the delimiter format.",
    },
  ];
}

// ============================================================================
// TestGenLoop
// ============================================================================

export class TestGenLoop extends AgentLoop<RequirementSpec, TestSuite, RunError> {
  private llm: LLMClient;
  private config: AgentLoopConfig;

  get maxRetries(): number { return this.config.maxRetries; }

  constructor(
    llm: LLMClient,
    config: Partial<AgentLoopConfig> = {},
  ) {
    super();
    this.llm = llm;
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
  }

  // ================================================================
  // Abstract implementations
  // ================================================================

  async generate(spec: RequirementSpec): Promise<TestSuite> {
    const messages = buildTestGenPrompt(spec);
    const response = await this.llm.chat({
      messages,
      max_tokens: this.config.maxTokens,
      timeoutMs: this.config.llmTimeout,
    });

    if (!response.ok) {
      throw new Error("LLM test generation failed: " + (response.error || "Unknown error"));
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

    const suite = parseTestsFromResponse(response.content);
    if (suite.files.length === 0) {
      throw new Error(
        "LLM returned 0 parseable test files. Response length: " + response.content.length,
      );
    }

    return suite;
  }

  async verify(suite: TestSuite): Promise<RunError[]> {
    const errors: RunError[] = [];

    for (const file of suite.files) {
      // Phase 1: syntax check using TypeScript compiler
      const syntaxErrors = checkTestSyntax(file);
      errors.push(...syntaxErrors);
    }

    // Phase 2 placeholder: actual Playwright / npm test execution
    // TODO: Implement test runner execution once the CI environment is configured.
    // This will involve spawning the appropriate test command
    // (npx playwright test, npx jest, npx vitest) and parsing the results.

    return errors;
  }

  async fix(errors: RunError[], suite: TestSuite): Promise<TestSuite> {
    const fixMessages = buildTestFixPrompt(errors, suite);
    const fixResponse = await this.llm.chat({
      messages: fixMessages,
      max_tokens: this.config.maxTokens,
      timeoutMs: this.config.llmTimeout,
    });

    if (!fixResponse.ok) {
      throw new Error("LLM test fix failed: " + (fixResponse.error || "Unknown error"));
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

    const fixedFiles = parseTestsFromResponse(fixResponse.content);
    if (fixedFiles.files.length > 0) {
      return mergeFixedTestFiles(suite, fixedFiles.files);
    }

    console.error("[TestGenLoop] Fix round returned 0 files, keeping previous suite");
    return suite;
  }

  async writeOutput(suite: TestSuite): Promise<void> {
    if (!this.outputPath) {
      throw new Error("outputPath not set \u2014 cannot write output");
    }
    writeTestsToDisk(suite, this.outputPath);
  }
}

// ============================================================================
// Helper functions
// ============================================================================

function mergeFixedTestFiles(original: TestSuite, fixedFiles: TestFile[]): TestSuite {
  const fixMap = new Map(fixedFiles.map(f => [f.path.replace(/\\/g, "/"), f]));
  const merged = original.files.map(f => {
    const normalizedPath = f.path.replace(/\\/g, "/");
    return fixMap.get(normalizedPath) || f;
  });
  return { ...original, files: merged };
}

export function parseTestsFromResponse(content: string): TestSuite {
  const files: TestFile[] = [];
  const delimiterRegex = new RegExp(
    "\\" + FILE_DELIMITER.slice(0, 1) + FILE_DELIMITER.slice(1).replace(/[.*+?^()|[\]\\]/g, "\\$&")
    + "\\s*(.+?)\\s*\\n([\\s\\S]*?)\\" + FILE_END.slice(0, 1) + FILE_END.slice(1).replace(/[.*+?^()|[\]\\]/g, "\\$&"),
    "g",
  );
  let match: RegExpExecArray | null;
  while ((match = delimiterRegex.exec(content)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2].trim();
    if (filePath && fileContent) {
      files.push({
        path: filePath,
        content: fileContent,
        source: "generated",
        framework: detectFramework(filePath, fileContent),
      });
    }
  }

  if (files.length > 0) return { files };

  // Fallback: try JSON (strip markdown code fences first)
  try {
    let cleaned = content.trim();
    cleaned = cleaned.replace(/^```(?:json|javascript|typescript|ts)?\s*\n?/i, "");
    cleaned = cleaned.replace(/\n?```\s*$/i, "");
    const parsed = JSON.parse(cleaned);
    const jsonFiles = (parsed.files || []).map((f: any) => ({
      path: f.path,
      content: f.content,
      source: "generated" as const,
      framework: detectFramework(f.path, f.content),
    }));
    if (jsonFiles.length > 0) return { files: jsonFiles };
  } catch {
    // fall through
  }

  // Fallback: try file: headers
  const fileBlocks = content.split(/(?=^(?:\/\/|#)\s*(?:File|file):\s*)/m);
  for (const block of fileBlocks) {
    const headerMatch = block.match(/^(?:\/\/|#)\s*(?:File|file):\s*(.+)/);
    if (headerMatch) {
      const filePath = headerMatch[1].trim();
      const fileContent = block.slice(headerMatch[0].length).trim();
      files.push({
        path: filePath,
        content: fileContent,
        source: "generated",
        framework: detectFramework(filePath, fileContent),
      });
    }
  }

  return { files };
}

function detectFramework(filePath: string, content: string): "playwright" | "jest" | "vitest" {
  const normalizedPath = filePath.replace(/\\/g, "/");

  // Check content for framework-specific imports (strongest signal)
  if (content.includes("@playwright/test")) return "playwright";
  if (content.includes("from 'jest'") || content.includes("from \"jest\"")) return "jest";
  if (content.includes("from 'vitest'") || content.includes("from \"vitest\"")) return "vitest";

  // Fallback: infer from file path naming conventions
  if (normalizedPath.includes(".e2e.") || normalizedPath.includes(".e2e-spec.")) return "playwright";
  if (normalizedPath.includes(".spec.")) return "vitest";
  if (normalizedPath.includes(".test.")) return "jest";

  return "playwright";
}

function checkTestSyntax(file: TestFile): RunError[] {
  const errors: RunError[] = [];
  const sourceFile = ts.createSourceFile(file.path, file.content, ts.ScriptTarget.Latest, true);

  // parseDiagnostics exists at runtime but is not in TS 5.9.3's public type declarations
  const parseDiags = (sourceFile as any).parseDiagnostics as ts.Diagnostic[];
  for (const diag of parseDiags) {
    if (diag.messageText) {
      const line = diag.file
        ? diag.file.getLineAndCharacterOfPosition(diag.start ?? 0).line + 1
        : 0;
      const message = typeof diag.messageText === "string"
        ? diag.messageText
        : diag.messageText.messageText;
      errors.push({
        file: file.path,
        line,
        message: "Syntax error: " + message,
        type: "syntax",
        severity: "error",
      });
    }
  }

  return errors;
}

function writeTestsToDisk(suite: TestSuite, basePath: string): void {
  fs.mkdirSync(basePath, { recursive: true });
  for (const file of suite.files) {
    const filePath = path.join(basePath, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, "utf-8");
  }
}
