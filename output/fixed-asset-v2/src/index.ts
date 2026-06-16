import "reflect-metadata";
import express from "express";
import { approvalRoutes } from "./routes/approvalRoutes";
import { projectRoutes } from "./routes/projectRoutes";
import { reportRoutes } from "./routes/reportRoutes";
import { alertRoutes } from "./routes/alertRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use("/api/approvals", approvalRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/alerts", alertRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Fixed Asset v2 server running on port ${PORT}`);
});