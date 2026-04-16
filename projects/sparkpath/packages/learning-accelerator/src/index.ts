/**
 * SparkPath Learning Accelerator Engine
 * 
 * 学习加速引擎
 * 知识漏洞精准定位 + 最短路径规划 + 方法提炼教学
 */

import {
  KnowledgeNode,
  KnowledgeStatus,
  LearnerModel,
  LearningPath,
  Stage,
} from './types';

// ============================================================================
// 类型定义
// ============================================================================

export type Stage = 'elementary' | 'middle' | 'high';
export type Subject = 'chinese' | 'math' | 'english' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'politics';

export interface KnowledgeGap {
  /** 知识点 ID */
  knowledgeId: string;
  
  /** 知识点名称 */
  name: string;
  
  /** 当前掌握度 */
  currentMastery: number;
  
  /** 目标掌握度 */
  targetMastery: number;
  
  /** 差距 */
  gap: number;
  
  /** 优先级评分 (0-1) */
  priority: number;
  
  /** 前置知识缺口数量 */
  prerequisiteGaps: number;
}

export interface MethodSteps {
  /** 知识点 ID */
  knowledgeId: string;
  
  /** 方法名称 */
  methodName: string;
  
  /** 步骤列表 */
  steps: string[];
  
  /** 生活应用示例 */
  lifeApplication: string;
  
  /** 变式练习 */
  variantPractice: string;
  
  /** 阶段适配包装 */
  stagePackaging: {
    elementary?: string;  // 小学漫画版描述
    middle?: string;      // 初中逻辑版描述
    high?: string;        // 高中策略版描述
  };
}

export interface LearningAction {
  /** 动作类型 */
  type: 'learn' | 'practice' | 'review' | 'assess';
  
  /** 知识点 ID */
  knowledgeId: string;
  
  /** 动作描述 */
  description: string;
  
  /** 预计时长 (分钟) */
  estimatedDuration: number;
  
  /** 预计掌握度提升 */
  expectedMasteryGain: number;
  
  /** 难度等级 (0-1) */
  difficulty: number;
  
  /** 推荐教学资源 */
  resources?: string[];
}

export interface LearningAcceleratorConfig {
  /** 默认目标掌握度 */
  targetMastery: number;
  
  /** 最小路径长度 */
  minPathLength: number;
  
  /** 最大路径长度 */
  maxPathLength: number;
  
  /** 难度增量 */
  difficultyIncrement: number;
  
  /** 休息间隔 (分钟) */
  breakInterval: number;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: LearningAcceleratorConfig = {
  targetMastery: 0.85,  // 85% 掌握度为目标
  minPathLength: 3,
  maxPathLength: 10,
  difficultyIncrement: 0.15,
  breakInterval: 25,  // 每 25 分钟休息
};

// ============================================================================
// Learning Accelerator Engine
// ============================================================================

export class LearningAcceleratorEngine {
  private config: LearningAcceleratorConfig;
  private knowledgeGraph: Map<string, KnowledgeNode> = new Map();

  constructor(config?: Partial<LearningAcceleratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[LearningAccelerator] 初始化完成', this.config);
  }

  // ============================================================================
  // 知识漏洞定位
  // ============================================================================

  /**
   * 识别知识漏洞
   */
  identifyGaps(model: LearnerModel, subject?: Subject): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    
    for (const [knowledgeId, status] of Object.entries(model.knowledgeStatus)) {
      const gap = status.mastery < this.config.targetMastery
        ? this.config.targetMastery - status.mastery
        : 0;
      
      if (gap > 0.1) {  // 差距超过 10% 才视为漏洞
        const knowledge = this.knowledgeGraph.get(knowledgeId);
        
        // 计算前置知识缺口
        const prerequisiteGaps = knowledge?.prerequisites?.reduce((count, prereqId) => {
          const prereqStatus = model.knowledgeStatus[prereqId];
          return count + (prereqStatus && prereqStatus.mastery < 0.7 ? 1 : 0);
        }, 0) ?? 0;
        
        // 计算优先级
        const priority = this.calculatePriority(gap, prerequisiteGaps, status);
        
        gaps.push({
          knowledgeId,
          name: knowledge?.name ?? knowledgeId,
          currentMastery: status.mastery,
          targetMastery: this.config.targetMastery,
          gap,
          priority,
          prerequisiteGaps,
        });
      }
    }
    
    // 按优先级排序
    gaps.sort((a, b) => b.priority - a.priority);
    
    console.log(`[LearningAccelerator] 识别到 ${gaps.length} 个知识漏洞`);
    return gaps;
  }

