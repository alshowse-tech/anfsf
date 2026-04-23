/**
 * Learner Model Engine - 统一学习者建模
 * 
 * SparkPath 核心模块：实时构建知识图谱 + 行为状态，支持三阶段动态权重适配
 * 
 * @module sparkpath/core/learner-model
 * @version 2.0.0 (商用版)
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 学段类型
 */
export type Stage = 'elementary' | 'middle' | 'high';

/**
 * 知识点掌握度
 */
export interface KnowledgeMastery {
  nodeId: string;
  score: number;        // 0-1
  lastPracticed: Date;
  attempts: number;
  successRate: number;
}

/**
 * 知识图谱
 */
export interface KnowledgeGraph {
  mastered: string[];           // 已掌握知识点 ID 列表
  learning: string[];           // 学习中知识点 ID 列表
  weak: string[];               // 薄弱知识点 ID 列表
  masteryScores: Map<string, KnowledgeMastery>;  // 详细掌握度
}

/**
 * 行为状态
 */
export interface BehaviorState {
  focusDuration: number;        // 专注时长 (分钟)
  activeQuestions: number;      // 主动提问次数
  frustrationSignals: number;   // 挫败信号次数
  interruptionRate: number;     // 中断率 (0-1)
  lastActiveAt: Date;
  sessionCount: number;
}

/**
 * 年龄权重配置
 */
export interface StageWeights {
  // 小学权重
  elementary: {
    fun: number;        // 趣味性 60%
    mastery: number;    // 掌握度 40%
  };
  // 初中权重
  middle: {
    logic: number;      // 逻辑性 50%
    autonomy: number;   // 自主性 50%
  };
  // 高中权重
  high: {
    efficiency: number;         // 效率 70%
    stressManagement: number;   // 压力管理 30%
  };
}

/**
 * 介入策略类型
 */
export type InterventionFrequency = 'high' | 'medium' | 'low';
export type InterventionStyle = 'gamification' | 'dialogue' | 'goal-visualization';

/**
 * 学段权重配置
 */
export interface StageWeightConfig {
  fun?: number;
  mastery?: number;
  logic?: number;
  autonomy?: number;
  efficiency?: number;
  stressManagement?: number;
  interventionFrequency: InterventionFrequency;
  interventionStyle: InterventionStyle;
}

/**
 * 学习动作
 */
export interface LearningAction {
  type: 'learn' | 'practice' | 'review' | 'break';
  knowledgeNodeId: string;
  estimatedDuration: number;  // 分钟
  difficulty: number;         // 0-1
  reason: string;
}

/**
 * Learner Model 主接口
 */
export interface ILearnerModel {
  // 基本信息
  userId: string;
  age: number;
  stage: Stage;
  grade: number;
  
  // 核心数据
  knowledgeGraph: KnowledgeGraph;
  behaviorState: BehaviorState;
  weights: StageWeightConfig;
  
  // 核心方法
  updateKnowledge(nodeId: string, score: number): void;
  updateBehavior(state: Partial<BehaviorState>): void;
  calculateNextAction(): LearningAction;
  getStageWeights(): StageWeightConfig;
  shouldIntervene(): boolean;
  getInterventionStrategy(): InterventionStrategy;
}

/**
 * 介入策略
 */
export interface InterventionStrategy {
  type: InterventionStyle;
  reason: string;
  actions: string[];
  estimatedEffectiveness: number;
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 默认年龄权重配置
 */
const DEFAULT_WEIGHTS: StageWeights = {
  elementary: {
    fun: 0.6,
    mastery: 0.4
  },
  middle: {
    logic: 0.5,
    autonomy: 0.5
  },
  high: {
    efficiency: 0.7,
    stressManagement: 0.3
  }
};

/**
 * 学段年龄范围
 */
const STAGE_AGE_RANGES: Record<Stage, [number, number]> = {
  elementary: [9, 12],
  middle: [13, 15],
  high: [16, 18]
};

/**
 * 介入阈值配置
 */
const INTERVENTION_THRESHOLDS = {
  high: {
    minFocusDuration: 10,      // <10 分钟触发介入
    maxFrustrationSignals: 3,   // ≥3 次触发介入
    maxInterruptionRate: 0.05   // >5% 触发介入
  },
  medium: {
    minFocusDuration: 15,
    maxFrustrationSignals: 5,
    maxInterruptionRate: 0.10
  },
  low: {
    minFocusDuration: 20,
    maxFrustrationSignals: 7,
    maxInterruptionRate: 0.15
  }
};

// ============================================================================
// LearnerModel 主类
// ============================================================================

export class LearnerModel implements ILearnerModel {
  // 基本信息
  userId: string;
  age: number;
  stage: Stage;
  grade: number;
  
