/**
 * Agent Router - 多 Agent 协同优化核心
 * 
 * 智能任务分配、上下文压缩、冲突检测、协同记忆
 * 
 * @module asf-v4/harness/agent-router
 * @version 1.0.0
 */

import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('AgentRouter');

// ============================================================================
// 类型定义
// ============================================================================

/**
 * Agent 能力描述
 */
export interface AgentCapability {
  agentId: string;
  agentType: 'requirement' | 'design' | 'code' | 'test' | 'review' | 'deploy';
  skills: string[];
  load: number; // 0-100
  avgResponseTime: number; // ms
  successRate: number; // 0-1
  tokenBudget: number; // 剩余 token 预算
}

/**
 * 任务描述
 */
export interface Task {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedTokens: number;
  requiredSkills?: string[];
  dependencies?: string[];
  context?: string;
}

/**
 * Agent 分配结果
 */
export interface AgentAssignment {
  taskId: string;
  agentId: string;
  confidence: number;
  estimatedTime: number;
  tokenBudget: number;
  alternativeAgents: string[];
}

/**
 * 冲突检测结果
 */
export interface ConflictReport {
  hasConflict: boolean;
  conflicts: Conflict[];
  severity: 'low' | 'medium' | 'high';
  resolution: string;
}

/**
 * 冲突描述
 */
export interface Conflict {
  type: 'output_mismatch' | 'dependency_cycle' | 'resource_conflict' | 'state_inconsistency';
  agents: string[];
  description: string;
  suggestion: string;
}

/**
 * 协同记忆
 */
export interface CollaborativeMemory {
  taskId: string;
  sharedContext: Map<string, unknown>;
  agentOutputs: Map<string, unknown>;
  conflicts: Conflict[];
  resolutions: string[];
}

// ============================================================================
// Agent Router 主类
// ============================================================================

export class AgentRouter {
  private agents: Map<string, AgentCapability>;
  private memory: Map<string, CollaborativeMemory>;
  private taskHistory: Map<string, AgentAssignment>;
  
  // 上下文压缩器（4x/8x 量化）
  private compressionRatio: 4 | 8 = 4;

  constructor() {
    this.agents = new Map();
    this.memory = new Map();
    this.taskHistory = new Map();
  }

  /**
   * 注册 Agent
   */
  registerAgent(agent: AgentCapability): void {
    this.agents.set(agent.agentId, agent);
    logger.info(`🤖 Agent 注册：${agent.agentId} (${agent.agentType})`);
  }

