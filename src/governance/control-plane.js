"use strict";
/**
 * ANFSF V4 Layer 8.5 - Governance Control Plane
 *
 * Central control plane integrating CLI, MCP Bus, Skills Registry, and Agent Harness.
 * Provides unified governance operations with ownership arbitration, change tracking, and audit trails.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceControlPlane = void 0;
const mcp_bus_1 = require("../mcp/mcp-bus");
const skills_registry_1 = require("../skills/skills-registry");
const sandbox_executor_1 = require("../skills/sandbox-executor");
const agent_harness_1 = require("../harness/agent-harness");
const canary_deployer_1 = require("../harness/canary-deployer");
// ============================================================================
// Constants
// ============================================================================
const CONTROL_PLANE_VERSION = '1.5.0';
const SCHEMA_VERSION = '2026-03';
// ============================================================================
// Helper Functions
// ============================================================================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function now() {
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
class GovernanceControlPlane {
    constructor(config = {}) {
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
        this.mcpBus = new mcp_bus_1.MCPBus(this.config.mcpBus);
        this.skillsRegistry = new skills_registry_1.SkillsRegistry();
        this.sandboxExecutor = new sandbox_executor_1.SandboxExecutor(this.config.sandbox);
        this.agentHarness = new agent_harness_1.AgentHarness();
        this.canaryDeployer = new canary_deployer_1.CanaryDeployer();
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
    async synthesize(projectId, options) {
        const operationId = generateUUID();
        this.log(`[ControlPlane] Starting synthesis: ${operationId}`);
        const operation = {
            id: operationId,
            type: 'synthesize',
            status: 'running',
            timestamp: now(),
        };
        try {
            // Send synthesis proposal via MCP
            const message = mcp_bus_1.MCPBus.createMessageBuilder()
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
        }
        catch (error) {
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
    async deployPolicy(policy, canaryOptions) {
        const operationId = generateUUID();
        this.log(`[ControlPlane] Starting deployment: ${operationId}`);
        const operation = {
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
        }
        catch (error) {
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
    async runTest(scenario) {
        const operationId = generateUUID();
        this.log(`[ControlPlane] Starting test: ${operationId}`);
        const operation = {
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
        }
        catch (error) {
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
    async verify(projectId) {
        const operationId = generateUUID();
        this.log(`[ControlPlane] Starting verification: ${operationId}`);
        const operation = {
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
        }
        catch (error) {
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
    async loadSkill(skillName, version) {
        const operationId = generateUUID();
        this.log(`[ControlPlane] Loading skill: ${skillName}@${version}`);
        const operation = {
            id: operationId,
            type: 'synthesize', // Using synthesize as skill load is a form of synthesis
            status: 'running',
            timestamp: now(),
        };
        try {
            // Check dependencies first
            const skill = {
                name: skillName,
                version,
                dependencies: [],
                entryPoint: 'main',
                code: '',
            };
            const depCheck = await this.skillsRegistry.checkDependencies(skill);
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
        }
        catch (error) {
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
    async checkOwnership(resourceType, resourcePath, action) {
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
    createChangeEvent(action, target, data) {
        if (!this.config.enableChangeEventTracking) {
            return {};
        }
        const changeEvent = {
            id: generateUUID(),
            ts: now(),
            actorRoleId: this.config.defaultRoleId,
            action: action,
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
    createTraceEdge(from, relation, to) {
        const traceEdge = {
            id: generateUUID(),
            from,
            to,
            relation: relation,
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
    calculateRiskScore(action, data) {
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
    getStats() {
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
    getChangeEvents(limit = 100) {
        return this.changeEvents.slice(-limit);
    }
    /**
     * Get trace edges
     */
    getTraceEdges(limit = 100) {
        return this.traceEdges.slice(-limit);
    }
    /**
     * Get operation by ID
     */
    getOperation(operationId) {
        return this.operations.get(operationId) || null;
    }
    /**
     * Get all operations
     */
    getOperations() {
        return Array.from(this.operations.values());
    }
    /**
     * Get logs
     */
    getLogs(limit = 100) {
        return this.logBuffer.slice(-limit);
    }
    /**
     * Log a message
     */
    log(message) {
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
    getMCPBus() {
        return this.mcpBus;
    }
    /**
     * Get Skills Registry instance
     */
    getSkillsRegistry() {
        return this.skillsRegistry;
    }
    /**
     * Get Agent Harness instance
     */
    getAgentHarness() {
        return this.agentHarness;
    }
}
exports.GovernanceControlPlane = GovernanceControlPlane;
// ============================================================================
// Exports
// ============================================================================
exports.default = GovernanceControlPlane;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJvbC1wbGFuZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNvbnRyb2wtcGxhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUFFSCw0Q0FBd0Q7QUFHeEQsK0RBQTJEO0FBQzNELGlFQUE2RDtBQUc3RCw0REFBd0Q7QUFDeEQsZ0VBQTREO0FBTTVELCtFQUErRTtBQUMvRSxZQUFZO0FBQ1osK0VBQStFO0FBRS9FLE1BQU0scUJBQXFCLEdBQUcsT0FBTyxDQUFDO0FBQ3RDLE1BQU0sY0FBYyxHQUFHLFNBQVMsQ0FBQztBQThFakMsK0VBQStFO0FBQy9FLG1CQUFtQjtBQUNuQiwrRUFBK0U7QUFFL0UsU0FBUyxZQUFZO0lBQ25CLE9BQU8sc0NBQXNDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ25FLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxHQUFHLEdBQUcsQ0FBQztRQUMxQyxPQUFPLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDeEIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsU0FBUyxHQUFHO0lBQ1YsT0FBTyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7QUFDcEIsQ0FBQztBQUVELCtFQUErRTtBQUMvRSwrQkFBK0I7QUFDL0IsK0VBQStFO0FBRS9FOzs7Ozs7Ozs7R0FTRztBQUNILE1BQWEsc0JBQXNCO0lBY2pDLFlBQVksU0FBNkIsRUFBRTtRQUN6QyxJQUFJLENBQUMsTUFBTSxHQUFHO1lBQ1osTUFBTSxFQUFFLEVBQUU7WUFDVixPQUFPLEVBQUUsRUFBRTtZQUNYLHlCQUF5QixFQUFFLElBQUk7WUFDL0IsMEJBQTBCLEVBQUUsSUFBSTtZQUNoQyxrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLGFBQWEsRUFBRSxRQUFRO1lBQ3ZCLEdBQUcsTUFBTTtTQUNWLENBQUM7UUFFRix3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGdCQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO1FBQzNDLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxrQ0FBZSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDaEUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLDRCQUFZLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO1FBRTNDLG1CQUFtQjtRQUNuQixJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7UUFDNUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxHQUFHLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUVwQixJQUFJLENBQUMsR0FBRyxDQUFDLDRCQUE0QixDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVELCtFQUErRTtJQUMvRSxlQUFlO0lBQ2YsK0VBQStFO0lBRS9FOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFVBQVUsQ0FBQyxTQUFpQixFQUFFLE9BQTZCO1FBQy9ELE1BQU0sV0FBVyxHQUFHLFlBQVksRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsc0NBQXNDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFOUQsTUFBTSxTQUFTLEdBQXdCO1lBQ3JDLEVBQUUsRUFBRSxXQUFXO1lBQ2YsSUFBSSxFQUFFLFlBQVk7WUFDbEIsTUFBTSxFQUFFLFNBQVM7WUFDakIsU0FBUyxFQUFFLEdBQUcsRUFBRTtTQUNqQixDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0gsa0NBQWtDO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLGdCQUFNLENBQUMsb0JBQW9CLEVBQUU7aUJBQzFDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztpQkFDL0IsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDO2lCQUNoQixPQUFPLENBQUM7Z0JBQ1AsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLFNBQVM7Z0JBQ1QsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLO2FBQ3RCLENBQUM7aUJBQ0QsYUFBYSxDQUFDLGNBQWMsU0FBUyxJQUFJLFdBQVcsRUFBRSxDQUFDO2lCQUN2RCxLQUFLLEVBQUUsQ0FBQztZQUVYLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFaEMsd0JBQXdCO1lBQ3hCLE1BQU0sSUFBSSxHQUFHO2dCQUNYLFNBQVM7Z0JBQ1QsS0FBSyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM1QyxRQUFRLEVBQUUsRUFBRTtnQkFDWixTQUFTLEVBQUUsRUFBRTthQUNkLENBQUM7WUFFRixzQkFBc0I7WUFDdEIsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDM0UsU0FBUyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7WUFDcEMsU0FBUyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUM7WUFDdEIsU0FBUyxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUM7WUFFL0IsSUFBSSxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUVqRSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLFNBQVMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsb0NBQW9DLFdBQVcsTUFBTSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUMsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFjLEVBQUUsYUFBNkI7UUFDOUQsTUFBTSxXQUFXLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyx1Q0FBdUMsV0FBVyxFQUFFLENBQUMsQ0FBQztRQUUvRCxNQUFNLFNBQVMsR0FBd0I7WUFDckMsRUFBRSxFQUFFLFdBQVc7WUFDZixJQUFJLEVBQUUsUUFBUTtZQUNkLE1BQU0sRUFBRSxTQUFTO1lBQ2pCLFNBQVMsRUFBRSxHQUFHLEVBQUU7U0FDakIsQ0FBQztRQUVGLElBQUksQ0FBQztZQUNILGtCQUFrQjtZQUNsQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNoRixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLDJCQUEyQixjQUFjLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDdEUsQ0FBQztZQUNILENBQUM7WUFFRCxxQkFBcUI7WUFDckIsTUFBTSxnQkFBZ0IsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1lBRXpGLHNCQUFzQjtZQUN0QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLFVBQVUsTUFBTSxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUMxRSxRQUFRLEVBQUUsTUFBTSxDQUFDLEVBQUU7Z0JBQ25CLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztnQkFDdkIsWUFBWSxFQUFFLGdCQUFnQixDQUFDLFlBQVk7Z0JBQzNDLE1BQU0sRUFBRSxnQkFBZ0IsQ0FBQyxNQUFNO2FBQ2hDLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQ3BDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsZ0JBQWdCLENBQUM7WUFDbEMsU0FBUyxDQUFDLE1BQU0sR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDdEQsZ0JBQWdCLENBQUMsTUFBTSxLQUFLLGFBQWEsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFFeEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsV0FBVyxNQUFNLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRXhGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsU0FBUyxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUM7WUFDNUIsU0FBUyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxxQ0FBcUMsV0FBVyxNQUFNLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDMUUsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM1QyxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQXNCO1FBQ2xDLE1BQU0sV0FBVyxHQUFHLFlBQVksRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQUMsaUNBQWlDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFFekQsTUFBTSxTQUFTLEdBQXdCO1lBQ3JDLEVBQUUsRUFBRSxXQUFXO1lBQ2YsSUFBSSxFQUFFLE1BQU07WUFDWixNQUFNLEVBQUUsU0FBUztZQUNqQixTQUFTLEVBQUUsR0FBRyxFQUFFO1NBQ2pCLENBQUM7UUFFRixJQUFJLENBQUM7WUFDSCxNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTdELHNCQUFzQjtZQUN0QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLFFBQVEsUUFBUSxDQUFDLEVBQUUsRUFBRSxFQUFFO2dCQUMzRSxVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUU7Z0JBQ3ZCLE1BQU0sRUFBRSxVQUFVLENBQUMsTUFBTTtnQkFDekIsT0FBTyxFQUFFLFVBQVUsQ0FBQyxPQUFPO2FBQzVCLENBQUMsQ0FBQztZQUVILFNBQVMsQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1lBQ3BDLFNBQVMsQ0FBQyxJQUFJLEdBQUcsVUFBVSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7WUFFOUQsSUFBSSxDQUFDLEdBQUcsQ0FBQyxrQ0FBa0MsV0FBVyxNQUFNLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUV6RyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLFNBQVMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsK0JBQStCLFdBQVcsTUFBTSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUMsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFpQjtRQUM1QixNQUFNLFdBQVcsR0FBRyxZQUFZLEVBQUUsQ0FBQztRQUNuQyxJQUFJLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRWpFLE1BQU0sU0FBUyxHQUF3QjtZQUNyQyxFQUFFLEVBQUUsV0FBVztZQUNmLElBQUksRUFBRSxRQUFRO1lBQ2QsTUFBTSxFQUFFLFNBQVM7WUFDakIsU0FBUyxFQUFFLEdBQUcsRUFBRTtTQUNqQixDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0gsb0JBQW9CO1lBQ3BCLE1BQU0sSUFBSSxHQUFHO2dCQUNYLFNBQVM7Z0JBQ1QsV0FBVyxFQUFFO29CQUNYLGdCQUFnQixFQUFFLElBQUk7b0JBQ3RCLG1CQUFtQixFQUFFLElBQUk7b0JBQ3pCLG9CQUFvQixFQUFFLElBQUk7aUJBQzNCO2dCQUNELE1BQU0sRUFBRSxFQUFFO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1osQ0FBQztZQUVGLFNBQVMsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1lBQ3RCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDO1lBRS9CLElBQUksQ0FBQyxHQUFHLENBQUMsMENBQTBDLFdBQVcsYUFBYSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUUzRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLFNBQVMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsdUNBQXVDLFdBQVcsTUFBTSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDNUMsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLFNBQVMsQ0FBQyxTQUFpQixFQUFFLE9BQWU7UUFDaEQsTUFBTSxXQUFXLEdBQUcsWUFBWSxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxpQ0FBaUMsU0FBUyxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFFbEUsTUFBTSxTQUFTLEdBQXdCO1lBQ3JDLEVBQUUsRUFBRSxXQUFXO1lBQ2YsSUFBSSxFQUFFLFlBQVksRUFBRSx3REFBd0Q7WUFDNUUsTUFBTSxFQUFFLFNBQVM7WUFDakIsU0FBUyxFQUFFLEdBQUcsRUFBRTtTQUNqQixDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0gsMkJBQTJCO1lBQzNCLE1BQU0sS0FBSyxHQUFVO2dCQUNuQixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPO2dCQUNQLFlBQVksRUFBRSxFQUFFO2dCQUNoQixVQUFVLEVBQUUsTUFBTTtnQkFDbEIsSUFBSSxFQUFFLEVBQUU7YUFDVCxDQUFDO1lBRUYsTUFBTSxRQUFRLEdBQTBCLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUUzRixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLDRCQUE0QixRQUFRLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN6RixDQUFDO1lBRUQsYUFBYTtZQUNiLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBRXZFLHNCQUFzQjtZQUN0QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLFNBQVMsU0FBUyxFQUFFLEVBQUU7Z0JBQ3pFLFNBQVM7Z0JBQ1QsT0FBTztnQkFDUCxZQUFZLEVBQUUsV0FBVyxDQUFDLFlBQVk7YUFDdkMsQ0FBQyxDQUFDO1lBRUgsU0FBUyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7WUFDcEMsU0FBUyxDQUFDLElBQUksR0FBRztnQkFDZixTQUFTLEVBQUUsV0FBVyxDQUFDLElBQUk7Z0JBQzNCLE9BQU8sRUFBRSxXQUFXLENBQUMsT0FBTztnQkFDNUIsTUFBTSxFQUFFLFdBQVcsQ0FBQyxNQUFNO2FBQzNCLENBQUM7WUFDRixTQUFTLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQztZQUUvQixJQUFJLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxTQUFTLElBQUksT0FBTyxFQUFFLENBQUMsQ0FBQztRQUVuRSxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLFNBQVMsQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDO1lBQzVCLFNBQVMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMscUNBQXFDLFNBQVMsSUFBSSxPQUFPLE1BQU0sS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBRUQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7SUFFRCwrRUFBK0U7SUFDL0Usd0JBQXdCO0lBQ3hCLCtFQUErRTtJQUUvRTs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsWUFBb0IsRUFBRSxZQUFvQixFQUFFLE1BQWM7UUFDN0UsSUFBSSxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsWUFBWSxJQUFJLFlBQVksTUFBTSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRXhGLHVCQUF1QjtRQUN2Qiw4REFBOEQ7UUFDOUQsT0FBTztZQUNMLE9BQU8sRUFBRSxJQUFJO1lBQ2IsWUFBWSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYTtZQUN2QyxNQUFNLEVBQUUsZUFBZTtZQUN2QixZQUFZLEVBQUUsQ0FBQztTQUNoQixDQUFDO0lBQ0osQ0FBQztJQUVELCtFQUErRTtJQUMvRSx3QkFBd0I7SUFDeEIsK0VBQStFO0lBRS9FOztPQUVHO0lBQ0ssaUJBQWlCLENBQUMsTUFBYyxFQUFFLE1BQWMsRUFBRSxJQUFTO1FBQ2pFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDM0MsT0FBTyxFQUFpQixDQUFDO1FBQzNCLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBZ0I7WUFDL0IsRUFBRSxFQUFFLFlBQVksRUFBRTtZQUNsQixFQUFFLEVBQUUsR0FBRyxFQUFFO1lBQ1QsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsYUFBYTtZQUN0QyxNQUFNLEVBQUUsTUFBYTtZQUNyQixNQUFNLEVBQUU7Z0JBQ04sSUFBSSxFQUFFLE9BQU87Z0JBQ2IsUUFBUSxFQUFFLE1BQU07YUFDakI7WUFDRCxlQUFlLEVBQUUsb0JBQW9CO1lBQ3JDLElBQUksRUFBRTtnQkFDSixLQUFLLEVBQUUsSUFBSTthQUNaO1lBQ0QsU0FBUyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDO1lBQ2hELFFBQVEsRUFBRTtnQkFDUixNQUFNLEVBQUUsZUFBZTthQUN4QjtTQUNGLENBQUM7UUFFRixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUVwQyxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTVFLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNLLGVBQWUsQ0FBQyxJQUFZLEVBQUUsUUFBZ0IsRUFBRSxFQUFVO1FBQ2hFLE1BQU0sU0FBUyxHQUFjO1lBQzNCLEVBQUUsRUFBRSxZQUFZLEVBQUU7WUFDbEIsSUFBSTtZQUNKLEVBQUU7WUFDRixRQUFRLEVBQUUsUUFBZTtZQUN6QixFQUFFLEVBQUUsR0FBRyxFQUFFO1lBQ1QsUUFBUSxFQUFFO2dCQUNSLFFBQVEsRUFBRSxZQUFZO2FBQ3ZCO1NBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRDs7T0FFRztJQUNLLGtCQUFrQixDQUFDLE1BQWMsRUFBRSxJQUFTO1FBQ2xELDBCQUEwQjtRQUMxQixJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7UUFFZCxJQUFJLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN4QixJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxFQUFFLFdBQVcsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUNqQyxJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUVELElBQUksSUFBSSxFQUFFLFdBQVcsR0FBRyxFQUFFLEVBQUUsQ0FBQztZQUMzQixJQUFJLElBQUksRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVELCtFQUErRTtJQUMvRSxrQkFBa0I7SUFDbEIsK0VBQStFO0lBRS9FOztPQUVHO0lBQ0gsUUFBUTtRQUNOLE9BQU87WUFDTCxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDbkMsWUFBWSxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLDBDQUEwQztZQUNyRixpQkFBaUIsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQzFGLG1CQUFtQixFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTTtZQUM3Qyx3QkFBd0IsRUFBRSxDQUFDLEVBQUUsMkJBQTJCO1lBQ3hELFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsU0FBUztTQUNqQyxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsZUFBZSxDQUFDLFFBQWdCLEdBQUc7UUFDakMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILGFBQWEsQ0FBQyxRQUFnQixHQUFHO1FBQy9CLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxZQUFZLENBQUMsV0FBbUI7UUFDOUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsSUFBSSxJQUFJLENBQUM7SUFDbEQsQ0FBQztJQUVEOztPQUVHO0lBQ0gsYUFBYTtRQUNYLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTyxDQUFDLFFBQWdCLEdBQUc7UUFDekIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRDs7T0FFRztJQUNLLEdBQUcsQ0FBQyxPQUFlO1FBQ3pCLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksR0FBRyxFQUFFLEtBQUssT0FBTyxFQUFFLENBQUMsQ0FBQztZQUM3QyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDO2dCQUNqQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ3pCLENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3ZCLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxTQUFTO1FBQ1AsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3JCLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQjtRQUNmLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzNCLENBQUM7Q0FDRjtBQWhlRCx3REFnZUM7QUFFRCwrRUFBK0U7QUFDL0UsVUFBVTtBQUNWLCtFQUErRTtBQUUvRSxrQkFBZSxzQkFBc0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjQgTGF5ZXIgOC41IC0gR292ZXJuYW5jZSBDb250cm9sIFBsYW5lXG4gKiBcbiAqIENlbnRyYWwgY29udHJvbCBwbGFuZSBpbnRlZ3JhdGluZyBDTEksIE1DUCBCdXMsIFNraWxscyBSZWdpc3RyeSwgYW5kIEFnZW50IEhhcm5lc3MuXG4gKiBQcm92aWRlcyB1bmlmaWVkIGdvdmVybmFuY2Ugb3BlcmF0aW9ucyB3aXRoIG93bmVyc2hpcCBhcmJpdHJhdGlvbiwgY2hhbmdlIHRyYWNraW5nLCBhbmQgYXVkaXQgdHJhaWxzLlxuICovXG5cbmltcG9ydCB7IE1DUEJ1cywgTWVzc2FnZUJ1aWxkZXIgfSBmcm9tICcuLi9tY3AvbWNwLWJ1cyc7XG5pbXBvcnQgeyBNQ1BNZXNzYWdlLCBNQ1BCdXNDb25maWcsIE1DUEJ1c1N0YXRzIH0gZnJvbSAnLi4vbWNwL3R5cGVzJztcblxuaW1wb3J0IHsgU2tpbGxzUmVnaXN0cnkgfSBmcm9tICcuLi9za2lsbHMvc2tpbGxzLXJlZ2lzdHJ5JztcbmltcG9ydCB7IFNhbmRib3hFeGVjdXRvciB9IGZyb20gJy4uL3NraWxscy9zYW5kYm94LWV4ZWN1dG9yJztcbmltcG9ydCB7IFNhbmRib3hDb25maWcsIFNraWxsLCBEZXBlbmRlbmN5Q2hlY2tSZXN1bHQgfSBmcm9tICcuLi9za2lsbHMvdHlwZXMnO1xuXG5pbXBvcnQgeyBBZ2VudEhhcm5lc3MgfSBmcm9tICcuLi9oYXJuZXNzL2FnZW50LWhhcm5lc3MnO1xuaW1wb3J0IHsgQ2FuYXJ5RGVwbG95ZXIgfSBmcm9tICcuLi9oYXJuZXNzL2NhbmFyeS1kZXBsb3llcic7XG5pbXBvcnQgeyBBQlRlc3RSdW5uZXIgfSBmcm9tICcuLi9oYXJuZXNzL2FiLXRlc3QtcnVubmVyJztcbmltcG9ydCB7IFRlc3RTY2VuYXJpbywgVGVzdFJlc3VsdCwgRGVwbG95bWVudFJlc3VsdCwgUG9saWN5LCBDYW5hcnlPcHRpb25zIH0gZnJvbSAnLi4vaGFybmVzcy90eXBlcyc7XG5cbmltcG9ydCB7IENoYW5nZUV2ZW50LCBUcmFjZUVkZ2UgfSBmcm9tICcuLi9jb3JlL2dyYXBoL3R5cGVzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IENPTlRST0xfUExBTkVfVkVSU0lPTiA9ICcxLjUuMCc7XG5jb25zdCBTQ0hFTUFfVkVSU0lPTiA9ICcyMDI2LTAzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDb250cm9sUGxhbmVDb25maWcgLSBDb25maWd1cmF0aW9uIGZvciB0aGUgZ292ZXJuYW5jZSBjb250cm9sIHBsYW5lXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29udHJvbFBsYW5lQ29uZmlnIHtcbiAgLyoqIE1DUCBCdXMgY29uZmlndXJhdGlvbiAqL1xuICBtY3BCdXM/OiBNQ1BCdXNDb25maWc7XG4gIFxuICAvKiogU2FuZGJveCBjb25maWd1cmF0aW9uICovXG4gIHNhbmRib3g/OiBTYW5kYm94Q29uZmlnO1xuICBcbiAgLyoqIEVuYWJsZSBjaGFuZ2UgZXZlbnQgdHJhY2tpbmcgKi9cbiAgZW5hYmxlQ2hhbmdlRXZlbnRUcmFja2luZz86IGJvb2xlYW47XG4gIFxuICAvKiogRW5hYmxlIG93bmVyc2hpcCBhcmJpdHJhdGlvbiAqL1xuICBlbmFibGVPd25lcnNoaXBBcmJpdHJhdGlvbj86IGJvb2xlYW47XG4gIFxuICAvKiogRW5hYmxlIGF1ZGl0IGxvZ2dpbmcgKi9cbiAgZW5hYmxlQXVkaXRMb2dnaW5nPzogYm9vbGVhbjtcbiAgXG4gIC8qKiBEZWZhdWx0IHJvbGUgSUQgZm9yIG9wZXJhdGlvbnMgKi9cbiAgZGVmYXVsdFJvbGVJZD86IHN0cmluZztcbn1cblxuLyoqXG4gKiBDb250cm9sUGxhbmVTdGF0cyAtIFN0YXRpc3RpY3MgZm9yIHRoZSBjb250cm9sIHBsYW5lXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29udHJvbFBsYW5lU3RhdHMge1xuICAvKiogTUNQIEJ1cyBzdGF0aXN0aWNzICovXG4gIG1jcEJ1c1N0YXRzOiBNQ1BCdXNTdGF0cztcbiAgXG4gIC8qKiBOdW1iZXIgb2YgbG9hZGVkIHNraWxscyAqL1xuICBsb2FkZWRTa2lsbHM6IG51bWJlcjtcbiAgXG4gIC8qKiBOdW1iZXIgb2YgYWN0aXZlIGRlcGxveW1lbnRzICovXG4gIGFjdGl2ZURlcGxveW1lbnRzOiBudW1iZXI7XG4gIFxuICAvKiogTnVtYmVyIG9mIGNoYW5nZSBldmVudHMgdHJhY2tlZCAqL1xuICBjaGFuZ2VFdmVudHNUcmFja2VkOiBudW1iZXI7XG4gIFxuICAvKiogTnVtYmVyIG9mIG93bmVyc2hpcCBjaGVja3MgcGVyZm9ybWVkICovXG4gIG93bmVyc2hpcENoZWNrc1BlcmZvcm1lZDogbnVtYmVyO1xuICBcbiAgLyoqIFVwdGltZSBpbiBtaWxsaXNlY29uZHMgKi9cbiAgdXB0aW1lTXM6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBHb3Zlcm5hbmNlT3BlcmF0aW9uIC0gUmVzdWx0IG9mIGEgZ292ZXJuYW5jZSBvcGVyYXRpb25cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBHb3Zlcm5hbmNlT3BlcmF0aW9uIHtcbiAgLyoqIE9wZXJhdGlvbiBJRCAqL1xuICBpZDogc3RyaW5nO1xuICBcbiAgLyoqIE9wZXJhdGlvbiB0eXBlICovXG4gIHR5cGU6ICdzeW50aGVzaXplJyB8ICdkZXBsb3knIHwgJ3Rlc3QnIHwgJ3ZlcmlmeScgfCAncmViYWxhbmNlJztcbiAgXG4gIC8qKiBPcGVyYXRpb24gc3RhdHVzICovXG4gIHN0YXR1czogJ3BlbmRpbmcnIHwgJ3J1bm5pbmcnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJyB8ICdyb2xsZWRfYmFjayc7XG4gIFxuICAvKiogQ2hhbmdlIGV2ZW50IChpZiBhcHBsaWNhYmxlKSAqL1xuICBjaGFuZ2VFdmVudD86IENoYW5nZUV2ZW50O1xuICBcbiAgLyoqIFJlc3VsdCBkYXRhICovXG4gIGRhdGE/OiBhbnk7XG4gIFxuICAvKiogRXJyb3IgbWVzc2FnZSAoaWYgZmFpbGVkKSAqL1xuICBlcnJvcj86IHN0cmluZztcbiAgXG4gIC8qKiBUaW1lc3RhbXAgKi9cbiAgdGltZXN0YW1wOiBudW1iZXI7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlciBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCk6IHN0cmluZyB7XG4gIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIChjKSA9PiB7XG4gICAgY29uc3QgciA9IChNYXRoLnJhbmRvbSgpICogMTYpIHwgMDtcbiAgICBjb25zdCB2ID0gYyA9PT0gJ3gnID8gciA6IChyICYgMHgzKSB8IDB4ODtcbiAgICByZXR1cm4gdi50b1N0cmluZygxNik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBub3coKTogbnVtYmVyIHtcbiAgcmV0dXJuIERhdGUubm93KCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEdvdmVybmFuY2VDb250cm9sUGxhbmUgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBHb3Zlcm5hbmNlQ29udHJvbFBsYW5lIC0gQ2VudHJhbCBjb250cm9sIHBsYW5lIGZvciBBTkZTRiBnb3Zlcm5hbmNlXG4gKiBcbiAqIEludGVncmF0ZXM6XG4gKiAtIE1DUCBCdXMgZm9yIGFnZW50IGNvbW11bmljYXRpb25cbiAqIC0gU2tpbGxzIFJlZ2lzdHJ5IGZvciBza2lsbCBtYW5hZ2VtZW50XG4gKiAtIEFnZW50IEhhcm5lc3MgZm9yIHRlc3RpbmcgYW5kIGRlcGxveW1lbnRcbiAqIC0gQ2hhbmdlIGV2ZW50IHRyYWNraW5nIGZvciBhdWRpdCB0cmFpbHNcbiAqIC0gT3duZXJzaGlwIGFyYml0cmF0aW9uIGZvciBhY2Nlc3MgY29udHJvbFxuICovXG5leHBvcnQgY2xhc3MgR292ZXJuYW5jZUNvbnRyb2xQbGFuZSB7XG4gIHByaXZhdGUgY29uZmlnOiBSZXF1aXJlZDxDb250cm9sUGxhbmVDb25maWc+O1xuICBwcml2YXRlIG1jcEJ1czogTUNQQnVzO1xuICBwcml2YXRlIHNraWxsc1JlZ2lzdHJ5OiBTa2lsbHNSZWdpc3RyeTtcbiAgcHJpdmF0ZSBzYW5kYm94RXhlY3V0b3I6IFNhbmRib3hFeGVjdXRvcjtcbiAgcHJpdmF0ZSBhZ2VudEhhcm5lc3M6IEFnZW50SGFybmVzcztcbiAgcHJpdmF0ZSBjYW5hcnlEZXBsb3llcjogQ2FuYXJ5RGVwbG95ZXI7XG4gIFxuICBwcml2YXRlIGNoYW5nZUV2ZW50czogQ2hhbmdlRXZlbnRbXTtcbiAgcHJpdmF0ZSB0cmFjZUVkZ2VzOiBUcmFjZUVkZ2VbXTtcbiAgcHJpdmF0ZSBvcGVyYXRpb25zOiBNYXA8c3RyaW5nLCBHb3Zlcm5hbmNlT3BlcmF0aW9uPjtcbiAgcHJpdmF0ZSBzdGFydFRpbWU6IG51bWJlcjtcbiAgcHJpdmF0ZSBsb2dCdWZmZXI6IHN0cmluZ1tdO1xuXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogQ29udHJvbFBsYW5lQ29uZmlnID0ge30pIHtcbiAgICB0aGlzLmNvbmZpZyA9IHtcbiAgICAgIG1jcEJ1czoge30sXG4gICAgICBzYW5kYm94OiB7fSxcbiAgICAgIGVuYWJsZUNoYW5nZUV2ZW50VHJhY2tpbmc6IHRydWUsXG4gICAgICBlbmFibGVPd25lcnNoaXBBcmJpdHJhdGlvbjogdHJ1ZSxcbiAgICAgIGVuYWJsZUF1ZGl0TG9nZ2luZzogdHJ1ZSxcbiAgICAgIGRlZmF1bHRSb2xlSWQ6ICdzeXN0ZW0nLFxuICAgICAgLi4uY29uZmlnLFxuICAgIH07XG5cbiAgICAvLyBJbml0aWFsaXplIGNvbXBvbmVudHNcbiAgICB0aGlzLm1jcEJ1cyA9IG5ldyBNQ1BCdXModGhpcy5jb25maWcubWNwQnVzKTtcbiAgICB0aGlzLnNraWxsc1JlZ2lzdHJ5ID0gbmV3IFNraWxsc1JlZ2lzdHJ5KCk7XG4gICAgdGhpcy5zYW5kYm94RXhlY3V0b3IgPSBuZXcgU2FuZGJveEV4ZWN1dG9yKHRoaXMuY29uZmlnLnNhbmRib3gpO1xuICAgIHRoaXMuYWdlbnRIYXJuZXNzID0gbmV3IEFnZW50SGFybmVzcygpO1xuICAgIHRoaXMuY2FuYXJ5RGVwbG95ZXIgPSBuZXcgQ2FuYXJ5RGVwbG95ZXIoKTtcblxuICAgIC8vIEluaXRpYWxpemUgc3RhdGVcbiAgICB0aGlzLmNoYW5nZUV2ZW50cyA9IFtdO1xuICAgIHRoaXMudHJhY2VFZGdlcyA9IFtdO1xuICAgIHRoaXMub3BlcmF0aW9ucyA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLnN0YXJ0VGltZSA9IG5vdygpO1xuICAgIHRoaXMubG9nQnVmZmVyID0gW107XG5cbiAgICB0aGlzLmxvZygnW0NvbnRyb2xQbGFuZV0gSW5pdGlhbGl6ZWQnKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ29yZSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogU3ludGhlc2l6ZSBhcmNoaXRlY3R1cmVcbiAgICovXG4gIGFzeW5jIHN5bnRoZXNpemUocHJvamVjdElkOiBzdHJpbmcsIG9wdGlvbnM/OiB7IGtBdXRvPzogYm9vbGVhbiB9KTogUHJvbWlzZTxHb3Zlcm5hbmNlT3BlcmF0aW9uPiB7XG4gICAgY29uc3Qgb3BlcmF0aW9uSWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICB0aGlzLmxvZyhgW0NvbnRyb2xQbGFuZV0gU3RhcnRpbmcgc3ludGhlc2lzOiAke29wZXJhdGlvbklkfWApO1xuXG4gICAgY29uc3Qgb3BlcmF0aW9uOiBHb3Zlcm5hbmNlT3BlcmF0aW9uID0ge1xuICAgICAgaWQ6IG9wZXJhdGlvbklkLFxuICAgICAgdHlwZTogJ3N5bnRoZXNpemUnLFxuICAgICAgc3RhdHVzOiAncnVubmluZycsXG4gICAgICB0aW1lc3RhbXA6IG5vdygpLFxuICAgIH07XG5cbiAgICB0cnkge1xuICAgICAgLy8gU2VuZCBzeW50aGVzaXMgcHJvcG9zYWwgdmlhIE1DUFxuICAgICAgY29uc3QgbWVzc2FnZSA9IE1DUEJ1cy5jcmVhdGVNZXNzYWdlQnVpbGRlcigpXG4gICAgICAgIC5mcm9tKHRoaXMuY29uZmlnLmRlZmF1bHRSb2xlSWQpXG4gICAgICAgIC50bygnKicpXG4gICAgICAgIC50eXBlKCdwcm9wb3NhbCcpXG4gICAgICAgIC5wYXlsb2FkKHtcbiAgICAgICAgICB0eXBlOiAnc3ludGhlc2l6ZScsXG4gICAgICAgICAgcHJvamVjdElkLFxuICAgICAgICAgIGtBdXRvOiBvcHRpb25zPy5rQXV0byxcbiAgICAgICAgfSlcbiAgICAgICAgLmlkZW1wb3RlbnRLZXkoYHN5bnRoZXNpemU6JHtwcm9qZWN0SWR9OiR7b3BlcmF0aW9uSWR9YClcbiAgICAgICAgLmJ1aWxkKCk7XG5cbiAgICAgIGF3YWl0IHRoaXMubWNwQnVzLnNlbmQobWVzc2FnZSk7XG5cbiAgICAgIC8vIE1vY2sgc3ludGhlc2lzIHJlc3VsdFxuICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgcHJvamVjdElkLFxuICAgICAgICByb2xlczogb3B0aW9ucz8ua0F1dG8gPyAnYXV0by1vcHRpbWl6ZWQnIDogNSxcbiAgICAgICAgc2VydmljZXM6IDEyLFxuICAgICAgICBjb250cmFjdHM6IDI0LFxuICAgICAgfTtcblxuICAgICAgLy8gQ3JlYXRlIGNoYW5nZSBldmVudFxuICAgICAgY29uc3QgY2hhbmdlRXZlbnQgPSB0aGlzLmNyZWF0ZUNoYW5nZUV2ZW50KCdjcmVhdGUnLCAnYXJjaGl0ZWN0dXJlJywgZGF0YSk7XG4gICAgICBvcGVyYXRpb24uY2hhbmdlRXZlbnQgPSBjaGFuZ2VFdmVudDtcbiAgICAgIG9wZXJhdGlvbi5kYXRhID0gZGF0YTtcbiAgICAgIG9wZXJhdGlvbi5zdGF0dXMgPSAnY29tcGxldGVkJztcblxuICAgICAgdGhpcy5sb2coYFtDb250cm9sUGxhbmVdIFN5bnRoZXNpcyBjb21wbGV0ZWQ6ICR7b3BlcmF0aW9uSWR9YCk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgb3BlcmF0aW9uLnN0YXR1cyA9ICdmYWlsZWQnO1xuICAgICAgb3BlcmF0aW9uLmVycm9yID0gU3RyaW5nKGVycm9yKTtcbiAgICAgIHRoaXMubG9nKGBbQ29udHJvbFBsYW5lXSBTeW50aGVzaXMgZmFpbGVkOiAke29wZXJhdGlvbklkfSAtICR7ZXJyb3J9YCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGVyYXRpb25zLnNldChvcGVyYXRpb25JZCwgb3BlcmF0aW9uKTtcbiAgICByZXR1cm4gb3BlcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIERlcGxveSBwb2xpY3kgd2l0aCBjYW5hcnlcbiAgICovXG4gIGFzeW5jIGRlcGxveVBvbGljeShwb2xpY3k6IFBvbGljeSwgY2FuYXJ5T3B0aW9ucz86IENhbmFyeU9wdGlvbnMpOiBQcm9taXNlPEdvdmVybmFuY2VPcGVyYXRpb24+IHtcbiAgICBjb25zdCBvcGVyYXRpb25JZCA9IGdlbmVyYXRlVVVJRCgpO1xuICAgIHRoaXMubG9nKGBbQ29udHJvbFBsYW5lXSBTdGFydGluZyBkZXBsb3ltZW50OiAke29wZXJhdGlvbklkfWApO1xuXG4gICAgY29uc3Qgb3BlcmF0aW9uOiBHb3Zlcm5hbmNlT3BlcmF0aW9uID0ge1xuICAgICAgaWQ6IG9wZXJhdGlvbklkLFxuICAgICAgdHlwZTogJ2RlcGxveScsXG4gICAgICBzdGF0dXM6ICdydW5uaW5nJyxcbiAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBPd25lcnNoaXAgY2hlY2tcbiAgICAgIGlmICh0aGlzLmNvbmZpZy5lbmFibGVPd25lcnNoaXBBcmJpdHJhdGlvbikge1xuICAgICAgICBjb25zdCBvd25lcnNoaXBDaGVjayA9IGF3YWl0IHRoaXMuY2hlY2tPd25lcnNoaXAoJ3BvbGljeScsIHBvbGljeS5pZCwgJ2RlcGxveScpO1xuICAgICAgICBpZiAoIW93bmVyc2hpcENoZWNrLmFsbG93ZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE93bmVyc2hpcCBjaGVjayBmYWlsZWQ6ICR7b3duZXJzaGlwQ2hlY2sucmVhc29ufWApO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIERlcGxveSB3aXRoIGNhbmFyeVxuICAgICAgY29uc3QgZGVwbG95bWVudFJlc3VsdCA9IGF3YWl0IHRoaXMuYWdlbnRIYXJuZXNzLmRlcGxveVdpdGhDYW5hcnkocG9saWN5LCBjYW5hcnlPcHRpb25zKTtcblxuICAgICAgLy8gQ3JlYXRlIGNoYW5nZSBldmVudFxuICAgICAgY29uc3QgY2hhbmdlRXZlbnQgPSB0aGlzLmNyZWF0ZUNoYW5nZUV2ZW50KCd1cGRhdGUnLCBgcG9saWN5OiR7cG9saWN5LmlkfWAsIHtcbiAgICAgICAgcG9saWN5SWQ6IHBvbGljeS5pZCxcbiAgICAgICAgdmVyc2lvbjogcG9saWN5LnZlcnNpb24sXG4gICAgICAgIGRlcGxveW1lbnRJZDogZGVwbG95bWVudFJlc3VsdC5kZXBsb3ltZW50SWQsXG4gICAgICAgIHN0YXR1czogZGVwbG95bWVudFJlc3VsdC5zdGF0dXMsXG4gICAgICB9KTtcblxuICAgICAgb3BlcmF0aW9uLmNoYW5nZUV2ZW50ID0gY2hhbmdlRXZlbnQ7XG4gICAgICBvcGVyYXRpb24uZGF0YSA9IGRlcGxveW1lbnRSZXN1bHQ7XG4gICAgICBvcGVyYXRpb24uc3RhdHVzID0gZGVwbG95bWVudFJlc3VsdC5zdGF0dXMgPT09ICdjb21wbGV0ZScgPyAnY29tcGxldGVkJyA6IFxuICAgICAgICAgICAgICAgICAgICAgICAgIGRlcGxveW1lbnRSZXN1bHQuc3RhdHVzID09PSAncm9sbGVkX2JhY2snID8gJ3JvbGxlZF9iYWNrJyA6ICdmYWlsZWQnO1xuXG4gICAgICB0aGlzLmxvZyhgW0NvbnRyb2xQbGFuZV0gRGVwbG95bWVudCBjb21wbGV0ZWQ6ICR7b3BlcmF0aW9uSWR9IC0gJHtvcGVyYXRpb24uc3RhdHVzfWApO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG9wZXJhdGlvbi5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgIG9wZXJhdGlvbi5lcnJvciA9IFN0cmluZyhlcnJvcik7XG4gICAgICB0aGlzLmxvZyhgW0NvbnRyb2xQbGFuZV0gRGVwbG95bWVudCBmYWlsZWQ6ICR7b3BlcmF0aW9uSWR9IC0gJHtlcnJvcn1gKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wZXJhdGlvbnMuc2V0KG9wZXJhdGlvbklkLCBvcGVyYXRpb24pO1xuICAgIHJldHVybiBvcGVyYXRpb247XG4gIH1cblxuICAvKipcbiAgICogUnVuIHRlc3Qgc2NlbmFyaW9cbiAgICovXG4gIGFzeW5jIHJ1blRlc3Qoc2NlbmFyaW86IFRlc3RTY2VuYXJpbyk6IFByb21pc2U8R292ZXJuYW5jZU9wZXJhdGlvbj4ge1xuICAgIGNvbnN0IG9wZXJhdGlvbklkID0gZ2VuZXJhdGVVVUlEKCk7XG4gICAgdGhpcy5sb2coYFtDb250cm9sUGxhbmVdIFN0YXJ0aW5nIHRlc3Q6ICR7b3BlcmF0aW9uSWR9YCk7XG5cbiAgICBjb25zdCBvcGVyYXRpb246IEdvdmVybmFuY2VPcGVyYXRpb24gPSB7XG4gICAgICBpZDogb3BlcmF0aW9uSWQsXG4gICAgICB0eXBlOiAndGVzdCcsXG4gICAgICBzdGF0dXM6ICdydW5uaW5nJyxcbiAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCB0ZXN0UmVzdWx0ID0gYXdhaXQgdGhpcy5hZ2VudEhhcm5lc3MucnVuVGVzdChzY2VuYXJpbyk7XG5cbiAgICAgIC8vIENyZWF0ZSBjaGFuZ2UgZXZlbnRcbiAgICAgIGNvbnN0IGNoYW5nZUV2ZW50ID0gdGhpcy5jcmVhdGVDaGFuZ2VFdmVudCgnYXBwcm92ZScsIGB0ZXN0OiR7c2NlbmFyaW8uaWR9YCwge1xuICAgICAgICBzY2VuYXJpb0lkOiBzY2VuYXJpby5pZCxcbiAgICAgICAgcGFzc2VkOiB0ZXN0UmVzdWx0LnBhc3NlZCxcbiAgICAgICAgbWV0cmljczogdGVzdFJlc3VsdC5tZXRyaWNzLFxuICAgICAgfSk7XG5cbiAgICAgIG9wZXJhdGlvbi5jaGFuZ2VFdmVudCA9IGNoYW5nZUV2ZW50O1xuICAgICAgb3BlcmF0aW9uLmRhdGEgPSB0ZXN0UmVzdWx0O1xuICAgICAgb3BlcmF0aW9uLnN0YXR1cyA9IHRlc3RSZXN1bHQucGFzc2VkID8gJ2NvbXBsZXRlZCcgOiAnZmFpbGVkJztcblxuICAgICAgdGhpcy5sb2coYFtDb250cm9sUGxhbmVdIFRlc3QgY29tcGxldGVkOiAke29wZXJhdGlvbklkfSAtICR7dGVzdFJlc3VsdC5wYXNzZWQgPyAnUEFTU0VEJyA6ICdGQUlMRUQnfWApO1xuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIG9wZXJhdGlvbi5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgIG9wZXJhdGlvbi5lcnJvciA9IFN0cmluZyhlcnJvcik7XG4gICAgICB0aGlzLmxvZyhgW0NvbnRyb2xQbGFuZV0gVGVzdCBmYWlsZWQ6ICR7b3BlcmF0aW9uSWR9IC0gJHtlcnJvcn1gKTtcbiAgICB9XG5cbiAgICB0aGlzLm9wZXJhdGlvbnMuc2V0KG9wZXJhdGlvbklkLCBvcGVyYXRpb24pO1xuICAgIHJldHVybiBvcGVyYXRpb247XG4gIH1cblxuICAvKipcbiAgICogVmVyaWZ5IGFyY2hpdGVjdHVyZSBjb25zaXN0ZW5jeVxuICAgKi9cbiAgYXN5bmMgdmVyaWZ5KHByb2plY3RJZDogc3RyaW5nKTogUHJvbWlzZTxHb3Zlcm5hbmNlT3BlcmF0aW9uPiB7XG4gICAgY29uc3Qgb3BlcmF0aW9uSWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICB0aGlzLmxvZyhgW0NvbnRyb2xQbGFuZV0gU3RhcnRpbmcgdmVyaWZpY2F0aW9uOiAke29wZXJhdGlvbklkfWApO1xuXG4gICAgY29uc3Qgb3BlcmF0aW9uOiBHb3Zlcm5hbmNlT3BlcmF0aW9uID0ge1xuICAgICAgaWQ6IG9wZXJhdGlvbklkLFxuICAgICAgdHlwZTogJ3ZlcmlmeScsXG4gICAgICBzdGF0dXM6ICdydW5uaW5nJyxcbiAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICAvLyBNb2NrIHZlcmlmaWNhdGlvblxuICAgICAgY29uc3QgZGF0YSA9IHtcbiAgICAgICAgcHJvamVjdElkLFxuICAgICAgICBjb25zaXN0ZW5jeToge1xuICAgICAgICAgIGdyYXBoQ29uc2lzdGVuY3k6IHRydWUsXG4gICAgICAgICAgY29udHJhY3RDb25zaXN0ZW5jeTogdHJ1ZSxcbiAgICAgICAgICBvd25lcnNoaXBDb25zaXN0ZW5jeTogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgICAgaXNzdWVzOiBbXSxcbiAgICAgICAgc2NvcmU6IDAuOTUsXG4gICAgICB9O1xuXG4gICAgICBvcGVyYXRpb24uZGF0YSA9IGRhdGE7XG4gICAgICBvcGVyYXRpb24uc3RhdHVzID0gJ2NvbXBsZXRlZCc7XG5cbiAgICAgIHRoaXMubG9nKGBbQ29udHJvbFBsYW5lXSBWZXJpZmljYXRpb24gY29tcGxldGVkOiAke29wZXJhdGlvbklkfSAtIFNjb3JlOiAke2RhdGEuc2NvcmV9YCk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgb3BlcmF0aW9uLnN0YXR1cyA9ICdmYWlsZWQnO1xuICAgICAgb3BlcmF0aW9uLmVycm9yID0gU3RyaW5nKGVycm9yKTtcbiAgICAgIHRoaXMubG9nKGBbQ29udHJvbFBsYW5lXSBWZXJpZmljYXRpb24gZmFpbGVkOiAke29wZXJhdGlvbklkfSAtICR7ZXJyb3J9YCk7XG4gICAgfVxuXG4gICAgdGhpcy5vcGVyYXRpb25zLnNldChvcGVyYXRpb25JZCwgb3BlcmF0aW9uKTtcbiAgICByZXR1cm4gb3BlcmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIExvYWQgc2tpbGxcbiAgICovXG4gIGFzeW5jIGxvYWRTa2lsbChza2lsbE5hbWU6IHN0cmluZywgdmVyc2lvbjogc3RyaW5nKTogUHJvbWlzZTxHb3Zlcm5hbmNlT3BlcmF0aW9uPiB7XG4gICAgY29uc3Qgb3BlcmF0aW9uSWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICB0aGlzLmxvZyhgW0NvbnRyb2xQbGFuZV0gTG9hZGluZyBza2lsbDogJHtza2lsbE5hbWV9QCR7dmVyc2lvbn1gKTtcblxuICAgIGNvbnN0IG9wZXJhdGlvbjogR292ZXJuYW5jZU9wZXJhdGlvbiA9IHtcbiAgICAgIGlkOiBvcGVyYXRpb25JZCxcbiAgICAgIHR5cGU6ICdzeW50aGVzaXplJywgLy8gVXNpbmcgc3ludGhlc2l6ZSBhcyBza2lsbCBsb2FkIGlzIGEgZm9ybSBvZiBzeW50aGVzaXNcbiAgICAgIHN0YXR1czogJ3J1bm5pbmcnLFxuICAgICAgdGltZXN0YW1wOiBub3coKSxcbiAgICB9O1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIENoZWNrIGRlcGVuZGVuY2llcyBmaXJzdFxuICAgICAgY29uc3Qgc2tpbGw6IFNraWxsID0ge1xuICAgICAgICBuYW1lOiBza2lsbE5hbWUsXG4gICAgICAgIHZlcnNpb24sXG4gICAgICAgIGRlcGVuZGVuY2llczogW10sXG4gICAgICAgIGVudHJ5UG9pbnQ6ICdtYWluJyxcbiAgICAgICAgY29kZTogJycsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBkZXBDaGVjazogRGVwZW5kZW5jeUNoZWNrUmVzdWx0ID0gYXdhaXQgdGhpcy5za2lsbHNSZWdpc3RyeS5jaGVja0RlcGVuZGVuY2llcyhza2lsbCk7XG4gICAgICBcbiAgICAgIGlmICghZGVwQ2hlY2sucGFzc2VkKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRGVwZW5kZW5jeSBjaGVjayBmYWlsZWQ6ICR7ZGVwQ2hlY2subWlzc2luZ0RlcGVuZGVuY2llcy5qb2luKCcsICcpfWApO1xuICAgICAgfVxuXG4gICAgICAvLyBMb2FkIHNraWxsXG4gICAgICBjb25zdCBsb2FkZWRTa2lsbCA9IGF3YWl0IHRoaXMuc2tpbGxzUmVnaXN0cnkubG9hZChza2lsbE5hbWUsIHZlcnNpb24pO1xuXG4gICAgICAvLyBDcmVhdGUgY2hhbmdlIGV2ZW50XG4gICAgICBjb25zdCBjaGFuZ2VFdmVudCA9IHRoaXMuY3JlYXRlQ2hhbmdlRXZlbnQoJ2NyZWF0ZScsIGBza2lsbDoke3NraWxsTmFtZX1gLCB7XG4gICAgICAgIHNraWxsTmFtZSxcbiAgICAgICAgdmVyc2lvbixcbiAgICAgICAgZGVwZW5kZW5jaWVzOiBsb2FkZWRTa2lsbC5kZXBlbmRlbmNpZXMsXG4gICAgICB9KTtcblxuICAgICAgb3BlcmF0aW9uLmNoYW5nZUV2ZW50ID0gY2hhbmdlRXZlbnQ7XG4gICAgICBvcGVyYXRpb24uZGF0YSA9IHtcbiAgICAgICAgc2tpbGxOYW1lOiBsb2FkZWRTa2lsbC5uYW1lLFxuICAgICAgICB2ZXJzaW9uOiBsb2FkZWRTa2lsbC52ZXJzaW9uLFxuICAgICAgICBzdGF0dXM6IGxvYWRlZFNraWxsLnN0YXR1cyxcbiAgICAgIH07XG4gICAgICBvcGVyYXRpb24uc3RhdHVzID0gJ2NvbXBsZXRlZCc7XG5cbiAgICAgIHRoaXMubG9nKGBbQ29udHJvbFBsYW5lXSBTa2lsbCBsb2FkZWQ6ICR7c2tpbGxOYW1lfUAke3ZlcnNpb259YCk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgb3BlcmF0aW9uLnN0YXR1cyA9ICdmYWlsZWQnO1xuICAgICAgb3BlcmF0aW9uLmVycm9yID0gU3RyaW5nKGVycm9yKTtcbiAgICAgIHRoaXMubG9nKGBbQ29udHJvbFBsYW5lXSBTa2lsbCBsb2FkIGZhaWxlZDogJHtza2lsbE5hbWV9QCR7dmVyc2lvbn0gLSAke2Vycm9yfWApO1xuICAgIH1cblxuICAgIHRoaXMub3BlcmF0aW9ucy5zZXQob3BlcmF0aW9uSWQsIG9wZXJhdGlvbik7XG4gICAgcmV0dXJuIG9wZXJhdGlvbjtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gT3duZXJzaGlwIEFyYml0cmF0aW9uXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogQ2hlY2sgb3duZXJzaGlwIGZvciBhIHJlc291cmNlXG4gICAqL1xuICBhc3luYyBjaGVja093bmVyc2hpcChyZXNvdXJjZVR5cGU6IHN0cmluZywgcmVzb3VyY2VQYXRoOiBzdHJpbmcsIGFjdGlvbjogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcbiAgICB0aGlzLmxvZyhgW0NvbnRyb2xQbGFuZV0gT3duZXJzaGlwIGNoZWNrOiAke3Jlc291cmNlVHlwZX06JHtyZXNvdXJjZVBhdGh9IC0gJHthY3Rpb259YCk7XG5cbiAgICAvLyBNb2NrIG93bmVyc2hpcCBjaGVja1xuICAgIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgY2FsbCB0aGUgYWN0dWFsIG93bmVyc2hpcCBsYXR0aWNlXG4gICAgcmV0dXJuIHtcbiAgICAgIGFsbG93ZWQ6IHRydWUsXG4gICAgICBvd25pbmdSb2xlSWQ6IHRoaXMuY29uZmlnLmRlZmF1bHRSb2xlSWQsXG4gICAgICByZWFzb246ICdEZWZhdWx0IGFsbG93JyxcbiAgICAgIGJ1ZGdldEltcGFjdDogMCxcbiAgICB9O1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDaGFuZ2UgRXZlbnQgVHJhY2tpbmdcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBjaGFuZ2UgZXZlbnRcbiAgICovXG4gIHByaXZhdGUgY3JlYXRlQ2hhbmdlRXZlbnQoYWN0aW9uOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nLCBkYXRhOiBhbnkpOiBDaGFuZ2VFdmVudCB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5lbmFibGVDaGFuZ2VFdmVudFRyYWNraW5nKSB7XG4gICAgICByZXR1cm4ge30gYXMgQ2hhbmdlRXZlbnQ7XG4gICAgfVxuXG4gICAgY29uc3QgY2hhbmdlRXZlbnQ6IENoYW5nZUV2ZW50ID0ge1xuICAgICAgaWQ6IGdlbmVyYXRlVVVJRCgpLFxuICAgICAgdHM6IG5vdygpLFxuICAgICAgYWN0b3JSb2xlSWQ6IHRoaXMuY29uZmlnLmRlZmF1bHRSb2xlSWQsXG4gICAgICBhY3Rpb246IGFjdGlvbiBhcyBhbnksXG4gICAgICB0YXJnZXQ6IHtcbiAgICAgICAga2luZDogJ2dyYXBoJyxcbiAgICAgICAgaWRPclBhdGg6IHRhcmdldCxcbiAgICAgIH0sXG4gICAgICBvd25lcnNoaXBSdWxlSWQ6ICdjb250cm9sLXBsYW5lLXJ1bGUnLFxuICAgICAgZGlmZjoge1xuICAgICAgICBhZGRlZDogZGF0YSxcbiAgICAgIH0sXG4gICAgICByaXNrU2NvcmU6IHRoaXMuY2FsY3VsYXRlUmlza1Njb3JlKGFjdGlvbiwgZGF0YSksXG4gICAgICBtZXRhZGF0YToge1xuICAgICAgICBzb3VyY2U6ICdjb250cm9sLXBsYW5lJyxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHRoaXMuY2hhbmdlRXZlbnRzLnB1c2goY2hhbmdlRXZlbnQpO1xuXG4gICAgLy8gQ3JlYXRlIHRyYWNlIGVkZ2VcbiAgICB0aGlzLmNyZWF0ZVRyYWNlRWRnZSh0aGlzLmNvbmZpZy5kZWZhdWx0Um9sZUlkLCAnQVVUSE9SRUQnLCBjaGFuZ2VFdmVudC5pZCk7XG5cbiAgICByZXR1cm4gY2hhbmdlRXZlbnQ7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgdHJhY2UgZWRnZVxuICAgKi9cbiAgcHJpdmF0ZSBjcmVhdGVUcmFjZUVkZ2UoZnJvbTogc3RyaW5nLCByZWxhdGlvbjogc3RyaW5nLCB0bzogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgdHJhY2VFZGdlOiBUcmFjZUVkZ2UgPSB7XG4gICAgICBpZDogZ2VuZXJhdGVVVUlEKCksXG4gICAgICBmcm9tLFxuICAgICAgdG8sXG4gICAgICByZWxhdGlvbjogcmVsYXRpb24gYXMgYW55LFxuICAgICAgdHM6IG5vdygpLFxuICAgICAgbWV0YWRhdGE6IHtcbiAgICAgICAgZWRnZVR5cGU6ICdnb3Zlcm5hbmNlJyxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHRoaXMudHJhY2VFZGdlcy5wdXNoKHRyYWNlRWRnZSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHJpc2sgc2NvcmUgZm9yIGEgY2hhbmdlXG4gICAqL1xuICBwcml2YXRlIGNhbGN1bGF0ZVJpc2tTY29yZShhY3Rpb246IHN0cmluZywgZGF0YTogYW55KTogbnVtYmVyIHtcbiAgICAvLyBTaW1wbGUgcmlzayBjYWxjdWxhdGlvblxuICAgIGxldCByaXNrID0gMTA7XG5cbiAgICBpZiAoYWN0aW9uID09PSAnZGVsZXRlJykge1xuICAgICAgcmlzayArPSAzMDtcbiAgICB9XG5cbiAgICBpZiAoZGF0YT8uY3JpdGljYWxpdHkgPT09ICdoaWdoJykge1xuICAgICAgcmlzayArPSAyMDtcbiAgICB9XG5cbiAgICBpZiAoZGF0YT8uYmxhc3RSYWRpdXMgPiAxMCkge1xuICAgICAgcmlzayArPSAxNTtcbiAgICB9XG5cbiAgICByZXR1cm4gTWF0aC5taW4ocmlzaywgMTAwKTtcbiAgfVxuXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVXRpbGl0eSBNZXRob2RzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICogR2V0IGNvbnRyb2wgcGxhbmUgc3RhdGlzdGljc1xuICAgKi9cbiAgZ2V0U3RhdHMoKTogQ29udHJvbFBsYW5lU3RhdHMge1xuICAgIHJldHVybiB7XG4gICAgICBtY3BCdXNTdGF0czogdGhpcy5tY3BCdXMuZ2V0U3RhdHMoKSxcbiAgICAgIGxvYWRlZFNraWxsczogdGhpcy5za2lsbHNSZWdpc3RyeSA/IDAgOiAwLCAvLyBXb3VsZCBuZWVkIHRvIGV4cG9zZSB0aGlzIGZyb20gcmVnaXN0cnlcbiAgICAgIGFjdGl2ZURlcGxveW1lbnRzOiB0aGlzLmFnZW50SGFybmVzcyA/IHRoaXMuYWdlbnRIYXJuZXNzLmdldEFjdGl2ZURlcGxveW1lbnRzKCkubGVuZ3RoIDogMCxcbiAgICAgIGNoYW5nZUV2ZW50c1RyYWNrZWQ6IHRoaXMuY2hhbmdlRXZlbnRzLmxlbmd0aCxcbiAgICAgIG93bmVyc2hpcENoZWNrc1BlcmZvcm1lZDogMCwgLy8gV291bGQgbmVlZCB0byB0cmFjayB0aGlzXG4gICAgICB1cHRpbWVNczogbm93KCkgLSB0aGlzLnN0YXJ0VGltZSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjaGFuZ2UgZXZlbnRzXG4gICAqL1xuICBnZXRDaGFuZ2VFdmVudHMobGltaXQ6IG51bWJlciA9IDEwMCk6IENoYW5nZUV2ZW50W10ge1xuICAgIHJldHVybiB0aGlzLmNoYW5nZUV2ZW50cy5zbGljZSgtbGltaXQpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0cmFjZSBlZGdlc1xuICAgKi9cbiAgZ2V0VHJhY2VFZGdlcyhsaW1pdDogbnVtYmVyID0gMTAwKTogVHJhY2VFZGdlW10ge1xuICAgIHJldHVybiB0aGlzLnRyYWNlRWRnZXMuc2xpY2UoLWxpbWl0KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgb3BlcmF0aW9uIGJ5IElEXG4gICAqL1xuICBnZXRPcGVyYXRpb24ob3BlcmF0aW9uSWQ6IHN0cmluZyk6IEdvdmVybmFuY2VPcGVyYXRpb24gfCBudWxsIHtcbiAgICByZXR1cm4gdGhpcy5vcGVyYXRpb25zLmdldChvcGVyYXRpb25JZCkgfHwgbnVsbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYWxsIG9wZXJhdGlvbnNcbiAgICovXG4gIGdldE9wZXJhdGlvbnMoKTogR292ZXJuYW5jZU9wZXJhdGlvbltdIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLm9wZXJhdGlvbnMudmFsdWVzKCkpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBsb2dzXG4gICAqL1xuICBnZXRMb2dzKGxpbWl0OiBudW1iZXIgPSAxMDApOiBzdHJpbmdbXSB7XG4gICAgcmV0dXJuIHRoaXMubG9nQnVmZmVyLnNsaWNlKC1saW1pdCk7XG4gIH1cblxuICAvKipcbiAgICogTG9nIGEgbWVzc2FnZVxuICAgKi9cbiAgcHJpdmF0ZSBsb2cobWVzc2FnZTogc3RyaW5nKTogdm9pZCB7XG4gICAgaWYgKHRoaXMuY29uZmlnLmVuYWJsZUF1ZGl0TG9nZ2luZykge1xuICAgICAgdGhpcy5sb2dCdWZmZXIucHVzaChgWyR7bm93KCl9XSAke21lc3NhZ2V9YCk7XG4gICAgICBpZiAodGhpcy5sb2dCdWZmZXIubGVuZ3RoID4gMTAwMCkge1xuICAgICAgICB0aGlzLmxvZ0J1ZmZlci5zaGlmdCgpO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2cobWVzc2FnZSk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBNQ1AgQnVzIGluc3RhbmNlXG4gICAqL1xuICBnZXRNQ1BCdXMoKTogTUNQQnVzIHtcbiAgICByZXR1cm4gdGhpcy5tY3BCdXM7XG4gIH1cblxuICAvKipcbiAgICogR2V0IFNraWxscyBSZWdpc3RyeSBpbnN0YW5jZVxuICAgKi9cbiAgZ2V0U2tpbGxzUmVnaXN0cnkoKTogU2tpbGxzUmVnaXN0cnkge1xuICAgIHJldHVybiB0aGlzLnNraWxsc1JlZ2lzdHJ5O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBBZ2VudCBIYXJuZXNzIGluc3RhbmNlXG4gICAqL1xuICBnZXRBZ2VudEhhcm5lc3MoKTogQWdlbnRIYXJuZXNzIHtcbiAgICByZXR1cm4gdGhpcy5hZ2VudEhhcm5lc3M7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhwb3J0c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgZGVmYXVsdCBHb3Zlcm5hbmNlQ29udHJvbFBsYW5lO1xuIl19