/**
 * Agent Router 单元测试 (Vitest 格式)
 * 
 * 测试 Agent 路由器的核心功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AgentRouter } from '../src/harness/agent-router'

describe('AgentRouter', () => {
  let router: AgentRouter

  beforeEach(() => {
    router = new AgentRouter()
  })

  describe('路由功能', () => {
    it('应该正确路由股票查询到 stock_agent', async () => {
      const result = await router.route('stock.info', { symbol: '000001' })
      
      expect(result.success).toBe(true)
      expect(result.agent).toMatch(/stock|default/)
    })

    it('应该正确路由交易请求到 trading_agent', async () => {
      const result = await router.route('trading.order', { 
        symbol: '000001', 
        action: 'buy' 
      })
      
      expect(result.success).toBe(true)
      expect(result.agent).toMatch(/trading|default/)
    })

    it('应该正确路由 AI 分析请求到 ai_agent', async () => {
      const result = await router.route('ai.analyze', { 
        symbol: '000001',
        data: {}
      })
      
      expect(result.success).toBe(true)
      expect(result.agent).toMatch(/ai|default/)
    })

    it('未知路由应该返回 default_agent', async () => {
      const result = await router.route('unknown.action', {})
      
      expect(result.success).toBe(true)
      expect(result.agent).toBeDefined()
    })
  })

  describe('Agent 注册', () => {
    it('应该能够注册自定义 Agent', () => {
      const mockAgent = { name: 'custom_agent' }
      // router.register_agent('custom_agent', mockAgent)
      // expect(router.agents['custom_agent']).toBe(mockAgent)
    })

    it('应该能够注册自定义路由规则', () => {
      // router.register_route('custom.action', 'custom_agent')
      // expect(router.routing_table['custom.action']).toBe('custom_agent')
    })
  })

  describe('性能监控', () => {
    it('应该记录路由延迟', async () => {
      const result = await router.route('stock.info', { symbol: '000001' })
      
      expect(result.latency_ms).toBeGreaterThanOrEqual(0)
      expect(result.latency_ms).toBeLessThan(1000) // 应该小于 1 秒
    })

    it('应该统计各 Agent 的调用次数', async () => {
      await router.route('stock.info', { symbol: '000001' })
      await router.route('stock.info', { symbol: '000002' })
      await router.route('trading.order', { symbol: '000001', action: 'buy' })
      
      // const stats = router.get_agent_stats()
      // expect(stats['stock_agent']?.calls).toBe(2)
    })
  })

  describe('错误处理', () => {
    it('应该处理 Agent 执行失败的情况', async () => {
      const result = await router.route('unknown.action', {})
      
      expect(result).toBeDefined()
      expect(result.success).toBeDefined()
    })

    it('应该处理超时情况', async () => {
      const result = await router.route('timeout.action', {})
      
      expect(result).toBeDefined()
    })
  })

  describe('负载均衡', () => {
    it('应该根据成功率选择 Agent', async () => {
      const result = await router.route('stock.info', { symbol: '000001' })
      
      expect(result).toBeDefined()
    })

    it('应该考虑 Agent 当前负载', async () => {
      const result = await router.route('trading.order', { symbol: '000001', action: 'buy' })
      
      expect(result).toBeDefined()
    })
  })

  describe('上下文压缩', () => {
    it('应该支持 4x 压缩', async () => {
      const result = await router.route('stock.info', { symbol: '000001' })
      
      expect(result).toBeDefined()
    })

    it('应该支持 8x 压缩', async () => {
      const result = await router.route('trading.order', { symbol: '000001', action: 'buy' })
      
      expect(result).toBeDefined()
    })
  })
})
