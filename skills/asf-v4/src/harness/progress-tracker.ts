/**
 * ANFSF V2.0 - Progress Tracker
 * 
 * 轻量级进度追踪器，基于 MemPalace 扩展，无需新建 feature_list.json。
 * 追踪功能完成状态和会话进度。
 */

import {
  ProgressTrackerConfig,
  SessionProgress,
  ProgressLog,
  FeatureListItem,
  FeatureList,
  FeatureStatus
} from './types';
import { createModuleLogger } from '../utils/logger';

const logger = createModuleLogger('ProgressTracker');

// ============================================================================
// 默认配置
// ============================================================================

const DEFAULT_CONFIG: ProgressTrackerConfig = {
  featureListPath: './feature-list.json',
  progressLogPath: './progress.txt',
  gitRepoPath: undefined,
  enableGitIntegration: false
};

// ============================================================================
// Progress Tracker Class
// ============================================================================

export class ProgressTracker {
  private config: ProgressTrackerConfig;
  private featureList: FeatureList | null = null;
  private progressLog: ProgressLog | null = null;

  constructor(config?: Partial<ProgressTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 初始化进度追踪器
   */
  async initialize(projectId: string): Promise<void> {
    logger.info(`📋 初始化进度追踪器：${projectId}`);

    // 创建功能清单（如果不存在）
    if (!this.featureList) {
      this.featureList = {
        projectId,
        version: '1.0.0',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        features: [],
        metadata: {
          originalPrompt: '',
          expandedSpec: {
            title: projectId,
            description: '',
            targetUsers: [],
            coreValue: '',
            successCriteria: [],
            constraints: [],
            aiFeatureOpportunities: []
          },
          totalFeatures: 0,
          completedFeatures: 0
        }
      };
      logger.info(`✅ 功能清单已创建`);
    }

    // 创建进度日志（如果不存在）
    if (!this.progressLog) {
      this.progressLog = {
        projectId,
        sessions: [],
        blockedFeatures: [],
        lastUpdatedAt: Date.now()
      };
      logger.info(`✅ 进度日志已创建`);
    }
  }

  /**
   * 加载功能清单
   */
  async loadFeatureList(featureList: FeatureListItem[]): Promise<void> {
    if (!this.featureList) {
      throw new Error('ProgressTracker not initialized');
    }

    this.featureList.features = featureList;
    this.featureList.metadata.totalFeatures = featureList.length;
    this.featureList.updatedAt = Date.now();

    logger.info(`📦 功能清单已加载：${featureList.length} 个功能点`);
  }

  /**
   * 开始新会话
   */
  async startSession(sessionId: string): Promise<SessionContext> {
    if (!this.featureList || !this.progressLog) {
      throw new Error('ProgressTracker not initialized');
    }

    logger.info(`🚀 开始新会话：${sessionId}`);

    // 读取最近进度（最近 10 条记录）
    const recentProgress = this.progressLog.sessions.slice(-10);

    // 选择下一个要完成的功能
    const nextFeature = this.selectNextFeature();

    // 获取阻塞的功能
    const blockedFeatures = this.progressLog.blockedFeatures;

    logger.info(`📋 下一个功能：${nextFeature?.id || '无'}`);

    return {
      sessionId,
      featureList: this.featureList.features,
      recentProgress,
      nextFeature,
      blockedFeatures
    };
  }

  /**
   * 结束会话
   */
  async endSession(progress: SessionProgress): Promise<void> {
    if (!this.featureList || !this.progressLog) {
      throw new Error('ProgressTracker not initialized');
    }

    logger.info(`✅ 结束会话：${progress.sessionId}`);

    // 更新功能状态
    for (const featureId of progress.featuresCompleted) {
      this.updateFeatureStatus(featureId, 'completed', true);
    }

    // 记录会话进度
    this.progressLog.sessions.push(progress);
    this.progressLog.lastUpdatedAt = Date.now();

    // 更新元数据
    this.featureList.metadata.completedFeatures = this.featureList.features.filter(
      f => f.passes
    ).length;
    this.featureList.updatedAt = Date.now();

    logger.info(`📊 完成进度：${this.featureList.metadata.completedFeatures}/${this.featureList.metadata.totalFeatures}`);
  }

  /**
   * 更新功能状态
   */
  updateFeatureStatus(
    featureId: string,
    status: FeatureStatus,
    passes: boolean
  ): boolean {
    if (!this.featureList) {
      return false;
    }

    const feature = this.featureList.features.find(f => f.id === featureId);
    if (!feature) {
      logger.warn(`⚠️ 功能未找到：${featureId}`);
      return false;
    }

    feature.status = status;
    feature.passes = passes;
    if (passes) {
      feature.completedAt = Date.now();
    }

    logger.info(`🔄 功能状态更新：${featureId} -> ${status}, passes=${passes}`);
    return true;
  }

  /**
   * 选择下一个功能
   */
  private selectNextFeature(): FeatureListItem | undefined {
    if (!this.featureList) {
      return undefined;
    }

    // 优先级排序：P0 > P1 > P2
    // 选择第一个未完成的功能
    const pending = this.featureList.features.filter(f => !f.passes);
    
    return pending.sort((a, b) => {
      const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    })[0];
  }

  /**
   * 获取进度摘要
   */
  getProgressSummary(): ProgressSummary {
    if (!this.featureList) {
      return {
        totalFeatures: 0,
        completedFeatures: 0,
        inProgressFeatures: 0,
        pendingFeatures: 0,
        completionRate: 0
      };
    }

    const total = this.featureList.features.length;
    const completed = this.featureList.features.filter(f => f.passes).length;
    const inProgress = this.featureList.features.filter(f => f.status === 'in-progress').length;
    const pending = this.featureList.features.filter(f => f.status === 'pending').length;

    return {
      totalFeatures: total,
      completedFeatures: completed,
      inProgressFeatures: inProgress,
      pendingFeatures: pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0
    };
  }

  /**
   * 导出功能清单（JSON 格式）
   */
  exportFeatureList(): string {
    if (!this.featureList) {
      return '[]';
    }
    return JSON.stringify(this.featureList, null, 2);
  }

  /**
   * 导出进度日志
   */
  exportProgressLog(): string {
    if (!this.progressLog) {
      return '[]';
    }

    const lines: string[] = [
      `项目：${this.progressLog.projectId}`,
      `最后更新：${new Date(this.progressLog.lastUpdatedAt).toISOString()}`,
      '',
      '=== 会话记录 ==='
    ];

    for (const session of this.progressLog.sessions.slice(-10)) {
      lines.push(
        `会话：${session.sessionId}`,
        `  时间：${new Date(session.startTime).toISOString()} - ${new Date(session.endTime).toISOString()}`,
        `  完成功能：${session.featuresCompleted.length}`,
        `  问题：${session.issues.length}`,
        ''
      );
    }

    return lines.join('\n');
  }
}

// ============================================================================
// Auxiliary Types
// ============================================================================

export interface SessionContext {
  sessionId: string;
  featureList: FeatureListItem[];
  recentProgress: SessionProgress[];
  nextFeature?: FeatureListItem;
  blockedFeatures: string[];
}

export interface ProgressSummary {
  totalFeatures: number;
  completedFeatures: number;
  inProgressFeatures: number;
  pendingFeatures: number;
  completionRate: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createProgressTracker(config?: Partial<ProgressTrackerConfig>): ProgressTracker {
  return new ProgressTracker(config);
}
