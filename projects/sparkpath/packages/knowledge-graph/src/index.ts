/**
 * SparkPath Knowledge Graph Integration
 * 
 * Neo4j 知识图谱集成
 * 图谱查询 · 数据同步 · 关系遍历
 */

import neo4j, { Driver, Session, Result } from 'neo4j-driver';

// ============================================================================
// 类型定义
// ============================================================================

export type Stage = 'elementary' | 'middle' | 'high';
export type Subject = 'chinese' | 'math' | 'english' | 'physics' | 'chemistry' | 'biology' | 'history' | 'geography' | 'politics';

export interface KnowledgeNode {
  id: string;
  name: string;
  subject: Subject;
  stages: Stage[];
  coreDefinition: string;
  methodSteps: string[];
  typicalExamples: Example[];
  commonMistakes: Mistake[];
  crossSubjectLinks: string[];
  prerequisites: string[];
  dependents: string[];
  officialSource: string;
  lastUpdated: Date;
}

export interface Example {
  question: string;
  solution: string;
  difficulty: number;
  explanation?: string;
}

export interface Mistake {
  description: string;
  cause: string;
  correction: string;
}

export interface KnowledgeGraphConfig {
  /** Neo4j 连接 URL */
  uri: string;
  
  /** 用户名 */
  username: string;
  
  /** 密码 */
  password: string;
  
  /** 数据库名称 */
  database?: string;
  
  /** 连接池大小 */
  maxConnectionPoolSize: number;
  
  /** 连接超时 (ms) */
  connectionTimeout: number;
}

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: KnowledgeGraphConfig = {
  uri: 'bolt://localhost:7687',
  username: 'neo4j',
  password: 'SparkPath2026!',
  database: 'neo4j',
  maxConnectionPoolSize: 50,
  connectionTimeout: 30000,
};

// ============================================================================
// Knowledge Graph Client
// ============================================================================

export class KnowledgeGraphClient {
  private config: KnowledgeGraphConfig;
  private driver: Driver | null = null;

  constructor(config?: Partial<KnowledgeGraphConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[KnowledgeGraph] 初始化完成', this.config);
  }

  // ============================================================================
  // 连接管理
  // ============================================================================

  /**
   * 连接到 Neo4j
   */
  async connect(): Promise<void> {
    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
        {
          maxConnectionPoolSize: this.config.maxConnectionPoolSize,
          connectionTimeout: this.config.connectionTimeout,
        }
      );