  /**
   * 计算优先级
   */
  private calculatePriority(
    gap: number,
    prerequisiteGaps: number,
    status: KnowledgeStatus
  ): number {
    // 基础优先级 (差距越大优先级越高)
    let priority = gap * 0.5;
    
    // 前置知识缺口惩罚 (缺口越多优先级越低，因为需要先补前置)
    priority -= prerequisiteGaps * 0.1;
    
    // 近期学习过加分
    const daysSinceLastPractice = (Date.now() - status.lastPracticed.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastPractice < 3) {
      priority += 0.1;  // 3 天内学过，加强记忆
    }
    
    // 正确率低加分
    if (status.accuracy < 0.6) {
      priority += 0.15;
    }
    
    return Math.max(0, Math.min(1, priority));
  }

  // ============================================================================
  // 学习路径规划
  // ============================================================================

  /**
   * 规划最优学习路径
   */
  planOptimalPath(gaps: KnowledgeGap[], model: LearnerModel): LearningPath {
    if (gaps.length === 0) {
      return this.createEmptyPath(model.studentId);
    }
    
    // 选择前 N 个优先级最高的漏洞
    const selectedGaps = gaps.slice(0, this.config.maxPathLength);
    
    // 拓扑排序 (考虑前置关系)
    const sortedGaps = this.topologicalSort(selectedGaps, model);
    
    // 生成知识点序列
    const knowledgeSequence = sortedGaps.map(g => g.knowledgeId);
    
    // 计算预计时长 (每个知识点 15-25 分钟)
    const estimatedDuration = knowledgeSequence.length * 20;
    
    // 计算预计掌握度提升
    const expectedMasteryGain = sortedGaps.reduce((sum, g) => sum + g.gap * 0.8, 0) / sortedGaps.length;
    
    // 生成难度曲线
    const difficultyCurve = this.generateDifficultyCurve(sortedGaps);
    
    // 计算休息点 (每 25 分钟)
    const breakPoints = this.calculateBreakPoints(estimatedDuration);
    
    const path: LearningPath = {
      pathId: `path-${Date.now()}`,
      studentId: model.studentId,
      knowledgeSequence,
      estimatedDuration,
      expectedMasteryGain,
      difficultyCurve,
      breakPoints,
    };
    
    console.log(`[LearningAccelerator] 生成学习路径：${path.pathId} (${knowledgeSequence.length} 个知识点)`);
    return path;
  }

  /**
   * 拓扑排序 (考虑前置关系)
   */
  private topologicalSort(gaps: KnowledgeGap[], model: LearnerModel): KnowledgeGap[] {
    // 简化实现：按优先级和前置缺口排序
    return gaps.sort((a, b) => {
      // 前置缺口少的优先
      if (a.prerequisiteGaps !== b.prerequisiteGaps) {
        return a.prerequisiteGaps - b.prerequisiteGaps;
      }
      // 优先级高的优先
      return b.priority - a.priority;
    });
  }

  /**
   * 生成难度曲线
   */
  private generateDifficultyCurve(gaps: KnowledgeGap[]): number[] {
    return gaps.map((g, i) => {
      // 基础难度 + 递增
      const baseDifficulty = 0.3;
      const progression = (i / gaps.length) * this.config.difficultyIncrement;
      return Math.min(1, baseDifficulty + progression + g.gap * 0.3);
    });
  }

  /**
   * 计算休息点
   */
  private calculateBreakPoints(totalDuration: number): number[] {
    const breakPoints: number[] = [];
    for (let i = this.config.breakInterval; i < totalDuration; i += this.config.breakInterval) {
      breakPoints.push(i);
    }
    return breakPoints;
  }

  /**
   * 创建空路径
   */
  private createEmptyPath(studentId: string): LearningPath {
    return {
      pathId: `path-${Date.now()}`,
      studentId,
      knowledgeSequence: [],
      estimatedDuration: 0,
      expectedMasteryGain: 0,
      difficultyCurve: [],
      breakPoints: [],
    };
  }

  // ============================================================================
  // 方法提炼教学
  // ============================================================================

  /**
   * 提取方法步骤
   */
  extractMethod(knowledgeId: string, stage: Stage): MethodSteps {
    const knowledge = this.knowledgeGraph.get(knowledgeId);
    
    if (!knowledge) {
      return this.createDefaultMethod(knowledgeId, stage);
    }
    
    // 阶段适配包装
    const stagePackaging = {
      elementary: `漫画版：${knowledge.name} 的冒险故事`,
      middle: `逻辑版：${knowledge.name} 的推导过程`,
      high: `策略版：${knowledge.name} 的解题技巧`,
    };
    
    return {
      knowledgeId,
      methodName: knowledge.name,
      steps: knowledge.methodSteps,
      lifeApplication: this.generateLifeApplication(knowledge, stage),
      variantPractice: this.generateVariantPractice(knowledge, stage),
      stagePackaging,
    };
  }

