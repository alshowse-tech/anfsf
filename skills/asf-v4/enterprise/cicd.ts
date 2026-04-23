/**
 * CI/CD Manager - 持续集成/持续部署
 * 
 * 支持自动化测试、自动化部署、版本管理
 */
import { v4 as uuidv4 } from 'uuid'

export interface Pipeline {
  id: string
  name: string
  projectId: string
  stages: PipelineStage[]
  triggers: PipelineTrigger[]
  status: 'active' | 'paused' | 'disabled'
  createdAt: Date
  updatedAt: Date
}

export interface PipelineStage {
  id: string
  name: string
  type: 'build' | 'test' | 'deploy' | 'notify'
  commands: string[]
  timeout: number
  onFailure: 'stop' | 'continue' | 'rollback'
}

export interface PipelineTrigger {
  type: 'push' | 'pull_request' | 'schedule' | 'manual'
  branch?: string
  schedule?: string // cron expression
}

export interface PipelineRun {
  id: string
  pipelineId: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled'
  triggeredBy: string
  triggerType: string
  startedAt?: Date
  completedAt?: Date
  stages: StageRun[]
  logs: string[]
}

export interface StageRun {
  id: string
  stageId: string
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
  startedAt?: Date
  completedAt?: Date
  logs: string[]
}

export interface Version {
  id: string
  projectId: string
  version: string
  commitHash: string
  branch: string
  description: string
  createdAt: Date
  createdBy: string
  pipelineRunId?: string
}

export class CICDManager {
  private pipelines: Map<string, Pipeline> = new Map()
  private runs: Map<string, PipelineRun> = new Map()
  private versions: Map<string, Version[]> = new Map()

