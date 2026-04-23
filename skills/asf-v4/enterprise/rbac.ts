/**
 * RBAC - 基于角色的访问控制
 * 
 * 支持细粒度权限控制、角色继承、权限检查
 */
import { v4 as uuidv4 } from 'uuid'

/**
 * 权限定义
 */
export interface Permission {
  id: string
  name: string
  description: string
  resource: string
  action: string
  scope: 'global' | 'project' | 'personal'
}

/**
 * 角色定义
 */
export interface Role {
  id: string
  name: string
  description: string
  permissions: string[]
  inheritedFrom?: string
  createdAt: Date
}

/**
 * 用户角色分配
 */
export interface UserRole {
  userId: string
  roleId: string
  scope: string
  assignedBy: string
  assignedAt: Date
}

/**
 * 权限检查上下文
 */
export interface PermissionContext {
  userId: string
  resource: string
  action: string
  scope?: string
}

export class RBACManager {
  private permissions: Map<string, Permission> = new Map()
  private roles: Map<string, Role> = new Map()
  private userRoles: Map<string, UserRole[]> = new Map()

  constructor() {
    this.registerDefaultPermissions()
    this.registerDefaultRoles()
  }

  /**
   * 注册默认权限
   */
  private registerDefaultPermissions() {
    const defaultPermissions: Permission[] = [
      // 项目权限
      { id: 'project:read', name: '查看项目', description: '查看项目信息', resource: 'project', action: 'read', scope: 'project' },
      { id: 'project:write', name: '编辑项目', description: '编辑项目信息', resource: 'project', action: 'write', scope: 'project' },
      { id: 'project:delete', name: '删除项目', description: '删除项目', resource: 'project', action: 'delete', scope: 'project' },
      
      // 任务权限
      { id: 'task:create', name: '创建任务', description: '创建新任务', resource: 'task', action: 'create', scope: 'project' },
      { id: 'task:read', name: '查看任务', description: '查看任务信息', resource: 'task', action: 'read', scope: 'project' },
      { id: 'task:write', name: '编辑任务', description: '编辑任务', resource: 'task', action: 'write', scope: 'project' },
      { id: 'task:delete', name: '删除任务', description: '删除任务', resource: 'task', action: 'delete', scope: 'project' },
      { id: 'task:execute', name: '执行任务', description: '执行任务', resource: 'task', action: 'execute', scope: 'project' },
      
      // 用户权限
      { id: 'user:read', name: '查看用户', description: '查看用户信息', resource: 'user', action: 'read', scope: 'global' },
      { id: 'user:write', name: '编辑用户', description: '编辑用户信息', resource: 'user', action: 'write', scope: 'global' },
      { id: 'user:delete', name: '删除用户', description: '删除用户', resource: 'user', action: 'delete', scope: 'global' },
      
      // 角色权限
      { id: 'role:read', name: '查看角色', description: '查看角色信息', resource: 'role', action: 'read', scope: 'global' },
      { id: 'role:write', name: '编辑角色', description: '编辑角色', resource: 'role', action: 'write', scope: 'global' },
      { id: 'role:assign', name: '分配角色', description: '分配角色给用户', resource: 'role', action: 'assign', scope: 'project' },
      
      // 系统权限
      { id: 'system:admin', name: '系统管理员', description: '系统管理权限', resource: 'system', action: 'admin', scope: 'global' },
      { id: 'system:config', name: '系统配置', description: '系统配置权限', resource: 'system', action: 'config', scope: 'global' }
    ]

    defaultPermissions.forEach(p => this.permissions.set(p.id, p))
  }

  /**
   * 注册默认角色
   */
  private registerDefaultRoles() {
    const defaultRoles: Role[] = [
      // 超级管理员
      {
        id: 'super-admin',
        name: '超级管理员',
        description: '拥有所有权限',
        permissions: Array.from(this.permissions.keys()),
        createdAt: new Date()
      },
      
      // 项目管理员
      {
        id: 'project-admin',
        name: '项目管理员',
        description: '项目管理权限',
        permissions: [
          'project:read', 'project:write',
          'task:create', 'task:read', 'task:write', 'task:delete', 'task:execute',
          'user:read',
          'role:read', 'role:assign'
        ],
        createdAt: new Date()
      },
      
      // 开发者
      {
        id: 'developer',
        name: '开发者',
        description: '开发和执行权限',
        permissions: [
          'project:read',
          'task:create', 'task:read', 'task:write', 'task:execute',
          'user:read'
        ],
        createdAt: new Date()
      },
      
      // 观察者
      {
        id: 'viewer',
        name: '观察者',
        description: '只读权限',
        permissions: [
          'project:read',
          'task:read',
          'user:read'
        ],
        createdAt: new Date()
      }
    ]

    defaultRoles.forEach(r => this.roles.set(r.id, r))
  }

