/**
 * ANFSF V4 Layer 8.5 - Governance Control Plane
 * 
 * Central control plane integrating CLI, MCP Bus, Skills Registry, and Agent Harness.
 * Provides unified governance operations with ownership arbitration, change tracking, and audit trails.
 */

import { MCPBus, MessageBuilder } from '../mcp/mcp-bus';
import { MCPMessage, MCPBusConfig, MCPBusStats } from '../mcp/types';

import { SkillsRegistry } from '../skills/skills-registry';
import { SandboxExecutor } from '../skills/sandbox-executor';
import { SandboxConfig, Skill, DependencyCheckResult } from '../skills/types';

import { AgentHarness } from '../harness/agent-harness';
import { CanaryDeployer } from '../harness/canary-deployer';
import { ABTestRunner } from '../harness/ab-test-runner';
import { TestScenario, TestResult, DeploymentResult, Policy, CanaryOptions } from '../harness/types';

import { ChangeEvent, TraceEdge } from '../core/graph/types';

// ============================================================================
// Constants
// ============================================================================

const CONTROL_PLANE_VERSION = '1.5.0';
const SCHEMA_VERSION = '2026-03';

// ============================================================================
// Types
// ============================================================================

/**
 * ControlPlaneConfig - Configuration for the governance control plane
 */
export interface ControlPlaneConfig {
  /** MCP Bus configuration */
  mcpBus?: MCPBusConfig;
  
  /** Sandbox configuration */
  sandbox?: SandboxConfig;
  
  /** Enable change event tracking */
  enableChangeEventTracking?: boolean;
  
  /** Enable ownership arbitration */
  enableOwnershipArbitration?: boolean;
  
  /** Enable audit logging */
  enableAuditLogging?: boolean;
  
  /** Default role ID for operations */
  defaultRoleId?: string;
}

/**
 * ControlPlaneStats - Statistics for the control plane
 */
export interface ControlPlaneStats {
  /** MCP Bus statistics */
  mcpBusStats: MCPBusStats;
  
  /** Number of loaded skills */
  loadedSkills: number;
  
  /** Number of active deployments */
  activeDeployments: number;
  
  /** Number of change events tracked */
  changeEventsTracked: number;
  
  /** Number of ownership checks performed */
  ownershipChecksPerformed: number;
  
  /** Uptime in milliseconds */
  uptimeMs: number;
}

/**
 * GovernanceOperation - Result of a governance operation
 */
export interface GovernanceOperation {
  /** Operation ID */
  id: string;
  
  /** Operation type */
  type: 'synthesize' | 'deploy' | 'test' | 'verify' | 'rebalance';
  
  /** Operation status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back';
  
  /** Change event (if applicable) */
  changeEvent?: ChangeEvent;
  
  /** Result data */
  data?: any;
  
  /** Error message (if failed) */
  error?: string;
  
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function now(): number {
  return Date.now();
}

// ============================================================================
// GovernanceControlPlane Class
// ============================================================================

/**
 * GovernanceControlPlane - Central control plane for ANFSF governance
 * 
 * Integrates:
 * - MCP Bus for agent communication
 * - Skills Registry for skill management
 * - Agent Harness for testing and deployment
 * - Change event tracking for audit trails
 * - Ownership arbitration for access control
 */
export class GovernanceControlPlane {
  private config: Required<ControlPlaneConfig>;
  private mcpBus: MCPBus;
  private skillsRegistry: SkillsRegistry;
  private sandboxExecutor: SandboxExecutor;
  private agentHarness: AgentHarness;
  private canaryDeployer: CanaryDeployer;
  
  private changeEvents: ChangeEvent[];
  private traceEdges: TraceEdge[];
  private operations: Map<string, GovernanceOperation>;
  private startTime: number;
  private logBuffer: string[];

  constructor(config: ControlPlaneConfig = {}) {
    this.config = {
      mcpBus: {},
      sandbox: {},
      enableChangeEventTracking: true,
      enableOwnershipArbitration: true,
      enableAuditLogging: true,
      defaultRoleId: 'system',
      ...config,
    };

    // Initialize components
    this.mcpBus = new MCPBus(this.config.mcpBus);
    this.skillsRegistry = new SkillsRegistry();
    this.sandboxExecutor = new SandboxExecutor(this.config.sandbox);
    this.agentHarness = new AgentHarness();
    this.canaryDeployer = new CanaryDeployer();

    // Initialize state
    this.changeEvents = [];
    this.traceEdges = [];
    this.operations = new Map();
    this.startTime = now();
    this.logBuffer = [];

    this.log('[ControlPlane] Initialized');
  }

  // ============================================================================
  // Core Methods
  // ============================================================================

