import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { t } from "../i18n";

const API_BASE = import.meta.env.VITE_ANFSF_API || "";

interface FixRecord {
  id: string; level: string; file: string; line: number;
  issueDescription: string; fixStatus: string;
}

export default function VerifyPanel() {
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [fixes, setFixes] = useState<FixRecord[]>([]);
  const [message, setMessage] = useState("");
  const [showGuardDetails, setShowGuardDetails] = useState(false);
  const [guardResults, setGuardResults] = useState<any[]>([]);

  useEffect(() => {
    if (!projectId) return;
    fetch(API_BASE + "/api/v1/feedback/fixes?projectId=" + encodeURIComponent(projectId))
      .then(r => r.json()).then(d => { if (d.fixes) setFixes(d.fixes); }).catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetch(API_BASE + "/api/v1/pipeline/" + projectId + "/status")
      .then(r => r.json())
      .then(run => {
        const steps = run.steps || [];
        const guards = steps
          .filter((s: any) => s.name && s.name.startsWith('verify:'))
          .map((s: any) => ({
            tool: s.name.replace('verify:', ''),
            passed: s.status === 'ok',
            errors: [],
            warnings: [],
            durationMs: s.duration || 0,
          }));
        setGuardResults(guards);
      })
      .catch(() => {});
  }, [projectId]);


  const transitionState = async (state: string) => {
    if (!projectId) return;
    try {
      const res = await fetch(API_BASE + "/api/v1/projects/" + projectId + "/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state }),
      });
      const data = await res.json();
      setMessage(data.status === "ok" ? t("State updated to ") + state : "Error: " + (data.error?.message || "Failed"));
    } catch (e) { setMessage("Error: " + String(e)); }
  };

  const l1Count = fixes.filter(f => f.level === "L1").length;
  const l2Count = fixes.filter(f => f.level === "L2").length;
  const l3Count = fixes.filter(f => f.level === "L3").length;
  const confirmedCount = fixes.filter(f => f.fixStatus === "confirmed").length;
  const pendingCount = fixes.filter(f => f.fixStatus !== "confirmed").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={projectId} onChange={e => setProjectId(e.target.value)}
          placeholder={t("Enter Project ID")}
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
        <button onClick={() => {
          if (projectId) window.location.reload();
        }} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200">{t("Refresh")}</button>
      </div>

      {projectId && (
        <>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">{t("Verification Summary")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
                <p className="text-xs text-gray-500">{t("Confirmed Fixes")}</p>
              </div>
              <div className="border rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
                <p className="text-xs text-gray-500">{t("Pending Fixes")}</p>
              </div>
            </div>
            <div className="flex gap-3 mt-3 text-sm text-gray-600">
              <span>L1 Auto: {l1Count}</span>
              <span>L2 Suggest: {l2Count}</span>
              <span>L3 Manual: {l3Count}</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t("Fix Records")}</h3>
            {fixes.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">{t("No fixes found")}</p>
            ) : (
              <div className="space-y-2">
                {fixes.map(f => (
                  <div key={f.id} className="flex items-center gap-2 text-sm border-b pb-2">
                    <span className={"px-1.5 py-0.5 rounded text-xs font-mono " + (
                      f.fixStatus === "confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    )}>{f.level}</span>
                    <span className="flex-1 truncate">{f.issueDescription}</span>
                    <span className="text-xs text-gray-400">{f.file}:{f.line}</span>
                    <span className="text-xs text-gray-500">{f.fixStatus}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t("State Actions")}</h3>
            <div className="flex gap-2">
              <button onClick={() => transitionState("stage3_passed")}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-50"
                disabled={fixes.length === 0}>{t("Verify Passed → Stage 3")}</button>
              <button onClick={() => transitionState("stage4_testing")}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">{t("Enter Testing")}</button>
              <button onClick={() => transitionState("stage2_dev")}
                className="px-4 py-2 bg-yellow-600 text-white rounded-md text-sm hover:bg-yellow-700">{t("Back to Dev")}</button>
            </div>
            {message && <p className="text-xs text-gray-500 mt-2">{message}</p>}
          </div>
        <div className="bg-white rounded-lg shadow p-4">
          <button onClick={() => setShowGuardDetails(!showGuardDetails)}
            className="flex items-center justify-between w-full text-sm font-medium text-gray-700">
            <span>验证工具详情 ({guardResults.length})</span>
            <span>{showGuardDetails ? '▲' : '▼'}</span>
          </button>
          {showGuardDetails && (
            <div className="mt-3 space-y-2">
              {guardResults.length === 0 ? (
                <p className="text-sm text-gray-500 py-2 text-center">暂无可用的验证结果</p>
              ) : guardResults.map((g, i) => (
                <div key={i} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-mono font-medium">{g.tool}</span>
                    <span className={"text-xs px-2 py-0.5 rounded " + (g.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                      {g.passed ? '通过' : '未通过'}
                    </span>
                  </div>
                  {g.durationMs > 0 && (<p className="text-xs text-gray-400 mt-1">耗时: {(g.durationMs / 1000).toFixed(1)}s</p>)}
                </div>
              ))}
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
