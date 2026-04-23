/**
 * SparkPath 知识图谱数据导入框架
 * Week 2: P2-T1 (数学数据) + P2-T2 (语文数据)
 * 
 * 数据来源: 人教版小学教材
 * 数据结构: Neo4j 图数据库
 */

import { Neo4jDriver } from '../database/neo4j';
import { EncryptionService } from '../security/encryption-service';

export interface KnowledgeNode {
  id: string;
  type: string;
  grade_level: string;
  subject: string;
  title: string;
  description: string;
  difficulty: number;
  prerequisites: string[];
  next_topics: string[];
  tags: string[];
  metadata: Record<string, any>;
}

export interface KnowledgeRelationship {
  source_id: string;
  target_id: string;
  relationship_type: string;
  strength: number;
  metadata: Record<string, any>;
}

export class KnowledgeGraphImporter {
  private neo4j: Neo4jDriver;
  private encryptionService: EncryptionService;

  constructor(neo4j: Neo4jDriver, encryptionService: EncryptionService) {
    this.neo4j = neo4j;
    this.encryptionService = encryptionService;
  }

  /**
   * 导入知识点
   * @param nodes 知识点数组
   * @returns 导入成功数量
   */
  async importKnowledgeNodes(nodes: KnowledgeNode[]): Promise<number> {
    let importCount = 0;

    try {
      for (const node of nodes) {
        // 加密敏感数据
        const encryptedTitle = await this.encryptionService.encrypt(node.title);
        const encryptedDescription = await this.encryptionService.encrypt(node.description);

        const query = `
          MERGE (n:KnowledgeNode {id: $id})
          SET n.type = $type,
              n.grade_level = $grade_level,
              n.subject = $subject,
              n.title = $title,
              n.description = $description,
              n.difficulty = $difficulty,
              n.prerequisites = $prerequisites,
              n.next_topics = $next_topics,
              n.tags = $tags,
              n.metadata = $metadata,
              n.created_at = datetime(),
              n.updated_at = datetime()
          RETURN n
        `;

        await this.neo4j.execute(query, {
          id: node.id,
          type: node.type,
          grade_level: node.grade_level,
          subject: node.subject,
          title: encryptedTitle,
          description: encryptedDescription,
          difficulty: node.difficulty,
          prerequisites: node.prerequisites,
          next_topics: node.next_topics,
          tags: node.tags,
          metadata: JSON.stringify(node.metadata),
        });

        importCount++;
      }

      console.log(`✅ 成功导入 ${importCount} 个知识点`);
      return importCount;
    } catch (error) {
      console.error('❌ 导入知识点失败:', error);
      throw error;
    }
  }

  /**
   * 导入关系
   * @param relationships 关系数组
   * @returns 导入成功数量
   */
  async importKnowledgeRelationships(
    relationships: KnowledgeRelationship[]
  ): Promise<number> {
    let importCount = 0;

    try {
      for (const rel of relationships) {
        const query = `
          MATCH (a:KnowledgeNode {id: $source_id}), (b:KnowledgeNode {id: $target_id})
          MERGE (a)-[r:${rel.relationship_type}]->(b)
          SET r.strength = $strength,
              r.metadata = $metadata,
              r.created_at = datetime()
          RETURN r
        `;

        await this.neo4j.execute(query, {
          source_id: rel.source_id,
          target_id: rel.target_id,
          strength: rel.strength,
          metadata: JSON.stringify(rel.metadata),
        });

        importCount++;
      }

      console.log(`✅ 成功导入 ${importCount} 个关系`);
      return importCount;
    } catch (error) {
      console.error('❌ 导入关系失败:', error);
      throw error;
    }
  }