      // 验证连接
      await this.driver.verifyConnectivity();
      console.log('[KnowledgeGraph] 连接成功');
    } catch (error) {
      console.error('[KnowledgeGraph] 连接失败:', error);
      throw error;
    }
  }

  /**
   * 关闭连接
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('[KnowledgeGraph] 连接已关闭');
    }
  }

  /**
   * 获取 Session
   */
  private getSession(): Session {
    if (!this.driver) {
      throw new Error('[KnowledgeGraph] 未连接');
    }
    return this.driver.session({ database: this.config.database });
  }

  // ============================================================================
  // 知识点查询
  // ============================================================================

  /**
   * 查询知识点
   */
  async getKnowledgeNode(knowledgeId: string): Promise<KnowledgeNode | null> {
    const session = this.getSession();
    
    try {
      const result = await session.run(
        `MATCH (n:KnowledgeNode {id: $id})
         RETURN n`,
        { id: knowledgeId }
      );

      if (result.records.length === 0) {
        return null;
      }

      const node = result.records[0].get('n').properties;
      return this.mapToKnowledgeNode(node);
    } finally {
      await session.close();
    }
  }

  /**
   * 查询知识点列表
   */
  async getKnowledgeNodes(
    filters?: {
      subject?: Subject;
      stage?: Stage;
      search?: string;
    }
  ): Promise<KnowledgeNode[]> {
    const session = this.getSession();
    
    try {
      let query = `MATCH (n:KnowledgeNode)`;
      const params: Record<string, any> = {};
      const conditions: string[] = [];

      if (filters?.subject) {
        conditions.push('n.subject = $subject');
        params.subject = filters.subject;
      }

      if (filters?.stage) {
        conditions.push('$stage IN n.stages');
        params.stage = filters.stage;
      }

      if (filters?.search) {
        conditions.push('n.name CONTAINS $search');
        params.search = filters.search;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` RETURN n ORDER BY n.name`;

      const result = await session.run(query, params);

      return result.records.map(record => 
        this.mapToKnowledgeNode(record.get('n').properties)
      );
    } finally {
      await session.close();
    }
  }

  /**
   * 查询前置知识点
   */
  async getPrerequisites(knowledgeId: string): Promise<KnowledgeNode[]> {
    const session = this.getSession();
    
    try {
      const result = await session.run(
        `MATCH (n:KnowledgeNode {id: $id})<-[:PREREQUISITE_OF*]-(prereq)
         RETURN prereq`,
        { id: knowledgeId }
      );

      return result.records.map(record => 
        this.mapToKnowledgeNode(record.get('prereq').properties)
      );
    } finally {
      await session.close();
    }
  }

  /**
   * 查询后续知识点
   */
  async getDependents(knowledgeId: string): Promise<KnowledgeNode[]> {
    const session = this.getSession();
    
    try {
      const result = await session.run(
        `MATCH (n:KnowledgeNode {id: $id})-[:PREREQUISITE_OF*]->(dependent)
         RETURN dependent`,
        { id: knowledgeId }
      );

      return result.records.map(record => 
        this.mapToKnowledgeNode(record.get('dependent').properties)
      );
    } finally {
      await session.close();
    }
  }

  /**
   * 查询学习路径
   */
  async getLearningPath(fromId: string, toId: string): Promise<KnowledgeNode[]> {
    const session = this.getSession();
    
    try {
      const result = await session.run(
        `MATCH path = shortestPath(
           (from:KnowledgeNode {id: $fromId})-[:PREREQUISITE_OF*]->(to:KnowledgeNode {id: $toId})
         )
         RETURN nodes(path) as nodes`,
        { fromId, toId }
      );

      if (result.records.length === 0) {
        return [];
      }

      const nodes = result.records[0].get('nodes');
      return nodes.map((node: any) => this.mapToKnowledgeNode(node.properties));
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // 跨学科关联
  // ============================================================================

  /**
   * 查询跨学科关联
   */
  async getCrossSubjectLinks(knowledgeId: string): Promise<{
    subject: Subject;
    nodes: KnowledgeNode[];
  }[]> {
    const session = this.getSession();
    
    try {
      const result = await session.run(
        `MATCH (n:KnowledgeNode {id: $id})-[r:CROSS_SUBJECT_LINK]->(s:Subject)
         OPTIONAL MATCH (linked:KnowledgeNode)-[:BELONGS_TO]->(s)
         RETURN s.name as subject, collect(linked) as nodes`,
        { id: knowledgeId }
      );

      return result.records.map(record => ({
        subject: record.get('subject'),
        nodes: record.get('nodes').map((node: any) => 
          this.mapToKnowledgeNode(node.properties)
        ),
      }));
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // 图谱统计
  // ============================================================================

  /**
   * 获取图谱统计信息
   */
  async getGraphStats(): Promise<{
    totalNodes: number;
    totalRelationships: number;
    subjectDistribution: Record<Subject, number>;
    stageDistribution: Record<Stage, number>;
  }> {
    const session = this.getSession();
    
    try {
      // 总节点数
      const nodeResult = await session.run(
        `MATCH (n:KnowledgeNode) RETURN count(n) as count`
      );
      const totalNodes = nodeResult.records[0].get('count').toNumber();

      // 总关系数
      const relResult = await session.run(
        `MATCH ()-[r]->() RETURN count(r) as count`
      );
      const totalRelationships = relResult.records[0].get('count').toNumber();

      // 科目分布
      const subjectResult = await session.run(
        `MATCH (n:KnowledgeNode) RETURN n.subject as subject, count(n) as count`
      );
      const subjectDistribution: any = {};
      subjectResult.records.forEach(record => {
        subjectDistribution[record.get('subject')] = record.get('count').toNumber();
      });

      // 阶段分布
      const stageResult = await session.run(
        `MATCH (n:KnowledgeNode) UNWIND n.stages as stage RETURN stage, count(n) as count`
      );
      const stageDistribution: any = {};
      stageResult.records.forEach(record => {
        stageDistribution[record.get('stage')] = record.get('count').toNumber();
      });

      return {
        totalNodes,
        totalRelationships,
        subjectDistribution,
        stageDistribution,
      };
    } finally {
      await session.close();
    }
  }

  // ============================================================================
  // 数据导入
  // ============================================================================

  /**
   * 导入知识点
   */
  async importKnowledgeNode(node: KnowledgeNode): Promise<void> {
    const session = this.getSession();
    
    try {
      await session.run(
        `MERGE (n:KnowledgeNode {id: $id})
         SET n.name = $name,
             n.subject = $subject,
             n.stages = $stages,
             n.coreDefinition = $coreDefinition,
             n.methodSteps = $methodSteps,
             n.officialSource = $officialSource,
             n.lastUpdated = datetime()`,
        {
          id: node.id,
          name: node.name,
          subject: node.subject,
          stages: node.stages,
          coreDefinition: node.coreDefinition,
          methodSteps: node.methodSteps,
          officialSource: node.officialSource,
        }
      );

      console.log(`[KnowledgeGraph] 导入知识点：${node.id}`);
    } finally {
      await session.close();
    }
  }

  /**
   * 批量导入知识点
   */
  async importKnowledgeNodes(nodes: KnowledgeNode[]): Promise<void> {
    for (const node of nodes) {
      await this.importKnowledgeNode(node);
    }
    console.log(`[KnowledgeGraph] 批量导入 ${nodes.length} 个知识点`);
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  private mapToKnowledgeNode(data: any): KnowledgeNode {
    return {
      id: data.id,
      name: data.name,
      subject: data.subject,
      stages: data.stages || [],
      coreDefinition: data.coreDefinition || '',
      methodSteps: data.methodSteps || [],
      typicalExamples: data.typicalExamples || [],
      commonMistakes: data.commonMistakes || [],
      crossSubjectLinks: data.crossSubjectLinks || [],
      prerequisites: data.prerequisites || [],
      dependents: data.dependents || [],
      officialSource: data.officialSource || '',
      lastUpdated: data.lastUpdated ? new Date(data.lastUpdated) : new Date(),
    };
  }
}

// ============================================================================
// 工厂函数
// ============================================================================

export function createKnowledgeGraphClient(
  config?: Partial<KnowledgeGraphConfig>
): KnowledgeGraphClient {
  return new KnowledgeGraphClient(config);
}

export default KnowledgeGraphClient;
