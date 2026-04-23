import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加 JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('jwt_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api

// ============ 操盘区接口 ============

export interface WatchListItem {
  symbol: string
  name: string
  priority: number
  is_active: boolean
  added_at: string
}

export interface WatchListData {
  version_id: string
  version_name: string
  status: string
  items: WatchListItem[]
}

export const tradingApi = {
  // 初始化白名单
  initWatchlist(data: { version_name: string; description: string; symbols: string[]; priority_map: Record<string, number> }) {
    return api.post('/trading/watchlist/init', data)
  },

  // 修正白名单
  reviseWatchlist(data: { add?: string[]; remove?: string[]; reason: string; effective_now: boolean }) {
    return api.post('/trading/watchlist/revise', data)
  },

  // 查询当前白名单
  getCurrentWatchlist(include_inactive?: boolean) {
    return api.get('/trading/watchlist/current', { params: { include_inactive } })
  },

  // 午间任务
  runNoonTask(strategy_config?: any) {
    return api.post('/trading/run/noon', { strategy_config })
  },

  // 日终任务
  runCloseTask(strategy_config?: any, next_day_trading_mode?: string) {
    return api.post('/trading/run/close', { strategy_config, next_day_trading_mode })
  },

  // 查询委托
  getOrders(params?: { symbol?: string; status?: string; page?: number; page_size?: number }) {
    return api.get('/trading/orders', { params })
  },

  // 查询成交
  getFills(params?: { symbol?: string; start_date?: string; end_date?: string; page?: number; page_size?: number }) {
    return api.get('/trading/fills', { params })
  },

  // 查询账户与持仓
  getAccount() {
    return api.get('/trading/account')
  }
}

// ============ 智能选股区接口 ============

export interface StockCandidate {
  symbol: string
  name: string
  rps_10: number
  rps_20: number
  rps_50: number
  sector: string
  sub_sector: string
  形态命中: string
  建议动作: string
  风险等级: string
}

export interface SectorRanking {
  sector_code: string
  sector_name: string
  rps_10: number
  rps_20: number
  rps_50: number
  qualifying_stocks: number
  stocks: string[]
}

export const screenerApi = {
  // 全市场筛选
  runScreening(data: { trigger_date: string; rps_threshold: number; min_sectors_with_qualifying_stocks: number; include_turbo_board: boolean; exclude_st_suspension: boolean }) {
    return api.post('/screener/run', data)
  },

  // 获取候选池
  getCandidates(params: { pool_type: string; sector?: string; min_rps?: number; page?: number; page_size?: number }) {
    return api.get('/screener/candidates', { params })
  },

  // 个股诊断
  getDiagnostics(symbol: string, date?: string) {
    return api.get(`/screener/symbol/${symbol}`, { params: { date } })
  },

  // 板块强度排行
  getSectors(date?: string, top_n?: number, min_qualifying_stocks?: number) {
    return api.get('/screener/sectors', { params: { date, top_n, min_qualifying_stocks } })
  }
}

// ============ 公共接口 ============

export const healthApi = {
  healthCheck() {
    return api.get('/health')
  }
}
