/**
 * Knowledge Graph Schema - 国家课程知识图谱 Schema 定义
 * 
 * SparkPath 教学内容架构基础层：结构化知识图谱 (JSON + Neo4j 格式)
 * 
 * @module sparkpath/core/knowledge-graph-schema
 * @version 2.0.0 (商用版)
 */

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 科目类型
 */
export type Subject = 
  | 'math' | 'chinese' | 'english' 
  | 'physics' | 'chemistry' | 'biology'
  | 'history' | 'geography' | 'politics';

/**
 * 学段类型
 */
export type Stage = 'elementary' | 'middle' | 'high';

/**
 * 知识点难度等级
 */
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

/**
 * 知识点类型
 */
export type KnowledgeType = 'concept' | 'method' | 'skill' | 'application';

/**
 * 知识节点 (核心 Schema)
 */
export interface KnowledgeNode {
  // 基本信息
  id: string;                    // 知识点唯一 ID (格式：SUBJECT-STAGE-GRADE-NUMBER)
  subject: Subject;              // 科目
  stage: Stage;                  // 学段
  grade: number;                 // 年级 (1-12)
  name: string;                  // 知识点名称
  type: KnowledgeType;           // 知识点类型
  
  // 内容详情
  definition: string;            // 核心定义
  methodSteps: string[];         // 方法步骤
  examples: Example[];           // 典型例题
  commonMistakes: string[];      // 易错点
  realWorldApplications: string[]; // 生活应用场景
  
  // 关联关系
  prerequisites: string[];       // 前置知识点 ID 列表
  leadsTo: string[];             // 后续知识点 ID 列表
  crossSubjectLinks: CrossSubjectLink[]; // 跨学科关联
  
  // 阶段适配
  stageAdaptations: {
    elementary?: StageAdaptation;  // 小学版 (漫画/类比)
    middle?: StageAdaptation;      // 初中版 (逻辑建构)
    high?: StageAdaptation;        // 高中版 (高考思维)
  };
  
  // 元数据
  version: string;               // 版本号
  lastUpdated: Date;             // 最后更新时间
  source: KnowledgeSource;       // 来源
  accuracy: number;              // 准确率 (0-1)
  reviewStatus: 'pending' | 'approved' | 'rejected'; // 审核状态
  reviewer?: string;             // 审核人
  
  // 使用统计
  usageStats: {
    viewCount: number;           // 查看次数
    practiceCount: number;       // 练习次数
    averageScore: number;        // 平均得分
    difficulty: DifficultyLevel  // 实际难度
  };
}

/**
 * 例题
 */
export interface Example {
  id: string;
  question: string;              // 题目
  solution: string[];            // 解答步骤
  answer: string;                // 答案
  explanation: string;           // 解析
  difficulty: DifficultyLevel;
  tags: string[];                // 标签
}

/**
 * 跨学科关联
 */
export interface CrossSubjectLink {
  subject: Subject;
  nodeId: string;
  relationship: 'applies_to' | 'extends' | 'requires' | 'similar_to';
  description: string;
}

/**
 * 阶段适配
 */
export interface StageAdaptation {
  presentationStyle: 'comic' | 'logical' | 'strategic';  // 呈现风格
  explanationTone: 'playful' | 'neutral' | 'professional'; // 讲解语气
  exampleContext: 'daily_life' | 'academic' | 'exam_oriented'; // 例题场景
  visualAids: string[];          // 视觉辅助 (漫画/图表/动画)
  interactiveElements: string[]; // 互动元素
}

/**
 * 知识来源
 */
export type KnowledgeSource = 
  | '教育部课标' 
  | '人教版' | '苏教版' | '北师大版' | '沪教版'
  | '高考大纲' | '中考大纲'
  | 'AI 生成' | '教师贡献';

// ============================================================================
// Neo4j 图数据库 Schema
// ============================================================================

/**
 * Neo4j 节点标签
 */
export const NODE_LABELS = {
  KNOWLEDGE: 'Knowledge',
  SUBJECT: 'Subject',
  STAGE: 'Stage',
  TEACHER: 'Teacher',
  STUDENT: 'Student'
} as const;

/**
 * Neo4j 关系类型
 */
export const RELATIONSHIP_TYPES = {
  REQUIRES: 'REQUIRES',           // 前置关系
  LEADS_TO: 'LEADS_TO',           // 后续关系
  BELONGS_TO: 'BELONGS_TO',       // 归属关系
  SIMILAR_TO: 'SIMILAR_TO',       // 相似关系
  APPLIES_TO: 'APPLIES_TO',       // 应用关系
  TAUGHT_BY: 'TAUGHT_BY',         // 教学关系
  LEARNED_BY: 'LEARNED_BY'        // 学习关系
} as const;

/**
 * Neo4j 索引定义
 */
export const INDEXES = [
  'CREATE INDEX knowledge_id IF NOT EXISTS FOR (k:Knowledge) ON (k.id)',
  'CREATE INDEX knowledge_subject IF NOT EXISTS FOR (k:Knowledge) ON (k.subject)',
  'CREATE INDEX knowledge_stage IF NOT EXISTS FOR (k:Knowledge) ON (k.stage)',
  'CREATE INDEX knowledge_grade IF NOT EXISTS FOR (k:Knowledge) ON (k.grade)',
  'CREATE INDEX knowledge_name IF NOT EXISTS FOR (k:Knowledge) ON (k.name)'
];

