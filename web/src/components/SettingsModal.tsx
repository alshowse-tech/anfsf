import { useState } from "react";
import GiteaConfig from "./GiteaConfig";
import MemberManager from "./MemberManager";
import { t } from "../i18n";

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"gitea" | "members">("gitea");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-lg font-semibold text-gray-900">{t("Settings")}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div className="flex gap-0 border-b px-4">
          {(["gitea", "members"] as const).map(tabKey => (
            <button key={tabKey} onClick={() => setTab(tabKey)}
              className={"px-4 py-2 text-sm font-medium border-b-2 " + (tab === tabKey ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500")}>
              {tabKey === "gitea" ? t("Gitea Config") : t("Members")}
            </button>
          ))}
        </div>
        <div className="p-4">{tab === "gitea" ? <GiteaConfig /> : <MemberManager />}</div>
      </div>
    </div>
  );
}