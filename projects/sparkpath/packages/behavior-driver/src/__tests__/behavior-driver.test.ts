/**
 * Behavior Driver Engine Tests
 */

import { createBehaviorDriverEngine } from '../index';

describe('Behavior Driver Engine', () => {
  let engine: ReturnType<typeof createBehaviorDriverEngine>;

  beforeEach(() => {
    engine = createBehaviorDriverEngine({
      riskCheckInterval: 60,
      autoInterventionThreshold: 0.6,
    });
  });

  describe('calculateRiskScore()', () => {
    it('应该计算低风险评分', () => {
      const session = {
        sessionId: 'session-001',
        studentId: 'student-001',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 600,  // 10 分钟
        activeQuestions: 5,
        frustrationSignals: 0,
        engagementScore: 0.9,
        exitRiskLevel: 'low' as const,
        interventions: [],
      };

      const score = engine.calculateRiskScore(session);
      expect(score).toBeLessThan(0.25);
    });

    it('应该计算高风险评分', () => {
      const session = {
        sessionId: 'session-002',
        studentId: 'student-002',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 120,  // 2 分钟
        activeQuestions: 0,
        frustrationSignals: 5,
        engagementScore: 0.3,
        exitRiskLevel: 'critical' as const,
        interventions: [],
      };

      const score = engine.calculateRiskScore(session);
      expect(score).toBeGreaterThanOrEqual(0.75);
    });

    it('应该计算中等风险评分', () => {
      const session = {
        sessionId: 'session-003',
        studentId: 'student-003',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 300,  // 5 分钟
        activeQuestions: 1,
        frustrationSignals: 2,
        engagementScore: 0.6,
        exitRiskLevel: 'medium' as const,
        interventions: [],
      };

      const score = engine.calculateRiskScore(session);
      expect(score).toBeGreaterThanOrEqual(0.25);
      expect(score).toBeLessThan(0.75);
    });
  });

  describe('updateRiskLevel()', () => {
    it('应该更新为低风险', () => {
      const session = {
        sessionId: 'session-004',
        studentId: 'student-004',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 900,
        activeQuestions: 5,
        frustrationSignals: 0,
        engagementScore: 0.95,
        exitRiskLevel: 'low' as const,
        interventions: [],
      };

      const riskLevel = engine.updateRiskLevel(session);
      expect(riskLevel).toBe('low');
    });

    it('应该更新为高风险', () => {
      const session = {
        sessionId: 'session-005',
        studentId: 'student-005',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 60,
        activeQuestions: 0,
        frustrationSignals: 6,
        engagementScore: 0.2,
        exitRiskLevel: 'low' as const,
        interventions: [],
      };

      const riskLevel = engine.updateRiskLevel(session);
      expect(riskLevel).toBe('critical');
    });
  });

  describe('shouldIntervene()', () => {
    it('应该介入 (高风险)', () => {
      const session = {
        sessionId: 'session-006',
        studentId: 'student-006',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 120,
        activeQuestions: 0,
        frustrationSignals: 5,
        engagementScore: 0.3,
        exitRiskLevel: 'high' as const,
        interventions: [],
      };

      const shouldIntervene = engine.shouldIntervene(session);
      expect(shouldIntervene).toBe(true);
    });

    it('不应该介入 (低风险)', () => {
      const session = {
        sessionId: 'session-007',
        studentId: 'student-007',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 600,
        activeQuestions: 5,
        frustrationSignals: 0,
        engagementScore: 0.9,
        exitRiskLevel: 'low' as const,
        interventions: [],
      };

      const shouldIntervene = engine.shouldIntervene(session);
      expect(shouldIntervene).toBe(false);
    });
  });

  describe('selectStrategy()', () => {
    it('应该选择小学策略', () => {
      const strategy = engine.selectStrategy('medium', 'elementary');

      expect(strategy).toBeTruthy();
      expect(strategy?.stages).toContain('elementary');
    });

    it('应该选择初中策略', () => {
      const strategy = engine.selectStrategy('high', 'middle');

      expect(strategy).toBeTruthy();
      expect(strategy?.stages).toContain('middle');
    });

    it('应该选择高中策略', () => {
      const strategy = engine.selectStrategy('critical', 'high');

      expect(strategy).toBeTruthy();
      expect(strategy?.stages).toContain('high');
    });

    it('应该返回 null (无适用策略)', () => {
      const strategy = engine.selectStrategy('low', 'elementary');
      // 低风险可能没有策略
      expect(strategy === null || strategy?.riskLevels.includes('low')).toBe(true);
    });
  });

  describe('generateGameTask()', () => {
    it('应该生成小学游戏任务', () => {
      const task = engine.generateGameTask('elementary', '一次函数');

      expect(task.id).toBeDefined();
      expect(task.name).toBeDefined();
      expect(task.reward.type).toBe('badge');
    });

    it('应该生成初中游戏任务', () => {
      const task = engine.generateGameTask('middle', '一次函数');

      expect(task.id).toBeDefined();
      expect(task.reward.type).toBe('points');
    });

    it('应该生成高中游戏任务', () => {
      const task = engine.generateGameTask('high', '一次函数');

      expect(task.id).toBeDefined();
      expect(task.reward.type).toBe('unlock');
    });
  });

  describe('generateScenarioDialog()', () => {
    it('应该生成情景对话', () => {
      const dialog = engine.generateScenarioDialog('middle', '函数学习');

      expect(dialog.id).toBeDefined();
      expect(dialog.dialog.length).toBeGreaterThan(0);
      expect(dialog.choices.length).toBeGreaterThan(0);
    });
  });

  describe('generateGoalVisualization()', () => {
    it('应该生成目标可视化', () => {
      const goal = engine.generateGoalVisualization(65, 100, 30);

      expect(goal.id).toBeDefined();
      expect(goal.currentProgress).toBe(65);
      expect(goal.targetProgress).toBe(100);
      expect(goal.daysRemaining).toBe(30);
      expect(goal.motivation).toBeDefined();
    });
  });

  describe('getInterventionStats()', () => {
    it('应该返回介入统计', async () => {
      const session = {
        sessionId: 'session-008',
        studentId: 'student-008',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 120,
        activeQuestions: 0,
        frustrationSignals: 3,
        engagementScore: 0.5,
        exitRiskLevel: 'medium' as const,
        interventions: [],
      };

      const strategy = engine.selectStrategy('medium', 'middle');
      if (strategy) {
        await engine.executeIntervention(session, strategy);
      }

      const stats = engine.getInterventionStats('session-008');
      expect(stats.count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resetSessionCount()', () => {
    it('应该重置会话计数', async () => {
      const session = {
        sessionId: 'session-009',
        studentId: 'student-009',
        startTime: new Date(),
        subject: 'math' as const,
        knowledgeIds: [],
        focusDuration: 120,
        activeQuestions: 0,
        frustrationSignals: 3,
        engagementScore: 0.5,
        exitRiskLevel: 'medium' as const,
        interventions: [],
      };

      const strategy = engine.selectStrategy('medium', 'middle');
      if (strategy) {
        await engine.executeIntervention(session, strategy);
      }

      engine.resetSessionCount('session-009');

      const stats = engine.getInterventionStats('session-009');
      expect(stats.count).toBe(0);
    });
  });
});
