import { NavLink } from "react-router-dom";

interface StageTab { path: string; label: string; stage: number; }

const TABS: StageTab[] = [
  { path: "/", label: "Home", stage: -1 },
  { path: "/require", label: "Requirements", stage: 0 },
  { path: "/dev", label: "Development", stage: 2 },
  { path: "/verify", label: "Verification", stage: 3 },
  { path: "/test", label: "Testing", stage: 4 },
  { path: "/release", label: "Release", stage: 5 },
  { path: "/evolve", label: "Evolution", stage: -1 },
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