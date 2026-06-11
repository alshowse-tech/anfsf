/**
 * ANFSF — 文件上传组件
 *
 * 支持拖拽上传 PRD 附件（图片、CSV、文本文件）。
 * 纯浏览器 API，无外部依赖。
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface FileUploadProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSizeBytes?: number;
  uploadProgress?: Record<string, number>;
}

const ACCEPTED_TYPES = [
  'image/png', 'image/jpeg', 'image/webp',
  'text/csv',
  'text/plain', 'text/markdown',
  'application/pdf',
].join(',');

const TYPE_LABELS: Record<string, string> = {
  'image/png': '图片',
  'image/jpeg': '图片',
  'image/webp': '图片',
  'text/csv': 'CSV',
  'text/plain': 'TXT',
  'text/markdown': 'MD',
  'application/pdf': 'PDF',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
      else { current += ch; }
    }
    result.push(current);
    return result;
  });
}

function ImagePreview({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setUrl(e.target?.result as string);
    reader.readAsDataURL(file);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [file]);

  if (!url) return <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-400">加载中...</div>;

  return (
    <img
      src={url}
      alt={file.name}
      className="w-16 h-16 object-cover rounded border border-gray-200"
    />
  );
}

function CSVPreview({ file }: { file: File }) {
  const [data, setData] = useState<string[][] | null>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCSV(text);
      setData(parsed.slice(0, 6));
    };
    reader.readAsText(file);
  }, [file]);

  if (!data || data.length === 0) return <div className="text-xs text-gray-400">加载中...</div>;

  return (
    <div className="overflow-x-auto max-h-32">
      <table className="text-xs border-collapse">
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className={i === 0 ? 'font-medium bg-gray-50' : ''}>
              {row.slice(0, 5).map((cell, j) => (
                <td key={j} className="border px-1.5 py-0.5 max-w-[120px] truncate">{cell || '—'}</td>
              ))}
              {row.length > 5 && <td className="text-gray-400 px-1">+{row.length - 5}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FileUpload({ files, onChange, maxFiles = 10, maxSizeBytes = 5 * 1024 * 1024, uploadProgress }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    const errs: string[] = [];
    const accepted: File[] = [];

    for (const file of newFiles) {
      if (files.length + accepted.length >= maxFiles) {
        errs.push(`最多支持 ${maxFiles} 个文件`);
        break;
      }
      if (file.size > maxSizeBytes) {
        errs.push(`${file.name} 超过 ${formatSize(maxSizeBytes)} 限制`);
        continue;
      }
      accepted.push(file);
    }

    if (errs.length > 0) {
      setErrors(errs);
    } else {
      setErrors([]);
    }

    if (accepted.length > 0) {
      onChange([...files, ...accepted]);
    }
  }, [files, onChange, maxFiles, maxSizeBytes]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const handleRemove = (index: number) => {
    const updated = [...files];
    updated.splice(index, 1);
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {/* 拖拽区域 */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          onChange={handleInputChange}
          className="hidden"
        />
        <p className="text-sm text-gray-600">
          {isDragging ? '在此释放文件' : '拖拽文件到此区域，或点击选择文件'}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          PNG, JPG, WEBP, CSV, TXT, MD, PDF — 每个最大 5MB，最多 {maxFiles} 个文件
        </p>
      </div>

      {/* 错误提示 */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-red-600">{err}</p>
          ))}
        </div>
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500">已添加 {files.length} 个文件</p>
          {files.map((file, i) => (
            <div key={i} className="flex items-start justify-between px-3 py-2 bg-gray-50 rounded-md text-sm gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {file.type.startsWith('image/') ? (
                  <ImagePreview file={file} />
                ) : file.type === 'text/csv' ? (
                  <CSVPreview file={file} />
                ) : (
                  <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500 font-medium">
                    {TYPE_LABELS[file.type] || '文件'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs text-gray-700">{file.name}</span>
                  <span className="text-xs text-gray-400">{formatSize(file.size)}</span>
                  {uploadProgress && file.name in uploadProgress && (
                    <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0 text-lg leading-none"
                title="移除"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
