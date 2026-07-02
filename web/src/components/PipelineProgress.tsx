/**
 * ANFSF — Agent Loop Progress (P-003 rewrite)
 *
 * Simplified 3-step progress display for the new Agent Loop pipeline.
 * Shows: Quality Check → Agent Loop Generation → Push to Gitea
 * Plus real-time metrics: rounds, token usage, file count, Gitea link.
 */

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';
const POLL_MS = 1000;

interface TokenUsageEntry { round: number; promptTokens: number; completionTokens: number; totalTokens: number; }
interface FileEntry { path: string; size: number; type: string; }

interface PipelineStatus {
  id: string; status: string; steps: { name: string; duration: number; status: string }[];
  error: string | null; startedAt: number; completedAt: number | null; projectName: string | null;
  rounds: number | null; tokenUsage: TokenUsageEntry[] | null;
  giteaUrl: string | null; message: string | null; files: FileEntry[] | null;
}

interface Props { runId: string; onComplete: (runId: string) => void; }

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function PipelineProgress({ runId, onComplete }: Props) {
  const [data, setData] = useState<PipelineStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!runId) return;
    completedRef.current = false;
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/pipeline/${runId}/status`);
        if (!res.ok) { if (active) setError(`Server error: ${res.status}`); return; }
        const d: PipelineStatus = await res.json();
        if (!active) return;
        setData(d);
        if ((d.status === 'done' || d.status === 'failed') && !completedRef.current) {
          completedRef.current = true;
          onComplete(runId);
        }
      } catch { if (active) setError('Connection lost'); }
    };

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [runId, onComplete]);

  const totalTokens = data?.tokenUsage?.reduce((s, e) => s + e.totalTokens, 0) ?? 0;
  const fileCount = data?.files?.length ?? 0;
  const isDone = data?.status === 'done' || data?.status === 'failed';
  const hasError = data?.status === 'failed' || (data?.error && isDone);

  // Determine progress phase
  const phase = !data ? 'waiting' :
    fileCount > 0 ? 'done' :
    data.steps?.length >= 2 ? 'generating' :
    data.steps?.length >= 1 ? 'quality' : 'waiting';

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">
          {data?.projectName && <span className="text-gray-500 font-normal mr-2">{data.projectName}</span>}
          {isDone ? (hasError ? '生成完成（有错误）' : '生成完成') : '正在生成...'}
        </h2>
        {isDone && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${hasError ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
            {hasError ? '部分成功' : '成功'}
          </span>
        )}
      </div>

      {/* 3-Step Progress */}
      <div className="flex items-center gap-0">
        {[
          { label: '质量检查', done: phase !== 'waiting', active: phase === 'quality' },
          { label: 'Agent Loop', done: phase === 'generating' || phase === 'done', active: phase === 'generating' },
          { label: '生成完毕', done: phase === 'done', active: false },
        ].map((step, i, arr) => (
          <div key={step.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${step.done ? 'bg-green-500 text-white' : step.active ? 'bg-blue-500 text-white animate-pulse' : 'bg-gray-200 text-gray-500'}`}>
                {step.done ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${step.done ? 'text-green-600' : step.active ? 'text-blue-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Metrics */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricBox label="生成轮数" value={`${data.rounds ?? '?'} / 2`} />
          <MetricBox label="生成文件" value={String(fileCount)} />
          <MetricBox label="Token 消耗" value={fmtTokens(totalTokens)} />
          <MetricBox label="耗时" value={isDone && data.completedAt ? fmtMs(data.completedAt - data.startedAt) : '...'} />
        </div>
      )}

      {/* Steps from server */}
      {data?.steps && data.steps.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto text-sm">
          {data.steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 py-1.5 px-2 rounded ${s.status === 'error' ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
              <span className={`w-5 text-center ${s.status === 'ok' ? 'text-green-600' : s.status === 'error' ? 'text-red-600' : 'text-gray-400'}`}>
                {s.status === 'ok' ? '✓' : s.status === 'error' ? '✗' : '○'}
              </span>
              <span className="flex-1 font-mono text-xs">{s.name}</span>
              <span className="text-xs text-gray-400 font-mono">{fmtMs(s.duration)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Message */}
      {data?.message && !hasError && (
        <div className="text-sm text-gray-500 bg-gray-50 rounded p-3">{data.message}</div>
      )}

      {/* Error */}
      {data?.error && isDone && (
        <div className="text-sm bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="font-medium text-red-700">生成信息</p>
          <p className="text-red-600 mt-1 font-mono text-xs whitespace-pre-wrap">{data.error}</p>
        </div>
      )}

      {/* Complete actions */}
      {isDone && (
        <div className="border-t pt-4 space-y-3">
          {data?.giteaUrl && (
            <a href={data.giteaUrl} target="_blank" rel="noopener noreferrer"
              className="block w-full text-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium no-underline">
              🔗 在 Gitea 中查看代码
            </a>
          )}
          <Link to={`/result?runId=${runId}`}
            className="block text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline">
            查看产出物 →
          </Link>
        </div>
      )}

      {error && <div className="text-sm text-red-600 text-center py-2">{error}</div>}
      {!data && <div className="text-sm text-gray-500 text-center py-8">等待流水线启动...</div>}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-gray-800">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}
