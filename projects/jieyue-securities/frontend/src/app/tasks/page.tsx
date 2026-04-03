'use client'

import { useState, useEffect } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Button, Card, CardBody, SkeletonTable, toast } from '../../components/ui'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

interface Task {
  id: number
  url: string | null
  status: string
  content_type: string | null
  duration: number | null
  cost: number | null
  created_at: string
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/task/list?user_id=1`)
      setTasks(response.data)
    } catch (error) {
      console.error('加载任务列表失败:', error)
      toast.error('加载任务列表失败')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { variant: 'primary' | 'success' | 'warning' | 'error'; text: string }> = {
      'INIT': { variant: 'primary', text: '待处理' },
      'PARSING': { variant: 'primary', text: '解析中' },
      'ASR_PROCESSING': { variant: 'warning', text: '语音识别中' },
      'SUMMARIZING': { variant: 'primary', text: '生成摘要中' },
      'SUCCESS': { variant: 'success', text: '已完成' },
      'FAILED': { variant: 'error', text: '失败' },
    }
    return badges[status] || { variant: 'primary', text: status }
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 gradient-primary">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <SkeletonTable rows={1} />
            <SkeletonTable rows={1} />
          </div>
          <Card>
            <SkeletonTable rows={5} />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 gradient-primary">
      <div className="max-w-6xl mx-auto">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 animate-slide-in">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的任务</h1>
            <p className="text-gray-600 mt-1">
              共 {tasks.length} 个任务
            </p>
          </div>
          <Link href="/">
            <Button variant="primary" leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }>
              提交新任务
            </Button>
          </Link>
        </div>

        {/* 任务列表 */}
        {tasks.length === 0 ? (
          <Card className="text-center py-16">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">暂无任务</h3>
            <p className="text-gray-600 mb-6">开始提交第一个视频分析任务吧</p>
            <Link href="/">
              <Button variant="primary">
                提交第一个任务
              </Button>
            </Link>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      状态
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      类型
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      时长
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      费用
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      创建时间
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tasks.map((task) => {
                    const statusBadge = getStatusBadge(task.status)
                    return (
                      <tr
                        key={task.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          #{task.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${statusBadge.variant === 'success' ? 'bg-green-100 text-green-800' : ''}
                            ${statusBadge.variant === 'warning' ? 'bg-yellow-100 text-yellow-800' : ''}
                            ${statusBadge.variant === 'error' ? 'bg-red-100 text-red-800' : ''}
                            ${statusBadge.variant === 'primary' ? 'bg-indigo-100 text-indigo-800' : ''}
                          `}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.content_type || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {task.duration ? `${task.duration}秒` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          ¥{task.cost?.toFixed(2) || '0.00'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(task.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            href={`/task/${task.id}`}
                            className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                          >
                            详情 →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
