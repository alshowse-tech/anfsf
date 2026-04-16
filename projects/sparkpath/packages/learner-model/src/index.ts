/**
 * SparkPath Learner Model Engine
 * 
 * Learner Model 核心引擎
 * 实时构建学生知识图谱 + 行为状态
 * 支持跨阶段自动映射
 */

import {
  LearnerModel,
  KnowledgeNode,
  KnowledgeStatus,
  LearningSession,
  BehaviorStats,
  StageWeights,
  ExitRiskLevel,
  LearnerModelConfig,
  Stage,
  Subject,
} from './types';

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: LearnerModelConfig = {
  neo4jUrl: 'bolt://localhost:7687',
  neo4jUser: 'neo4j',
  neo4jPassword: 'SparkPath2026!',
  enableCache: true,
  cacheTTL: 300,  // 5 分钟
};

// ============================================================================
// 阶段权重配置
// ============================================================================

const STAGE_WEIGHTS: Record<Stage, StageWeights> = {
  // 小学 (9-12 岁): 趣味性 60% + 掌握度 40%
  elementary: {
    fun: 0.6,
    mastery: 0.4,
    logic: 0,
    autonomy: 0,
    efficiency: 0,
    stressMgmt: 0,
  },
  
  // 初中 (13-15 岁): 逻辑性 50% + 自主性 50%
  middle: {
    fun: 0,
    mastery: 0,
    logic: 0.5,
    autonomy: 0.5,
    efficiency: 0,
    stressMgmt: 0,
  },
  
  // 高中 (16-18 岁): 效率 70% + 压力管理 30%
  high: {
    fun: 0,
    mastery: 0,
    logic: 0,
    autonomy: 0,
    efficiency: 0.7,
    stressMgmt: 0.3,
  },
};

// ============================================================================
// Learner Model Engine
// ============================================================================

export class LearnerModelEngine {
  private config: LearnerModelConfig;
  private models: Map<string, LearnerModel> = new Map();
  private knowledgeCache: Map<string, KnowledgeNode> = new Map();

  constructor(config?: Partial<LearnerModelConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[LearnerModelEngine] 初始化完成', this.config);
  }

  // ============================================================================
  // 学生模型管理
  // ============================================================================

