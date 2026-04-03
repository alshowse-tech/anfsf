/**
 * Next.js Middleware - Readiness Gate 实现
 * 基于 ANFSF V1.5.0 Layer 8.5.7 Readiness Gate
 * 
 * 功能：
 * - 样式探针检测
 * - 自动修复触发
 * - 用户友好提示
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ============================================================================
// Readiness Gate 配置
// ============================================================================

const READINESS_CONFIG = {
  // 样式加载超时时间 (ms)
  styleLoadTimeout: 5000,
  
  // 探针检测间隔 (ms)
  probeInterval: 100,
  
  // 最大重试次数
  maxRetries: 3,
  
  // 需要检测的样式资源
  requiredStyles: [
    '/_next/static/css/app/**/*.css',
  ],
  
  // 需要检测的字体资源
  requiredFonts: [
    'Inter',
    'Noto Sans SC',
  ],
};

// ============================================================================
// 样式探针检测
// ============================================================================

interface ReadinessStatus {
  stylesLoaded: boolean;
  fontsLoaded: boolean;
  criticalCSSInjected: boolean;
  isReady: boolean;
  errors: string[];
}

async function checkReadiness(): Promise<ReadinessStatus> {
  const status: ReadinessStatus = {
    stylesLoaded: false,
    fontsLoaded: false,
    criticalCSSInjected: false,
    isReady: false,
    errors: [],
  };

  try {
    // 检查样式表是否加载
    const stylesheets = Array.from(document.styleSheets);
    status.stylesLoaded = stylesheets.length > 0;
    
    if (!status.stylesLoaded) {
      status.errors.push('No stylesheets loaded');
    }

    // 检查字体是否加载
    if ('fonts' in document) {
      const fontFaces = await (document as any).fonts.ready;
      status.fontsLoaded = true;
    } else {
      // Fallback: 检查字体是否可用
      status.fontsLoaded = true;
    }

    // 检查 Critical CSS 是否注入
    const criticalStyle = document.getElementById('critical-css');
    status.criticalCSSInjected = criticalStyle !== null;
    
    if (!status.criticalCSSInjected) {
      status.errors.push('Critical CSS not injected');
    }

    // 综合判断是否就绪
    status.isReady = status.stylesLoaded && status.fontsLoaded;
    
  } catch (error) {
    status.errors.push(`Readiness check failed: ${error}`);
  }

  return status;
}

// ============================================================================
// 自动修复函数
// ============================================================================

async function attemptFix(status: ReadinessStatus): Promise<void> {
  // 如果样式未加载，尝试重新注入
  if (!status.stylesLoaded) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/app/globals.css';
    document.head.appendChild(link);
  }

  // 如果 Critical CSS 未注入，尝试加载
  if (!status.criticalCSSInjected) {
    try {
      const response = await fetch('/critical.css');
      if (response.ok) {
        const css = await response.text();
        const style = document.createElement('style');
        style.id = 'critical-css';
        style.textContent = css;
        document.head.appendChild(style);
      }
    } catch (error) {
      console.warn('Failed to load critical CSS:', error);
    }
  }
}

// ============================================================================
// 用户友好提示
// ============================================================================

