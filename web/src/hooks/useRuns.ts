import { useState, useEffect, useCallback } from 'react';
import { fetchRuns, fetchRunDetail } from '../api/client';
import type { PipelineRun } from '../api/client';

export type RunStatus = 'queued' | 'running' | 'done' | 'failed';

export interface PipelineStep {
  name: string;
  duration: number;
  status: 'ok' | 'error' | 'skipped';
}

export interface PipelineRunWithDetails {
  id: string;
  status: string;
  steps: PipelineStep[];
  error: string | null;
  startedAt: number;
  completedAt: number | null;
}

export function useRuns(limit: number = 50, offset: number = 0) {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [total, setTotal] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await fetchRuns({ limit, offset });
      setRuns(data.runs);
      setTotal(data.total);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch runs');
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { runs, total, loading, error, refresh };
}

export function useRunStatus(id: string | null) {
  const [run, setRun] = useState<PipelineRunWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const data = await fetchRunDetail(id);
      setRun(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch run status');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    if (run?.status === 'running') {
      const interval = setInterval(refresh, 2000);
      return () => clearInterval(interval);
    }
  }, [refresh, run?.status]);

  return { run, loading, error, refresh };
}