  /**
   * 创建自定义角色
   */
  createRole(
    name: string,
    description: string,
    permissions: string[],
    inheritedFrom?: string
  ): Role {
    const role: Role = {
      id: uuidv4(),
      name,
      description,
      permissions,
      inheritedFrom,
      createdAt: new Date()
    }

    this.roles.set(role.id, role)
    return role
  }

  /**
   * 分配角色给用户
   */
  assignRole(
    userId: string,
    roleId: string,
    scope: string,
    assignedBy: string
  ): boolean {
    const role = this.roles.get(roleId)
    if (!role) return false

    const userRoleList = this.userRoles.get(userId) || []
    
    // 移除同一作用域的旧角色
    const filtered = userRoleList.filter(ur => ur.scope !== scope)
    
    filtered.push({
      userId,
      roleId,
      scope,
      assignedBy,
      assignedAt: new Date()
    })

    this.userRoles.set(userId, filtered)
    return true
  }

  /**
   * 移除用户角色
   */
  removeRole(userId: string, roleId: string, scope?: string): boolean {
    const userRoleList = this.userRoles.get(userId) || []
    
    const filtered = userRoleList.filter(ur => {
      if (ur.roleId !== roleId) return true
      if (scope && ur.scope !== scope) return true
      return false
    })

    if (filtered.length === userRoleList.length) return false

    this.userRoles.set(userId, filtered)
    return true
  }

  /**
   * 检查用户权限
   */
  hasPermission(context: PermissionContext): boolean {
    const { userId, resource, action, scope } = context
    const requiredPermission = `${resource}:${action}`

    // 获取用户所有角色
    const userRoleList = this.userRoles.get(userId) || []
    
    // 收集所有权限 (包括继承)
    const allPermissions = new Set<string>()

    for (const userRole of userRoleList) {
      // 检查作用域
      if (scope && userRole.scope !== scope && userRole.scope !== 'global') {
        continue
      }

      const role = this.roles.get(userRole.roleId)
      if (!role) continue

      // 添加角色权限
      role.permissions.forEach(p => allPermissions.add(p))

      // 添加继承角色权限
      if (role.inheritedFrom) {
        const parentRole = this.roles.get(role.inheritedFrom)
        if (parentRole) {
          parentRole.permissions.forEach(p => allPermissions.add(p))
        }
      }
    }

    // 检查是否有所需权限
    return allPermissions.has(requiredPermission) || allPermissions.has('system:admin')
  }

  /**
   * 检查多个权限 (任意一个满足即可)
   */
  hasAnyPermission(context: PermissionContext, permissions: string[]): boolean {
    return permissions.some(p => {
      const [resource, action] = p.split(':')
      return this.hasPermission({ ...context, resource, action })
    })
  }

  /**
   * 检查多个权限 (所有都必须满足)
   */
  hasAllPermissions(context: PermissionContext, permissions: string[]): boolean {
    return permissions.every(p => {
      const [resource, action] = p.split(':')
      return this.hasPermission({ ...context, resource, action })
    })
  }

  /**
   * 获取用户所有角色
   */
  getUserRoles(userId: string, scope?: string): Role[] {
    const userRoleList = this.userRoles.get(userId) || []
    
    const filtered = scope 
      ? userRoleList.filter(ur => ur.scope === scope || ur.scope === 'global')
      : userRoleList

    return filtered
      .map(ur => this.roles.get(ur.roleId))
      .filter((r): r is Role => r !== undefined)
  }

  /**
   * 获取角色信息
   */
  getRole(roleId: string): Role | undefined {
    return this.roles.get(roleId)
  }

  /**
   * 获取所有角色
   */
  listRoles(): Role[] {
    return Array.from(this.roles.values())
  }

  /**
   * 获取所有权限
   */
  listPermissions(): Permission[] {
    return Array.from(this.permissions.values())
  }

  /**
   * 更新角色权限
   */
  updateRolePermissions(roleId: string, permissions: string[]): boolean {
    const role = this.roles.get(roleId)
    if (!role) return false

    role.permissions = permissions
    return true
  }

  /**
   * 删除角色
   */
  deleteRole(roleId: string): boolean {
    // 不能删除默认角色
    const defaultRoles = ['super-admin', 'project-admin', 'developer', 'viewer']
    if (defaultRoles.includes(roleId)) return false

    return this.roles.delete(roleId)
  }
}
