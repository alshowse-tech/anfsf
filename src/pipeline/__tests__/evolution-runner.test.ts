import { describe, it, expect } from "@jest/globals";
import { runEvolution } from "../evolution-runner";
import { getCompileLearningDB } from "../compile-learning-db";

describe("EvolutionRunner", () => {
  beforeEach(() => {
    // Reset singleton state for test isolation
    const db = getCompileLearningDB();
    db.pruneOlderThan(0);
  });

  it("returns result with compile records", async () => {
    const db = getCompileLearningDB();
    db.recordErrors([
      { pattern: "ERR", raw: "error", fileExt: ".ts", projectType: "web", fixHint: "fix", resolvedAtRound: 0, outcome: "fixed" },
    ]);
    const result = await runEvolution("test-proj");
    expect(result.compileRecords).toBeGreaterThanOrEqual(1);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it("returns non-negative values", async () => {
    const result = await runEvolution("test-proj-2");
    expect(result.pruned).toBeGreaterThanOrEqual(0);
    expect(result.componentPatterns).toBeGreaterThanOrEqual(0);
  });
});
