/**
 * SparkPath Learner Model - Type Definitions
 * 
 * Learner Model 引擎类型定义
 * 支持 9-18 岁三阶段学生建模
 */

// ============================================================================
// 基础类型
// ============================================================================

export type Stage = 'elementary' | 'middle' | 'high';
export type Subject = 'chinese' | 'math' | 'english' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'politics';

// ============================================================================
// 知识图谱类型
// ============================================================================

/**
 * 知识点节点
 */
export interface KnowledgeNode {
  /** 知识点唯一 ID */
  id: string;
  
  /** 知识点名称 */
  name: string;
  
  /** 所属科目 */
  subject: Subject;
  
  /** 适用阶段 */
  stages: Stage[];
  
  /** 核心定义 */
  coreDefinition: string;
  
  /** 方法步骤 */
  methodSteps: string[];
  
  /** 典型例题 */
  typicalExamples: Example[];
  
  /** 常见错误 */
  commonMistakes: Mistake[];
  
  /** 跨学科关联 */
  crossSubjectLinks: string[];
  
  /** 前置知识点 ID */
  prerequisites: string[];
  
  /** 后续知识点 ID */
  dependents: string[];
  
  /** 官方来源 */
  officialSource: string;
  
  /** 最后更新时间 */
  lastUpdated: Date;
}

/**
 * 例题
 */
export interface Example {
  question: string;
  solution: string;
  difficulty: number;  // 0-1
  explanation?: string;
}

/**
 * 常见错误
 */
export interface Mistake {
  description: string;
  cause: string;
  correction: string;
}

/**
 * 知识点掌握状态
 */
export interface KnowledgeStatus {
  /** 知识点 ID */
  knowledgeId: string;
  
  /** 掌握度 (0-1) */
  mastery: number;
  
  /** 最后练习时间 */
  lastPracticed: Date;
  
  /** 练习次数 */
  practiceCount: number;
  
  /** 正确率 */
  accuracy: number;
  
  /** 平均反应时间 (ms) */
  avgResponseTime: number;
  
  /** 错误类型统计 */
  mistakeStats: Record<string, number>;
}

// ============================================================================
// 行为状态类型
// ============================================================================

/**
 * 学习会话
 */
export interface LearningSession {
  /** 会话 ID */
  sessionId: string;
  
  /** 学生 ID */
  studentId: string;
  
  /** 开始时间 */
  startTime: Date;
  
  /** 结束时间 */
  endTime?: Date;
  
  /** 学习科目 */
  subject: Subject;
  
  /** 学习的知识点 ID 列表 */
  knowledgeIds: string[];
  
  /** 专注时长 (秒) */
  focusDuration: number;
  
  /** 主动提问次数 */
  activeQuestions: number;
  
  /** 挫败信号次数 */
  frustrationSignals: number;
  
  /** 参与度评分 (0-1) */
  engagementScore: number;
  
  /** 退出风险等级 */
  exitRiskLevel: ExitRiskLevel;
  
  /** 介入记录 */
  interventions: Intervention[];
}

/**
 * 退出风险等级
 */
export type ExitRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 介入记录
 */
export interface Intervention {
  /** 介入时间 */
  timestamp: Date;
  
  /** 介入类型 */
  type: 'encouragement' | 'hint' | 'break' | 'gamification' | 'goal_reminder';
  
  /** 介入内容 */
  content: string;
  
  /** 介入效果 (0-1) */
  effectiveness?: number;
}

/**
 * 行为统计
 */
export interface BehaviorStats {
  /** 平均单次学习时长 (秒) */
  avgSessionDuration: number;
  
  /** 总学习时长 (秒) */
  totalLearningTime: number;
  
  /** 学习天数 */
  learningDays: number;
  
  /** 连续学习天数 */
  streakDays: number;
  
  /** 平均专注度 (0-1) */
  avgFocusScore: number;
  
  /** 平均参与度 (0-1) */
  avgEngagementScore: number;
  
