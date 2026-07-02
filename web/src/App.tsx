import OrchestrationStatus from "./components/OrchestrationStatus";
import SkillsRegistry from "./components/SkillsRegistry";
import ConfirmationReview from "./components/ConfirmationReview";
import RequirementReviewPage from "./components/RequirementReviewPage";
import ProjectDashboardBase from "./components/ProjectDashboardBase";

import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useSearchParams, useNavigate } from "react-router-dom";
import StageTabs from "./components/StageTabs";
import HomeDashboard from "./components/HomeDashboard";
import PRDForm from "./components/PRDForm";
import PipelineProgress from "./components/PipelineProgress";
import RunList from "./components/RunList";
import ResultView from "./components/ResultView";
import MermaidDiagram from "./components/MermaidDiagram";
import ErrorBoundary from "./components/ErrorBoundary";
import TestFeedback from "./components/TestFeedback";
import { t, getLang, setLang } from "./i18n";
import DevWorkspaceV2 from "./components/DevWorkspaceV2";
import VerifyPanel from "./components/VerifyPanel";
import ReleaseGate from "./components/ReleaseGate";
import EvolutionPanel from "./components/EvolutionPanel";
import WebhookStatus from './components/WebhookStatus';
import SettingsPage from './components/SettingsPage';
import AuditLog from './components/AuditLog';
import CLITerminal from './components/CLITerminal';
import ProjectList from "./components/ProjectList";
import ProjectDetail from "./components/ProjectDetail";
import GlobalAnalysis from "./components/GlobalAnalysis";

import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ProtectedRoute from './components/ProtectedRoute';
const AGENT_LOOP_DIAGRAM = "graph TD\n  A[PRD Input] --> B{Quality Check}\n  B -->|pass| C[Agent Loop]\n  B -->|fail| D[Guided Mode]\n  C --> E[Verify + Fix]\n  E --> F[Write Files]\n  F --> G[Push Gitea]\n  G --> H[Done]\n";

function Layout() {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [completedRunId, setCompletedRunId] = useState<string | null>(null);
  const [langVersion, setLangVersion] = useState(0);
  void langVersion; // force re-render on language toggle
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runIdFromUrl = searchParams.get("runId");
  const handleRunStarted = (jobId: string) => {
    setActiveRunId(jobId); setCompletedRunId(null); navigate("/require");
  };
  const handleNewRun = () => { setActiveRunId(null); };
  const handlePipelineComplete = (runId: string) => { setCompletedRunId(runId); };
  return (
    <ProtectedRoute>
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link to="/" className="no-underline">
              <h1 className="text-xl font-bold text-gray-900">ANFSF OS</h1>
            </Link>
            <div className="flex items-center gap-2 relative">
              <button onClick={() => { const nl = getLang() === "en" ? "zh" : "en"; setLang(nl); setLangVersion(v => v + 1); }} className="text-xs font-medium text-gray-500 hover:text-gray-700 px-2 py-1 border rounded shrink-0">{getLang() === "en" ? "中文" : "EN"}</button>
              <Link to="/settings" className="text-gray-500 hover:text-gray-700 p-1 text-lg no-underline">{String.fromCharCode(0x2699)}</Link>
            </div>
          </div>
          <StageTabs />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow p-6">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<HomeDashboard />} />
              <Route path="/require" element={
                activeRunId ?? runIdFromUrl ?? '' ? (
                  <>
                    <PipelineProgress runId={activeRunId ?? runIdFromUrl ?? ''}
                      onComplete={handlePipelineComplete} />
                    {completedRunId && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="font-medium text-green-700 mb-2">{t("Pipeline Complete")}</p>
                        <Link to={"/result?runId=" + completedRunId}
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline">
                          {t("View Output")}</Link>
                      </div>
                    )}
                  </>
                ) : (
                  <PRDForm onSubmit={handleRunStarted} />
                )
              } />
              <Route path="/dev" element={<DevWorkspaceV2 />} />
              <Route path="/verify" element={<VerifyPanel />} />
              <Route path="/test" element={<TestFeedback />} />
              <Route path="/release" element={<ReleaseGate />} />
              <Route path="/evolve" element={<EvolutionPanel />} />
              <Route path="/webhooks" element={<WebhookStatus />} />
              <Route path="/orchestrate" element={<OrchestrationStatus />} />
              <Route path="/skills" element={<SkillsRegistry />} />
              <Route path="/confirm" element={<ConfirmationReview />} />
              <Route path="/require/review" element={<RequirementReviewPage />} />
              <Route path="/dashboard/:projectId" element={<ProjectDashboardBase />} />
              <Route path="/history" element={<RunList />} />
              <Route path="/result" element={<ResultView />} />
              <Route path="/diagram" element={
                <MermaidDiagram chart={AGENT_LOOP_DIAGRAM} className="flex justify-center" />} />
                          <Route path="/projects" element={<ProjectList />} />
              <Route path="/projects/:projectId" element={<ProjectDetail />} />
              <Route path="/analysis/global" element={<GlobalAnalysis />} />
              <Route path="/analysis/:projectId" element={<GlobalAnalysis />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/audit-log" element={<AuditLog />} />
              <Route path="/cli" element={<CLITerminal />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <div className="text-center mt-6">
          <Link to="/require" onClick={handleNewRun}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline inline-block">
            {t("+ New Project")}</Link>
        </div>
      </main>
    </div>
    </ProtectedRoute>
  );
}

export default function App() {
  return <BrowserRouter><Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/*" element={<Layout />} />
  </Routes></BrowserRouter>;
}









