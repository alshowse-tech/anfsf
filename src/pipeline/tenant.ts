/**
 * ANFSF Pipeline — Tenant Management (GAP-16)
 *
 * Multi-tenant support for pipeline execution.
 * Each tenant has isolated projects, checkpoints, and data.
 */

import * as fs from "fs";
import * as path from "path";

export interface Tenant {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  enabled: boolean;
}

const TENANTS_FILE = ".anfsf/tenants.json";
export const DEFAULT_TENANT_ID = "default";

let _instance: TenantRegistry | null = null;

export class TenantRegistry {
  private tenants: Map<string, Tenant> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;
    try {
      if (fs.existsSync(TENANTS_FILE)) {
        const data = JSON.parse(fs.readFileSync(TENANTS_FILE, "utf-8")) as Tenant[];
        for (const t of data) this.tenants.set(t.id, t);
      }
    } catch { /* no file yet */ }
    if (!this.tenants.has(DEFAULT_TENANT_ID)) {
      this.tenants.set(DEFAULT_TENANT_ID, {
        id: DEFAULT_TENANT_ID,
        name: "Default Tenant",
        createdAt: Date.now(),
        enabled: true,
      });
    }
    this.initialized = true;
  }

  register(tenant: Tenant): void {
    this.tenants.set(tenant.id, tenant);
    this.persist();
  }

  get(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  list(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  remove(id: string): boolean {
    if (id === DEFAULT_TENANT_ID) return false;
    const result = this.tenants.delete(id);
    if (result) this.persist();
    return result;
  }

  clear(): void { this.tenants.clear(); this.initialized=false; try { fs.rmSync(TENANTS_FILE,{force:true}); } catch {} }

  size(): number { return this.tenants.size; }

  private persist(): void {
    try {
      const dir = path.dirname(TENANTS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(TENANTS_FILE, JSON.stringify(Array.from(this.tenants.values()), null, 2), "utf-8");
    } catch { /* best-effort */ }
  }
}

export function getTenantRegistry(): TenantRegistry {
  if (!_instance) { _instance = new TenantRegistry(); }
  return _instance;
}

export function resetTenantRegistry(): void {
  _instance = null;
}
