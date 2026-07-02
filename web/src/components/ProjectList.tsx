import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { fetchProjects } from '../api/client';
import type { ProjectInfo } from '../api/types';

export default function ProjectList() {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');
  const [sortField, setSortField] = useState<'name' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(() => setError('Failed to load projects'));
  }, []);

  const filtered = useMemo(() => {
    let result = [...projects];
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (stateFilter !== 'all') result = result.filter(p => p.projectState === stateFilter);
    result.sort((a, b) => {
      const cmp = sortField === 'name'
        ? a.name.localeCompare(b.name)
        : a.createdAt - b.createdAt;
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [projects, search, stateFilter, sortField, sortDir]);

  const states = Array.from(new Set(projects.map(p => p.projectState))).sort();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (field: 'name' | 'createdAt') => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Project List</h2>
      <div className="flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search project name..."
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm flex-1" />
        <select value={stateFilter} onChange={e => { setStateFilter(e.target.value); setPage(0); }}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm">
          <option value="all">Status: All</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                Name {sortField === 'name' ? (sortDir === 'asc' ? '\u25b4' : '\u25be') : ''}
              </th>
              <th className="text-left px-4 py-2">Status</th>
              <th className="text-left px-4 py-2">Tenant</th>
              <th className="text-left px-4 py-2 cursor-pointer select-none" onClick={() => toggleSort('createdAt')}>
                Created {sortField === 'createdAt' ? (sortDir === 'asc' ? '\u25b4' : '\u25be') : ''}
              </th>
              <th className="text-left px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-400">No projects</td></tr>
            ) : pageRows.map(p => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{p.name}</td>
                <td className="px-4 py-2"><span className="text-xs px-2 py-0.5 rounded bg-gray-100">{p.projectState}</span></td>
                <td className="px-4 py-2 text-xs text-gray-500">{p.tenantId}</td>
                <td className="px-4 py-2 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">
                  <Link to={"/dashboard/" + p.id} className="text-blue-600 hover:text-blue-800 text-xs no-underline">Dashboard</Link>
                  <Link to={"/projects/" + p.id} className="ml-2 text-blue-600 hover:text-blue-800 text-xs no-underline">Details</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 rounded border disabled:opacity-30">Prev</button>
          <span className="text-gray-500">Page {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded border disabled:opacity-30">Next</button>
        </div>
      )}
    </div>
  );
}
