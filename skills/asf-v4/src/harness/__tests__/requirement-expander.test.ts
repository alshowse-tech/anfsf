/**
 * Requirement Expander Tests
 */

import { createRequirementExpander } from '../requirement-expander';
import { PlannerConfig } from '../types';

describe('Requirement Expander', () => {
  let expander: ReturnType<typeof createRequirementExpander>;

  beforeEach(() => {
    expander = createRequirementExpander({
      targetFeatureCount: 20,  // 测试使用适中数量，确保 P0/P1/P2 都有分布
      includeAIFeatures: true,
      enableModuleDecomposition: true
    });
  });

  describe('expand()', () => {
    it('应该将简单 prompt 展开为完整产品规格', async () => {
      const prompt = '构建一个客户关系管理系统';
      
      const result = await expander.expand(prompt);

      expect(result.productSpec).toBeDefined();
      expect(result.productSpec.title).toContain('客户关系管理');
      expect(result.featureList).toBeDefined();
      expect(result.featureList.length).toBeGreaterThan(0);
      expect(result.technicalDesign).toBeDefined();
    });

    it('应该生成合理的功能点数量', async () => {
      const prompt = '开发一个电商平台';
      
      const result = await expander.expand(prompt);

      expect(result.featureList.length).toBeGreaterThanOrEqual(10);
      expect(result.featureList.length).toBeLessThanOrEqual(20);  // 1.5 倍上限
    });

    it('应该包含 P0/P1/P2 优先级分布', async () => {
      const prompt = '创建一个任务管理应用';
      
      const result = await expander.expand(prompt);

      const p0Count = result.featureList.filter(f => f.priority === 'P0').length;
      const p1Count = result.featureList.filter(f => f.priority === 'P1').length;
      const p2Count = result.featureList.filter(f => f.priority === 'P2').length;

      expect(p0Count).toBeGreaterThan(0);
      expect(p1Count).toBeGreaterThan(0);
    });

    it('应该识别 AI 功能机会', async () => {
      const prompt = '构建一个智能数据分析平台';
      
      const result = await expander.expand(prompt);

      expect(result.aiFeatureOpportunities.length).toBeGreaterThan(0);
      expect(result.aiFeatureOpportunities.some(f => f.includes('AI'))).toBe(true);
    });

    it('应该生成模块化结构', async () => {
      const prompt = '开发一个企业资源规划系统';
      
      const result = await expander.expand(prompt);

      expect(result.modularGraph).toBeDefined();
      expect(result.modularGraph?.modules.length).toBeGreaterThan(0);
      expect(result.modularGraph?.crossModuleDeps).toBeDefined();
    });

    it('应该为每个功能点生成详细步骤', async () => {
      const prompt = '创建一个博客系统';
      
      const result = await expander.expand(prompt);

      for (const feature of result.featureList.slice(0, 5)) {
        expect(feature.steps).toBeDefined();
        expect(feature.steps.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('应该覆盖多个功能类别', async () => {
      const prompt = '构建一个在线学习平台';
      
      const result = await expander.expand(prompt);

      const categories = new Set(result.featureList.map(f => f.category));
      expect(categories.size).toBeGreaterThanOrEqual(3);  // 至少 3 个类别
    });
  });

  describe('配置选项', () => {
    it('应该支持自定义目标功能点数量', async () => {
      const customExpander = createRequirementExpander({
        targetFeatureCount: 5
      });

      const result = await customExpander.expand('测试系统');

      expect(result.featureList.length).toBeGreaterThanOrEqual(5);
    });

    it('应该支持禁用 AI 功能识别', async () => {
      const customExpander = createRequirementExpander({
        includeAIFeatures: false
      });

      const result = await customExpander.expand('测试系统');

      expect(result.aiFeatureOpportunities.length).toBe(0);
    });

    it('应该支持禁用模块化拆分', async () => {
      const customExpander = createRequirementExpander({
        enableModuleDecomposition: false
      });

      const result = await customExpander.expand('测试系统');

      expect(result.modularGraph).toBeUndefined();
    });
  });
});
