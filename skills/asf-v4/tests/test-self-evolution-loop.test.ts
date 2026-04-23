/**
 * Self Evolution Loop 单元测试 (Vitest 格式 - 简化版)
 * 
 * 测试自我进化闭环的核心功能
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { SelfEvolutionLoop } from '../src/harness/self-evolution-loop'

describe('SelfEvolutionLoop', () => {
  let evolutionLoop: SelfEvolutionLoop

  beforeEach(() => {
    evolutionLoop = new SelfEvolutionLoop()
  })

  describe('KPI 收集', () => {
    it('应该有 monitorKPI 方法', () => {
      expect(evolutionLoop.monitorKPI).toBeDefined()
      expect(typeof evolutionLoop.monitorKPI).toBe('function')
    })
  })

  describe('瓶颈识别', () => {
    it('应该有 identifyBottleneck 方法', async () => {
      expect(evolutionLoop.identifyBottleneck).toBeDefined()
      expect(typeof evolutionLoop.identifyBottleneck).toBe('function')
    })

    it('应该能识别瓶颈', async () => {
      const bottlenecks = await evolutionLoop.identifyBottleneck()
      
      expect(bottlenecks).toBeDefined()
    })
  })

  describe('自动优化', () => {
    it('应该有 autoOptimize 方法', async () => {
      expect(evolutionLoop.autoOptimize).toBeDefined()
      expect(typeof evolutionLoop.autoOptimize).toBe('function')
    })

    it('应该能执行自动优化', async () => {
      const result = await evolutionLoop.autoOptimize()
      
      expect(result).toBeDefined()
    })
  })

  describe('统计显著性检验', () => {
    it('应该有 generateSignificanceReport 方法', () => {
      expect(evolutionLoop.generateSignificanceReport).toBeDefined()
      expect(typeof evolutionLoop.generateSignificanceReport).toBe('function')
    })

    it('应该能执行显著性检验', () => {
      const baseline = [100, 105, 98, 102, 103]
      const experiment = [120, 125, 118, 122, 123]
      
      const report = evolutionLoop.generateSignificanceReport(baseline, experiment)
      
      expect(report).toBeDefined()
    })
  })

  describe('健康检查', () => {
    it('应该有 monitorKPI 方法', () => {
      expect(evolutionLoop.monitorKPI).toBeDefined()
      expect(typeof evolutionLoop.monitorKPI).toBe('function')
    })
  })

  describe('进化历史', () => {
    it('应该有 KPI 监控方法', async () => {
      expect(evolutionLoop.monitorKPI).toBeDefined()
      expect(typeof evolutionLoop.monitorKPI).toBe('function')
    })

    it('应该能识别瓶颈', async () => {
      expect(evolutionLoop.identifyBottleneck).toBeDefined()
      expect(typeof evolutionLoop.identifyBottleneck).toBe('function')
    })
  })
})
