import { useState, useEffect } from "react";
import { t } from "../i18n";

const API_BASE = import.meta.env.VITE_ANFSF_API || "";

interface Bottleneck { stage: string; avgDurationMs: number; p95DurationMs: number; totalRuns: number; }
interface StageSummary extends Bottleneck { failureRate: number; }
interface DashboardData { projects: { total: number }; pipeline: { totalRecords: number }; compile: { totalPatterns: number; uniquePatterns: number }; }

export default function EvolutionPanel() {
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([]);
  const [stages, setStages] = useState<StageSummary[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch(API_BASE + "/api/v1/knowledge/metrics/bottlenecks?thresholdMs=1000")
      .then(r => r.json()).then(d => { if (d.bottlenecks) setBottlenecks(d.bottlenecks); }).catch(() => {});
    fetch(API_BASE + "/api/v1/knowledge/metrics/stages")
      .then(r => r.json()).then(d => { if (d.stages) setStages(d.stages); }).catch(() => {});
    fetch(API_BASE + "/api/v1/dashboard")
      .then(r => r.json()).then(d => { if (d.data) setDashboard(d.data); }).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      {dashboard && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t("System Overview")}</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div><p className="text-2xl font-bold text-blue-600">{dashboard.projects.total}</p><p className="text-xs text-gray-500">{t("Projects")}</p></div>
            <div><p className="text-2xl font-bold text-green-600">{dashboard.pipeline.totalRecords}</p><p className="text-xs text-gray-500">{t("Pipeline Runs")}</p></div>
            <div><p className="text-2xl font-bold text-purple-600">{dashboard.compile.uniquePatterns}</p><p className="text-xs text-gray-500">Patterns</p></div>
          </div>
        </div>
      )}

      {bottlenecks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t("Bottleneck Analysis")}</h3>
          <div className="space-y-2">
            {bottlenecks.map((b, i) => (
              <div key={i} className="flex items-center justify-between border-b pb-2">
                <span className="text-sm font-medium text-gray-900">{b.stage}</span>
                <div className="text-xs text-gray-500">
                  <span className="mr-3">Avg: {(b.avgDurationMs / 1000).toFixed(1)}s</span>
                  <span className="mr-3">P95: {(b.p95DurationMs / 1000).toFixed(1)}s</span>
                  <span>{b.totalRuns} {t("runs")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stages.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t("Stage Metrics")}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b">
                <th className="text-left py-1">Stage</th><th className="text-right py-1">Avg</th>
                <th className="text-right py-1">P95</th><th className="text-right py-1">Fail Rate</th>
                <th className="text-right py-1">Runs</th>
              </tr></thead>
              <tbody>
                {stages.map((s, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1 text-gray-900">{s.stage}</td>
                    <td className="py-1 text-right">{(s.avgDurationMs / 1000).toFixed(1)}s</td>
                    <td className="py-1 text-right">{(s.p95DurationMs / 1000).toFixed(1)}s</td>
                    <td className="py-1 text-right">{(s.failureRate * 100).toFixed(0)}%</td>
                    <td className="py-1 text-right">{s.totalRuns}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {bottlenecks.length === 0 && stages.length === 0 && !dashboard && (
        <p className="text-sm text-gray-500 py-8 text-center">{t("No metrics available yet. Run some pipelines first.")}</p>
      )}
    </div>
  );
}