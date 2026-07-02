import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchStageMetrics, fetchBottlenecks, fetchCompilePatterns, fetchComponentPatterns, fetchFixes } from '../api/client';

export default function GlobalAnalysis() {
  const params = useParams();
  const projectId = params.projectId;
  const isGlobal = !projectId;

  const [bottlenecks, setBottlenecks] = useState<any[]>([]);
  const [, setStages] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [components, setComponents] = useState<any[]>([]);
  const [fixes, setFixes] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchBottlenecks(1000).catch(() => []),
      fetchStageMetrics().catch(() => []),
      fetchCompilePatterns().catch(() => []),
      fetchComponentPatterns().catch(() => []),
      fetchFixes().catch(() => []),
    ]).then(([b, s, p, c, f]) => {
      setBottlenecks(b);
      setStages(s);
      setPatterns(p);
      setComponents(c);
      setFixes(f);
    }).catch(() => setError('Failed to load analysis data'));
  }, []);

  const l1Count = fixes.filter((f: any) => f.level === 'L1').length;
  const totalFixes = fixes.length;
  const l1Ratio = totalFixes > 0 ? (l1Count / totalFixes * 100).toFixed(0) : '0';
  const confirmedCount = fixes.filter((f: any) => f.fixStatus === 'confirmed').length;
  const confirmedRatio = totalFixes > 0 ? (confirmedCount / totalFixes * 100).toFixed(0) : '0';

  if (error) return <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{isGlobal ? 'Global Analysis' : 'Project Analysis'}</h2>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Bottleneck Ranking</h3>
        {bottlenecks.length === 0 ? <p className="text-sm text-gray-400 py-2 text-center">No data</p> : (
          <div className="space-y-2">
            {bottlenecks.slice(0, 5).map((b: any, i: number) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-gray-600">#{i + 1} {b.stage}</span>
                  <span className="text-xs text-gray-500">{(b.avgDurationMs / 1000).toFixed(1)}s / P95 {(b.p95DurationMs / 1000).toFixed(1)}s / {b.failureRate}% fail</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2 mt-1">
                  <div className="bg-blue-500 h-2 rounded" style={{ width: Math.min(100, (b.avgDurationMs / 10000) * 100) + '%' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">Fix Efficiency</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="border rounded p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalFixes}</p>
            <p className="text-xs text-gray-500">Total Fixes</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{l1Ratio}%</p>
            <p className="text-xs text-gray-500">L1 Auto-fix</p>
          </div>
          <div className="border rounded p-3 text-center">
            <p className="text-2xl font-bold text-purple-600">{confirmedRatio}%</p>
            <p className="text-xs text-gray-500">Confirmed</p>
          </div>
        </div>
      </div>

      {isGlobal && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Cross-Project Compile Errors</h3>
          {patterns.length === 0 ? <p className="text-sm text-gray-400 py-2 text-center">No patterns</p> : (
            <div className="space-y-1">
              {patterns.slice(0, 10).map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm border-b pb-1">
                  <span className="text-xs text-gray-400 w-6">#{i + 1}</span>
                  <span className="font-mono text-xs flex-1 truncate">{p.pattern}</span>
                  <span className="text-xs text-gray-500">{p.frequency}x</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isGlobal && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">Component Reuse</h3>
          {components.length === 0 ? <p className="text-sm text-gray-400 py-2 text-center">No components</p> : (
            <div className="space-y-1">
              {components.slice(0, 10).map((c: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm border-b pb-1">
                  <span className="text-xs font-mono font-medium">{c.name}</span>
                  <span className="text-xs text-gray-500">({c.occurrenceCount} projects)</span>
                  <span className="text-xs text-gray-400 flex-1 truncate">props: {c.propsSignature}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
