import { Router, Request, Response } from "express";

export const reportRoutes = Router();

reportRoutes.get("/monthly", (_req: Request, res: Response) => {
  res.json({ message: "Report routes - monthly report" });
});

reportRoutes.get("/quarterly", (_req: Request, res: Response) => {
  res.json({ message: "Report routes - quarterly report" });
});

reportRoutes.get("/annual", (_req: Request, res: Response) => {
  res.json({ message: "Report routes - annual report" });
});

reportRoutes.post("/generate", (_req: Request, res: Response) => {
  res.json({ message: "Report routes - generate custom report" });
});