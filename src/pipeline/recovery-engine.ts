/**
 * ANFSF Pipeline — Recovery Engine
 *
 * Integrates checkpoint manager with the pipeline state machine.
 * Provides crash recovery and engine hooks (retrospective, introspection).
 */
import type { ProjectState } from "./pipeline-state-machine";
import { PipelineStateMachine, STATE_TO_STAGE } from "./pipeline-state-machine";
import { CheckpointManager } from "./checkpoint";
import { runEvolution } from "./evolution-runner";
import { syncIntrospectionFindings } from "./knowledge-bridge";

import type { RetrospectiveEngine } from "../skills/retrospective-engine";
import type { IntrospectionEngine } from "../core/evolution/introspection-engine";

export class RecoveryEngine {
  private retrospectiveEngine?: RetrospectiveEngine;
  private introspectionEngine?: IntrospectionEngine;
  private stepTimestamps: Array<{ state: string; ts: number }> = [];

  constructor(
    private checkpointManager: CheckpointManager,
    retrospectiveEngine?: RetrospectiveEngine,
    introspectionEngine?: IntrospectionEngine,
  ) {
    this.retrospectiveEngine = retrospectiveEngine;
    this.introspectionEngine = introspectionEngine;
  }

  register(machine: PipelineStateMachine): PipelineStateMachine {
    const allStates = Object.keys(STATE_TO_STAGE) as ProjectState[];
    for (const st of allStates) {
      machine.onLeave(st, async (from) => {
        this.stepTimestamps.push({ state: from, ts: Date.now() });
        await this.checkpointManager.save(machine.projectId, from, { ts: Date.now() });
      });
    }
    machine.onEnter("stage5_evolving", async () => {
      await runEvolution(machine.projectId);
      await this.runRetrospective(machine.projectId);
      await this.runIntrospection(machine.projectId);
    });
    return machine;
  }

  private async runRetrospective(projectId: string): Promise<void> {
    const engine = this.retrospectiveEngine;
    if (!engine) return;
    try {
      await engine.init();
      const steps = this.buildPipelineSteps();
      const totalDuration = steps.reduce((s, step) => s + step.duration, 0);
      const result = await engine.retrospective({
        projectId,
        prdText: "",
        pipelineSteps: steps,
        duration: totalDuration,
        success: true,
      });
      console.log(
        `[RecoveryEngine] Retrospective for ${projectId}: ` +
        `${result.lessons.length} lessons, stored=${result.stored}`,
      );
    } catch (e) {
      console.error(`[RecoveryEngine] Retrospective failed for ${projectId}:`, e);
    }
  }

  private buildPipelineSteps(): Array<{ name: string; duration: number; status: "ok" | "error" | "skipped"; error?: string }> {
    if (this.stepTimestamps.length === 0) return [];
    return this.stepTimestamps.map((s, i) => {
      const next = this.stepTimestamps[i + 1];
      return {
        name: s.state,
        duration: next ? next.ts - s.ts : Date.now() - s.ts,
        status: "ok" as const,
      };
    });
  }

  private async runIntrospection(projectId: string = "default"): Promise<void> {
    const engine = this.introspectionEngine;
    if (!engine) return;
    try {
      const start = Date.now();
      const report = await engine.analyze();
      const stored = await syncIntrospectionFindings(report, projectId);
      console.log(
        `[RecoveryEngine] Introspection: ${report.filesAnalyzed} files, ` +
        `${report.findings.length} findings, ${stored} stored ` +
        `(${Date.now() - start}ms)`,
      );
    } catch (e) {
      console.error(`[RecoveryEngine] Introspection failed:`, e);
    }
  }

  async recover(projectId: string): Promise<PipelineStateMachine | null> {
    const cp = await this.checkpointManager.load(projectId);
    if (!cp) return null;
    const m = new PipelineStateMachine(projectId, "failed");
    m.restoreTo(cp.stage as ProjectState);
    this.register(m);
    return m;
  }

  getManager(): CheckpointManager { return this.checkpointManager; }
}
