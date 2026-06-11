// [generated]
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProject } from '../services/api';
import type { Project } from '../types';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // TODO: implement data fetching with error handling
    fetchProject(id).then(setProject).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-center p-8">加载中...</div>;
  if (!project) return <div className="text-center p-8">项目未找到</div>;

  // TODO: implement full project detail view, edit form, approval history
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{project.name}</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm text-gray-500">项目编码</dt>
            <dd className="text-lg font-medium">{project.code}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">状态</dt>
            <dd className="text-lg font-medium">{project.status}</dd>
          </div>
          {/* TODO: add more fields */}
        </dl>
      </div>
      {/* TODO: implement approval timeline, budget detail, attachments */}
    </div>
  );
}
