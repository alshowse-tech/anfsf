/**
 * ANFSF V4 Layer 9 - Agent OS Module Exports
 */

export { AgentOS } from './agent-os';
export { AgentStateMachine, AgentStateMachineManager } from './agent-state-machine';
export { AgentRegistry } from './agent-registry';
export { AgentHealthMonitor } from './agent-health-monitor';
export { AgentMemoryStore } from './agent-memory';
export { CoordinationProtocol } from './coordination-protocol';
export { createAgentOS, getDefaultAgentOS, resetDefaultAgentOS } from './agent-os-factory';

export type {
  AgentState,
  AgentHealth,
  AgentCapability,
  AgentEntry,
  AgentStateEvent,
  AgentMemory,
  MemoryType,
  HealthCheckResult,
  AgentOSConfig,
  AgentOSEvent,
  AgentOSEventType,
  AgentOSMetrics,
  AgentOSState,
  AgentMessageType,
  TaskPayload,
  TaskDelegation,
  ConsolidationResult,
} from './types';

export {
  isAgentState,
  isAgentHealth,
  isAgentMessageType,
} from './types';
