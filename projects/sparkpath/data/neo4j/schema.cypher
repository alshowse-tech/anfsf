// SparkPath 知识图谱 Schema 定义
// Neo4j Cypher 脚本

// ============================================================================
// 创建约束 (Constraints)
// ============================================================================

// 知识点唯一性约束
CREATE CONSTRAINT knowledge_node_id IF NOT EXISTS
FOR (n:KnowledgeNode) REQUIRE n.id IS UNIQUE;

// 科目唯一性约束
CREATE CONSTRAINT subject_name IF NOT EXISTS
FOR (s:Subject) REQUIRE s.name IS UNIQUE;

// 阶段唯一性约束
CREATE CONSTRAINT stage_name IF NOT EXISTS
FOR (s:Stage) REQUIRE s.name IS UNIQUE;

// 学生唯一性约束
CREATE CONSTRAINT student_id IF NOT EXISTS
FOR (s:Student) REQUIRE s.studentId IS UNIQUE;

// ============================================================================
// 创建索引 (Indexes)
// ============================================================================

// 知识点搜索索引
CREATE INDEX knowledge_node_name IF NOT EXISTS
FOR (n:KnowledgeNode) ON (n.name);

// 知识点阶段索引
CREATE INDEX knowledge_node_stage IF NOT EXISTS
FOR (n:KnowledgeNode) ON (n.stage);

// 知识点科目索引
CREATE INDEX knowledge_node_subject IF NOT EXISTS
FOR (n:KnowledgeNode) ON (n.subject);

// 学生知识状态索引
CREATE INDEX student_knowledge_status IF NOT EXISTS
FOR (s:StudentKnowledge) ON (s.status);

// ============================================================================
// 创建基础数据 (Subject & Stage)
// ============================================================================

// 创建科目
MERGE (:Subject {name: '语文', code: 'chinese'})
MERGE (:Subject {name: '数学', code: 'math'})
MERGE (:Subject {name: '英语', code: 'english'})
MERGE (:Subject {name: '物理', code: 'physics'})
MERGE (:Subject {name: '化学', code: 'chemistry'})
MERGE (:Subject {name: '生物', code: 'biology'})
MERGE (:Subject {name: '历史', code: 'history'})
MERGE (:Subject {name: '地理', code: 'geography'})
MERGE (:Subject {name: '政治', code: 'politics'})

// 创建阶段
MERGE (:Stage {name: 'elementary', displayName: '小学', ageRange: '9-12'})
MERGE (:Stage {name: 'middle', displayName: '初中', ageRange: '13-15'})
MERGE (:Stage {name: 'high', displayName: '高中', ageRange: '16-18'})

// ============================================================================
// 示例知识点数据 (函数主题)
// ============================================================================

// 小学：认识函数
MERGE (n:KnowledgeNode {
  id: 'math-function-basic',
  name: '认识函数',
  subject: '数学',
  stage: ['elementary'],
  coreDefinition: '函数是一种特殊的关系，每个输入对应唯一的输出',
  methodSteps: ['理解输入输出概念', '学习函数表示法', '练习简单函数计算'],
  typicalExamples: ['y = x + 1', 'f(x) = 2x'],
  commonMistakes: ['混淆输入和输出', '不理解一一对应关系'],
  crossSubjectLinks: ['语文：因果关系'],
  prerequisites: [],
  dependents: ['math-function-linear'],
  officialSource: '义务教育数学课程标准 (2022 年版)',
  lastUpdated: datetime()
})

// 初中：一次函数
MERGE (n:KnowledgeNode {
  id: 'math-function-linear',
  name: '一次函数',
  subject: '数学',
  stage: ['middle'],
  coreDefinition: '形如 y = kx + b (k≠0) 的函数叫做一次函数',
  methodSteps: ['理解一次函数定义', '学习斜率和截距', '掌握图像绘制', '应用解决实际问题'],
  typicalExamples: ['y = 2x + 1', 'y = -x + 3'],
  commonMistakes: ['斜率计算错误', '截距理解不清', '图像绘制不准确'],
  crossSubjectLinks: ['物理：匀速直线运动', '地理：变化率分析'],
  prerequisites: ['math-function-basic'],
  dependents: ['math-function-quadratic'],
  officialSource: '义务教育数学课程标准 (2022 年版)',
  lastUpdated: datetime()
})

// 高中：二次函数
MERGE (n:KnowledgeNode {
  id: 'math-function-quadratic',
  name: '二次函数',
  subject: '数学',
  stage: ['high'],
  coreDefinition: '形如 y = ax² + bx + c (a≠0) 的函数叫做二次函数',
  methodSteps: ['理解二次函数定义', '学习顶点式和一般式', '掌握最值问题', '综合应用'],
  typicalExamples: ['y = x² - 4x + 3', 'y = -2x² + 4x'],
  commonMistakes: ['顶点坐标计算错误', '开口方向判断错误', '最值求解遗漏'],
  crossSubjectLinks: ['物理：抛体运动', '化学：反应速率'],
  prerequisites: ['math-function-linear'],
  dependents: [],
  officialSource: '普通高中数学课程标准 (2017 年版 2020 修订)',
  lastUpdated: datetime()
})

// ============================================================================
// 创建关系 (Relationships)
// ============================================================================

// 知识点前置关系
MATCH (basic:KnowledgeNode {id: 'math-function-basic'})
MATCH (linear:KnowledgeNode {id: 'math-function-linear'})
MERGE (basic)-[:PREREQUISITE_OF]->(linear)

MATCH (linear:KnowledgeNode {id: 'math-function-linear'})
MATCH (quadratic:KnowledgeNode {id: 'math-function-quadratic'})
MERGE (linear)-[:PREREQUISITE_OF]->(quadratic)

// 知识点跨学科关联
MATCH (linear:KnowledgeNode {id: 'math-function-linear'})
MATCH (physics:Subject {name: '物理'})
MERGE (linear)-[:CROSS_SUBJECT_LINK {strength: 0.8}]->(physics)

// ============================================================================
// 查询示例
// ============================================================================

// 查询某个知识点的所有前置知识
// MATCH path = (n:KnowledgeNode {id: 'math-function-quadratic'})<-[:PREREQUISITE_OF*]-(prereq)
// RETURN path

// 查询某个学生的知识掌握情况
// MATCH (s:Student {studentId: 'student-001'})-[km:KNOWS]->(k:KnowledgeNode)
// RETURN k.name, km.mastery, km.lastPracticed

// 查询推荐学习路径
// MATCH path = shortestPath(
//   (start:KnowledgeNode {id: 'math-function-basic'})-[:PREREQUISITE_OF*]->(end:KnowledgeNode {id: 'math-function-quadratic'})
// )
// RETURN path
