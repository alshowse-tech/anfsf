/**
 * Agent Router 单元测试 (Vitest 格式 - 简化版)
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { AgentRouter } from '../src/harness/agent-router'

describe('AgentRouter', () => {
  let router: AgentRouter

  beforeEach(() => {
    router = new AgentRouter()
  })

  describe('基本功能', () => {
    it('应该有 routeTask 方法', () => {
      expect(router.routeTask).toBeDefined()
      expect(typeof router.routeTask).toBe('function')
    })

    it('应该有 registerAgent 方法', () => {
      expect(router.registerAgent).toBeDefined()
      expect(typeof router.registerAgent).toBe('function')
    })
  })

  describe('Agent 注册', () => {
    it('应该有 agents 属性', () => {
      expect(router['agents']).toBeDefined()
    })
  })

  describe('任务路由', () => {
    it('应该有 routeTask 方法', () => {
      expect(router.routeTask).toBeDefined()
    })
  })
})
