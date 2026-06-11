/**
 * ANFSF Test Feedback & Optimization Page
 *
 * Allows users to submit test feedback, track optimizations,
 * and manage rollbacks and freezes.
 */

import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('anfsf_api_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Lesson {
  category: string;
  title: string;
  description: string;
  action: 'do' | 'avoid' | 'consider';
  confidence: number;
}

interface Snapshot {
  version: string;
  label: string;
  proposalId: string;
  createdAt: number;
  metadata?: { riskScore?: number; budgetImpact?: number };
}

type TabKey = 'lessons' | 'snapshots' | 'freeze';

export default function TestFeedback() {
  const [activeTab, setActiveTab] = useState<TabKey>('lessons');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Test Feedback & Optimization</h2>

      <div className="flex gap-2 border-b">
        {([
          ['lessons', 'Lessons'],
          ['snapshots', 'Snapshots'],
          ['freeze', 'Freeze'],
        ] as [TabKey, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'lessons' && <LessonsTab />}
      {activeTab === 'snapshots' && <SnapshotsTab />}
      {activeTab === 'freeze' && <FreezeTab />}
    </div>
  );
}

function LessonsTab() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: 'pipeline' as Lesson['category'], title: '', description: '', action: 'do' as Lesson['action'], confidence: 0.8 });
  const [result, setResult] = useState<string | null>(null);

  const fetchLessons = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/feedback/lessons`, { headers: getAuthHeaders() });
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchLessons(); }, []);

  const submitLesson = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/feedback/lessons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setResult('Lesson saved');
        setForm({ ...form, title: '', description: '' });
        fetchLessons();
      } else {
        const err = await res.json();
        setResult(`Error: ${err.error || 'Failed'}`);
      }
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    setLoading(false);
  };

  const ACTION_COLORS = { do: 'bg-green-100 text-green-700', avoid: 'bg-red-100 text-red-700', consider: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="space-y-4">
      {/* Add lesson form */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Add Test Feedback Lesson</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Lesson['category'] })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              {['architecture', 'pipeline', 'quality', 'performance', 'reliability', 'ux'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select
              value={form.action}
              onChange={(e) => setForm({ ...form, action: e.target.value as Lesson['action'] })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              <option value="do">Do (recommended)</option>
              <option value="avoid">Avoid (anti-pattern)</option>
              <option value="consider">Consider (optional)</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              placeholder="Short title..."
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
              placeholder="Describe the lesson..."
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={submitLesson}
            disabled={loading || !form.title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Save Lesson
          </button>
          {result && <span className="text-xs text-gray-500">{result}</span>}
        </div>
      </div>

      {/* Lessons list */}
      <div className="space-y-2">
        {lessons.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No lessons recorded yet</p>
        ) : (
          lessons.map((l, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start gap-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${ACTION_COLORS[l.action] || 'bg-gray-100'}`}>
                  {l.action.toUpperCase()}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{l.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{l.description}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    <span>{l.category}</span>
                    <span>Confidence: {(l.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SnapshotsTab() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/feedback/snapshots`, { headers: getAuthHeaders() });
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  const createSnapshot = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/feedback/snapshots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ description: description.trim() }),
      });
      if (res.ok) {
        setResult('Snapshot created');
        setDescription('');
        fetchSnapshots();
      } else {
        const err = await res.json();
        setResult(`Error: ${err.error || 'Failed'}`);
      }
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Create Version Snapshot</h3>
        <div className="flex gap-2">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Snapshot label..."
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            onKeyDown={(e) => e.key === 'Enter' && createSnapshot()}
          />
          <button
            onClick={createSnapshot}
            disabled={loading || !description.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Snapshot
          </button>
        </div>
        {result && <p className="text-xs text-gray-500 mt-2">{result}</p>}
      </div>

      <div className="space-y-2">
        {snapshots.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No snapshots yet</p>
        ) : (
          snapshots.map((s) => (
            <div key={s.version} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-mono text-gray-900">{s.version}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
                <div className="text-right text-xs text-gray-400">
                  <p>{new Date(s.createdAt).toLocaleString()}</p>
                  {s.metadata && (
                    <p>Risk: {(s.metadata.riskScore || 0).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FreezeTab() {
  const [status, setStatus] = useState<any>(null);
  const [freezeType, setFreezeType] = useState<'scheduled' | 'emergency' | 'manual'>('scheduled');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/feedback/freeze`, { headers: getAuthHeaders() });
      const data = await res.json();
      setStatus(data.freeze);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); }, []);

  const createFreeze = async () => {
    if (!reason.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/v1/feedback/freeze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ type: freezeType, reason: reason.trim() }),
      });
      if (res.ok) {
        setResult('Freeze created');
        setReason('');
        fetchStatus();
      } else {
        const err = await res.json();
        setResult(`Error: ${err.error || 'Failed'}`);
      }
    } catch (e) {
      setResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
  };

  const cancelFreeze = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/feedback/freeze/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        fetchStatus();
      }
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Current Status</h3>
        {status ? (
          <div className="text-sm">
            <p>
              Frozen: <strong className={status.isFrozen ? 'text-red-600' : 'text-green-600'}>{status.isFrozen ? 'Yes' : 'No'}</strong>
            </p>
            {status.currentFreeze && (
              <p className="text-xs text-gray-500 mt-1">
                {status.currentFreeze.reason} (until {new Date(status.currentFreeze.endAt).toLocaleString()})
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">Loading...</p>
        )}
      </div>

      {/* Create freeze */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Create Freeze</h3>
        <div className="grid grid-cols-2 gap-3">
          <select
            value={freezeType}
            onChange={(e) => setFreezeType(e.target.value as typeof freezeType)}
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
          >
            <option value="scheduled">Scheduled</option>
            <option value="emergency">Emergency</option>
            <option value="manual">Manual</option>
          </select>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason..."
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            onKeyDown={(e) => e.key === 'Enter' && createFreeze()}
          />
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={createFreeze}
            disabled={!reason.trim()}
            className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            Create Freeze
          </button>
          {result && <span className="text-xs text-gray-500 self-center">{result}</span>}
        </div>
      </div>

      {/* Active freezes */}
      {status?.activeFreezes && status.activeFreezes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Active Freezes</h3>
          {status.activeFreezes.map((f: any) => (
            <div key={f.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{f.reason}</p>
                <p className="text-xs text-gray-500">{f.type} · {f.createdBy} · {new Date(f.startAt).toLocaleString()}</p>
              </div>
              <button
                onClick={() => cancelFreeze(f.id)}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
