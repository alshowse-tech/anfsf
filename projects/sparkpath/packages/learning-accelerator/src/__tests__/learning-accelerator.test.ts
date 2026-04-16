/**
 * Learning Accelerator Engine Tests
 */

import { createLearningAcceleratorEngine } from '../index';

describe('Learning Accelerator Engine', () => {
  let engine: ReturnType<typeof createLearningAcceleratorEngine>;

  beforeEach(() => {
    engine = createLearningAcceleratorEngine({
      targetMastery: 0.85,
      maxPathLength: 10,
    });
  });

  describe('identifyGaps()', () => {
    it('应该识别知识漏洞', async () => {
      const model = {
        studentId: 'student-001',
        name: '小明',
        age: 14,
        stage: 'middle' as const,
        grade: 8,
        knowledgeStatus: {
          'math-001': {
            knowledgeId: 'math-001',
            mastery: 0.5,
            lastPracticed: new Date(),
            practiceCount: 3,
            accuracy: 0.6,
            avgResponseTime: 5000,
            mistakeStats: {},
          },
          'math-002': {
            knowledgeId: 'math-002',
            mastery: 0.9,
            lastPracticed: new Date(),
            practiceCount: 10,
            accuracy: 0.95,
            avgResponseTime: 3000,
            mistakeStats: {},
          },
        },
        sessionHistory: [],
        behaviorStats: {
          avgSessionDuration: 0,
          totalLearningTime: 0,
          learningDays: 0,
          streakDays: 0,
          avgFocusScore: 0,
          avgEngagementScore: 0,
          totalQuestions: 0,
          totalFrustrationSignals: 0,
          exitRate: 0,
        },
        stageWeights: {
          fun: 0,
          mastery: 0,
          logic: 0.5,
          autonomy: 0.5,
          efficiency: 0,
          stressMgmt: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const gaps = engine.identifyGaps(model);

      expect(gaps.length).toBe(1);
      expect(gaps[0].knowledgeId).toBe('math-001');
      expect(gaps[0].gap).toBeGreaterThan(0.3);
    });

    it('应该按优先级排序', async () => {
      const model = {
        studentId: 'student-002',
        name: '小红',
        age: 14,
        stage: 'middle' as const,
        grade: 8,
        knowledgeStatus: {
          'math-001': {
            knowledgeId: 'math-001',
            mastery: 0.3,
            lastPracticed: new Date(Date.now() - 86400000),  // 1 天前
            practiceCount: 2,
            accuracy: 0.4,
            avgResponseTime: 8000,
            mistakeStats: {},
          },
          'math-002': {
            knowledgeId: 'math-002',
            mastery: 0.6,
            lastPracticed: new Date(),
            practiceCount: 5,
            accuracy: 0.7,
            avgResponseTime: 4000,
            mistakeStats: {},
          },
        },
        sessionHistory: [],
        behaviorStats: {
          avgSessionDuration: 0,
          totalLearningTime: 0,
          learningDays: 0,
          streakDays: 0,
          avgFocusScore: 0,
          avgEngagementScore: 0,
          totalQuestions: 0,
          totalFrustrationSignals: 0,
          exitRate: 0,
        },
        stageWeights: {
          fun: 0,
          mastery: 0,
          logic: 0.5,
          autonomy: 0.5,
          efficiency: 0,
          stressMgmt: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const gaps = engine.identifyGaps(model);

      expect(gaps.length).toBe(2);
      expect(gaps[0].knowledgeId).toBe('math-001');  // 优先级更高
    });

    it('应该返回空数组 (无漏洞)', async () => {
      const model = {
        studentId: 'student-003',
        name: '小刚',
        age: 14,
        stage: 'middle' as const,
        grade: 8,
        knowledgeStatus: {
          'math-001': {
            knowledgeId: 'math-001',
            mastery: 0.9,
            lastPracticed: new Date(),
            practiceCount: 10,
            accuracy: 0.95,
            avgResponseTime: 2000,
            mistakeStats: {},
          },
        },
        sessionHistory: [],
        behaviorStats: {
          avgSessionDuration: 0,
          totalLearningTime: 0,
          learningDays: 0,
          streakDays: 0,
          avgFocusScore: 0,
          avgEngagementScore: 0,
          totalQuestions: 0,
          totalFrustrationSignals: 0,
          exitRate: 0,
        },
        stageWeights: {
          fun: 0,
          mastery: 0,
          logic: 0.5,
          autonomy: 0.5,
          efficiency: 0,
          stressMgmt: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const gaps = engine.identifyGaps(model);

      expect(gaps.length).toBe(0);
    });
  });

  describe('planOptimalPath()', () => {
    it('应该规划学习路径', async () => {
      const gaps = [
        {
          knowledgeId: 'math-001',
          name: '一次函数',
          currentMastery: 0.5,
          targetMastery: 0.85,
          gap: 0.35,
          priority: 0.8,
          prerequisiteGaps: 0,
        },
        {
          knowledgeId: 'math-002',
          name: '二次函数',
          currentMastery: 0.4,
          targetMastery: 0.85,
          gap: 0.45,
          priority: 0.9,
          prerequisiteGaps: 1,
        },
      ];

      const model = {
        studentId: 'student-004',
        knowledgeStatus: {},
        sessionHistory: [],
        behaviorStats: {
          avgSessionDuration: 0,
          totalLearningTime: 0,
          learningDays: 0,
          streakDays: 0,
          avgFocusScore: 0,
          avgEngagementScore: 0,
          totalQuestions: 0,
          totalFrustrationSignals: 0,
          exitRate: 0,
        },
        stageWeights: {
          fun: 0,
          mastery: 0,
          logic: 0.5,
          autonomy: 0.5,
          efficiency: 0,
          stressMgmt: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const path = engine.planOptimalPath(gaps, model);

      expect(path.studentId).toBe('student-004');
      expect(path.knowledgeSequence.length).toBeGreaterThan(0);
      expect(path.estimatedDuration).toBeGreaterThan(0);
      expect(path.breakPoints.length).toBeGreaterThan(0);
    });

    it('应该返回空路径 (无漏洞)', async () => {
      const gaps: any[] = [];
      const model = {
        studentId: 'student-005',
        knowledgeStatus: {},
        sessionHistory: [],
        behaviorStats: {
          avgSessionDuration: 0,
          totalLearningTime: 0,
          learningDays: 0,
          streakDays: 0,
          avgFocusScore: 0,
          avgEngagementScore: 0,
          totalQuestions: 0,
          totalFrustrationSignals: 0,
          exitRate: 0,
        },
        stageWeights: {
          fun: 0,
          mastery: 0,
          logic: 0.5,
          autonomy: 0.5,
          efficiency: 0,
          stressMgmt: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const path = engine.planOptimalPath(gaps, model);

      expect(path.knowledgeSequence.length).toBe(0);
    });
  });

  describe('extractMethod()', () => {
    it('应该提取方法步骤 (小学)', () => {
      const method = engine.extractMethod('math-001', 'elementary');

      expect(method.knowledgeId).toBe('math-001');
      expect(method.steps.length).toBeGreaterThan(0);
      expect(method.stagePackaging.elementary).toBeDefined();
    });

    it('应该提取方法步骤 (初中)', () => {
      const method = engine.extractMethod('math-001', 'middle');

      expect(method.knowledgeId).toBe('math-001');
      expect(method.stagePackaging.middle).toBeDefined();
    });

    it('应该提取方法步骤 (高中)', () => {
      const method = engine.extractMethod('math-001', 'high');

      expect(method.knowledgeId).toBe('math-001');
      expect(method.stagePackaging.high).toBeDefined();
    });
  });

  describe('adjustDifficulty()', () => {
    it('应该提升难度 (表现优秀)', () => {
      const newDifficulty = engine.adjustDifficulty(0.5, 0.85);
      expect(newDifficulty).toBeGreaterThan(0.5);
    });

    it('应该保持难度 (表现良好)', () => {
      const newDifficulty = engine.adjustDifficulty(0.5, 0.7);
      expect(newDifficulty).toBe(0.5);
    });

    it('应该降低难度 (表现不佳)', () => {
      const newDifficulty = engine.adjustDifficulty(0.5, 0.4);
      expect(newDifficulty).toBeLessThan(0.5);
    });
  });

  describe('nextBestAction()', () => {
    it('应该推荐学习动作', async () => {
      const model = {
        studentId: 'student-006',
        knowledgeStatus: {
          'math-001': {
            knowledgeId: 'math-001',
            mastery: 0.3,
            lastPracticed: new Date(),
            practiceCount: 1,
            accuracy: 0.4,
            avgResponseTime: 10000,
            mistakeStats: {},
          },
        },
        sessionHistory: [],
        behaviorStats: {
          avgSessionDuration: 0,
          totalLearningTime: 0,
          learningDays: 0,
          streakDays: 0,
          avgFocusScore: 0,
          avgEngagementScore: 0,
          totalQuestions: 0,
          totalFrustrationSignals: 0,
          exitRate: 0,
        },
        stageWeights: {
          fun: 0,
          mastery: 0,
          logic: 0.5,
          autonomy: 0.5,
          efficiency: 0,
          stressMgmt: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const action = engine.nextBestAction(model);

      expect(action.type).toBe('learn');
      expect(action.knowledgeId).toBe('math-001');
      expect(action.estimatedDuration).toBeGreaterThan(0);
    });

    it('应该推荐复习动作 (已掌握)', async () => {
      const model = {
        studentId: 'student-007',
        knowledgeStatus: {
          'math-001': {
            knowledgeId: 'math-001',
            mastery: 0.95,
            lastPracticed: new Date(),
            practiceCount: 20,
            accuracy: 0.98,
            avgResponseTime: 1000,
            mistakeStats: {},
          },
        },
        sessionHistory: [],
        behaviorStats: {
          avgSessionDuration: 0,
          totalLearningTime: 0,
          learningDays: 0,
          streakDays: 0,
          avgFocusScore: 0,
          avgEngagementScore: 0,
          totalQuestions: 0,
          totalFrustrationSignals: 0,
          exitRate: 0,
        },
        stageWeights: {
          fun: 0,
          mastery: 0,
          logic: 0.5,
          autonomy: 0.5,
          efficiency: 0,
          stressMgmt: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const action = engine.nextBestAction(model);

      expect(action.type).toBe('review');
    });
  });
});
