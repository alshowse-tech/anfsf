/**
 * ANFSF Confirmation Review Page
 *
 * Allows users to review PRD analysis results and approve/reject/modify.
 * Connects to /api/v1/confirmation endpoints.
 */

import { useState, useEffect } from 'react';
import { getApiToken } from '../api/client';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

function getAuthHeaders(): Record<string, string> {
  const token = getApiToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Confirmation {
  id: string;
  proposal: {
    id: string;
    description: string;
    kpiImpact: Record<string, number>;
    budgetImpact: number;
    riskScore: number;
    changes: unknown[];
  };
  requestedAt: number;
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'expired' | 'cancelled';
  response?: {
    reviewer: string;
    status: string;
    reviewedAt: number;
    comments?: string;
    modifications?: unknown[];
  };
  timeoutMs: number;
}

export default function ConfirmationReview() {
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [selected, setSelected] = useState<Confirmation | null>(null);
  const [loading, setLoading] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [history, setHistory] = useState<Confirmation[]>([]);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/confirmation`, { headers: getAuthHeaders() });
      const data = await res.json();
      setConfirmations(data.confirmations || []);
    } catch {
      setConfirmations([]);
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/confirmation/history`, { headers: getAuthHeaders() });
      const data = await res.json();
      setHistory(data.history || []);
    } catch {
      setHistory([]);
    }
  };

  useEffect(() => {
    fetchPending();
    fetchHistory();
  }, []);

  const createConfirmation = async () => {
    if (!newDescription.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/confirmation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ description: newDescription.trim() }),
      });
      if (res.ok) {
        setNewDescription('');
        fetchPending();
        setActionResult('Confirmation created successfully');
      } else {
        const err = await res.json();
        setActionResult(`Error: ${err.error || 'Failed'}`);
      }
    } catch (e) {
      setActionResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    setLoading(false);
  };

  const doAction = async (id: string, action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/confirmation/${id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ comments: comment }),
      });
      if (res.ok) {
        setActionResult(`Successfully ${action}d`);
        setComment('');
        setSelected(null);
        fetchPending();
        fetchHistory();
      } else {
        const err = await res.json();
        setActionResult(`Error: ${err.error || 'Failed'}`);
      }
    } catch (e) {
      setActionResult(`Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Human Confirmation</h2>

      {/* Create new confirmation */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Create Confirmation Request</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Describe the proposal to review..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && createConfirmation()}
          />
          <button
            onClick={createConfirmation}
            disabled={loading || !newDescription.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </div>

      {actionResult && (
        <div className={`p-3 rounded-md text-sm ${actionResult.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {actionResult}
          <button onClick={() => setActionResult(null)} className="ml-2 text-gray-400 hover:text-gray-600">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['pending', 'history'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'pending' ? `Pending (${confirmations.length})` : 'History'}
          </button>
        ))}
      </div>

      {/* Pending list */}
      {activeTab === 'pending' && (
        <div className="space-y-2">
          {confirmations.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No pending confirmations</p>
          ) : (
            confirmations.map((c) => (
              <div key={c.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.proposal.description}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span>Risk: {(c.proposal.riskScore * 100).toFixed(0)}%</span>
                      <span>Budget impact: {c.proposal.budgetImpact.toFixed(2)}</span>
                      <span>Created: {new Date(c.requestedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => setSelected(c)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Review
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* History */}
      {activeTab === 'history' && (
        <div className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No history yet</p>
          ) : (
            history.map((c) => (
              <div key={c.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.proposal.description}</p>
                    <div className="flex gap-4 mt-1 text-xs text-gray-500">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          c.response?.status === 'approved' ? 'bg-green-100 text-green-700' :
                          c.response?.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          c.response?.status === 'modified' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {c.response?.status || c.status}
                      </span>
                      {c.response?.comments && <span>{c.response.comments}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Confirmation</h3>
            <p className="text-sm text-gray-700 mb-4">{selected.proposal.description}</p>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Risk Score:</span>
                <span className="ml-2 font-medium">{(selected.proposal.riskScore * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-500">Budget Impact:</span>
                <span className="ml-2 font-medium">{selected.proposal.budgetImpact.toFixed(2)}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add comments..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setSelected(null); setComment(''); }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => doAction(selected.id, 'reject')}
                disabled={loading}
                className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => doAction(selected.id, 'approve')}
                disabled={loading}
                className="px-4 py-2 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