  /**
   * Synthesize architecture
   */
  async synthesize(projectId: string, options?: { kAuto?: boolean }): Promise<GovernanceOperation> {
    const operationId = generateUUID();
    this.log(`[ControlPlane] Starting synthesis: ${operationId}`);

    const operation: GovernanceOperation = {
      id: operationId,
      type: 'synthesize',
      status: 'running',
      timestamp: now(),
    };

    try {
      // Send synthesis proposal via MCP
      const message = MCPBus.createMessageBuilder()
        .from(this.config.defaultRoleId)
        .to('*')
        .type('proposal')
        .payload({
          type: 'synthesize',
          projectId,
          kAuto: options?.kAuto,
        })
        .idempotentKey(`synthesize:${projectId}:${operationId}`)
        .build();

      await this.mcpBus.send(message);

      // Mock synthesis result
      const data = {
        projectId,
        roles: options?.kAuto ? 'auto-optimized' : 5,
        services: 12,
        contracts: 24,
      };

      // Create change event
      const changeEvent = this.createChangeEvent('create', 'architecture', data);
      operation.changeEvent = changeEvent;
      operation.data = data;
      operation.status = 'completed';

      this.log(`[ControlPlane] Synthesis completed: ${operationId}`);

    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.log(`[ControlPlane] Synthesis failed: ${operationId} - ${error}`);
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  /**
   * Deploy policy with canary
   */
  async deployPolicy(policy: Policy, canaryOptions?: CanaryOptions): Promise<GovernanceOperation> {
    const operationId = generateUUID();
    this.log(`[ControlPlane] Starting deployment: ${operationId}`);

    const operation: GovernanceOperation = {
      id: operationId,
      type: 'deploy',
      status: 'running',
      timestamp: now(),
    };

    try {
      // Ownership check
      if (this.config.enableOwnershipArbitration) {
        const ownershipCheck = await this.checkOwnership('policy', policy.id, 'deploy');
        if (!ownershipCheck.allowed) {
          throw new Error(`Ownership check failed: ${ownershipCheck.reason}`);
        }
      }

      // Deploy with canary
      const deploymentResult = await this.agentHarness.deployWithCanary(policy, canaryOptions);

      // Create change event
      const changeEvent = this.createChangeEvent('update', `policy:${policy.id}`, {
        policyId: policy.id,
        version: policy.version,
        deploymentId: deploymentResult.deploymentId,
        status: deploymentResult.status,
      });

      operation.changeEvent = changeEvent;
      operation.data = deploymentResult;
      operation.status = deploymentResult.status === 'complete' ? 'completed' : 
                         deploymentResult.status === 'rolled_back' ? 'rolled_back' : 'failed';

      this.log(`[ControlPlane] Deployment completed: ${operationId} - ${operation.status}`);

    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.log(`[ControlPlane] Deployment failed: ${operationId} - ${error}`);
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  /**
   * Run test scenario
   */
  async runTest(scenario: TestScenario): Promise<GovernanceOperation> {
    const operationId = generateUUID();
    this.log(`[ControlPlane] Starting test: ${operationId}`);

    const operation: GovernanceOperation = {
      id: operationId,
      type: 'test',
      status: 'running',
      timestamp: now(),
    };

    try {
      const testResult = await this.agentHarness.runTest(scenario);

      // Create change event
      const changeEvent = this.createChangeEvent('approve', `test:${scenario.id}`, {
        scenarioId: scenario.id,
        passed: testResult.passed,
        metrics: testResult.metrics,
      });

      operation.changeEvent = changeEvent;
      operation.data = testResult;
      operation.status = testResult.passed ? 'completed' : 'failed';

      this.log(`[ControlPlane] Test completed: ${operationId} - ${testResult.passed ? 'PASSED' : 'FAILED'}`);

    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.log(`[ControlPlane] Test failed: ${operationId} - ${error}`);
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  /**
   * Verify architecture consistency
   */
  async verify(projectId: string): Promise<GovernanceOperation> {
    const operationId = generateUUID();
    this.log(`[ControlPlane] Starting verification: ${operationId}`);

    const operation: GovernanceOperation = {
      id: operationId,
      type: 'verify',
      status: 'running',
      timestamp: now(),
    };

    try {
      // Mock verification
      const data = {
        projectId,
        consistency: {
          graphConsistency: true,
          contractConsistency: true,
          ownershipConsistency: true,
        },
        issues: [],
        score: 0.95,
      };

      operation.data = data;
      operation.status = 'completed';

      this.log(`[ControlPlane] Verification completed: ${operationId} - Score: ${data.score}`);

    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.log(`[ControlPlane] Verification failed: ${operationId} - ${error}`);
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  /**
   * Load skill
   */
  async loadSkill(skillName: string, version: string): Promise<GovernanceOperation> {
    const operationId = generateUUID();
    this.log(`[ControlPlane] Loading skill: ${skillName}@${version}`);

    const operation: GovernanceOperation = {
      id: operationId,
      type: 'synthesize', // Using synthesize as skill load is a form of synthesis
      status: 'running',
      timestamp: now(),
    };

    try {
      // Check dependencies first
      const skill: Skill = {
        name: skillName,
        version,
        dependencies: [],
        entryPoint: 'main',
        code: '',
      };

      const depCheck: DependencyCheckResult = await this.skillsRegistry.checkDependencies(skill);
      
      if (!depCheck.passed) {
        throw new Error(`Dependency check failed: ${depCheck.missingDependencies.join(', ')}`);
      }

      // Load skill
      const loadedSkill = await this.skillsRegistry.load(skillName, version);

      // Create change event
      const changeEvent = this.createChangeEvent('create', `skill:${skillName}`, {
        skillName,
        version,
        dependencies: loadedSkill.dependencies,
      });

      operation.changeEvent = changeEvent;
      operation.data = {
        skillName: loadedSkill.name,
        version: loadedSkill.version,
        status: loadedSkill.status,
      };
      operation.status = 'completed';

      this.log(`[ControlPlane] Skill loaded: ${skillName}@${version}`);

    } catch (error) {
      operation.status = 'failed';
      operation.error = String(error);
      this.log(`[ControlPlane] Skill load failed: ${skillName}@${version} - ${error}`);
    }

    this.operations.set(operationId, operation);
    return operation;
  }

  // ============================================================================
  // Ownership Arbitration
  // ============================================================================

  /**
   * Check ownership for a resource
   */
  async checkOwnership(resourceType: string, resourcePath: string, action: string): Promise<any> {
    this.log(`[ControlPlane] Ownership check: ${resourceType}:${resourcePath} - ${action}`);

    // Mock ownership check
    // In production, this would call the actual ownership lattice
    return {
      allowed: true,
      owningRoleId: this.config.defaultRoleId,
      reason: 'Default allow',
      budgetImpact: 0,
    };
  }

  // ============================================================================
  // Change Event Tracking
  // ============================================================================

  /**
   * Create a change event
   */
  private createChangeEvent(action: string, target: string, data: any): ChangeEvent {
    if (!this.config.enableChangeEventTracking) {
      return {} as ChangeEvent;
    }

    const changeEvent: ChangeEvent = {
      id: generateUUID(),
      ts: now(),
      actorRoleId: this.config.defaultRoleId,
      action: action as any,
      target: {
        kind: 'graph',
        idOrPath: target,
      },
      ownershipRuleId: 'control-plane-rule',
      diff: {
        added: data,
      },
      riskScore: this.calculateRiskScore(action, data),
      metadata: {
        source: 'control-plane',
      },
    };

    this.changeEvents.push(changeEvent);

    // Create trace edge
    this.createTraceEdge(this.config.defaultRoleId, 'AUTHORED', changeEvent.id);

    return changeEvent;
  }

  /**
   * Create a trace edge
   */
  private createTraceEdge(from: string, relation: string, to: string): void {
    const traceEdge: TraceEdge = {
      id: generateUUID(),
      from,
      to,
      relation: relation as any,
      ts: now(),
      metadata: {
        edgeType: 'governance',
      },
    };

    this.traceEdges.push(traceEdge);
  }

  /**
   * Calculate risk score for a change
   */
  private calculateRiskScore(action: string, data: any): number {
    // Simple risk calculation
    let risk = 10;

    if (action === 'delete') {
      risk += 30;
    }

    if (data?.criticality === 'high') {
      risk += 20;
    }

    if (data?.blastRadius > 10) {
      risk += 15;
    }

    return Math.min(risk, 100);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get control plane statistics
   */
  getStats(): ControlPlaneStats {
    return {
      mcpBusStats: this.mcpBus.getStats(),
      loadedSkills: this.skillsRegistry ? 0 : 0, // Would need to expose this from registry
      activeDeployments: this.agentHarness ? this.agentHarness.getActiveDeployments().length : 0,
      changeEventsTracked: this.changeEvents.length,
      ownershipChecksPerformed: 0, // Would need to track this
      uptimeMs: now() - this.startTime,
    };
  }

  /**
   * Get change events
   */
  getChangeEvents(limit: number = 100): ChangeEvent[] {
    return this.changeEvents.slice(-limit);
  }

  /**
   * Get trace edges
   */
  getTraceEdges(limit: number = 100): TraceEdge[] {
    return this.traceEdges.slice(-limit);
  }

  /**
   * Get operation by ID
   */
  getOperation(operationId: string): GovernanceOperation | null {
    return this.operations.get(operationId) || null;
  }

  /**
   * Get all operations
   */
  getOperations(): GovernanceOperation[] {
    return Array.from(this.operations.values());
  }

  /**
   * Get logs
   */
  getLogs(limit: number = 100): string[] {
    return this.logBuffer.slice(-limit);
  }

  /**
   * Log a message
   */
  private log(message: string): void {
    if (this.config.enableAuditLogging) {
      this.logBuffer.push(`[${now()}] ${message}`);
      if (this.logBuffer.length > 1000) {
        this.logBuffer.shift();
      }
      console.log(message);
    }
  }

  /**
   * Get MCP Bus instance
   */
  getMCPBus(): MCPBus {
    return this.mcpBus;
  }

  /**
   * Get Skills Registry instance
   */
  getSkillsRegistry(): SkillsRegistry {
    return this.skillsRegistry;
  }

  /**
   * Get Agent Harness instance
   */
  getAgentHarness(): AgentHarness {
    return this.agentHarness;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default GovernanceControlPlane;