/**
 * Neo4j 约束定义
 */
export const CONSTRAINTS = [
  'CREATE CONSTRAINT knowledge_id_unique IF NOT EXISTS FOR (k:Knowledge) REQUIRE k.id IS UNIQUE',
  'CREATE CONSTRAINT knowledge_not_null IF NOT EXISTS FOR (k:Knowledge) REQUIRE (k.id, k.subject, k.stage, k.grade) IS NOT NULL'
];

// ============================================================================
// 验证流程类型
// ============================================================================

/**
 * 验证流程状态
 */
export type VerificationStatus = 
  | 'pending'      // 待验证
  | 'verifying'    // 验证中
  | 'approved'     // 已通过
  | 'rejected'     // 已拒绝
  | 'needs_revision'; // 需修改

/**
 * 验证结果
 */
export interface VerificationResult {
  nodeId: string;
  status: VerificationStatus;
  accuracy: number;              // 准确率 (0-1)
  verifiedAt: Date;
  verifiedBy: string;            // 验证人/API
  issues: VerificationIssue[];   // 问题列表
  suggestions: string[];         // 修改建议
}

/**
 * 验证问题
 */
export interface VerificationIssue {
  type: 'accuracy' | 'completeness' | 'consistency' | 'currency';
  severity: 'critical' | 'major' | 'minor';
  description: string;
  location?: string;             // 问题位置 (字段名)
}

/**
 * 验证流程
 */
export interface VerificationFlow {
  step1: 'AI 生成内容';
  step2: '知识图谱检索验证';
  step3: '官方 API 交叉验证';
  step4: '准确率计算';
  step5: '准确率<99% → 回退到知识图谱';
  step6: '准确率≥99% → 发布到内容池';
}

// ============================================================================
// 内容更新机制
// ============================================================================

/**
 * 更新频率配置
 */
export const UPDATE_SCHEDULE = {
  daily: {
    task: '官方变动同步',
    time: '02:00',
    source: ['教育部 API', '教材出版社 webhook']
  },
  weekly: {
    task: '批量验证 + 优化内容池',
    day: 'Sunday',
    time: '03:00'
  },
  semesterly: {
    task: '跨阶段映射重构 + Learner Model 迁移',
    months: [2, 8]  // 2 月和 8 月
  }
};

/**
 * 更新日志
 */
export interface UpdateLog {
  nodeId: string;
  updateType: 'content' | 'accuracy' | 'mapping' | 'metadata';
  oldVersion: string;
  newVersion: string;
  changes: string[];
  updatedAt: Date;
  updatedBy: string;
  reason: string;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 生成知识点 ID
 */
export function generateKnowledgeId(
  subject: Subject,
  stage: Stage,
  grade: number,
  number: number
): string {
  const subjectCode = subject.toUpperCase().slice(0, 3);
  const stageCode = stage.slice(0, 1);
  return `${subjectCode}-${stageCode}${grade}-${number.toString().padStart(4, '0')}`;
}

/**
 * 解析知识点 ID
 */
export function parseKnowledgeId(id: string): {
  subject: Subject;
  stage: Stage;
  grade: number;
  number: number;
} {
  const parts = id.split('-');
  const subjectCode = parts[0];
  const stageGrade = parts[1];
  
  const subjectMap: Record<string, Subject> = {
    'MAT': 'math',
    'CHI': 'chinese',
    'ENG': 'english',
    'PHY': 'physics',
    'CHE': 'chemistry',
    'BIO': 'biology',
    'HIS': 'history',
    'GEO': 'geography',
    'POL': 'politics'
  };
  
  const stageMap: Record<string, Stage> = {
    'e': 'elementary',
    'm': 'middle',
    'h': 'high'
  };
  
  return {
    subject: subjectMap[subjectCode],
    stage: stageMap[stageGrade[0]],
    grade: parseInt(stageGrade[1]),
    number: parseInt(parts[2])
  };
}

/**
 * 验证知识节点完整性
 */
export function validateKnowledgeNode(node: KnowledgeNode): boolean {
  const requiredFields = [
    'id', 'subject', 'stage', 'grade', 'name', 'type',
    'definition', 'methodSteps', 'examples'
  ];
  
  for (const field of requiredFields) {
    if (!node[field as keyof KnowledgeNode]) {
      return false;
    }
  }
  
  // 验证 ID 格式
  const idPattern = /^[A-Z]{3}-[emh][1-9]-\d{4}$/;
  if (!idPattern.test(node.id)) {
    return false;
  }
  
  // 验证准确率
  if (node.accuracy < 0 || node.accuracy > 1) {
    return false;
  }
  
  return true;
}

/**
 * 计算知识节点准确率
 */
export function calculateAccuracy(
  verifiedExamples: number,
  totalExamples: number,
  officialApiMatch: boolean
): number {
  const exampleAccuracy = totalExamples > 0 
    ? verifiedExamples / totalExamples 
    : 0;
  
  const officialWeight = officialApiMatch ? 0.5 : 0;
  const exampleWeight = 0.5;
  
  return exampleAccuracy * exampleWeight + officialWeight;
}

// ============================================================================
// 导出
// ============================================================================

export const KnowledgeGraphSchema = {
  NODE_LABELS,
  RELATIONSHIP_TYPES,
  INDEXES,
  CONSTRAINTS,
  UPDATE_SCHEDULE
};
