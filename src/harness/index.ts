/**
 * ANFSF V4 Layer 8.5 - Harness Module Exports
 */

export { AgentHarness } from './agent-harness';
export { CanaryDeployer } from './canary-deployer';
export { ABTestRunner } from './ab-test-runner';
export { OrchestrationHarness } from './orchestration-harness';
export { EvolutionHarness, createEvolutionHarness } from './evolution-harness';
export { GovernanceHarness } from './governance-harness';

export type {
  TestScenario,
  TestResult,
  TestStatus,
  TestConfig,
  ExpectedOutcome,
  SuccessCriteria,
  Policy,
  PolicyType,
  DeploymentResult,
  DeploymentStatus,
  CanaryOptions,
  RollbackPolicy,
  OwnershipCheck,
  OwnershipCheckResult,
  PersonalizationBudget,
  PersonalizationBudgetController,
  ABTestConfig,
  ABTestResult,
  AgentHarnessConfig,
} from './types';

export {
  isTestResult,
  isDeploymentResult,
  isOwnershipCheckResult,
} from './types';

// L9 Agent OS re-exports
export {
  AgentOS,
  AgentStateMachine,
  AgentStateMachineManager,
  AgentRegistry,
  AgentHealthMonitor,
  AgentMemoryStore,
  CoordinationProtocol,
  createAgentOS,
  getDefaultAgentOS,
  resetDefaultAgentOS,
} from '../agents';

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
} from '../agents';

export {
  isAgentState,
  isAgentHealth,
  isAgentMessageType,
} from '../agents';
