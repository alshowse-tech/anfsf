/**
 * ANFSF — Project Dashboard (T-402)
 *
 * Displays a single project's five-stage pipeline progress.
 * Fetches real data from pipeline API when runId is provided.
 */

import React, { useState, useEffect } from 'react';
import { getApiToken } from '../api/client';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

function getAuthHeaders(): Record<string, string> {
  const token = getApiToken();
  return token ? { Authorization: 'Bearer ' + token } : {};
}

type ProjectState = string;

interface StageInfo {
  stage: number;
  name: string;
  state: 'pending' | 'active' | 'completed' | 'failed';
  completedAt?: string;
  summary?: string;
}

interface ProjectDashboardProps {
  projectName: string;
  projectState: ProjectState;
  stages: StageInfo[];
  currentStage: number;
  progress: { totalTasks: number; completedTasks: number };
  checkpoints: string[];
  onStageClick?: (stage: number) => void;
  runId?: string; // If provided, fetches real data from API
}

const STAGE_NAMES: Record<number, string> = {
  0: 'Knowledge',
  1: 'Requirements',
  2: 'Development',
  3: 'Verification',
  4: 'Testing',
  5: 'Release',
};

// Map RunStatus -> stage state
function statusToStages(run: any): StageInfo[] {
  const stages: StageInfo[] = [];
  const steps = run.steps || [];
  let foundActive = false;
  for (let i = 0; i <= 5; i++) {
    const completed = steps.some((s: any) => s.name && s.name.includes('stage' + i) && s.status === 'ok');
    const failed = steps.some((s: any) => s.name && s.name.includes('stage' + i) && s.status === 'error');
    const running = steps.some((s: any) => s.name && s.name.includes('stage' + i) && s.status === 'running');

    let state: StageInfo['state'] = 'pending';
    if (completed) state = 'completed';
    else if (failed) state = 'failed';
    else if (running || (!foundActive && run.status === 'running')) { state = 'active'; foundActive = true; }

    const step = steps.find((s: any) => s.name && s.name.includes('stage' + i));
    stages.push({
      stage: i,
      name: STAGE_NAMES[i] || 'Stage ' + i,
      state,
      completedAt: step?.completedAt ? new Date(step.completedAt).toLocaleString() : undefined,
      summary: step?.message,
    });
  }
  return stages;
}

function estimateProgress(stages: StageInfo[]): { totalTasks: number; completedTasks: number } {
  const completed = stages.filter(s => s.state === 'completed').length;
  return { totalTasks: 6, completedTasks: completed };
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projectName,
  projectState,
  stages: propStages,
  currentStage: propCurrentStage,
  progress: propProgress,
  checkpoints: propCheckpoints,
  onStageClick,
  runId,
}) => {
  void projectState;
  const [fetchedRun, setFetchedRun] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!runId) return;
    setLoading(true);
    fetch(API_BASE + '/api/v1/pipeline/' + encodeURIComponent(runId) + '/status', {
      headers: getAuthHeaders(),
    }).then(r => r.json()).then(data => {
      setFetchedRun(data.run || data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [runId]);

  const stages = fetchedRun && runId ? statusToStages(fetchedRun) : propStages;
  const currentStage = fetchedRun && runId
    ? Math.max(0, stages.findIndex(s => s.state === 'active' || s.state === 'pending') - 1)
    : propCurrentStage;
  const progress = fetchedRun && runId ? estimateProgress(stages) : propProgress;
  const displayName = fetchedRun?.projectName || projectName;

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="project-dashboard max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{displayName}</h2>
        <p className="text-gray-500">Current Stage: {STAGE_NAMES[currentStage] || currentStage}</p>
      </div>

      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span>Overall Progress</span>
          <span>{progress.completedTasks}/{progress.totalTasks} stages</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: (progress.totalTasks > 0 ? (progress.completedTasks / progress.totalTasks) * 100 : 0) + '%' }} />
        </div>
      </div>

      <div className="space-y-0">
        {stages.map((stage) => (
          <div key={stage.stage} className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-2 rounded"
            onClick={() => onStageClick?.(stage.stage)}>
            <div className="flex flex-col items-center">
              <div className={'w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ' +
                (stage.state === 'completed' ? 'bg-green-500' :
                 stage.state === 'active' ? 'bg-blue-500 animate-pulse' :
                 stage.state === 'failed' ? 'bg-red-500' : 'bg-gray-300')}>
                {stage.state === 'completed' ? '✓' : stage.state === 'active' ? '●' : stage.state === 'failed' ? '✗' : '○'}
              </div>
              {stage.stage < 5 && <div className={'w-0.5 h-8 ' + (stage.state === 'completed' ? 'bg-green-300' : 'bg-gray-200')} />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{stage.name}</span>
                <span className={'text-xs px-2 py-0.5 rounded-full ' +
                  (stage.state === 'completed' ? 'bg-green-100 text-green-700' :
                   stage.state === 'active' ? 'bg-blue-100 text-blue-700' :
                   stage.state === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500')}>
                  {stage.state === 'completed' ? 'Done' : stage.state === 'active' ? 'Active' : stage.state === 'failed' ? 'Failed' : 'Pending'}
                </span>
              </div>
              {stage.summary && <p className="text-sm text-gray-500 mt-1">{stage.summary}</p>}
              {stage.completedAt && <p className="text-xs text-gray-400 mt-1">Completed {stage.completedAt}</p>}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 border-t pt-4">
        <h3 className="font-medium mb-2">Checkpoints ({propCheckpoints.length})</h3>
        <div className="text-sm text-gray-500">
          {propCheckpoints.length > 0 ? 'Latest: ' + propCheckpoints[propCheckpoints.length - 1] : 'No checkpoints yet'}
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