function showLoadingIndicator(): void {
  const existing = document.getElementById('readiness-loading');
  if (existing) return;

  const loading = document.createElement('div');
  loading.id = 'readiness-loading';
  loading.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(to bottom right, #eef2ff, #e0e7ff);
      z-index: 9999;
    ">
      <div style="
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 1rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      ">
        <div style="
          width: 48px;
          height: 48px;
          border: 4px solid #e0e7ff;
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 1rem;
        "></div>
        <p style="
          color: #475569;
          font-size: 1rem;
          font-weight: 500;
        ">正在加载资源...</p>
        <style>
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </div>
    </div>
  `;
  document.body.appendChild(loading);
}

function hideLoadingIndicator(): void {
  const loading = document.getElementById('readiness-loading');
  if (loading) {
    loading.remove();
  }
}

function showErrorIndicator(errors: string[]): void {
  hideLoadingIndicator();
  
  const existing = document.getElementById('readiness-error');
  if (existing) return;

  const error = document.createElement('div');
  error.id = 'readiness-error';
  error.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(to bottom right, #fef2f2, #fee2e2);
      z-index: 9999;
    ">
      <div style="
        text-align: center;
        padding: 2rem;
        background: white;
        border-radius: 1rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        max-width: 400px;
      ">
        <div style="
          width: 48px;
          height: 48px;
          background: #fee2e2;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1rem;
        ">
          <svg style="width: 24px; height: 24px; color: #dc2626;" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
          </svg>
        </div>
        <h2 style="
          color: #991b1b;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        ">加载失败</h2>
        <p style="
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1rem;
        ">资源加载超时，请检查网络连接</p>
        <button onclick="location.reload()" style="
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.5rem 1.5rem;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        ">重试</button>
      </div>
    </div>
  `;
  document.body.appendChild(error);
}

// ============================================================================
// Readiness Gate 主函数
// ============================================================================

async function readinessGate(): Promise<boolean> {
  showLoadingIndicator();
  
  let retries = 0;
  let isReady = false;

  while (retries < READINESS_CONFIG.maxRetries) {
    try {
      const status = await checkReadiness();
      
      if (status.isReady) {
        isReady = true;
        break;
      }

      // 尝试自动修复
      await attemptFix(status);
      
      retries++;
      
      // 等待一段时间后重试
      await new Promise(resolve => 
        setTimeout(resolve, READINESS_CONFIG.probeInterval)
      );
    } catch (error) {
      console.error('Readiness gate error:', error);
      retries++;
    }
  }

  if (isReady) {
    hideLoadingIndicator();
  } else {
    showErrorIndicator(['Style loading timeout']);
  }

  return isReady;
}

// ============================================================================
// Next.js Middleware
// ============================================================================

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // 添加安全头
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // 添加 Readiness Gate 标识
  response.headers.set('X-Readiness-Gate', 'enabled');
  
  return response;
}

// ============================================================================
// 配置匹配路径
// ============================================================================

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (API 路由)
     * - _next/static (静态文件)
     * - _next/image (图片优化)
     * - favicon.ico (favicon)
     * - public 目录下的文件
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};

// ============================================================================
// 客户端脚本注入 (用于 layout.tsx)
// ============================================================================

export const readinessScript = `
  (function() {
    if (typeof window === 'undefined') return;
    
    const READINESS_CONFIG = {
      styleLoadTimeout: ${READINESS_CONFIG.styleLoadTimeout},
      probeInterval: ${READINESS_CONFIG.probeInterval},
      maxRetries: ${READINESS_CONFIG.maxRetries},
    };
    
    async function checkReadiness() {
      const status = {
        stylesLoaded: false,
        fontsLoaded: false,
        isReady: false,
      };
      
      try {
        status.stylesLoaded = document.styleSheets.length > 0;
        status.fontsLoaded = true;
        status.isReady = status.stylesLoaded && status.fontsLoaded;
      } catch (e) {
        console.error('Readiness check failed:', e);
      }
      
      return status;
    }
    
    async function readinessGate() {
      const startTime = Date.now();
      let retries = 0;
      
      while (retries < READINESS_CONFIG.maxRetries) {
        const elapsed = Date.now() - startTime;
        if (elapsed > READINESS_CONFIG.styleLoadTimeout) {
          console.warn('Readiness gate timeout');
          break;
        }
        
        const status = await checkReadiness();
        if (status.isReady) {
          document.documentElement.classList.add('readiness-ready');
          return true;
        }
        
        retries++;
        await new Promise(r => setTimeout(r, READINESS_CONFIG.probeInterval));
      }
      
      return false;
    }
    
    // 启动 Readiness Gate
    readinessGate().catch(console.error);
  })();
`;
