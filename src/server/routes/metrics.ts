/**
 * GET /metrics — Prometheus text exposition format
 */

import { FastifyInstance } from 'fastify';
import { PipelineRunStore } from '../store';

export function registerMetricsRoute(app: FastifyInstance, store: PipelineRunStore): void {
  app.get('/metrics', async (_request, reply) => {
    const stats = store.getStats();
    const runs = store.listRuns(1000);

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

    // Per-run status gauges
    metric('pipeline_run_info', 'gauge', 'Pipeline run info');
    for (const r of runs.slice(0, 50)) {
      const statusVal = r.status === 'done' ? 1 : r.status === 'failed' ? 2 : r.status === 'running' ? 3 : 0;
      lines.push(`anfsf_pipeline_run_info{id="${r.id}",status="${r.status}"} ${statusVal}`);
    }
    lines.push('');

    // Step-level duration summary
    metric('step_duration_seconds', 'summary', 'Individual step durations');
    const allSteps = runs.flatMap(r => r.steps.map(s => ({ ...s, runId: r.id })));
    const totalStepDur = allSteps.reduce((sum, s) => sum + s.duration / 1000, 0);
    lines.push(`anfsf_step_duration_seconds_sum ${totalStepDur.toFixed(3)}`);
    lines.push(`anfsf_step_duration_seconds_count ${allSteps.length}`);
    lines.push('');

    // Uptime
    metric('uptime_seconds', 'counter', 'Server uptime in seconds');
    lines.push(`anfsf_uptime_seconds ${process.uptime().toFixed(1)}`);
    lines.push('');

    // Process info
    metric('process_info', 'gauge', 'Process information');
    lines.push(`anfsf_process_info{version="${process.version}",pid="${process.pid}"} 1`);

    reply
      .header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
      .send(lines.join('\n') + '\n');
  });
}
