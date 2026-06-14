/**
 * Pipeline Orchestration Integration Tests
 *
 * Validates full state machine lifecycle with all engines connected:
 *   RetrospectiveEngine, IntrospectionEngine, CheckpointManager
 *
 * Tests:
 *   1. Happy path: created → stage5_evolving (13 transitions)
 *   2. Crash recovery: simulate crash, recover from latest checkpoint
 *   3. Recovery edge case: unknown project returns null
 */

import { describe, it, expect } from "@jest/globals";
import { PipelineStateMachine } from "../../pipeline/pipeline-state-machine";
import { CheckpointManager, InMemoryCheckpointStore } from "../../pipeline/checkpoint";
import { RecoveryEngine } from "../../pipeline/recovery-engine";
import { RetrospectiveEngine } from "../../skills/retrospective-engine";
import { IntrospectionEngine } from "../../core/evolution/introspection-engine";

describe("PipelineOrchestration", () => {
  it("completes full lifecycle with all engines", async () => {
    const store = new InMemoryCheckpointStore();
    const cm = new CheckpointManager(store);
    const re = new RetrospectiveEngine({ knowledgeBasePath: ":memory:", apiKey: "test" });
    const ie = new IntrospectionEngine({ sourceDirs: ["nonexistent"], apiKey: "test" });
    await re.init().catch(() => {});
    const engine = new RecoveryEngine(cm, re, ie);
    const machine = new PipelineStateMachine("lifecycle-test", "created");
    engine.register(machine);

    const transitions = [
      "stage0_knowledge", "stage1_parsing", "stage1_locked",
      "stage1_generating", "stage1_done", "stage2_dev",
      "stage3_verifying", "stage3_passed", "stage4_testing",
      "stage4_confirmed", "stage5_archiving", "stage5_done",
      "stage5_evolving",
    ] as const;

    for (const state of transitions) {
      await machine.transition(state);
    }
    expect(machine.getState()).toBe("stage5_evolving");
  });

  it("recovers from checkpoint after simulated crash", async () => {
    const store = new InMemoryCheckpointStore();
    const cm = new CheckpointManager(store);
    const engine1 = new RecoveryEngine(cm);
    const machine1 = new PipelineStateMachine("crash-test", "created");
    engine1.register(machine1);

    await machine1.transition("stage1_parsing");
    await machine1.transition("stage1_locked");
    await machine1.transition("stage1_generating");
    await machine1.transition("stage1_done");

    const engine2 = new RecoveryEngine(cm);
    const recovered = await engine2.recover("crash-test");
    expect(recovered).not.toBeNull();
    // onLeave saves checkpoint at state being left, so after stage1_generating -> stage1_done
    // the checkpoint is at "stage1_generating"
    expect(recovered!.getState()).toBe("stage1_generating");
    // Re-do the work that was lost in the crash
    await recovered!.transition("stage1_done");
    await recovered!.transition("stage2_dev");
    expect(recovered!.getState()).toBe("stage2_dev");
  });

  it("returns null for unknown project recovery", async () => {
    const store = new InMemoryCheckpointStore();
    const cm = new CheckpointManager(store);
    const engine = new RecoveryEngine(cm);
    const result = await engine.recover("nonexistent");
    expect(result).toBeNull();
  });
});
