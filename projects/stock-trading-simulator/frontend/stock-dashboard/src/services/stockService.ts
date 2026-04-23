/**
 * 股票信息服务
 * 提供股票代码与名称的关联查询
 */
import api from '@/api'

export interface StockInfo {
  symbol: string
  name: string
  exchange: string
  market: string
  sector: string
  industry?: string
  status?: string
}

// 本地缓存
const stockNameCache = new Map<string, string>()
const stockInfoCache = new Map<string, StockInfo>()

/**
 * 获取股票名称
 */
export async function getStockName(symbol: string): Promise<string> {
  // 检查缓存
  if (stockNameCache.has(symbol)) {
    return stockNameCache.get(symbol)!
  }
  
  try {
    const response = await api.get(`/stocks/info/${symbol}`)
    if (response.code === 200 && response.data) {
      const name = response.data.name
      stockNameCache.set(symbol, name)
      return name
    }
  } catch (error) {
    console.error(`获取股票名称失败 ${symbol}:`, error)
  }
  
  return ''
}

/**
 * 获取股票详细信息
 */
export async function getStockInfo(symbol: string): Promise<StockInfo | null> {
  // 检查缓存
  if (stockInfoCache.has(symbol)) {
    return stockInfoCache.get(symbol)!
  }
  
  try {
    const response = await api.get(`/stocks/info/${symbol}`)
    if (response.code === 200 && response.data) {
      const info: StockInfo = response.data
      stockInfoCache.set(symbol, info)
      return info
    }
  } catch (error) {
    console.error(`获取股票信息失败 ${symbol}:`, error)
  }
  
  return null
}

/**
 * 批量获取股票名称
 */
export async function getStockNamesBatch(symbols: string[]): Promise<Record<string, string>> {
  const uncachedSymbols = symbols.filter(s => !stockNameCache.has(s))
  
  if (uncachedSymbols.length === 0) {
    // 全部命中缓存
    return symbols.reduce((acc, symbol) => {
      acc[symbol] = stockNameCache.get(symbol)!
      return acc
    }, {} as Record<string, string>)
  }
  
  try {
    const response = await api.get('/stocks/names/batch', {
      params: { symbols: uncachedSymbols.join(',') }
    })
    
    if (response.code === 200 && response.data.names) {
      // 更新缓存
      Object.entries(response.data.names).forEach(([symbol, name]) => {
        stockNameCache.set(symbol, name as string)
      })
    }
    
    // 返回所有请求的股票名称
    return symbols.reduce((acc, symbol) => {
      acc[symbol] = stockNameCache.get(symbol) || ''
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    console.error('批量获取股票名称失败:', error)
    return {}
  }
}

/**
 * 搜索股票
 */
export async function searchStocks(query: string, limit: number = 20): Promise<StockInfo[]> {
  try {
    const response = await api.get('/stocks/search', {
      params: { query, limit }
    })
    
    if (response.code === 200 && response.data.stocks) {
      return response.data.stocks
    }
  } catch (error) {
    console.error('搜索股票失败:', error)
  }
  
  return []
}

/**
 * 格式化股票显示 (代码 + 名称)
 */
export function formatStock(symbol: string, name?: string): string {
  if (name) {
    return `${symbol} - ${name}`
  }
  const cachedName = stockNameCache.get(symbol)
  if (cachedName) {
    return `${symbol} - ${cachedName}`
  }
  return symbol
}

/**
 * 预加载股票名称
 */
export async function preloadStockNames(symbols: string[]): Promise<void> {
  await getStockNamesBatch(symbols)
}

/**
 * 清空缓存
 */
export function clearCache(): void {
  stockNameCache.clear()
  stockInfoCache.clear()
}