  /**
   * 创建或获取学生模型
   */
  async getOrCreateModel(studentId: string, options?: {
    name?: string;
    age?: number;
    grade?: number;
  }): Promise<LearnerModel> {
    const existing = this.models.get(studentId);
    if (existing) {
      return existing;
    }

    const age = options?.age ?? 12;
    const stage = this.determineStage(age);
    const grade = options?.grade ?? this.determineGrade(age);

    const model: LearnerModel = {
      studentId,
      name: options?.name ?? '学生',
      age,
      stage,
      grade,
      knowledgeStatus: {},
      sessionHistory: [],
      behaviorStats: this.createDefaultBehaviorStats(),
      stageWeights: STAGE_WEIGHTS[stage],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.models.set(studentId, model);
    console.log(`[LearnerModelEngine] 创建学生模型：${studentId} (${stage})`);
    
    return model;
  }

  /**
   * 更新学生模型
   */
  async updateModel(studentId: string, updates: Partial<LearnerModel>): Promise<LearnerModel> {
    const model = await this.getOrCreateModel(studentId);
    
    Object.assign(model, updates, { updatedAt: new Date() });
    this.models.set(studentId, model);
    
    console.log(`[LearnerModelEngine] 更新学生模型：${studentId}`);
    return model;
  }

  /**
   * 获取学生模型
   */
  async getModel(studentId: string): Promise<LearnerModel | null> {
    return this.models.get(studentId) ?? null;
  }

  // ============================================================================
  // 知识状态管理
  // ============================================================================

  /**
   * 更新知识点掌握状态
   */
  async updateKnowledgeStatus(
    studentId: string,
    knowledgeId: string,
    updates: Partial<KnowledgeStatus>
  ): Promise<KnowledgeStatus> {
    const model = await this.getOrCreateModel(studentId);
    
    const existing = model.knowledgeStatus[knowledgeId];
    const status: KnowledgeStatus = {
      knowledgeId,
      mastery: 0,
      lastPracticed: new Date(),
      practiceCount: 0,
      accuracy: 0,
      avgResponseTime: 0,
      mistakeStats: {},
      ...existing,
      ...updates,
    };

    model.knowledgeStatus[knowledgeId] = status;
    await this.updateModel(studentId, model);
    
    return status;
  }

  /**
   * 获取知识点掌握状态
   */
  async getKnowledgeStatus(
    studentId: string,
    knowledgeId: string
  ): Promise<KnowledgeStatus | null> {
    const model = await this.getModel(studentId);
    if (!model) return null;
    
    return model.knowledgeStatus[knowledgeId] ?? null;
  }

  /**
   * 计算整体掌握度
   */
  async calculateOverallMastery(studentId: string, subject?: Subject): Promise<number> {
    const model = await this.getModel(studentId);
    if (!model) return 0;

    const statuses = Object.values(model.knowledgeStatus);
    if (statuses.length === 0) return 0;

    const filtered = subject
      ? statuses.filter(s => {
          // TODO: 从知识图谱获取知识点科目
          return true;
        })
      : statuses;

    const total = filtered.reduce((sum, s) => sum + s.mastery, 0);
    return total / filtered.length;
  }

  // ============================================================================
  // 会话管理
  // ============================================================================

  /**
   * 开始新会话
   */
  async startSession(studentId: string, subject: Subject): Promise<LearningSession> {
    const model = await this.getOrCreateModel(studentId);
    
    const session: LearningSession = {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId,
      startTime: new Date(),
      subject,
      knowledgeIds: [],
      focusDuration: 0,
      activeQuestions: 0,
      frustrationSignals: 0,
      engagementScore: 1,
      exitRiskLevel: 'low',
      interventions: [],
    };

    model.currentSession = session;
    await this.updateModel(studentId, model);
    
    console.log(`[LearnerModelEngine] 开始会话：${session.sessionId}`);
    return session;
  }

  /**
   * 结束会话
   */
  async endSession(studentId: string): Promise<LearningSession | null> {
    const model = await this.getModel(studentId);
    if (!model || !model.currentSession) return null;

    const session = model.currentSession;
    session.endTime = new Date();
    
    // 更新行为统计
    this.updateBehaviorStats(model, session);
    
    // 添加到历史
    model.sessionHistory.push(session.sessionId);
    model.currentSession = undefined;
    
    await this.updateModel(studentId, model);
    
    console.log(`[LearnerModelEngine] 结束会话：${session.sessionId}`);
    return session;
  }

  /**
   * 更新会话状态
   */
  async updateSession(
    studentId: string,
    updates: Partial<LearningSession>
  ): Promise<LearningSession | null> {
    const model = await this.getModel(studentId);
    if (!model || !model.currentSession) return null;

    Object.assign(model.currentSession, updates);
    return model.currentSession;
  }

  // ============================================================================
  // 行为分析
  // ============================================================================

  /**
   * 检测退出风险
   */
  detectExitRisk(session: LearningSession): ExitRiskLevel {
    const duration = session.focusDuration;
    const frustration = session.frustrationSignals;
    const engagement = session.engagementScore;

    // 风险评分
    let riskScore = 0;
    
    // 专注时长过短
    if (duration < 300) riskScore += 2;  // <5 分钟
    else if (duration < 600) riskScore += 1;  // <10 分钟
    
    // 挫败信号过多
    riskScore += frustration * 2;
    
    // 参与度低
    if (engagement < 0.5) riskScore += 2;
    else if (engagement < 0.7) riskScore += 1;

    // 风险等级判定
    if (riskScore >= 6) return 'critical';
    if (riskScore >= 4) return 'high';
    if (riskScore >= 2) return 'medium';
    return 'low';
  }

  /**
   * 记录介入
   */
  async recordIntervention(
    studentId: string,
    type: LearningSession['interventions'][0]['type'],
    content: string
  ): Promise<void> {
    const model = await this.getModel(studentId);
    if (!model || !model.currentSession) return;

    const intervention = {
      timestamp: new Date(),
      type,
      content,
    };

    model.currentSession.interventions.push(intervention);
    await this.updateModel(studentId, model);
  }

  // ============================================================================
  // 跨阶段映射
  // ============================================================================

  /**
   * 根据年龄确定阶段
   */
  determineStage(age: number): Stage {
    if (age <= 12) return 'elementary';
    if (age <= 15) return 'middle';
    return 'high';
  }

  /**
   * 根据年龄确定年级
   */
  determineGrade(age: number): number {
    // 简化逻辑：年龄 - 6 = 年级
    return age - 6;
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private createDefaultBehaviorStats(): BehaviorStats {
    return {
      avgSessionDuration: 0,
      totalLearningTime: 0,
      learningDays: 0,
      streakDays: 0,
      avgFocusScore: 0,
      avgEngagementScore: 0,
      totalQuestions: 0,
      totalFrustrationSignals: 0,
      exitRate: 0,
    };
  }

  private updateBehaviorStats(model: LearnerModel, session: LearningSession): void {
    const stats = model.behaviorStats;
    const duration = (session.endTime!.getTime() - session.startTime.getTime()) / 1000;
    
    // 更新总时长
    stats.totalLearningTime += duration;
    
    // 更新平均时长
    const sessionCount = model.sessionHistory.length + 1;
    stats.avgSessionDuration = stats.totalLearningTime / sessionCount;
    
    // 更新专注度
    stats.avgFocusScore = (stats.avgFocusScore * (sessionCount - 1) + session.engagementScore) / sessionCount;
    
    // 更新参与度
    stats.avgEngagementScore = (stats.avgEngagementScore * (sessionCount - 1) + session.engagementScore) / sessionCount;
    
    // 更新提问次数
    stats.totalQuestions += session.activeQuestions;
    
    // 更新挫败信号
    stats.totalFrustrationSignals += session.frustrationSignals;
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createLearnerModelEngine(config?: Partial<LearnerModelConfig>): LearnerModelEngine {
  return new LearnerModelEngine(config);
}

export default LearnerModelEngine;