  /** 总提问次数 */
  totalQuestions: number;
  
  /** 总挫败信号次数 */
  totalFrustrationSignals: number;
  
  /** 退出率 (0-1) */
  exitRate: number;
}

// ============================================================================
// Learner Model 类型
// ============================================================================

/**
 * 学生模型
 */
export interface LearnerModel {
  /** 学生 ID */
  studentId: string;
  
  /** 姓名 */
  name: string;
  
  /** 年龄 */
  age: number;
  
  /** 当前阶段 */
  stage: Stage;
  
  /** 年级 */
  grade: number;
  
  /** 知识状态图谱 */
  knowledgeStatus: Record<string, KnowledgeStatus>;
  
  /** 当前会话 */
  currentSession?: LearningSession;
  
  /** 历史会话 ID 列表 */
  sessionHistory: string[];
  
  /** 行为统计 */
  behaviorStats: BehaviorStats;
  
  /** 阶段权重配置 */
  stageWeights: StageWeights;
  
  /** 创建时间 */
  createdAt: Date;
  
  /** 最后更新时间 */
  updatedAt: Date;
}

/**
 * 阶段权重配置
 */
export interface StageWeights {
  /** 趣味性权重 (小学 60%) */
  fun: number;
  
  /** 掌握度权重 (小学 40%) */
  mastery: number;
  
  /** 逻辑性权重 (初中 50%) */
  logic: number;
  
  /** 自主性权重 (初中 50%) */
  autonomy: number;
  
  /** 效率权重 (高中 70%) */
  efficiency: number;
  
  /** 压力管理权重 (高中 30%) */
  stressMgmt: number;
}

// ============================================================================
// 跨阶段映射类型
// ============================================================================

/**
 * 知识点跨阶段映射
 */
export interface StageMapping {
  /** 知识点 ID */
  knowledgeId: string;
  
  /** 小学版本 ID */
  elementaryVersion?: string;
  
  /** 初中版本 ID */
  middleVersion?: string;
  
  /** 高中版本 ID */
  highVersion?: string;
  
  /** 难度递进关系 */
  difficultyProgression: {
    elementary: number;
    middle: number;
    high: number;
  };
}

// ============================================================================
// API 类型
// ============================================================================

/**
 * Learner Model 引擎配置
 */
export interface LearnerModelConfig {
  /** Neo4j 连接 URL */
  neo4jUrl: string;
  
  /** Neo4j 用户名 */
  neo4jUser: string;
  
  /** Neo4j 密码 */
  neo4jPassword: string;
  
  /** 本地存储路径 */
  localStoragePath?: string;
  
  /** 是否启用缓存 */
  enableCache: boolean;
  
  /** 缓存 TTL (秒) */
  cacheTTL: number;
}

/**
 * 知识图谱查询结果
 */
export interface KnowledgeGraphQueryResult {
  /** 知识点列表 */
  nodes: KnowledgeNode[];
  
  /** 关系列表 */
  relationships: Array<{
    source: string;
    target: string;
    type: string;
  }>;
}

/**
 * 学习路径规划结果
 */
export interface LearningPath {
  /** 路径 ID */
  pathId: string;
  
  /** 学生 ID */
  studentId: string;
  
  /** 知识点序列 */
  knowledgeSequence: string[];
  
  /** 预计学习时长 (分钟) */
  estimatedDuration: number;
  
  /** 预计掌握度提升 */
  expectedMasteryGain: number;
  
  /** 难度曲线 */
  difficultyCurve: number[];
  
  /** 休息点建议 */
  breakPoints: number[];
}

export default {
  type Stage,
  type Subject,
  type KnowledgeNode,
  type Example,
  type Mistake,
  type KnowledgeStatus,
  type LearningSession,
  type ExitRiskLevel,
  type Intervention,
  type BehaviorStats,
  type LearnerModel,
  type StageWeights,
  type StageMapping,
  type LearnerModelConfig,
  type KnowledgeGraphQueryResult,
  type LearningPath,
};
