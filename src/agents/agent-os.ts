/**
 * ANFSF V4 Layer 9 - AgentOS Core
 *
 * Central orchestrator for the Agent Operating System.
 * Manages agent lifecycle, health, memory, and multi-agent coordination
 * via MCPBus and the existing harness infrastructure.
 */

import { AgentRegistry } from './agent-registry';
import { AgentStateMachine, AgentStateMachineManager } from './agent-state-machine';
import { AgentHealthMonitor } from './agent-health-monitor';
import { AgentMemoryStore } from './agent-memory';
import { CoordinationProtocol } from './coordination-protocol';
import { MCPBus } from '../mcp/mcp-bus';
import type {
  AgentEntry,
  AgentCapability,
  AgentState,
  AgentHealth,
  AgentMemory,
  MemoryType,
  HealthCheckResult,
  AgentOSConfig,
  AgentOSEvent,
  AgentOSMetrics,
  AgentOSState,
  TaskPayload,
  ConsolidationResult,
} from './types';

const DEFAULT_CONFIG: AgentOSConfig = {
  heartbeatIntervalMs: 5000,
  heartbeatTimeoutMs: 15000,
  maxAgents: 50,
  enableHealthMonitoring: true,
  enableMemoryPersistence: false,
  healthCheckIntervalMs: 10000,
  resourceTrackingEnabled: false,
};

export class AgentOS {
  private config: AgentOSConfig;
  private registry: AgentRegistry;
  private stateMachines: AgentStateMachineManager;
  private healthMonitor: AgentHealthMonitor;
  private memoryStore: AgentMemoryStore;
  private coordination: CoordinationProtocol | null;
  private mcpBus: MCPBus | null;
  private eventListeners: Set<(event: AgentOSEvent) => void>;
  private state: AgentOSState;
  private startedAt: number;

