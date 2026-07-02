import { useState, useEffect } from 'react';
import { fetchPipelineConfig, updatePipelineConfig } from '../api/client';
import type { PipelineConfigData } from '../api/types';

export default function PipelineConfig() {
  const [config, setConfig] = useState<PipelineConfigData>({
    maxRetries: 2, llmTimeout: 180000, bottleneckThreshold: 1000,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchPipelineConfig().then(setConfig).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePipelineConfig(config);
      setMessage('Configuration saved');
    } catch (e) {
      setMessage('Save failed: ' + String(e));
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Max Retries</label>
        <input type="number" min={0} max={10}
          value={config.maxRetries}
          onChange={(e) => setConfig({ ...config, maxRetries: parseInt(e.target.value) || 0 })}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Number of retry attempts when a stage fails</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">LLM Timeout (ms)</label>
        <input type="number" min={10000} max={600000} step={10000}
          value={config.llmTimeout}
          onChange={(e) => setConfig({ ...config, llmTimeout: parseInt(e.target.value) || 180000 })}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Maximum wait time for LLM responses (default: 180s)</p>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bottleneck Threshold (ms)</label>
        <input type="number" min={100} max={60000} step={100}
          value={config.bottleneckThreshold}
          onChange={(e) => setConfig({ ...config, bottleneckThreshold: parseInt(e.target.value) || 1000 })}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">Stages exceeding this duration are flagged as bottlenecks</p>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button onClick={() => { fetchPipelineConfig().then(setConfig); setMessage('Reset to saved'); }}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50">
          Reset
        </button>
      </div>
      {message && <p className={'text-sm ' + (message.includes('failed') || message.includes('Failed') ? 'text-red-600' : 'text-green-600')}>{message}</p>}
    </div>
  );
}
