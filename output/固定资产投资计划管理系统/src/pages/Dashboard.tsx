// [generated]
import React, { useEffect, useState } from 'react';
import { fetchProjects } from '../services/api';
import type { Project } from '../types';

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: implement data fetching with error handling
    fetchProjects().then(setProjects).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8">加载中...</div>;

  // TODO: implement dashboard statistics, charts, recent activities
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">仪表盘</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">项目总数</div>
          <div className="text-3xl font-bold">{projects.length}</div>
        </div>
        {/* TODO: add more stat cards */}
      </div>
      {/* TODO: implement recent projects list or chart */}
    </div>
  );
}
