/**
 * V2.1 Enhanced Scoring System Tests
 */

import {
  createV21ScoringEngine,
  V21_DEFAULT_CONFIG
} from '../v21-scoring';

describe('V2.1 Scoring Engine', () => {
  let engine: ReturnType<typeof createV21ScoringEngine>;

  beforeEach(() => {
    engine = createV21ScoringEngine();
  });

  describe('calculateScore()', () => {
    it('应该计算 7 维度加权总分', () => {
      const metrics = {
        productDepth: 0.8,
        functionality: 0.7,
        visualDesign: 0.9,
        codeQuality: 0.9,
        userJourney: 0.85,
        uiConsistency: 0.88,
        realData: 0.82
      };

      const result = engine.calculateScore(metrics);

      expect(result.overallScore).toBeDefined();
      expect(result.userJourney).toBe(0.85);
      expect(result.uiConsistency).toBe(0.88);
      expect(result.realData).toBe(0.82);
    });

    it('应该识别 UI 一致性问题（SparkPath 问题 1）', () => {
      const metrics = {
        productDepth: 0.8,
        functionality: 0.7,
        visualDesign: 0.5,  // 低于 0.85 阈值
        codeQuality: 0.9,
        userJourney: 0.6,   // 低于 0.85 阈值
        uiConsistency: 0.5, // 低于 0.85 阈值
        realData: 0.4       // 低于 0.80 阈值
      };

      const result = engine.calculateScore(metrics);

      expect(result.issues.some(i => i.includes('UI 一致性'))).toBe(true);
      expect(result.issues.some(i => i.includes('用户旅程'))).toBe(true);
      expect(result.issues.some(i => i.includes('真实数据'))).toBe(true);
    });

    it('应该检测自检虚高问题（SparkPath 问题 5）', () => {
      const metrics = {
        productDepth: 0.8,
        functionality: 0.5,  // 功能不完整
        visualDesign: 0.6,
        codeQuality: 0.95,   // 代码质量高
        userJourney: 0.4,    // 用户旅程不完整
        uiConsistency: 0.5,
        realData: 0.3
      };

      const result = engine.calculateScore(metrics);

      // 自检准确率应该较低（功能不完整但代码质量高）
      expect(result.selfCheckAccuracy).toBeLessThan(0.7);
    });

    it('应该正确判断演示级标准', () => {
      const demoReadyMetrics = {
        productDepth: 0.9,
        functionality: 0.85,
        visualDesign: 0.9,
        codeQuality: 0.9,
        userJourney: 0.9,
        uiConsistency: 0.9,
        realData: 0.85
      };

      const result = engine.calculateScore(demoReadyMetrics);
      expect(result.demoReady).toBe(true);
    });

    it('应该拒绝不完整的项目（SparkPath 仅 60% 完成度）', () => {
      const incompleteMetrics = {
        productDepth: 0.7,
        functionality: 0.6,   // 仅一级页面
        visualDesign: 0.7,
        codeQuality: 0.9,     // 代码质量高但功能不完整
        userJourney: 0.5,     // 无完整用户旅程
        uiConsistency: 0.6,
        realData: 0.3         // 模拟数据
      };

      const result = engine.calculateScore(incompleteMetrics);

      expect(result.demoReady).toBe(false);
      expect(result.selfCheckAccuracy).toBeLessThan(0.7);
      expect(result.issues.length).toBeGreaterThan(3);
    });

    it('应该生成正确的改进建议', () => {
      const metrics = {
        productDepth: 0.7,
        functionality: 0.6,
        visualDesign: 0.7,
        codeQuality: 0.9,
        userJourney: 0.5,
        uiConsistency: 0.6,
        realData: 0.4
      };

      const result = engine.calculateScore(metrics);

      expect(result.recommendations.some(r => r.includes('完整用户旅程'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('统一 UI 风格'))).toBe(true);
      expect(result.recommendations.some(r => r.includes('真实场景数据'))).toBe(true);
    });
  });

  describe('getTemplate()', () => {
    it('应该返回 strict 模板', () => {
      const strictConfig = engine.getTemplate('strict');
      expect(strictConfig.dimensions.visualDesign?.threshold).toBe(0.90);
      expect(strictConfig.dimensions.userJourney?.threshold).toBe(0.90);
    });

    it('应该返回 standard 模板', () => {
      const standardConfig = engine.getTemplate('standard');
      expect(standardConfig.dimensions.visualDesign?.threshold).toBe(0.85);
      expect(standardConfig.dimensions.userJourney?.threshold).toBe(0.85);
    });

    it('应该返回 lenient 模板', () => {
      const lenientConfig = engine.getTemplate('lenient');
      expect(lenientConfig.dimensions.visualDesign?.threshold).toBe(0.75);
      expect(lenientConfig.dimensions.userJourney?.threshold).toBe(0.75);
    });
  });

  describe('getCalibrationFactor()', () => {
    it('应该为仅一级页面返回 0.6 因子', () => {
      const metrics = { userJourney: 0.4 } as Record<string, unknown>;
      const factor = engine.getCalibrationFactor(metrics);
      expect(factor).toBe(0.6);
    });

    it('应该为列表 + 详情返回 0.75 因子', () => {
      const metrics = { userJourney: 0.6 } as Record<string, unknown>;
      const factor = engine.getCalibrationFactor(metrics);
      expect(factor).toBe(0.75);
    });

    it('应该为完整 CRUD 返回 0.9 因子', () => {
      const metrics = { userJourney: 0.8 } as Record<string, unknown>;
      const factor = engine.getCalibrationFactor(metrics);
      expect(factor).toBe(0.9);
    });

    it('应该为完整 CRUD+ 真实数据返回 1.0 因子', () => {
      const metrics = { userJourney: 0.9 } as Record<string, unknown>;
      const factor = engine.getCalibrationFactor(metrics);
      expect(factor).toBe(1.0);
    });
  });
});

describe('V2.1 Default Config', () => {
  it('应该有正确的权重分布', () => {
    expect(V21_DEFAULT_CONFIG.dimensions.userJourney?.weight).toBe(0.25);
    expect(V21_DEFAULT_CONFIG.dimensions.uiConsistency?.weight).toBe(0.20);
    expect(V21_DEFAULT_CONFIG.dimensions.realData?.weight).toBe(0.15);
    expect(V21_DEFAULT_CONFIG.dimensions.visualDesign?.weight).toBe(0.20);
    expect(V21_DEFAULT_CONFIG.dimensions.codeQuality?.weight).toBe(0.10);
  });

  it('应该有正确的阈值', () => {
    expect(V21_DEFAULT_CONFIG.dimensions.visualDesign?.threshold).toBe(0.85);
    expect(V21_DEFAULT_CONFIG.dimensions.userJourney?.threshold).toBe(0.85);
    expect(V21_DEFAULT_CONFIG.dimensions.uiConsistency?.threshold).toBe(0.85);
    expect(V21_DEFAULT_CONFIG.dimensions.realData?.threshold).toBe(0.80);
  });
});
