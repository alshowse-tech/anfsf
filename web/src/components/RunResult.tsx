/**
 * ANFSF V4 Phase 6.3 — Run Result Display
 *
 * Shows generated files, quality scores, compilation status, and error details
 * for a completed pipeline run.
 */

import { useState, useEffect } from 'react';
import { fetchRunDetail } from '../api/client';
import type { RunDetail } from '../api/client';

interface RunResultProps {
  runId: string;
}

export default function RunResult({ runId }: RunResultProps) {
  const [run, setRun] = useState<RunDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const data = await fetchRunDetail(runId);
        if (!cancelled) {
          setRun(data);
          setLoading(false);
          // Keep polling until terminal state
          if (data.status === 'running' || data.status === 'queued') {
            setTimeout(poll, 2000);
          }
        }
      } catch {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    poll();
    return () => { cancelled = true; };
  }, [runId]);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading run details...</div>;
  if (!run) return <div className="p-8 text-center text-red-600">Run not found</div>;

  const okSteps = run.steps.filter(s => s.status === 'ok');
  const errorSteps = run.steps.filter(s => s.status === 'error');
  const skippedSteps = run.steps.filter(s => s.status === 'skipped');

  // Compute quality score from step results
  const totalSteps = run.steps.length;
  const qualityScore = totalSteps > 0 ? Math.round((okSteps.length / totalSteps) * 100) : 0;
  const compileStatus = run.steps.some(s => s.name.toLowerCase().includes('compile') && s.status === 'ok')
    ? 'passed'
    : run.steps.some(s => s.name.toLowerCase().includes('compile') && s.status === 'error')
      ? 'failed'
      : 'not-run';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Run {run.id.slice(0, 20)}...</h3>
          <p className="text-sm text-gray-500">
            Started: {new Date(run.startedAt).toLocaleString()}
            {run.completedAt && ` · Completed: ${new Date(run.completedAt).toLocaleString()}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          run.status === 'done' ? 'bg-green-100 text-green-800' :
          run.status === 'failed' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {run.status}
        </span>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">Quality Score</div>
          <div className={`text-2xl font-bold ${
            qualityScore >= 80 ? 'text-green-600' : qualityScore >= 50 ? 'text-yellow-600' : 'text-red-600'
          }`}>{qualityScore}%</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">Compile Check</div>
          <div className={`text-2xl font-bold ${
            compileStatus === 'passed' ? 'text-green-600' : compileStatus === 'failed' ? 'text-red-600' : 'text-gray-400'
          }`}>{compileStatus === 'not-run' ? 'N/A' : compileStatus.charAt(0).toUpperCase() + compileStatus.slice(1)}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-500">Steps</div>
          <div className="text-2xl font-bold">{okSteps.length}/{totalSteps}</div>
        </div>
      </div>

      {/* Steps detail */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-2">Pipeline Steps</h4>
        <div className="space-y-1">
          {run.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 rounded bg-gray-50"
            >
              <span className={`w-2 h-2 rounded-full ${
                step.status === 'ok' ? 'bg-green-500' :
                step.status === 'error' ? 'bg-red-500' :
                'bg-gray-300'
              }`} />
              <span className="flex-1 text-sm font-mono">{step.name}</span>
              <span className="text-xs text-gray-500">
                {step.duration ? `${(step.duration / 1000).toFixed(1)}s` : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Error details */}
      {run.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-700 mb-1">Error</h4>
          <pre className="text-xs text-red-600 whitespace-pre-wrap font-mono">{run.error}</pre>
        </div>
      )}

      {/* Summary counts */}
      <div className="flex gap-4 text-sm">
        <span className="text-green-600">✓ {okSteps.length} passed</span>
        <span className="text-red-600">✗ {errorSteps.length} failed</span>
        {skippedSteps.length > 0 && <span className="text-gray-400">○ {skippedSteps.length} skipped</span>}
      </div>
    </div>
  );
}
