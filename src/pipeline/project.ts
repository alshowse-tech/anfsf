import * as crypto from 'crypto';
/**
 * ANFSF Pipeline ? Project Management (GAP-17)
 *
 * Project registry for multi-project support.
 * Each project has a name, PRD text, and current pipeline state.
 */

import { DEFAULT_TENANT_ID } from "./tenant";
import * as fs from 'fs';
import * as path from 'path';

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
  private storagePath: string = path.resolve('.anfsf/projects.json');

  constructor() {
    this.load();
  }

  save(): void {
    try {
      if (typeof process === 'undefined') return; // browser environment
      const dir = path.dirname(this.storagePath);
      fs.mkdirSync(dir, { recursive: true });
      const data = JSON.stringify(Array.from(this.projects.entries()), null, 2);
      fs.writeFileSync(this.storagePath, data, 'utf-8');
    } catch (e) {
      console.warn('[ProjectRegistry] Failed to save projects:', e);
    }
  }

  load(): void {
    try {
      if (typeof process === 'undefined') return; // browser environment
      if (fs.existsSync(this.storagePath)) {
        const raw = fs.readFileSync(this.storagePath, 'utf-8');
        const entries: [string, Project][] = JSON.parse(raw);
        this.projects = new Map(entries);
      }
    } catch (e) {
      console.warn('[ProjectRegistry] Failed to load projects:', e);
      this.projects = new Map();
    }
  }

  create(name: string, prdText: string, tenantId: string = DEFAULT_TENANT_ID): Project {
    const id = "proj_" + crypto.randomUUID().slice(0, 8) + "_" + Date.now();
    const now = Date.now();
    const project: Project = { id, name, prdText, tenantId, projectState: "created", createdAt: now, updatedAt: now };
    this.projects.set(id, project);
    this.save();
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
    this.save();
    return true;
  }

  remove(id: string): boolean {
    const result = this.projects.delete(id);
    if (result) this.save();
    return result;
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

