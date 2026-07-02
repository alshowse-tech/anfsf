import { useState } from 'react';
import LLMConfig from './LLMConfig';
import PipelineConfig from './PipelineConfig';
import NotificationConfig from './NotificationConfig';
import GiteaConfig from './GiteaConfig';
import MemberManager from './MemberManager';

function TenantManager() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">Tenant management allows you to create isolated workspaces for different teams or projects.</p>
      <div className="border rounded-lg p-6 text-center text-gray-400">
        <p>Tenant management UI coming in a future update.</p>
        <p className="text-xs mt-2">Currently all projects share the default tenant.</p>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'llm', label: 'LLM Config', component: LLMConfig },
  { key: 'pipeline', label: 'Pipeline Config', component: PipelineConfig },
  { key: 'notifications', label: 'Notifications', component: NotificationConfig },
  { key: 'tenants', label: 'Tenants', component: TenantManager },
  { key: 'gitea', label: 'Gitea Config', component: GiteaConfig },
  { key: 'members', label: 'Members', component: MemberManager },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('llm');

  const ActiveComponent = TABS.find(t => t.key === activeTab)?.component ?? LLMConfig;

  return (
    <div className="flex gap-6 min-h-[400px]">
      <nav className="w-48 shrink-0 space-y-1">
        {TABS.map(tab => (
          <button key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={
              'w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ' +
              (activeTab === tab.key
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-50 border border-transparent')
            }
          >
            {tab.label}
          </button>
        ))}
      </nav>
      <div className="flex-1 bg-white border rounded-lg p-6">
        <ActiveComponent />
      </div>
    </div>
  );
}
