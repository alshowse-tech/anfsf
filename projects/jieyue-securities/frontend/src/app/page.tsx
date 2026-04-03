'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import axios from 'axios'
import { Button, Input, Card, CardBody, toast } from '../components/ui'
import { SmartURLInput } from '../components/SmartURLInput'
import { PlatformIcon } from '../components/PlatformIcon'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

export default function HomePage() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [platform, setPlatform] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleUrlValidated = (validatedUrl: string, detectedPlatform: string) => {
    setUrl(validatedUrl)
    setPlatform(detectedPlatform)
    setError('')
  }

  const handleUrlCleared = () => {
    setUrl('')
    setPlatform('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      setError('请输入有效的视频链接')
      toast.error('请输入有效的视频链接')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await axios.post(`${API_BASE}/task/create?user_id=1`, {
        url: url.trim()
      })
      
      toast.success('提交成功！正在处理中...', 3000)
      
      setTimeout(() => {
        router.push(`/task/${response.data.id}`)
      }, 1000)
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || '提交失败，请重试'
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen gradient-primary">
      {/* 导航栏 */}
      <nav className="navbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="navbar-brand">🎬 捷阅证券</h1>
              </div>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-4">
                  <Link href="/" className="navbar-link navbar-link-active">
                    首页
                  </Link>
                  <Link href="/tasks" className="navbar-link">
                    任务列表
                  </Link>
                  <Link href="/profile" className="navbar-link">
                    个人中心
                  </Link>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">登录</Button>
              </Link>
              <Link href="/auth/register">
                <Button variant="primary" size="sm">注册</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero 区域 - 优化视觉层次 */}
        <div className="text-center mb-16 animate-slide-in">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
            证券内容智能分析与
            <span className="text-indigo-600"> 合规审核平台</span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            自动解析视频/音频内容，生成智能摘要，识别投资风险提示标签
            <br />
            <span className="text-sm text-gray-500">让合规审核效率提升 80%</span>
          </p>
        </div>

        {/* 功能卡片 - 优化布局 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card hoverable className="transform transition-transform duration-200 hover:-translate-y-1">
            <CardBody>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">高效解析</h3>
              <p className="text-gray-600 leading-relaxed">
                自动解析视频/音频 URLs，提取内容，审核时间减少 80%
              </p>
            </CardBody>
          </Card>
          
          <Card hoverable className="transform transition-transform duration-200 hover:-translate-y-1">
            <CardBody>
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">智能摘要</h3>
              <p className="text-gray-600 leading-relaxed">
                AI 自动生成内容摘要，快速了解核心信息
              </p>
            </CardBody>
          </Card>
          
          <Card hoverable className="transform transition-transform duration-200 hover:-translate-y-1">
            <CardBody>
              <div className="text-4xl mb-4">🛡️</div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">合规检测</h3>
              <p className="text-gray-600 leading-relaxed">
                自动识别违规内容，准确率 ≥ 95%
              </p>
            </CardBody>
          </Card>
        </div>

        {/* 提交表单 - 优化交互体验 */}
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-2xl">
            <div className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                提交视频链接
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 智能 URL 输入框 */}
                <SmartURLInput
                  onUrlValidated={handleUrlValidated}
                  onUrlCleared={handleUrlCleared}
                  placeholder="粘贴抖音/小红书/B 站/快手/视频号分享链接或文案..."
                  disabled={loading}
                  initialValue={url}
                />

                {/* 错误提示 */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm">{error}</span>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={loading}
                  disabled={!url.trim()}
                >
                  {loading ? '处理中...' : '提交分析'}
                </Button>
              </form>

              {/* 支持的平台 */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
                  支持的平台
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <PlatformItem icon="🎵" name="抖音" />
                  <PlatformItem icon="📕" name="小红书" />
                  <PlatformItem icon="📺" name="B 站" />
                  <PlatformItem icon="📹" name="快手" />
                  <PlatformItem icon="💬" name="视频号" />
                </div>
              </div>
            </div>
          </Card>

          {/* 快速链接 */}
          <div className="mt-8 text-center">
            <Link
              href="/tasks"
              className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              查看我的任务列表
              <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="bg-gray-900 text-white mt-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">🎬</span> 捷阅证券信息助手
              </h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                专业的证券内容智能分析与合规审核平台
              </p>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">快速链接</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li>
                  <Link href="/" className="hover:text-white transition-colors">
                    首页
                  </Link>
                </li>
                <li>
                  <Link href="/tasks" className="hover:text-white transition-colors">
                    任务列表
                  </Link>
                </li>
                <li>
                  <Link href="/profile" className="hover:text-white transition-colors">
                    个人中心
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-lg font-semibold mb-4">联系方式</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li className="flex items-center">
                  <span className="mr-2">📧</span> support@jieyue.com
                </li>
                <li className="flex items-center">
                  <span className="mr-2">📱</span> 400-xxx-xxxx
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            © 2026 捷阅证券信息助手。All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}

// 平台项组件
function PlatformItem({ icon, name }: { icon: string; name: string }) {
  return (
    <div className="flex items-center text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-100">
      <span className="mr-2 text-lg">{icon}</span>
      {name}
    </div>
  )
}
