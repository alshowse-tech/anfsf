/**
 * ANFSF — 结果页面
 *
 * 显示流水线产出的文件列表和内容预览。
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import JSZip from 'jszip';

const API_BASE = import.meta.env.VITE_ANFSF_API || '';

interface FileEntry {
  path: string;
  size: number;
  type: 'code' | 'other';
  category: 'frontend' | 'backend';
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const FILE_ICONS: Record<string, string> = {
  '.tsx': 'TSX',
  '.ts': 'TS',
  '.jsx': 'JSX',
  '.js': 'JS',
  '.json': 'JSON',
  '.css': 'CSS',
  '.html': 'HTML',
  '.md': 'MD',
  '.sql': 'SQL',
  '.yaml': 'YAML',
  '.yml': 'YAML',
};

function getFileIcon(filePath: string): string {
  const ext = '.' + filePath.split('.').pop()?.toLowerCase();
  return FILE_ICONS[ext] || '';
}

export default function ResultView() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId');

  const [files, setFiles] = useState<FileEntry[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState<'frontend' | 'backend' | 'all'>('all');

  useEffect(() => {
    if (!runId) return;

    const fetchFiles = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/pipeline/${runId}/files`);
        if (!res.ok) {
          setError('无法加载文件列表');
          return;
        }
        const data = await res.json();
        setFiles(data.files || []);
        setProjectName(data.projectName || null);
      } catch {
        setError('无法连接服务器');
      }
    };

    fetchFiles();
  }, [runId]);

  const loadFileContent = async (filePath: string, category: 'frontend' | 'backend') => {
    setLoading(true);
    setSelectedFile(filePath);
    setFileContent(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/pipeline/${runId}/files/content?filePath=${encodeURIComponent(filePath)}&category=${category}`
      );
      if (!res.ok) {
        setFileContent('无法加载文件内容');
        return;
      }
      const data = await res.json();
      setFileContent(data.content);
    } catch {
      setFileContent('加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAll = async () => {
    if (!runId || files.length === 0) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const file of files) {
        const url = API_BASE + "/api/v1/pipeline/" + runId + "/files/content?filePath=" + encodeURIComponent(file.path) + "&category=" + file.category;
        const res = await fetch(url);
        if (res.ok) { const data = await res.json(); zip.file(file.path, data.content); }
      }
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (projectName || 'project') + '.zip'; a.click();
      URL.revokeObjectURL(url);
    } catch { setError('下载失败'); }
    finally { setDownloading(false); }
  };

  if (!runId) {
    return (
      <div className="text-center py-12 text-gray-500">
        请先从执行进度或历史记录中选择一个任务来查看产出物。
      </div>
    );
  }

  const filteredFiles = activeTab === 'all'
    ? files
    : files.filter(f => f.category === activeTab);

  const frontendCount = files.filter(f => f.category === 'frontend').length;
  const backendCount = files.filter(f => f.category === 'backend').length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">产出文件</h2>
        {projectName && (
          <span className="text-sm text-gray-500 font-mono">项目: {projectName}</span>
        )}
        {projectName && <button onClick={handleDownloadAll} disabled={downloading} className="px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 disabled:opacity-50">{downloading ? '打包中...' : '下载全部'}</button>}
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {files.length === 0 && !error && (
        <div className="text-center py-12 text-gray-500">
          {loading ? '加载中...' : '暂无产出文件。请先运行流水线。'}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* File list */}
          <div className="border rounded-lg overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b bg-gray-50">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                全部 ({files.length})
              </button>
              <button
                onClick={() => setActiveTab('frontend')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'frontend'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                前端 ({frontendCount})
              </button>
              <button
                onClick={() => setActiveTab('backend')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'backend'
                    ? 'border-blue-600 text-blue-600 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                后端 ({backendCount})
              </button>
            </div>

            {/* File list */}
            <div className="max-h-96 overflow-y-auto">
              {filteredFiles.map((file, i) => (
                <button
                  key={i}
                  onClick={() => loadFileContent(file.path, file.category)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm border-b last:border-b-0 hover:bg-blue-50 transition-colors ${
                    selectedFile === file.path ? 'bg-blue-50' : ''
                  }`}
                >
                  <span className="w-10 text-center text-xs font-mono font-bold text-gray-400 bg-gray-100 rounded px-1">
                    {getFileIcon(file.path)}
                  </span>
                  <span className="flex-1 font-mono text-xs truncate">{file.path}</span>
                  <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* File content */}
          <div className="border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {selectedFile || '选择一个文件查看内容'}
              </span>
              {selectedFile && (
                <span className="text-xs text-gray-400 font-mono">
                  {activeTab === 'all'
                    ? (filteredFiles.find(f => f.path === selectedFile)?.category === 'frontend' ? '前端' : '后端')
                    : (activeTab === 'frontend' ? '前端' : '后端')
                  }
                </span>
              )}
            </div>
            <div className="max-h-96 overflow-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">加载中...</div>
              ) : fileContent !== null ? (
                <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all bg-gray-900 text-green-400">
                  {fileContent}
                </pre>
              ) : (
                <div className="p-8 text-center text-gray-400 text-sm">
                  点击左侧文件列表查看内容
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