  // 核心数据
  knowledgeGraph: KnowledgeGraph;
  behaviorState: BehaviorState;
  weights: StageWeightConfig;
  
  constructor(userId: string, age: number, grade: number) {
    this.userId = userId;
    this.age = age;
    this.grade = grade;
    this.stage = this.determineStage(age);
    this.weights = this.getStageWeights();
    
    // 初始化知识图谱
    this.knowledgeGraph = {
      mastered: [],
      learning: [],
      weak: [],
      masteryScores: new Map()
    };
    
    // 初始化行为状态
    this.behaviorState = {
      focusDuration: 0,
      activeQuestions: 0,
      frustrationSignals: 0,
      interruptionRate: 0,
      lastActiveAt: new Date(),
      sessionCount: 0
    };
  }
  
  /**
   * 确定学段
   */
  private determineStage(age: number): Stage {
    if (age <= 12) return 'elementary';
    if (age <= 15) return 'middle';
    return 'high';
  }
  
  /**
   * 获取学段权重配置
   */
  getStageWeights(): StageWeightConfig {
    const baseWeights = DEFAULT_WEIGHTS[this.stage];
    
    switch (this.stage) {
      case 'elementary':
        return {
          fun: baseWeights.fun,
          mastery: baseWeights.mastery,
          interventionFrequency: 'high',
          interventionStyle: 'gamification'
        };
      
      case 'middle':
        return {
          logic: baseWeights.logic,
          autonomy: baseWeights.autonomy,
          interventionFrequency: 'medium',
          interventionStyle: 'dialogue'
        };
      
      case 'high':
        return {
          efficiency: baseWeights.efficiency,
          stressManagement: baseWeights.stressManagement,
          interventionFrequency: 'low',
          interventionStyle: 'goal-visualization'
        };
    }
  }
  
  /**
   * 更新知识点掌握度
   */
  updateKnowledge(nodeId: string, score: number): void {
    const existing = this.knowledgeGraph.masteryScores.get(nodeId);
    
    const mastery: KnowledgeMastery = {
      nodeId,
      score,
      lastPracticed: new Date(),
      attempts: existing ? existing.attempts + 1 : 1,
      successRate: existing 
        ? (existing.successRate * existing.attempts + score) / (existing.attempts + 1)
        : score
    };
    
    this.knowledgeGraph.masteryScores.set(nodeId, mastery);
    
    // 更新分类
    this.updateKnowledgeCategories(nodeId, score);
  }
  
  /**
   * 更新知识分类
   */
  private updateKnowledgeCategories(nodeId: string, score: number): void {
    // 移除旧分类
    this.knowledgeGraph.mastered = this.knowledgeGraph.mastered.filter(id => id !== nodeId);
    this.knowledgeGraph.learning = this.knowledgeGraph.learning.filter(id => id !== nodeId);
    this.knowledgeGraph.weak = this.knowledgeGraph.weak.filter(id => id !== nodeId);
    
    // 添加新分类
    if (score >= 0.8) {
      this.knowledgeGraph.mastered.push(nodeId);
    } else if (score >= 0.5) {
      this.knowledgeGraph.learning.push(nodeId);
    } else {
      this.knowledgeGraph.weak.push(nodeId);
    }
  }
  
  /**
   * 更新行为状态
   */
  updateBehavior(state: Partial<BehaviorState>): void {
    Object.assign(this.behaviorState, state, {
      lastActiveAt: new Date()
    });
    
    // 计算中断率
    if (this.behaviorState.sessionCount > 0) {
      this.behaviorState.interruptionRate = 
        this.behaviorState.frustrationSignals / this.behaviorState.sessionCount;
    }
  }
  
