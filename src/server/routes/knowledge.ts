import { FastifyInstance } from "fastify";
import { getCompileLearningDB } from "../../pipeline/compile-learning-db";
import { getComponentMiner } from "../../pipeline/component-miner";
import { MetricsCollector } from "../../pipeline/metrics-collector";

export function registerKnowledgeRoutes(app: FastifyInstance): void {
  app.get("/api/v1/knowledge/compile-patterns", async () => {
    const db = getCompileLearningDB();
    const patterns = db.getTopPatterns(undefined, { minFrequency: 1, limit: 20 });
    return { patterns, total: db.totalRecords, uniquePatterns: db.uniquePatterns };
  });

  app.get("/api/v1/knowledge/component-patterns", async () => {
    const miner = getComponentMiner();
    const components = miner.query(undefined, 20);
    return { components, total: miner.totalPatterns };
  });

 app.get("/api/v1/knowledge/metrics", async () => {
   const collector = new MetricsCollector();
   return { totalRecords: collector.totalRecords };
 });
  app.get("/api/v1/knowledge/metrics/bottlenecks", async (req) => {
    const collector = new MetricsCollector();
    const params = req.query as { thresholdMs?: string; stage?: string };
    const threshold = params.thresholdMs ? parseInt(params.thresholdMs, 10) : 10000;
    if (params.stage) {
      const summary = collector.getStageSummary(params.stage);
      return { stage: params.stage, summary };
    }
    const bottlenecks = collector.getBottleneckStages(threshold);
    return { thresholdMs: threshold, bottlenecks };
  });

  app.get("/api/v1/knowledge/metrics/stages", async () => {
    const collector = new MetricsCollector();
    return { stages: collector.getAllStageSummaries() };
  });
}
