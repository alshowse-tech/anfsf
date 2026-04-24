/**
 * P0 Integration - P0 优化集成层
 * 
 * 整合多 Agent 协同优化 + 自我进化闭环
 * 
 * @module asf-v4/harness/p0-integration
 * @version 1.0.0
 */

import { AgentRouter, createAgentRouter, Task, AgentAssignment } from './agent-router';
import { SelfEvolutionLoop, createSelfEvolutionLoop, KPIReport, BottleneckReport, Recommendation } from './self-evolution-loop';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('P0Integration');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * P0 优化状态
 */
export interface P0Status {
  agentRouterReady: boolean;
  evolutionLoopReady: boolean;
  totalTasksRouted: number;
  activeBottlenecks: number;
  latestKPI: KPIReport | null;
  healthScore: number;
}

/**
 * 任务执行结果
 */
export interface TaskExecutionResult {
  taskId: string;
  assignment: AgentAssignment;
  success: boolean;
  duration: number;
  tokensUsed: number;
  error?: string;
}

// ============================================================================
// P0 Integration 主类
// ============================================================================

export class P0Integration {
  private agentRouter: AgentRouter;
  private evolutionLoop: SelfEvolutionLoop;
  private taskResults: Map<string, TaskExecutionResult>;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.agentRouter = createAgentRouter();
    this.evolutionLoop = createSelfEvolutionLoop();
    this.taskResults = new Map();

