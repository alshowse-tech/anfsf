/**
 * SparkPath Behavior Driver Engine
 * 
 * 行为驱动引擎 (调节器)
 * 退出风险检测 + 介入策略库 + 三阶段差异化策略
 */

import {
  LearningSession,
  LearnerModel,
  Stage,
} from './types';

// ============================================================================
// 类型定义
// ============================================================================

export type Stage = 'elementary' | 'middle' | 'high';
export type ExitRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface InterventionStrategy {
  /** 策略 ID */
  id: string;
  
  /** 策略名称 */
  name: string;
  
  /** 适用风险等级 */
  riskLevels: ExitRiskLevel[];
  
  /** 适用阶段 */
  stages: Stage[];
  
  /** 策略描述 */
  description: string;
  
  /** 策略内容模板 */
  contentTemplate: string;
  
  /** 预计效果 (0-1) */
  expectedEffectiveness: number;
  
  /** 使用次数 */
  usageCount: number;
  
  /** 平均效果 */
  avgEffectiveness: number;
}

export interface GameTask {
  /** 任务 ID */
  id: string;
  
  /** 任务名称 */
  name: string;
  
  /** 任务描述 */
  description: string;
  
  /** 奖励 */
  reward: {
    type: 'points' | 'badge' | 'unlock';
    value: number | string;
  };
  
  /** 预计时长 (分钟) */
  estimatedDuration: number;
}

export interface ScenarioDialog {
  /** 对话 ID */
  id: string;
  
  /** 场景名称 */
  scene: string;
  
  /** 对话内容 */
  dialog: string[];
  
  /** 选项 */
  choices: Array<{
    text: string;
    nextDialogId?: string;
    effect?: 'encourage' | 'hint' | 'break';
  }>;
}

export interface GoalVisualization {
  /** 目标 ID */
  id: string;
  
  /** 目标名称 */
  name: string;
  
  /** 当前进度 */
  currentProgress: number;
  
  /** 目标进度 */
  targetProgress: number;
  
  /** 剩余天数 */
  daysRemaining: number;
  
  /** 激励语 */
  motivation: string;
}

export interface BehaviorDriverConfig {
  /** 风险检测间隔 (秒) */
  riskCheckInterval: number;
  
  /** 介入冷却时间 (秒) */
  interventionCooldown: number;
  
  /** 最大介入次数/会话 */
  maxInterventionsPerSession: number;
  
  /** 自动介入阈值 */
  autoInterventionThreshold: number;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: BehaviorDriverConfig = {
  riskCheckInterval: 60,  // 每 60 秒检测一次
  interventionCooldown: 180,  // 介入后冷却 3 分钟
  maxInterventionsPerSession: 5,
  autoInterventionThreshold: 0.6,  // 风险评分>0.6 自动介入
};

// ============================================================================
// 介入策略库
// ============================================================================

const INTERVENTION_STRATEGIES: InterventionStrategy[] = [
  // 鼓励策略
  {
    id: 'encouragement-1',
    name: '积极鼓励',
    riskLevels: ['low', 'medium'],
    stages: ['elementary', 'middle', 'high'],
    description: '给予积极的反馈和鼓励',
    contentTemplate: '你已经很棒了！继续加油，相信你能做到！💪',
    expectedEffectiveness: 0.7,
    usageCount: 0,
    avgEffectiveness: 0.7,
  },
  
  // 提示策略
  {
    id: 'hint-1',
    name: '解题提示',
    riskLevels: ['medium', 'high'],
    stages: ['middle', 'high'],
    description: '提供解题思路和提示',
    contentTemplate: '试试从这个角度思考：{hint}',
    expectedEffectiveness: 0.75,
    usageCount: 0,
    avgEffectiveness: 0.75,
  },
  
  // 休息策略
  {
    id: 'break-1',
    name: '短暂休息',
    riskLevels: ['high', 'critical'],
    stages: ['elementary', 'middle', 'high'],
    description: '建议短暂休息，放松身心',
    contentTemplate: '学习很辛苦呢～休息 5 分钟，喝杯水，活动一下吧！☕',
    expectedEffectiveness: 0.8,
    usageCount: 0,
    avgEffectiveness: 0.8,
  },
  
  // 游戏化策略 (小学专用)
  {
    id: 'gamification-elementary',
    name: '小游戏挑战',
    riskLevels: ['medium', 'high'],
    stages: ['elementary'],
    description: '通过小游戏重新激发兴趣',
    contentTemplate: '来玩个小游戏吧！完成这个挑战就能获得{reward}！🎮',
    expectedEffectiveness: 0.85,
    usageCount: 0,
    avgEffectiveness: 0.85,
  },
  
  // 竞争策略 (初中专用)
  {
    id: 'competition-middle',
    name: '同伴挑战',
    riskLevels: ['medium', 'high'],
    stages: ['middle'],
    description: '引入同伴竞争元素',
    contentTemplate: '你的同学刚刚完成了这个知识点，要不要挑战一下？🏆',
    expectedEffectiveness: 0.75,
    usageCount: 0,
    avgEffectiveness: 0.75,
  },
  
  // 目标可视化 (高中专用)
  {
    id: 'goal-high',
    name: '目标可视化',
    riskLevels: ['high', 'critical'],
    stages: ['high'],
    description: '展示长期目标和进度',
    contentTemplate: '距离你的目标还有{progress}，坚持下去！🎯',
    expectedEffectiveness: 0.7,
    usageCount: 0,
    avgEffectiveness: 0.7,
  },
];

// ============================================================================
// Behavior Driver Engine
// ============================================================================

export class BehaviorDriverEngine {
  private config: BehaviorDriverConfig;
  private strategies: InterventionStrategy[];
  private lastInterventionTime: Map<string, number> = new Map();
  private interventionCount: Map<string, number> = new Map();

