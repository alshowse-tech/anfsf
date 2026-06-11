/**
 * ANFSF Server — Role-Based Access Control (T-401)
 *
 * Phase 1: Single-user mode with role definitions.
 * Phase 3+: Multi-user with full permission matrix.
 */

// ============================================================================
// Types
// ============================================================================

export type ProjectRole = 'admin' | 'pm' | 'frontend' | 'backend' | 'qa' | 'devops' | 'viewer';

export interface ProjectMember {
  userId: string;
  projectId: string;
  role: ProjectRole;
  isLead: boolean;       // Lead has confirmation authority for their role
  joinedAt: number;
}

export interface RolePermissions {
  canViewAll: boolean;
  canEditPRD: boolean;
  canConfirmRequirements: boolean;
  canEditFrontend: boolean;
  canEditBackend: boolean;
  canConfirmFixes: boolean;
  canExecuteTests: boolean;
  canRelease: boolean;
  canConfigureDeploy: boolean;
  canManageMembers: boolean;
}

// ============================================================================
// Permission Matrix
// ============================================================================

const PERMISSIONS: Record<ProjectRole, RolePermissions> = {
  admin: {
    canViewAll: true, canEditPRD: true, canConfirmRequirements: true,
    canEditFrontend: true, canEditBackend: true, canConfirmFixes: true,
    canExecuteTests: true, canRelease: true, canConfigureDeploy: true,
    canManageMembers: true,
  },
  pm: {
    canViewAll: true, canEditPRD: true, canConfirmRequirements: true,
    canEditFrontend: false, canEditBackend: false, canConfirmFixes: true,
    canExecuteTests: true, canRelease: true, canConfigureDeploy: false,
    canManageMembers: false,
  },
  frontend: {
    canViewAll: true, canEditPRD: false, canConfirmRequirements: false,
    canEditFrontend: true, canEditBackend: false, canConfirmFixes: true,
    canExecuteTests: false, canRelease: false, canConfigureDeploy: false,
    canManageMembers: false,
  },
  backend: {
    canViewAll: true, canEditPRD: false, canConfirmRequirements: false,
    canEditFrontend: false, canEditBackend: true, canConfirmFixes: true,
    canExecuteTests: false, canRelease: false, canConfigureDeploy: false,
    canManageMembers: false,
  },
  qa: {
    canViewAll: true, canEditPRD: false, canConfirmRequirements: false,
    canEditFrontend: false, canEditBackend: false, canConfirmFixes: false,
    canExecuteTests: true, canRelease: false, canConfigureDeploy: false,
    canManageMembers: false,
  },
  devops: {
    canViewAll: true, canEditPRD: false, canConfirmRequirements: false,
    canEditFrontend: false, canEditBackend: false, canConfirmFixes: false,
    canExecuteTests: false, canRelease: false, canConfigureDeploy: true,
    canManageMembers: false,
  },
  viewer: {
    canViewAll: true, canEditPRD: false, canConfirmRequirements: false,
    canEditFrontend: false, canEditBackend: false, canConfirmFixes: false,
    canExecuteTests: false, canRelease: false, canConfigureDeploy: false,
    canManageMembers: false,
  },
};

// ============================================================================
// Role Manager
// ============================================================================

export class RoleManager {
  private members: Map<string, ProjectMember[]> = new Map(); // projectId → members

  /** Add a member to a project */
  addMember(member: ProjectMember): void {
    const existing = this.members.get(member.projectId) || [];
    // Replace if same user already exists
    const filtered = existing.filter(m => m.userId !== member.userId);
    filtered.push(member);
    this.members.set(member.projectId, filtered);
  }

  /** Remove a member from a project */
  removeMember(projectId: string, userId: string): void {
    const existing = this.members.get(projectId) || [];
    this.members.set(projectId, existing.filter(m => m.userId !== userId));
  }

  /** Get permissions for a user in a project */
  getPermissions(userId: string, projectId: string): RolePermissions | null {
    const members = this.members.get(projectId) || [];
    const member = members.find(m => m.userId === userId);
    return member ? PERMISSIONS[member.role] : null;
  }

  /** Check if a user has a specific permission */
  can(userId: string, projectId: string, action: keyof RolePermissions): boolean {
    const perms = this.getPermissions(userId, projectId);
    return perms ? perms[action] : false;
  }

  /** Transfer role to a new member (for personnel changes) */
  transferRole(projectId: string, fromUserId: string, toUserId: string): void {
    const members = this.members.get(projectId) || [];
    const from = members.find(m => m.userId === fromUserId);
    if (!from) return;

    this.removeMember(projectId, fromUserId);
    this.addMember({
      userId: toUserId,
      projectId,
      role: from.role,
      isLead: from.isLead,
      joinedAt: Date.now(),
    });
  }

  /** Get all members of a project */
  getMembers(projectId: string): ProjectMember[] {
    return this.members.get(projectId) || [];
  }
}