  /**
   * 创建流水线
   */
  createPipeline(
    name: string,
    projectId: string,
    stages: PipelineStage[],
    triggers: PipelineTrigger[]
  ): Pipeline {
    const pipeline: Pipeline = {
      id: uuidv4(),
      name,
      projectId,
      stages,
      triggers,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    this.pipelines.set(pipeline.id, pipeline)
    return pipeline
  }

  /**
   * 获取流水线
   */
  getPipeline(pipelineId: string): Pipeline | undefined {
    return this.pipelines.get(pipelineId)
  }

  /**
   * 获取项目的所有流水线
   */
  getProjectPipelines(projectId: string): Pipeline[] {
    return Array.from(this.pipelines.values()).filter(p => p.projectId === projectId)
  }

  /**
   * 触发流水线
   */
  triggerPipeline(
    pipelineId: string,
    triggeredBy: string,
    triggerType: string = 'manual'
  ): PipelineRun {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`)
    }

    const run: PipelineRun = {
      id: uuidv4(),
      pipelineId,
      status: 'pending',
      triggeredBy,
      triggerType,
      startedAt: new Date(),
      stages: pipeline.stages.map(s => ({
        id: uuidv4(),
        stageId: s.id,
        status: 'pending',
        logs: []
      })),
      logs: []
    }

    this.runs.set(run.id, run)
    
    // 异步执行流水线
    this.executePipeline(run)

    return run
  }

  /**
   * 执行流水线
   */
  private async executePipeline(run: PipelineRun): Promise<void> {
    run.status = 'running'
    const pipeline = this.pipelines.get(run.pipelineId)
    
    if (!pipeline) {
      run.status = 'failed'
      run.completedAt = new Date()
      return
    }

    for (let i = 0; i < pipeline.stages.length; i++) {
      const stage = pipeline.stages[i]
      const stageRun = run.stages[i]
      
      stageRun.status = 'running'
      stageRun.startedAt = new Date()
      stageRun.logs.push(`[${new Date().toISOString()}] Starting stage: ${stage.name}`)

      try {
        // 模拟执行命令
        await this.executeStage(stage, stageRun)
        
        stageRun.status = 'success'
        stageRun.completedAt = new Date()
        stageRun.logs.push(`[${new Date().toISOString()}] Stage completed successfully`)
        
      } catch (error: any) {
        stageRun.status = 'failed'
        stageRun.completedAt = new Date()
        stageRun.logs.push(`[${new Date().toISOString()}] Stage failed: ${error.message}`)
        
        if (stage.onFailure === 'stop') {
          run.status = 'failed'
          run.completedAt = new Date()
          return
        } else if (stage.onFailure === 'rollback') {
          await this.rollback(run, i)
          run.status = 'failed'
          run.completedAt = new Date()
          return
        }
        // continue: 继续执行下一阶段
      }
    }

    run.status = 'success'
    run.completedAt = new Date()
  }

  /**
   * 执行阶段
   */
  private async executeStage(stage: PipelineStage, stageRun: StageRun): Promise<void> {
    for (const command of stage.commands) {
      stageRun.logs.push(`[${new Date().toISOString()}] Executing: ${command}`)
      
      // 模拟命令执行
      await new Promise(resolve => setTimeout(resolve, 100))
      
      stageRun.logs.push(`[${new Date().toISOString()}] Command completed`)
    }
  }

  /**
   * 回滚
   */
  private async rollback(run: PipelineRun, failedStageIndex: number): Promise<void> {
    run.logs.push(`[${new Date().toISOString()}] Starting rollback from stage ${failedStageIndex}`)
    
    // 回滚逻辑
    for (let i = failedStageIndex - 1; i >= 0; i--) {
      const stageRun = run.stages[i]
      stageRun.logs.push(`[${new Date().toISOString()}] Rolling back stage`)
    }
  }

  /**
   * 获取流水线运行记录
   */
  getPipelineRun(runId: string): PipelineRun | undefined {
    return this.runs.get(runId)
  }

  /**
   * 获取流水线的所有运行记录
   */
  getPipelineRuns(pipelineId: string, limit: number = 10): PipelineRun[] {
    return Array.from(this.runs.values())
      .filter(r => r.pipelineId === pipelineId)
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0))
      .slice(0, limit)
  }

  /**
   * 取消运行中的流水线
   */
  cancelRun(runId: string): boolean {
    const run = this.runs.get(runId)
    if (!run || run.status !== 'running') return false

    run.status = 'cancelled'
    run.completedAt = new Date()
    run.logs.push(`[${new Date().toISOString()}] Pipeline cancelled by user`)

    return true
  }

  /**
   * 创建版本
   */
  createVersion(
    projectId: string,
    version: string,
    commitHash: string,
    branch: string,
    description: string,
    createdBy: string,
    pipelineRunId?: string
  ): Version {
    const versionObj: Version = {
      id: uuidv4(),
      projectId,
      version,
      commitHash,
      branch,
      description,
      createdAt: new Date(),
      createdBy,
      pipelineRunId
    }

    const projectVersions = this.versions.get(projectId) || []
    projectVersions.push(versionObj)
    this.versions.set(projectId, projectVersions)

    return versionObj
  }

  /**
   * 获取项目版本列表
   */
  getProjectVersions(projectId: string, limit: number = 20): Version[] {
    const versions = this.versions.get(projectId) || []
    return versions
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  /**
   * 获取最新版本
   */
  getLatestVersion(projectId: string): Version | undefined {
    const versions = this.getProjectVersions(projectId, 1)
    return versions[0]
  }

  /**
   * 删除版本
   */
  deleteVersion(projectId: string, versionId: string): boolean {
    const versions = this.versions.get(projectId) || []
    const filtered = versions.filter(v => v.id !== versionId)
    
    if (filtered.length === versions.length) return false

    this.versions.set(projectId, filtered)
    return true
  }

  /**
   * 更新流水线状态
   */
  updatePipelineStatus(pipelineId: string, status: 'active' | 'paused' | 'disabled'): boolean {
    const pipeline = this.pipelines.get(pipelineId)
    if (!pipeline) return false

    pipeline.status = status
    pipeline.updatedAt = new Date()

    return true
  }

  /**
   * 删除流水线
   */
  deletePipeline(pipelineId: string): boolean {
    return this.pipelines.delete(pipelineId)
  }

  /**
   * 获取流水线统计信息
   */
  getPipelineStats(pipelineId: string): {
    totalRuns: number
    successRuns: number
    failedRuns: number
    avgDuration: number
  } {
    const runs = Array.from(this.runs.values()).filter(r => r.pipelineId === pipelineId)
    
    const successRuns = runs.filter(r => r.status === 'success').length
    const failedRuns = runs.filter(r => r.status === 'failed').length
    
    const durations = runs
      .filter(r => r.startedAt && r.completedAt)
      .map(r => r.completedAt!.getTime() - r.startedAt!.getTime())
    
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0

    return {
      totalRuns: runs.length,
      successRuns,
      failedRuns,
      avgDuration
    }
  }
}
