/**
 * ANFSF V4 Layer 9 - Agent OS Type Definitions
 *
 * Core types for the Agent Operating System: lifecycle states, health,
 * capabilities, registry entries, memory, coordination protocol, and metrics.
 */

// ============================================================================
// Agent Lifecycle & Health
// ============================================================================

export type AgentState =
  | 'initializing'
  | 'idle'
  | 'working'
  | 'blocked'
  | 'error'
  | 'stopped';

export type AgentHealth = 'healthy' | 'degraded' | 'unhealthy';

// ============================================================================
// Agent Capability & Registry Entry
// ============================================================================

export interface AgentCapability {
  name: string;
  version: string;
  maxThroughput?: number;
  metadata?: Record<string, any>;
}

export interface AgentEntry {
  id: string;
  name: string;
  capabilities: AgentCapability[];
  state: AgentState;
  health: AgentHealth;
  lastSeen: number;
  createdAt: number;
  metadata?: Record<string, any>;
}

// ============================================================================
// State Machine
// ============================================================================

export interface AgentStateEvent {
  from: AgentState;
  to: AgentState;
  agentId: string;
  reason: string;
  timestamp: number;
}

// ============================================================================
// Agent Memory
// ============================================================================

export type MemoryType = 'working' | 'episodic' | 'semantic';

export interface AgentMemory {
  id: string;
  agentId: string;
  type: MemoryType;
  content: Record<string, any>;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
  tags?: string[];
  importance?: number;
}

// ============================================================================
// Coordination Protocol Message Types (extends MCPMessageType)
// ============================================================================

export type AgentMessageType =
  | 'task_delegate'
  | 'task_complete'
  | 'task_failed'
  | 'result_aggregate'
  | 'heartbeat'
  | 'health_report'
  | 'capability_discover'
  | 'capability_response'
  | 'error_recover';

// ============================================================================
// Task Delegation
// ============================================================================

export interface TaskPayload {
  taskId: string;
  type: string;
  input: Record<string, any>;
  timeoutMs?: number;
  retries?: number;
}

export interface TaskDelegation {
  taskId: string;
  fromAgent: string;
  toAgent: string;
  payload: TaskPayload;
  status: 'pending' | 'completed' | 'failed' | 'recovered';
  createdAt: number;
  completedAt?: number;
  result?: any;
  error?: string;
}

// ============================================================================
// Health Monitor
// ============================================================================

export interface HealthCheckResult {
  agentId: string;
  health: AgentHealth;
  lastHeartbeat: number;
  missedHeartbeats: number;
  resourceUsage?: { memoryMB?: number; cpuPercent?: number };
  checkedAt: number;
}

// ============================================================================
// AgentOS Configuration
// ============================================================================

export interface AgentOSConfig {
  heartbeatIntervalMs: number;
  heartbeatTimeoutMs: number;
  maxAgents: number;
  enableHealthMonitoring: boolean;
  enableMemoryPersistence: boolean;
  memoryStorePath?: string;
  healthCheckIntervalMs: number;
  resourceTrackingEnabled: boolean;
}

// ============================================================================
// AgentOS Events
// ============================================================================

export type AgentOSEventType =
  | 'agent:registered'
  | 'agent:unregistered'
  | 'agent:state_changed'
  | 'agent:health_changed'
  | 'agent:memory_stored'
  | 'agent:task_delegated'
  | 'agent:task_completed'
  | 'agent:error';

export interface AgentOSEvent {
  type: AgentOSEventType;
  agentId: string;
  timestamp: number;
  data?: any;
}

// ============================================================================
// AgentOS Metrics
// ============================================================================

export interface AgentOSMetrics {
  totalAgents: number;
  activeAgents: number;
  healthyAgents: number;
  degradedAgents: number;
  unhealthyAgents: number;
  totalMemories: number;
  pendingTasks: number;
  completedTasks: number;
  failedTasks: number;
  uptimeMs: number;
}

// ============================================================================
// AgentOS State
// ============================================================================

export type AgentOSState = 'stopped' | 'starting' | 'running' | 'stopping';

// ============================================================================
// Consolidation Result (adapter for MemoryConsolidationSkill)
// ============================================================================

export interface ConsolidationResult {
  consolidatedCount: number;
  prunedCount: number;
  importanceScores: Record<string, number>;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isAgentState(value: string): value is AgentState {
  return ['initializing', 'idle', 'working', 'blocked', 'error', 'stopped'].includes(value);
}

export function isAgentHealth(value: string): value is AgentHealth {
  return ['healthy', 'degraded', 'unhealthy'].includes(value);
}

export function isAgentMessageType(value: string): value is AgentMessageType {
  return [
    'task_delegate', 'task_complete', 'task_failed', 'result_aggregate',
    'heartbeat', 'health_report', 'capability_discover', 'capability_response', 'error_recover',
  ].includes(value);
}
