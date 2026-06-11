/**
 * ANFSF LLM Playground Page
 *
 * Manual LLM input, model selection, parameter tuning, and real-time response.
 * Connects to /api/v1/llm/* endpoints.
 */

import { useState, useEffect, useRef } from 'react';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('anfsf_api_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ModelInfo {
  id: string;
  provider: string;
  type: string;
}

export default function LLMPlayground() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'system', content: 'You are a helpful assistant.' },
  ]);
  const [input, setInput] = useState('');
  const [model, setModel] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState('');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<{ prompt_tokens: number; completion_tokens: number; total_tokens: number } | null>(null);
  const [totalUsage, setTotalUsage] = useState<{ prompt: number; completion: number; total: number } | null>(null);
  const [cost, setCost] = useState<{ promptCost: number; completionCost: number; totalCost: number; currency: string } | null>(null);
  const [circuitState, setCircuitState] = useState<{ state: string; failures: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels();
    fetchUsage();
  }, []);

  useEffect(() => {
    if (defaultModel && !model) setModel(defaultModel);
  }, [defaultModel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/llm/models`, { headers: getAuthHeaders() });
      const data = await res.json();
      setModels(data.models || []);
      setDefaultModel(data.defaultModel || '');
    } catch { /* ignore */ }
  };

  const fetchUsage = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/llm/usage`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.usage) setTotalUsage({
        prompt: data.usage.prompt_tokens,
        completion: data.usage.completion_tokens,
        total: data.usage.total_tokens,
      });
      if (data.cost) setCost(data.cost);
      if (data.circuit) setCircuitState({ state: data.circuit.state, failures: data.circuit.failures });
    } catch { /* ignore */ }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    const history = [...messages, userMsg];

    try {
      const res = await fetch(`${API_BASE}/api/v1/llm/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          messages: history,
          model: model || undefined,
          temperature: temperature,
          max_tokens: maxTokens ? parseInt(maxTokens, 10) : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setError(err.message || err.error || 'LLM call failed');
        setLoading(false);
        return;
      }

      const data = await res.json();
      const assistantMsg: Message = { role: 'assistant', content: data.content };
      setMessages(prev => [...prev, assistantMsg]);
      setUsage(data.usage || null);
      setCost(data.cost || null);
      fetchUsage();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    }
    setLoading(false);
  };

  const resetCounters = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/llm/reset`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      fetchUsage();
    } catch { /* ignore */ }
  };

  const resetCircuit = async () => {
    try {
      await fetch(`${API_BASE}/api/v1/llm/reset-circuit`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      fetchUsage();
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">LLM Playground</h2>

      {/* Config bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            >
              {models.map(m => (
                <option key={m.id} value={m.id}>{m.id}</option>
              ))}
              {!models.length && <option value={model}>{model}</option>}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Temperature: {temperature.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Max Tokens</label>
            <input
              type="number"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              placeholder="auto"
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm"
            />
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={resetCounters}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Reset Counters
            </button>
            <button
              onClick={resetCircuit}
              className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Reset Circuit
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        {totalUsage && (
          <>
            <span>Prompt tokens: <strong>{totalUsage.prompt.toLocaleString()}</strong></span>
            <span>Completion tokens: <strong>{totalUsage.completion.toLocaleString()}</strong></span>
            <span>Total: <strong>{totalUsage.total.toLocaleString()}</strong></span>
          </>
        )}
        {cost && (
          <span>Cost: <strong>{cost.totalCost.toFixed(6)} {cost.currency}</strong></span>
        )}
        {circuitState && (
          <span>Circuit: <strong className={circuitState.state === 'open' ? 'text-red-600' : 'text-green-600'}>{circuitState.state}</strong></span>
        )}
        {usage && (
          <span>Last call: {usage.prompt_tokens}p / {usage.completion_tokens}c</span>
        )}
      </div>

      {/* Chat */}
      <div className="bg-white rounded-lg shadow flex flex-col" style={{ height: '500px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.filter(m => m.role !== 'system').map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
              </div>
            </div>
          ))}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm">{error}</div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
