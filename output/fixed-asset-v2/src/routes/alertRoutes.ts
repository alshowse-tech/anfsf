import { Router, Request, Response } from "express";

export const alertRoutes = Router();

alertRoutes.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Alert routes - list alerts" });
});

alertRoutes.put("/:id/acknowledge", (req: Request, res: Response) => {
  res.json({ message: `Alert routes - acknowledge alert ${req.params.id}` });
});

alertRoutes.put("/:id/resolve", (req: Request, res: Response) => {
  res.json({ message: `Alert routes - resolve alert ${req.params.id}` });
});