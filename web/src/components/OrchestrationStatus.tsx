import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

export default function OrchestrationStatus() {
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async () => {
    try {
      setError(null);
      const res = await fetch(API_BASE + "/api/v1/orchestrate/status");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    }
  };

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  if (error) {
    return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;
  }

  if (!status) {
    return <div className="text-center py-12 text-gray-500">Loading orchestration status...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Agent Health</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-gray-50 rounded p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">{status.activeAgents ?? 0}</div>
            <div className="text-xs text-gray-500">Active Agents</div>
          </div>
          <div className="bg-gray-50 rounded p-3 text-center">
            <div className="text-2xl font-bold text-green-600">{status.registeredAgents ?? 0}</div>
            <div className="text-xs text-gray-500">Registered</div>
          </div>
          <div className="bg-gray-50 rounded p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">{status.queuedMessages ?? 0}</div>
            <div className="text-xs text-gray-500">Queued Messages</div>
          </div>
          <div className="bg-gray-50 rounded p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">{status.busStats?.messagesProcessed ?? 0}</div>
            <div className="text-xs text-gray-500">Msg Processed</div>
          </div>
        </div>
      </div>
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Bus Stats</h3>
        <div className="text-sm text-gray-600">
          Avg Latency: <span className="font-medium">{status.busStats?.avgLatencyMs ?? 0}ms</span>
        </div>
      </div>
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">DAG Status</h3>
        <div className="text-sm text-gray-600 space-y-1">
          {status.dagStatus ? (
            <>
              <p>Tasks: {status.dagStatus.tasks} / Completed: {status.dagStatus.completed}</p>
              {status.dagStatus.waves?.map((wave: any, i: number) => (
                <p key={i} className="text-xs text-gray-500">Wave {i + 1}: [{wave.join(', ')}]</p>
              ))}
            </>
          ) : (
            <p className="text-gray-400">No active DAG</p>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-gray-400">
        Auto-refreshing every 5s
      </p>
    </div>
  );
}