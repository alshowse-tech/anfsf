import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { t } from "../i18n";

const API_BASE = import.meta.env.VITE_ANFSF_API || "";

interface FixRecord {
  id: string; projectId: string; level: string;
  file: string; line: number; issueDescription: string;
  problemType: string; fixStatus: string;
}

interface TicketItem {
  id: string; title: string; status: string; priority: string;
}

const FIX_STATUS_COLORS: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  auto_fixed: "bg-green-100 text-green-700",
  suggestion_ready: "bg-blue-100 text-blue-700",
  dev_fixed: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-green-100 text-green-700",
};

const LEVEL_LABELS: Record<string, string> = { L1: "Auto", L2: "Suggest", L3: "Manual" };

export default function DevWorkspaceV2() {
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [fixes, setFixes] = useState<FixRecord[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [activeTab, setActiveTab] = useState<"fixes" | "tickets">("fixes");
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchData = () => {
    if (!projectId) return;
    fetch(API_BASE + "/api/v1/feedback/fixes?projectId=" + encodeURIComponent(projectId))
      .then(r => r.json()).then(d => { if (d.fixes) setFixes(d.fixes); }).catch(() => setFetchError('加载修复记录失败'));
    fetch(API_BASE + "/api/v1/tickets?projectId=" + encodeURIComponent(projectId))
      .then(r => r.json()).then(d => { if (d.tickets) setTickets(d.tickets); }).catch(() => setFetchError('加载工单失败'));
  };

  useEffect(() => { fetchData(); }, [projectId]);

  const updateFixStatus = (id: string, status: string) => {
    fetch(API_BASE + "/api/v1/feedback/fixes/" + id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fixStatus: status }),
    }).then(fetchData).catch(() => setFetchError('更新修复状态失败'));
  };

  const pendingFixes = fixes.filter(f => f.fixStatus === "suggestion_ready" || f.fixStatus === "located_only");
  const confirmedCount = fixes.filter(f => f.fixStatus === "confirmed" || f.fixStatus === "dev_fixed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={projectId} onChange={e => setProjectId(e.target.value)}
          placeholder={t("Enter Project ID")}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
        <button onClick={fetchData}
          className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">{t("Load")}</button>
      </div>
      {fetchError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
          {fetchError}
          <button onClick={() => setFetchError(null)} className="ml-2 text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {projectId && (
        <>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t("Verification Feedback")}</h3>
            <div className="flex gap-4 text-sm">
              <span>L1 Auto: <strong>{fixes.filter(f => f.level === "L1").length}</strong></span>
              <span>L2 Suggest: <strong>{fixes.filter(f => f.level === "L2").length}</strong></span>
              <span>L3 Manual: <strong>{fixes.filter(f => f.level === "L3").length}</strong></span>
              <span>{t("Confirm")}: <strong className="text-green-600">{confirmedCount}</strong></span>
              <span>{t("Pending Fixes")}: <strong className="text-orange-600">{pendingFixes.length}</strong></span>
            </div>
          </div>

          <div className="flex gap-2 border-b">
            {(["fixes", "tickets"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={"px-4 py-2 text-sm font-medium border-b-2 " + (
                  activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                )}>{tab === "fixes" ? t("Fix Records") : t("Tickets")} ({tab === "fixes" ? fixes.length : tickets.length})</button>
            ))}
          </div>

          {activeTab === "fixes" && fixes.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">{t("No fix records for this project")}</p>
          )}
          {activeTab === "fixes" && fixes.map(f => (
            <div key={f.id} className="bg-white rounded-lg shadow p-3 flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={"px-1.5 py-0.5 rounded text-xs font-mono " + (FIX_STATUS_COLORS[f.fixStatus] || "bg-gray-100")}>{f.fixStatus}</span>
                  <span className="px-1.5 py-0.5 rounded text-xs font-mono bg-purple-100 text-purple-700">{LEVEL_LABELS[f.level] || f.level}</span>
                  <span className="text-xs text-gray-400 truncate">{f.file}:{f.line}</span>
                </div>
                <p className="text-sm text-gray-900">{f.issueDescription}</p>
                <p className="text-xs text-gray-400 mt-1">{f.problemType}</p>
              </div>
              <div className="flex gap-1 ml-2 shrink-0">
                {(f.fixStatus === "suggestion_ready" || f.fixStatus === "located_only") && (
                  <button onClick={() => updateFixStatus(f.id, "dev_fixed")}
                    className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">{t("Fix Done")}</button>
                )}
                {f.fixStatus === "dev_fixed" && (
                  <button onClick={() => updateFixStatus(f.id, "confirmed")}
                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700">{t("Confirm")}</button>
                )}
              </div>
            </div>
          ))}

          {activeTab === "tickets" && tickets.length === 0 && (
            <p className="text-sm text-gray-500 py-8 text-center">{t("No tickets for this project")}</p>
          )}
          {activeTab === "tickets" && tickets.map(t => (
            <div key={t.id} className="bg-white rounded-lg shadow p-3 flex items-center justify-between">
              <div>
                <span className={"px-1.5 py-0.5 rounded text-xs font-medium " + (
                  t.priority === "high" || t.priority === "critical"
                    ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                )}>{t.priority}</span>
                <span className="ml-2 text-sm text-gray-900">{t.title}</span>
              </div>
              <span className="text-xs text-gray-500">{t.status}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}