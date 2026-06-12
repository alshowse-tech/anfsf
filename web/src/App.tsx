import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Link, useSearchParams, useNavigate } from 'react-router-dom';
import PRDForm from './components/PRDForm';
import PipelineProgress from './components/PipelineProgress';
import RunList from './components/RunList';
import ResultView from './components/ResultView';
import MermaidDiagram from './components/MermaidDiagram';
import ApiTokenSettings from './components/ApiTokenSettings';
import ErrorBoundary from './components/ErrorBoundary';
import ProjectDashboard from './components/ProjectDashboard';
import TestFeedback from './components/TestFeedback';

const AGENT_LOOP_DIAGRAM = 'graph TD\n  A[PRD Input] --> B{Quality Check}\n  B -->|pass| C[Agent Loop]\n  B -->|fail| D[Guided Mode]\n  C --> E[Verify + Fix]\n  E --> F[Write Files]\n  F --> G[Push Gitea]\n  G --> H[Done]\n';

function Layout() {
  const [activeRunId, setActiveRunId] = useState(null);
  const [completedRunId, setCompletedRunId] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runIdFromUrl = searchParams.get('runId');
  const handleRunStarted = (jobId) => { setActiveRunId(jobId); setCompletedRunId(null); navigate('/progress'); };
  const handleNewRun = () => { setActiveRunId(null); };
  const handlePipelineComplete = (runId) => { setCompletedRunId(runId); };
  const [showAux, setShowAux] = useState(false);

  const navItems = [
    { to: '/', label: 'New Project' },
    { to: '/progress', label: 'Progress' },
    { to: '/result', label: 'Output' },
    { to: '/history', label: 'History' },
    { to: '/diagram', label: 'Flow' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <NavLink to="/" className="no-underline">
            <h1 className="text-2xl font-bold text-gray-900">ANFSF Console</h1>
            <p className="text-sm text-gray-500">Agent Loop Pipeline</p>
          </NavLink>
          <nav className="flex items-center gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => 'px-3 py-1.5 rounded text-sm font-medium no-underline ' + (isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
                {item.label}
              </NavLink>
            ))}
            <button onClick={() => setShowAux(!showAux)} className="text-gray-500 hover:text-gray-700 p-1">{'\u2699'}</button>
            {showAux && (
              <div className="absolute right-2 top-12 w-44 bg-white border rounded-lg shadow-lg p-2 z-50">
                <NavLink to="/dashboard" className="block px-3 py-1.5 text-sm hover:bg-gray-100 rounded no-underline text-gray-700" onClick={() => setShowAux(false)}>Dashboard</NavLink>
                <NavLink to="/feedback" className="block px-3 py-1.5 text-sm hover:bg-gray-100 rounded no-underline text-gray-700" onClick={() => setShowAux(false)}>Test Feedback</NavLink>
                <div className="border-t my-1"></div>
                <ApiTokenSettings />
              </div>
            )}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<PRDForm onSubmit={handleRunStarted} />} />
              <Route path="/progress" element={
                activeRunId || runIdFromUrl ? (
                  <>
                    <PipelineProgress runId={activeRunId || runIdFromUrl} onComplete={handlePipelineComplete} />
                    {completedRunId && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="font-medium text-green-700 mb-2">Complete!</p>
                        <Link to={'/result?runId=' + completedRunId} className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline">View Output</Link>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 text-gray-500">No active run. <Link to="/" className="text-blue-600 hover:underline ml-1">Start New</Link></div>
                )
              } />
              <Route path="/history" element={<RunList />} />
              <Route path="/result" element={<ResultView />} />
              <Route path="/diagram" element={<MermaidDiagram chart={AGENT_LOOP_DIAGRAM} className="flex justify-center" />} />
              <Route path="/feedback" element={<TestFeedback />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Routes>
          </ErrorBoundary>
        </div>
        <div className="text-center">
          <Link to="/" onClick={handleNewRun} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline inline-block">+ New Project</Link>
        </div>
      </main>
    </div>
  );
}

function DashboardPage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId') || '';
  return (
    <ProjectDashboard
      projectName={runId ? 'Project ' + runId.slice(0, 8) : 'Demo'}
      projectState={runId ? 'running' : 'stage1_done'}
      stages={[]}
      currentStage={0}
      progress={{ totalTasks: 6, completedTasks: 0 }}
      checkpoints={[]}
      runId={runId || undefined}
    />
  );
}

export default function App() { return (<BrowserRouter><Layout /></BrowserRouter>); }
