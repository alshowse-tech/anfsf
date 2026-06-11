/**
 * ANFSF Agent — Code Generation Loop
 *
 * "generate → verify → fix" loop for producing verified skeleton code.
 * Uses delimiter-based output format (not JSON) for reliability.
 *
 * Task: T-002
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { LLMClient, type LLMMessage } from '../integrations/llm-client';
import { VerificationRunner, type VerificationResult, type VerificationError } from './verification-runner';

export interface RequirementSpec {
  intent: string;
  features: Array<{
    id: string;
    name: string;
    description: string;
    priority: string;
  }>;
  architecture?: Record<string, unknown>;
  deploymentForm?: 'web' | 'h5' | 'miniprogram';
  context?: Record<string, unknown>;
}

export interface GeneratedFile {
  path: string;
  content: string;
  source: 'generated' | 'modified' | 'new';
}

export interface GeneratedCode {
  files: GeneratedFile[];
  contracts?: {
    openapi?: object;
    dbSchema?: object;
  };
}

export interface AgentRoundTokenUsage {
  round: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentLoopConfig {
  maxRetries: number;
  verificationTools: string[];
  llmTimeout: number;
  maxTokens: number;
}

export interface AgentLoopResult {
  success: boolean;
  code: GeneratedCode;
  rounds: number;
  errors: VerificationError[];
  tokenUsage: AgentRoundTokenUsage[];
  message: string;
}

export const DEFAULT_AGENT_CONFIG: AgentLoopConfig = {
  maxRetries: 2,
  verificationTools: ['tsc-compile'],
  llmTimeout: 180_000,
  maxTokens: 32_768,
};

const FILE_DELIMITER = '===FILE:';
const FILE_END = '===END===';

function buildSkeletonPrompt(spec: RequirementSpec): LLMMessage[] {
  const featureList = spec.features
    .map(f => `- ${f.name} (${f.priority}): ${f.description}`)
    .join('\n');

  return [
    {
      role: 'system',
      content: `You are a project skeleton generator. Generate a minimal, compilable TypeScript project.

OUTPUT FORMAT — use EXACTLY this delimiter format (NOT JSON):

${FILE_DELIMITER} package.json
{ "name": "...", "dependencies": {...}, "devDependencies": {...} }
${FILE_END}

${FILE_DELIMITER} tsconfig.json
{ "compilerOptions": {...} }
${FILE_END}

${FILE_DELIMITER} src/index.ts
// [generated]
import ...
${FILE_END}

Rules:
1. Every file MUST start with a line: ${FILE_DELIMITER} <relative/path>
2. Every file MUST end with a line: ${FILE_END}
3. All .ts files MUST be valid TypeScript that compiles with strict mode
4. Use Express for backend, React for frontend
5. Stub business logic with "// TODO: implement" comments
6. Include package.json and tsconfig.json for BOTH backend and frontend
7. Do NOT import modules that you haven't created
8. Keep it minimal — only essential files to make the project compile
9. Output ONLY the delimited files, no explanations before or after`,
    },
    {
      role: 'user',
      content: `Project: ${spec.intent}\n\nFeatures:\n${featureList}\n\nGenerate the full project skeleton using the delimiter format.`,
    },
  ];
}

function buildFixPrompt(errors: VerificationError[], currentFiles: GeneratedFile[]): LLMMessage[] {
  const errorFiles = new Set(errors.map(e => e.file).filter(f => f.length > 0));

  const relevantFiles = errorFiles.size > 0
    ? currentFiles.filter(f => errorFiles.has(f.path) || errorFiles.has(f.path.replace(/\\/g, '/')))
    : currentFiles;

  const errorList = errors
    .map(e => {
      const loc = e.file ? `${e.file}:${e.line}:${e.column}` : 'unknown';
      return `- ${loc}: ${e.message}`;
    })
    .join('\n');

  const fileBlocks = relevantFiles
    .map(f => `${FILE_DELIMITER} ${f.path}\n${f.content}\n${FILE_END}`)
    .join('\n\n');

  return [
    {
      role: 'system',
      content: `You are fixing compilation errors in generated project code.
Fix ONLY the errors listed below. Do NOT add new features.
Use the EXACT same delimiter format: start each file with ${FILE_DELIMITER} <path> and end with ${FILE_END}.
Output ONLY the fixed files that have errors, not all files.`,
    },
    {
      role: 'user',
      content: `Errors to fix:\n${errorList}\n\nCurrent files with errors:\n${fileBlocks}\n\nOutput the fixed files using the delimiter format.`,
    },
  ];
}

export class CodeGenerationLoop {
  private llm: LLMClient;
  private verifier: VerificationRunner;
  private config: AgentLoopConfig;

  constructor(
    llm: LLMClient,
    config: Partial<AgentLoopConfig> = {},
  ) {
    this.llm = llm;
    this.config = { ...DEFAULT_AGENT_CONFIG, ...config };
    this.verifier = new VerificationRunner();
  }

  async generate(
    spec: RequirementSpec,
    outputPath: string,
  ): Promise<AgentLoopResult> {
    const tokenUsage: AgentRoundTokenUsage[] = [];
    let currentCode: GeneratedCode | null = null;
    let currentErrors: VerificationError[] = [];
    let round = 0;

    const messages = buildSkeletonPrompt(spec);
    const response = await this.llm.chat({
      messages,
      max_tokens: this.config.maxTokens,
      timeoutMs: this.config.llmTimeout,
    });

    if (!response.ok) {
      return {
        success: false,
        code: { files: [] },
        rounds: 0,
        errors: [],
        tokenUsage,
        message: `LLM generation failed: ${response.error || 'Unknown error'}`,
      };
    }

    tokenUsage.push({
      round: 0,
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    });

    currentCode = parseCodeFromResponse(response.content);
    console.log(`[AgentLoop] Round 1: parsed ${currentCode.files.length} files from LLM response (${response.content.length} chars)`);

    if (currentCode.files.length === 0) {
      console.error(`[AgentLoop] LLM returned 0 files. Response preview:\n${response.content.slice(0, 500)}`);
      return {
        success: false,
        code: { files: [] },
        rounds: 1,
        errors: [],
        tokenUsage,
        message: `LLM returned 0 parseable files. Response length: ${response.content.length} chars. Check logs for response preview.`,
      };
    }

    writeCodeToDisk(currentCode, outputPath);
    round = 1;

    await installDependencies(outputPath);

    while (round <= this.config.maxRetries + 1) {
      const results = await this.verifier.runAll(outputPath);
      currentErrors = collectErrors(results);

      console.log(`[AgentLoop] Round ${round}: ${currentErrors.length} error(s) found`);

      if (currentErrors.length === 0) {
        return {
          success: true,
          code: currentCode!,
          rounds: round,
          errors: [],
          tokenUsage,
          message: `All verification checks passed in ${round} round(s).`,
        };
      }

      if (round > this.config.maxRetries) {
        return {
          success: false,
          code: currentCode!,
          rounds: round,
          errors: currentErrors,
          tokenUsage,
          message: `Still ${currentErrors.length} error(s) after ${this.config.maxRetries} fix round(s).`,
        };
      }

      const fixMessages = buildFixPrompt(currentErrors, currentCode!.files);
      const fixResponse = await this.llm.chat({
        messages: fixMessages,
        max_tokens: this.config.maxTokens,
        timeoutMs: this.config.llmTimeout,
      });

      if (!fixResponse.ok) {
        return {
          success: false,
          code: currentCode!,
          rounds: round,
          errors: currentErrors,
          tokenUsage,
          message: `Fix attempt failed: ${fixResponse.error || 'Unknown error'}`,
        };
      }

      tokenUsage.push({
        round,
        promptTokens: fixResponse.usage.prompt_tokens,
        completionTokens: fixResponse.usage.completion_tokens,
        totalTokens: fixResponse.usage.total_tokens,
      });

      const fixedFiles = parseCodeFromResponse(fixResponse.content);
      console.log(`[AgentLoop] Fix round ${round}: parsed ${fixedFiles.files.length} fixed files`);

      if (fixedFiles.files.length > 0) {
        currentCode = mergeFixedFiles(currentCode!, fixedFiles.files);
        writeCodeToDisk(currentCode, outputPath);
      } else {
        console.error(`[AgentLoop] Fix round ${round}: LLM returned 0 files, keeping previous code`);
      }

      round++;
    }

    return {
      success: false,
      code: currentCode ?? { files: [] },
      rounds: round,
      errors: currentErrors,
      tokenUsage,
      message: 'Unexpected loop termination.',
    };
  }
}

function mergeFixedFiles(original: GeneratedCode, fixedFiles: GeneratedFile[]): GeneratedCode {
  const fixMap = new Map(fixedFiles.map(f => [f.path.replace(/\\/g, '/'), f]));
  const merged = original.files.map(f => {
    const normalizedPath = f.path.replace(/\\/g, '/');
    return fixMap.get(normalizedPath) || f;
  });
  return { ...original, files: merged };
}

export function parseCodeFromResponse(content: string): GeneratedCode {
  const files: GeneratedFile[] = [];

  const delimiterRegex = new RegExp(
    `${escapeRegex(FILE_DELIMITER)}\\s*(.+?)\\s*\\n([\\s\\S]*?)${escapeRegex(FILE_END)}`,
    'g',
  );

  let match: RegExpExecArray | null;
  while ((match = delimiterRegex.exec(content)) !== null) {
    const filePath = match[1].trim();
    const fileContent = match[2].trim();
    if (filePath && fileContent) {
      files.push({ path: filePath, content: fileContent, source: 'generated' });
    }
  }

  if (files.length > 0) {
    return { files };
  }

  let jsonStr = content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    jsonStr = fenceMatch[1].trim();
  }

  const jsonStart = jsonStr.indexOf('{');
  if (jsonStart > 0) {
    jsonStr = jsonStr.slice(jsonStart);
  }

  let depth = 0;
  let lastBrace = -1;
  for (let i = 0; i < jsonStr.length; i++) {
    if (jsonStr[i] === '{') depth++;
    else if (jsonStr[i] === '}') {
      depth--;
      if (depth === 0) { lastBrace = i; break; }
    }
  }
  if (lastBrace > 0) {
    jsonStr = jsonStr.slice(0, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonStr);
    const jsonFiles = (parsed.files || []).map((f: { path: string; content: string }) => ({
      path: f.path,
      content: f.content,
      source: 'generated' as const,
    }));
    if (jsonFiles.length > 0) {
      return { files: jsonFiles, contracts: parsed.contracts };
    }
  } catch {
    // fall through
  }

  const fileBlocks = content.split(/(?=^(?:\/\/|#)\s*(?:File|file):\s*)/m);
  for (const block of fileBlocks) {
    const headerMatch = block.match(/^(?:\/\/|#)\s*(?:File|file):\s*(.+)/);
    if (headerMatch) {
      const filePath = headerMatch[1].trim();
      const fileContent = block.slice(headerMatch[0].length).trim();
      if (filePath && fileContent) {
        files.push({ path: filePath, content: fileContent, source: 'generated' });
      }
    }
  }

  if (files.length > 0) {
    return { files };
  }

  console.error(`[parseCodeFromResponse] All parsing strategies failed. Content length: ${content.length}, first 300 chars: ${content.slice(0, 300)}`);
  return { files: [] };
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function writeCodeToDisk(code: GeneratedCode, basePath: string): void {
  fs.mkdirSync(basePath, { recursive: true });
  for (const file of code.files) {
    const filePath = path.join(basePath, file.path);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, file.content, 'utf-8');
  }
}

async function installDependencies(outputPath: string): Promise<void> {
  const dirs = [outputPath];
  const entries = fs.readdirSync(outputPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subPkg = path.join(outputPath, entry.name, 'package.json');
      if (fs.existsSync(subPkg)) {
        dirs.push(path.join(outputPath, entry.name));
      }
    }
  }
  const rootPkg = path.join(outputPath, 'package.json');
  if (fs.existsSync(rootPkg) && !dirs.includes(outputPath)) {
    dirs.unshift(outputPath);
  }

  for (const dir of dirs) {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    console.log(`[AgentLoop] Running npm install in ${dir}`);
    await new Promise<void>((resolve) => {
      const child = spawn('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
        cwd: dir,
        timeout: 120_000,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
      });

      let stderr = '';
      child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      child.on('close', (code) => {
        if (code !== 0) {
          console.warn(`[AgentLoop] npm install in ${dir} exited with code ${code}: ${stderr.slice(0, 200)}`);
        } else {
          console.log(`[AgentLoop] npm install succeeded in ${dir}`);
        }
        resolve();
      });

      child.on('error', () => {
        console.warn(`[AgentLoop] npm install failed to spawn in ${dir}`);
        resolve();
      });
    });
  }
}

function collectErrors(results: VerificationResult[]): VerificationError[] {
  const errors: VerificationError[] = [];
  for (const r of results) {
    errors.push(...r.errors);
  }
  return errors;
}
