import type { ProjectState } from './pipeline-state-machine';
import { PipelineStateMachine, STATE_TO_STAGE } from './pipeline-state-machine';
import { CheckpointManager } from './checkpoint';
import { runEvolution } from './evolution-runner';

export class RecoveryEngine {
  constructor(private checkpointManager: CheckpointManager) {}

  register(machine: PipelineStateMachine): PipelineStateMachine {
    const allStates = Object.keys(STATE_TO_STAGE) as ProjectState[];
    for (const st of allStates) {
      machine.onLeave(st, async (from) => {
        await this.checkpointManager.save(machine.projectId, from, { ts: Date.now() });
      });
    }
    machine.onEnter("stage5_evolving", async () => {
      await runEvolution(machine.projectId);
    });
    return machine;
  }

  async recover(projectId: string): Promise<PipelineStateMachine | null> {
    const cp = await this.checkpointManager.load(projectId);
    if (!cp) return null;
    const m = new PipelineStateMachine(projectId, 'failed');
     m.restoreTo(cp.stage as ProjectState);
    this.register(m);
    return m;
  }

  getManager(): CheckpointManager { return this.checkpointManager; }
}



