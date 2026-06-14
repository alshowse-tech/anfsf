import { describe, it, expect, beforeEach } from "@jest/globals";
import { getCompileLearningDB } from "../compile-learning-db";
import { syncToKnowledgeBase, getKnowledgeInjection } from "../knowledge-bridge";
import { syncIntrospectionFindings } from "../knowledge-bridge";
import type { IntrospectionReport } from "../../core/evolution/introspection-engine";

describe("KnowledgeBridge", () => {
  beforeEach(() => { try { getCompileLearningDB().clear(); } catch {} });
  it("syncToKnowledgeBase handles empty data", async () => {
    const result = await syncToKnowledgeBase("test-p");
    expect(result).toBeGreaterThanOrEqual(0);
  });

  it("getKnowledgeInjection returns non-empty after sync", async () => {
    getCompileLearningDB().recordErrors([{ pattern:"KB_ERR", raw:"x", fileExt:".ts", projectType:"web", fixHint:"x", resolvedAtRound:0, outcome:"fixed" }]);
    await syncToKnowledgeBase("kb-test");
    const result = await getKnowledgeInjection("web", 5);
    expect(result.length).toBeGreaterThan(0);
    expect(result).toContain("Knowledge from past projects");
  });

  it("syncIntrospectionFindings stores findings correctly", async () => {
    const report: IntrospectionReport = {
      analyzedAt: Date.now(),
      filesAnalyzed: 1,
      findings: [
        { category: "complexity", severity: "major", file: "src/test.ts", description: "High complexity", suggestion: "Refactor", effort: "M" },
        { category: "naming", severity: "minor", file: "src/utils.ts", description: "Poor naming", suggestion: "Rename", effort: "S" },
      ],
      summary: "Test analysis found 2 issues.",
      duration: 100,
    };
    const count = await syncIntrospectionFindings(report, "intr-test");
    expect(count).toBe(2);
  });
});


