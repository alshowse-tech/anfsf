import { useState, useEffect } from 'react';
import { fetchSkills, fetchTools } from '../api/client';
import type { SkillInfo, ToolInfo } from '../api/types';

export default function SkillsRegistry() {
  const [activeTab, setActiveTab] = useState<'skills' | 'tools'>('skills');
  const [skills, setSkills] = useState<SkillInfo[]>([]);
  const [tools, setTools] = useState<ToolInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchSkills().then(setSkills).catch(() => {}),
      fetchTools().then(setTools).catch(() => {}),
    ]).catch(() => setError('Failed to load'));
  }, []);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('skills')}
          className={`px-3 py-1 text-sm rounded-t ${activeTab === 'skills' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >Skills</button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-3 py-1 text-sm rounded-t ${activeTab === 'tools' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
        >Tool History</button>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {/* Skills Tab */}
      {activeTab === 'skills' && (
        <div className="space-y-2">
          {skills.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No skills registered</p>
          ) : skills.map((s, i) => (
            <div key={i} className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <span className="font-mono text-sm font-medium">{s.name}</span>
                <span className="text-xs text-gray-400 ml-2">v{s.version}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                s.status === 'loaded' ? 'bg-green-100 text-green-700'
                  : s.status === 'error' ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-500'
              }`}>{s.status}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tools Tab */}
      {activeTab === 'tools' && (
        <div className="space-y-2">
          {tools.length === 0 ? (
            <p className="text-center py-8 text-gray-400">No tools registered</p>
          ) : <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-2">Tool Name</th>
                  <th className="text-left px-4 py-2">Mode</th>
                  <th className="text-left px-4 py-2">Sandbox</th>
                  <th className="text-left px-4 py-2">Description</th>
                </tr>
              </thead>
              <tbody>
                {tools.map((t, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono text-xs">{t.name}</td>
                    <td className="px-4 py-2 text-xs">{t.mode}</td>
                    <td className="px-4 py-2 text-xs">{t.requiresSandbox ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{t.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
        </div>
      )}
    </div>
  );
}
