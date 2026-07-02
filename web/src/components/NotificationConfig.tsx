import { useState, useEffect } from 'react';
import { fetchWebhooks, createWebhook, deleteWebhook } from '../api/client';

export default function NotificationConfig() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [newEvents, setNewEvents] = useState('ticket.created,ticket.updated');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchWebhooks();
      setWebhooks(data.webhooks ?? []);
    } catch { setWebhooks([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newUrl.trim()) { setMessage('URL is required'); return; }
    try {
      await createWebhook(newUrl.trim(), newEvents.split(',').map(s => s.trim()).filter(Boolean));
      setMessage('Webhook added');
      setNewUrl('');
      await load();
    } catch (e) { setMessage('Failed to add webhook: ' + String(e)); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWebhook(id);
      setMessage('Webhook deleted');
      await load();
    } catch (e) { setMessage('Failed to delete webhook: ' + String(e)); }
  };

  const handlePing = async (url: string, id: string) => {
    setTestResult({ ...testResult, [id]: 'Pinging...' });
    try {
      await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      setTestResult({ ...testResult, [id]: 'Sent (no-cors mode - check server logs)' });
    } catch {
      setTestResult({ ...testResult, [id]: 'Failed to reach URL' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg p-4 bg-gray-50">
        <h4 className="text-sm font-medium mb-2">Add Webhook</h4>
        <div className="flex gap-2">
          <input type="text" placeholder="https://example.com/webhook"
            value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
            className="flex-1 border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          <select value={newEvents} onChange={(e) => setNewEvents(e.target.value)}
            className="border rounded px-3 py-2 text-sm">
            <option value="ticket.created,ticket.updated">Tickets</option>
            <option value="stage_changed,fix_completed">Pipeline</option>
            <option value="release">Releases</option>
            <option value="*">All events</option>
          </select>
          <button onClick={handleAdd}
            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 shrink-0">
            + Add
          </button>
        </div>
      </div>

      {message && <p className={'text-sm ' + (message.includes('Failed') ? 'text-red-600' : 'text-green-600')}>{message}</p>}

      {loading ? <p className="text-sm text-gray-400">Loading...</p> : webhooks.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">No webhooks configured</p>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh: any) => (
            <div key={wh.id} className="border rounded-lg p-3 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-mono truncate">{wh.url}</p>
                <p className="text-xs text-gray-400">{(wh.events || []).join(', ')} &middot; {new Date(wh.createdAt).toLocaleDateString()}</p>
                {testResult[wh.id] && <p className="text-xs text-gray-500 mt-0.5">{testResult[wh.id]}</p>}
              </div>
              <div className="flex gap-2 shrink-0 ml-3">
                <button onClick={() => handlePing(wh.url, wh.id)}
                  className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50">
                  Ping
                </button>
                <button onClick={() => handleDelete(wh.id)}
                  className="px-2 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
