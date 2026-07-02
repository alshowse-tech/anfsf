import { useState, useEffect } from 'react';
import { fetchLLMConfig, updateLLMConfig } from '../api/client';
import type { LLMConfigData } from '../api/types';


export default function LLMConfig() {
  const [config, setConfig] = useState<LLMConfigData>({
    apiKey: '', baseUrl: '', defaultModel: 'qwen3.5-plus',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<string | null>(null);

  useEffect(() => {
    fetchLLMConfig().then(setConfig).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateLLMConfig(config);
      setMessage('Configuration saved');
    } catch (e) {
      setMessage('Save failed: ' + String(e));
    }
    setSaving(false);
  };

  const handleTestConnection = async () => {
    if (!config.baseUrl) { setTestResult('Please enter a Base URL first'); return; }
    setTestResult('Testing...');
    try {
      const res = await fetch(config.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + config.apiKey,
        },
        body: JSON.stringify({
          model: config.defaultModel,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
      });
      setTestResult(res.ok ? 'Connected successfully' : 'Failed: HTTP ' + res.status);
    } catch (e) {
      setTestResult('Cannot connect: ' + String(e));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
          placeholder="Enter your API key"
          className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Stored locally in .anfsf/llm-config.json</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Base URL</label>
        <input
          type="text"
          value={config.baseUrl}
          onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
          placeholder="https://api.example.com/v1"
          className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Default Model</label>
        <select
          value={config.defaultModel}
          onChange={(e) => setConfig({ ...config, defaultModel: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="qwen3.5-plus">Qwen 3.5 Plus</option>
          <option value="deepseek-chat">DeepSeek Chat</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4o-mini">GPT-4o Mini</option>
          <option value="claude-3-opus">Claude 3 Opus</option>
          <option value="claude-3-sonnet">Claude 3 Sonnet</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleTestConnection}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
          Test Connection
        </button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
      {message && <p className={'text-sm ' + (message.includes('failed') || message.includes('Failed') ? 'text-red-600' : 'text-green-600')}>{message}</p>}
      {testResult && <p className={'text-sm ' + (testResult.startsWith('Connected') ? 'text-green-600' : testResult === 'Testing...' ? 'text-gray-500' : 'text-red-600')}>{testResult}</p>}
    </div>
  );
}
