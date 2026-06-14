import { FastifyInstance } from "fastify";
import { HealthDashboard } from "../../pipeline/health-dashboard";

export function registerDashboardRoutes(app: FastifyInstance): void {
  app.get("/api/v1/dashboard", async () => {
    var d=new HealthDashboard();
    return { status:"ok", data:d.getData() };
  });

  app.get("/api/v1/dashboard/projects", async () => {
    var d=new HealthDashboard();
    return { status:"ok", data:d.getProjectSummary() };
  });

  app.get("/api/v1/dashboard/pipeline", async () => {
    var d=new HealthDashboard();
    return { status:"ok", data:d.getPipelineHealth() };
  });
}