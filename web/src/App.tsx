import { useState } from "react";
import { BrowserRouter, Routes, Route, Link, useSearchParams, useNavigate, NavLink } from "react-router-dom";
import StageTabs from "./components/StageTabs";
import HomeDashboard from "./components/HomeDashboard";
import PRDForm from "./components/PRDForm";
import PipelineProgress from "./components/PipelineProgress";
import RunList from "./components/RunList";
import ResultView from "./components/ResultView";
import MermaidDiagram from "./components/MermaidDiagram";
import ApiTokenSettings from "./components/ApiTokenSettings";
import ErrorBoundary from "./components/ErrorBoundary";
import TestFeedback from "./components/TestFeedback";
import { LLMPlayground } from "./components/LLMPlayground";
import DevWorkspaceV2 from "./components/DevWorkspaceV2";
import VerifyPanel from "./components/VerifyPanel";
import ReleaseGate from "./components/ReleaseGate";
import EvolutionPanel from "./components/EvolutionPanel";

const AGENT_LOOP_DIAGRAM = "graph TD\n  A[PRD Input] --> B{Quality Check}\n  B -->|pass| C[Agent Loop]\n  B -->|fail| D[Guided Mode]\n  C --> E[Verify + Fix]\n  E --> F[Write Files]\n  F --> G[Push Gitea]\n  G --> H[Done]\n";

function Layout() {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [completedRunId, setCompletedRunId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runIdFromUrl = searchParams.get("runId");
  const handleRunStarted = (jobId: string) => {
    setActiveRunId(jobId); setCompletedRunId(null); navigate("/require");
  };
  const handleNewRun = () => { setActiveRunId(null); };
  const handlePipelineComplete = (runId: string) => { setCompletedRunId(runId); };
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Link to="/" className="no-underline">
              <h1 className="text-xl font-bold text-gray-900">ANFSF OS</h1>
            </Link>
            <div className="flex items-center gap-2 relative">
              <button onClick={() => setShowSettings(!showSettings)}
                className="text-gray-500 hover:text-gray-700 p-1 text-lg">
                {String.fromCharCode(0x2699)}
              </button>
              {showSettings && (
                <div className="absolute right-0 top-8 w-48 bg-white border rounded-lg shadow-lg p-2 z-50">
                  <NavLink to="/dev" className="block px-3 py-1.5 text-sm hover:bg-gray-100 rounded no-underline text-gray-700"
                    onClick={() => setShowSettings(false)}>Dev Workspace</NavLink>
                  <NavLink to="/test" className="block px-3 py-1.5 text-sm hover:bg-gray-100 rounded no-underline text-gray-700"
                    onClick={() => setShowSettings(false)}>Test Feedback</NavLink>
                  <Link to="/?llm=1" className="block px-3 py-1.5 text-sm hover:bg-gray-100 rounded no-underline text-gray-700"
                    onClick={() => setShowSettings(false)}>LLM Playground</Link>
                  <div className="border-t my-1"></div>
                  <ApiTokenSettings />
                </div>
              )}
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
                activeRunId || runIdFromUrl ? (
                  <>
                    <PipelineProgress runId={activeRunId || runIdFromUrl}
                      onComplete={handlePipelineComplete} />
                    {completedRunId && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="font-medium text-green-700 mb-2">Pipeline Complete</p>
                        <Link to={"/result?runId=" + completedRunId}
                          className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline">
                          View Output</Link>
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
              <Route path="/history" element={<RunList />} />
              <Route path="/result" element={<ResultView />} />
              <Route path="/diagram" element={
                <MermaidDiagram chart={AGENT_LOOP_DIAGRAM} className="flex justify-center" />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <div className="text-center mt-6">
          <Link to="/require" onClick={handleNewRun}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline inline-block">
            + New Project</Link>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return <BrowserRouter><Layout /></BrowserRouter>;
}
