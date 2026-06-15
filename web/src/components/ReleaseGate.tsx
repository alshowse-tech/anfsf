import { useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE = import.meta.env.VITE_ANFSF_API || "";

export default function ReleaseGate() {
  const [searchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get("projectId") || "");
  const [systemChecked, setSystemChecked] = useState(false);
  const [pmChecked, setPmChecked] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [message, setMessage] = useState("");

  const canRelease = systemChecked && pmChecked && roleChecked;

  const action = async (endpoint: string, label: string) => {
    if (!projectId) { setMessage("Enter a Project ID"); return; }
    try {
      const res = await fetch(API_BASE + endpoint.replace(":id", projectId), { method: "POST" });
      const data = await res.json();
      setMessage(data.status === "ok" ? label + " triggered" : "Error: " + (data.error?.message || "Failed"));
    } catch (e) { setMessage("Error: " + String(e)); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input value={projectId} onChange={e => setProjectId(e.target.value)}
          placeholder="Enter Project ID"
          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm" />
      </div>

      {projectId && (
        <>
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Release Gate — 3-Layer Check</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={systemChecked} onChange={e => setSystemChecked(e.target.checked)}
                  className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">System Check</p>
                  <p className="text-xs text-gray-500">All compile/contract/verification checks passed</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={pmChecked} onChange={e => setPmChecked(e.target.checked)}
                  className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">PM Confirmation</p>
                  <p className="text-xs text-gray-500">PM has reviewed and approved</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="checkbox" checked={roleChecked} onChange={e => setRoleChecked(e.target.checked)}
                  className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Role Confirmation</p>
                  <p className="text-xs text-gray-500">All team roles have confirmed readiness</p>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => action("/api/v1/pipeline/:id/release", "Release")}
              disabled={!canRelease}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {canRelease ? "Release Project" : "Complete all checks to release"}
            </button>
            <button onClick={() => action("/api/v1/pipeline/:id/archive", "Archive")}
              className="px-4 py-3 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700">Archive</button>
          </div>
          {message && <p className="text-xs text-gray-500">{message}</p>}
        </>
      )}
    </div>
  );
}