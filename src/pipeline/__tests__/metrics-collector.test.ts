import { describe, it, expect } from "@jest/globals";
import * as path from "path";
import * as os from "os";
import { MetricsCollector, type StageMetric } from "../metrics-collector";

function testDB() { return path.join(os.tmpdir(), "m-" + Math.random().toString(36).slice(2, 10) + ".json"); }

describe("MetricsCollector", () => {
  it("records and retrieves stage metrics", () => {
    const mc = new MetricsCollector(testDB());
    mc.record({ projectId: "p1", stage: "stage1_parsing", durationMs: 100, success: true, promptTokens: 50, completionTokens: 30, errorCount: 0, fixL1: 0, fixL2: 0, fixL3: 0, timestamp: Date.now() });
    expect(mc.totalRecords).toBe(1);
    const summary = mc.getStageSummary("stage1_parsing");
    expect(summary.totalRuns).toBe(1);
    expect(summary.avgDurationMs).toBeCloseTo(100, 0);
  });

  it("computes failure rate", () => {
    const mc = new MetricsCollector(testDB());
    mc.record(createMetric("p1", "stage3_verifying", 200, true));
    mc.record(createMetric("p1", "stage3_verifying", 300, false));
    mc.record(createMetric("p1", "stage3_verifying", 250, true));
    const summary = mc.getStageSummary("stage3_verifying");
    expect(summary.totalRuns).toBe(3);
    expect(summary.failureRate).toBeCloseTo(1/3, 1);
    expect(summary.avgDurationMs).toBeCloseTo(250, 0);
  });

  it("identifies bottleneck stages", () => {
    const mc = new MetricsCollector(testDB());
    mc.record(createMetric("p1", "fast", 5, true));
    mc.record(createMetric("p1", "slow", 20000, true));
    mc.record(createMetric("p1", "medium", 500, true));
    const bottlenecks = mc.getBottleneckStages(10000);
    expect(bottlenecks.length).toBe(1);
    expect(bottlenecks[0].stage).toBe("slow");
  });

  it("tracks token usage per project", () => {
    const mc = new MetricsCollector(testDB());
    mc.record({ ...createMetric("p1", "s1", 100, true), promptTokens: 200, completionTokens: 100 });
    mc.record({ ...createMetric("p1", "s2", 100, true), promptTokens: 300, completionTokens: 150 });
    const usage = mc.getProjectTokenUsage("p1");
    expect(usage.totalPrompt).toBe(500);
    expect(usage.totalCompletion).toBe(250);
  });

  it("p95 calculation works with small sample", () => {
    const mc = new MetricsCollector(testDB());
    for (let i = 0; i < 10; i++) mc.record(createMetric("p1", "test", 100 + i * 10, true));
    const s = mc.getStageSummary("test");
    expect(s.p95DurationMs).toBe(190);
  });
});

function createMetric(pid: string, stage: string, dur: number, ok: boolean): StageMetric {
  return { projectId: pid, stage, durationMs: dur, success: ok, promptTokens: 10, completionTokens: 5, errorCount: ok ? 0 : 1, fixL1: 0, fixL2: 0, fixL3: 0, timestamp: Date.now() };
}

