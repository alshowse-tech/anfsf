import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

export default function WebhookStatus() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(API_BASE + "/api/v1/pipeline?limit=50")
      .then(r => r.json())
      .then(data => {
        const runs = Array.isArray(data) ? data : data.runs || [];
        const webhookResults = runs
          .map((r: any) => ({ run: r, wr: r.result?.webhookResult }))
          .filter((x: any) => x.wr)
          .sort((a: any, b: any) => (b.run.completedAt || 0) - (a.run.completedAt || 0))
          .map((x: any) => ({
            id: x.run.id || x.wr.deliveryId,
            deliveryId: x.wr.deliveryId,
            commitSha: x.wr.commitSha || '',
            branch: x.wr.branch || '',
            repository: x.wr.repository || '',
            success: x.wr.success ?? false,
            errors: x.wr.errors ?? 0,
            autoFixed: x.wr.autoFixed ?? 0,
            message: x.wr.message || '',
            timestamp: x.run.completedAt || 0,
            steps: x.run.steps || [],
            fixRecords: x.wr.fixRecords || [],
          }));
        setDeliveries(webhookResults);
      })
      .catch(() => setError('Failed to load webhook deliveries'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Webhook Deliveries</h2>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
      {loading && <div className="text-center py-12 text-gray-500">Loading...</div>}
      {!loading && deliveries.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">No webhook deliveries yet</div>
      )}

      {deliveries.length > 0 && (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-4 py-2">Commit</th>
                <th className="text-left px-4 py-2">Branch</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Errors</th>
                <th className="text-left px-4 py-2">Auto-fixed</th>
                <th className="text-left px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((d) => (
                <>
                  <tr key={d.id}
                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    className="border-t hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-2 font-mono text-xs">{d.commitSha.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-xs">{d.branch}</td>
                    <td className="px-4 py-2">
                      <span className={"text-xs px-2 py-0.5 rounded " + (d.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                        {d.success ? 'Success' : 'Failed'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">{d.errors}</td>
                    <td className="px-4 py-2 text-xs">{d.autoFixed}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : '-'}</td>
                  </tr>
                  {expandedId === d.id && (
                    <tr key={d.id + '-detail'}>
                      <td colSpan={6} className="px-4 py-3 bg-gray-50">
                        <div className="text-xs space-y-1">
                          <p className="font-medium text-gray-700 mb-1">DevFixLoop Details</p>
                          {d.steps.length > 0 && (
                            <div className="mb-2">
                              <p className="text-gray-500 mb-1">Verify Steps:</p>
                              {d.steps.map((s: any, j: number) => (
                                <p key={j} className="text-gray-600 ml-2">
                                  {s.name} → {s.status === 'ok' ? '✓ Passed' : '✗ Failed'} ({s.duration || 0}ms)
                                </p>
                              ))}
                            </div>
                          )}
                          {d.fixRecords?.length > 0 && (
                            <div>
                              <p className="text-gray-500 mb-1">Fix Records:</p>
                              {d.fixRecords.map((r: any, j: number) => (
                                <p key={j} className="text-gray-600 ml-2">
                                  [{r.level}] {r.file}:{r.line} → {r.issueDescription}
                                </p>
                              ))}
                            </div>
                          )}
                          {d.steps.length === 0 && d.fixRecords?.length === 0 && (
                            <p className="text-gray-400">No details available</p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
