/**
 * ANFSF — Developer Workspace (T-403)
 *
 * Shows a developer's assigned tasks across projects.
 * Phase 1: single project, simple task list.
 * Phase 2: multi-project cross-context recovery.
 */

import React, { useState } from 'react';

interface DevTask {
  id: string;
  title: string;
  description: string;
  files: string[];
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  status: 'pending' | 'in_progress' | 'completed';
  estimatedHours: number;
  projectName: string;
  lastEditFile?: string;
  lastEditLine?: number;
  lastCommitMessage?: string;
}

interface DeveloperWorkspaceProps {
  tasks: DevTask[];
  onTaskClick?: (task: DevTask) => void;
  onMarkComplete?: (taskId: string) => void;
}

function priorityColor(p: string): string {
  switch (p) {
    case 'P0': return 'bg-red-100 text-red-700';
    case 'P1': return 'bg-yellow-100 text-yellow-700';
    case 'P2': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-500';
  }
}

function statusIcon(s: string): string {
  switch (s) {
    case 'completed': return '✅';
    case 'in_progress': return '🔄';
    default: return '⬜';
  }
}

export const DeveloperWorkspace: React.FC<DeveloperWorkspaceProps> = ({
  tasks,
  onTaskClick,
  onMarkComplete,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress'>('all');

  const filtered = filter === 'all'
    ? tasks
    : tasks.filter(t => t.status === filter);

  const sorted = [...filtered].sort((a, b) => {
    const order = { P0: 0, P1: 1, P2: 2, P3: 3 };
    return order[a.priority] - order[b.priority];
  });

  return (
    <div className="developer-workspace max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-2">我的工作台</h2>
      <p className="text-gray-500 mb-4">
        {tasks.filter(t => t.status !== 'completed').length} 个待处理任务
      </p>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'in_progress'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-sm ${filter === f ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {f === 'all' ? '全部' : f === 'pending' ? '待处理' : '进行中'}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      <div className="space-y-3">
        {sorted.map(task => (
          <div
            key={task.id}
            className="border rounded-lg p-4 hover:shadow cursor-pointer"
            onClick={() => onTaskClick?.(task)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">{statusIcon(task.status)}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(task.priority)}`}>
                  {task.priority}
                </span>
                <span className="font-medium">{task.title}</span>
              </div>
              <span className="text-xs text-gray-400">{task.projectName}</span>
            </div>

            <p className="text-sm text-gray-600 mb-2">{task.description}</p>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{task.files.length} 文件</span>
              <span>预估 {task.estimatedHours}h</span>
              {task.lastEditFile && (
                <span className="text-blue-500">
                  📍 {task.lastEditFile}:{task.lastEditLine}
                </span>
              )}
            </div>

            {/* Context recovery hint */}
            {task.status === 'in_progress' && task.lastCommitMessage && (
              <div className="mt-2 text-xs bg-blue-50 text-blue-600 p-2 rounded">
                💡 上次提交: {task.lastCommitMessage}
              </div>
            )}

            {/* Mark complete button */}
            {task.status !== 'completed' && (
              <button
                onClick={(e) => { e.stopPropagation(); onMarkComplete?.(task.id); }}
                className="mt-2 px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                ✓ 标记完成
              </button>
            )}
          </div>
        ))}

        {sorted.length === 0 && (
          <p className="text-gray-400 text-center py-8">暂无任务 🎉</p>
        )}
      </div>
    </div>
  );
};

export default DeveloperWorkspace;
