/**
 * ANFSF V4 Layer 8.5 - Governance Control Plane
 *
 * Central control plane integrating CLI, MCP Bus, Skills Registry, and Agent Harness.
 * Provides unified governance operations with ownership arbitration, change tracking, and audit trails.
 */
import { MCPBus } from '../mcp/mcp-bus';
import { MCPBusConfig, MCPBusStats } from '../mcp/types';
import { SkillsRegistry } from '../skills/skills-registry';
import { SandboxConfig } from '../skills/types';
import { AgentHarness } from '../harness/agent-harness';
import { TestScenario, Policy, CanaryOptions } from '../harness/types';
import { ChangeEvent, TraceEdge } from '../core/graph/types';
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
export declare class GovernanceControlPlane {
    private config;
    private mcpBus;
    private skillsRegistry;
    private sandboxExecutor;
    private agentHarness;
    private canaryDeployer;
    private changeEvents;
    private traceEdges;
    private operations;
    private startTime;
    private logBuffer;
    constructor(config?: ControlPlaneConfig);
    /**
     * Synthesize architecture
     */
    synthesize(projectId: string, options?: {
        kAuto?: boolean;
    }): Promise<GovernanceOperation>;
    /**
     * Deploy policy with canary
     */
    deployPolicy(policy: Policy, canaryOptions?: CanaryOptions): Promise<GovernanceOperation>;
    /**
     * Run test scenario
     */
    runTest(scenario: TestScenario): Promise<GovernanceOperation>;
    /**
     * Verify architecture consistency
     */
    verify(projectId: string): Promise<GovernanceOperation>;
    /**
     * Load skill
     */
    loadSkill(skillName: string, version: string): Promise<GovernanceOperation>;
    /**
     * Check ownership for a resource
     */
    checkOwnership(resourceType: string, resourcePath: string, action: string): Promise<any>;
    /**
     * Create a change event
     */
    private createChangeEvent;
    /**
     * Create a trace edge
     */
    private createTraceEdge;
    /**
     * Calculate risk score for a change
     */
    private calculateRiskScore;
    /**
     * Get control plane statistics
     */
    getStats(): ControlPlaneStats;
    /**
     * Get change events
     */
    getChangeEvents(limit?: number): ChangeEvent[];
    /**
     * Get trace edges
     */
    getTraceEdges(limit?: number): TraceEdge[];
    /**
     * Get operation by ID
     */
    getOperation(operationId: string): GovernanceOperation | null;
    /**
     * Get all operations
     */
    getOperations(): GovernanceOperation[];
    /**
     * Get logs
     */
    getLogs(limit?: number): string[];
    /**
     * Log a message
     */
    private log;
    /**
     * Get MCP Bus instance
     */
    getMCPBus(): MCPBus;
    /**
     * Get Skills Registry instance
     */
    getSkillsRegistry(): SkillsRegistry;
    /**
     * Get Agent Harness instance
     */
    getAgentHarness(): AgentHarness;
}
export default GovernanceControlPlane;
