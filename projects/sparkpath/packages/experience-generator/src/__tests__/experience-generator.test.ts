/**
 * Experience Generator Engine Tests
 */

import { createExperienceGeneratorEngine } from '../index';

describe('Experience Generator Engine', () => {
  let engine: ReturnType<typeof createExperienceGeneratorEngine>;

  beforeEach(() => {
    engine = createExperienceGeneratorEngine({
      enableCache: true,
      defaultStage: 'middle',
    });
  });

  describe('generateContent()', () => {
    it('应该生成教学内容 (小学)', async () => {
      const content = await engine.generateContent(
        'math-001',
        '一次函数',
        'math',
        'elementary'
      );

      expect(content.knowledgeId).toBe('math-001');
      expect(content.topic).toBe('一次函数');
      expect(content.stage).toBe('elementary');
      expect(content.methodSteps.length).toBeGreaterThan(0);
    });

    it('应该生成教学内容 (初中)', async () => {
      const content = await engine.generateContent(
        'math-001',
        '一次函数',
        'math',
        'middle'
      );

      expect(content.knowledgeId).toBe('math-001');
      expect(content.stage).toBe('middle');
    });

    it('应该生成教学内容 (高中)', async () => {
      const content = await engine.generateContent(
        'math-001',
        '一次函数',
        'math',
        'high'
      );

      expect(content.knowledgeId).toBe('math-001');
      expect(content.stage).toBe('high');
    });

    it('应该使用缓存', async () => {
      const content1 = await engine.generateContent(
        'math-002',
        '二次函数',
        'math',
        'middle'
      );

      const content2 = await engine.generateContent(
        'math-002',
        '二次函数',
        'math',
        'middle'
      );

      expect(content1.generatedAt).toEqual(content2.generatedAt);
    });
  });

  describe('generateTTS()', () => {
    it('应该生成 TTS 音频 (小学)', async () => {
      const tts = await engine.generateTTS('你好，我们来学习一次函数', 'elementary');

      expect(tts.audioUrl).toBeDefined();
      expect(tts.duration).toBeGreaterThan(0);
    });

    it('应该生成 TTS 音频 (初中)', async () => {
      const tts = await engine.generateTTS('今天我们来探索一次函数', 'middle');

      expect(tts.audioUrl).toBeDefined();
      expect(tts.duration).toBeGreaterThan(0);
    });

    it('应该生成 TTS 音频 (高中)', async () => {
      const tts = await engine.generateTTS('开始今天的一次函数学习', 'high');

      expect(tts.audioUrl).toBeDefined();
      expect(tts.duration).toBeGreaterThan(0);
    });
  });

  describe('generateHighlights()', () => {
    it('应该生成逐词高亮数据', () => {
      const text = '我们，来学习，一次函数。';
      const highlights = engine.generateHighlights(text, 3000);

      expect(highlights.length).toBeGreaterThan(0);
      expect(highlights[0].text).toBeDefined();
      expect(highlights[0].startTime).toBeGreaterThanOrEqual(0);
    });

    it('应该正确计算时间', () => {
      const text = '你好世界';
      const highlights = engine.generateHighlights(text, 2000);

      expect(highlights[0].startTime).toBe(0);
      expect(highlights[highlights.length - 1].endTime).toBeLessThanOrEqual(2000);
    });
  });

  describe('阶段适配方法', () => {
    describe('getGreeting()', () => {
      it('应该获取小学问候语', () => {
        const greeting = engine.getGreeting('一次函数', 'elementary');
        expect(greeting).toContain('一次函数');
        expect(greeting).toContain('✨');
      });

      it('应该获取初中问候语', () => {
        const greeting = engine.getGreeting('一次函数', 'middle');
        expect(greeting).toContain('一次函数');
      });

      it('应该获取高中问候语', () => {
        const greeting = engine.getGreeting('一次函数', 'high');
        expect(greeting).toContain('一次函数');
      });
    });

    describe('getEncouragement()', () => {
      it('应该获取小学鼓励语', () => {
        const encouragement = engine.getEncouragement('elementary');
        expect(encouragement).toContain('🌟');
      });

      it('应该获取初中鼓励语', () => {
        const encouragement = engine.getEncouragement('middle');
        expect(encouragement).toBeDefined();
      });

      it('应该获取高中鼓励语', () => {
        const encouragement = engine.getEncouragement('high');
        expect(encouragement).toBeDefined();
      });
    });

    describe('getSummary()', () => {
      it('应该获取小学总结语', () => {
        const summary = engine.getSummary('一次函数', 'elementary');
        expect(summary).toContain('🎉');
      });

      it('应该获取初中总结语', () => {
        const summary = engine.getSummary('一次函数', 'middle');
        expect(summary).toBeDefined();
      });

      it('应该获取高中总结语', () => {
        const summary = engine.getSummary('一次函数', 'high');
        expect(summary).toBeDefined();
      });
    });
  });

  describe('adjustContent()', () => {
    it('应该调整内容 (太慢)', async () => {
      const content = await engine.generateContent(
        'math-003',
        '一次函数',
        'math',
        'middle'
      );

      const adjusted = engine.adjustContent(content, { tooFast: true });

      expect(adjusted.methodSteps[0].description).toContain('慢慢来');
    });

    it('应该调整内容 (太难)', async () => {
      const content = await engine.generateContent(
        'math-003',
        '一次函数',
        'math',
        'middle'
      );

      const adjusted = engine.adjustContent(content, { tooHard: true });

      expect(adjusted.variantPractice.difficulty).toBeLessThan(content.variantPractice.difficulty);
    });

    it('应该调整内容 (需要更多示例)', async () => {
      const content = await engine.generateContent(
        'math-003',
        '一次函数',
        'math',
        'middle'
      );

      const adjusted = engine.adjustContent(content, { needMoreExamples: true });

      const hasExample = adjusted.methodSteps.some(step => step.example);
      expect(hasExample).toBe(true);
    });
  });

  describe('clearCache()', () => {
    it('应该清除缓存', async () => {
      await engine.generateContent('math-004', '测试', 'math', 'middle');
      
      engine.clearCache();

      // 缓存已清除，下次生成会创建新的
      const content = await engine.generateContent('math-004', '测试', 'math', 'middle');
      expect(content).toBeDefined();
    });
  });

  describe('pregenerateContent()', () => {
    it('应该预生成内容', async () => {
      const topics = [
        { knowledgeId: 'math-005', topic: '一次函数', subject: 'math' as const, stage: 'middle' as const },
        { knowledgeId: 'math-006', topic: '二次函数', subject: 'math' as const, stage: 'high' as const },
      ];

      await engine.pregenerateContent(topics);

      // 内容已缓存
      const content1 = await engine.generateContent('math-005', '一次函数', 'math', 'middle');
      expect(content1).toBeDefined();
    });
  });
});
