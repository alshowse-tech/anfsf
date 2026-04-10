/**
 * ANFSF V1.5.0 - 内存模块示例和使用指南
 */

import { 
  HierarchicalMemoryRetriever,
  TemporalKnowledgeGraph 
} from './index';

// ============================================================================
// 示例 1: 基础使用
// ============================================================================

async function basicExample() {
  // 初始化检索器
  const retriever = new HierarchicalMemoryRetriever();
  await retriever.initialize();

  // 存储记忆
  await retriever.store(
    '用户决定使用 PostgreSQL 而不是 SQLite，因为需要同时写入',
    'wing_jieyue_project',
    'hall_facts',
    { 
      type: 'decision', 
      priority: 'high',
      timestamp: '2026-04-09T10:00:00Z'
    }
  );

  // 搜索
  const results = await retriever.search('数据库 decision', {
    topK: 5,
    minScore: 0.7
  });

  console.log('搜索结果:', results);
  await retriever.close();
}

// ============================================================================
// 示例 2: 层级导航搜索
// ============================================================================

async function navigateExample() {
  const retriever = new HierarchicalMemoryRetriever();
  await retriever.initialize();

  // 在特定 wing 和 room 中搜索
  const wingResults = await retriever.navigateSearch(
    'PostgreSQL 决策',
    'wing_jieyue_project',
    'hall_facts'
  );

  console.log('层级导航搜索:', wingResults);
  await retriever.close();
}

// ============================================================================
// 示例 3: 时间感知搜索
// ============================================================================

async function temporalExample() {
  const kg = new TemporalKnowledgeGraph();

  // 添加事实
  await kg.addTriple(
    '用户', 
    '居住', 
    '上海',
    '2025-01-01T00:00:00Z'
  );

  await kg.addTriple(
    '用户', 
    '居住', 
    '北京',
    '2026-04-01T00:00:00Z'
  );

  // 查询当前事实
  const currentCity = await kg.queryRelation('用户', '居住');
  console.log('当前居住地:', currentCity);

  // 查询历史事实
  const historyCity = await kg.queryRelation(
    '用户', 
    '居住',
    '2026-01-15'  // 查看 2026年1月15日
  );
  console.log('2026-01-15 居住地:', historyCity);

  await kg.cleanup();
}

// ============================================================================
// 示例 4: 完整用例 - 捷阅证券项目
// ============================================================================

async function jieyueProjectExample() {
  const retriever = new HierarchicalMemoryRetriever();
  await retriever.initialize();

  // 存储项目决策
  await retriever.store(
    '选择 PostgreSQL 而不是 SQLite，因为需要并发写入支持',
    'wing_jieyue_project',
    'hall_facts',
    { type: 'decision', priority: 'high' }
  );

  await retriever.store(
    '用户偏好使用 VS Code 进行开发',
    'wing_jieyue_project',
    'hall_preferences',
    { type: 'preference' }
  );

  await retriever.store(
    '部署流程：Docker 构建 -> 自动部署',
    'wing_jieyue_project',
    'hall_events',
    { type: 'event', category: 'deployment' }
  );

  // 搜索
  const results = await retriever.search('数据库 decision');

  // 时间感知搜索
  const history = await retriever.temporalSearch(
    '部署流程',
    '2026-04-09'
  );

  console.log('项目搜索结果:', results);
  console.log('历史部署:', history);

  await retriever.close();
}

// ============================================================================
// 示例 5: 统计和报告
// ============================================================================

async function statsExample() {
  const retriever = new HierarchicalMemoryRetriever();
  await retriever.initialize();

  // 存储多条记录
  for (let i = 0; i < 10; i++) {
    await retriever.store(
      `记忆 ${i}`,
      'wing_general',
      'general_chat'
    );
  }

  // 获取统计
  const stats = await retriever.stats();
  console.log('内存统计:', stats);

  await retriever.close();
}

// ============================================================================
// 示例 6: 实体关系时间线
// ============================================================================

async function timelineExample() {
  const kg = new TemporalKnowledgeGraph();

  // 添加时间线数据
  await kg.addTriple(
    '用户',
    '加入项目',
    '捷阅证券',
    '2025-01-01T00:00:00Z'
  );

  await kg.addTriple(
    '用户',
    '担任角色',
    '高级开发',
    '2025-06-01T00:00:00Z'
  );

  await kg.addTriple(
    '用户',
    '担任角色',
    '架构师',
    '2026-01-01T00:00:00Z'
  );

  // 获取时间线
  const timeline = await kg.timeline('用户');
  console.log('用户时间线:', timeline);

  await kg.cleanup();
}

// ============================================================================
// 导出示例
// ============================================================================

export {
  basicExample,
  navigateExample,
  temporalExample,
  jieyueProjectExample,
  statsExample,
  timelineExample
};