  /**
   * 更新 Agent 状态
   */
  updateAgentStatus(agentId: string, updates: Partial<AgentCapability>): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      Object.assign(agent, updates);
    }
  }

  /**
   * 智能任务分配 - 核心方法
   */
  async routeTask(task: Task): Promise<AgentAssignment> {
    logger.info(`📋 任务路由：${task.id} (${task.type})`);

    // 1. 获取可用 Agent
    const availableAgents = await this.getAvailableAgents(task);

    if (availableAgents.length === 0) {
      throw new Error(`无可用 Agent 处理任务：${task.id}`);
    }

    // 2. 评分选择最优 Agent
    const scoredAgents = availableAgents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, task)
    }));

    // 3. 按分数排序
    scoredAgents.sort((a, b) => b.score - a.score);

    const bestAgent = scoredAgents[0];
    const alternatives = scoredAgents.slice(1, 4).map(s => s.agent.agentId);

    logger.info(`✅ 选择 Agent: ${bestAgent.agent.agentId} (分数：${bestAgent.score.toFixed(2)})`);

    // 4. 创建分配结果
    const assignment: AgentAssignment = {
      taskId: task.id,
      agentId: bestAgent.agent.agentId,
      confidence: this.scoreToConfidence(bestAgent.score),
      estimatedTime: this.estimateTaskTime(bestAgent.agent, task),
      tokenBudget: this.calculateTokenBudget(bestAgent.agent, task),
      alternativeAgents: alternatives
    };

    // 5. 记录历史
    this.taskHistory.set(task.id, assignment);

    return assignment;
  }

  /**
   * 获取可用 Agent
   */
  private async getAvailableAgents(task: Task): Promise<AgentCapability[]> {
    const available: AgentCapability[] = [];

    for (const agent of this.agents.values()) {
      // 检查负载（>80% 视为不可用）
      if (agent.load > 80) {
        continue;
      }

      // 检查技能匹配
      if (task.requiredSkills) {
        const hasRequiredSkills = task.requiredSkills.every(skill =>
          agent.skills.includes(skill)
        );
        if (!hasRequiredSkills) {
          continue;
        }
      }

      // 检查 token 预算
      if (agent.tokenBudget < task.estimatedTokens) {
        continue;
      }

      // 检查 Agent 类型匹配
      const typeMatch = this.isTypeMatch(agent.agentType, task.type);
      if (!typeMatch) {
        continue;
      }

      available.push(agent);
    }

    return available;
  }

  /**
   * 计算 Agent 分数
   */
  private calculateAgentScore(agent: AgentCapability, task: Task): number {
    let score = 0;

    // 1. 技能匹配度（40% 权重）
    const skillScore = this.calculateSkillScore(agent, task);
    score += skillScore * 0.4;

    // 2. 负载情况（25% 权重）- 负载越低分数越高
    const loadScore = (100 - agent.load) / 100;
    score += loadScore * 0.25;

    // 3. 成功率（20% 权重）
    score += agent.successRate * 0.2;

    // 4. 响应时间（10% 权重）- 越快分数越高
    const responseScore = Math.max(0, 1 - agent.avgResponseTime / 5000);
    score += responseScore * 0.1;

    // 5. Token 预算充足度（5% 权重）
    const tokenScore = Math.min(1, agent.tokenBudget / task.estimatedTokens);
    score += tokenScore * 0.05;

    return score;
  }

  /**
   * 计算技能匹配分数
   */
  private calculateSkillScore(agent: AgentCapability, task: Task): number {
    if (!task.requiredSkills || task.requiredSkills.length === 0) {
      return 1;
    }

    const matchedSkills = task.requiredSkills.filter(skill =>
      agent.skills.includes(skill)
    ).length;

    return matchedSkills / task.requiredSkills.length;
  }

  /**
   * 检查类型匹配
   */
  private isTypeMatch(agentType: string, taskType: string): boolean {
    const typeMap: Record<string, string[]> = {
      'requirement': ['requirement', 'refine', 'analyze', 'parse'],
      'design': ['design', 'ui', 'ux', 'prototype'],
      'code': ['code', 'implement', 'develop', 'generate'],
      'test': ['test', 'verify', 'validate', 'e2e'],
      'review': ['review', 'audit', 'check'],
      'deploy': ['deploy', 'release', 'publish']
    };

    const matchTypes = typeMap[agentType] || [];
    return matchTypes.some(type => taskType.includes(type));
  }

  /**
   * 分数转置信度
   */
  private scoreToConfidence(score: number): number {
    // 0.7-1.0 分数映射到 0.5-1.0 置信度
    return Math.max(0.5, Math.min(1.0, score * 1.2 - 0.2));
  }

  /**
   * 估算任务时间
   */
  private estimateTaskTime(agent: AgentCapability, task: Task): number {
    // 基础时间（根据 token 数）
    const baseTime = task.estimatedTokens / 1000 * 100; // 100ms per 1k tokens
    
    // 根据 Agent 响应时间调整
    return baseTime * (agent.avgResponseTime / 1000);
  }

  /**
   * 计算 Token 预算
   */
  private calculateTokenBudget(agent: AgentCapability, _task: Task): number {
    void _task;
    // 分配剩余预算的 80% 给任务
    return Math.floor(agent.tokenBudget * 0.8);
  }

  // ============================================================================
  // 上下文压缩（4x/8x 量化）
  // ============================================================================

  /**
   * 压缩上下文
   */
  async compressContext(context: string, ratio: 4 | 8 = 4): Promise<string> {
    this.compressionRatio = ratio;
    
    // 简化实现：提取关键信息
    const sentences = context.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    // 根据压缩比选择关键句子
    const keepCount = Math.max(1, Math.floor(sentences.length / ratio));
    const keySentences = sentences.slice(0, keepCount);
    
    logger.info(`🗜️ 上下文压缩：${context.length} → ${keySentences.join('. ').length} chars (${ratio}x)`);
    
    return keySentences.join('. ') + '.';
  }

  /**
   * 解压缩上下文（重建）
   */
  async decompressContext(compressed: string, originalContext: string): Promise<string> {
    // 简化实现：返回原始上下文
    // 实际实现应该使用模型重建
    return originalContext;
  }

  // ============================================================================
  // 冲突检测
  // ============================================================================

  /**
   * 检测多 Agent 输出冲突
   */
  async detectConflicts(outputs: Map<string, any>): Promise<ConflictReport> {
    const conflicts: Conflict[] = [];

    const outputArray = Array.from(outputs.entries());
    
    for (let i = 0; i < outputArray.length; i++) {
      for (let j = i + 1; j < outputArray.length; j++) {
        const [agent1, output1] = outputArray[i];
        const [agent2, output2] = outputArray[j];

        // 检测输出不一致
        if (this.hasOutputMismatch(output1, output2)) {
          conflicts.push({
            type: 'output_mismatch',
            agents: [agent1, agent2],
            description: `Agent ${agent1} 和 ${agent2} 输出不一致`,
            suggestion: '使用投票机制或指定权威 Agent 裁决'
          });
        }

        // 检测状态不一致
        if (this.hasStateInconsistency(output1, output2)) {
          conflicts.push({
            type: 'state_inconsistency',
            agents: [agent1, agent2],
            description: `Agent ${agent1} 和 ${agent2} 状态不同步`,
            suggestion: '同步共享状态或重新执行依赖任务'
          });
        }
      }
    }

    const severity = this.calculateConflictSeverity(conflicts);

    return {
      hasConflict: conflicts.length > 0,
      conflicts,
      severity,
      resolution: this.generateResolution(conflicts)
    };
  }

  /**
   * 检测输出不匹配
   */
  private hasOutputMismatch(output1: any, output2: any): boolean {
    // 简化实现：比较关键属性
    if (typeof output1 === 'object' && typeof output2 === 'object') {
      const keys1 = Object.keys(output1);
      const keys2 = Object.keys(output2);
      
      // 检查共同键的值是否一致
      const commonKeys = keys1.filter(k => keys2.includes(k));
      for (const key of commonKeys) {
        if (JSON.stringify(output1[key]) !== JSON.stringify(output2[key])) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 检测状态不一致
   */
  private hasStateInconsistency(output1: any, output2: any): boolean {
    // 检查是否有状态字段冲突
    const state1 = output1?.state || output1?.status;
    const state2 = output2?.state || output2?.status;
    
    if (state1 && state2 && state1 !== state2) {
      return true;
    }
    return false;
  }

  /**
   * 计算冲突严重程度
   */
  private calculateConflictSeverity(conflicts: Conflict[]): 'low' | 'medium' | 'high' {
    if (conflicts.length === 0) return 'low';
    
    const highSeverityCount = conflicts.filter(c => 
      c.type === 'state_inconsistency' || c.type === 'dependency_cycle'
    ).length;

    if (highSeverityCount > 0) return 'high';
    if (conflicts.length > 3) return 'high';
    if (conflicts.length > 1) return 'medium';
    return 'low';
  }

  /**
   * 生成解决方案
   */
  private generateResolution(conflicts: Conflict[]): string {
    if (conflicts.length === 0) {
      return '无冲突，无需解决';
    }

    const suggestions = [...new Set(conflicts.map(c => c.suggestion))];
    return `建议：${suggestions.join('；')}`;
  }

  // ============================================================================
  // 协同记忆
  // ============================================================================

  /**
   * 创建协同记忆
   */
  createCollaborativeMemory(taskId: string): CollaborativeMemory {
    const memory: CollaborativeMemory = {
      taskId,
      sharedContext: new Map(),
      agentOutputs: new Map(),
      conflicts: [],
      resolutions: []
    };

    this.memory.set(taskId, memory);
    logger.info(`🧠 创建协同记忆：${taskId}`);

    return memory;
  }

  /**
   * 添加 Agent 输出到记忆
   */
  addAgentOutput(taskId: string, agentId: string, output: any): void {
    const memory = this.memory.get(taskId);
    if (memory) {
      memory.agentOutputs.set(agentId, output);
      logger.info(`📝 添加 Agent 输出：${agentId} → ${taskId}`);
    }
  }

  /**
   * 获取共享上下文
   */
  getSharedContext(taskId: string): Map<string, unknown> {
    const memory = this.memory.get(taskId);
    return memory?.sharedContext || new Map();
  }

  /**
   * 更新共享上下文
   */
  updateSharedContext(taskId: string, key: string, value: unknown): void {
    const memory = this.memory.get(taskId);
    if (memory) {
      memory.sharedContext.set(key, value);
    }
  }

  // ============================================================================
  // 统计与监控
  // ============================================================================

  /**
   * 获取路由统计
   */
  getStats(): Record<string, any> {
    const assignments = Array.from(this.taskHistory.values());
    
    return {
      totalTasks: assignments.length,
      uniqueAgents: this.agents.size,
      avgConfidence: assignments.length > 0
        ? assignments.reduce((sum, a) => sum + a.confidence, 0) / assignments.length
        : 0,
      activeAgents: Array.from(this.agents.values()).filter(a => a.load > 0).length,
      memorySize: this.memory.size
    };
  }

  /**
   * 清除历史记忆
   */
  clearMemory(taskId?: string): void {
    if (taskId) {
      this.memory.delete(taskId);
      logger.info(`🗑️ 清除记忆：${taskId}`);
    } else {
      this.memory.clear();
      logger.info('🗑️ 清除所有记忆');
    }
  }
}

// ============================================================================
// 导出
// ============================================================================

export function createAgentRouter(): AgentRouter {
  return new AgentRouter();
}
