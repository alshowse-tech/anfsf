import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { t } from "../i18n";

const API_BASE = import.meta.env.VITE_ANFSF_API || "";

interface ProjectSummary {
  id: string; name: string; projectState: string; createdAt: number;
}
interface DashboardData {
  projects: { total: number; byState: Record<string, number> };
  pipeline: { totalRecords: number };
  timestamp: number;
}

export default function HomeDashboard() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(API_BASE + "/api/v1/projects")
      .then(r => r.json())
      .then(d => { if (d.projects) setProjects(d.projects); })
      .catch(() => {});
    fetch(API_BASE + "/api/v1/dashboard")
      .then(r => r.json())
      .then(d => { if (d.data) setDashboard(d.data); })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">{t("Projects")}</h2>
        <div className="flex items-center gap-3">
          <Link to="/projects" className="text-sm text-blue-600 hover:text-blue-700 no-underline">
            {t("View all")} →
          </Link>
        <button onClick={() => navigate("/require")}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
          {t("+ New Project")}
        </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">{t("No projects yet")}</p>
          <p className="text-sm text-gray-400 mb-4">
            {t("Create your first project to start the pipeline")}
          </p>
          <button onClick={() => navigate("/require")}
            className="px-6 py-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
            {t("Create Project")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(p => (
            <Link key={p.id} to={"/require?projectId=" + p.id}
              className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow no-underline">
              <h3 className="font-medium text-gray-900 truncate">{p.name}</h3>
              <p className="text-xs text-gray-500 mt-1">{p.projectState}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}

      {dashboard && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            {t("System Health")}
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">
                {dashboard.projects.total}
              </p>
              <p className="text-xs text-gray-500">{t("Projects")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {dashboard.pipeline.totalRecords}
              </p>
              <p className="text-xs text-gray-500">{t("Pipeline Runs")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">
                {Object.keys(dashboard.projects.byState).length}
              </p>
              <p className="text-xs text-gray-500">{t("Active Stages")}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
