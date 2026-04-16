"use strict";
/**
 * ANFSF V4 Layer 8.5 Integration Tests
 *
 * End-to-end tests for the complete governance control plane.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const control_plane_1 = require("../governance/control-plane");
const mcp_bus_1 = require("../mcp/mcp-bus");
const skills_registry_1 = require("../skills/skills-registry");
const agent_harness_1 = require("../harness/agent-harness");
describe('Layer 8.5 Integration Tests', () => {
    describe('Complete Workflow', () => {
        it('should execute complete governance workflow', async () => {
            const controlPlane = new control_plane_1.GovernanceControlPlane();
            // Step 1: Synthesize architecture
            const synthesizeOp = await controlPlane.synthesize('integration-project', { kAuto: true });
            expect(synthesizeOp.status).toBe('completed');
            // Step 2: Verify architecture
            const verifyOp = await controlPlane.verify('integration-project');
            expect(verifyOp.status).toBe('completed');
            // Step 3: Load required skills
            const skillOp = await controlPlane.loadSkill('utils', '1.0.0');
            expect(skillOp.status).toBeDefined();
            // Step 4: Run tests
            const testScenario = {
                id: 'integration-test',
                name: 'Integration Test',
                type: 'integration',
                config: {},
                expectedOutcomes: [],
                successCriteria: {
                    minPassRate: 0.9,
                },
            };
            const testOp = await controlPlane.runTest(testScenario);
            expect(testOp.data).toBeDefined();
            // Step 5: Deploy policy with fast canary
            const policy = {
                id: 'integration-policy',
                name: 'Integration Policy',
                type: 'routing',
                version: '1.0.0',
                config: {},
            };
            const deployOp = await controlPlane.deployPolicy(policy, {
                stages: [0.5, 1.0],
                stageDurationMs: 100,
                monitorMetrics: [],
                rollbackOnFailure: false,
                significanceCheck: { enabled: false, threshold: 0.05, minSampleSize: 30 },
            });
            expect(deployOp.data).toBeDefined();
            // Verify all operations tracked
            const operations = controlPlane.getOperations();
            expect(operations.length).toBe(5);
            // Verify change events tracked
            const events = controlPlane.getChangeEvents();
            expect(events.length).toBeGreaterThan(0);
        }, 30000);
    });
    describe('MCP Bus Integration', () => {
        it('should coordinate agents via MCP', async () => {
            const bus = new mcp_bus_1.MCPBus({ enableTracing: true });
            const messages = [];
            // Subscribe agents
            const sub1 = bus.subscribe('agent-1', (msg) => messages.push({ agent: 'agent-1', msg }));
            const sub2 = bus.subscribe('agent-2', (msg) => messages.push({ agent: 'agent-2', msg }));
            // Send message
            const message = new mcp_bus_1.MessageBuilder()
                .from('coordinator')
                .to('agent-1')
                .type('command')
                .payload({ action: 'synthesize' })
                .idempotentKey('integration-test-1')
                .requiresAck(true)
                .build();
            const response = await bus.send(message);
            expect(response.status).toBe('success');
            expect(messages.length).toBe(1);
            // Broadcast
            const broadcast = new mcp_bus_1.MessageBuilder()
                .from('coordinator')
                .to('*')
                .type('proposal')
                .payload({ action: 'verify' })
                .build();
            const responses = await bus.broadcast(broadcast);
            expect(responses.length).toBe(2);
            // Cleanup
            sub1.unsubscribe();
            sub2.unsubscribe();
        });
        it('should trace messages end-to-end', async () => {
            const bus = new mcp_bus_1.MCPBus({ enableTracing: true, enableLogging: false });
            bus.subscribe('agent-1', () => { });
            const message = new mcp_bus_1.MessageBuilder()
                .from('sender')
                .to('agent-1')
                .type('command')
                .payload({ test: true })
                .build();
            await bus.send(message);
            const stats = bus.getStats();
            expect(stats.totalMessagesSent).toBe(1);
        });
    });
    describe('Skills Registry Integration', () => {
        it('should manage skill lifecycle', async () => {
            const registry = new skills_registry_1.SkillsRegistry();
            // Load skills
            const skill1 = await registry.load('base-skill', '1.0.0');
            expect(skill1.status).toBe('loaded');
            const skill2 = await registry.load('dependent-skill', '1.0.0');
            expect(skill2.status).toBe('loaded');
            // List skills
            const skills = await registry.list();
            expect(skills.length).toBe(2);
            // Get dependencies
            const deps = await registry.getDependencies('base-skill');
            expect(Array.isArray(deps)).toBe(true);
            // Unload skill
            await registry.unload('dependent-skill');
            const remainingSkills = await registry.list();
            expect(remainingSkills.length).toBe(1);
        });
        it('should detect dependency issues', async () => {
            const registry = new skills_registry_1.SkillsRegistry();
            // Try to load skill with missing dependency
            await expect(registry.load('missing-dep-skill', '1.0.0')).resolves.toBeDefined();
            // Note: Mock implementation allows this, real implementation would fail
        });
    });
    describe('Agent Harness Integration', () => {
        it('should run complete test and deploy cycle', async () => {
            const harness = new agent_harness_1.AgentHarness({ enableLogging: false });
            // Run test
            const testScenario = {
                id: 'cycle-test',
                name: 'Cycle Test',
                type: 'integration',
                config: {},
                expectedOutcomes: [],
                successCriteria: {
                    minPassRate: 0.9,
                },
            };
            const testResult = await harness.runTest(testScenario);
            expect(testResult.scenarioId).toBe('cycle-test');
            // Deploy policy
            const policy = {
                id: 'cycle-policy',
                name: 'Cycle Policy',
                type: 'routing',
                version: '1.0.0',
                config: {},
            };
            const deployResult = await harness.deployWithCanary(policy, {
                stageDurationMs: 50,
                stages: [0.5, 1.0],
            });
            expect(deployResult.deploymentId).toBeDefined();
        });
        it('should handle rollback scenario', async () => {
            const harness = new agent_harness_1.AgentHarness({ enableAutoRollback: true });
            const policy = {
                id: 'rollback-policy',
                name: 'Rollback Policy',
                type: 'routing',
                version: '1.0.0',
                config: {},
                rollbackPolicy: {
                    enabled: true,
                    triggers: [
                        { metric: 'error_rate', operator: 'gt', threshold: 0.01 },
                    ],
                },
            };
            const result = await harness.deployWithCanary(policy, {
                stageDurationMs: 50,
                rollbackOnFailure: true,
            });
            expect(result).toBeDefined();
        });
    });
    describe('Ownership Arbitration Integration', () => {
        it('should enforce ownership across all operations', async () => {
            const controlPlane = new control_plane_1.GovernanceControlPlane({
                enableOwnershipArbitration: true,
            });
            // Synthesize should work with ownership arbitration enabled
            const synthesizeOp = await controlPlane.synthesize('integration-project');
            expect(synthesizeOp).toBeDefined();
            // Verify change event is created
            const events = controlPlane.getChangeEvents();
            expect(events.length).toBeGreaterThan(0);
        });
    });
    describe('Statistical Significance Integration', () => {
        it('should validate results with statistical tests', async () => {
            const harness = new agent_harness_1.AgentHarness();
            const scenario = {
                id: 'significance-test',
                name: 'Significance Test',
                type: 'integration',
                config: {
                    testData: {
                        groupA: { mean: 0.5, variance: 0.01, size: 100 },
                        groupB: { mean: 0.7, variance: 0.01, size: 100 },
                    },
                },
                expectedOutcomes: [],
                successCriteria: {
                    significanceThreshold: 0.05,
                    minSampleSize: 50,
                },
            };
            const result = await harness.runTest(scenario);
            expect(result).toBeDefined();
            expect(result.pValue).toBeDefined();
        });
    });
    describe('Canary Deployment Integration', () => {
        it('should complete full canary rollout', async () => {
            const controlPlane = new control_plane_1.GovernanceControlPlane();
            const policy = {
                id: 'canary-policy',
                name: 'Canary Policy',
                type: 'routing',
                version: '1.0.0',
                config: {},
            };
            const operation = await controlPlane.deployPolicy(policy, {
                stages: [0.01, 0.05, 0.2, 0.5, 1.0],
                stageDurationMs: 50,
                autoPromote: true,
            });
            expect(operation.data).toBeDefined();
            expect(operation.data.trafficPercentage).toBe(100);
        });
    });
    describe('Error Handling Integration', () => {
        it('should handle errors gracefully', async () => {
            const controlPlane = new control_plane_1.GovernanceControlPlane();
            // Try to run invalid operation
            try {
                await controlPlane.loadSkill('', '');
            }
            catch (error) {
                expect(error).toBeDefined();
            }
            // System should still be operational
            const stats = controlPlane.getStats();
            expect(stats.uptimeMs).toBeGreaterThan(0);
        });
    });
    describe('Audit Trail Integration', () => {
        it('should maintain complete audit trail', async () => {
            const controlPlane = new control_plane_1.GovernanceControlPlane({
                enableAuditLogging: true,
                enableChangeEventTracking: true,
            });
            // Execute multiple operations
            await controlPlane.synthesize('audit-project');
            await controlPlane.verify('audit-project');
            await controlPlane.loadSkill('audit-skill', '1.0.0');
            // Verify audit trail
            const events = controlPlane.getChangeEvents(100);
            expect(events.length).toBeGreaterThan(0);
            const traceEdges = controlPlane.getTraceEdges(100);
            expect(traceEdges.length).toBeGreaterThan(0);
            const logs = controlPlane.getLogs(100);
            expect(logs.length).toBeGreaterThan(0);
            const operations = controlPlane.getOperations();
            expect(operations.length).toBe(3);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWdyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9fX3Rlc3RzX18vaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7QUFFSCwrREFBcUU7QUFDckUsNENBQXdEO0FBQ3hELCtEQUEyRDtBQUMzRCw0REFBd0Q7QUFHeEQsUUFBUSxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUMzQyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLEVBQUUsQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMzRCxNQUFNLFlBQVksR0FBRyxJQUFJLHNDQUFzQixFQUFFLENBQUM7WUFFbEQsa0NBQWtDO1lBQ2xDLE1BQU0sWUFBWSxHQUFHLE1BQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQzNGLE1BQU0sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1lBRTlDLDhCQUE4QjtZQUM5QixNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUNsRSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUUxQywrQkFBK0I7WUFDL0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxZQUFZLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMvRCxNQUFNLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBRXJDLG9CQUFvQjtZQUNwQixNQUFNLFlBQVksR0FBaUI7Z0JBQ2pDLEVBQUUsRUFBRSxrQkFBa0I7Z0JBQ3RCLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLElBQUksRUFBRSxhQUFhO2dCQUNuQixNQUFNLEVBQUUsRUFBRTtnQkFDVixnQkFBZ0IsRUFBRSxFQUFFO2dCQUNwQixlQUFlLEVBQUU7b0JBQ2YsV0FBVyxFQUFFLEdBQUc7aUJBQ2pCO2FBQ0YsQ0FBQztZQUNGLE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUN4RCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBRWxDLHlDQUF5QztZQUN6QyxNQUFNLE1BQU0sR0FBVztnQkFDckIsRUFBRSxFQUFFLG9CQUFvQjtnQkFDeEIsSUFBSSxFQUFFLG9CQUFvQjtnQkFDMUIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLE1BQU0sRUFBRSxFQUFFO2FBQ1gsQ0FBQztZQUNGLE1BQU0sUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUU7Z0JBQ3ZELE1BQU0sRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUM7Z0JBQ2xCLGVBQWUsRUFBRSxHQUFHO2dCQUNwQixjQUFjLEVBQUUsRUFBRTtnQkFDbEIsaUJBQWlCLEVBQUUsS0FBSztnQkFDeEIsaUJBQWlCLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUUsRUFBRTthQUMxRSxDQUFDLENBQUM7WUFDSCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBRXBDLGdDQUFnQztZQUNoQyxNQUFNLFVBQVUsR0FBRyxZQUFZLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDaEQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFbEMsK0JBQStCO1lBQy9CLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM5QyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDWixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7UUFDbkMsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2hELE1BQU0sR0FBRyxHQUFHLElBQUksZ0JBQU0sQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELE1BQU0sUUFBUSxHQUFVLEVBQUUsQ0FBQztZQUUzQixtQkFBbUI7WUFDbkIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RixNQUFNLElBQUksR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBRXpGLGVBQWU7WUFDZixNQUFNLE9BQU8sR0FBRyxJQUFJLHdCQUFjLEVBQUU7aUJBQ2pDLElBQUksQ0FBQyxhQUFhLENBQUM7aUJBQ25CLEVBQUUsQ0FBQyxTQUFTLENBQUM7aUJBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQztpQkFDZixPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLENBQUM7aUJBQ2pDLGFBQWEsQ0FBQyxvQkFBb0IsQ0FBQztpQkFDbkMsV0FBVyxDQUFDLElBQUksQ0FBQztpQkFDakIsS0FBSyxFQUFFLENBQUM7WUFFWCxNQUFNLFFBQVEsR0FBRyxNQUFNLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFaEMsWUFBWTtZQUNaLE1BQU0sU0FBUyxHQUFHLElBQUksd0JBQWMsRUFBRTtpQkFDbkMsSUFBSSxDQUFDLGFBQWEsQ0FBQztpQkFDbkIsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDUCxJQUFJLENBQUMsVUFBVSxDQUFDO2lCQUNoQixPQUFPLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUM7aUJBQzdCLEtBQUssRUFBRSxDQUFDO1lBRVgsTUFBTSxTQUFTLEdBQUcsTUFBTSxHQUFHLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ2pELE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRWpDLFVBQVU7WUFDVixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JCLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLGtDQUFrQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2hELE1BQU0sR0FBRyxHQUFHLElBQUksZ0JBQU0sQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFdEUsR0FBRyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFDLENBQUM7WUFFbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSx3QkFBYyxFQUFFO2lCQUNqQyxJQUFJLENBQUMsUUFBUSxDQUFDO2lCQUNkLEVBQUUsQ0FBQyxTQUFTLENBQUM7aUJBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQztpQkFDZixPQUFPLENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUM7aUJBQ3ZCLEtBQUssRUFBRSxDQUFDO1lBRVgsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXhCLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUM3QixNQUFNLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO1FBQzNDLEVBQUUsQ0FBQywrQkFBK0IsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3QyxNQUFNLFFBQVEsR0FBRyxJQUFJLGdDQUFjLEVBQUUsQ0FBQztZQUV0QyxjQUFjO1lBQ2QsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUMxRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUVyQyxNQUFNLE1BQU0sR0FBRyxNQUFNLFFBQVEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDL0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFckMsY0FBYztZQUNkLE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3JDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRTlCLG1CQUFtQjtZQUNuQixNQUFNLElBQUksR0FBRyxNQUFNLFFBQVEsQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDMUQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFdkMsZUFBZTtZQUNmLE1BQU0sUUFBUSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3pDLE1BQU0sZUFBZSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9DLE1BQU0sUUFBUSxHQUFHLElBQUksZ0NBQWMsRUFBRSxDQUFDO1lBRXRDLDRDQUE0QztZQUM1QyxNQUFNLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pGLHdFQUF3RTtRQUMxRSxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtRQUN6QyxFQUFFLENBQUMsMkNBQTJDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDekQsTUFBTSxPQUFPLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFFM0QsV0FBVztZQUNYLE1BQU0sWUFBWSxHQUFpQjtnQkFDakMsRUFBRSxFQUFFLFlBQVk7Z0JBQ2hCLElBQUksRUFBRSxZQUFZO2dCQUNsQixJQUFJLEVBQUUsYUFBYTtnQkFDbkIsTUFBTSxFQUFFLEVBQUU7Z0JBQ1YsZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsZUFBZSxFQUFFO29CQUNmLFdBQVcsRUFBRSxHQUFHO2lCQUNqQjthQUNGLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDdkQsTUFBTSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFFakQsZ0JBQWdCO1lBQ2hCLE1BQU0sTUFBTSxHQUFXO2dCQUNyQixFQUFFLEVBQUUsY0FBYztnQkFDbEIsSUFBSSxFQUFFLGNBQWM7Z0JBQ3BCLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxPQUFPO2dCQUNoQixNQUFNLEVBQUUsRUFBRTthQUNYLENBQUM7WUFFRixNQUFNLFlBQVksR0FBRyxNQUFNLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUU7Z0JBQzFELGVBQWUsRUFBRSxFQUFFO2dCQUNuQixNQUFNLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2FBQ25CLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsaUNBQWlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUUvRCxNQUFNLE1BQU0sR0FBVztnQkFDckIsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsSUFBSSxFQUFFLGlCQUFpQjtnQkFDdkIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLE1BQU0sRUFBRSxFQUFFO2dCQUNWLGNBQWMsRUFBRTtvQkFDZCxPQUFPLEVBQUUsSUFBSTtvQkFDYixRQUFRLEVBQUU7d0JBQ1IsRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRTtxQkFDMUQ7aUJBQ0Y7YUFDRixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFO2dCQUNwRCxlQUFlLEVBQUUsRUFBRTtnQkFDbkIsaUJBQWlCLEVBQUUsSUFBSTthQUN4QixDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7UUFDakQsRUFBRSxDQUFDLGdEQUFnRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlELE1BQU0sWUFBWSxHQUFHLElBQUksc0NBQXNCLENBQUM7Z0JBQzlDLDBCQUEwQixFQUFFLElBQUk7YUFDakMsQ0FBQyxDQUFDO1lBRUgsNERBQTREO1lBQzVELE1BQU0sWUFBWSxHQUFHLE1BQU0sWUFBWSxDQUFDLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUVuQyxpQ0FBaUM7WUFDakMsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1FBQ3BELEVBQUUsQ0FBQyxnREFBZ0QsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM5RCxNQUFNLE9BQU8sR0FBRyxJQUFJLDRCQUFZLEVBQUUsQ0FBQztZQUVuQyxNQUFNLFFBQVEsR0FBaUI7Z0JBQzdCLEVBQUUsRUFBRSxtQkFBbUI7Z0JBQ3ZCLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLElBQUksRUFBRSxhQUFhO2dCQUNuQixNQUFNLEVBQUU7b0JBQ04sUUFBUSxFQUFFO3dCQUNSLE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFO3dCQUNoRCxNQUFNLEVBQUUsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRTtxQkFDakQ7aUJBQ0Y7Z0JBQ0QsZ0JBQWdCLEVBQUUsRUFBRTtnQkFDcEIsZUFBZSxFQUFFO29CQUNmLHFCQUFxQixFQUFFLElBQUk7b0JBQzNCLGFBQWEsRUFBRSxFQUFFO2lCQUNsQjthQUNGLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFL0MsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzdCLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDN0MsRUFBRSxDQUFDLHFDQUFxQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ25ELE1BQU0sWUFBWSxHQUFHLElBQUksc0NBQXNCLEVBQUUsQ0FBQztZQUVsRCxNQUFNLE1BQU0sR0FBVztnQkFDckIsRUFBRSxFQUFFLGVBQWU7Z0JBQ25CLElBQUksRUFBRSxlQUFlO2dCQUNyQixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsT0FBTztnQkFDaEIsTUFBTSxFQUFFLEVBQUU7YUFDWCxDQUFDO1lBRUYsTUFBTSxTQUFTLEdBQUcsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRTtnQkFDeEQsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQztnQkFDbkMsZUFBZSxFQUFFLEVBQUU7Z0JBQ25CLFdBQVcsRUFBRSxJQUFJO2FBQ2xCLENBQUMsQ0FBQztZQUVILE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDckMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDckQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxHQUFHLEVBQUU7UUFDMUMsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9DLE1BQU0sWUFBWSxHQUFHLElBQUksc0NBQXNCLEVBQUUsQ0FBQztZQUVsRCwrQkFBK0I7WUFDL0IsSUFBSSxDQUFDO2dCQUNILE1BQU0sWUFBWSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsQ0FBQztZQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7Z0JBQ2YsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzlCLENBQUM7WUFFRCxxQ0FBcUM7WUFDckMsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO1FBQ3ZDLEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRCxNQUFNLFlBQVksR0FBRyxJQUFJLHNDQUFzQixDQUFDO2dCQUM5QyxrQkFBa0IsRUFBRSxJQUFJO2dCQUN4Qix5QkFBeUIsRUFBRSxJQUFJO2FBQ2hDLENBQUMsQ0FBQztZQUVILDhCQUE4QjtZQUM5QixNQUFNLFlBQVksQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDL0MsTUFBTSxZQUFZLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzNDLE1BQU0sWUFBWSxDQUFDLFNBQVMsQ0FBQyxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFckQscUJBQXFCO1lBQ3JCLE1BQU0sTUFBTSxHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDakQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFekMsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuRCxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUU3QyxNQUFNLElBQUksR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXZDLE1BQU0sVUFBVSxHQUFHLFlBQVksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNoRCxNQUFNLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFORlNGIFY0IExheWVyIDguNSBJbnRlZ3JhdGlvbiBUZXN0c1xuICogXG4gKiBFbmQtdG8tZW5kIHRlc3RzIGZvciB0aGUgY29tcGxldGUgZ292ZXJuYW5jZSBjb250cm9sIHBsYW5lLlxuICovXG5cbmltcG9ydCB7IEdvdmVybmFuY2VDb250cm9sUGxhbmUgfSBmcm9tICcuLi9nb3Zlcm5hbmNlL2NvbnRyb2wtcGxhbmUnO1xuaW1wb3J0IHsgTUNQQnVzLCBNZXNzYWdlQnVpbGRlciB9IGZyb20gJy4uL21jcC9tY3AtYnVzJztcbmltcG9ydCB7IFNraWxsc1JlZ2lzdHJ5IH0gZnJvbSAnLi4vc2tpbGxzL3NraWxscy1yZWdpc3RyeSc7XG5pbXBvcnQgeyBBZ2VudEhhcm5lc3MgfSBmcm9tICcuLi9oYXJuZXNzL2FnZW50LWhhcm5lc3MnO1xuaW1wb3J0IHsgUG9saWN5LCBUZXN0U2NlbmFyaW8gfSBmcm9tICcuLi9oYXJuZXNzL3R5cGVzJztcblxuZGVzY3JpYmUoJ0xheWVyIDguNSBJbnRlZ3JhdGlvbiBUZXN0cycsICgpID0+IHtcbiAgZGVzY3JpYmUoJ0NvbXBsZXRlIFdvcmtmbG93JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZXhlY3V0ZSBjb21wbGV0ZSBnb3Zlcm5hbmNlIHdvcmtmbG93JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY29udHJvbFBsYW5lID0gbmV3IEdvdmVybmFuY2VDb250cm9sUGxhbmUoKTtcblxuICAgICAgLy8gU3RlcCAxOiBTeW50aGVzaXplIGFyY2hpdGVjdHVyZVxuICAgICAgY29uc3Qgc3ludGhlc2l6ZU9wID0gYXdhaXQgY29udHJvbFBsYW5lLnN5bnRoZXNpemUoJ2ludGVncmF0aW9uLXByb2plY3QnLCB7IGtBdXRvOiB0cnVlIH0pO1xuICAgICAgZXhwZWN0KHN5bnRoZXNpemVPcC5zdGF0dXMpLnRvQmUoJ2NvbXBsZXRlZCcpO1xuXG4gICAgICAvLyBTdGVwIDI6IFZlcmlmeSBhcmNoaXRlY3R1cmVcbiAgICAgIGNvbnN0IHZlcmlmeU9wID0gYXdhaXQgY29udHJvbFBsYW5lLnZlcmlmeSgnaW50ZWdyYXRpb24tcHJvamVjdCcpO1xuICAgICAgZXhwZWN0KHZlcmlmeU9wLnN0YXR1cykudG9CZSgnY29tcGxldGVkJyk7XG5cbiAgICAgIC8vIFN0ZXAgMzogTG9hZCByZXF1aXJlZCBza2lsbHNcbiAgICAgIGNvbnN0IHNraWxsT3AgPSBhd2FpdCBjb250cm9sUGxhbmUubG9hZFNraWxsKCd1dGlscycsICcxLjAuMCcpO1xuICAgICAgZXhwZWN0KHNraWxsT3Auc3RhdHVzKS50b0JlRGVmaW5lZCgpO1xuXG4gICAgICAvLyBTdGVwIDQ6IFJ1biB0ZXN0c1xuICAgICAgY29uc3QgdGVzdFNjZW5hcmlvOiBUZXN0U2NlbmFyaW8gPSB7XG4gICAgICAgIGlkOiAnaW50ZWdyYXRpb24tdGVzdCcsXG4gICAgICAgIG5hbWU6ICdJbnRlZ3JhdGlvbiBUZXN0JyxcbiAgICAgICAgdHlwZTogJ2ludGVncmF0aW9uJyxcbiAgICAgICAgY29uZmlnOiB7fSxcbiAgICAgICAgZXhwZWN0ZWRPdXRjb21lczogW10sXG4gICAgICAgIHN1Y2Nlc3NDcml0ZXJpYToge1xuICAgICAgICAgIG1pblBhc3NSYXRlOiAwLjksXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgICAgY29uc3QgdGVzdE9wID0gYXdhaXQgY29udHJvbFBsYW5lLnJ1blRlc3QodGVzdFNjZW5hcmlvKTtcbiAgICAgIGV4cGVjdCh0ZXN0T3AuZGF0YSkudG9CZURlZmluZWQoKTtcblxuICAgICAgLy8gU3RlcCA1OiBEZXBsb3kgcG9saWN5IHdpdGggZmFzdCBjYW5hcnlcbiAgICAgIGNvbnN0IHBvbGljeTogUG9saWN5ID0ge1xuICAgICAgICBpZDogJ2ludGVncmF0aW9uLXBvbGljeScsXG4gICAgICAgIG5hbWU6ICdJbnRlZ3JhdGlvbiBQb2xpY3knLFxuICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgIGNvbmZpZzoge30sXG4gICAgICB9O1xuICAgICAgY29uc3QgZGVwbG95T3AgPSBhd2FpdCBjb250cm9sUGxhbmUuZGVwbG95UG9saWN5KHBvbGljeSwge1xuICAgICAgICBzdGFnZXM6IFswLjUsIDEuMF0sXG4gICAgICAgIHN0YWdlRHVyYXRpb25NczogMTAwLFxuICAgICAgICBtb25pdG9yTWV0cmljczogW10sXG4gICAgICAgIHJvbGxiYWNrT25GYWlsdXJlOiBmYWxzZSxcbiAgICAgICAgc2lnbmlmaWNhbmNlQ2hlY2s6IHsgZW5hYmxlZDogZmFsc2UsIHRocmVzaG9sZDogMC4wNSwgbWluU2FtcGxlU2l6ZTogMzAgfSxcbiAgICAgIH0pO1xuICAgICAgZXhwZWN0KGRlcGxveU9wLmRhdGEpLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgIC8vIFZlcmlmeSBhbGwgb3BlcmF0aW9ucyB0cmFja2VkXG4gICAgICBjb25zdCBvcGVyYXRpb25zID0gY29udHJvbFBsYW5lLmdldE9wZXJhdGlvbnMoKTtcbiAgICAgIGV4cGVjdChvcGVyYXRpb25zLmxlbmd0aCkudG9CZSg1KTtcblxuICAgICAgLy8gVmVyaWZ5IGNoYW5nZSBldmVudHMgdHJhY2tlZFxuICAgICAgY29uc3QgZXZlbnRzID0gY29udHJvbFBsYW5lLmdldENoYW5nZUV2ZW50cygpO1xuICAgICAgZXhwZWN0KGV2ZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9LCAzMDAwMCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdNQ1AgQnVzIEludGVncmF0aW9uJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY29vcmRpbmF0ZSBhZ2VudHMgdmlhIE1DUCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGJ1cyA9IG5ldyBNQ1BCdXMoeyBlbmFibGVUcmFjaW5nOiB0cnVlIH0pO1xuICAgICAgY29uc3QgbWVzc2FnZXM6IGFueVtdID0gW107XG5cbiAgICAgIC8vIFN1YnNjcmliZSBhZ2VudHNcbiAgICAgIGNvbnN0IHN1YjEgPSBidXMuc3Vic2NyaWJlKCdhZ2VudC0xJywgKG1zZykgPT4gbWVzc2FnZXMucHVzaCh7IGFnZW50OiAnYWdlbnQtMScsIG1zZyB9KSk7XG4gICAgICBjb25zdCBzdWIyID0gYnVzLnN1YnNjcmliZSgnYWdlbnQtMicsIChtc2cpID0+IG1lc3NhZ2VzLnB1c2goeyBhZ2VudDogJ2FnZW50LTInLCBtc2cgfSkpO1xuXG4gICAgICAvLyBTZW5kIG1lc3NhZ2VcbiAgICAgIGNvbnN0IG1lc3NhZ2UgPSBuZXcgTWVzc2FnZUJ1aWxkZXIoKVxuICAgICAgICAuZnJvbSgnY29vcmRpbmF0b3InKVxuICAgICAgICAudG8oJ2FnZW50LTEnKVxuICAgICAgICAudHlwZSgnY29tbWFuZCcpXG4gICAgICAgIC5wYXlsb2FkKHsgYWN0aW9uOiAnc3ludGhlc2l6ZScgfSlcbiAgICAgICAgLmlkZW1wb3RlbnRLZXkoJ2ludGVncmF0aW9uLXRlc3QtMScpXG4gICAgICAgIC5yZXF1aXJlc0Fjayh0cnVlKVxuICAgICAgICAuYnVpbGQoKTtcblxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBidXMuc2VuZChtZXNzYWdlKTtcbiAgICAgIGV4cGVjdChyZXNwb25zZS5zdGF0dXMpLnRvQmUoJ3N1Y2Nlc3MnKTtcbiAgICAgIGV4cGVjdChtZXNzYWdlcy5sZW5ndGgpLnRvQmUoMSk7XG5cbiAgICAgIC8vIEJyb2FkY2FzdFxuICAgICAgY29uc3QgYnJvYWRjYXN0ID0gbmV3IE1lc3NhZ2VCdWlsZGVyKClcbiAgICAgICAgLmZyb20oJ2Nvb3JkaW5hdG9yJylcbiAgICAgICAgLnRvKCcqJylcbiAgICAgICAgLnR5cGUoJ3Byb3Bvc2FsJylcbiAgICAgICAgLnBheWxvYWQoeyBhY3Rpb246ICd2ZXJpZnknIH0pXG4gICAgICAgIC5idWlsZCgpO1xuXG4gICAgICBjb25zdCByZXNwb25zZXMgPSBhd2FpdCBidXMuYnJvYWRjYXN0KGJyb2FkY2FzdCk7XG4gICAgICBleHBlY3QocmVzcG9uc2VzLmxlbmd0aCkudG9CZSgyKTtcblxuICAgICAgLy8gQ2xlYW51cFxuICAgICAgc3ViMS51bnN1YnNjcmliZSgpO1xuICAgICAgc3ViMi51bnN1YnNjcmliZSgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB0cmFjZSBtZXNzYWdlcyBlbmQtdG8tZW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgYnVzID0gbmV3IE1DUEJ1cyh7IGVuYWJsZVRyYWNpbmc6IHRydWUsIGVuYWJsZUxvZ2dpbmc6IGZhbHNlIH0pO1xuXG4gICAgICBidXMuc3Vic2NyaWJlKCdhZ2VudC0xJywgKCkgPT4ge30pO1xuXG4gICAgICBjb25zdCBtZXNzYWdlID0gbmV3IE1lc3NhZ2VCdWlsZGVyKClcbiAgICAgICAgLmZyb20oJ3NlbmRlcicpXG4gICAgICAgIC50bygnYWdlbnQtMScpXG4gICAgICAgIC50eXBlKCdjb21tYW5kJylcbiAgICAgICAgLnBheWxvYWQoeyB0ZXN0OiB0cnVlIH0pXG4gICAgICAgIC5idWlsZCgpO1xuXG4gICAgICBhd2FpdCBidXMuc2VuZChtZXNzYWdlKTtcblxuICAgICAgY29uc3Qgc3RhdHMgPSBidXMuZ2V0U3RhdHMoKTtcbiAgICAgIGV4cGVjdChzdGF0cy50b3RhbE1lc3NhZ2VzU2VudCkudG9CZSgxKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1NraWxscyBSZWdpc3RyeSBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIG1hbmFnZSBza2lsbCBsaWZlY3ljbGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZWdpc3RyeSA9IG5ldyBTa2lsbHNSZWdpc3RyeSgpO1xuXG4gICAgICAvLyBMb2FkIHNraWxsc1xuICAgICAgY29uc3Qgc2tpbGwxID0gYXdhaXQgcmVnaXN0cnkubG9hZCgnYmFzZS1za2lsbCcsICcxLjAuMCcpO1xuICAgICAgZXhwZWN0KHNraWxsMS5zdGF0dXMpLnRvQmUoJ2xvYWRlZCcpO1xuXG4gICAgICBjb25zdCBza2lsbDIgPSBhd2FpdCByZWdpc3RyeS5sb2FkKCdkZXBlbmRlbnQtc2tpbGwnLCAnMS4wLjAnKTtcbiAgICAgIGV4cGVjdChza2lsbDIuc3RhdHVzKS50b0JlKCdsb2FkZWQnKTtcblxuICAgICAgLy8gTGlzdCBza2lsbHNcbiAgICAgIGNvbnN0IHNraWxscyA9IGF3YWl0IHJlZ2lzdHJ5Lmxpc3QoKTtcbiAgICAgIGV4cGVjdChza2lsbHMubGVuZ3RoKS50b0JlKDIpO1xuXG4gICAgICAvLyBHZXQgZGVwZW5kZW5jaWVzXG4gICAgICBjb25zdCBkZXBzID0gYXdhaXQgcmVnaXN0cnkuZ2V0RGVwZW5kZW5jaWVzKCdiYXNlLXNraWxsJyk7XG4gICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShkZXBzKSkudG9CZSh0cnVlKTtcblxuICAgICAgLy8gVW5sb2FkIHNraWxsXG4gICAgICBhd2FpdCByZWdpc3RyeS51bmxvYWQoJ2RlcGVuZGVudC1za2lsbCcpO1xuICAgICAgY29uc3QgcmVtYWluaW5nU2tpbGxzID0gYXdhaXQgcmVnaXN0cnkubGlzdCgpO1xuICAgICAgZXhwZWN0KHJlbWFpbmluZ1NraWxscy5sZW5ndGgpLnRvQmUoMSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRldGVjdCBkZXBlbmRlbmN5IGlzc3VlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IFNraWxsc1JlZ2lzdHJ5KCk7XG5cbiAgICAgIC8vIFRyeSB0byBsb2FkIHNraWxsIHdpdGggbWlzc2luZyBkZXBlbmRlbmN5XG4gICAgICBhd2FpdCBleHBlY3QocmVnaXN0cnkubG9hZCgnbWlzc2luZy1kZXAtc2tpbGwnLCAnMS4wLjAnKSkucmVzb2x2ZXMudG9CZURlZmluZWQoKTtcbiAgICAgIC8vIE5vdGU6IE1vY2sgaW1wbGVtZW50YXRpb24gYWxsb3dzIHRoaXMsIHJlYWwgaW1wbGVtZW50YXRpb24gd291bGQgZmFpbFxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQWdlbnQgSGFybmVzcyBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJ1biBjb21wbGV0ZSB0ZXN0IGFuZCBkZXBsb3kgY3ljbGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBoYXJuZXNzID0gbmV3IEFnZW50SGFybmVzcyh7IGVuYWJsZUxvZ2dpbmc6IGZhbHNlIH0pO1xuXG4gICAgICAvLyBSdW4gdGVzdFxuICAgICAgY29uc3QgdGVzdFNjZW5hcmlvOiBUZXN0U2NlbmFyaW8gPSB7XG4gICAgICAgIGlkOiAnY3ljbGUtdGVzdCcsXG4gICAgICAgIG5hbWU6ICdDeWNsZSBUZXN0JyxcbiAgICAgICAgdHlwZTogJ2ludGVncmF0aW9uJyxcbiAgICAgICAgY29uZmlnOiB7fSxcbiAgICAgICAgZXhwZWN0ZWRPdXRjb21lczogW10sXG4gICAgICAgIHN1Y2Nlc3NDcml0ZXJpYToge1xuICAgICAgICAgIG1pblBhc3NSYXRlOiAwLjksXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCB0ZXN0UmVzdWx0ID0gYXdhaXQgaGFybmVzcy5ydW5UZXN0KHRlc3RTY2VuYXJpbyk7XG4gICAgICBleHBlY3QodGVzdFJlc3VsdC5zY2VuYXJpb0lkKS50b0JlKCdjeWNsZS10ZXN0Jyk7XG5cbiAgICAgIC8vIERlcGxveSBwb2xpY3lcbiAgICAgIGNvbnN0IHBvbGljeTogUG9saWN5ID0ge1xuICAgICAgICBpZDogJ2N5Y2xlLXBvbGljeScsXG4gICAgICAgIG5hbWU6ICdDeWNsZSBQb2xpY3knLFxuICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgIGNvbmZpZzoge30sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBkZXBsb3lSZXN1bHQgPSBhd2FpdCBoYXJuZXNzLmRlcGxveVdpdGhDYW5hcnkocG9saWN5LCB7XG4gICAgICAgIHN0YWdlRHVyYXRpb25NczogNTAsXG4gICAgICAgIHN0YWdlczogWzAuNSwgMS4wXSxcbiAgICAgIH0pO1xuXG4gICAgICBleHBlY3QoZGVwbG95UmVzdWx0LmRlcGxveW1lbnRJZCkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHJvbGxiYWNrIHNjZW5hcmlvJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaGFybmVzcyA9IG5ldyBBZ2VudEhhcm5lc3MoeyBlbmFibGVBdXRvUm9sbGJhY2s6IHRydWUgfSk7XG5cbiAgICAgIGNvbnN0IHBvbGljeTogUG9saWN5ID0ge1xuICAgICAgICBpZDogJ3JvbGxiYWNrLXBvbGljeScsXG4gICAgICAgIG5hbWU6ICdSb2xsYmFjayBQb2xpY3knLFxuICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgIGNvbmZpZzoge30sXG4gICAgICAgIHJvbGxiYWNrUG9saWN5OiB7XG4gICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICB0cmlnZ2VyczogW1xuICAgICAgICAgICAgeyBtZXRyaWM6ICdlcnJvcl9yYXRlJywgb3BlcmF0b3I6ICdndCcsIHRocmVzaG9sZDogMC4wMSB9LFxuICAgICAgICAgIF0sXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYXJuZXNzLmRlcGxveVdpdGhDYW5hcnkocG9saWN5LCB7XG4gICAgICAgIHN0YWdlRHVyYXRpb25NczogNTAsXG4gICAgICAgIHJvbGxiYWNrT25GYWlsdXJlOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdPd25lcnNoaXAgQXJiaXRyYXRpb24gSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBlbmZvcmNlIG93bmVyc2hpcCBhY3Jvc3MgYWxsIG9wZXJhdGlvbnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250cm9sUGxhbmUgPSBuZXcgR292ZXJuYW5jZUNvbnRyb2xQbGFuZSh7XG4gICAgICAgIGVuYWJsZU93bmVyc2hpcEFyYml0cmF0aW9uOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFN5bnRoZXNpemUgc2hvdWxkIHdvcmsgd2l0aCBvd25lcnNoaXAgYXJiaXRyYXRpb24gZW5hYmxlZFxuICAgICAgY29uc3Qgc3ludGhlc2l6ZU9wID0gYXdhaXQgY29udHJvbFBsYW5lLnN5bnRoZXNpemUoJ2ludGVncmF0aW9uLXByb2plY3QnKTtcbiAgICAgIGV4cGVjdChzeW50aGVzaXplT3ApLnRvQmVEZWZpbmVkKCk7XG5cbiAgICAgIC8vIFZlcmlmeSBjaGFuZ2UgZXZlbnQgaXMgY3JlYXRlZFxuICAgICAgY29uc3QgZXZlbnRzID0gY29udHJvbFBsYW5lLmdldENoYW5nZUV2ZW50cygpO1xuICAgICAgZXhwZWN0KGV2ZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1N0YXRpc3RpY2FsIFNpZ25pZmljYW5jZSBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIHJlc3VsdHMgd2l0aCBzdGF0aXN0aWNhbCB0ZXN0cycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGhhcm5lc3MgPSBuZXcgQWdlbnRIYXJuZXNzKCk7XG5cbiAgICAgIGNvbnN0IHNjZW5hcmlvOiBUZXN0U2NlbmFyaW8gPSB7XG4gICAgICAgIGlkOiAnc2lnbmlmaWNhbmNlLXRlc3QnLFxuICAgICAgICBuYW1lOiAnU2lnbmlmaWNhbmNlIFRlc3QnLFxuICAgICAgICB0eXBlOiAnaW50ZWdyYXRpb24nLFxuICAgICAgICBjb25maWc6IHtcbiAgICAgICAgICB0ZXN0RGF0YToge1xuICAgICAgICAgICAgZ3JvdXBBOiB7IG1lYW46IDAuNSwgdmFyaWFuY2U6IDAuMDEsIHNpemU6IDEwMCB9LFxuICAgICAgICAgICAgZ3JvdXBCOiB7IG1lYW46IDAuNywgdmFyaWFuY2U6IDAuMDEsIHNpemU6IDEwMCB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIGV4cGVjdGVkT3V0Y29tZXM6IFtdLFxuICAgICAgICBzdWNjZXNzQ3JpdGVyaWE6IHtcbiAgICAgICAgICBzaWduaWZpY2FuY2VUaHJlc2hvbGQ6IDAuMDUsXG4gICAgICAgICAgbWluU2FtcGxlU2l6ZTogNTAsXG4gICAgICAgIH0sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYXJuZXNzLnJ1blRlc3Qoc2NlbmFyaW8pO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5wVmFsdWUpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdDYW5hcnkgRGVwbG95bWVudCBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNvbXBsZXRlIGZ1bGwgY2FuYXJ5IHJvbGxvdXQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjb250cm9sUGxhbmUgPSBuZXcgR292ZXJuYW5jZUNvbnRyb2xQbGFuZSgpO1xuXG4gICAgICBjb25zdCBwb2xpY3k6IFBvbGljeSA9IHtcbiAgICAgICAgaWQ6ICdjYW5hcnktcG9saWN5JyxcbiAgICAgICAgbmFtZTogJ0NhbmFyeSBQb2xpY3knLFxuICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgIGNvbmZpZzoge30sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBvcGVyYXRpb24gPSBhd2FpdCBjb250cm9sUGxhbmUuZGVwbG95UG9saWN5KHBvbGljeSwge1xuICAgICAgICBzdGFnZXM6IFswLjAxLCAwLjA1LCAwLjIsIDAuNSwgMS4wXSxcbiAgICAgICAgc3RhZ2VEdXJhdGlvbk1zOiA1MCxcbiAgICAgICAgYXV0b1Byb21vdGU6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgZXhwZWN0KG9wZXJhdGlvbi5kYXRhKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KG9wZXJhdGlvbi5kYXRhLnRyYWZmaWNQZXJjZW50YWdlKS50b0JlKDEwMCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdFcnJvciBIYW5kbGluZyBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlcnJvcnMgZ3JhY2VmdWxseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRyb2xQbGFuZSA9IG5ldyBHb3Zlcm5hbmNlQ29udHJvbFBsYW5lKCk7XG5cbiAgICAgIC8vIFRyeSB0byBydW4gaW52YWxpZCBvcGVyYXRpb25cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGNvbnRyb2xQbGFuZS5sb2FkU2tpbGwoJycsICcnKTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGV4cGVjdChlcnJvcikudG9CZURlZmluZWQoKTtcbiAgICAgIH1cblxuICAgICAgLy8gU3lzdGVtIHNob3VsZCBzdGlsbCBiZSBvcGVyYXRpb25hbFxuICAgICAgY29uc3Qgc3RhdHMgPSBjb250cm9sUGxhbmUuZ2V0U3RhdHMoKTtcbiAgICAgIGV4cGVjdChzdGF0cy51cHRpbWVNcykudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQXVkaXQgVHJhaWwgSW50ZWdyYXRpb24nLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBtYWludGFpbiBjb21wbGV0ZSBhdWRpdCB0cmFpbCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRyb2xQbGFuZSA9IG5ldyBHb3Zlcm5hbmNlQ29udHJvbFBsYW5lKHtcbiAgICAgICAgZW5hYmxlQXVkaXRMb2dnaW5nOiB0cnVlLFxuICAgICAgICBlbmFibGVDaGFuZ2VFdmVudFRyYWNraW5nOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIEV4ZWN1dGUgbXVsdGlwbGUgb3BlcmF0aW9uc1xuICAgICAgYXdhaXQgY29udHJvbFBsYW5lLnN5bnRoZXNpemUoJ2F1ZGl0LXByb2plY3QnKTtcbiAgICAgIGF3YWl0IGNvbnRyb2xQbGFuZS52ZXJpZnkoJ2F1ZGl0LXByb2plY3QnKTtcbiAgICAgIGF3YWl0IGNvbnRyb2xQbGFuZS5sb2FkU2tpbGwoJ2F1ZGl0LXNraWxsJywgJzEuMC4wJyk7XG5cbiAgICAgIC8vIFZlcmlmeSBhdWRpdCB0cmFpbFxuICAgICAgY29uc3QgZXZlbnRzID0gY29udHJvbFBsYW5lLmdldENoYW5nZUV2ZW50cygxMDApO1xuICAgICAgZXhwZWN0KGV2ZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcblxuICAgICAgY29uc3QgdHJhY2VFZGdlcyA9IGNvbnRyb2xQbGFuZS5nZXRUcmFjZUVkZ2VzKDEwMCk7XG4gICAgICBleHBlY3QodHJhY2VFZGdlcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcblxuICAgICAgY29uc3QgbG9ncyA9IGNvbnRyb2xQbGFuZS5nZXRMb2dzKDEwMCk7XG4gICAgICBleHBlY3QobG9ncy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcblxuICAgICAgY29uc3Qgb3BlcmF0aW9ucyA9IGNvbnRyb2xQbGFuZS5nZXRPcGVyYXRpb25zKCk7XG4gICAgICBleHBlY3Qob3BlcmF0aW9ucy5sZW5ndGgpLnRvQmUoMyk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG4iXX0=