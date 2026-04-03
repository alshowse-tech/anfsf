'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [wallet, setWallet] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'wallet' | 'history'>('profile')

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        router.push('/auth/login')
        return
      }

      // Load user profile
      const userRes = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (userRes.ok) {
        const userData = await userRes.json()
        setUser(userData)
      }

      // Load wallet
      const walletRes = await fetch('/api/wallets/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (walletRes.ok) {
        const walletData = await walletRes.json()
        setWallet(walletData)
      }
    } catch (error) {
      console.error('Failed to load user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">个人中心</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center">
                  <span className="text-2xl font-bold text-blue-600">
                    {user?.phone?.slice(-4) || '用户'}
                  </span>
                </div>
                <h2 className="mt-4 text-lg font-semibold">
                  {user?.nickname || `用户${user?.phone?.slice(-4) || ''}`}
                </h2>
                <p className="text-gray-500 text-sm">{user?.phone}</p>
              </div>

              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'profile'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  个人信息
                </button>
                <button
                  onClick={() => setActiveTab('wallet')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'wallet'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  钱包管理
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'history'
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  使用记录
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition"
                >
                  退出登录
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3">
            {activeTab === 'profile' && <ProfileTab user={user} onUpdate={loadUserData} />}
            {activeTab === 'wallet' && <WalletTab wallet={wallet} />}
            {activeTab === 'history' && <HistoryTab />}
          </div>
        </div>
      </main>
    </div>
  )
}

// Profile Tab Component
function ProfileTab({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    nickname: user?.nickname || '',
    email: user?.email || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setEditing(false)
        onUpdate()
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">个人信息</h2>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
          >
            编辑
          </button>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              昵称
            </label>
            <input
              type="text"
              value={formData.nickname}
              onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <dl className="space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">手机号</dt>
            <dd className="mt-1 text-lg">{user?.phone}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">昵称</dt>
            <dd className="mt-1 text-lg">{user?.nickname || '未设置'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">邮箱</dt>
            <dd className="mt-1 text-lg">{user?.email || '未设置'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">注册时间</dt>
            <dd className="mt-1 text-lg">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '-'}
            </dd>
          </div>
        </dl>
      )}
    </div>
  )
}

// Wallet Tab Component
function WalletTab({ wallet }: { wallet: any }) {
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [recharging, setRecharging] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'wechat' | 'alipay'>('wechat')

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault()
    setRecharging(true)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseFloat(rechargeAmount),
          method: paymentMethod
        })
      })

      const data = await res.json()
      
      if (data.success) {
        if (data.pay_url) {
          window.open(data.pay_url, '_blank')
        } else if (data.code_url) {
          // Show QR code for WeChat
          alert(`请扫描二维码支付：${data.code_url}`)
        }
      } else {
        alert('创建订单失败：' + data.error)
      }
    } catch (error) {
      console.error('Recharge failed:', error)
      alert('充值失败，请重试')
    } finally {
      setRecharging(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow p-6 text-white">
        <h2 className="text-lg font-medium opacity-90">账户余额</h2>
        <p className="text-4xl font-bold mt-2">¥{wallet?.balance || '0.00'}</p>
        <p className="text-sm opacity-75 mt-2">
          更新时间：{wallet?.updated_at ? new Date(wallet.updated_at).toLocaleString('zh-CN') : '-'}
        </p>
      </div>

      {/* Recharge */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">充值</h3>
        
        <form onSubmit={handleRecharge} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              充值金额
            </label>
            <div className="flex gap-2">
              {[50, 100, 200, 500].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setRechargeAmount(amount.toString())}
                  className={`px-4 py-2 rounded-lg border transition ${
                    rechargeAmount === amount.toString()
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-gray-300 hover:border-blue-300'
                  }`}
                >
                  ¥{amount}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={rechargeAmount}
              onChange={(e) => setRechargeAmount(e.target.value)}
              placeholder="自定义金额"
              className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支付方式
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'wechat'}
                  onChange={() => setPaymentMethod('wechat')}
                  className="text-blue-600"
                />
                <span>微信支付</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'alipay'}
                  onChange={() => setPaymentMethod('alipay')}
                  className="text-blue-600"
                />
                <span>支付宝</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={recharging || !rechargeAmount}
            className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {recharging ? '处理中...' : '立即充值'}
          </button>
        </form>
      </div>

      {/* Transaction History Preview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">最近交易</h3>
        <div className="text-gray-500 text-center py-8">
          暂无交易记录
        </div>
      </div>
    </div>
  )
}

// History Tab Component
function HistoryTab() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/tasks?limit=50', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        const data = await res.json()
        setTasks(data.items || data)
      }
    } catch (error) {
      console.error('Failed to load tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      INIT: 'bg-gray-100 text-gray-800',
      PARSING: 'bg-blue-100 text-blue-800',
      ASR_PROCESSING: 'bg-yellow-100 text-yellow-800',
      SUMMARIZING: 'bg-purple-100 text-purple-800',
      SUCCESS: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h3 className="text-xl font-semibold">使用记录</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">任务 ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">费用</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">时间</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  暂无使用记录
                </td>
              </tr>
            ) : (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">#{task.id}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(task.status)}`}>
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{task.content_type}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">¥{task.cost || '0.00'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(task.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4">
                    <a
                      href={`/task/${task.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      查看详情
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
