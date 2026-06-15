import { FastifyInstance } from "fastify";
import { registerWebhook, listWebhooks, removeWebhook } from "../../pipeline/webhook";

export function registerWebhookRoutes(app: FastifyInstance): void {
  app.post("/api/v1/webhooks", async (req) => {
    const body = req.body as { url: string; events?: string[] };
    if (!body.url) return { status: "error", error: { code: "MISSING_URL", message: "url is required" } };
    const wh = registerWebhook(body.url, body.events || ["ticket.created","ticket.updated"]);
    return { status: "ok", webhook: wh };
  });

  app.get("/api/v1/webhooks", async () => {
    const webhooks = listWebhooks();
    return { status: "ok", webhooks, total: webhooks.length };
  });

  app.delete("/api/v1/webhooks/:id", async (req) => {
    const params = req.params as { id: string };
    const removed = removeWebhook(params.id);
    if (!removed) return { status: "error", error: { code: "NOT_FOUND", message: "Webhook not found" } };
    return { status: "ok" };
  });
}