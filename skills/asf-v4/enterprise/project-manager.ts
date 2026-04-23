/**
 * Project Manager - 多项目管理
 * 
 * 支持多项目隔离、资源配额管理、跨项目协作
 */
import { v4 as uuidv4 } from 'uuid'

export interface Project {
  id: string
  name: string
  description: string
  owner: string
  members: string[]
  resources: ResourceQuota
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'archived' | 'suspended'
}

export interface ResourceQuota {
  maxAgents: number
  maxTasksPerDay: number
  maxStorageGB: number
  maxApiCallsPerMinute: number
}

export interface ProjectMember {
  userId: string
  role: 'owner' | 'admin' | 'developer' | 'viewer'
  joinedAt: Date
}

export class ProjectManager {
  private projects: Map<string, Project> = new Map()
  private members: Map<string, ProjectMember[]> = new Map()

  /**
   * 创建新项目
   */
  createProject(
    name: string,
    owner: string,
    description: string = '',
    quota?: Partial<ResourceQuota>
  ): Project {
    const project: Project = {
      id: uuidv4(),
      name,
      description,
      owner,
      members: [owner],
      resources: {
        maxAgents: 10,
        maxTasksPerDay: 10000,
        maxStorageGB: 100,
        maxApiCallsPerMinute: 1000,
        ...quota
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    }

    this.projects.set(project.id, project)
    this.members.set(project.id, [{
      userId: owner,
      role: 'owner',
      joinedAt: new Date()
    }])

    return project
  }

  /**
   * 获取项目
   */
  getProject(projectId: string): Project | undefined {
    return this.projects.get(projectId)
  }

  /**
   * 获取用户的所有项目
   */
  getUserProjects(userId: string): Project[] {
    return Array.from(this.projects.values()).filter(
      p => p.owner === userId || p.members.includes(userId)
    )
  }

  /**
   * 添加项目成员
   */
  addMember(
    projectId: string,
    userId: string,
    role: 'admin' | 'developer' | 'viewer' = 'developer'
  ): boolean {
    const project = this.projects.get(projectId)
    if (!project) return false

    const projectMembers = this.members.get(projectId) || []
    
    // 检查是否已存在
    if (projectMembers.some(m => m.userId === userId)) {
      return false
    }

    projectMembers.push({
      userId,
      role,
      joinedAt: new Date()
    })

    this.members.set(projectId, projectMembers)
    if (!project.members.includes(userId)) {
      project.members.push(userId)
      project.updatedAt = new Date()
    }

    return true
  }

  /**
   * 移除项目成员
   */
  removeMember(projectId: string, userId: string): boolean {
    const project = this.projects.get(projectId)
    if (!project) return false

    // 不能移除 owner
    if (project.owner === userId) {
      return false
    }

    const projectMembers = this.members.get(projectId) || []
    const filtered = projectMembers.filter(m => m.userId !== userId)
    this.members.set(projectId, filtered)

    project.members = project.members.filter(m => m !== userId)
    project.updatedAt = new Date()

    return true
  }

  /**
   * 更新成员角色
   */
  updateMemberRole(
    projectId: string,
    userId: string,
    role: 'admin' | 'developer' | 'viewer'
  ): boolean {
    const projectMembers = this.members.get(projectId) || []
    const member = projectMembers.find(m => m.userId === userId)
    
    if (!member) return false

    member.role = role
    this.members.set(projectId, projectMembers)

    return true
  }

  /**
   * 检查用户权限
   */
  checkPermission(
    projectId: string,
    userId: string,
    requiredRole: 'owner' | 'admin' | 'developer' | 'viewer'
  ): boolean {
    const project = this.projects.get(projectId)
    if (!project) return false

    // Owner 拥有所有权限
    if (project.owner === userId) return true

    const projectMembers = this.members.get(projectId) || []
    const member = projectMembers.find(m => m.userId === userId)
    
    if (!member) return false

    const roleHierarchy = {
      'owner': 4,
      'admin': 3,
      'developer': 2,
      'viewer': 1
    }

    return roleHierarchy[member.role] >= roleHierarchy[requiredRole]
  }

  /**
   * 获取项目成员列表
   */
  getProjectMembers(projectId: string): ProjectMember[] {
    return this.members.get(projectId) || []
  }

  /**
   * 更新项目状态
   */
  updateProjectStatus(
    projectId: string,
    status: 'active' | 'archived' | 'suspended'
  ): boolean {
    const project = this.projects.get(projectId)
    if (!project) return false

    project.status = status
    project.updatedAt = new Date()

    return true
  }

  /**
   * 检查资源配额
   */
  checkResourceQuota(projectId: string, resource: keyof ResourceQuota): boolean {
    const project = this.projects.get(projectId)
    if (!project) return false

    // 这里应该检查实际使用情况
    // 简化实现：总是返回 true
    return project.resources[resource] > 0
  }

  /**
   * 获取项目统计信息
   */
  getProjectStats(projectId: string): {
    memberCount: number
    resourceUsage: Partial<ResourceQuota>
  } | undefined {
    const project = this.projects.get(projectId)
    if (!project) return undefined

    const members = this.members.get(projectId) || []

    return {
      memberCount: members.length,
      resourceUsage: {
        maxAgents: project.resources.maxAgents,
        maxTasksPerDay: project.resources.maxTasksPerDay,
        maxStorageGB: project.resources.maxStorageGB,
        maxApiCallsPerMinute: project.resources.maxApiCallsPerMinute
      }
    }
  }

  /**
   * 删除项目
   */
  deleteProject(projectId: string): boolean {
    const project = this.projects.get(projectId)
    if (!project) return false

    // 只有 owner 可以删除项目
    // 实际实现中应该检查当前用户
    this.projects.delete(projectId)
    this.members.delete(projectId)

    return true
  }

  /**
   * 列出所有项目
   */
  listProjects(): Project[] {
    return Array.from(this.projects.values())
  }
}
