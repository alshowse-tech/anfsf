import { describe, it, expect, beforeEach } from "@jest/globals";
import { getCompileLearningDB } from "../compile-learning-db";
import { syncToKnowledgeBase, getKnowledgeInjection } from "../knowledge-bridge";

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
});


