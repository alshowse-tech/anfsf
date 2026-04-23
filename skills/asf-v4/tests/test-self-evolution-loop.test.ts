/**
 * Self Evolution Loop 单元测试 (Vitest 格式)
 * 
 * 测试自我进化闭环的核心功能
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SelfEvolutionLoop } from '../src/harness/self-evolution-loop'

describe('SelfEvolutionLoop', () => {
  let evolutionLoop: SelfEvolutionLoop

  beforeEach(() => {
    evolutionLoop = new SelfEvolutionLoop()
  })

  describe('KPI 收集', () => {
    it('应该收集性能指标', async () => {
      const kpis = await evolutionLoop.collect_kpis()
      
      expect(kpis).toBeInstanceOf(Array)
      expect(kpis.length).toBeGreaterThan(0)
      
      // 验证 KPI 结构
      const kpi = kpis[0]
      expect(kpi).toHaveProperty('name')
      expect(kpi).toHaveProperty('value')
      expect(kpi).toHaveProperty('unit')
      expect(kpi).toHaveProperty('timestamp')
    })

    it('应该收集延迟指标', async () => {
      const kpis = await evolutionLoop.collect_kpis()
      const latencyKpi = kpis.find(k => k.name.includes('latency'))
      
      expect(latencyKpi).toBeDefined()
      expect(latencyKpi?.value).toBeGreaterThanOrEqual(0)
    })

    it('应该收集成功率指标', async () => {
      const kpis = await evolutionLoop.collect_kpis()
      const successKpi = kpis.find(k => k.name.includes('success'))
      
      expect(successKpi).toBeDefined()
      expect(successKpi?.value).toBeGreaterThanOrEqual(0)
      expect(successKpi?.value).toBeLessThanOrEqual(100)
    })
  })

  describe('瓶颈识别', () => {
    it('应该识别性能瓶颈', async () => {
      // Mock 高延迟数据
      vi.spyOn(evolutionLoop, 'collect_kpis').mockResolvedValue([
        { name: 'latency', value: 5000, unit: 'ms', timestamp: new Date() },
        { name: 'throughput', value: 10, unit: 'ops/s', timestamp: new Date() }
      ])
      
      const bottlenecks = await evolutionLoop.identify_bottlenecks()
      
      expect(bottlenecks).toBeInstanceOf(Array)
      expect(bottlenecks.length).toBeGreaterThan(0)
      
      const bottleneck = bottlenecks[0]
      expect(bottleneck).toHaveProperty('type')
      expect(bottleneck).toHaveProperty('severity')
      expect(bottleneck).toHaveProperty('recommendation')
    })

    it('应该识别成本瓶颈', async () => {
      vi.spyOn(evolutionLoop, 'collect_kpis').mockResolvedValue([
        { name: 'cost_per_task', value: 5.0, unit: 'USD', timestamp: new Date() }
      ])
      
      const bottlenecks = await evolutionLoop.identify_bottlenecks()
      
      expect(bottlenecks.some(b => b.type === 'cost')).toBe(true)
    })

    it('应该识别准确率瓶颈', async () => {
      vi.spyOn(evolutionLoop, 'collect_kpis').mockResolvedValue([
        { name: 'accuracy', value: 0.6, unit: '%', timestamp: new Date() }
      ])
      
      const bottlenecks = await evolutionLoop.identify_bottlenecks()
      
      expect(bottlenecks.some(b => b.type === 'accuracy')).toBe(true)
    })
  })

  describe('A/B 测试', () => {
    it('应该创建 A/B 测试', async () => {
      const testConfig = {
        name: 'test_latency_optimization',
        variants: ['A', 'B'],
        metric: 'latency',
        duration_days: 7
      }
      
      const test = await evolutionLoop.create_ab_test(testConfig)
      
      expect(test).toBeDefined()
      expect(test.id).toMatch(/ab_test_.+/)
      expect(test.name).toBe(testConfig.name)
      expect(test.variants).toEqual(testConfig.variants)
    })

    it('应该记录 A/B 测试结果', async () => {
      const testConfig = {
        name: 'test_conversion',
        variants: ['A', 'B'],
        metric: 'conversion_rate',
        duration_days: 1
      }
      
      const test = await evolutionLoop.create_ab_test(testConfig)
      
      // 记录结果
      await evolutionLoop.record_ab_test_result(test.id, 'A', 0.15)
      await evolutionLoop.record_ab_test_result(test.id, 'B', 0.20)
      
      const results = await evolutionLoop.get_ab_test_results(test.id)
      
      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBe(2)
    })

    it('应该分析 A/B 测试显著性', async () => {
      const testConfig = {
        name: 'test_significance',
        variants: ['A', 'B'],
        metric: 'revenue',
        duration_days: 1
      }
      
      const test = await evolutionLoop.create_ab_test(testConfig)
      
      // 记录足够的数据
      for (let i = 0; i < 100; i++) {
        await evolutionLoop.record_ab_test_result(test.id, 'A', 100 + Math.random() * 20)
        await evolutionLoop.record_ab_test_result(test.id, 'B', 120 + Math.random() * 20)
      }
      
      const analysis = await evolutionLoop.analyze_ab_test(test.id)
      
      expect(analysis).toHaveProperty('p_value')
      expect(analysis).toHaveProperty('cohens_d')
      expect(analysis).toHaveProperty('confidence_interval')
      expect(analysis).toHaveProperty('conclusion')
    })
  })

  describe('自动优化', () => {
    it('应该生成优化建议', async () => {
      const bottlenecks = [
        { type: 'latency', severity: 'high', value: 5000 }
      ]
      
      const recommendations = await evolutionLoop.generate_optimization_recommendations(bottlenecks)
      
      expect(recommendations).toBeInstanceOf(Array)
      expect(recommendations.length).toBeGreaterThan(0)
      
      const rec = recommendations[0]
      expect(rec).toHaveProperty('action')
      expect(rec).toHaveProperty('expected_improvement')
      expect(rec).toHaveProperty('confidence')
    })

    it('应该应用优化', async () => {
      const optimization = {
        id: 'opt_test',
        action: 'increase_cache_size',
        params: { cache_size: 1024 }
      }
      
      const result = await evolutionLoop.apply_optimization(optimization)
      
      expect(result.success).toBe(true)
      expect(result.applied_at).toBeDefined()
    })

    it('应该回滚失败的优化', async () => {
      const optimization = {
        id: 'opt_failing',
        action: 'invalid_action',
        params: {}
      }
      
      const result = await evolutionLoop.apply_optimization(optimization)
      
      // 如果优化失败，应该能够回滚
      if (!result.success) {
        const rollbackResult = await evolutionLoop.rollback_optimization(optimization.id)
        expect(rollbackResult.success).toBe(true)
      }
    })
  })

  describe('统计显著性检验', () => {
    it('应该执行双样本 t 检验', () => {
      const baseline = [100, 105, 98, 102, 103]
      const experiment = [120, 125, 118, 122, 123]
      
      const report = evolutionLoop.generate_significance_report(baseline, experiment)
      
      expect(report).toHaveProperty('test')
      expect(report.test).toHaveProperty('t_statistic')
      expect(report.test).toHaveProperty('p_value')
      expect(report.test).toHaveProperty('degrees_of_freedom')
    })

    it('应该计算效应量 (Cohen\'s d)', () => {
      const baseline = [100, 105, 98, 102, 103]
      const experiment = [120, 125, 118, 122, 123]
      
      const report = evolutionLoop.generate_significance_report(baseline, experiment)
      
      expect(report).toHaveProperty('effect_size')
      expect(report.effect_size).toHaveProperty('cohens_d')
      expect(Math.abs(report.effect_size.cohens_d)).toBeGreaterThan(0.5) // 大效应
    })

    it('应该计算 95% 置信区间', () => {
      const baseline = [100, 105, 98, 102, 103]
      const experiment = [120, 125, 118, 122, 123]
      
      const report = evolutionLoop.generate_significance_report(baseline, experiment)
      
      expect(report).toHaveProperty('confidence_interval')
      expect(report.confidence_interval).toHaveProperty('lower')
      expect(report.confidence_interval).toHaveProperty('upper')
      expect(report.confidence_interval.level).toBe(0.95)
    })

    it('应该生成正确的结论文本', () => {
      // 显著差异
      const baseline1 = [100, 105, 98, 102, 103]
      const experiment1 = [150, 155, 148, 152, 153]
      const report1 = evolutionLoop.generateSignificanceReport(baseline1, experiment1)
      
      expect(report1.conclusion.significant).toBe(true)
      expect(report1.conclusion.practical).toBe(true)
      
      // 无显著差异
      const baseline2 = [100, 105, 98, 102, 103]
      const experiment2 = [101, 106, 99, 103, 104]
      const report2 = evolutionLoop.generateSignificanceReport(baseline2, experiment2)
      
      expect(report2.conclusion.significant).toBe(false)
    })
  })

  describe('健康检查', () => {
    it('应该执行系统健康检查', async () => {
      const health = await evolutionLoop.health_check()
      
      expect(health).toHaveProperty('status')
      expect(health).toHaveProperty('checks')
      expect(health).toHaveProperty('timestamp')
      
      expect(health.status).toMatch(/healthy|degraded|unhealthy/)
    })

    it('应该检查测试覆盖率', async () => {
      const health = await evolutionLoop.health_check()
      
      const coverageCheck = health.checks.find((c: any) => c.name === 'test_coverage')
      
      expect(coverageCheck).toBeDefined()
      expect(coverageCheck).toHaveProperty('status')
      expect(coverageCheck).toHaveProperty('value')
    })

    it('应该检查安全审计', async () => {
      const health = await evolutionLoop.health_check()
      
      const securityCheck = health.checks.find((c: any) => c.name === 'security_audit')
      
      expect(securityCheck).toBeDefined()
      expect(securityCheck).toHaveProperty('status')
      expect(securityCheck.critical_issues).toBeGreaterThanOrEqual(0)
    })
  })

  describe('进化历史', () => {
    it('应该记录进化事件', async () => {
      const event = {
        type: 'optimization_applied',
        details: { optimization_id: 'opt_123' }
      }
      
      evolutionLoop.record_evolution_event(event)
      
      const history = evolutionLoop.get_evolution_history()
      
      expect(history).toBeInstanceOf(Array)
      expect(history.length).toBeGreaterThan(0)
      expect(history[history.length - 1].type).toBe(event.type)
    })

    it('应该生成进化报告', async () => {
      evolutionLoop.record_evolution_event({
        type: 'optimization_applied',
        details: { improvement: '15%' }
      })
      
      const report = evolutionLoop.generate_evolution_report()
      
      expect(report).toHaveProperty('total_events')
      expect(report).toHaveProperty('optimizations_applied')
      expect(report).toHaveProperty('avg_improvement')
    })
  })
})
