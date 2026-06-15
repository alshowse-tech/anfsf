/**
 * ANFSF Pipeline — Health Dashboard (GAP-18)
 *
 * Aggregates data from all subsystems into a unified health view.
 */
import { getProjectRegistry } from "./project";
import { getTenantRegistry, DEFAULT_TENANT_ID } from "./tenant";
import { MetricsCollector } from "./metrics-collector";
import { KnowledgeBase } from "../storage/knowledge-base";
import { getCompileLearningDB } from "./compile-learning-db";

export interface DashboardData {
  projects: { total: number; byState: Record<string, number> };
  tenants: { total: number };
  pipeline: { totalRecords: number; bottlenecks: any[] };
  knowledge: { totalEntries: number };
  compile: { totalPatterns: number; uniquePatterns: number };
  timestamp: number;
}

export class HealthDashboard {
  getData(): DashboardData {
    const pr = getProjectRegistry();
    const tr = getTenantRegistry();
    const mc = new MetricsCollector();
    const db = getCompileLearningDB();
    const byState: Record<string, number> = {};
    pr.list().forEach(p => { byState[p.projectState] = (byState[p.projectState] || 0) + 1; });
    return {
      projects: { total: pr.size(), byState },
      tenants: { total: tr.list().length },
      pipeline: { totalRecords: mc.totalRecords, bottlenecks: mc.getBottleneckStages(10000) },
      knowledge: { totalEntries: 0 },
      compile: { totalPatterns: db.totalRecords, uniquePatterns: db.uniquePatterns },
      timestamp: Date.now(),
    };
  }

  getProjectSummary(): { id: string; name: string; state: string; createdAt: number }[] {
    return getProjectRegistry().list().map(p => ({ id: p.id, name: p.name, state: p.projectState, createdAt: p.createdAt }));
  }

  getPipelineHealth(): { totalRecords: number; bottlenecks: any[] } {
    const mc = new MetricsCollector();
    return { totalRecords: mc.totalRecords, bottlenecks: mc.getBottleneckStages(10000) };
  }
}