  constructor(config?: Partial<BehaviorDriverConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.strategies = [...INTERVENTION_STRATEGIES];
    console.log('[BehaviorDriver] 初始化完成', this.config);
  }

  // ============================================================================
  // 退出风险检测
  // ============================================================================

  /**
   * 检测退出风险
   */
  detectExitRisk(session: LearningSession): ExitRiskLevel {
    return session.exitRiskLevel;
  }

  /**
   * 计算风险评分
   */
  calculateRiskScore(session: LearningSession): number {
    const duration = session.focusDuration / 60;  // 转换为分钟
    const frustration = session.frustrationSignals;
    const engagement = session.engagementScore;
    const questions = session.activeQuestions;

    // 风险评分 (0-1, 越高风险越大)
    let riskScore = 0;

    // 专注时长过短 (权重 0.3)
    if (duration < 5) riskScore += 0.3;
    else if (duration < 10) riskScore += 0.15;

    // 挫败信号 (权重 0.3)
    riskScore += Math.min(0.3, frustration * 0.1);

    // 参与度低 (权重 0.3)
    riskScore += (1 - engagement) * 0.3;

    // 主动提问少 (权重 0.1)
    if (questions < 1 && duration > 10) riskScore += 0.1;

    return Math.min(1, riskScore);
  }

  /**
   * 更新会话风险等级
   */
  updateRiskLevel(session: LearningSession): ExitRiskLevel {
    const riskScore = this.calculateRiskScore(session);
    
    let riskLevel: ExitRiskLevel;
    if (riskScore >= 0.75) riskLevel = 'critical';
    else if (riskScore >= 0.5) riskLevel = 'high';
    else if (riskScore >= 0.25) riskLevel = 'medium';
    else riskLevel = 'low';

    session.exitRiskLevel = riskLevel;
    return riskLevel;
  }

  // ============================================================================
  // 介入决策
  // ============================================================================

  /**
   * 判断是否应该介入
   */
  shouldIntervene(session: LearningSession): boolean {
    const riskScore = this.calculateRiskScore(session);
    
    // 风险评分低于阈值，不介入
    if (riskScore < this.config.autoInterventionThreshold) {
      return false;
    }

    // 检查冷却时间
    const lastIntervention = this.lastInterventionTime.get(session.sessionId) ?? 0;
    const timeSinceLast = (Date.now() - lastIntervention) / 1000;
    if (timeSinceLast < this.config.interventionCooldown) {
      return false;
    }

    // 检查介入次数
    const count = this.interventionCount.get(session.sessionId) ?? 0;
    if (count >= this.config.maxInterventionsPerSession) {
      return false;
    }

    return true;
  }

  /**
   * 选择介入策略
   */
  selectStrategy(riskLevel: ExitRiskLevel, stage: Stage): InterventionStrategy | null {
    // 筛选适用的策略
    const applicable = this.strategies.filter(s =>
      s.riskLevels.includes(riskLevel) &&
      s.stages.includes(stage)
    );

    if (applicable.length === 0) {
      return null;
    }

    // 按效果排序，选择最佳策略
    applicable.sort((a, b) => b.avgEffectiveness - a.avgEffectiveness);
    
    // 添加一些随机性，避免总是用同一个策略
    const topStrategies = applicable.slice(0, Math.min(3, applicable.length));
    const selected = topStrategies[Math.floor(Math.random() * topStrategies.length)];

    return selected;
  }

