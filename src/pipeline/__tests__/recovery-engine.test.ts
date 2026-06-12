import { describe, it, expect } from "@jest/globals";
import { PipelineStateMachine } from "../pipeline-state-machine";
import { CheckpointManager, InMemoryCheckpointStore } from "../checkpoint";
import { RecoveryEngine } from "../recovery-engine";

function setup(pid = "tp"): { engine: RecoveryEngine; machine: PipelineStateMachine } {
  const s = new InMemoryCheckpointStore(); const m = new CheckpointManager(s);
  const e = new RecoveryEngine(m); const mac = new PipelineStateMachine(pid, "created");
  e.register(mac); return { engine: e, machine: mac };
}

describe("RecoveryEngine", () => {
  it("saves checkpoint on transition", async () => {
    const { engine, machine } = setup();
    await machine.transition("stage1_parsing");
    const cp = await engine.getManager().load("tp");
    expect(cp).not.toBeNull();
    expect(cp!.stage).toBe("created");
  });

  it("null on no checkpoint", async () => {
    const e = new RecoveryEngine(new CheckpointManager(new InMemoryCheckpointStore()));
    expect(await e.recover("x")).toBeNull();
  });

  it("recovers at checkpoint stage", async () => {
    const { engine, machine } = setup("r1");
    await machine.transition("stage1_parsing");
    await machine.transition("stage1_locked");
    const m2 = await engine.recover("r1");
    expect(m2).not.toBeNull();
    expect(m2!.getState()).toBe("stage1_parsing");
  });
});