import { describe, it, expect, beforeEach } from '@jest/globals';
import { RoleManager } from '../roles';
import type { ProjectMember } from '../roles';

describe('RoleManager', () => {
  let rm: RoleManager;

  beforeEach(() => { rm = new RoleManager(); });

  it('should add a member and retrieve permissions', () => {
    rm.addMember({ userId: 'u1', projectId: 'p1', role: 'pm', isLead: true, joinedAt: Date.now() });
    const perms = rm.getPermissions('u1', 'p1');
    expect(perms).not.toBeNull();
    expect(perms!.canEditPRD).toBe(true);
    expect(perms!.canEditFrontend).toBe(false);
  });

  it('should return null for non-member', () => {
    expect(rm.getPermissions('unknown', 'p1')).toBeNull();
  });

  it('should transfer role to a new member', () => {
    rm.addMember({ userId: 'alice', projectId: 'p1', role: 'frontend', isLead: false, joinedAt: 1000 });
    rm.transferRole('p1', 'alice', 'bob');
    expect(rm.getPermissions('alice', 'p1')).toBeNull();
    expect(rm.getPermissions('bob', 'p1')!.canEditFrontend).toBe(true);
  });

  it('should remove a member', () => {
    rm.addMember({ userId: 'u1', projectId: 'p1', role: 'backend', isLead: false, joinedAt: 1000 });
    rm.removeMember('p1', 'u1');
    expect(rm.getPermissions('u1', 'p1')).toBeNull();
  });

  it('should replace member if same user re-added', () => {
    rm.addMember({ userId: 'u1', projectId: 'p1', role: 'frontend', isLead: false, joinedAt: 1000 });
    rm.addMember({ userId: 'u1', projectId: 'p1', role: 'backend', isLead: true, joinedAt: 2000 });
    const members = rm.getMembers('p1');
    expect(members).toHaveLength(1);
    expect(members[0].role).toBe('backend');
  });

  it('should isolate permissions between projects', () => {
    rm.addMember({ userId: 'u1', projectId: 'p1', role: 'pm', isLead: true, joinedAt: 1000 });
    rm.addMember({ userId: 'u1', projectId: 'p2', role: 'viewer', isLead: false, joinedAt: 2000 });
    expect(rm.getPermissions('u1', 'p1')!.canRelease).toBe(true);
    expect(rm.getPermissions('u1', 'p2')!.canRelease).toBe(false);
  });

  it('should check specific permissions via can()', () => {
    rm.addMember({ userId: 'u1', projectId: 'p1', role: 'pm', isLead: true, joinedAt: Date.now() });
    expect(rm.can('u1', 'p1', 'canRelease')).toBe(true);
    expect(rm.can('u1', 'p1', 'canEditBackend')).toBe(false);
  });
});
