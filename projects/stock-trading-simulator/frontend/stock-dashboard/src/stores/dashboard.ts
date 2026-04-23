import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { tradingApi, type WatchListData, type StockCandidate } from '@/api'
import { wsService, type WebSocketMessage } from '@/services/websocket'

export interface Position {
  symbol: string
  name: string
  quantity: number
  cost_price: number
  current_price: number
  market_value: number
  profit_loss: number
  profit_rate: number
  position_pct: number
  is_mainline: boolean
  is_auto_rebuy: boolean
}

export interface Signal {
  signal_id: string
  symbol: string
  signal_type: 'BUY' | 'SELL' | 'HOLD' | 'REBUY'
  signal_reason: string
  signal_strength: number
  signal_time: string
  status: 'pending' | 'executed'
}

export interface Account {
  total_assets: number
  cash_balance: number
  market_value: number
  daily_profit: number
  daily_return_rate: number
  overall_return_rate: number
}

export interface RiskMetrics {
  position_risk: number
  stop_loss_count: number
  max_drawdown: number
  current_drawdown: number
}

export const useDashboardStore = defineStore('dashboard', () => {
  // State
  const account = ref<Account | null>(null)
  const positions = ref<Position[]>([])
  const signals = ref<Signal[]>([])
  const watchlist = ref<WatchListData | null>(null)
  const riskMetrics = ref<RiskMetrics | null>(null)
  const loading = ref(false)
  const lastUpdateTime = ref<Date | null>(null)

  // Getters
  const totalProfit = computed(() => {
    if (!account.value) return 0
    return account.value.daily_profit
  })

  const totalReturnRate = computed(() => {
    if (!account.value) return 0
    return account.value.daily_return_rate
  })

  const positionCount = computed(() => positions.value.length)

  const activeSignals = computed(() => 
    signals.value.filter(s => s.status === 'pending')
  )

  const mainlinePositions = computed(() => 
    positions.value.filter(p => p.is_mainline)
  )

  // Actions
  async function fetchAccount() {
    loading.value = true
    try {
      const response = await tradingApi.getAccount()
      if (response.code === 200) {
        account.value = response.data
        positions.value = response.data.positions || []
        riskMetrics.value = response.data.risk_metrics || null
        lastUpdateTime.value = new Date()
      }
    } catch (error) {
      console.error('Failed to fetch account:', error)
    } finally {
      loading.value = false
    }
  }

  async function fetchWatchlist() {
    try {
      const response = await tradingApi.getCurrentWatchlist()
      if (response.code === 200) {
        watchlist.value = response.data
      }
    } catch (error) {
      console.error('Failed to fetch watchlist:', error)
    }
  }

  async function fetchSignals() {
    // TODO: WebSocket 实时推送
    // 暂时从订单接口获取
    try {
      const response = await tradingApi.getOrders({ page_size: 50 })
      if (response.code === 200) {
        signals.value = response.data.items.map((order: any) => ({
          signal_id: order.order_id,
          symbol: order.symbol,
          signal_type: order.side.toUpperCase(),
          signal_reason: `${order.order_type} order`,
          signal_strength: 0.8,
          signal_time: order.created_at,
          status: order.status === 'filled' ? 'executed' : 'pending'
        }))
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error)
    }
  }

  async function refreshAll() {
    await Promise.all([
      fetchAccount(),
      fetchWatchlist(),
      fetchSignals()
    ])
  }

  // Initialize WebSocket listeners
  function initWebSocket() {
    wsService.onMessage((message: WebSocketMessage) => {
      switch (message.type) {
        case 'signal':
          // Add new signal to list
          signals.value.unshift({
            signal_id: message.data.signal_id,
            symbol: message.data.symbol,
            signal_type: message.data.signal_type,
            signal_reason: message.data.signal_reason,
            signal_strength: message.data.signal_strength,
            signal_time: message.data.signal_time,
            status: message.data.status
          })
          break
        case 'price_update':
          // Update position prices
          const position = positions.value.find(p => p.symbol === message.data.symbol)
          if (position) {
            position.current_price = message.data.price
            position.market_value = position.quantity * message.data.price
            position.profit_loss = (message.data.price - position.cost_price) * position.quantity
            position.profit_rate = ((message.data.price - position.cost_price) / position.cost_price) * 100
          }
          break
        case 'alert':
          // Could add alert store integration
          console.log('Alert received:', message.data)
          break
      }
      lastUpdateTime.value = new Date()
    })
  }

  function clearData() {
    account.value = null
    positions.value = []
    signals.value = []
    watchlist.value = null
    riskMetrics.value = null
    lastUpdateTime.value = null
  }

  return {
    // State
    account,
    positions,
    signals,
    watchlist,
    riskMetrics,
    loading,
    lastUpdateTime,
    // Getters
    totalProfit,
    totalReturnRate,
    positionCount,
    activeSignals,
    mainlinePositions,
    // Actions
    fetchAccount,
    fetchWatchlist,
    fetchSignals,
    refreshAll,
    clearData,
    initWebSocket
  }
})
