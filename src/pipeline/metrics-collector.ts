/**
 * ANFSF Pipeline — Metrics Collector (GAP-15)
 * Records pipeline execution metrics and provides bottleneck analysis.
 */
import * as fs2 from "fs";
import * as path2 from "path";

export interface StageMetric {
  projectId: string;
  stage: string;
  durationMs: number;
  success: boolean;
  promptTokens: number;
  completionTokens: number;
  errorCount: number;
  fixL1: number;
  fixL2: number;
  fixL3: number;
  timestamp: number;
}

export interface StageSummary {
  stage: string;
  avgDurationMs: number;
  p95DurationMs: number;
  failureRate: number;
  totalRuns: number;
  avgPromptTokens: number;
  avgCompletionTokens: number;
  avgErrors: number;
}

const DEFAULT_PATH = path2.join(process.cwd(), ".anfsf", "pipeline-metrics.json");

export class MetricsCollector {
  private metrics: StageMetric[] = [];
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || DEFAULT_PATH;
    this.load();
  }

  record(metric: StageMetric): void {
    this.metrics.push(metric);
    this.save();
  }

  getStageSummary(stage: string, lastDays?: number): StageSummary {
    const cutoff = lastDays ? Date.now() - lastDays * 86400000 : 0;
    const filtered = this.metrics.filter(m => m.stage === stage && m.timestamp >= cutoff);
    if (filtered.length === 0) {
      return { stage, avgDurationMs: 0, p95DurationMs: 0, failureRate: 0, totalRuns: 0, avgPromptTokens: 0, avgCompletionTokens: 0, avgErrors: 0 };
    }
    const durations = filtered.map(m => m.durationMs).sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1] || 0;
    const failed = filtered.filter(m => !m.success).length;
    return {
      stage,
      avgDurationMs: durations.reduce((a, b) => a + b, 0) / durations.length,
      p95DurationMs: p95,
      failureRate: failed / filtered.length,
      totalRuns: filtered.length,
      avgPromptTokens: filtered.reduce((s, m) => s + m.promptTokens, 0) / filtered.length,
      avgCompletionTokens: filtered.reduce((s, m) => s + m.completionTokens, 0) / filtered.length,
      avgErrors: filtered.reduce((s, m) => s + m.errorCount, 0) / filtered.length,
    };
  }

  getBottleneckStages(thresholdMs: number = 10000): StageSummary[] {
    const stages = [...new Set(this.metrics.map(m => m.stage))];
    return stages
      .map(s => this.getStageSummary(s))
      .filter(s => s.totalRuns > 0 && s.avgDurationMs > thresholdMs)
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs);
  }

  getAllStageSummaries(): StageSummary[] {
    const stages = [...new Set(this.metrics.map(m => m.stage))];
    return stages
      .map(s => this.getStageSummary(s))
      .filter(s => s.totalRuns > 0)
      .sort((a, b) => b.avgDurationMs - a.avgDurationMs);
  }

  getProjectTokenUsage(projectId: string): { totalPrompt: number; totalCompletion: number; avgPerStage: number } {
    const filtered = this.metrics.filter(m => m.projectId === projectId);
    if (filtered.length === 0) return { totalPrompt: 0, totalCompletion: 0, avgPerStage: 0 };
    const tp = filtered.reduce((s, m) => s + m.promptTokens, 0);
    const tc = filtered.reduce((s, m) => s + m.completionTokens, 0);
    return { totalPrompt: tp, totalCompletion: tc, avgPerStage: (tp + tc) / filtered.length };
  }

  get totalRecords(): number { return this.metrics.length; }

  flush(): void { this.save(); }

  private load(): void {
    try {
      if (fs2.existsSync(this.dbPath)) {
        this.metrics = JSON.parse(fs2.readFileSync(this.dbPath, "utf-8"));
      }
    } catch { this.metrics = []; }
  }

  private save(): void {
    try {
      const dir = path2.dirname(this.dbPath);
      if (!fs2.existsSync(dir)) fs2.mkdirSync(dir, { recursive: true });
      fs2.writeFileSync(this.dbPath, JSON.stringify(this.metrics, null, 2), "utf-8");
    } catch (e) {
      console.error("[MetricsCollector] Save failed:", e);
    }
  }
}
