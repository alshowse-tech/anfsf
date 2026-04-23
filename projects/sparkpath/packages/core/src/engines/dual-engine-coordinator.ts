/**
 * Dual Engine Coordinator - 双引擎协同调度器
 * 
 * SparkPath 核心模块：学习加速引擎 (主) + 行为驱动引擎 (辅) 的协同调度
 * 
 * @module sparkpath/core/dual-engine-coordinator
 * @version 2.0.0 (商用版)
 */

import { LearnerModel, LearningAction, InterventionStrategy } from '../models/learner-model';

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 引擎类型
 */
export type EngineType = 'learning' | 'behavior';

/**
 * 引擎优先级
 */
export type EnginePriority = 'high' | 'low';

/**
 * 系统状态
 */
export type SystemState = 'normal' | 'risk' | 'critical';

/**
 * 学习加速引擎状态
 */
export interface LearningEngineState {
  status: 'active' | 'idle' | 'paused';
  currentAction: LearningAction | null;
  knowledgeGapCount: number;
  learningPathProgress: number;  // 0-100
}

/**
 * 行为驱动引擎状态
 */
export interface BehaviorEngineState {
  status: 'monitoring' | 'intervening' | 'standby';
  riskLevel: number;  // 0-100
  interventionCount: number;
  lastInterventionAt: Date | null;
}

/**
 * 协同决策
 */
export interface CoordinationDecision {
  controller: EngineType;
  state: SystemState;
  learningAction: LearningAction | null;
  interventionStrategy: InterventionStrategy | null;
  reason: string;
  timestamp: Date;
}

/**
 * 冲突解决结果
 */
export interface ConflictResolution {
  winner: EngineType;
  reason: string;
  overrideConditions: string[];
}

/**
 * 双引擎协同器接口
 */
export interface IDualEngineCoordinator {
  // 状态
  learningEngine: LearningEngineState;
  behaviorEngine: BehaviorEngineState;
  currentState: SystemState;
  
  // 核心方法
  evaluate(): CoordinationDecision;
  updateLearningEngine(action: LearningAction): void;
  updateBehaviorEngine(riskLevel: number): void;
  resolveConflict(): ConflictResolution;
  shouldOverride(): boolean;
}

// ============================================================================
// 常量定义
// ============================================================================

/**
 * 风险阈值
 */
const RISK_THRESHOLDS = {
  normal: 30,    // <30: 正常状态
  risk: 70,      // 30-70: 风险状态
  critical: 100  // >70: 危急状态
};

/**
 * 介入条件
 */
const TAKEOVER_CONDITIONS = [
  '退出风险>80%',
  '挫败信号≥5 次',
  '连续中断≥2 次',
  '专注时长<10 分钟'
];

// ============================================================================
// DualEngineCoordinator 主类
// ============================================================================

export class DualEngineCoordinator implements IDualEngineCoordinator {
  // 引擎状态
  learningEngine: LearningEngineState;
  behaviorEngine: BehaviorEngineState;
  currentState: SystemState;
  
  // Learner Model 引用
  private learnerModel: LearnerModel;
  
  constructor(learnerModel: LearnerModel) {
    this.learnerModel = learnerModel;
    
    // 初始化学习引擎状态
    this.learningEngine = {
      status: 'idle',
      currentAction: null,
      knowledgeGapCount: 0,
      learningPathProgress: 0
    };
    
    // 初始化行为引擎状态
    this.behaviorEngine = {
      status: 'monitoring',
      riskLevel: 0,
      interventionCount: 0,
      lastInterventionAt: null
    };
    
    // 初始系统状态
    this.currentState = 'normal';
  }
  
  /**
   * 评估并做出协同决策 - 核心方法
   */
  evaluate(): CoordinationDecision {
    // 1. 更新系统状态
    this.currentState = this.determineSystemState();
    
    // 2. 根据状态决定控制器
    let controller: EngineType;
    let learningAction: LearningAction | null = null;
    let interventionStrategy: InterventionStrategy | null = null;
    let reason: string;
    
    if (this.currentState === 'normal') {
      // 正常状态：学习引擎主导
      controller = 'learning';
      learningAction = this.learnerModel.calculateNextAction();
      reason = '系统状态正常，学习引擎主导';
    } else if (this.currentState === 'risk') {
      // 风险状态：行为引擎介入
      controller = 'behavior';
      interventionStrategy = this.learnerModel.getInterventionStrategy();
      reason = '检测到退出风险，行为引擎介入';
    } else {
      // 危急状态：行为引擎接管，学习引擎暂停
      controller = 'behavior';
      interventionStrategy = this.getEmergencyIntervention();
      reason = '危急状态，行为引擎接管';
    }
    
    const decision: CoordinationDecision = {
      controller,
      state: this.currentState,
      learningAction,
      interventionStrategy,
      reason,
      timestamp: new Date()
    };
    
    return decision;
  }
  
  /**
   * 确定系统状态
   */
  private determineSystemState(): SystemState {
    const riskLevel = this.calculateRiskLevel();
    
    if (riskLevel < RISK_THRESHOLDS.normal) {
      return 'normal';
    } else if (riskLevel < RISK_THRESHOLDS.risk) {
      return 'risk';
    } else {
      return 'critical';
    }
  }
  
