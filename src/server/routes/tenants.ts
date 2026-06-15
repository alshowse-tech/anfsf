import { FastifyInstance } from "fastify";
import { getTenantRegistry, DEFAULT_TENANT_ID } from "../../pipeline/tenant";
import { RoleManager, type ProjectRole } from "../auth/roles";

export function registerTenantRoutes(app: FastifyInstance, roleManager: RoleManager): void {
  const registry = getTenantRegistry();

  app.get("/api/v1/tenants", async () => {
    const tenants = registry.list().map(t => ({
      id: t.id, name: t.name, description: t.description,
      enabled: t.enabled, createdAt: t.createdAt,
    }));
    return { status: "ok", tenants, total: tenants.length };
  });

  app.post("/api/v1/tenants", async (req) => {
    const body = req.body as { name: string; description?: string };
    if (!body.name) return { status: "error", error: { code: "MISSING_NAME", message: "name is required" } };
    const id = "tnt_" + Math.random().toString(36).slice(2, 8) + "_" + Date.now();
    registry.register({ id, name: body.name, description: body.description, createdAt: Date.now(), enabled: true });
    return { status: "ok", tenant: registry.get(id) };
  });

  app.get("/api/v1/tenants/:id", async (req) => {
    const p = req.params as { id: string };
    const tenant = registry.get(p.id);
    if (!tenant) return { status: "error", error: { code: "NOT_FOUND", message: "Tenant not found" } };
    return { status: "ok", tenant };
  });

  app.delete("/api/v1/tenants/:id", async (req) => {
    const p = req.params as { id: string };
    if (p.id === DEFAULT_TENANT_ID) return { status: "error", error: { code: "PROTECTED", message: "Cannot delete default tenant" } };
    const removed = registry.remove(p.id);
    if (!removed) return { status: "error", error: { code: "NOT_FOUND", message: "Tenant not found" } };
    return { status: "ok" };
  });

  app.get("/api/v1/tenants/:id/members", async (req) => {
    const p = req.params as { id: string };
    const tenant = registry.get(p.id);
    if (!tenant) return { status: "error", error: { code: "NOT_FOUND", message: "Tenant not found" } };
    const members = roleManager.getMembers("_tenant:" + p.id);
    return { status: "ok", members };
  });

  app.post("/api/v1/tenants/:id/members", async (req) => {
    const p = req.params as { id: string };
    const body = req.body as { userId: string; role: string };
    if (!body.userId || !body.role) return { status: "error", error: { code: "MISSING_FIELDS", message: "userId and role required" } };
    if (!["admin","pm","frontend","backend","qa","devops","viewer"].includes(body.role)) {
      return { status: "error", error: { code: "INVALID_ROLE", message: "Invalid role" } };
    }
    roleManager.addMember({
      userId: body.userId, projectId: "_tenant:" + p.id,
      role: body.role as ProjectRole, isLead: false, joinedAt: Date.now(),
    });
    const members = roleManager.getMembers("_tenant:" + p.id);
    return { status: "ok", members };
  });

  app.delete("/api/v1/tenants/:id/members/:userId", async (req) => {
    const p = req.params as { id: string; userId: string };
    roleManager.removeMember("_tenant:" + p.id, p.userId);
    return { status: "ok" };
  });

  app.patch("/api/v1/tenants/:id/members/:userId", async (req) => {
    const p = req.params as { id: string; userId: string };
    const body = req.body as { role?: string; isLead?: boolean };
    roleManager.removeMember("_tenant:" + p.id, p.userId);
    if (body.role) {
      roleManager.addMember({
        userId: p.userId, projectId: "_tenant:" + p.id,
        role: body.role as ProjectRole, isLead: body.isLead ?? false, joinedAt: Date.now(),
      });
    }
    const members = roleManager.getMembers("_tenant:" + p.id);
    return { status: "ok", members };
  });
}