  /**
   * 执行介入
   */
  async executeIntervention(
    session: LearningSession,
    strategy: InterventionStrategy
  ): Promise<void> {
    // 更新策略使用统计
    strategy.usageCount++;
    
    // 记录介入时间
    this.lastInterventionTime.set(session.sessionId, Date.now());
    
    // 增加介入计数
    const count = this.interventionCount.get(session.sessionId) ?? 0;
    this.interventionCount.set(session.sessionId, count + 1);

    console.log(`[BehaviorDriver] 执行介入：${strategy.name} (风险等级：${session.exitRiskLevel})`);
  }

  /**
   * 记录介入效果
   */
  recordEffectiveness(strategyId: string, effectiveness: number): void {
    const strategy = this.strategies.find(s => s.id === strategyId);
    if (!strategy) return;

    // 更新平均效果
    const totalEffectiveness = strategy.avgEffectiveness * strategy.usageCount + effectiveness;
    strategy.avgEffectiveness = totalEffectiveness / (strategy.usageCount + 1);
  }

  // ============================================================================
  // 三阶段差异化策略
  // ============================================================================

  /**
   * 获取小学阶段策略
   */
  getElementaryStrategies(riskLevel: ExitRiskLevel): InterventionStrategy[] {
    return this.strategies.filter(s =>
      s.stages.includes('elementary') &&
      s.riskLevels.includes(riskLevel)
    );
  }

  /**
   * 获取初中阶段策略
   */
  getMiddleStrategies(riskLevel: ExitRiskLevel): InterventionStrategy[] {
    return this.strategies.filter(s =>
      s.stages.includes('middle') &&
      s.riskLevels.includes(riskLevel)
    );
  }

  /**
   * 获取高中阶段策略
   */
  getHighStrategies(riskLevel: ExitRiskLevel): InterventionStrategy[] {
    return this.strategies.filter(s =>
      s.stages.includes('high') &&
      s.riskLevels.includes(riskLevel)
    );
  }

  // ============================================================================
  // 游戏化任务 (小学)
  // ============================================================================

  /**
   * 生成游戏化任务
   */
  generateGameTask(stage: Stage, topic: string): GameTask {
    const tasks: Record<Stage, GameTask> = {
      elementary: {
        id: `game-${Date.now()}`,
        name: '知识大冒险',
        description: `完成${topic}的挑战，获得神秘奖励！`,
        reward: {
          type: 'badge',
          value: '🏆 学习小达人',
        },
        estimatedDuration: 5,
      },
      middle: {
        id: `game-${Date.now()}`,
        name: '挑战排行榜',
        description: `在${topic}上超越其他同学！`,
        reward: {
          type: 'points',
          value: 100,
        },
        estimatedDuration: 10,
      },
      high: {
        id: `game-${Date.now()}`,
        name: '目标冲刺',
        description: `完成${topic}的深度学习`,
        reward: {
          type: 'unlock',
          value: '高级分析报告',
        },
        estimatedDuration: 15,
      },
    };

    return tasks[stage];
  }

  // ============================================================================
  // 情景对话 (初中)
  // ============================================================================

  /**
   * 生成情景对话
   */
  generateScenarioDialog(stage: Stage, context: string): ScenarioDialog {
    return {
      id: `dialog-${Date.now()}`,
      scene: '学习助手',
      dialog: [
        `看起来你在${context}上遇到了一些困难...`,
        '没关系，这是很正常的！',
        '要不要试试换个方法？',
      ],
      choices: [
        { text: '好的，我想试试', effect: 'encourage' },
        { text: '给我一些提示', effect: 'hint' },
        { text: '我想休息一下', effect: 'break' },
      ],
    };
  }

  // ============================================================================
  // 目标可视化 (高中)
  // ============================================================================

  /**
   * 生成目标可视化
   */
  generateGoalVisualization(
    currentProgress: number,
    targetProgress: number,
    daysRemaining: number
  ): GoalVisualization {
    const progress = ((currentProgress / targetProgress) * 100).toFixed(1);
    
    return {
      id: `goal-${Date.now()}`,
      name: '学习目标',
      currentProgress,
      targetProgress,
      daysRemaining,
      motivation: `已完成${progress}%，还有${daysRemaining}天，坚持就是胜利！🎯`,
    };
  }

  // ============================================================================
  // 统计与报告
  // ============================================================================

  /**
   * 获取介入统计
   */
  getInterventionStats(sessionId: string): {
    count: number;
    lastIntervention: number;
  } {
    return {
      count: this.interventionCount.get(sessionId) ?? 0,
      lastIntervention: this.lastInterventionTime.get(sessionId) ?? 0,
    };
  }

  /**
   * 重置会话计数
   */
  resetSessionCount(sessionId: string): void {
    this.interventionCount.delete(sessionId);
    this.lastInterventionTime.delete(sessionId);
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createBehaviorDriverEngine(
  config?: Partial<BehaviorDriverConfig>
): BehaviorDriverEngine {
  return new BehaviorDriverEngine(config);
}

export default BehaviorDriverEngine;
