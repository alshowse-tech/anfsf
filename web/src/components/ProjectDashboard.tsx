/**
 * ANFSF — Project Dashboard (T-402)
 *
 * Displays a single project's five-stage pipeline progress.
 * Phase 1: single project view. Phase 2: multi-project layout.
 */

import React from 'react';

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
}

const STAGE_NAMES: Record<number, string> = {
  0: '知识注入',
  1: '需求确认',
  2: '开发积累',
  3: '联调验证',
  4: '测试修复',
  5: '发布归档',
};

function stageColor(state: StageInfo['state']): string {
  switch (state) {
    case 'completed': return 'bg-green-500';
    case 'active': return 'bg-blue-500 animate-pulse';
    case 'failed': return 'bg-red-500';
    default: return 'bg-gray-300';
  }
}

function stageIcon(state: StageInfo['state']): string {
  switch (state) {
    case 'completed': return '✓';
    case 'active': return '●';
    case 'failed': return '✗';
    default: return '○';
  }
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({
  projectName,
  stages,
  currentStage,
  progress,
  checkpoints,
  onStageClick,
}) => {
  return (
    <div className="project-dashboard max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">{projectName}</h2>
        <p className="text-gray-500">当前阶段: {STAGE_NAMES[currentStage] || currentStage}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between text-sm mb-2">
          <span>整体进度</span>
          <span>{progress.completedTasks}/{progress.totalTasks} 任务</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all"
            style={{ width: `${progress.totalTasks > 0 ? (progress.completedTasks / progress.totalTasks) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Five-Stage Timeline */}
      <div className="space-y-0">
        {stages.map((stage) => (
          <div
            key={stage.stage}
            className="flex items-start gap-4 cursor-pointer hover:bg-gray-50 p-2 rounded"
            onClick={() => onStageClick?.(stage.stage)}
          >
            {/* Stage indicator */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${stageColor(stage.state)}`}>
                {stageIcon(stage.state)}
              </div>
              {stage.stage < 5 && (
                <div className={`w-0.5 h-8 ${stage.state === 'completed' ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>

            {/* Stage info */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium">{STAGE_NAMES[stage.stage]}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  stage.state === 'completed' ? 'bg-green-100 text-green-700' :
                  stage.state === 'active' ? 'bg-blue-100 text-blue-700' :
                  stage.state === 'failed' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {stage.state === 'completed' ? '已完成' :
                   stage.state === 'active' ? '进行中' :
                   stage.state === 'failed' ? '失败' : '待执行'}
                </span>
              </div>
              {stage.summary && <p className="text-sm text-gray-500 mt-1">{stage.summary}</p>}
              {stage.completedAt && <p className="text-xs text-gray-400 mt-1">完成于 {stage.completedAt}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Checkpoints */}
      <div className="mt-6 border-t pt-4">
        <h3 className="font-medium mb-2">检查点快照 ({checkpoints.length})</h3>
        <div className="text-sm text-gray-500">
          {checkpoints.length > 0
            ? `最近检查点: ${checkpoints[checkpoints.length - 1]}`
            : '暂无检查点'}
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
