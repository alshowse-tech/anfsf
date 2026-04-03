import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { readinessScript } from '../middleware'

// 配置中文字体支持
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: '捷阅证券信息助手',
  description: '证券内容智能分析与合规审核平台',
  icons: {
    icon: '/favicon.svg',
  },
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#6366f1' },
    { media: '(prefers-color-scheme: dark)', color: '#4f46e5' },
  ],
}

// Critical CSS - 首屏关键样式内联
const criticalCSS = `
  :root {
    --bg-primary: #ffffff;
    --bg-secondary: #f8fafc;
    --text-primary: #0f172a;
  }
  body {
    margin: 0;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: var(--bg-primary);
    color: var(--text-primary);
  }
  .navbar {
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }
  .hero {
    background: linear-gradient(to bottom right, #eef2ff, #e0e7ff);
  }
`.replace(/\n/g, '')

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={inter.variable}>
      <head>
        {/* Critical CSS 内联 - 防止 FOUC */}
        <style id="critical-css" dangerouslySetInnerHTML={{ __html: criticalCSS }} />
        
        {/* Readiness Gate 脚本 */}
        <script dangerouslySetInnerHTML={{ __html: readinessScript }} />
        
        {/* 预加载关键资源 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* PWA 支持 */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366f1" />
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* Readiness Gate 状态标记 */}
        <div id="readiness-root" className="readiness-loading">
          {children}
        </div>
      </body>
    </html>
  )
}
