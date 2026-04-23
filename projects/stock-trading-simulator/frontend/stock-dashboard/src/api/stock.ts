/**
 * 股票信息 API
 */
import api from './index'

export interface StockInfo {
  symbol: string
  name: string
  exchange: string
  market: string
  sector: string
  industry: string
  status: string
}

/**
 * 获取股票信息
 */
export async function getStockInfo(symbol: string): Promise<StockInfo | null> {
  try {
    // TODO: 实现后端 API
    // const response = await api.get(`/stocks/${symbol}`)
    // return response.data
    
    // 临时使用本地映射
    const stockNameMap: Record<string, string> = {
      '300308.SZ': '中际旭创',
      '300502.SZ': '新易盛',
      '002463.SZ': '电科芯片',
      '600519.SH': '贵州茅台',
      '300750.SZ': '宁德时代'
    }
    
    return {
      symbol,
      name: stockNameMap[symbol] || '未知',
      exchange: symbol.split('.')[1] || 'SZ',
      market: '创业板',
      sector: '通信',
      industry: '光模块',
      status: 'active'
    }
  } catch (error) {
    console.error('获取股票信息失败:', error)
    return null
  }
}

/**
 * 搜索股票 (支持代码和名称)
 */
export async function searchStocks(query: string): Promise<StockInfo[]> {
  try {
    // TODO: 实现后端 API
    // const response = await api.get('/stocks/search', { params: { query } })
    // return response.data
    
    // 临时使用本地映射
    const allStocks: StockInfo[] = [
      { symbol: '300308.SZ', name: '中际旭创', exchange: 'SZ', market: '创业板', sector: '通信', industry: '光模块', status: 'active' },
      { symbol: '300502.SZ', name: '新易盛', exchange: 'SZ', market: '创业板', sector: '电子', industry: '半导体', status: 'active' },
      { symbol: '002463.SZ', name: '电科芯片', exchange: 'SZ', market: '主板', sector: '电子', industry: '半导体', status: 'active' },
      { symbol: '600519.SH', name: '贵州茅台', exchange: 'SH', market: '主板', sector: '食品饮料', industry: '白酒', status: 'active' },
      { symbol: '300750.SZ', name: '宁德时代', exchange: 'SZ', market: '创业板', sector: '电力设备', industry: '电池', status: 'active' }
    ]
    
    const queryLower = query.toLowerCase()
    return allStocks.filter(stock => 
      stock.symbol.toLowerCase().includes(queryLower) ||
      stock.name.toLowerCase().includes(queryLower)
    )
  } catch (error) {
    console.error('搜索股票失败:', error)
    return []
  }
}
