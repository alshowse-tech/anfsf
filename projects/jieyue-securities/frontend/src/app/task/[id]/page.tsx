'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import axios from 'axios'
import Link from 'next/link'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface TaskDetail {
  id: number
  user_id: number
  url: string | null
  status: string
  content_type: string | null
  duration: number | null
  cost: number | null
  error_msg: string | null
  created_at: string
  updated_at: string
  result: {
    key_points: string[]
    abstract: string
    risk_tags: string[]
  } | null
}

export default function TaskDetailPage() {
  const params = useParams()
  const taskId = params.id as string
  const [task, setTask] = useState<TaskDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadTask()
    // 如果任务未完成，每 5 秒刷新一次
    const interval = setInterval(() => {
      if (task && !['SUCCESS', 'FAILED'].includes(task.status)) {
        loadTask(true)
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [taskId])

  const loadTask = async (refresh = false) => {
    if (refresh) setRefreshing(true)
    try {
      const response = await axios.get(`${API_BASE}/task/${taskId}`)
      setTask(response.data)
    } catch (error) {
      console.error('加载任务详情失败:', error)
    } finally {
      if (refresh) setRefreshing(false)
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'INIT': 'bg-gray-200 text-gray-800',
      'PARSING': 'bg-blue-200 text-blue-800',
      'ASR_PROCESSING': 'bg-yellow-200 text-yellow-800',
      'SUMMARIZING': 'bg-purple-200 text-purple-800',
      'SUCCESS': 'bg-green-200 text-green-800',
      'FAILED': 'bg-red-200 text-red-800',
    }
    return colors[status] || 'bg-gray-200 text-gray-800'
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      'INIT': '待处理',
      'PARSING': '解析中',
      'ASR_PROCESSING': '语音识别中',
      'SUMMARIZING': '生成摘要中',
      'SUCCESS': '已完成',
      'FAILED': '失败',
    }
    return texts[status] || status
  }

  const getRiskLevelColor = (tag: string) => {
    if (tag.includes('违法') || tag.includes('诈骗')) return 'bg-red-100 text-red-800'
    if (tag.includes('投资建议')) return 'bg-yellow-100 text-yellow-800'
    if (tag.includes('主观判断')) return 'bg-blue-100 text-blue-800'
    return 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-xl">加载中...</div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">任务不存在</h1>
          <Link href="/tasks" className="text-blue-600 hover:underline">
            返回任务列表
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/tasks" className="text-blue-600 hover:underline">
            ← 返回任务列表
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <h1 className="text-2xl font-bold">任务 #{task.id}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
              {getStatusText(task.status)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500">视频 URL</p>
              <p className="text-sm break-all">{task.url || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">创建时间</p>
              <p className="text-sm">{new Date(task.created_at).toLocaleString('zh-CN')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">内容类型</p>
              <p className="text-sm">{task.content_type || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">视频时长</p>
              <p className="text-sm">{task.duration ? `${task.duration}秒` : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">费用</p>
              <p className="text-sm">¥{task.cost?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">更新时间</p>
              <p className="text-sm">{new Date(task.updated_at).toLocaleString('zh-CN')}</p>
            </div>
          </div>

          {task.error_msg && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
              <p className="font-medium">错误信息</p>
              <p>{task.error_msg}</p>
            </div>
          )}

          {refreshing && (
            <div className="text-sm text-gray-500">正在刷新状态...</div>
          )}
        </div>

        {task.status === 'SUCCESS' && task.result && (
          <>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">分析结果</h2>
              
              <div className="mb-4">
                <h3 className="font-medium mb-2">关键点</h3>
                <ul className="list-disc list-inside space-y-1">
                  {task.result.key_points.map((point, index) => (
                    <li key={index} className="text-sm text-gray-700">{point}</li>
                  ))}
                </ul>
              </div>

              <div className="mb-4">
                <h3 className="font-medium mb-2">摘要</h3>
                <p className="text-sm text-gray-700 leading-relaxed">{task.result.abstract}</p>
              </div>

              {task.result.risk_tags && task.result.risk_tags.length > 0 && (
                <div>
                  <h3 className="font-medium mb-2">风险标签</h3>
                  <div className="flex flex-wrap gap-2">
                    {task.result.risk_tags.map((tag, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 text-xs rounded-full ${getRiskLevelColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {['INIT', 'PARSING', 'ASR_PROCESSING', 'SUMMARIZING'].includes(task.status) && (
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <div className="animate-pulse text-gray-500">
              任务处理中，请稍候...
            </div>
            <div className="mt-4 text-sm text-gray-400">
              当前状态：{getStatusText(task.status)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
