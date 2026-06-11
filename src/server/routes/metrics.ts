/**
 * GET /metrics — Prometheus text exposition format
 */

import { FastifyInstance } from 'fastify';
import { LLMClient } from '../../integrations/llm-client';
import type { AnfsfStore } from '../index';

// Global counters for HTTP metrics (set by tracing middleware)
export const httpMetrics = {
  requestTotal: 0,
  requestDurationMs: 0,
  errors4xx: 0,
  errors5xx: 0,
};

let llmClient: LLMClient | null = null;

export function registerLLMMetrics(client: LLMClient): void {
  llmClient = client;
}

const METRICS_CACHE_TTL_MS = 15_000; // 15 seconds
let metricsCache: { data: string; expiresAt: number } | null = null;

export function registerMetricsRoute(app: FastifyInstance, store: AnfsfStore): void {
  app.get('/metrics', async (_request, reply) => {
    // Serve from cache if fresh
    if (metricsCache && Date.now() < metricsCache.expiresAt) {
      return reply
        .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
        .send(metricsCache.data);
    }

    const stats = await store.getStats();
    const runs = await store.listRuns(1000);

    const now = Date.now();
    const lines: string[] = [];

    // Helper
    const metric = (name: string, type: string, help: string) => {
      lines.push(`# HELP anfsf_${name} ${help}`);
      lines.push(`# TYPE anfsf_${name} ${type}`);
    };

    // Pipeline totals
    metric('pipeline_total', 'counter', 'Total pipeline runs');
    lines.push(`anfsf_pipeline_total{status="success"} ${stats.success}`);
    lines.push(`anfsf_pipeline_total{status="failed"} ${stats.failed}`);
    lines.push('');

    // Currently running
    const runningCount = runs.filter(r => r.status === 'running').length;
    const queuedCount = runs.filter(r => r.status === 'queued').length;
    metric('pipeline_running', 'gauge', 'Currently running pipelines');
    lines.push(`anfsf_pipeline_running ${runningCount}`);
    lines.push('');
    metric('pipeline_queued', 'gauge', 'Queued pipelines');
    lines.push(`anfsf_pipeline_queued ${queuedCount}`);
    lines.push('');

    // Pipeline duration histogram (buckets in seconds)
    metric('pipeline_duration_seconds', 'histogram', 'Pipeline run duration in seconds');
    const buckets = [10, 30, 60, 120, 300, 600, Infinity];
    const bucketLabels = ['10', '30', '60', '120', '300', '600', '+Inf'];
    let cumulative = 0;
    const completedRuns = runs.filter(r => r.completedAt && r.startedAt);
    for (let i = 0; i < buckets.length; i++) {
      const count = completedRuns.filter(r => {
        const dur = ((r.completedAt ?? now) - r.startedAt) / 1000;
        return dur <= buckets[i] && dur > (buckets[i - 1] ?? 0);
      }).length;
      cumulative += count;
      lines.push(`anfsf_pipeline_duration_seconds_bucket{le="${bucketLabels[i]}"} ${cumulative}`);
    }
    const totalDuration = completedRuns.reduce((sum, r) => sum + ((r.completedAt ?? now) - r.startedAt) / 1000, 0);
    lines.push(`anfsf_pipeline_duration_seconds_sum ${totalDuration.toFixed(3)}`);
    lines.push(`anfsf_pipeline_duration_seconds_count ${completedRuns.length}`);
    lines.push('');

    // Per-run status gauge — fixed cardinality (no id label)
    // Uses a single gauge value: 1=done, 2=failed, 3=running, 0=other
    metric('pipeline_run_info', 'gauge', 'Latest pipeline run status value');
    if (runs.length > 0) {
      const latest = runs[0];
      const statusVal = latest.status === 'done' ? 1 : latest.status === 'failed' ? 2 : latest.status === 'running' ? 3 : 0;
      lines.push(`anfsf_pipeline_run_info{status="${latest.status}"} ${statusVal}`);
    } else {
      lines.push(`anfsf_pipeline_run_info{status="none"} 0`);
    }
    lines.push('');

    // Step-level duration summary
    metric('step_duration_seconds', 'summary', 'Individual step durations');
    const allSteps = runs.flatMap(r => r.steps.map(s => ({ ...s, runId: r.id })));
    const totalStepDur = allSteps.reduce((sum, s) => sum + s.duration / 1000, 0);
    lines.push(`anfsf_step_duration_seconds_sum ${totalStepDur.toFixed(3)}`);
    lines.push(`anfsf_step_duration_seconds_count ${allSteps.length}`);
    lines.push('');

    // --- NEW: HTTP request metrics ---
    metric('http_requests_total', 'counter', 'Total HTTP requests');
    lines.push(`anfsf_http_requests_total ${httpMetrics.requestTotal}`);
    lines.push('');
    metric('http_request_duration_seconds', 'counter', 'Total HTTP request duration');
    lines.push(`anfsf_http_request_duration_seconds ${(httpMetrics.requestDurationMs / 1000).toFixed(3)}`);
    lines.push('');
    metric('http_errors_total', 'counter', 'Total HTTP errors');
    lines.push(`anfsf_http_errors_total{type="4xx"} ${httpMetrics.errors4xx}`);
    lines.push(`anfsf_http_errors_total{type="5xx"} ${httpMetrics.errors5xx}`);
    lines.push('');

    // --- NEW: LLM token and cost metrics ---
    if (llmClient) {
      const usage = llmClient.getTotalUsage();
      const cost = llmClient.getTotalCost();
      const circuit = llmClient.getCircuitState();

      metric('llm_tokens_total', 'counter', 'Total LLM tokens used');
      lines.push(`anfsf_llm_tokens_total{type="prompt"} ${usage.prompt_tokens}`);
      lines.push(`anfsf_llm_tokens_total{type="completion"} ${usage.completion_tokens}`);
      lines.push(`anfsf_llm_tokens_total{type="total"} ${usage.total_tokens}`);
      lines.push('');

      metric('llm_cost_usd', 'counter', 'Estimated LLM cost in USD');
      lines.push(`anfsf_llm_cost_usd{type="prompt"} ${cost.promptCost.toFixed(6)}`);
      lines.push(`anfsf_llm_cost_usd{type="completion"} ${cost.completionCost.toFixed(6)}`);
      lines.push(`anfsf_llm_cost_usd{type="total"} ${cost.totalCost.toFixed(6)}`);
      lines.push('');

      metric('circuit_breaker_state', 'gauge', 'LLM circuit breaker state (0=closed, 1=open, 2=half-open)');
      const circuitState = circuit.state === 'open' ? 1 : circuit.state === 'half-open' ? 2 : 0;
      lines.push(`anfsf_circuit_breaker_state ${circuitState}`);
      lines.push(`anfsf_circuit_breaker_failures ${circuit.failures}`);
      lines.push('');
    }

    // --- NEW: Process memory and CPU metrics ---
    const mem = process.memoryUsage();
    const cpu = process.cpuUsage();
    metric('process_memory_bytes', 'gauge', 'Process memory usage');
    lines.push(`anfsf_process_memory_bytes{type="rss"} ${mem.rss}`);
    lines.push(`anfsf_process_memory_bytes{type="heapTotal"} ${mem.heapTotal}`);
    lines.push(`anfsf_process_memory_bytes{type="heapUsed"} ${mem.heapUsed}`);
    lines.push(`anfsf_process_memory_bytes{type="external"} ${mem.external}`);
    lines.push('');
    metric('process_cpu_seconds', 'counter', 'Process CPU usage');
    lines.push(`anfsf_process_cpu_seconds_total ${(cpu.user + cpu.system) / 1e6}`);
    lines.push('');

    // Uptime
    metric('uptime_seconds', 'counter', 'Server uptime in seconds');
    lines.push(`anfsf_uptime_seconds ${process.uptime().toFixed(1)}`);
    lines.push('');

    // Process info
    metric('process_info', 'gauge', 'Process information');
    lines.push(`anfsf_process_info{version="${process.version}",pid="${process.pid}"} 1`);

    const result = lines.join('\n') + '\n';

    // Cache the result
    metricsCache = { data: result, expiresAt: Date.now() + METRICS_CACHE_TTL_MS };

    reply
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(result);
  });
}
