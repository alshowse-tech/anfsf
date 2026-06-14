/**
 * ANFSF Pipeline ? Project Management (GAP-17)
 *
 * Project registry for multi-project support.
 * Each project has a name, PRD text, and current pipeline state.
 */

import { DEFAULT_TENANT_ID } from "./tenant";

export interface Project {
  id: string;
  name: string;
  description?: string;
  prdText: string;
  tenantId: string;
  projectState: string;
  createdAt: number;
  updatedAt: number;
}

let _projectRegistry: ProjectRegistry | null = null;

export class ProjectRegistry {
  private projects: Map<string, Project> = new Map();

  create(name: string, prdText: string, tenantId: string = DEFAULT_TENANT_ID): Project {
    const id = "proj_" + Math.random().toString(36).slice(2, 10) + "_" + Date.now();
    const now = Date.now();
    const project: Project = { id, name, prdText, tenantId, projectState: "created", createdAt: now, updatedAt: now };
    this.projects.set(id, project);
    return project;
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  list(tenantId?: string): Project[] {
    const all = Array.from(this.projects.values());
    if (tenantId) return all.filter(p => p.tenantId === tenantId);
    return all;
  }

  updateState(id: string, state: string): boolean {
    const p = this.projects.get(id);
    if (!p) return false;
    p.projectState = state;
    p.updatedAt = Date.now();
    return true;
  }

  remove(id: string): boolean {
    return this.projects.delete(id);
  }

  size(): number { return this.projects.size; }
}

export function getProjectRegistry(): ProjectRegistry {
  if (!_projectRegistry) _projectRegistry = new ProjectRegistry();
  return _projectRegistry;
}

export function resetProjectRegistry(): void {
  _projectRegistry = null;
}