    logger.info('✅ P0 优化集成层初始化完成');
  }

  /**
   * 初始化 - 注册默认 Agent
   */
  async initialize(): Promise<void> {
    logger.info('🚀 初始化 P0 优化集成层...');

    // 注册默认 Agent
    this.registerDefaultAgents();

    // 启动健康检查
    this.startHealthCheck();

    // 初始 KPI 监控
    await this.evolutionLoop.monitorKPI();

    logger.info('✅ P0 优化集成层启动完成');
  }

  /**
   * 注册默认 Agent
   */
  private registerDefaultAgents(): void {
    const defaultAgents = [
      {
        agentId: 'requirement-analyzer',
        agentType: 'requirement' as const,
        skills: ['requirement-analysis', 'parsing', 'refinement'],
        load: 0,
        avgResponseTime: 2500,
        successRate: 0.95,
        tokenBudget: 100000
      },
      {
        agentId: 'design-generator',
        agentType: 'design' as const,
        skills: ['ui-design', 'ux-mapping', 'prototype'],
        load: 0,
        avgResponseTime: 3000,
        successRate: 0.92,
        tokenBudget: 80000
      },
      {
        agentId: 'code-generator',
        agentType: 'code' as const,
        skills: ['code-generation', 'refactoring', 'optimization'],
        load: 0,
        avgResponseTime: 4000,
        successRate: 0.90,
        tokenBudget: 120000
      },
      {
        agentId: 'test-engineer',
        agentType: 'test' as const,
        skills: ['test-generation', 'e2e-testing', 'validation'],
        load: 0,
        avgResponseTime: 3500,
        successRate: 0.93,
        tokenBudget: 60000
      },
      {
        agentId: 'code-reviewer',
        agentType: 'review' as const,
        skills: ['code-review', 'security-audit', 'quality-check'],
        load: 0,
        avgResponseTime: 2000,
        successRate: 0.96,
        tokenBudget: 50000
      },
      {
        agentId: 'deployment-manager',
        agentType: 'deploy' as const,
        skills: ['deployment', 'ci-cd', 'monitoring'],
        load: 0,
        avgResponseTime: 1500,
        successRate: 0.98,
        tokenBudget: 40000
      }
    ];

    for (const agent of defaultAgents) {
      this.agentRouter.registerAgent(agent);
    }

    logger.info(`✅ 注册 ${defaultAgents.length} 个默认 Agent`);
  }

  /**
   * 路由并执行任务
   */
  async routeAndExecute(task: Task): Promise<TaskExecutionResult> {
    logger.info(`📋 路由任务：${task.id} (${task.type})`);

    const startTime = Date.now();

    try {
      // 1. 路由任务
      const assignment = await this.agentRouter.routeTask(task);

      // 2. 创建协同记忆
      this.agentRouter.createCollaborativeMemory(task.id);

      // 3. 模拟执行（实际应该调用 Agent）
      const result = await this.simulateExecution(task, assignment);

      // 4. 记录结果
      this.taskResults.set(task.id, result);

      // 5. 添加到 Agent 记忆
      this.agentRouter.addAgentOutput(task.id, assignment.agentId, {
        success: result.success,
        duration: result.duration
      });

      logger.info(`✅ 任务完成：${task.id} (${result.success ? '成功' : '失败'})`);

      return result;
    } catch (error: any) {
      const result: TaskExecutionResult = {
        taskId: task.id,
        assignment: {
          taskId: task.id,
          agentId: 'unknown',
          confidence: 0,
          estimatedTime: 0,
          tokenBudget: 0,
          alternativeAgents: []
        },
        success: false,
        duration: Date.now() - startTime,
        tokensUsed: 0,
        error: error?.message || 'Unknown error'
      };

      this.taskResults.set(task.id, result);
      logger.error(`❌ 任务失败：${task.id} - ${error?.message}`);

      return result;
    }
  }

  /**
   * 模拟执行
   */
  private async simulateExecution(task: Task, assignment: AgentAssignment): Promise<TaskExecutionResult> {
    // 模拟执行延迟
    const executionTime = assignment.estimatedTime * (0.8 + Math.random() * 0.4);
    await new Promise(resolve => setTimeout(resolve, Math.min(executionTime, 1000)));

    // 模拟成功率（基于置信度）
    const success = Math.random() < assignment.confidence;

    // 模拟 Token 使用
    const tokensUsed = Math.floor(assignment.tokenBudget * (0.6 + Math.random() * 0.3));

    return {
      taskId: task.id,
      assignment,
      success,
      duration: Math.floor(executionTime),
      tokensUsed
    };
  }

  /**
   * 批量路由任务
   */
  async routeBatchTasks(tasks: Task[]): Promise<TaskExecutionResult[]> {
    logger.info(`📦 批量路由 ${tasks.length} 个任务...`);

    const results: TaskExecutionResult[] = [];

    for (const task of tasks) {
      const result = await this.routeAndExecute(task);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    logger.info(`✅ 批量完成：${successCount}/${tasks.length} 成功`);

    return results;
  }

  /**
   * 检测并解决冲突
   */
  async detectAndResolveConflicts(taskId: string): Promise<void> {
    logger.info(`🔍 检测冲突：${taskId}`);

    // 获取任务相关输出
    const memory = this.agentRouter.getSharedContext(taskId);
    const outputs = new Map<string, unknown>();
    
    // 模拟从记忆中获取输出
    for (const [key, value] of memory.entries()) {
      outputs.set(key, value);
    }

    // 检测冲突
    const conflictReport = await this.agentRouter.detectConflicts(outputs);

    if (conflictReport.hasConflict) {
      logger.warn(`⚠️ 发现冲突：${conflictReport.conflicts.length} 个，严重程度=${conflictReport.severity}`);
      logger.info(`💡 解决方案：${conflictReport.resolution}`);
    } else {
      logger.info('✅ 无冲突');
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<P0Status> {
    const agentStats = this.agentRouter.getStats();
    const evolutionStats = this.evolutionLoop.getStats();
    const latestKPI = evolutionStats.latestKPI;

    // 计算健康分数（0-100）
    let healthScore = 100;

    if (latestKPI) {
      // 准确率权重 30%
      if (latestKPI.parseAccuracy < 0.85) {
        healthScore -= (0.85 - latestKPI.parseAccuracy) * 100;
      }

      // 成功率权重 30%
      if (latestKPI.successRate < 0.90) {
        healthScore -= (0.90 - latestKPI.successRate) * 100;
      }

      // 错误率权重 20%
      if (latestKPI.errorRate > 0.05) {
        healthScore -= (latestKPI.errorRate - 0.05) * 200;
      }

      // 响应时间权重 20%
      if (latestKPI.avgResponseTime > 5000) {
        healthScore -= Math.min(20, (latestKPI.avgResponseTime - 5000) / 500);
      }
    }

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      agentRouterReady: true,
      evolutionLoopReady: true,
      totalTasksRouted: agentStats.totalTasks,
      activeBottlenecks: evolutionStats.activeBottlenecks,
      latestKPI,
      healthScore
    };
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const status = await this.healthCheck();
        
        if (status.healthScore < 60) {
          logger.warn(`⚠️ 健康分数低：${status.healthScore.toFixed(0)}，建议检查瓶颈`);
          
          // 自动触发瓶颈识别
          const bottlenecks = await this.evolutionLoop.identifyBottleneck();
          if (bottlenecks.bottlenecks.length > 0) {
            logger.info(`💡 发现 ${bottlenecks.bottlenecks.length} 个瓶颈`);
          }
        }
      } catch (error: unknown) {
        logger.error('健康检查失败:', error);
      }
    }, 60000); // 每分钟检查一次

    logger.info('⏰ 健康检查已启动（每分钟）');
  }

  /**
   * 停止健康检查
   */
  stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('⏹️ 健康检查已停止');
    }
  }

  // ============================================================================
  // 统计与报告
  // ============================================================================

  /**
   * 获取统计
   */
  getStats(): Record<string, unknown> {
    return {
      agentRouter: this.agentRouter.getStats(),
      evolutionLoop: this.evolutionLoop.getStats(),
      taskResults: {
        total: this.taskResults.size,
        success: Array.from(this.taskResults.values()).filter(r => r.success).length,
        failed: Array.from(this.taskResults.values()).filter(r => !r.success).length
      }
    };
  }

  /**
   * 获取 KPI 历史
   */
  getKPIHistory(limit: number = 10): KPIReport[] {
    return this.evolutionLoop.getKPIHistory(limit);
  }

  /**
   * 获取瓶颈
   */
  getBottlenecks(): BottleneckReport {
    // 模拟实现
    return {
      bottlenecks: [],
      severity: 'low',
      recommendations: []
    };
  }

  /**
   * 获取建议
   */
  getRecommendations(): Recommendation[] {
    return this.evolutionLoop.getRecommendations();
  }

  /**
   * 触发自动优化
   */
  async triggerAutoOptimization(): Promise<void> {
    logger.info('🚀 触发自动优化...');
    
    const result = await this.evolutionLoop.autoOptimize();
    
    if (result.deployed) {
      logger.info(`✅ 优化已部署：提升 ${(result.improvement * 100).toFixed(1)}%`);
    } else {
      logger.info('ℹ️ 优化未部署（提升不显著）');
    }
  }

  /**
   * 清理
   */
  cleanup(): void {
    this.stopHealthCheck();
    this.taskResults.clear();
    this.agentRouter.clearMemory();
    this.evolutionLoop.clearHistory();
    logger.info('🧹 P0 集成层已清理');
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createP0Integration(): P0Integration {
  return new P0Integration();
}
