/**
 * ANFSF — API Token 设置面板
 */

import { useState, useEffect } from 'react';
import { hasApiToken, setApiToken, clearApiToken } from '../api/client';

export default function ApiTokenSettings() {
  const [token, setToken] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (hasApiToken()) setToken('••••••••');
  }, []);

  const handleSave = () => {
    if (token.trim()) {
      setApiToken(token.trim());
    } else {
      clearApiToken();
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = () => {
    clearApiToken();
    setToken('');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="text-gray-500 hover:text-gray-700 p-1"
        title="API 设置"
      >
        ⚙
      </button>

      {isVisible && (
        <div className="absolute right-0 top-8 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">API Token</h3>
          <input
            type="password"
            className="w-full px-3 py-1.5 border border-gray-300 rounded-md text-sm font-mono mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="sk-..."
            value={token === '••••••••' ? '' : token}
            onChange={(e) => { setToken(e.target.value); setSaved(false); }}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              {saved ? '已保存 ✓' : '保存'}
            </button>
            <button
              onClick={handleClear}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
            >
              清除
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Token 仅存储在本地浏览器中。除非 /api/v1/* 路由需要，否则不会发送。
          </p>
        </div>
      )}
    </div>
  );
}
