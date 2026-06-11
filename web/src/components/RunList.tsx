import { useState } from 'react';
import { useRuns } from '../hooks/useRuns';
import { Link } from 'react-router-dom';

const STATUS_LABELS: Record<string, string> = {
  done: '已完成',
  running: '执行中',
  failed: '失败',
  queued: '排队中',
};

const STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-100 text-green-800',
  running: 'bg-blue-100 text-blue-800',
  failed: 'bg-red-100 text-red-800',
  queued: 'bg-gray-100 text-gray-800',
};

const PAGE_SIZE = 20;

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function RunList() {
  const [page, setPage] = useState(0);
  const { runs, total, loading, error, refresh } = useRuns(PAGE_SIZE, page * PAGE_SIZE);

  if (loading) return <div className="p-4 text-gray-500">加载中...</div>;
  if (error) return <div className="p-4 text-red-600">错误: {error}</div>;
  if (runs.length === 0 && page === 0) return <div className="p-4 text-gray-500">暂无流水线运行记录。</div>;

  const hasNextPage = runs.length === PAGE_SIZE;
  const hasPrevPage = page > 0;

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">流水线记录</h2>
        <button
          onClick={refresh}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          刷新
        </button>
      </div>
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b">
            <th className="py-2 px-4">ID</th>
            <th className="py-2 px-4">状态</th>
            <th className="py-2 px-4">步骤数</th>
            <th className="py-2 px-4">开始时间</th>
            <th className="py-2 px-4">完成时间</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr key={run.id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-4">
                <Link
                  to={`/progress?runId=${run.id}`}
                  className="font-mono text-sm text-blue-600 hover:underline"
                >
                  {run.id.slice(0, 30)}...
                </Link>
              </td>
              <td className="py-2 px-4">
                <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[run.status] || 'bg-gray-100'}`}>
                  {STATUS_LABELS[run.status] || run.status}
                </span>
              </td>
              <td className="py-2 px-4">{run.stepCount}</td>
              <td className="py-2 px-4 text-sm text-gray-500">
                {formatDateTime(run.startedAt)}
              </td>
              <td className="py-2 px-4 text-sm text-gray-500">
                {run.completedAt ? formatDateTime(run.completedAt) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-500">
          第 {page + 1} 页{total !== undefined ? ` / 共 ${Math.ceil(total / PAGE_SIZE)} 页` : ''}
        </p>
        <div className="flex gap-2">
          <button
            disabled={!hasPrevPage}
            onClick={() => setPage(p => p - 1)}
            className="px-3 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            上一页
          </button>
          <button
            disabled={!hasNextPage}
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 text-sm rounded border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
