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

const AGENT_LOOP_DIAGRAM = `graph TD
  A[PRD Input] --> B{Quality Check}
  B -->|pass| C[Agent Loop]
  B -->|fail| D[Guided Mode]
  C --> E[Verify + Fix]
  E --> F[Write Files]
  F --> G[Push Gitea]
  G --> H[Done]
`;

function Layout() {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [completedRunId, setCompletedRunId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const runIdFromUrl = searchParams.get('runId');
  const handleRunStarted = (jobId: string) => { setActiveRunId(jobId); setCompletedRunId(null); navigate('/progress'); };
  const handleNewRun = () => { setActiveRunId(null); };
  const handlePipelineComplete = (runId: string) => { setCompletedRunId(runId); };

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
            <button onClick={() => setShowAux(!showAux)} className="text-gray-500 hover:text-gray-700 p-1">&#x2699;</button>
            {showAux && (
              <div className="absolute right-2 top-12 w-44 bg-white border rounded-lg shadow-lg p-2 z-50">
                <NavLink to="/dashboard" className="block px-3 py-1.5 text-sm hover:bg-gray-100 rounded no-underline text-gray-700" onClick={() => setShowAux(false)}>Dashboard</NavLink>
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
                    <PipelineProgress runId={activeRunId || runIdFromUrl!} onComplete={handlePipelineComplete} />
                    {completedRunId && (
                      <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                        <p className="font-medium text-green-700 mb-2">Complete!</p>
                        <Link to={`/result?runId=${completedRunId}`} className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium no-underline">View Output</Link>
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
              <Route path="/dashboard" element={<ProjectDashboard projectName="Demo" projectState="stage1_done" stages={[{stage:0,name:'Know',state:'completed'},{stage:1,name:'Parse',state:'completed'},{stage:2,name:'Dev',state:'active'},{stage:3,name:'Verify',state:'pending'},{stage:4,name:'Test',state:'pending'},{stage:5,name:'Release',state:'pending'}]} currentStage={2} progress={{totalTasks:12,completedTasks:4}} checkpoints={[]} />} />
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

export default function App() { return (<BrowserRouter><Layout /></BrowserRouter>); }
