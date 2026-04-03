/**
 * 智能 URL 输入框组件
 * 支持自动粘贴识别、实时 URL 提取、平台图标显示
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { PlatformIcon } from './PlatformIcon';

interface SmartURLInputProps {
  onUrlValidated: (url: string, platform: string) => void;
  onUrlCleared?: () => void;
  placeholder?: string;
  disabled?: boolean;
  initialValue?: string;
  className?: string;
}

interface ExtractedURL {
  url: string;
  platform: string;
  platformName: string;
  isShortLink: boolean;
}

// 平台 URL 模式（与后端保持一致）
const PLATFORM_PATTERNS: Record<string, RegExp[]> = {
  douyin: [
    /https?:\/\/(?:www\.)?douyin\.com\/video\/(\w+)/,
    /https?:\/\/v\.douyin\.com\/(\w+)\/?/,
  ],
  xiaohongshu: [
    /https?:\/\/(?:www\.)?xiaohongshu\.com\/explore\/(\w+)/,
    /https?:\/\/xhslink\.com\/o\/(\w+)/,
  ],
  bilibili: [
    /https?:\/\/(?:www\.)?bilibili\.com\/video\/(BV\w+)/,
    /https?:\/\/b23\.tv\/(\w+)/,
  ],
  kuaishou: [
    /https?:\/\/(?:www\.)?kuaishou\.com\/short-video\/(\w+)/,
    /https?:\/\/v\.kuaishou\.com\/(\w+)/,
  ],
  wechat_channels: [
    /https?:\/\/channels\.weixin\.qq\.com\/web\/pages\?feedId=(\w+)/,
  ],
};

const PLATFORM_NAMES: Record<string, string> = {
  douyin: '抖音',
  xiaohongshu: '小红书',
  bilibili: 'B 站',
  kuaishou: '快手',
  wechat_channels: '视频号',
};

/**
 * 从文本中提取 URL
 */
function extractURLFromText(text: string): string | null {
  if (!text) return null;
  
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/;
  const match = text.match(urlPattern);
  return match ? match[0] : null;
}

/**
 * 识别 URL 所属平台
 */
function identifyPlatform(url: string): string {
  if (!url) return 'unknown';
  
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(url)) {
        return platform;
      }
    }
  }
  
  return 'unknown';
}

/**
 * 判断是否为短链接
 */
function isShortLink(url: string, platform: string): boolean {
  const shortLinkPatterns: Record<string, RegExp> = {
    douyin: /https?:\/\/v\.douyin\.com\//,
    xiaohongshu: /https?:\/\/xhslink\.com\//,
    bilibili: /https?:\/\/b23\.tv\//,
    kuaishou: /https?:\/\/v\.kuaishou\.com\//,
  };
  
  const pattern = shortLinkPatterns[platform];
  return pattern ? pattern.test(url) : false;
}

/**
 * 智能 URL 输入框组件
 */
export const SmartURLInput: React.FC<SmartURLInputProps> = ({
  onUrlValidated,
  onUrlCleared,
  placeholder = '粘贴抖音/小红书/B 站分享链接或文案...',
  disabled = false,
  initialValue = '',
  className = '',
}) => {
  const [input, setInput] = useState(initialValue);
  const [extractedData, setExtractedData] = useState<ExtractedURL | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 处理 URL 提取和验证
   */
  const processURL = useCallback(async (text: string) => {
    if (!text.trim()) {
      setExtractedData(null);
      setError(null);
      onUrlCleared?.();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 模拟异步处理（实际可调用后端 API）
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const url = extractURLFromText(text);
      
      if (!url) {
        setExtractedData(null);
        setLoading(false);
        return;
      }

      const platform = identifyPlatform(url);
      const platformName = PLATFORM_NAMES[platform] || '未知平台';
      const isShort = isShortLink(url, platform);

      const data: ExtractedURL = {
        url,
        platform,
        platformName,
        isShortLink: isShort,
      };

      setExtractedData(data);
      onUrlValidated(url, platform);
    } catch (err) {
      setError('URL 解析失败，请检查链接格式');
      console.error('URL parsing error:', err);
    } finally {
      setLoading(false);
    }
  }, [onUrlValidated, onUrlCleared]);

  /**
   * 处理输入变化
   */
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    processURL(value);
  }, [processURL]);

  /**
   * 处理粘贴事件
   */
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      e.preventDefault();
      setInput(text);
      await processURL(text);
    }
  }, [processURL]);

  /**
   * 清空输入
   */
  const handleClear = useCallback(() => {
    setInput('');
    setExtractedData(null);
    setError(null);
    onUrlCleared?.();
  }, [onUrlCleared]);

  // 初始化时处理初始值
  useEffect(() => {
    if (initialValue) {
      processURL(initialValue);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`smart-url-input ${className}`}>
      {/* 输入区域 */}
      <div className="relative">
        <textarea
          value={input}
          onChange={handleChange}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
                     resize-none transition-all duration-200
                     disabled:bg-gray-100 disabled:cursor-not-allowed
                     text-gray-900 placeholder-gray-400"
        />
        
        {/* 清空按钮 */}
        {input && (
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 
                       hover:bg-gray-100 rounded transition-colors"
            title="清空"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="mt-2 flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">正在解析链接...</span>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* 识别结果 */}
      {extractedData && !loading && !error && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <PlatformIcon platform={extractedData.platform} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-700">
                  识别到{extractedData.platformName}链接
                </span>
                {extractedData.isShortLink && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                    短链接
                  </span>
                )}
              </div>
              <a
                href={extractedData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
              >
                {extractedData.url}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 提示信息 */}
      {!input && !loading && (
        <div className="mt-2 text-xs text-gray-400">
          支持抖音、小红书、B 站、快手、视频号等平台的分享链接
        </div>
      )}
    </div>
  );
};

export default SmartURLInput;