  /**
   * 计算下一最佳学习动作
   */
  calculateNextAction(): LearningAction {
    // 优先处理薄弱知识点
    if (this.knowledgeGraph.weak.length > 0) {
      const weakNodeId = this.knowledgeGraph.weak[0];
      return {
        type: 'practice',
        knowledgeNodeId: weakNodeId,
        estimatedDuration: 15,
        difficulty: 0.5,
        reason: '强化薄弱知识点'
      };
    }
    
    // 其次学习新知识
    if (this.knowledgeGraph.learning.length > 0) {
      const learningNodeId = this.knowledgeGraph.learning[0];
      return {
        type: 'learn',
        knowledgeNodeId: learningNodeId,
        estimatedDuration: 25,
        difficulty: 0.7,
        reason: '学习新知识'
      };
    }
    
    // 复习已掌握知识
    if (this.knowledgeGraph.mastered.length > 0) {
      const masteredNodeId = this.knowledgeGraph.mastered[0];
      return {
        type: 'review',
        knowledgeNodeId: masteredNodeId,
        estimatedDuration: 10,
        difficulty: 0.3,
        reason: '复习巩固'
      };
    }
    
    // 默认：休息
    return {
      type: 'break',
      knowledgeNodeId: '',
      estimatedDuration: 5,
      difficulty: 0,
      reason: '无学习任务，建议休息'
    };
  }
  
  /**
   * 判断是否需要介入
   */
  shouldIntervene(): boolean {
    const thresholds = INTERVENTION_THRESHOLDS[this.weights.interventionFrequency];
    
    // 专注时长不足
    if (this.behaviorState.focusDuration < thresholds.minFocusDuration) {
      return true;
    }
    
    // 挫败信号过多
    if (this.behaviorState.frustrationSignals >= thresholds.maxFrustrationSignals) {
      return true;
    }
    
    // 中断率过高
    if (this.behaviorState.interruptionRate > thresholds.maxInterruptionRate) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 获取介入策略
   */
  getInterventionStrategy(): InterventionStrategy {
    const style = this.weights.interventionStyle;
    
    switch (style) {
      case 'gamification':
        return {
          type: 'gamification',
          reason: '小学阶段采用游戏化介入',
          actions: [
            '完成小任务获得积分',
            '解锁成就徽章',
            '即时成功反馈',
            '卡通动画鼓励'
          ],
          estimatedEffectiveness: 0.85
        };
      
      case 'dialogue':
        return {
          type: 'dialogue',
          reason: '初中阶段采用情景对话介入',
          actions: [
            'AI 情景对话引导',
            '同伴竞争元素',
            '自信心曲线展示',
            '阶段性目标设定'
          ],
          estimatedEffectiveness: 0.80
        };
      
      case 'goal-visualization':
        return {
          type: 'goal-visualization',
          reason: '高中阶段采用长期目标可视化介入',
          actions: [
            '高考目标可视化',
            '压力缓解指导',
            '学习效率分析',
            '长期规划建议'
          ],
          estimatedEffectiveness: 0.75
        };
    }
  }
  
  /**
   * 导出模型数据
   */
  export(): Record<string, any> {
    return {
      userId: this.userId,
      age: this.age,
      stage: this.stage,
      grade: this.grade,
      weights: this.weights,
      knowledgeGraph: {
        mastered: this.knowledgeGraph.mastered,
        learning: this.knowledgeGraph.learning,
        weak: this.knowledgeGraph.weak,
        masteryScores: Array.from(this.knowledgeGraph.masteryScores.entries())
      },
      behaviorState: this.behaviorState,
      exportedAt: new Date().toISOString()
    };
  }
  
  /**
   * 从数据导入模型
   */
  static import(data: Record<string, any>): LearnerModel {
    const model = new LearnerModel(
      data.userId,
      data.age,
      data.grade
    );
    
    model.knowledgeGraph = {
      mastered: data.knowledgeGraph.mastered,
      learning: data.knowledgeGraph.learning,
      weak: data.knowledgeGraph.weak,
      masteryScores: new Map(data.knowledgeGraph.masteryScores)
    };
    
    model.behaviorState = data.behaviorState;
    model.weights = data.weights;
    
    return model;
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 计算学段权重
 */
export function calculateStageWeight(age: number): StageWeightConfig {
  if (age <= 12) {
    return {
      fun: 0.6,
      mastery: 0.4,
      interventionFrequency: 'high',
      interventionStyle: 'gamification'
    };
  } else if (age <= 15) {
    return {
      logic: 0.5,
      autonomy: 0.5,
      interventionFrequency: 'medium',
      interventionStyle: 'dialogue'
    };
  } else {
    return {
      efficiency: 0.7,
      stressManagement: 0.3,
      interventionFrequency: 'low',
      interventionStyle: 'goal-visualization'
    };
  }
}

/**
 * 创建 Learner Model
 */
export function createLearnerModel(userId: string, age: number, grade: number): LearnerModel {
  return new LearnerModel(userId, age, grade);
}
