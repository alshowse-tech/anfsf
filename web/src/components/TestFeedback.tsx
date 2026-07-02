/**
 * ANFSF Test Feedback & Optimization Page (T-303)
 *
 * Tabs: Lessons / Fixes / Snapshots / Freeze
 * Fixes tab integrated with backend FixEngine.
 */

import { useState, useEffect } from 'react';

import { getApiToken } from '../api/client';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

function getAuthHeaders(): Record<string, string> {
  const token = getApiToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

interface FixRecord {
  id: string;
  projectId: string;
  level: 'L1' | 'L2' | 'L3';
  file: string;
  line: number;
  problemType: string;
  issueDescription: string;
  fixStatus: 'pending' | 'auto_fixed' | 'suggestion_ready' | 'dev_fixed' | 'located_only' | 'confirmed';
  fixedBy?: string;
  fixedAt?: number;
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
  metadata?: Record<string, number>;
}

interface TestFeedbackProps {
  projectId?: string;
}

type TabKey = 'fixes' | 'lessons' | 'snapshots' | 'freeze';
type TabKeyAll = TabKey | 'uat';

export default function TestFeedback(props: TestFeedbackProps) {
  const [activeTab, setActiveTab] = useState<TabKeyAll>('fixes');
  const pid = props.projectId || '';

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Test Feedback & Optimization</h2>

      <div className="flex gap-2 border-b overflow-x-auto">
        {([['fixes', 'Fixes'], ['lessons', 'Lessons'], ['uat', 'UAT Review'], ['snapshots', 'Snapshots'], ['freeze', 'Freeze']] as [TabKeyAll, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={'px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap ' + (activeTab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'fixes' && <FixesTab projectId={pid} />}
      {activeTab === 'lessons' && <LessonsTab />}
      {activeTab === 'snapshots' && <SnapshotsTab />}
      {activeTab === 'freeze' && <FreezeTab />}
      {activeTab === 'uat' && <UATReviewTab projectId={pid} />}
    </div>
  );
}

// ============================================================================
// Fixes Tab (new, T-303)
// ============================================================================

function FixesTab({ projectId }: { projectId: string }) {
  const [fixes, setFixes] = useState<FixRecord[]>([]);

  const fetchFixes = async () => {
    try {
      const params = projectId ? '?projectId=' + encodeURIComponent(projectId) : '';
      const res = await fetch(API_BASE + '/api/v1/feedback/fixes' + params, { headers: getAuthHeaders() });
      const data = await res.json();
      setFixes(data.fixes || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchFixes(); }, [projectId]);

  const updateStatus = async (id: string, status: FixRecord['fixStatus']) => {
    try {
      await fetch(API_BASE + '/api/v1/feedback/fixes/' + id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ fixStatus: status }),
      });
      fetchFixes();
    } catch { /* ignore */ }
  };

  const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    auto_fixed: 'bg-green-100 text-green-700',
    suggestion_ready: 'bg-blue-100 text-blue-700',
    dev_fixed: 'bg-yellow-100 text-yellow-700',
    located_only: 'bg-orange-100 text-orange-700',
    confirmed: 'bg-green-100 text-green-700',
  };

  const LEVEL_LABELS: Record<string, string> = {
    L1: 'Auto',
    L2: 'Suggest',
    L3: 'Locate',
  };

  if (fixes.length === 0) {
    return <p className="text-sm text-gray-500 py-8 text-center">No fix records yet. Submit PM feedback to generate fix items.</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-400 mb-2">{fixes.length} fix record(s)</p>
      {fixes.map((f) => (
        <div key={f.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={'px-1.5 py-0.5 rounded text-xs font-mono ' + (STATUS_COLORS[f.fixStatus] || 'bg-gray-100')}>{f.fixStatus}</span>
                <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-purple-100 text-purple-700">{LEVEL_LABELS[f.level] || f.level}</span>
                <span className="text-xs text-gray-400 truncate">{f.file}:{f.line}</span>
              </div>
              <p className="text-sm text-gray-900">{f.issueDescription}</p>
              <p className="text-xs text-gray-400 mt-1">{f.problemType} · {f.projectId}</p>
            </div>
            <div className="flex gap-1 ml-2 shrink-0">
              {(f.fixStatus === 'suggestion_ready' || f.fixStatus === 'located_only') && (
                <button onClick={() => updateStatus(f.id, 'dev_fixed')}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Fix Done</button>
              )}
              {f.fixStatus === 'dev_fixed' && (
                <button onClick={() => updateStatus(f.id, 'confirmed')}
                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">Confirm</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Lessons Tab (existing)
// ============================================================================

function LessonsTab() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ category: 'pipeline' as Lesson['category'], title: '', description: '', action: 'do' as Lesson['action'], confidence: 0.8, projectId: '', file: '', line: 0 });
  const [result, setResult] = useState<string | null>(null);

  const fetchLessons = async () => {
    try {
      const res = await fetch(API_BASE + '/api/v1/feedback/lessons', { headers: getAuthHeaders() });
      const data = await res.json();
      setLessons(data.lessons || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchLessons(); }, []);

  const submitLesson = async () => {
    if (!form.title.trim() || !form.description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/v1/feedback/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setResult('Lesson saved. Fix record created for ' + form.category + ' feedback.');
        setForm({ ...form, title: '', description: '' });
        fetchLessons();
      } else {
        const err = await res.json();
        setResult('Error: ' + (err.error || 'Failed'));
      }
    } catch (e) {
      setResult('Error: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
    setLoading(false);
  };

  const ACTION_COLORS: Record<string, string> = { do: 'bg-green-100 text-green-700', avoid: 'bg-red-100 text-red-700', consider: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Add PM Feedback</h3>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Lesson['category'] })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm">
              {['architecture', 'pipeline', 'quality', 'performance', 'reliability', 'ux'].map(c => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
            <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value as Lesson['action'] })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm">
              <option value="do">Do</option><option value="avoid">Avoid</option><option value="consider">Consider</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Project ID</label>
            <input value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="Optional" />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm w-full" placeholder="Short title..." />
          </div>
          <div className="col-span-3">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="Describe the issue..." />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={submitLesson} disabled={loading || !form.title.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">Save Feedback</button>
          {result && <span className="text-xs text-gray-500">{result}</span>}
        </div>
      </div>

      <div className="space-y-2">
        {lessons.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No lessons recorded yet</p>
        ) : (
          lessons.map((l, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start gap-3">
                <span className={'px-2 py-0.5 rounded text-xs font-medium ' + (ACTION_COLORS[l.action] || 'bg-gray-100')}>{l.action.toUpperCase()}</span>
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

// ============================================================================
// Snapshots Tab (existing)
// ============================================================================

function SnapshotsTab() {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const fetchSnapshots = async () => {
    try {
      const res = await fetch(API_BASE + '/api/v1/feedback/snapshots', { headers: getAuthHeaders() });
      const data = await res.json();
      setSnapshots(data.snapshots || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchSnapshots(); }, []);

  const createSnapshot = async () => {
    if (!description.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/v1/feedback/snapshots', {
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
        setResult('Error: ' + (err.error || 'Failed'));
      }
    } catch (e) {
      setResult('Error: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Create Version Snapshot</h3>
        <div className="flex gap-2">
          <input value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Snapshot label..." className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
          <button onClick={createSnapshot} disabled={loading || !description.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">Snapshot</button>
        </div>
        {result && <p className="text-xs text-gray-500 mt-2">{result}</p>}
      </div>
      <div className="space-y-2">
        {snapshots.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center">No snapshots yet</p>
        ) : (
          snapshots.map((s) => (
            <div key={s.version} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div><p className="text-sm font-mono text-gray-900">{s.version}</p><p className="text-xs text-gray-500">{s.label}</p></div>
              <div className="text-right text-xs text-gray-400">
                <p>{new Date(s.createdAt).toLocaleString()}</p>
                {s.metadata && <p>Risk: {((s.metadata.riskScore || 0) as number).toFixed(2)}</p>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Freeze Tab (existing)
// ============================================================================

function FreezeTab() {
  const [status, setStatus] = useState<any>(null);
  const [freezeType, setFreezeType] = useState<'scheduled' | 'emergency' | 'manual'>('scheduled');
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch(API_BASE + '/api/v1/feedback/freeze', { headers: getAuthHeaders() });
      const data = await res.json();
      setStatus(data.freeze);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchStatus(); }, []);

  const createFreeze = async () => {
    if (!reason.trim()) return;
    try {
      const res = await fetch(API_BASE + '/api/v1/feedback/freeze', {
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
        setResult('Error: ' + (err.error || 'Failed'));
      }
    } catch (e) {
      setResult('Error: ' + (e instanceof Error ? e.message : 'Unknown'));
    }
  };

  const cancelFreeze = async (id: string) => {
    try {
      await fetch(API_BASE + '/api/v1/feedback/freeze/' + id, { method: 'DELETE', headers: getAuthHeaders() });
      fetchStatus();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Current Status</h3>
        {status ? (
          <div className="text-sm">
            <p>Frozen: <strong className={status.isFrozen ? 'text-red-600' : 'text-green-600'}>{status.isFrozen ? 'Yes' : 'No'}</strong></p>
            {status.currentFreeze && <p className="text-xs text-gray-500 mt-1">{status.currentFreeze.reason}</p>}
          </div>
        ) : <p className="text-xs text-gray-500">Loading...</p>}
      </div>
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Create Freeze</h3>
        <div className="grid grid-cols-2 gap-3">
          <select value={freezeType} onChange={(e) => setFreezeType(e.target.value as typeof freezeType)}
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm">
            <option value="scheduled">Scheduled</option><option value="emergency">Emergency</option><option value="manual">Manual</option>
          </select>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason..."
            className="px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
        </div>
        <button onClick={createFreeze} disabled={!reason.trim()}
          className="mt-2 px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50">Create Freeze</button>
        {result && <span className="text-xs text-gray-500 ml-2">{result}</span>}
      </div>
      {status?.activeFreezes?.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-700">Active Freezes</h3>
          {status.activeFreezes.map((f: any) => (
            <div key={f.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
              <div><p className="text-sm font-medium">{f.reason}</p><p className="text-xs text-gray-500">{f.type}</p></div>
              <button onClick={() => cancelFreeze(f.id)} className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Cancel</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
// ============================================================================
// UAT Review Tab (T-303)
// ============================================================================

function UATReviewTab({ projectId }: { projectId: string }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [projectInput, setProjectInput] = useState(projectId);

  const effectiveProject = projectId || projectInput;

  const fetchReviews = async () => {
    if (!effectiveProject) return;
    try {
      const res = await fetch(API_BASE + '/api/v1/uat/reviews?projectId=' + encodeURIComponent(effectiveProject));
      const data = await res.json();
      setReviews(data.reviews || []);
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchReviews(); }, [effectiveProject]);

  const submitReview = async (decision: string) => {
    if (!effectiveProject || !comment.trim()) { setMessage('Comment required'); return; }
    setLoading(true);
    try {
      const res = await fetch(API_BASE + '/api/v1/uat/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ projectId: effectiveProject, reviewer: 'PM', decision, comments: comment.trim() }),
      });
      if (res.ok) { setComment(''); setMessage('Review submitted'); fetchReviews(); }
      else { const err = await res.json(); setMessage('Error: ' + (err.error?.message || 'Failed')); }
    } catch (e) { setMessage('Error: ' + String(e)); }
    setLoading(false);
  };

  const lastDecision = reviews.length > 0 ? reviews[0].decision : null;
  const DECISION_COLORS: Record<string, string> = { approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', changes_requested: 'bg-yellow-100 text-yellow-700' };

  return (
    <div className="space-y-4">
      {!projectId && (
        <div className="flex gap-2">
          <input value={projectInput} onChange={e => setProjectInput(e.target.value)} placeholder="Enter Project ID..."
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
          <button onClick={fetchReviews} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">Load</button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Submit UAT Review</h3>
        {lastDecision && (
          <p className="text-xs text-gray-500 mb-2">Last decision: <span className={'px-1.5 py-0.5 rounded text-xs font-medium ' + (DECISION_COLORS[lastDecision] || '')}>{lastDecision}</span></p>
        )}
        <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
          className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm mb-2" placeholder="Review comments..." />
        <div className="flex gap-2">
          {['approved', 'changes_requested', 'rejected'].map(d => (
            <button key={d} onClick={() => submitReview(d)} disabled={loading || !comment.trim()}
              className={'px-3 py-1.5 rounded-md text-sm text-white disabled:opacity-50 ' + (d === 'approved' ? 'bg-green-600 hover:bg-green-700' : d === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700')}>
              {d === 'approved' ? 'Approve' : d === 'rejected' ? 'Reject' : 'Request Changes'}
            </button>
          ))}
        </div>
        {message && <p className="text-xs text-gray-500 mt-2">{message}</p>}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-700">Review History ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No reviews yet</p>
        ) : (
          reviews.map((r, i) => (
            <div key={r.id || i} className="bg-white rounded-lg shadow p-3">
              <div className="flex items-start gap-2">
                <span className={'px-1.5 py-0.5 rounded text-xs font-medium ' + (DECISION_COLORS[r.decision] || '')}>{r.decision}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">{r.reviewer} · {new Date(r.createdAt).toLocaleString()}</p>
                  {r.comments && <p className="text-sm text-gray-700 mt-1">{r.comments}</p>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ============================================================================
