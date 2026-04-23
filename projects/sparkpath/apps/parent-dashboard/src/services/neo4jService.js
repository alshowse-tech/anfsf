import neo4j from 'neo4j-driver';

const driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'SparkPath2026!')
);

export const getStudentProgress = async () => {
  const session = driver.session();
  try {
    // 获取所有知识点和学习进度
    const result = await session.run(`
      MATCH (k:KnowledgeNode)
      RETURN k.id as id, k.name as name, k.subject as subject, 
             k.stage as stage, k.coreDefinition as definition
      ORDER BY k.subject, k.name
    `);
    
    return result.records.map(record => ({
      id: record.get('id'),
      name: record.get('name'),
      subject: record.get('subject'),
      stage: record.get('stage'),
      definition: record.get('definition')
    }));
  } finally {
    await session.close();
  }
};

export const getLearningPaths = async () => {
  const session = driver.session();
  try {
    // 获取学习路径关系
    const result = await session.run(`
      MATCH (start:KnowledgeNode)-[:PREREQUISITE_OF]->(end:KnowledgeNode)
      RETURN start.name as from, end.name as to, start.subject as subject
      ORDER BY start.subject, start.name
    `);
    
    return result.records.map(record => ({
      from: record.get('from'),
      to: record.get('to'),
      subject: record.get('subject')
    }));
  } finally {
    await session.close();
  }
};

export const getSubjectSummary = async () => {
  const session = driver.session();
  try {
    // 获取各科目知识点统计
    const result = await session.run(`
      MATCH (k:KnowledgeNode)
      RETURN k.subject as subject, count(k) as knowledgeCount
      ORDER BY k.subject
    `);
    
    return result.records.map(record => ({
      subject: record.get('subject'),
      knowledgeCount: record.get('knowledgeCount').toNumber()
    }));
  } finally {
    await session.close();
  }
};

export default driver;
