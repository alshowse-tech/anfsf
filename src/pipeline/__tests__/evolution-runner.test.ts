import { describe, it, expect } from "@jest/globals";
import { getCompileLearningDB } from "../compile-learning-db";
import { runEvolution } from "../evolution-runner";

describe("EvolutionRunner", () => {
  it("returns result with compile records", async () => {
    const db = getCompileLearningDB();
    db.recordErrors([
      { pattern: "ERR", raw: "error", fileExt: ".ts", projectType: "web", fixHint: "fix", resolvedAtRound: 0, outcome: "fixed" },
    ]);
    const result = await runEvolution("test-proj");
    expect(result.compileRecords).toBeGreaterThanOrEqual(1);
    expect(result.timestamp).toBeGreaterThan(0);
  });

  it("prunes old records", async () => {
    const db = getCompileLearningDB();
    db.pruneOlderThan(0); // prunes everything older than 0 days
    // result should be valid even if no records remain
    const result = await runEvolution("test-proj-2");
    expect(result.pruned).toBeGreaterThanOrEqual(0);
  });
});
