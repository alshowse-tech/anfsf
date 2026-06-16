import { useState, useEffect } from "react";
import { t } from "../i18n";

const API_BASE = import.meta.env.VITE_ANFSF_API || "";

export default function GiteaConfig() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [owner, setOwner] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(API_BASE + "/api/v1/config/gitea")
      .then(r => r.json()).then(d => { if (d.config) { setUrl(d.config.url || ""); setToken(d.config.token || ""); setOwner(d.config.owner || ""); } })
      .catch(() => {});
  }, []);

  const save = async () => {
    try {
      const res = await fetch(API_BASE + "/api/v1/config/gitea", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url, token, owner }) });
      const d = await res.json();
      setMessage(d.status === "ok" ? t("Saved") : "Error: " + (d.error?.message || "Failed"));
    } catch (e) { setMessage("Error: " + String(e)); }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">{t("Gitea Configuration")}</h3>
      <div><label className="block text-xs text-gray-500 mb-1">{t("URL")}</label>
        <input value={url} onChange={e => setUrl(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" placeholder="http://localhost:3001" /></div>
      <div><label className="block text-xs text-gray-500 mb-1">{t("API Token")}</label>
        <input value={token} onChange={e => setToken(e.target.value)} type="password" className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" placeholder={t("API Token")} /></div>
      <div><label className="block text-xs text-gray-500 mb-1">{t("Repository Owner")}</label>
        <input value={owner} onChange={e => setOwner(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm" placeholder={t("Repository Owner")} /></div>
      <button onClick={save} className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700">{t("Save")}</button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}