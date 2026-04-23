/**
 * Vitest 测试设置文件
 * 
 * 在每个测试文件之前执行
 */
import { beforeAll, afterAll, vi } from 'vitest'

// 全局 mock
beforeAll(() => {
  // Mock console.error to suppress expected errors in tests
  vi.spyOn(console, 'error').mockImplementation(() => {})
  
  // Mock console.log to suppress logs in tests
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

// 清理
afterAll(() => {
  vi.restoreAllMocks()
})

// 全局测试辅助函数
global.testHelpers = {
  /**
   * 创建模拟上下文
   */
  createMockContext: (overrides: Record<string, unknown> = {}) => ({
    requestId: 'test-request-id',
    userId: 'test-user',
    sessionId: 'test-session',
    timestamp: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * 创建模拟 KPI 数据
   */
  createMockKPIs: () => [
    { name: 'latency', value: 100, unit: 'ms' },
    { name: 'throughput', value: 1000, unit: 'ops/s' },
    { name: 'error_rate', value: 0.01, unit: '%' }
  ],
  
  /**
   * 等待异步操作
   */
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
}

// 类型声明
declare global {
  var testHelpers: {
    createMockContext: (overrides?: Record<string, unknown>) => Record<string, unknown>
    createMockKPIs: () => Array<{ name: string; value: number; unit: string }>
    waitFor: (ms: number) => Promise<void>
  }
}

export {}
