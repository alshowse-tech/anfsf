/**
 * ANFSF V1.5.0 — Retrospective Engine
 *
 * Collects project data → analyzes successes/failures via LLM →
 * extracts lessons → persists to KnowledgeBase for cross-project reuse.
 */

import { KnowledgeBase, KnowledgeEntry } from '../storage/knowledge-base';

export interface RetrospectiveInput {
  projectId: string;
  prdText: string;
  pipelineSteps: Array<{
    name: string;
    duration: number;
    status: 'ok' | 'error' | 'skipped';
    error?: string;
  }>;
  outputMetrics?: {
    filesGenerated: number;
    filesPolished: number;
    qualityScore: number;
    compileSuccess: boolean;
    guardPassed: boolean;
  };
  duration: number;
  success: boolean;
}

export interface Lesson {
  category: 'architecture' | 'pipeline' | 'quality' | 'performance' | 'reliability' | 'ux';
  title: string;
  description: string;
  action: 'do' | 'avoid' | 'consider';
  confidence: number; // 0-1
}

export interface RetrospectiveResult {
  projectId: string;
  lessons: Lesson[];
  summary: string;
  stored: boolean;
}

const SYSTEM_PROMPT = `You are a project retrospective analyst. Analyze the provided project execution data and extract actionable lessons.

Input data includes:
- Pipeline steps with status, duration, and any errors
- Output metrics (files generated, quality score, compile status, etc.)
- Overall success/failure and total duration

Output a JSON object with:
- "summary": 2-3 sentence summary of the project outcome
- "lessons": array of lessons, each with:
  - "category": one of "architecture", "pipeline", "quality", "performance", "reliability", "ux"
  - "title": short title
  - "description": detailed explanation
  - "action": "do" (repeat this), "avoid" (don't do this), "consider" (evaluate)
  - "confidence": 0-1 how confident we are this lesson generalizes

Rules:
- Only extract lessons with clear evidence from the data — do not invent problems
- If the project succeeded, focus on what worked well (action: "do")
- If there were errors, identify root causes and how to prevent them
- Keep lessons specific and actionable
- Maximum 5 lessons`;

export interface RetrospectiveEngineConfig {
  apiKey?: string;
  model?: string;
  llmBaseUrl?: string;
  knowledgeBasePath?: string;
  timeoutMs?: number;
}

export class RetrospectiveEngine {
  private apiKey: string;
  private model: string;
  private llmBaseUrl: string;
  private knowledgeBase: KnowledgeBase;
  private timeoutMs: number;

  constructor(config: RetrospectiveEngineConfig = {}) {
    this.apiKey = config.apiKey || process.env.DASHSCOPE_API_KEY || '';
    this.model = config.model || 'qwen3.5-plus';
    this.llmBaseUrl = config.llmBaseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1';
    this.knowledgeBase = new KnowledgeBase(config.knowledgeBasePath || './.anfsf/knowledge.json');
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  /** Initialize the engine — loads knowledge base from disk */
  async init(): Promise<void> {
    await this.knowledgeBase.init();
  }

  /**
   * Run a retrospective on a completed project.
   */
  async retrospective(input: RetrospectiveInput): Promise<RetrospectiveResult> {
    const lessonAnalysis = await this.analyzeWithLLM(input);

    const summary = lessonAnalysis?.summary || this.generateFallbackSummary(input);
    const lessons = lessonAnalysis?.lessons || this.generateFallbackLessons(input);

    // Store lessons in knowledge base
    let stored = false;
    if (lessons.length > 0) {
      try {
        const entry: KnowledgeEntry = {
          id: `retro_${input.projectId}_${Date.now()}`,
          projectId: input.projectId,
          category: 'retrospective',
          content: JSON.stringify({ summary, lessons, metrics: input.outputMetrics }),
          metadata: {
            success: input.success,
            duration: input.duration,
            stepCount: input.pipelineSteps.length,
          },
          createdAt: Date.now(),
        };
        await this.knowledgeBase.add(entry);
        stored = true;
      } catch {
        stored = false;
      }
    }

    return {
      projectId: input.projectId,
      lessons,
      summary,
      stored,
    };
  }

  /**
   * Query historical lessons across projects.
   */
  async queryLessons(projectId?: string, category?: string): Promise<KnowledgeEntry[]> {
    return this.knowledgeBase.query(projectId, category);
  }

  private async analyzeWithLLM(
    input: RetrospectiveInput
  ): Promise<{ summary: string; lessons: Lesson[] } | null> {
    if (!this.apiKey) return null;

    const inputText = JSON.stringify({
      success: input.success,
      duration: input.duration,
      steps: input.pipelineSteps.map(s => ({
        name: s.name,
        status: s.status,
        duration: `${(s.duration / 1000).toFixed(1)}s`,
        error: s.error || undefined,
      })),
      metrics: input.outputMetrics,
    }, null, 2);

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(`${this.llmBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: inputText },
          ],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!response.ok) return null;

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = data.choices[0]?.message?.content || '';

      try {
        const parsed = JSON.parse(content) as { summary?: string; lessons?: Array<Record<string, unknown>> };
        return {
          summary: parsed.summary || '',
          lessons: (parsed.lessons || []).map(l => ({
            category: (l.category as Lesson['category']) || 'pipeline',
            title: String(l.title || ''),
            description: String(l.description || ''),
            action: (l.action as Lesson['action']) || 'consider',
            confidence: typeof l.confidence === 'number' ? l.confidence : 0.5,
          })),
        };
      } catch {
        return null;
      }
    } catch {
      return null;
    }
  }

  private generateFallbackSummary(input: RetrospectiveInput): string {
    const stepErrors = input.pipelineSteps.filter(s => s.status === 'error');
    if (input.success && stepErrors.length === 0) {
      return `Project completed successfully in ${(input.duration / 1000).toFixed(0)}s with ${input.pipelineSteps.length} steps. ` +
        `${input.outputMetrics?.filesGenerated ?? 0} files generated, quality score ${(input.outputMetrics?.qualityScore ?? 0).toFixed(2)}.`;
    }
    return `Project completed with ${stepErrors.length} failed step(s) in ${(input.duration / 1000).toFixed(0)}s. ` +
      `Failed steps: ${stepErrors.map(s => s.name).join(', ')}.`;
  }

  private generateFallbackLessons(input: RetrospectiveInput): Lesson[] {
    const lessons: Lesson[] = [];
    const stepErrors = input.pipelineSteps.filter(s => s.status === 'error');

    if (stepErrors.length > 0) {
      lessons.push({
        category: 'reliability',
        title: 'Pipeline step failures',
        description: `${stepErrors.length} step(s) failed: ${stepErrors.map(s => s.name).join(', ')}. Review error handling and retry logic.`,
        action: 'avoid',
        confidence: 0.8,
      });
    }

    if (input.outputMetrics?.compileSuccess === false) {
      lessons.push({
        category: 'quality',
        title: 'Generated code did not compile',
        description: 'Generated project failed TypeScript compilation. Consider improving code generation templates.',
        action: 'avoid',
        confidence: 0.9,
      });
    }

    if (input.outputMetrics && input.outputMetrics.qualityScore >= 0.9) {
      lessons.push({
        category: 'quality',
        title: 'High quality output',
        description: `Quality score of ${(input.outputMetrics.qualityScore).toFixed(2)} indicates effective generation pipeline.`,
        action: 'do',
        confidence: 0.7,
      });
    }

    return lessons;
  }
}

export function createRetrospectiveEngine(config: RetrospectiveEngineConfig = {}): RetrospectiveEngine {
  return new RetrospectiveEngine(config);
}
