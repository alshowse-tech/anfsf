import { Router, Request, Response } from "express";

export const approvalRoutes = Router();

approvalRoutes.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Approval routes - list approvals" });
});

approvalRoutes.post("/sync", (_req: Request, res: Response) => {
  res.json({ message: "Approval routes - sync from headquarters" });
});

approvalRoutes.get("/:id", (req: Request, res: Response) => {
  res.json({ message: `Approval routes - get approval ${req.params.id}` });
});