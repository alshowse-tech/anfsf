/**
 * ANFSF — PRD Input Form (P-001 rewrite)
 *
 * Text input + file upload + quality score feedback before submission.
 */

import { useState } from 'react';
import { synthesize, synthesizeWithAttachments } from '../api/client';
import FileUpload from './FileUpload';

interface PRDFormProps {
  onSubmit: (jobId: string) => void;
}

// Simple client-side quality heuristic (backend does the real check)
function quickQualityCheck(text: string): { score: number; level: string; hints: string[] } {
  const hints: string[] = [];
  let score = 50;

  if (text.length < 50) { score -= 30; hints.push('PRD is very short — add more detail about features and users'); }
  else if (text.length < 200) { score -= 10; hints.push('Consider adding acceptance criteria and edge cases'); }
  else score += 10;

  if (/用户|user|admin|管理员|角色|role/i.test(text)) score += 10;
  else hints.push('Describe user roles (admin, regular user, etc.)');

  if (/功能|feature|支持|页面|列表|搜索|创建|编辑|删除/i.test(text)) score += 10;
  else hints.push('List specific features the system should have');

  if (/验收|测试|test|预期|expect|标准|criteria/i.test(text)) score += 10;
  else hints.push('Add acceptance criteria to verify features work correctly');

  if (/秒|ms|毫秒|分钟|响应|并发|用户数|qps/i.test(text)) score += 5;
  else hints.push('Quantify performance requirements (e.g. response time < 500ms)');

  const level = score >= 70 ? 'green' : score >= 40 ? 'yellow' : 'red';
  return { score: Math.min(100, Math.max(0, score)), level, hints };
}

export default function PRDForm({ onSubmit }: PRDFormProps) {
  const [projectName, setProjectName] = useState('');
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quality, setQuality] = useState<ReturnType<typeof quickQualityCheck> | null>(null);

  const handleTextChange = (value: string) => {
    setText(value);
    if (value.trim().length > 10) {
      setQuality(quickQualityCheck(value));
    } else {
      setQuality(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && files.length === 0) { setError('Please enter PRD content or upload files'); return; }
    setSubmitting(true); setError(null);
    try {
      let result: { jobId: string };
      if (files.length > 0) {
        const formData = new FormData(); formData.append('prdText', text);
        if (projectName.trim()) formData.append('projectName', projectName.trim());
        for (const file of files) formData.append('files', file);
        result = await synthesizeWithAttachments(formData, projectName.trim() || undefined);
      } else {
        result = await synthesize({ prdText: text, projectName: projectName.trim() || undefined });
      }
      onSubmit(result.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start pipeline');
    } finally { setSubmitting(false); }
  };

  const qColor = quality?.level === 'green' ? 'text-green-600 bg-green-50 border-green-200' :
    quality?.level === 'yellow' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
    quality?.level === 'red' ? 'text-red-600 bg-red-50 border-red-200' : '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
        <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="my-project" value={projectName} onChange={e => setProjectName(e.target.value)} disabled={submitting} />
        <p className="mt-1 text-xs text-gray-500">Output will be saved to output/{projectName.trim() || '<timestamp>'}/</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Product Requirements (PRD)</label>
        <textarea id="prd-text" name="prdText" rows={8} className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Describe the software you want to build..."
          value={text} onChange={e => handleTextChange(e.target.value)} disabled={submitting} />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{text.length} chars</span>
          {quality && (
            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${qColor}`}>
              Quality: {quality.score}/100
            </span>
          )}
        </div>
        {quality && quality.hints.length > 0 && (
          <div className={`mt-2 border rounded p-3 text-xs space-y-1 ${qColor}`}>
            {quality.hints.map((h, i) => <p key={i}>💡 {h}</p>)}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Attachments (optional)</label>
        <FileUpload files={files} onChange={setFiles} />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={submitting || (!text.trim() && files.length === 0)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {submitting ? 'Submitting...' : 'Run Pipeline'}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
