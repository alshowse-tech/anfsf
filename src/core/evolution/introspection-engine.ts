/**
 * ANFSF V1.5.0 — Introspection Engine
 *
 * Self-analysis engine that examines ANFSF's own code using static analysis
 * and LLM-based code review to identify architectural improvement opportunities.
 * Part of the self-evolution four-gate system.
 */

import { LLMClient, type LLMClientConfig } from '../../integrations/llm-client';

export interface IntrospectionConfig {
  apiKey?: string;
  model?: string;
  llmBaseUrl?: string;
  /** Source directories to analyze */
  sourceDirs: string[];
  timeoutMs?: number;
  llmClient?: LLMClient;
  llmConfig?: Partial<LLMClientConfig>;
}

export interface ArchitectureFinding {
  category: 'complexity' | 'coupling' | 'duplication' | 'naming' | 'error-handling' | 'testability';
  severity: 'critical' | 'major' | 'minor' | 'info';
  file: string;
  description: string;
  suggestion: string;
  /** Estimated effort to fix: S/M/L */
  effort: 'S' | 'M' | 'L';
}

export interface IntrospectionReport {
  analyzedAt: number;
  filesAnalyzed: number;
  findings: ArchitectureFinding[];
  summary: string;
  duration: number;
}

const SYSTEM_PROMPT = `You are a software architecture reviewer analyzing ANFSF (AI Native Full-Stack Software Factory) code. Review the provided code and identify architectural improvement opportunities.

Focus on:
1. COMPLEXITY: Overly complex functions, deeply nested conditionals, large files
2. COUPLING: Tight coupling between modules, circular dependencies, God classes
3. DUPLICATION: Repeated logic that should be extracted
4. NAMING: Misleading or inconsistent naming patterns
5. ERROR HANDLING: Swallowed errors, missing error propagation, unhandled promise rejections
6. TESTABILITY: Code that is hard to test due to hidden dependencies or side effects

Output a JSON object with:
- "summary": 2-3 sentence overall assessment
- "findings": array of findings, each with:
  - "category": one of "complexity", "coupling", "duplication", "naming", "error-handling", "testability"
  - "severity": "critical", "major", "minor", "info"
  - "file": file path where the issue is found
  - "description": what the issue is
  - "suggestion": how to fix it
  - "effort": "S" (quick), "M" (moderate), "L" (significant)

Rules:
- Only report findings that are genuinely worth fixing
- "critical" = actively harmful, "major" = should fix, "minor" = nice to have, "info" = observation
- Maximum 10 findings per review`;

export class IntrospectionEngine {
  private llm: LLMClient;
  private model: string;
  private sourceDirs: string[];
  private timeoutMs: number;

  constructor(config: IntrospectionConfig) {
    if (config.llmClient) {
      this.llm = config.llmClient;
    } else {
      this.llm = new LLMClient({
        apiKey: config.apiKey || process.env.DASHSCOPE_API_KEY || '',
        baseUrl: config.llmBaseUrl,
        defaultModel: config.model || 'qwen3.5-plus',
        ...config.llmConfig,
      });
    }
    this.model = config.model || 'qwen3.5-plus';
    this.sourceDirs = config.sourceDirs;
    this.timeoutMs = config.timeoutMs ?? 60_000;
  }

  /**
   * Run introspection analysis on the configured source directories.
   */
  async analyze(): Promise<IntrospectionReport> {
    const start = Date.now();
    const fileContents = await this.collectFiles();

    if (fileContents.length === 0) {
      return {
        analyzedAt: Date.now(),
        filesAnalyzed: 0,
        findings: [],
        summary: 'No source files found to analyze.',
        duration: 0,
      };
    }

    // Analyze with LLM in chunks to stay within context limits
    const allFindings: ArchitectureFinding[] = [];
    let summary = '';

    // Chunk files into groups of 5 to stay within token limits
    const chunkSize = 5;
    for (let i = 0; i < fileContents.length; i += chunkSize) {
      const chunk = fileContents.slice(i, i + chunkSize);
      const result = await this.analyzeChunk(chunk);
      if (result) {
        allFindings.push(...result.findings);
        if (i === 0) summary = result.summary;
      }
    }

    return {
      analyzedAt: Date.now(),
      filesAnalyzed: fileContents.length,
      findings: allFindings,
      summary: summary || this.generateFallbackSummary(fileContents),
      duration: Date.now() - start,
    };
  }

  private async collectFiles(): Promise<Array<{ path: string; content: string }>> {
    // In a real implementation, this would read files from disk.
    // For now, we accept files as input via the analyzeFiles method.
    return [];
  }

  /**
   * Analyze a specific set of files provided as input.
   * This is the primary entry point when files are collected externally.
   */
  async analyzeFiles(files: Array<{ path: string; content: string }>): Promise<IntrospectionReport> {
    const start = Date.now();

    if (files.length === 0) {
      return {
        analyzedAt: Date.now(),
        filesAnalyzed: 0,
        findings: [],
        summary: 'No files provided to analyze.',
        duration: 0,
      };
    }

    const allFindings: ArchitectureFinding[] = [];
    let summary = '';

    const chunkSize = 5;
    for (let i = 0; i < files.length; i += chunkSize) {
      const chunk = files.slice(i, i + chunkSize);
      const result = await this.analyzeChunk(chunk);
      if (result) {
        allFindings.push(...result.findings);
        if (i === 0) summary = result.summary;
      }
    }

    return {
      analyzedAt: Date.now(),
      filesAnalyzed: files.length,
      findings: allFindings,
      summary: summary || this.generateFallbackSummary(files),
      duration: Date.now() - start,
    };
  }

  private async analyzeChunk(
    files: Array<{ path: string; content: string }>
  ): Promise<{ summary: string; findings: ArchitectureFinding[] } | null> {
    const inputText = files
      .map(f => `=== ${f.path} ===\n${f.content}`)
      .join('\n\n');

    try {
      const result = await this.llm.chat({
        model: this.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: inputText },
        ],
        temperature: 0.1,
      });

      if (!result.ok) return null;

      try {
        const parsed = JSON.parse(result.content) as { summary?: string; findings?: Array<Record<string, unknown>> };
        return {
          summary: parsed.summary || '',
          findings: (parsed.findings || []).map(f => ({
            category: (f.category as ArchitectureFinding['category']) || 'complexity',
            severity: (f.severity as ArchitectureFinding['severity']) || 'info',
            file: String(f.file || 'unknown'),
            description: String(f.description || ''),
            suggestion: String(f.suggestion || ''),
            effort: (f.effort as ArchitectureFinding['effort']) || 'M',
          })),
        };
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  private generateFallbackSummary(files: Array<{ path: string; content: string }>): string {
    const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
    return `Analyzed ${files.length} files with ${totalLines} total lines of code. ` +
      `LLM analysis unavailable — review findings will be empty.`;
  }
}

export function createIntrospectionEngine(config: IntrospectionConfig): IntrospectionEngine {
  return new IntrospectionEngine(config);
}
