import { FastifyInstance } from "fastify";
import { getProjectRegistry } from "../../pipeline/project";

export function registerProjectRoutes(app: FastifyInstance): void {
  const registry = getProjectRegistry();

  app.get("/api/v1/projects", async (req) => {
    const query = req.query as { tenantId?: string };
    const projects = registry.list(query.tenantId).map(p => ({
      id: p.id, name: p.name, tenantId: p.tenantId,
      projectState: p.projectState, createdAt: p.createdAt,
    }));
    return { projects, total: projects.length };
  });

  app.post("/api/v1/projects", async (req) => {
    const body = req.body as { name: string; prdText?: string; tenantId?: string };
    if (!body.name) return { status: "error", error: { code: "MISSING_NAME", message: "Project name is required" } };
    const project = registry.create(body.name, body.prdText || "", body.tenantId);
    return { status: "ok", project };
  });

  app.get("/api/v1/projects/:id", async (req) => {
    const params = req.params as { id: string };
    const project = registry.get(params.id);
    if (!project) return { status: "error", error: { code: "NOT_FOUND", message: "Project not found" } };
    return { status: "ok", project };
  });

  app.delete("/api/v1/projects/:id", async (req) => {
    const params = req.params as { id: string };
    const removed = registry.remove(params.id);
    if (!removed) return { status: "error", error: { code: "NOT_FOUND", message: "Project not found" } };
    return { status: "ok" };
  });

  app.patch("/api/v1/projects/:id/state", async (req) => {
    const params = req.params as { id: string };
    const body = req.body as { state: string };
    if (!body.state) return { status: "error", error: { code: "MISSING_STATE", message: "State is required" } };
    const success = registry.updateState(params.id, body.state);
    if (!success) return { status: "error", error: { code: "NOT_FOUND", message: "Project not found" } };
    return { status: "ok" };
  });
}