  /**
   * 导入 CSV 数据
   * @param csvData CSV 字符串
   * @param type 数据类型 (knowledge_nodes 或 knowledge_relationships)
   * @returns 导入成功数量
   */
  async importCSV(csvData: string, type: string): Promise<number> {
    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',');
    const records = lines.slice(1).map(line => {
      const values = line.split(',');
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header.trim()] = values[index]?.trim() || '';
      });
      return record;
    });

    if (type === 'knowledge_nodes') {
      const nodes: KnowledgeNode[] = records.map(record => ({
        id: record.id,
        type: record.type || 'concept',
        grade_level: record.grade_level,
        subject: record.subject,
        title: record.title,
        description: record.description || '',
        difficulty: parseInt(record.difficulty) || 1,
        prerequisites: record.prerequisites
          ? record.prerequisites.split('|')
          : [],
        next_topics: record.next_topics ? record.next_topics.split('|') : [],
        tags: record.tags ? record.tags.split('|') : [],
        metadata: record.metadata ? JSON.parse(record.metadata) : {},
      }));
      return this.importKnowledgeNodes(nodes);
    } else if (type === 'knowledge_relationships') {
      const relationships: KnowledgeRelationship[] = records.map(record => ({
        source_id: record.source_id,
        target_id: record.target_id,
        relationship_type: record.relationship_type || 'prerequisite_of',
        strength: parseFloat(record.strength) || 1.0,
        metadata: record.metadata ? JSON.parse(record.metadata) : {},
      }));
      return this.importKnowledgeRelationships(relationships);
    }

    throw new Error(`未知的数据类型: ${type}`);
  }

  /**
   * 验证数据完整性
   * @returns 验证报告
   */
  async validateImport(
    expectedCount: number,
    type: string
  ): Promise<ValidationReport> {
    const query = `
      MATCH (n:${type === 'knowledge_nodes' ? 'KnowledgeNode' : 'Relationship'})
      RETURN count(n) as count
    `;

    const result = await this.neo4j.execute(query);
    const actualCount = result[0]?.count || 0;

    return {
      type,
      expected: expectedCount,
      actual: actualCount,
      missing: expectedCount - actualCount,
      status: actualCount >= expectedCount ? 'complete' : 'pending',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 获取数据统计
   * @returns 统计报告
   */
  async getStatistics(): Promise<StatisticsReport> {
    const nodeStats = await this.neo4j.execute(`
      MATCH (n:KnowledgeNode)
      RETURN 
        collect(DISTINCT n.subject) as subjects,
        collect(DISTINCT n.grade_level) as grades,
        count(n) as total_nodes,
        avg(n.difficulty) as avg_difficulty
    `);

    const relStats = await this.neo4j.execute(`
      MATCH ()-[r]->()
      RETURN 
        collect(DISTINCT type(r)) as rel_types,
        count(r) as total_rels
    `);

    return {
      knowledgeNodes: nodeStats[0] || {
        subjects: [],
        grades: [],
        total_nodes: 0,
        avg_difficulty: 0,
      },
      relationships: relStats[0] || {
        rel_types: [],
        total_rels: 0,
      },
    };
  }
}

// 接口定义
interface ValidationReport {
  type: string;
  expected: number;
  actual: number;
  missing: number;
  status: 'complete' | 'pending';
  timestamp: string;
}

interface StatisticsReport {
  knowledgeNodes: {
    subjects: string[];
    grades: string[];
    total_nodes: number;
    avg_difficulty: number;
  };
  relationships: {
    rel_types: string[];
    total_rels: number;
  };
}

// 使用示例
if (require.main === module) {
  (async () => {
    console.log('🧪 测试 KnowledgeGraphImporter...');
    
    // 注意: 实际使用时需要配置正确的数据库连接
    // const neo4j = new Neo4jDriver('bolt://localhost:7687', 'neo4j', 'password');
    // const encryptionService = new EncryptionService(process.env.ENCRYPTION_KEY!);
    // const importer = new KnowledgeGraphImporter(neo4j, encryptionService);
    
    // console.log('✅ KnowledgeGraphImporter 初始化成功');
    // console.log('📊 使用示例:');
    // console.log('  importKnowledgeNodes(nodes)');
    // console.log('  importKnowledgeRelationships(relationships)');
    // console.log('  importCSV(csvData, type)');
    // console.log('  validateImport(expectedCount, type)');
    // console.log('  getStatistics()');
  })();
}