/**
 * Learner Model Engine Tests
 */

import { createLearnerModelEngine } from '../index';

describe('Learner Model Engine', () => {
  let engine: ReturnType<typeof createLearnerModelEngine>;

  beforeEach(() => {
    engine = createLearnerModelEngine({
      enableCache: false,
    });
  });

  describe('getOrCreateModel()', () => {
    it('应该创建新学生模型', async () => {
      const model = await engine.getOrCreateModel('student-001', {
        name: '小明',
        age: 14,
      });

      expect(model.studentId).toBe('student-001');
      expect(model.name).toBe('小明');
      expect(model.age).toBe(14);
      expect(model.stage).toBe('middle');
    });

    it('应该自动确定阶段 (小学)', async () => {
      const model = await engine.getOrCreateModel('student-002', {
        age: 10,
      });

      expect(model.stage).toBe('elementary');
    });

    it('应该自动确定阶段 (初中)', async () => {
      const model = await engine.getOrCreateModel('student-003', {
        age: 14,
      });

      expect(model.stage).toBe('middle');
    });

    it('应该自动确定阶段 (高中)', async () => {
      const model = await engine.getOrCreateModel('student-004', {
        age: 17,
      });

      expect(model.stage).toBe('high');
    });

    it('应该返回已存在的模型', async () => {
      await engine.getOrCreateModel('student-005');
      const model2 = await engine.getOrCreateModel('student-005');

      expect(model2.studentId).toBe('student-005');
    });

    it('应该使用默认阶段权重', async () => {
      const model = await engine.getOrCreateModel('student-006', {
        age: 10,
      });

      expect(model.stageWeights.fun).toBe(0.6);
      expect(model.stageWeights.mastery).toBe(0.4);
    });
  });

  describe('updateKnowledgeStatus()', () => {
    it('应该更新知识点掌握状态', async () => {
      await engine.getOrCreateModel('student-007');

      const status = await engine.updateKnowledgeStatus('student-007', 'math-001', {
        mastery: 0.75,
        accuracy: 0.8,
        practiceCount: 5,
      });

      expect(status.knowledgeId).toBe('math-001');
      expect(status.mastery).toBe(0.75);
      expect(status.accuracy).toBe(0.8);
    });

    it('应该累积更新', async () => {
      await engine.getOrCreateModel('student-008');

      await engine.updateKnowledgeStatus('student-008', 'math-002', {
        mastery: 0.5,
      });

      const status2 = await engine.updateKnowledgeStatus('student-008', 'math-002', {
        accuracy: 0.9,
      });

      expect(status2.mastery).toBe(0.5);
      expect(status2.accuracy).toBe(0.9);
    });
  });

  describe('startSession() / endSession()', () => {
    it('应该开始新会话', async () => {
      await engine.getOrCreateModel('student-009');

      const session = await engine.startSession('student-009', 'math');

      expect(session.studentId).toBe('student-009');
      expect(session.subject).toBe('math');
      expect(session.exitRiskLevel).toBe('low');
      expect(session.startTime).toBeDefined();
    });

    it('应该结束会话', async () => {
      await engine.getOrCreateModel('student-010');
      await engine.startSession('student-010', 'math');

      const endedSession = await engine.endSession('student-010');

      expect(endedSession).toBeTruthy();
      expect(endedSession?.endTime).toBeDefined();
    });

    it('应该更新会话状态', async () => {
      await engine.getOrCreateModel('student-011');
      await engine.startSession('student-011', 'math');

      const updated = await engine.updateSession('student-011', {
        focusDuration: 300,
        activeQuestions: 3,
      });

      expect(updated?.focusDuration).toBe(300);
      expect(updated?.activeQuestions).toBe(3);
    });
  });

  describe('detectExitRisk()', () => {
    it('应该检测低风险', async () => {
      await engine.getOrCreateModel('student-012');
      const session = await engine.startSession('student-012', 'math');

      session.focusDuration = 600;  // 10 分钟
      session.frustrationSignals = 0;
      session.engagementScore = 0.9;

      const risk = engine.detectExitRisk(session);
      expect(risk).toBe('low');
    });

    it('应该检测高风险', async () => {
      await engine.getOrCreateModel('student-013');
      const session = await engine.startSession('student-013', 'math');

      session.focusDuration = 120;  // 2 分钟
      session.frustrationSignals = 5;
      session.engagementScore = 0.3;

      const risk = engine.detectExitRisk(session);
      expect(risk).toBe('critical');
    });

    it('应该检测中等风险', async () => {
      await engine.getOrCreateModel('student-014');
      const session = await engine.startSession('student-014', 'math');

      session.focusDuration = 300;  // 5 分钟
      session.frustrationSignals = 2;
      session.engagementScore = 0.6;

      const risk = engine.detectExitRisk(session);
      expect(risk).toBe('medium');
    });
  });

  describe('calculateOverallMastery()', () => {
    it('应该计算整体掌握度', async () => {
      await engine.getOrCreateModel('student-015');

      await engine.updateKnowledgeStatus('student-015', 'math-001', {
        mastery: 0.8,
      });

      await engine.updateKnowledgeStatus('student-015', 'math-002', {
        mastery: 0.6,
      });

      const overall = await engine.calculateOverallMastery('student-015');

      expect(overall).toBeCloseTo(0.7, 1);
    });

    it('应该返回 0 (无数据)', async () => {
      await engine.getOrCreateModel('student-016');

      const overall = await engine.calculateOverallMastery('student-016');

      expect(overall).toBe(0);
    });
  });

  describe('recordIntervention()', () => {
    it('应该记录介入', async () => {
      await engine.getOrCreateModel('student-017');
      await engine.startSession('student-017', 'math');

      await engine.recordIntervention('student-017', 'encouragement', '加油！');

      const model = await engine.getModel('student-017');
      expect(model?.currentSession?.interventions.length).toBe(1);
    });
  });
});
