import { useState, useEffect } from 'react';
import { getApiToken } from '../api/client';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

export default function AuditLog() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 50;

  const load = async (offset: number) => {
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/v1/audit-log?limit=' + PAGE_SIZE + '&offset=' + offset, {
        headers: { 'Authorization': 'Bearer ' + (getApiToken() || '') },
      });
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError('Failed to load audit log: ' + String(e));
    }
    setLoading(false);
  };

  useEffect(() => { load(0); }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Audit Log</h2>
        <p className="text-sm text-gray-400">{total} total entries</p>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {loading ? <p className="text-sm text-gray-400 py-4 text-center">Loading...</p> : entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No audit entries yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 pr-4 font-medium">Time</th>
                <th className="pb-2 pr-4 font-medium">Operation</th>
                <th className="pb-2 pr-4 font-medium">User</th>
                <th className="pb-2 pr-4 font-medium">IP</th>
                <th className="pb-2 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any, i: number) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2 pr-4 text-xs text-gray-500 whitespace-nowrap">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{e.operation}</td>
                  <td className="py-2 pr-4 text-xs">{e.user}</td>
                  <td className="py-2 pr-4 text-xs text-gray-500">{e.ip}</td>
                  <td className="py-2 text-xs text-gray-600 max-w-xs truncate">{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 0} onClick={() => { setPage(p => p - 1); load((page - 1) * PAGE_SIZE); }}
            className="px-3 py-1 text-sm border rounded disabled:opacity-30 hover:bg-gray-50">
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => { setPage(p => p + 1); load((page + 1) * PAGE_SIZE); }}
            className="px-3 py-1 text-sm border rounded disabled:opacity-30 hover:bg-gray-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