  /**
   * 计算风险等级
   */
  private calculateRiskLevel(): number {
    let risk = 0;
    
    // 专注时长风险 (0-30 分)
    const focusRisk = Math.max(0, (25 - this.learnerModel.behaviorState.focusDuration) * 1.2);
    risk += focusRisk;
    
    // 挫败信号风险 (0-30 分)
    const frustrationRisk = Math.min(30, this.learnerModel.behaviorState.frustrationSignals * 6);
    risk += frustrationRisk;
    
    // 中断率风险 (0-25 分)
    const interruptionRisk = Math.min(25, this.learnerModel.behaviorState.interruptionRate * 250);
    risk += interruptionRisk;
    
    // 知识掌握风险 (0-15 分)
    const weakCount = this.learnerModel.knowledgeGraph.weak.length;
    const knowledgeRisk = Math.min(15, weakCount * 3);
    risk += knowledgeRisk;
    
    return Math.min(100, risk);
  }
  
  /**
   * 获取紧急介入策略
   */
  private getEmergencyIntervention(): InterventionStrategy {
    return {
      type: 'goal-visualization',
      reason: '紧急介入：防止用户退出',
      actions: [
        '立即暂停当前学习',
        '显示长期目标可视化',
        '提供压力缓解指导',
        '建议短暂休息',
        '发送鼓励消息'
      ],
      estimatedEffectiveness: 0.90
    };
  }
  
  /**
   * 更新学习引擎状态
   */
  updateLearningEngine(action: LearningAction): void {
    this.learningEngine = {
      status: action.type === 'break' ? 'paused' : 'active',
      currentAction: action,
      knowledgeGapCount: this.learnerModel.knowledgeGraph.weak.length,
      learningPathProgress: this.calculateLearningProgress()
    };
  }
  
  /**
   * 计算学习进度
   */
  private calculateLearningProgress(): number {
    const total = 
      this.learnerModel.knowledgeGraph.mastered.length +
      this.learnerModel.knowledgeGraph.learning.length +
      this.learnerModel.knowledgeGraph.weak.length;
    
    if (total === 0) return 0;
    
    const mastered = this.learnerModel.knowledgeGraph.mastered.length;
    return Math.round((mastered / total) * 100);
  }
  
  /**
   * 更新行为引擎状态
   */
  updateBehaviorEngine(riskLevel: number): void {
    const shouldIntervene = this.learnerModel.shouldIntervene();
    
    this.behaviorEngine = {
      status: shouldIntervene ? 'intervening' : 'monitoring',
      riskLevel,
      interventionCount: shouldIntervene 
        ? this.behaviorEngine.interventionCount + 1 
        : this.behaviorEngine.interventionCount,
      lastInterventionAt: shouldIntervene ? new Date() : this.behaviorEngine.lastInterventionAt
    };
  }
  
  /**
   * 解决引擎冲突
   */
  resolveConflict(): ConflictResolution {
    // 默认：学习引擎优先
    let winner: EngineType = 'learning';
    const overrideConditions: string[] = [];
    let reason = '学习引擎优先，确保学习目标达成';
    
    // 检查是否需要行为引擎接管
    if (this.shouldOverride()) {
      winner = 'behavior';
      reason = '行为风险超过阈值，行为引擎接管';
      overrideConditions.push(...TAKEOVER_CONDITIONS);
    }
    
    return {
      winner,
      reason,
      overrideConditions
    };
  }
  
  /**
   * 判断是否应该覆盖学习引擎
   */
  shouldOverride(): boolean {
    // 退出风险>80%
    if (this.behaviorEngine.riskLevel > 80) {
      return true;
    }
    
    // 挫败信号≥5 次
    if (this.learnerModel.behaviorState.frustrationSignals >= 5) {
      return true;
    }
    
    // 连续中断≥2 次
    if (this.learnerModel.behaviorState.interruptionRate > 0.10) {
      return true;
    }
    
    // 专注时长<10 分钟
    if (this.learnerModel.behaviorState.focusDuration < 10) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 获取协同状态报告
   */
  getStatusReport(): Record<string, any> {
    return {
      systemState: this.currentState,
      learningEngine: {
        status: this.learningEngine.status,
        progress: this.learningEngine.learningPathProgress,
        knowledgeGaps: this.learningEngine.knowledgeGapCount
      },
      behaviorEngine: {
        status: this.behaviorEngine.status,
        riskLevel: this.behaviorEngine.riskLevel,
        interventions: this.behaviorEngine.interventionCount
      },
      coordination: {
        controller: this.evaluate().controller,
        lastEvaluatedAt: new Date().toISOString()
      }
    };
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建双引擎协同器
 */
export function createDualEngineCoordinator(learnerModel: LearnerModel): DualEngineCoordinator {
  return new DualEngineCoordinator(learnerModel);
}

/**
 * 计算风险等级
 */
export function calculateRiskLevel(learnerModel: LearnerModel): number {
  let risk = 0;
  
  // 专注时长风险
  const focusRisk = Math.max(0, (25 - learnerModel.behaviorState.focusDuration) * 1.2);
  risk += focusRisk;
  
  // 挫败信号风险
  const frustrationRisk = Math.min(30, learnerModel.behaviorState.frustrationSignals * 6);
  risk += frustrationRisk;
  
  // 中断率风险
  const interruptionRisk = Math.min(25, learnerModel.behaviorState.interruptionRate * 250);
  risk += interruptionRisk;
  
  // 知识掌握风险
  const weakCount = learnerModel.knowledgeGraph.weak.length;
  const knowledgeRisk = Math.min(15, weakCount * 3);
  risk += knowledgeRisk;
  
  return Math.min(100, risk);
}
