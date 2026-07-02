import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchRunDetail } from '../api/client';
import ProjectDashboard from './ProjectDashboard';

function statusToStages(run: any): any[] {
  const stages = [];
  if (run.status === 'running' || run.status === 'done' || run.status === 'failed') stages.push({ state: 'completed' });
  const steps = run.steps || [];
  for (const s of steps) stages.push({ state: s.status === 'ok' ? 'completed' : 'active', name: s.name });
  return stages;
}

export default function ProjectDashboardBase() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [runDetail, setRunDetail] = useState<any>(null);

  useEffect(() => {
    if (projectId) fetchRunDetail(projectId).then(setRunDetail).catch(() => {});
  }, [projectId]);

  const handleStageClick = (stage: number) => {
    const routes: Record<number, string> = {
      0: '/require?runId=' + projectId,
      1: '/require/review?projectId=' + projectId,
      2: '/dev?projectId=' + projectId,
      3: '/verify?projectId=' + projectId,
      4: '/test?projectId=' + projectId,
      5: '/release?projectId=' + projectId,
    };
    const target = routes[stage];
    if (target) navigate(target);
  };

  const projectName = runDetail?.projectName || projectId || '';
  const stages = runDetail ? statusToStages(runDetail) : [];
  const progress = stages.length > 0
    ? { totalTasks: 6, completedTasks: stages.filter((s: any) => s.state === 'completed').length }
    : { totalTasks: 6, completedTasks: 0 };

  return (
    <ProjectDashboard
      projectName={projectName}
      projectState={runDetail?.status || 'created'}
      stages={stages}
      currentStage={stages.findIndex((s: any) => s.state === 'active')}
      progress={progress}
      checkpoints={[]}
      onStageClick={handleStageClick}
      runId={projectId}
    />
  );
}
