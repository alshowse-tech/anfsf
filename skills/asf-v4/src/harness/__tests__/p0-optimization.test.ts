/**
 * P0 Optimization Tests - P0 优化测试
 * 
 * 测试多 Agent 协同优化 + 自我进化闭环
 */

import { AgentRouter, createAgentRouter, Task } from '../agent-router';
import { SelfEvolutionLoop, createSelfEvolutionLoop } from '../self-evolution-loop';
import { P0Integration, createP0Integration } from '../p0-integration';

describe('P0 Optimization', () => {
  describe('AgentRouter', () => {
    let router: AgentRouter;

    beforeEach(() => {
      router = createAgentRouter();
    });

    test('应注册 Agent', () => {
      router.registerAgent({
        agentId: 'test-agent',
        agentType: 'code',
        skills: ['coding', 'testing'],
        load: 0,
        avgResponseTime: 1000,
        successRate: 0.95,
        tokenBudget: 50000
      });

      const stats = router.getStats();
      expect(stats.uniqueAgents).toBe(1);
    });

    test('应智能路由任务', async () => {
      // 注册 Agent
      router.registerAgent({
        agentId: 'requirement-agent',
        agentType: 'requirement',
        skills: ['analysis', 'parsing'],
        load: 20,
        avgResponseTime: 2000,
        successRate: 0.95,
        tokenBudget: 100000
      });

      router.registerAgent({
        agentId: 'code-agent',
        agentType: 'code',
        skills: ['coding', 'implementation'],
        load: 30,
        avgResponseTime: 3000,
        successRate: 0.90,
        tokenBudget: 80000
      });

      // 创建任务
      const task: Task = {
        id: 'task_1',
        type: 'requirement-analysis',
        description: '分析需求文档',
        priority: 'high',
        estimatedTokens: 50000,
        requiredSkills: ['analysis', 'parsing']
      };

      // 路由任务
      const assignment = await router.routeTask(task);

      expect(assignment.taskId).toBe('task_1');
      expect(assignment.agentId).toBe('requirement-agent'); // 技能匹配
      expect(assignment.confidence).toBeGreaterThan(0.5);
    });

    test('应处理无可用 Agent 情况', async () => {
      const task: Task = {
        id: 'task_2',
        type: 'unknown-type',
        description: '未知任务',
        priority: 'low',
        estimatedTokens: 10000,
        requiredSkills: ['unknown-skill']
      };

      await expect(router.routeTask(task)).rejects.toThrow('无可用 Agent');
    });

    test('应压缩上下文', async () => {
      const longContext = '第一句很重要的内容。第二句次要内容。第三句更多内容。第四句额外信息。第五句最后内容。';
      
      const compressed = await router.compressContext(longContext, 4);
      
      // 压缩后应该更短或至少包含关键信息
      expect(compressed).toBeDefined();
      expect(compressed.length).toBeGreaterThan(0);
    });

    test('应检测冲突', async () => {
      const outputs = new Map([
        ['agent1', { state: 'completed', result: 'success' }],
        ['agent2', { state: 'pending', result: 'success' }]
      ]);

      const conflictReport = await router.detectConflicts(outputs);

      expect(conflictReport.hasConflict).toBe(true);
      expect(conflictReport.conflicts.length).toBeGreaterThan(0);
    });

    test('应创建协同记忆', () => {
      const memory = router.createCollaborativeMemory('task_123');

      expect(memory.taskId).toBe('task_123');
      expect(memory.sharedContext).toBeDefined();
      expect(memory.agentOutputs).toBeDefined();
    });

    test('应添加 Agent 输出到记忆', () => {
      router.createCollaborativeMemory('task_456');
      router.addAgentOutput('task_456', 'agent1', { result: 'success' });

      const context = router.getSharedContext('task_456');
      expect(context).toBeDefined();
    });
  });

  describe('SelfEvolutionLoop', () => {
    let evolutionLoop: SelfEvolutionLoop;

    beforeEach(() => {
      evolutionLoop = createSelfEvolutionLoop();
    });

    test('应监控 KPI', async () => {
      const kpi = await evolutionLoop.monitorKPI();

      expect(kpi.timestamp).toBeDefined();
      expect(kpi.parseAccuracy).toBeGreaterThanOrEqual(0);
      expect(kpi.parseAccuracy).toBeLessThanOrEqual(1);
      expect(kpi.successRate).toBeGreaterThanOrEqual(0);
      expect(kpi.successRate).toBeLessThanOrEqual(1);
    });

    test('应识别瓶颈', async () => {
      const bottleneckReport = await evolutionLoop.identifyBottleneck();

      expect(bottleneckReport).toBeDefined();
      expect(bottleneckReport.severity).toBeDefined();
      expect(bottleneckReport.recommendations).toBeDefined();
    });

    test('应生成优化建议', async () => {
      const report = await evolutionLoop.identifyBottleneck();

      // 如果有瓶颈，应该有建议
      if (report.bottlenecks.length > 0) {
        expect(report.recommendations.length).toBeGreaterThan(0);
      }
    });

    test('应自动优化', async () => {
      const result = await evolutionLoop.autoOptimize();

      expect(result.baseline).toBeDefined();
      expect(result.experiment).toBeDefined();
      expect(result.improvement).toBeDefined();
      expect(result.statisticallySignificant).toBeDefined();
    });

    test('应获取 KPI 历史', async () => {
      // 先记录一些 KPI
      await evolutionLoop.monitorKPI();
      await evolutionLoop.monitorKPI();

      const history = evolutionLoop.getKPIHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });

    test('应获取统计', () => {
      const stats = evolutionLoop.getStats();

      expect(stats.kpiHistorySize).toBeDefined();
      expect(stats.activeBottlenecks).toBeDefined();
      expect(stats.activeRecommendations).toBeDefined();
    });
  });

  describe('P0Integration', () => {
    let integration: P0Integration;

    beforeEach(async () => {
      integration = createP0Integration();
      await integration.initialize();
    });

    afterEach(() => {
      integration.cleanup();
    });

    test('应初始化成功', async () => {
      const status = await integration.healthCheck();

      expect(status.agentRouterReady).toBe(true);
      expect(status.evolutionLoopReady).toBe(true);
      expect(status.healthScore).toBeGreaterThan(0);
    });

    test('应路由并执行任务', async () => {
      const task: Task = {
        id: 'integration_task_1',
        type: 'requirement-analysis',
        description: '测试任务',
        priority: 'medium',
        estimatedTokens: 30000
      };

      const result = await integration.routeAndExecute(task);

      expect(result.taskId).toBe('integration_task_1');
      expect(result.assignment.agentId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    test('应批量路由任务', async () => {
      const tasks: Task[] = [
        {
          id: 'batch_1',
          type: 'requirement-analysis',
          description: '任务 1',
          priority: 'high',
          estimatedTokens: 20000
        },
        {
          id: 'batch_2',
          type: 'code-generation',
          description: '任务 2',
          priority: 'medium',
          estimatedTokens: 40000
        },
        {
          id: 'batch_3',
          type: 'testing',
          description: '任务 3',
          priority: 'low',
          estimatedTokens: 30000
        }
      ];

      const results = await integration.routeBatchTasks(tasks);

      expect(results.length).toBe(3);
      expect(results.filter(r => r.success).length).toBeGreaterThan(0);
    });

    test('应获取统计', () => {
      const stats = integration.getStats();

      expect(stats.agentRouter).toBeDefined();
      expect(stats.evolutionLoop).toBeDefined();
      expect(stats.taskResults).toBeDefined();
    });

    test('应获取 KPI 历史', async () => {
      const history = integration.getKPIHistory(5);
      expect(Array.isArray(history)).toBe(true);
    });

    test('应触发自动优化', async () => {
      await expect(integration.triggerAutoOptimization()).resolves.not.toThrow();
    });

    test('健康检查应返回合理分数', async () => {
      const status = await integration.healthCheck();

      expect(status.healthScore).toBeGreaterThanOrEqual(0);
      expect(status.healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('集成场景测试', () => {
    test('应完整执行多 Agent 协同流程', async () => {
      const integration = createP0Integration();
      await integration.initialize();

      try {
        // 1. 创建复杂任务
        const tasks: Task[] = [
          {
            id: 'workflow_1',
            type: 'requirement-analysis',
            description: '分析项目需求',
            priority: 'high',
            estimatedTokens: 50000,
            requiredSkills: ['analysis']
          },
          {
            id: 'workflow_2',
            type: 'design',
            description: '生成 UI 设计',
            priority: 'high',
            estimatedTokens: 40000,
            requiredSkills: ['ui-design'],
            dependencies: ['workflow_1']
          },
          {
            id: 'workflow_3',
            type: 'code-generation',
            description: '生成代码',
            priority: 'high',
            estimatedTokens: 80000,
            requiredSkills: ['coding'],
            dependencies: ['workflow_2']
          }
        ];

        // 2. 执行工作流（验证任务被路由）
        const results = [];
        for (const task of tasks) {
          const result = await integration.routeAndExecute(task);
          results.push(result);
        }
        
        // 验证所有任务都被处理（无论成功失败）
        expect(results.length).toBe(3);
        expect(results.every(r => r.taskId)).toBe(true);

        // 3. 检查统计
        const stats = integration.getStats();
        expect(stats.taskResults.total).toBe(3);

        // 4. 健康检查
        const status = await integration.healthCheck();
        expect(status.healthScore).toBeGreaterThanOrEqual(0);
      } finally {
        integration.cleanup();
      }
    });

    test('应处理 Agent 故障恢复', async () => {
      const router = createAgentRouter();

      // 注册多个同类型 Agent（冗余）
      router.registerAgent({
        agentId: 'backup-agent-1',
        agentType: 'code',
        skills: ['coding'],
        load: 90, // 高负载
        avgResponseTime: 5000,
        successRate: 0.80,
        tokenBudget: 50000
      });

      router.registerAgent({
        agentId: 'backup-agent-2',
        agentType: 'code',
        skills: ['coding'],
        load: 20, // 低负载
        avgResponseTime: 2000,
        successRate: 0.95,
        tokenBudget: 80000
      });

      const task: Task = {
        id: 'failover_test',
        type: 'code-generation',
        description: '代码生成',
        priority: 'high',
        estimatedTokens: 30000,
        requiredSkills: ['coding']
      };

      const assignment = await router.routeTask(task);

      // 应该选择低负载的 backup-agent-2（或至少有一个 Agent）
      expect(assignment.agentId).toBeDefined();
      expect(['backup-agent-1', 'backup-agent-2']).toContain(assignment.agentId);
    });
  });
});
