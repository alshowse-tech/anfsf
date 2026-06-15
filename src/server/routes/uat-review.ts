import { FastifyInstance } from "fastify";
import { createReview, getReviews, getReview } from "../../pipeline/uat-review";

export function registerUATRoutes(app: FastifyInstance): void {
  app.post("/api/v1/uat/review", async (req) => {
    const body = req.body as { projectId: string; reviewer: string; decision: string; comments?: string };
    if (!body.projectId || !body.reviewer || !body.decision)
      return { status: "error", error: { code: "MISSING_FIELDS", message: "projectId, reviewer, decision required" } };
    if (!["approved", "rejected", "changes_requested"].includes(body.decision))
      return { status: "error", error: { code: "INVALID_DECISION", message: "Use: approved, rejected, changes_requested" } };
    const review = createReview(body.projectId, body.reviewer, body.decision as any, body.comments || "");
    return { status: "ok", review };
  });

  app.get("/api/v1/uat/reviews", async (req) => {
    const query = req.query as { projectId?: string };
    const reviews = getReviews(query.projectId);
    return { status: "ok", reviews, total: reviews.length };
  });

  app.get("/api/v1/uat/reviews/:id", async (req) => {
    const params = req.params as { id: string };
    const review = getReview(params.id);
    if (!review) return { status: "error", error: { code: "NOT_FOUND", message: "Review not found" } };
    return { status: "ok", review };
  });
}