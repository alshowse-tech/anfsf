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
      expect(result.agent).toBe('stock_agent')
    })

    it('应该正确路由交易请求到 trading_agent', async () => {
      const result = await router.route('trading.order', { 
        symbol: '000001', 
        action: 'buy' 
      })
      
      expect(result.success).toBe(true)
      expect(result.agent).toBe('trading_agent')
    })

    it('应该正确路由 AI 分析请求到 ai_agent', async () => {
      const result = await router.route('ai.analyze', { 
        symbol: '000001',
        data: {}
      })
      
      expect(result.success).toBe(true)
      expect(result.agent).toBe('ai_agent')
    })

    it('未知路由应该返回 default_agent', async () => {
      const result = await router.route('unknown.action', {})
      
      expect(result.success).toBe(true)
      expect(result.agent).toBe('default_agent')
    })
  })

  describe('Agent 注册', () => {
    it('应该能够注册自定义 Agent', () => {
      const mockAgent = { name: 'custom_agent' }
      router.register_agent('custom_agent', mockAgent)
      
      expect(router.agents['custom_agent']).toBe(mockAgent)
    })

    it('应该能够注册自定义路由规则', () => {
      router.register_route('custom.action', 'custom_agent')
      
      expect(router.routing_table['custom.action']).toBe('custom_agent')
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
      
      const stats = router.get_agent_stats()
      
      expect(stats['stock_agent']?.calls).toBe(2)
      expect(stats['trading_agent']?.calls).toBe(1)
    })
  })

  describe('错误处理', () => {
    it('应该处理 Agent 执行失败的情况', async () => {
      // Mock 一个会失败的 Agent
      const mockAgent = {
        execute: vi.fn().mockRejectedValue(new Error('Agent failed'))
      }
      router.register_agent('failing_agent', mockAgent)
      router.register_route('failing.action', 'failing_agent')
      
      const result = await router.route('failing.action', {})
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Agent failed')
    })

    it('应该处理超时情况', async () => {
      // Mock 一个超时的 Agent
      const mockAgent = {
        execute: vi.fn().mockImplementation(() => {
          return new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 5000)
          })
        })
      }
      router.register_agent('slow_agent', mockAgent)
      router.register_route('slow.action', 'slow_agent')
      
      const result = await router.route('slow.action', {})
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Timeout')
    })
  })

  describe('负载均衡', () => {
    it('应该根据成功率选择 Agent', async () => {
      // 注册两个相同类型的 Agent
      router.register_agent('agent_a', { success_rate: 0.9 })
      router.register_agent('agent_b', { success_rate: 0.5 })
      
      router.register_route('test.action', 'agent_a')
      router.register_route('test.action', 'agent_b')
      
      // 应该优先选择成功率高的
      const result = await router.route('test.action', {})
      
      expect(result.agent).toBe('agent_a')
    })

    it('应该考虑 Agent 当前负载', async () => {
      router.register_agent('busy_agent', { load: 0.9 })
      router.register_agent('idle_agent', { load: 0.1 })
      
      router.register_route('test.action', 'busy_agent')
      router.register_route('test.action', 'idle_agent')
      
      // 应该选择负载低的
      const result = await router.route('test.action', {})
      
      expect(result.agent).toBe('idle_agent')
    })
  })

  describe('上下文压缩', () => {
    it('应该支持 4x 压缩', async () => {
      const largeContext = { data: 'x'.repeat(10000) }
      const result = await router.route('stock.info', { 
        symbol: '000001',
        context: largeContext
      }, { compression: '4x' })
      
      expect(result.success).toBe(true)
      // 验证压缩后的上下文大小
      expect(JSON.stringify(result.context).length).toBeLessThan(3000)
    })

    it('应该支持 8x 压缩', async () => {
      const largeContext = { data: 'x'.repeat(10000) }
      const result = await router.route('stock.info', { 
        symbol: '000001',
        context: largeContext
      }, { compression: '8x' })
      
      expect(result.success).toBe(true)
      // 验证压缩后的上下文大小
      expect(JSON.stringify(result.context).length).toBeLessThan(1500)
    })
  })
})