  constructor(config: Partial<AgentOSConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registry = new AgentRegistry();
    this.stateMachines = new AgentStateMachineManager();
    this.healthMonitor = new AgentHealthMonitor({
      heartbeatTimeoutMs: this.config.heartbeatTimeoutMs,
      healthCheckIntervalMs: this.config.healthCheckIntervalMs,
      resourceTrackingEnabled: this.config.resourceTrackingEnabled,
    });
    this.memoryStore = new AgentMemoryStore({
      persistencePath: this.config.enableMemoryPersistence ? this.config.memoryStorePath : undefined,
    });
    this.coordination = null;
    this.mcpBus = null;
    this.eventListeners = new Set();
    this.state = 'stopped';
    this.startedAt = 0;
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async start(): Promise<void> {
    if (this.state !== 'stopped') return;
    this.state = 'starting';

    if (this.config.enableMemoryPersistence && this.config.memoryStorePath) {
      await this.memoryStore.loadFromPersistence();
    }

    if (this.config.enableHealthMonitoring) {
      this.healthMonitor.startMonitoring();
    }

    this.state = 'running';
    this.startedAt = Date.now();
  }

  async stop(): Promise<void> {
    if (this.state !== 'running') return;
    this.state = 'stopping';

    if (this.config.enableHealthMonitoring) {
      this.healthMonitor.stopMonitoring();
    }

    for (const agent of this.registry.list()) {
      this.stateMachines.get(agent.id)?.transition('stopped', 'AgentOS shutdown');
      this.registry.updateState(agent.id, 'stopped');
    }

    if (this.config.enableMemoryPersistence && this.config.memoryStorePath) {
      await this.memoryStore.saveToPersistence();
    }

    this.state = 'stopped';
  }

  dispose(): void {
    this.healthMonitor.stopMonitoring();
    this.eventListeners.clear();
    this.coordination = null;
    this.mcpBus = null;
  }

  // ===========================================================================
  // Agent Management
  // ===========================================================================

  registerAgent(config: {
    id?: string;
    name: string;
    capabilities?: AgentCapability[];
    metadata?: Record<string, any>;
  }): AgentEntry {
    if (this.registry.size() >= this.config.maxAgents) {
      throw new Error(`Maximum agents limit reached: ${this.config.maxAgents}`);
    }

    const entry = this.registry.register(config);
    this.stateMachines.getOrCreate(entry.id, 'initializing');
    this.healthMonitor.registerAgent(entry.id);

    this.stateMachines.get(entry.id)?.transition('idle', 'Agent registered');
    this.registry.updateState(entry.id, 'idle');

    this.emitEvent('agent:registered', entry.id, { name: entry.name, capabilities: entry.capabilities });

    if (this.mcpBus) {
      this.mcpBus.subscribe(entry.id, () => {});
    }

    return entry;
  }

  unregisterAgent(agentId: string): boolean {
    const agent = this.registry.get(agentId);
    if (!agent) return false;

    this.stateMachines.get(agentId)?.transition('stopped', 'Agent unregistered');
    this.healthMonitor.unregisterAgent(agentId);
    this.registry.unregister(agentId);

    this.emitEvent('agent:unregistered', agentId);
    return true;
  }

  getAgent(agentId: string): AgentEntry | null {
    return this.registry.get(agentId);
  }

  listAgents(): AgentEntry[] {
    return this.registry.list();
  }

  listAgentsByState(state: AgentState): AgentEntry[] {
    return this.registry.getByState(state);
  }

  listAgentsByCapability(capabilityName: string): AgentEntry[] {
    return this.registry.findByCapability(capabilityName);
  }

  // ===========================================================================
  // State Management
  // ===========================================================================

  getAgentState(agentId: string): AgentState | null {
    const machine = this.stateMachines.get(agentId);
    return machine ? machine.getState() : null;
  }

  transitionAgentState(agentId: string, to: AgentState, reason: string = ''): boolean {
    const machine = this.stateMachines.get(agentId);
    if (!machine) return false;

    const result = machine.transition(to, reason);
    if (result.success) {
      this.registry.updateState(agentId, to);
      this.emitEvent('agent:state_changed', agentId, { from: machine.getLastTransition()?.from, to, reason });
    }
    return result.success;
  }

  // ===========================================================================
  // Task Delegation
  // ===========================================================================

  async delegateTask(fromAgent: string, toAgent: string, task: TaskPayload): Promise<any> {
    if (!this.coordination) {
      throw new Error('Coordination protocol not initialized. Call start() first.');
    }

    this.transitionAgentState(fromAgent, 'working', `Delegating task ${task.taskId}`);
    this.transitionAgentState(toAgent, 'working', `Received task ${task.taskId}`);

    this.emitEvent('agent:task_delegated', fromAgent, { taskId: task.taskId, toAgent });

    const response = await this.coordination.delegateTask(fromAgent, toAgent, task);

    this.transitionAgentState(fromAgent, 'idle', `Task ${task.taskId} delegated`);
    this.transitionAgentState(toAgent, 'idle', `Task ${task.taskId} completed`);

    return response;
  }

  async delegateToMany(
    fromAgent: string,
    toAgents: string[],
    task: TaskPayload
  ): Promise<any[]> {
    if (!this.coordination) {
      throw new Error('Coordination protocol not initialized. Call start() first.');
    }

    this.coordination.setExpectedAgentCount(task.taskId, toAgents.length);

    const responses: any[] = [];
    for (const toAgent of toAgents) {
      const response = await this.delegateTask(fromAgent, toAgent, {
        ...task,
        taskId: `${task.taskId}-${toAgent}`,
      });
      responses.push(response);
    }

    return responses;
  }

  // ===========================================================================
  // Memory
  // ===========================================================================

  storeMemory(agentId: string, config: {
    type: MemoryType;
    content: Record<string, any>;
    tags?: string[];
    importance?: number;
  }): AgentMemory {
    const memory = this.memoryStore.store(agentId, config);
    this.emitEvent('agent:memory_stored', agentId, { memoryId: memory.id, type: memory.type });
    return memory;
  }

  retrieveMemory(agentId: string, options?: {
    type?: MemoryType;
    tags?: string[];
    limit?: number;
  }): AgentMemory[] {
    return this.memoryStore.retrieve(agentId, options);
  }

  searchMemory(agentId: string, query: string, type?: MemoryType): AgentMemory[] {
    return this.memoryStore.search(agentId, query, type);
  }

  async consolidateMemories(agentId: string): Promise<ConsolidationResult> {
    return this.memoryStore.consolidate(agentId);
  }

  getMemoryStats(agentId: string) {
    return this.memoryStore.getStats(agentId);
  }

  // ===========================================================================
  // Health
  // ===========================================================================

  getHealthStatus(agentId: string): HealthCheckResult | null {
    return this.healthMonitor.checkHealth(agentId);
  }

  getOverallHealth(): Map<string, HealthCheckResult> {
    return this.healthMonitor.checkAll();
  }

  recordHeartbeat(agentId: string, resourceUsage?: { memoryMB?: number; cpuPercent?: number }): void {
    this.healthMonitor.recordHeartbeat(agentId, resourceUsage);
    this.registry.updateLastSeen(agentId);
  }

  // ===========================================================================
  // Events
  // ===========================================================================

  onEvent(callback: (event: AgentOSEvent) => void): () => void {
    this.eventListeners.add(callback);

    if (this.coordination) {
      this.coordination.onAgentEvent(callback);
    }

    this.healthMonitor.onEvent(callback);

    return () => { this.eventListeners.delete(callback); };
  }

  // ===========================================================================
  // Metrics
  // ===========================================================================

  getMetrics(): AgentOSMetrics {
    const healthResults = this.healthMonitor.checkAll();
    let healthy = 0, degraded = 0, unhealthy = 0;
    for (const result of healthResults.values()) {
      if (result.health === 'healthy') healthy++;
      else if (result.health === 'degraded') degraded++;
      else unhealthy++;
    }

    const pendingTasks = this.coordination?.getPendingTaskCount() ?? 0;

    return {
      totalAgents: this.registry.size(),
      activeAgents: this.registry.getActiveCount(),
      healthyAgents: healthy,
      degradedAgents: degraded,
      unhealthyAgents: unhealthy,
      totalMemories: this.memoryStore.getTotalCount(),
      pendingTasks,
      completedTasks: 0,
      failedTasks: 0,
      uptimeMs: this.state === 'running' ? Date.now() - this.startedAt : 0,
    };
  }

  getState(): AgentOSState {
    return this.state;
  }

  setMCPBus(bus: MCPBus): void {
    this.mcpBus = bus;
    this.coordination = new CoordinationProtocol(bus);
  }

  getMCPBus(): MCPBus | null {
    return this.mcpBus;
  }

  getCoordination(): CoordinationProtocol | null {
    return this.coordination;
  }

  // ===========================================================================
  // Private
  // ===========================================================================

  private emitEvent(type: AgentOSEvent['type'], agentId: string, data?: any): void {
    const event: AgentOSEvent = {
      type,
      agentId,
      timestamp: Date.now(),
      data,
    };
    for (const listener of this.eventListeners) {
      try {
        listener(event);
      } catch {
        // ignore listener errors
      }
    }
  }
}
