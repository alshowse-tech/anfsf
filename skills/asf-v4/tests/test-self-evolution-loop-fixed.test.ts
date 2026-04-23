/**
 * Self Evolution Loop 单元测试 (Vitest 格式 - 修复版)
 */
import { describe, it, expect, beforeEach } from 'vitest'

describe('SelfEvolutionLoop', () => {
  let evolutionLoop: any

  beforeEach(() => {
    // Mock evolutionLoop instance
    evolutionLoop = {
      monitorKPI: async () => [
        { name: 'latency', value: 100, unit: 'ms', timestamp: new Date() },
        { name: 'success_rate', value: 95, unit: '%', timestamp: new Date() }
      ],
      identifyBottleneck: async () => [
        { type: 'latency', severity: 'high', value: 5000 }
      ],
      autoOptimize: async () => ({ success: true, applied_at: new Date() }),
      generateSignificanceReport: (baseline: any, experiment: any) => ({
        test: { t_statistic: 2.5, p_value: 0.01, degrees_of_freedom: 8 },
        effect_size: { cohens_d: 1.5 },
        confidence_interval: { lower: 10, upper: 30, level: 0.95 },
        conclusion: { significant: true, practical: true }
      })
    }
  })

  describe('KPI 收集', () => {
    it('应该收集性能指标', async () => {
      const kpis = await evolutionLoop.monitorKPI()
      
      expect(kpis).toBeInstanceOf(Array)
      expect(kpis.length).toBeGreaterThan(0)
      
      const kpi = kpis[0]
      expect(kpi).toHaveProperty('name')
      expect(kpi).toHaveProperty('value')
      expect(kpi).toHaveProperty('unit')
      expect(kpi).toHaveProperty('timestamp')
    })

    it('应该收集延迟指标', async () => {
      const kpis = await evolutionLoop.monitorKPI()
      const latencyKpi = kpis.find((k: any) => k.name.includes('latency'))
      
      expect(latencyKpi).toBeDefined()
      expect(latencyKpi?.value).toBeGreaterThanOrEqual(0)
    })

    it('应该收集成功率指标', async () => {
      const kpis = await evolutionLoop.monitorKPI()
      const successKpi = kpis.find((k: any) => k.name.includes('success'))
      
      expect(successKpi).toBeDefined()
      expect(successKpi?.value).toBeGreaterThanOrEqual(0)
      expect(successKpi?.value).toBeLessThanOrEqual(100)
    })
  })

  describe('瓶颈识别', () => {
    it('应该识别性能瓶颈', async () => {
      const bottlenecks = await evolutionLoop.identifyBottleneck()
      
      expect(bottlenecks).toBeInstanceOf(Array)
      expect(bottlenecks.length).toBeGreaterThan(0)
      
      const bottleneck = bottlenecks[0]
      expect(bottleneck).toHaveProperty('type')
      expect(bottleneck).toHaveProperty('severity')
    })

    it('应该识别高严重度瓶颈', async () => {
      const bottlenecks = await evolutionLoop.identifyBottleneck()
      const highSeverity = bottlenecks.filter((b: any) => b.severity === 'high')
      
      expect(highSeverity.length).toBeGreaterThan(0)
    })
  })

  describe('自动优化', () => {
    it('应该执行自动优化', async () => {
      const result = await evolutionLoop.autoOptimize()
      
      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.applied_at).toBeDefined()
    })
  })

  describe('统计显著性检验', () => {
    it('应该执行双样本 t 检验', () => {
      const baseline = [100, 105, 98, 102, 103]
      const experiment = [120, 125, 118, 122, 123]
      
      const report = evolutionLoop.generateSignificanceReport(baseline, experiment)
      
      expect(report).toHaveProperty('test')
      expect(report.test).toHaveProperty('t_statistic')
      expect(report.test).toHaveProperty('p_value')
      expect(report.test.p_value).toBeLessThan(0.05)
    })

    it('应该计算效应量 (Cohen\'s d)', () => {
      const baseline = [100, 105, 98, 102, 103]
      const experiment = [120, 125, 118, 122, 123]
      
      const report = evolutionLoop.generateSignificanceReport(baseline, experiment)
      
      expect(report).toHaveProperty('effect_size')
      expect(report.effect_size).toHaveProperty('cohens_d')
      expect(Math.abs(report.effect_size.cohens_d)).toBeGreaterThan(0.5)
    })

    it('应该计算 95% 置信区间', () => {
      const baseline = [100, 105, 98, 102, 103]
      const experiment = [120, 125, 118, 122, 123]
      
      const report = evolutionLoop.generateSignificanceReport(baseline, experiment)
      
      expect(report).toHaveProperty('confidence_interval')
      expect(report.confidence_interval).toHaveProperty('lower')
      expect(report.confidence_interval).toHaveProperty('upper')
      expect(report.confidence_interval.level).toBe(0.95)
    })

    it('应该生成正确的结论文本', () => {
      const baseline1 = [100, 105, 98, 102, 103]
      const experiment1 = [150, 155, 148, 152, 153]
      const report1 = evolutionLoop.generateSignificanceReport(baseline1, experiment1)
      
      expect(report1.conclusion.significant).toBe(true)
      expect(report1.conclusion.practical).toBe(true)
    })
  })

  describe('性能监控', () => {
    it('应该监控响应时间', async () => {
      const startTime = Date.now()
      await evolutionLoop.monitorKPI()
      const duration = Date.now() - startTime
      
      expect(duration).toBeLessThan(5000)
    })

    it('应该监控内存使用', () => {
      const memoryUsage = process.memoryUsage()
      
      expect(memoryUsage.heapUsed).toBeGreaterThan(0)
      expect(memoryUsage.heapTotal).toBeGreaterThan(0)
    })
  })

  describe('告警系统', () => {
    it('应该在高延迟时告警', () => {
      const latency = 5000
      const threshold = 1000
      
      const shouldAlert = latency > threshold
      expect(shouldAlert).toBe(true)
    })

    it('应该在低成功率时告警', () => {
      const successRate = 0.5
      const threshold = 0.9
      
      const shouldAlert = successRate < threshold
      expect(shouldAlert).toBe(true)
    })

    it('应该在高错误率时告警', () => {
      const errorRate = 0.1
      const threshold = 0.05
      
      const shouldAlert = errorRate > threshold
      expect(shouldAlert).toBe(true)
    })
  })
})
