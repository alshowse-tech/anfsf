/**
 * Scoring & Feedback System Tests
 */

import {
  createScoringEngine,
  createFeedbackLoopEngine,
  SCORING_TEMPLATES
} from '../scoring-feedback';

describe('Scoring Engine', () => {
  let engine: ReturnType<typeof createScoringEngine>;

  beforeEach(() => {
    engine = createScoringEngine();
  });

  describe('calculateScore()', () => {
    it('应该计算加权总分', () => {
      const metrics = {
        productDepth: 0.8,
        functionality: 0.7,
        visualDesign: 0.6,
        codeQuality: 0.9
      };

      const result = engine.calculateScore(metrics);

      expect(result.overallScore).toBeDefined();
      expect(result.overallScore).toBeCloseTo(
        0.8 * 0.3 + 0.7 * 0.3 + 0.6 * 0.2 + 0.9 * 0.2,
        2
      );
    });

    it('应该识别未达标的维度', () => {
      const metrics = {
        productDepth: 0.5,  // 低于 0.7 阈值
        functionality: 0.5,  // 低于 0.7 阈值
        visualDesign: 0.8,
        codeQuality: 0.9
      };

      const result = engine.calculateScore(metrics);

      expect(result.issues.length).toBeGreaterThanOrEqual(2);
      expect(result.issues.some(i => i.includes('产品深度'))).toBe(true);
      expect(result.issues.some(i => i.includes('功能完整性'))).toBe(true);
    });

    it('应该生成改进建议', () => {
      const metrics = {
        productDepth: 0.5,
        functionality: 0.5,
        visualDesign: 0.4,
        codeQuality: 0.5
      };

      const result = engine.calculateScore(metrics);

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('产品功能深度'))).toBe(true);
    });

    it('应该标记通过状态', () => {
      const goodMetrics = {
        productDepth: 0.9,
        functionality: 0.9,
        visualDesign: 0.8,
        codeQuality: 0.9
      };

      const goodResult = engine.calculateScore(goodMetrics);
      expect(goodResult.passed).toBe(true);
    });

    it('应该标记失败状态', () => {
      const badMetrics = {
        productDepth: 0.3,
        functionality: 0.3,
        visualDesign: 0.3,
        codeQuality: 0.3
      };

      const badResult = engine.calculateScore(badMetrics);
      expect(badResult.passed).toBe(false);
    });

    it('应该包含时间戳', () => {
      const before = Date.now();
      const result = engine.calculateScore({
        productDepth: 0.8,
        functionality: 0.7,
        visualDesign: 0.6,
        codeQuality: 0.9
      });
      const after = Date.now();

      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('配置选项', () => {
    it('应该支持自定义评分配置', () => {
      const customEngine = createScoringEngine({
        dimensions: {
          productDepth: { threshold: 0.9, weight: 0.4 },
          functionality: { threshold: 0.8, weight: 0.3 },
          visualDesign: { threshold: 0.7, weight: 0.2 },
          codeQuality: { threshold: 0.9, weight: 0.1 }
        }
      });

      const config = customEngine.getConfig();
      expect(config.dimensions.productDepth.threshold).toBe(0.9);
      expect(config.dimensions.productDepth.weight).toBe(0.4);
    });

    it('应该使用标准模板', () => {
      const standardEngine = createScoringEngine(SCORING_TEMPLATES.standard);
      const config = standardEngine.getConfig();

      expect(config.dimensions.productDepth.threshold).toBe(0.7);
      expect(config.dimensions.functionality.threshold).toBe(0.7);
    });

    it('应该使用严格模板', () => {
      const strictEngine = createScoringEngine(SCORING_TEMPLATES.strict);
      const config = strictEngine.getConfig();

      expect(config.dimensions.productDepth.threshold).toBe(0.85);
      expect(config.dimensions.codeQuality.threshold).toBe(0.9);
    });

    it('应该使用宽松模板', () => {
      const lenientEngine = createScoringEngine(SCORING_TEMPLATES.lenient);
      const config = lenientEngine.getConfig();

      expect(config.dimensions.productDepth.threshold).toBe(0.5);
      expect(config.dimensions.visualDesign.threshold).toBe(0.4);
    });
  });
});

describe('Feedback Loop Engine', () => {
  let engine: ReturnType<typeof createFeedbackLoopEngine>;

  beforeEach(() => {
    engine = createFeedbackLoopEngine({
      maxIterations: 5,
      minImprovementThreshold: 0.05,
      pivotThreshold: 0.4
    });
  });

  describe('iterate()', () => {
    it('应该执行单次迭代', async () => {
      const metrics = {
        productDepth: 0.7,
        functionality: 0.6,
        visualDesign: 0.5,
        codeQuality: 0.8
      };

      const result = await engine.iterate(metrics, 1);

      expect(result.iteration).toBe(1);
      expect(result.scores.length).toBe(4);
      expect(result.action).toBeDefined();
      expect(result.rationale).toBeDefined();
    });

    it('应该生成反馈项', async () => {
      const metrics = {
        productDepth: 0.5,
        functionality: 0.5,
        visualDesign: 0.6,
        codeQuality: 0.7
      };

      const result = await engine.iterate(metrics, 1);

      expect(result.feedback.length).toBeGreaterThan(0);
      expect(result.feedback[0].id).toBeDefined();
      expect(result.feedback[0].type).toBe('e2e-test');
      expect(result.feedback[0].suggestions.length).toBeGreaterThan(0);
    });

    it('应该决定正确的行动（refine）', async () => {
      const metrics = {
        productDepth: 0.65,
        functionality: 0.65,
        visualDesign: 0.6,
        codeQuality: 0.7
      };

      const result = await engine.iterate(metrics, 1);

      expect(result.action).toBe('refine');
    });

    it('应该决定正确的行动（complete）', async () => {
      const metrics = {
        productDepth: 0.9,
        functionality: 0.9,
        visualDesign: 0.85,
        codeQuality: 0.9
      };

      const result = await engine.iterate(metrics, 1);

      expect(result.action).toBe('complete');
    });

    it('应该决定正确的行动（pivot）', async () => {
      const metrics = {
        productDepth: 0.3,
        functionality: 0.3,
        visualDesign: 0.3,
        codeQuality: 0.3
      };

      const result = await engine.iterate(metrics, 1);

      expect(result.action).toBe('pivot');
    });

    it('应该记录迭代历史', async () => {
      await engine.iterate({
        productDepth: 0.7,
        functionality: 0.6,
        visualDesign: 0.5,
        codeQuality: 0.8
      }, 1);

      await engine.iterate({
        productDepth: 0.75,
        functionality: 0.65,
        visualDesign: 0.55,
        codeQuality: 0.85
      }, 2);

      const iterations = engine.getIterations();
      expect(iterations.length).toBe(2);
    });
  });

  describe('shouldContinue()', () => {
    it('应该继续迭代（分数中等）', () => {
      const shouldContinue = engine.shouldContinue(0.65);
      expect(shouldContinue).toBe(true);
    });

    it('应该停止迭代（分数高）', () => {
      const shouldContinue = engine.shouldContinue(0.9);
      expect(shouldContinue).toBe(false);
    });

    it('应该停止迭代（分数太低需要 pivot）', () => {
      const shouldContinue = engine.shouldContinue(0.3);
      expect(shouldContinue).toBe(false);
    });

    it('应该停止迭代（达到最大迭代次数）', async () => {
      for (let i = 1; i <= 5; i++) {
        await engine.iterate({
          productDepth: 0.6 + i * 0.02,
          functionality: 0.6 + i * 0.02,
          visualDesign: 0.5 + i * 0.02,
          codeQuality: 0.7 + i * 0.02
        }, i);
      }

      const shouldContinue = engine.shouldContinue(0.7);
      expect(shouldContinue).toBe(false);
    });

    it('应该停止迭代（改进幅度不足）', async () => {
      await engine.iterate({
        productDepth: 0.65,
        functionality: 0.65,
        visualDesign: 0.6,
        codeQuality: 0.7
      }, 1);

      await engine.iterate({
        productDepth: 0.66,  // 改进很小
        functionality: 0.66,
        visualDesign: 0.61,
        codeQuality: 0.71
      }, 2);

      await engine.iterate({
        productDepth: 0.665,  // 改进更小
        functionality: 0.665,
        visualDesign: 0.615,
        codeQuality: 0.715
      }, 3);

      const shouldContinue = engine.shouldContinue(0.665, 0.66);
      expect(shouldContinue).toBe(false);
    });
  });

  describe('reset()', () => {
    it('应该重置迭代历史', async () => {
      await engine.iterate({
        productDepth: 0.7,
        functionality: 0.6,
        visualDesign: 0.5,
        codeQuality: 0.8
      }, 1);

      expect(engine.getIterations().length).toBe(1);

      engine.reset();

      expect(engine.getIterations().length).toBe(0);
    });
  });

  describe('配置选项', () => {
    it('应该支持自定义反馈配置', () => {
      const customEngine = createFeedbackLoopEngine({
        maxIterations: 10,
        minImprovementThreshold: 0.03,
        pivotThreshold: 0.3
      });

      expect(customEngine).toBeDefined();
    });

    it('应该支持传入自定义评分引擎', () => {
      const scoringEngine = createScoringEngine(SCORING_TEMPLATES.strict);
      const feedbackEngine = createFeedbackLoopEngine({}, scoringEngine);

      expect(feedbackEngine).toBeDefined();
    });
  });
});

describe('评分模板', () => {
  it('应该导出严格模板', () => {
    expect(SCORING_TEMPLATES.strict).toBeDefined();
    expect(SCORING_TEMPLATES.strict.dimensions.productDepth.threshold).toBe(0.85);
  });

  it('应该导出标准模板', () => {
    expect(SCORING_TEMPLATES.standard).toBeDefined();
    expect(SCORING_TEMPLATES.standard.dimensions.productDepth.threshold).toBe(0.7);
  });

  it('应该导出宽松模板', () => {
    expect(SCORING_TEMPLATES.lenient).toBeDefined();
    expect(SCORING_TEMPLATES.lenient.dimensions.productDepth.threshold).toBe(0.5);
  });
});
