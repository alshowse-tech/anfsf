import { Router, Request, Response } from "express";

export const projectRoutes = Router();

projectRoutes.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Project routes - list projects" });
});

projectRoutes.post("/", (_req: Request, res: Response) => {
  res.json({ message: "Project routes - create project" });
});

projectRoutes.get("/:id", (req: Request, res: Response) => {
  res.json({ message: `Project routes - get project ${req.params.id}` });
});

projectRoutes.put("/:id/progress", (req: Request, res: Response) => {
  res.json({ message: `Project routes - update progress for project ${req.params.id}` });
});

projectRoutes.get("/:id/contracts", (req: Request, res: Response) => {
  res.json({ message: `Project routes - get contracts for project ${req.params.id}` });
});