  /**
   * 生成生活应用示例
   */
  private generateLifeApplication(knowledge: KnowledgeNode, stage: Stage): string {
    const applications: Record<Stage, string> = {
      elementary: '生活中常见的例子，如购物计算、时间管理等',
      middle: '学科交叉应用，如物理中的函数关系、化学中的比例计算',
      high: '高考真题应用，如压轴题解题思路、综合题分析',
    };
    
    return applications[stage];
  }

  /**
   * 生成变式练习
   */
  private generateVariantPractice(knowledge: KnowledgeNode, stage: Stage): string {
    const practices: Record<Stage, string> = {
      elementary: '基础变式：改变数字，保持方法不变',
      middle: '进阶变式：改变条件，需要灵活运用',
      high: '综合变式：多知识点融合，考察综合能力',
    };
    
    return practices[stage];
  }

  /**
   * 创建默认方法
   */
  private createDefaultMethod(knowledgeId: string, stage: Stage): MethodSteps {
    return {
      knowledgeId,
      methodName: knowledgeId,
      steps: ['理解概念', '学习例题', '练习巩固', '总结反思'],
      lifeApplication: '实际应用场景',
      variantPractice: '变式练习题',
      stagePackaging: {
        elementary: '漫画版学习',
        middle: '逻辑版学习',
        high: '策略版学习',
      },
    };
  }

  // ============================================================================
  // 动态难度自适应
  // ============================================================================

  /**
   * 调整难度
   */
  adjustDifficulty(currentLevel: number, performance: number): number {
    // performance: 0-1, 0.7 以上为良好
    if (performance >= 0.8) {
      // 表现优秀，提升难度
      return Math.min(1, currentLevel + 0.1);
    } else if (performance >= 0.6) {
      // 表现良好，保持难度
      return currentLevel;
    } else {
      // 表现不佳，降低难度
      return Math.max(0, currentLevel - 0.15);
    }
  }

  // ============================================================================
  // 下一最佳学习动作
  // ============================================================================

  /**
   * 推荐下一最佳学习动作
   */
  nextBestAction(model: LearnerModel): LearningAction {
    const gaps = this.identifyGaps(model);
    
    if (gaps.length === 0) {
      return {
        type: 'review',
        knowledgeId: 'review-all',
        description: '所有知识点已掌握，建议复习巩固',
        estimatedDuration: 15,
        expectedMasteryGain: 0.05,
        difficulty: 0.3,
      };
    }
    
    const topGap = gaps[0];
    
    // 根据掌握度决定动作类型
    let type: LearningAction['type'] = 'learn';
    if (topGap.currentMastery > 0.5) {
      type = 'practice';
    } else if (topGap.currentMastery > 0.3) {
      type = 'review';
    }
    
    return {
      type,
      knowledgeId: topGap.knowledgeId,
      description: this.generateActionDescription(type, topGap),
      estimatedDuration: 20,
      expectedMasteryGain: topGap.gap * 0.6,
      difficulty: topGap.gap,
    };
  }

  /**
   * 生成动作描述
   */
  private generateActionDescription(type: LearningAction['type'], gap: KnowledgeGap): string {
    const descriptions: Record<LearningAction['type'], string> = {
      learn: `学习新知识点：${gap.name}`,
      practice: `练习强化：${gap.name} (当前掌握${(gap.currentMastery * 100).toFixed(0)}%)`,
      review: `复习巩固：${gap.name}`,
      assess: `评估测试：${gap.name}`,
    };
    
    return descriptions[type];
  }

  // ============================================================================
  // 知识图谱管理
  // ============================================================================

  /**
   * 加载知识图谱
   */
  loadKnowledgeGraph(nodes: KnowledgeNode[]): void {
    for (const node of nodes) {
      this.knowledgeGraph.set(node.id, node);
    }
    console.log(`[LearningAccelerator] 加载 ${nodes.length} 个知识点`);
  }

  /**
   * 获取知识点
   */
  getKnowledge(knowledgeId: string): KnowledgeNode | undefined {
    return this.knowledgeGraph.get(knowledgeId);
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createLearningAcceleratorEngine(
  config?: Partial<LearningAcceleratorConfig>
): LearningAcceleratorEngine {
  return new LearningAcceleratorEngine(config);
}

export default LearningAcceleratorEngine;
