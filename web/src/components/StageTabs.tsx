import { NavLink } from "react-router-dom";
import { t } from "../i18n";

interface StageTab { path: string; label: string; stage: number; }

const TABS: StageTab[] = [
  { path: "/", label: t("Home"), stage: -1 },
  { path: "/require", label: t("Requirements"), stage: 0 },
  { path: "/dev", label: t("Development"), stage: 2 },
  { path: "/verify", label: t("Verification"), stage: 3 },
  { path: "/test", label: t("Testing"), stage: 4 },
  { path: "/release", label: t("Release"), stage: 5 },
  { path: "/evolve", label: t("Evolution"), stage: -1 },
  { path: "/orchestrate", label: t("Orchestrate"), stage: -1 },
  { path: "/skills", label: t("Skills"), stage: -1 },
  { path: "/webhooks", label: t("Webhooks"), stage: -1 },
  { path: "/projects", label: t("Projects"), stage: -1 },
  { path: "/analysis/global", label: t("Analysis"), stage: -1 },
  { path: "/settings", label: t("Settings"), stage: -1 },
  { path: "/audit-log", label: t("Audit Log"), stage: -1 },
  { path: "/cli", label: t("CLI"), stage: -1 },
];

export default function StageTabs() {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 pb-0">
      {TABS.map(tab => (
        <NavLink key={tab.path} to={tab.path} end={tab.path === "/"}
          className={({ isActive }) =>
            "px-4 py-2 text-sm font-medium whitespace-nowrap no-underline border-b-2 " +
            (isActive
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300")
          }>
          {tab.label}
          {tab.stage >= 0 && (
            <span className="ml-1.5 text-xs text-gray-400">S{tab.stage}</span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}


