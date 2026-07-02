import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProjectDetail, fetchRuns, fetchFixes, fetchStageMetrics } from '../api/client';
import type { ProjectDetail as ProjectDetailType } from '../api/types';

export default function ProjectDetail() {
  const { projectId } = useParams();
  const [project, setProject] = useState<ProjectDetailType | null>(null);
  const [runs, setRuns] = useState<any[]>([]);
  const [fixes, setFixes] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      fetchProjectDetail(projectId).catch(() => null),
      fetchRuns({ limit: 50 }).then(({ runs }) => runs).catch(() => []),
      fetchFixes().catch(() => []),
      fetchStageMetrics().catch(() => []),
    ]).then(([proj, allRuns, fixData, stageData]) => {
      const projectRuns = allRuns.filter((r: any) => r.projectName === (proj as any)?.name);
      setProject(proj as any);
      setRuns(projectRuns);
      setFixes(fixData);
      setStages(stageData);
    }).catch(() => setError('Failed to load project details'));
  }, [projectId]);

  if (!projectId) return <div className="text-center py-12 text-gray-500">No project ID provided</div>;
  if (!project && !error) return <div className="text-center py-12 text-gray-500">Loading...</div>;
  if (error) return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;

  return (
    <div className="space-y-4">
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">{project?.name || 'Project'}</h2>
          <Link to={"/dashboard/" + projectId} className="text-blue-600 hover:text-blue-800 text-sm no-underline">Dashboard &rarr;</Link>
        </div>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Status: <span className="font-medium">{project?.projectState || 'N/A'}</span></p>
          <p>Tenant: <span className="font-medium">{project?.tenantId || 'N/A'}</span></p>
          <p>Created: <span className="font-medium">{project?.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}</span></p>
          {project?.prdText && <p className="text-xs text-gray-400 mt-1">PRD: {project.prdText.slice(0, 100)}...</p>}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Pipeline Runs ({runs.length})</h3>
        {runs.length === 0 ? <p className="text-sm text-gray-400 py-2 text-center">No runs</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-1.5">ID</th>
                  <th className="text-left px-3 py-1.5">Status</th>
                  <th className="text-left px-3 py-1.5">Steps</th>
                  <th className="text-left px-3 py-1.5">Time</th>
                  <th className="text-left px-3 py-1.5">View</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r: any, i: number) => (
                  <tr key={r.id || i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-1.5 font-mono text-xs">{r.id?.slice(0, 8) || '-'}</td>
                    <td className="px-3 py-1.5 text-xs">{r.status}</td>
                    <td className="px-3 py-1.5 text-xs">{r.stepCount || r.steps?.length || 0}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-500">{r.completedAt ? new Date(r.completedAt).toLocaleString() : '-'}</td>
                    <td className="px-3 py-1.5">{r.id && <Link to={"/result?runId=" + r.id} className="text-blue-600 text-xs no-underline">View</Link>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Fix Records ({fixes.length})</h3>
        {fixes.length === 0 ? <p className="text-sm text-gray-400 py-2 text-center">No fix records</p> : (
          <div className="space-y-1">
            {fixes.slice(0, 10).map((f: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm border-b pb-1">
                <span className={"px-1.5 py-0.5 rounded text-xs font-mono " + (f.fixStatus === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>{f.level}</span>
                <span className="flex-1 truncate text-xs">{f.issueDescription}</span>
                <span className="text-xs text-gray-400">{f.file}:{f.line}</span>
              </div>
            ))}
            {fixes.length > 10 && <p className="text-xs text-gray-400 mt-1">... and {fixes.length - 10} more</p>}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Stage Metrics</h3>
        {stages.length === 0 ? <p className="text-sm text-gray-400 py-2 text-center">No metrics</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-3 py-1.5">Stage</th>
                  <th className="text-left px-3 py-1.5">Avg</th>
                  <th className="text-left px-3 py-1.5">P95</th>
                  <th className="text-left px-3 py-1.5">Fail%</th>
                  <th className="text-left px-3 py-1.5">Runs</th>
                </tr>
              </thead>
              <tbody>
                {stages.map((s: any, i: number) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-1.5 text-xs">{s.stage}</td>
                    <td className="px-3 py-1.5 text-xs">{(s.avgDurationMs / 1000).toFixed(1)}s</td>
                    <td className="px-3 py-1.5 text-xs">{(s.p95DurationMs / 1000).toFixed(1)}s</td>
                    <td className="px-3 py-1.5 text-xs">{(s.failureRate * 100).toFixed(0)}%</td>
                    <td className="px-3 py-1.5 text-xs">{s.totalRuns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
