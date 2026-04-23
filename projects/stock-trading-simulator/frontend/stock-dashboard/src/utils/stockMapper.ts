/**
 * 股票代码映射工具
 * 用于将股票代码转换为股票名称
 */

// 示例股票映射 (实际应从后端 API 获取)
export const stockNameMap: Record<string, string> = {
  '300308.SZ': '中际旭创',
  '300502.SZ': '新易盛',
  '002463.SZ': '电科芯片',
  '600519.SH': '贵州茅台',
  '300750.SZ': '宁德时代',
  '000858.SZ': '五 粮 液',
  '002594.SZ': '比亚迪',
  '300059.SZ': '东方财富',
  '601318.SH': '中国平安',
  '600036.SH': '招商银行'
}

/**
 * 根据股票代码获取股票名称
 */
export function getStockName(symbol: string): string {
  return stockNameMap[symbol] || ''
}

/**
 * 格式化股票显示 (代码 + 名称)
 */
export function formatStock(symbol: string): string {
  const name = getStockName(symbol)
  return name ? `${symbol} - ${name}` : symbol
}

/**
 * 搜索股票 (支持代码和名称)
 */
export function searchStock(query: string, symbol: string): boolean {
  if (!query) return true
  
  const queryLower = query.toLowerCase()
  const symbolLower = symbol.toLowerCase()
  const name = getStockName(symbol).toLowerCase()
  
  return symbolLower.includes(queryLower) || name.includes(queryLower)
}
