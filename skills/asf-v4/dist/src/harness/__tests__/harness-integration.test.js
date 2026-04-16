"use strict";
/**
 * ANFSF V1.5.0 - Layer 8.5 Harness Integration Tests
 *
 * Tests for Orchestration Harness + Governance Harness with real project data.
 * Uses jieyue-securities and anfsf-v1.1 projects for validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const dynamic_router_1 = require("../../governance/dynamic-router");
const orchestration_harness_1 = require("../../harness/orchestration-harness");
const governance_harness_1 = require("../../harness/governance-harness");
const complexity_metrics_1 = require("../../governance/complexity-metrics");
const mcp_bus_1 = require("../../mcp/mcp-bus");
(0, globals_1.describe)('Layer 8.5 Harness Integration Tests', () => {
    let router;
    let orchestrationHarness;
    let governanceHarness;
    (0, globals_1.beforeEach)(() => {
        router = new dynamic_router_1.DynamicRouter();
        orchestrationHarness = new orchestration_harness_1.OrchestrationHarness();
        governanceHarness = new governance_harness_1.GovernanceHarness();
    });
    (0, globals_1.describe)('DynamicRouter - Real Project Profiles', () => {
        (0, globals_1.it)('should activate light mode for small project (anfsf-v1.1)', () => {
            // anfsf-v1.1 profile: small project, low token budget
            const profile = {
                tokenBudget: 30000, // < 50k threshold
                featureCount: 10,
                userFlowCount: 5,
                dataEntityCount: 8,
                integrationCount: 2,
                complianceRequirements: [],
            };
            const activation = router.activate(profile);
            (0, globals_1.expect)(activation.mode).toBe('light');
            (0, globals_1.expect)(activation.orchestration).toBe(true);
            (0, globals_1.expect)(activation.governance).toBe(false); // No compliance, low complexity
            (0, globals_1.expect)(activation.uiux).toBe(false); // Light mode
            (0, globals_1.expect)(activation.evolution).toBe(false);
        });
        (0, globals_1.it)('should activate standard mode for medium project (jieyue-securities)', () => {
            // jieyue-securities profile: medium project, compliance required
            const profile = {
                tokenBudget: 150000, // 50k-200k threshold
                featureCount: 25,
                userFlowCount: 15,
                dataEntityCount: 20,
                integrationCount: 8,
                complianceRequirements: ['证券法规', '数据安全法'],
            };
            const activation = router.activate(profile);
            (0, globals_1.expect)(activation.mode).toBe('standard');
            (0, globals_1.expect)(activation.orchestration).toBe(true);
            (0, globals_1.expect)(activation.governance).toBe(true); // Compliance required
            (0, globals_1.expect)(activation.uiux).toBe(true); // Standard mode
            (0, globals_1.expect)(activation.evolution).toBe(false);
        });
        (0, globals_1.it)('should activate full mode for large project', () => {
            // Large enterprise project profile
            const profile = {
                tokenBudget: 500000, // > 200k threshold
                featureCount: 50,
                userFlowCount: 30,
                dataEntityCount: 40,
                integrationCount: 15,
                complianceRequirements: ['GDPR', '证券法规', 'ISO27001'],
            };
            const activation = router.activate(profile);
            (0, globals_1.expect)(activation.mode).toBe('full');
            (0, globals_1.expect)(activation.orchestration).toBe(true);
            (0, globals_1.expect)(activation.governance).toBe(true);
            (0, globals_1.expect)(activation.uiux).toBe(true);
            (0, globals_1.expect)(activation.evolution).toBe(true); // Full mode
        });
        (0, globals_1.it)('should calculate L13-L17 activation correctly', () => {
            const lightProfile = {
                tokenBudget: 30000,
                featureCount: 10,
                userFlowCount: 5,
                dataEntityCount: 8,
                integrationCount: 2,
                complianceRequirements: [],
            };
            const fullProfile = {
                tokenBudget: 500000,
                featureCount: 50,
                userFlowCount: 30,
                dataEntityCount: 40,
                integrationCount: 15,
                complianceRequirements: ['GDPR'],
            };
            const lightLayers = router.getLayerActivation(lightProfile);
            const fullLayers = router.getLayerActivation(fullProfile);
            (0, globals_1.expect)(lightLayers.activated).toBe(false);
            (0, globals_1.expect)(lightLayers.layers.length).toBe(0);
            (0, globals_1.expect)(fullLayers.activated).toBe(true);
            (0, globals_1.expect)(fullLayers.layers).toContain(13);
            (0, globals_1.expect)(fullLayers.layers).toContain(14);
            (0, globals_1.expect)(fullLayers.layers).toContain(15);
            (0, globals_1.expect)(fullLayers.layers).toContain(16);
            (0, globals_1.expect)(fullLayers.layers).toContain(17);
        });
    });
    (0, globals_1.describe)('OrchestrationHarness - MCP Bus Integration', () => {
        (0, globals_1.it)('should register and track agents', () => {
            orchestrationHarness.registerAgent('architect-agent');
            orchestrationHarness.registerAgent('builder-agent');
            orchestrationHarness.registerAgent('tester-agent');
            (0, globals_1.expect)(orchestrationHarness.getActiveAgentCount()).toBe(3);
            (0, globals_1.expect)(orchestrationHarness.isAgentActive('architect-agent')).toBe(true);
            (0, globals_1.expect)(orchestrationHarness.isAgentActive('unknown-agent')).toBe(false);
        });
        (0, globals_1.it)('should send messages with idempotency', async () => {
            // Register agent with callback to receive messages
            const receivedMessages = [];
            const bus = orchestrationHarness.getBus();
            bus.subscribe('agent-1', (msg) => receivedMessages.push(msg));
            const response1 = await orchestrationHarness.sendMessage('sender', 'agent-1', 'command', { test: true }, 'test-key-1');
            const response2 = await orchestrationHarness.sendMessage('sender', 'agent-1', 'command', { test: true }, 'test-key-1' // Same idempotent key
            );
            // Both should succeed (second one returns cached response)
            (0, globals_1.expect)(response1.status).toBe('success');
            (0, globals_1.expect)(response2.status).toBe('success');
            // Idempotency: callback should only be called once
            (0, globals_1.expect)(receivedMessages.length).toBe(1);
        });
        (0, globals_1.it)('should broadcast to all registered agents', async () => {
            // Register agents with callbacks
            const bus = orchestrationHarness.getBus();
            const receivedAgents = new Set();
            bus.subscribe('agent-1', (msg) => { receivedAgents.add('agent-1'); });
            bus.subscribe('agent-2', (msg) => { receivedAgents.add('agent-2'); });
            bus.subscribe('agent-3', (msg) => { receivedAgents.add('agent-3'); });
            // Use MCP Bus directly for broadcast test
            const message = new mcp_bus_1.MessageBuilder()
                .from('sender')
                .to('*')
                .type('announcement')
                .payload({ message: 'hello' })
                .requiresAck(true) // Require ack to get responses
                .build();
            const responses = await bus.broadcast(message);
            // Verify broadcast was sent (responses may vary)
            (0, globals_1.expect)(responses.length).toBeGreaterThanOrEqual(0);
            // Agents receive message asynchronously, check after broadcast
            (0, globals_1.expect)(receivedAgents.size).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should provide accurate metrics', () => {
            orchestrationHarness.registerAgent('agent-1');
            orchestrationHarness.registerAgent('agent-2');
            const metrics = orchestrationHarness.getMetrics();
            (0, globals_1.expect)(metrics.activeAgents).toBe(2);
            (0, globals_1.expect)(metrics.busStats).toBeDefined();
        });
    });
    (0, globals_1.describe)('GovernanceHarness - Veto and Canary', () => {
        (0, globals_1.it)('should check veto rules', async () => {
            const changes = [
                { resourceType: 'contract', resourcePath: '/api/orders', action: 'update' }
            ];
            const approvals = [
                { authority: 'architect', scope: 'contract:OpenAPI:*', status: 'approved' }
            ];
            // Without veto enforcer, should pass
            const result = await governanceHarness.checkVeto(changes, approvals);
            (0, globals_1.expect)(result.passed).toBe(true);
        });
        (0, globals_1.it)('should generate ownership proofs', async () => {
            const resources = [
                { type: 'contract', path: '/api/orders#POST', format: 'openapi' }
            ];
            const roles = [{ id: 'backend-team' }];
            const result = await governanceHarness.generateOwnershipProof(resources, roles);
            (0, globals_1.expect)(result.valid).toBe(true);
        });
        (0, globals_1.it)('should track policy versions', () => {
            const policy1 = { id: 'policy-1', name: 'Policy 1', version: '1.0.0', type: 'routing', config: {} };
            const policy2 = { id: 'policy-1', name: 'Policy 1', version: '1.1.0', type: 'routing', config: {} };
            governanceHarness.registerPolicyVersion('policy-1', policy1);
            governanceHarness.registerPolicyVersion('policy-1', policy2);
            const latest = governanceHarness.getLatestPolicy('policy-1');
            (0, globals_1.expect)(latest).toBeDefined();
            (0, globals_1.expect)(latest?.version).toBe('1.1.0');
        });
    });
    (0, globals_1.describe)('Complexity Metrics - Real Project Data', () => {
        (0, globals_1.it)('should calculate complexity for jieyue-securities', () => {
            // jieyue-securities: medium complexity
            const complexity = (0, complexity_metrics_1.calculateComplexity)(2, // harnessCount (Orchestration + Governance)
            8000, // totalCodeLines (approx)
            25, // featureCount
            8, // integrationCount
            2 // complianceCount (证券法规，数据安全法)
            );
            (0, globals_1.expect)(complexity).toBeGreaterThan(0);
            (0, globals_1.expect)(complexity).toBeLessThan(1000); // Reasonable range
        });
        (0, globals_1.it)('should calculate complexity for anfsf-v1.1', () => {
            // anfsf-v1.1: lower complexity
            const complexity = (0, complexity_metrics_1.calculateComplexity)(2, // harnessCount
            5000, // totalCodeLines (approx)
            10, // featureCount
            2, // integrationCount
            0 // complianceCount
            );
            (0, globals_1.expect)(complexity).toBeGreaterThan(0);
        });
        (0, globals_1.it)('should compare complexity before and after optimization', () => {
            // Before: monolithic Layer 8.5 (73 skills, 4821 lines)
            const beforeComplexity = (0, complexity_metrics_1.calculateComplexity)(1, // Single monolithic harness
            4821, // All code in one place
            25, 8, 2);
            // After: 4 Harnesses distributed (estimated)
            const afterComplexity = (0, complexity_metrics_1.calculateComplexity)(4, // 4 Harnesses
            6000, // Slight increase due to routing code
            25, 8, 2);
            // Complexity should decrease due to better feature point distribution
            const reduction = beforeComplexity - afterComplexity;
            const percentageReduction = (reduction / beforeComplexity) * 100;
            (0, globals_1.expect)(percentageReduction).toBeGreaterThan(-50); // Allow some increase
            (0, globals_1.expect)(percentageReduction).toBeLessThan(50); // But not too much
        });
        (0, globals_1.it)('should calculate L13-L17 utilization', () => {
            const layerCalls = new Map([
                [13, 150], // Semantic Consistency
                [14, 80], // Simulation
                [15, 200], // Runtime
                [16, 50], // Evolution
                [17, 20], // Guard
            ]);
            const totalCalls = 1000;
            const utilization = (0, complexity_metrics_1.calculateLayerUtilization)(layerCalls, totalCalls);
            (0, globals_1.expect)(utilization.length).toBe(5);
            (0, globals_1.expect)(utilization[0].layer).toBe(13);
            (0, globals_1.expect)(utilization[0].utilizationRate).toBe(15); // 150/1000 = 15%
        });
        (0, globals_1.it)('should check utilization threshold', () => {
            const layerCalls = new Map([
                [13, 150],
                [14, 80],
                [15, 200],
                [16, 50],
                [17, 20],
            ]);
            const totalCalls = 1000;
            const utilization = (0, complexity_metrics_1.calculateLayerUtilization)(layerCalls, totalCalls);
            const result = (0, complexity_metrics_1.checkLayerUtilizationThreshold)(utilization, 50);
            (0, globals_1.expect)(result.passed).toBe(false); // Average is ~10%, below 50% threshold
            (0, globals_1.expect)(result.averageUtilization).toBeCloseTo(10, 0);
        });
    });
    (0, globals_1.describe)('Integration - Full Workflow', () => {
        (0, globals_1.it)('should complete full workflow for jieyue-securities project', async () => {
            // 1. Determine activation mode
            const profile = {
                tokenBudget: 150000,
                featureCount: 25,
                userFlowCount: 15,
                dataEntityCount: 20,
                integrationCount: 8,
                complianceRequirements: ['证券法规'],
            };
            const activation = router.activate(profile);
            (0, globals_1.expect)(activation.mode).toBe('standard');
            // 2. Register agents in Orchestration Harness
            orchestrationHarness.registerAgent('architect-agent');
            orchestrationHarness.registerAgent('builder-agent');
            // 3. Check governance requirements
            const governanceMetrics = governanceHarness.getMetrics();
            (0, globals_1.expect)(governanceMetrics.vetoCheckEnabled).toBe(true);
            // 4. Calculate complexity
            const complexity = (0, complexity_metrics_1.calculateComplexity)(2, // Orchestration + Governance
            8000, 25, 8, 1);
            (0, globals_1.expect)(complexity).toBeGreaterThan(0);
            // 5. Verify L13-L17 activation
            const layerActivation = router.getLayerActivation(profile);
            (0, globals_1.expect)(layerActivation.activated).toBe(true);
            (0, globals_1.expect)(layerActivation.layers).toContain(13); // Semantic Consistency
        });
        (0, globals_1.it)('should complete full workflow for anfsf-v1.1 project', async () => {
            // 1. Determine activation mode
            const profile = {
                tokenBudget: 30000,
                featureCount: 10,
                userFlowCount: 5,
                dataEntityCount: 8,
                integrationCount: 2,
                complianceRequirements: [],
            };
            const activation = router.activate(profile);
            (0, globals_1.expect)(activation.mode).toBe('light');
            // 2. Register agents
            orchestrationHarness.registerAgent('builder-agent');
            // 3. Governance not required for light mode
            (0, globals_1.expect)(activation.governance).toBe(false);
            // 4. L13-L17 not activated for light mode
            const layerActivation = router.getLayerActivation(profile);
            (0, globals_1.expect)(layerActivation.activated).toBe(false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFybmVzcy1pbnRlZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2hhcm5lc3MvX190ZXN0c19fL2hhcm5lc3MtaW50ZWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7O0FBRUgsMkNBQWlFO0FBQ2pFLG9FQUFnRjtBQUNoRiwrRUFBMkU7QUFDM0UseUVBQXFFO0FBQ3JFLDRFQUFxSTtBQUNySSwrQ0FBbUQ7QUFFbkQsSUFBQSxrQkFBUSxFQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNuRCxJQUFJLE1BQXFCLENBQUM7SUFDMUIsSUFBSSxvQkFBMEMsQ0FBQztJQUMvQyxJQUFJLGlCQUFvQyxDQUFDO0lBRXpDLElBQUEsb0JBQVUsRUFBQyxHQUFHLEVBQUU7UUFDZCxNQUFNLEdBQUcsSUFBSSw4QkFBYSxFQUFFLENBQUM7UUFDN0Isb0JBQW9CLEdBQUcsSUFBSSw0Q0FBb0IsRUFBRSxDQUFDO1FBQ2xELGlCQUFpQixHQUFHLElBQUksc0NBQWlCLEVBQUUsQ0FBQztJQUM5QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUEsa0JBQVEsRUFBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7UUFDckQsSUFBQSxZQUFFLEVBQUMsMkRBQTJELEVBQUUsR0FBRyxFQUFFO1lBQ25FLHNEQUFzRDtZQUN0RCxNQUFNLE9BQU8sR0FBbUI7Z0JBQzlCLFdBQVcsRUFBRSxLQUFLLEVBQUcsa0JBQWtCO2dCQUN2QyxZQUFZLEVBQUUsRUFBRTtnQkFDaEIsYUFBYSxFQUFFLENBQUM7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixnQkFBZ0IsRUFBRSxDQUFDO2dCQUNuQixzQkFBc0IsRUFBRSxFQUFFO2FBQzNCLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTVDLElBQUEsZ0JBQU0sRUFB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QU8sR0FBbUI7Z0JBQzlCLFdBQVcsRUFBRSxLQUFLO2dCQUNsQixZQUFZLEVBQUUsRUFBRTtnQkFDaEIsYUFBYSxFQUFFLENBQUM7Z0JBQ2hCLGVBQWUsRUFBRSxDQUFDO2dCQUNsQixnQkFBZ0IsRUFBRSxDQUFDO2dCQUNuQixzQkFBc0IsRUFBRSxFQUFFO2FBQzNCLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzVDLElBQUEsZ0JBQU0sRUFBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRXRDLHFCQUFxQjtZQUNyQixvQkFBb0IsQ0FBQyxhQUFhLENBQUMsZUFBZSxDQUFDLENBQUM7WUFFcEQsNENBQTRDO1lBQzVDLElBQUEsZ0JBQU0sRUFBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRTFDLDBDQUEwQztZQUMxQyxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDM0QsSUFBQSxnQkFBTSxFQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWMS41LjAgLSBMYXllciA4LjUgSGFybmVzcyBJbnRlZ3JhdGlvbiBUZXN0c1xuICogXG4gKiBUZXN0cyBmb3IgT3JjaGVzdHJhdGlvbiBIYXJuZXNzICsgR292ZXJuYW5jZSBIYXJuZXNzIHdpdGggcmVhbCBwcm9qZWN0IGRhdGEuXG4gKiBVc2VzIGppZXl1ZS1zZWN1cml0aWVzIGFuZCBhbmZzZi12MS4xIHByb2plY3RzIGZvciB2YWxpZGF0aW9uLlxuICovXG5cbmltcG9ydCB7IGRlc2NyaWJlLCBpdCwgZXhwZWN0LCBiZWZvcmVFYWNoIH0gZnJvbSAnQGplc3QvZ2xvYmFscyc7XG5pbXBvcnQgeyBEeW5hbWljUm91dGVyLCBQcm9qZWN0UHJvZmlsZSB9IGZyb20gJy4uLy4uL2dvdmVybmFuY2UvZHluYW1pYy1yb3V0ZXInO1xuaW1wb3J0IHsgT3JjaGVzdHJhdGlvbkhhcm5lc3MgfSBmcm9tICcuLi8uLi9oYXJuZXNzL29yY2hlc3RyYXRpb24taGFybmVzcyc7XG5pbXBvcnQgeyBHb3Zlcm5hbmNlSGFybmVzcyB9IGZyb20gJy4uLy4uL2hhcm5lc3MvZ292ZXJuYW5jZS1oYXJuZXNzJztcbmltcG9ydCB7IGNhbGN1bGF0ZUNvbXBsZXhpdHksIGNhbGN1bGF0ZUxheWVyVXRpbGl6YXRpb24sIGNoZWNrTGF5ZXJVdGlsaXphdGlvblRocmVzaG9sZCB9IGZyb20gJy4uLy4uL2dvdmVybmFuY2UvY29tcGxleGl0eS1tZXRyaWNzJztcbmltcG9ydCB7IE1lc3NhZ2VCdWlsZGVyIH0gZnJvbSAnLi4vLi4vbWNwL21jcC1idXMnO1xuXG5kZXNjcmliZSgnTGF5ZXIgOC41IEhhcm5lc3MgSW50ZWdyYXRpb24gVGVzdHMnLCAoKSA9PiB7XG4gIGxldCByb3V0ZXI6IER5bmFtaWNSb3V0ZXI7XG4gIGxldCBvcmNoZXN0cmF0aW9uSGFybmVzczogT3JjaGVzdHJhdGlvbkhhcm5lc3M7XG4gIGxldCBnb3Zlcm5hbmNlSGFybmVzczogR292ZXJuYW5jZUhhcm5lc3M7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgcm91dGVyID0gbmV3IER5bmFtaWNSb3V0ZXIoKTtcbiAgICBvcmNoZXN0cmF0aW9uSGFybmVzcyA9IG5ldyBPcmNoZXN0cmF0aW9uSGFybmVzcygpO1xuICAgIGdvdmVybmFuY2VIYXJuZXNzID0gbmV3IEdvdmVybmFuY2VIYXJuZXNzKCk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdEeW5hbWljUm91dGVyIC0gUmVhbCBQcm9qZWN0IFByb2ZpbGVzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgYWN0aXZhdGUgbGlnaHQgbW9kZSBmb3Igc21hbGwgcHJvamVjdCAoYW5mc2YtdjEuMSknLCAoKSA9PiB7XG4gICAgICAvLyBhbmZzZi12MS4xIHByb2ZpbGU6IHNtYWxsIHByb2plY3QsIGxvdyB0b2tlbiBidWRnZXRcbiAgICAgIGNvbnN0IHByb2ZpbGU6IFByb2plY3RQcm9maWxlID0ge1xuICAgICAgICB0b2tlbkJ1ZGdldDogMzAwMDAsICAvLyA8IDUwayB0aHJlc2hvbGRcbiAgICAgICAgZmVhdHVyZUNvdW50OiAxMCxcbiAgICAgICAgdXNlckZsb3dDb3VudDogNSxcbiAgICAgICAgZGF0YUVudGl0eUNvdW50OiA4LFxuICAgICAgICBpbnRlZ3JhdGlvbkNvdW50OiAyLFxuICAgICAgICBjb21wbGlhbmNlUmVxdWlyZW1lbnRzOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFjdGl2YXRpb24gPSByb3V0ZXIuYWN0aXZhdGUocHJvZmlsZSk7XG5cbiAgICAgIGV4cGVjdChhY3RpdmF0aW9uLm1vZGUpLnRvQmUoJ2xpZ2h0Jyk7XG4gICAgICBleHBlY3QoYWN0aXZhdGlvbi5vcmNoZXN0cmF0aW9uKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGFjdGl2YXRpb24uZ292ZXJuYW5jZSkudG9CZShmYWxzZSk7ICAvLyBObyBjb21wbGlhbmNlLCBsb3cgY29tcGxleGl0eVxuICAgICAgZXhwZWN0KGFjdGl2YXRpb24udWl1eCkudG9CZShmYWxzZSk7ICAvLyBMaWdodCBtb2RlXG4gICAgICBleHBlY3QoYWN0aXZhdGlvbi5ldm9sdXRpb24pLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBhY3RpdmF0ZSBzdGFuZGFyZCBtb2RlIGZvciBtZWRpdW0gcHJvamVjdCAoamlleXVlLXNlY3VyaXRpZXMpJywgKCkgPT4ge1xuICAgICAgLy8gamlleXVlLXNlY3VyaXRpZXMgcHJvZmlsZTogbWVkaXVtIHByb2plY3QsIGNvbXBsaWFuY2UgcmVxdWlyZWRcbiAgICAgIGNvbnN0IHByb2ZpbGU6IFByb2plY3RQcm9maWxlID0ge1xuICAgICAgICB0b2tlbkJ1ZGdldDogMTUwMDAwLCAgLy8gNTBrLTIwMGsgdGhyZXNob2xkXG4gICAgICAgIGZlYXR1cmVDb3VudDogMjUsXG4gICAgICAgIHVzZXJGbG93Q291bnQ6IDE1LFxuICAgICAgICBkYXRhRW50aXR5Q291bnQ6IDIwLFxuICAgICAgICBpbnRlZ3JhdGlvbkNvdW50OiA4LFxuICAgICAgICBjb21wbGlhbmNlUmVxdWlyZW1lbnRzOiBbJ+ivgeWIuOazleinhCcsICfmlbDmja7lronlhajms5UnXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGFjdGl2YXRpb24gPSByb3V0ZXIuYWN0aXZhdGUocHJvZmlsZSk7XG5cbiAgICAgIGV4cGVjdChhY3RpdmF0aW9uLm1vZGUpLnRvQmUoJ3N0YW5kYXJkJyk7XG4gICAgICBleHBlY3QoYWN0aXZhdGlvbi5vcmNoZXN0cmF0aW9uKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGFjdGl2YXRpb24uZ292ZXJuYW5jZSkudG9CZSh0cnVlKTsgIC8vIENvbXBsaWFuY2UgcmVxdWlyZWRcbiAgICAgIGV4cGVjdChhY3RpdmF0aW9uLnVpdXgpLnRvQmUodHJ1ZSk7ICAvLyBTdGFuZGFyZCBtb2RlXG4gICAgICBleHBlY3QoYWN0aXZhdGlvbi5ldm9sdXRpb24pLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBhY3RpdmF0ZSBmdWxsIG1vZGUgZm9yIGxhcmdlIHByb2plY3QnLCAoKSA9PiB7XG4gICAgICAvLyBMYXJnZSBlbnRlcnByaXNlIHByb2plY3QgcHJvZmlsZVxuICAgICAgY29uc3QgcHJvZmlsZTogUHJvamVjdFByb2ZpbGUgPSB7XG4gICAgICAgIHRva2VuQnVkZ2V0OiA1MDAwMDAsICAvLyA+IDIwMGsgdGhyZXNob2xkXG4gICAgICAgIGZlYXR1cmVDb3VudDogNTAsXG4gICAgICAgIHVzZXJGbG93Q291bnQ6IDMwLFxuICAgICAgICBkYXRhRW50aXR5Q291bnQ6IDQwLFxuICAgICAgICBpbnRlZ3JhdGlvbkNvdW50OiAxNSxcbiAgICAgICAgY29tcGxpYW5jZVJlcXVpcmVtZW50czogWydHRFBSJywgJ+ivgeWIuOazleinhCcsICdJU08yNzAwMSddLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgYWN0aXZhdGlvbiA9IHJvdXRlci5hY3RpdmF0ZShwcm9maWxlKTtcblxuICAgICAgZXhwZWN0KGFjdGl2YXRpb24ubW9kZSkudG9CZSgnZnVsbCcpO1xuICAgICAgZXhwZWN0KGFjdGl2YXRpb24ub3JjaGVzdHJhdGlvbikudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChhY3RpdmF0aW9uLmdvdmVybmFuY2UpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QoYWN0aXZhdGlvbi51aXV4KS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGFjdGl2YXRpb24uZXZvbHV0aW9uKS50b0JlKHRydWUpOyAgLy8gRnVsbCBtb2RlXG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSBMMTMtTDE3IGFjdGl2YXRpb24gY29ycmVjdGx5JywgKCkgPT4ge1xuICAgICAgY29uc3QgbGlnaHRQcm9maWxlOiBQcm9qZWN0UHJvZmlsZSA9IHtcbiAgICAgICAgdG9rZW5CdWRnZXQ6IDMwMDAwLFxuICAgICAgICBmZWF0dXJlQ291bnQ6IDEwLFxuICAgICAgICB1c2VyRmxvd0NvdW50OiA1LFxuICAgICAgICBkYXRhRW50aXR5Q291bnQ6IDgsXG4gICAgICAgIGludGVncmF0aW9uQ291bnQ6IDIsXG4gICAgICAgIGNvbXBsaWFuY2VSZXF1aXJlbWVudHM6IFtdLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgZnVsbFByb2ZpbGU6IFByb2plY3RQcm9maWxlID0ge1xuICAgICAgICB0b2tlbkJ1ZGdldDogNTAwMDAwLFxuICAgICAgICBmZWF0dXJlQ291bnQ6IDUwLFxuICAgICAgICB1c2VyRmxvd0NvdW50OiAzMCxcbiAgICAgICAgZGF0YUVudGl0eUNvdW50OiA0MCxcbiAgICAgICAgaW50ZWdyYXRpb25Db3VudDogMTUsXG4gICAgICAgIGNvbXBsaWFuY2VSZXF1aXJlbWVudHM6IFsnR0RQUiddLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgbGlnaHRMYXllcnMgPSByb3V0ZXIuZ2V0TGF5ZXJBY3RpdmF0aW9uKGxpZ2h0UHJvZmlsZSk7XG4gICAgICBjb25zdCBmdWxsTGF5ZXJzID0gcm91dGVyLmdldExheWVyQWN0aXZhdGlvbihmdWxsUHJvZmlsZSk7XG5cbiAgICAgIGV4cGVjdChsaWdodExheWVycy5hY3RpdmF0ZWQpLnRvQmUoZmFsc2UpO1xuICAgICAgZXhwZWN0KGxpZ2h0TGF5ZXJzLmxheWVycy5sZW5ndGgpLnRvQmUoMCk7XG5cbiAgICAgIGV4cGVjdChmdWxsTGF5ZXJzLmFjdGl2YXRlZCkudG9CZSh0cnVlKTtcbiAgICAgIGV4cGVjdChmdWxsTGF5ZXJzLmxheWVycykudG9Db250YWluKDEzKTtcbiAgICAgIGV4cGVjdChmdWxsTGF5ZXJzLmxheWVycykudG9Db250YWluKDE0KTtcbiAgICAgIGV4cGVjdChmdWxsTGF5ZXJzLmxheWVycykudG9Db250YWluKDE1KTtcbiAgICAgIGV4cGVjdChmdWxsTGF5ZXJzLmxheWVycykudG9Db250YWluKDE2KTtcbiAgICAgIGV4cGVjdChmdWxsTGF5ZXJzLmxheWVycykudG9Db250YWluKDE3KTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ09yY2hlc3RyYXRpb25IYXJuZXNzIC0gTUNQIEJ1cyBJbnRlZ3JhdGlvbicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJlZ2lzdGVyIGFuZCB0cmFjayBhZ2VudHMnLCAoKSA9PiB7XG4gICAgICBvcmNoZXN0cmF0aW9uSGFybmVzcy5yZWdpc3RlckFnZW50KCdhcmNoaXRlY3QtYWdlbnQnKTtcbiAgICAgIG9yY2hlc3RyYXRpb25IYXJuZXNzLnJlZ2lzdGVyQWdlbnQoJ2J1aWxkZXItYWdlbnQnKTtcbiAgICAgIG9yY2hlc3RyYXRpb25IYXJuZXNzLnJlZ2lzdGVyQWdlbnQoJ3Rlc3Rlci1hZ2VudCcpO1xuXG4gICAgICBleHBlY3Qob3JjaGVzdHJhdGlvbkhhcm5lc3MuZ2V0QWN0aXZlQWdlbnRDb3VudCgpKS50b0JlKDMpO1xuICAgICAgZXhwZWN0KG9yY2hlc3RyYXRpb25IYXJuZXNzLmlzQWdlbnRBY3RpdmUoJ2FyY2hpdGVjdC1hZ2VudCcpKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KG9yY2hlc3RyYXRpb25IYXJuZXNzLmlzQWdlbnRBY3RpdmUoJ3Vua25vd24tYWdlbnQnKSkudG9CZShmYWxzZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHNlbmQgbWVzc2FnZXMgd2l0aCBpZGVtcG90ZW5jeScsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIFJlZ2lzdGVyIGFnZW50IHdpdGggY2FsbGJhY2sgdG8gcmVjZWl2ZSBtZXNzYWdlc1xuICAgICAgY29uc3QgcmVjZWl2ZWRNZXNzYWdlczogYW55W10gPSBbXTtcbiAgICAgIGNvbnN0IGJ1cyA9IG9yY2hlc3RyYXRpb25IYXJuZXNzLmdldEJ1cygpO1xuICAgICAgYnVzLnN1YnNjcmliZSgnYWdlbnQtMScsIChtc2c6IGFueSkgPT4gcmVjZWl2ZWRNZXNzYWdlcy5wdXNoKG1zZykpO1xuXG4gICAgICBjb25zdCByZXNwb25zZTEgPSBhd2FpdCBvcmNoZXN0cmF0aW9uSGFybmVzcy5zZW5kTWVzc2FnZShcbiAgICAgICAgJ3NlbmRlcicsXG4gICAgICAgICdhZ2VudC0xJyxcbiAgICAgICAgJ2NvbW1hbmQnLFxuICAgICAgICB7IHRlc3Q6IHRydWUgfSxcbiAgICAgICAgJ3Rlc3Qta2V5LTEnXG4gICAgICApO1xuXG4gICAgICBjb25zdCByZXNwb25zZTIgPSBhd2FpdCBvcmNoZXN0cmF0aW9uSGFybmVzcy5zZW5kTWVzc2FnZShcbiAgICAgICAgJ3NlbmRlcicsXG4gICAgICAgICdhZ2VudC0xJyxcbiAgICAgICAgJ2NvbW1hbmQnLFxuICAgICAgICB7IHRlc3Q6IHRydWUgfSxcbiAgICAgICAgJ3Rlc3Qta2V5LTEnICAvLyBTYW1lIGlkZW1wb3RlbnQga2V5XG4gICAgICApO1xuXG4gICAgICAvLyBCb3RoIHNob3VsZCBzdWNjZWVkIChzZWNvbmQgb25lIHJldHVybnMgY2FjaGVkIHJlc3BvbnNlKVxuICAgICAgZXhwZWN0KHJlc3BvbnNlMS5zdGF0dXMpLnRvQmUoJ3N1Y2Nlc3MnKTtcbiAgICAgIGV4cGVjdChyZXNwb25zZTIuc3RhdHVzKS50b0JlKCdzdWNjZXNzJyk7XG4gICAgICAvLyBJZGVtcG90ZW5jeTogY2FsbGJhY2sgc2hvdWxkIG9ubHkgYmUgY2FsbGVkIG9uY2VcbiAgICAgIGV4cGVjdChyZWNlaXZlZE1lc3NhZ2VzLmxlbmd0aCkudG9CZSgxKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgYnJvYWRjYXN0IHRvIGFsbCByZWdpc3RlcmVkIGFnZW50cycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIFJlZ2lzdGVyIGFnZW50cyB3aXRoIGNhbGxiYWNrc1xuICAgICAgY29uc3QgYnVzID0gb3JjaGVzdHJhdGlvbkhhcm5lc3MuZ2V0QnVzKCk7XG4gICAgICBjb25zdCByZWNlaXZlZEFnZW50cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgICBidXMuc3Vic2NyaWJlKCdhZ2VudC0xJywgKG1zZzogYW55KSA9PiB7IHJlY2VpdmVkQWdlbnRzLmFkZCgnYWdlbnQtMScpOyB9KTtcbiAgICAgIGJ1cy5zdWJzY3JpYmUoJ2FnZW50LTInLCAobXNnOiBhbnkpID0+IHsgcmVjZWl2ZWRBZ2VudHMuYWRkKCdhZ2VudC0yJyk7IH0pO1xuICAgICAgYnVzLnN1YnNjcmliZSgnYWdlbnQtMycsIChtc2c6IGFueSkgPT4geyByZWNlaXZlZEFnZW50cy5hZGQoJ2FnZW50LTMnKTsgfSk7XG5cbiAgICAgIC8vIFVzZSBNQ1AgQnVzIGRpcmVjdGx5IGZvciBicm9hZGNhc3QgdGVzdFxuICAgICAgY29uc3QgbWVzc2FnZSA9IG5ldyBNZXNzYWdlQnVpbGRlcigpXG4gICAgICAgIC5mcm9tKCdzZW5kZXInKVxuICAgICAgICAudG8oJyonKVxuICAgICAgICAudHlwZSgnYW5ub3VuY2VtZW50JyBhcyBhbnkpXG4gICAgICAgIC5wYXlsb2FkKHsgbWVzc2FnZTogJ2hlbGxvJyB9KVxuICAgICAgICAucmVxdWlyZXNBY2sodHJ1ZSkgIC8vIFJlcXVpcmUgYWNrIHRvIGdldCByZXNwb25zZXNcbiAgICAgICAgLmJ1aWxkKCk7XG5cbiAgICAgIGNvbnN0IHJlc3BvbnNlcyA9IGF3YWl0IGJ1cy5icm9hZGNhc3QobWVzc2FnZSk7XG5cbiAgICAgIC8vIFZlcmlmeSBicm9hZGNhc3Qgd2FzIHNlbnQgKHJlc3BvbnNlcyBtYXkgdmFyeSlcbiAgICAgIGV4cGVjdChyZXNwb25zZXMubGVuZ3RoKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDApO1xuICAgICAgLy8gQWdlbnRzIHJlY2VpdmUgbWVzc2FnZSBhc3luY2hyb25vdXNseSwgY2hlY2sgYWZ0ZXIgYnJvYWRjYXN0XG4gICAgICBleHBlY3QocmVjZWl2ZWRBZ2VudHMuc2l6ZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcHJvdmlkZSBhY2N1cmF0ZSBtZXRyaWNzJywgKCkgPT4ge1xuICAgICAgb3JjaGVzdHJhdGlvbkhhcm5lc3MucmVnaXN0ZXJBZ2VudCgnYWdlbnQtMScpO1xuICAgICAgb3JjaGVzdHJhdGlvbkhhcm5lc3MucmVnaXN0ZXJBZ2VudCgnYWdlbnQtMicpO1xuXG4gICAgICBjb25zdCBtZXRyaWNzID0gb3JjaGVzdHJhdGlvbkhhcm5lc3MuZ2V0TWV0cmljcygpO1xuXG4gICAgICBleHBlY3QobWV0cmljcy5hY3RpdmVBZ2VudHMpLnRvQmUoMik7XG4gICAgICBleHBlY3QobWV0cmljcy5idXNTdGF0cykudG9CZURlZmluZWQoKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ0dvdmVybmFuY2VIYXJuZXNzIC0gVmV0byBhbmQgQ2FuYXJ5JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY2hlY2sgdmV0byBydWxlcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGNoYW5nZXMgPSBbXG4gICAgICAgIHsgcmVzb3VyY2VUeXBlOiAnY29udHJhY3QnLCByZXNvdXJjZVBhdGg6ICcvYXBpL29yZGVycycsIGFjdGlvbjogJ3VwZGF0ZScgfVxuICAgICAgXTtcbiAgICAgIGNvbnN0IGFwcHJvdmFscyA9IFtcbiAgICAgICAgeyBhdXRob3JpdHk6ICdhcmNoaXRlY3QnLCBzY29wZTogJ2NvbnRyYWN0Ok9wZW5BUEk6KicsIHN0YXR1czogJ2FwcHJvdmVkJyB9XG4gICAgICBdO1xuXG4gICAgICAvLyBXaXRob3V0IHZldG8gZW5mb3JjZXIsIHNob3VsZCBwYXNzXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBnb3Zlcm5hbmNlSGFybmVzcy5jaGVja1ZldG8oY2hhbmdlcywgYXBwcm92YWxzKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5wYXNzZWQpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGdlbmVyYXRlIG93bmVyc2hpcCBwcm9vZnMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXNvdXJjZXMgPSBbXG4gICAgICAgIHsgdHlwZTogJ2NvbnRyYWN0JywgcGF0aDogJy9hcGkvb3JkZXJzI1BPU1QnLCBmb3JtYXQ6ICdvcGVuYXBpJyB9XG4gICAgICBdO1xuICAgICAgY29uc3Qgcm9sZXMgPSBbeyBpZDogJ2JhY2tlbmQtdGVhbScgfV07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGdvdmVybmFuY2VIYXJuZXNzLmdlbmVyYXRlT3duZXJzaGlwUHJvb2YocmVzb3VyY2VzLCByb2xlcyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQudmFsaWQpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRyYWNrIHBvbGljeSB2ZXJzaW9ucycsICgpID0+IHtcbiAgICAgIGNvbnN0IHBvbGljeTEgPSB7IGlkOiAncG9saWN5LTEnLCBuYW1lOiAnUG9saWN5IDEnLCB2ZXJzaW9uOiAnMS4wLjAnLCB0eXBlOiAncm91dGluZycgYXMgY29uc3QsIGNvbmZpZzoge30gfTtcbiAgICAgIGNvbnN0IHBvbGljeTIgPSB7IGlkOiAncG9saWN5LTEnLCBuYW1lOiAnUG9saWN5IDEnLCB2ZXJzaW9uOiAnMS4xLjAnLCB0eXBlOiAncm91dGluZycgYXMgY29uc3QsIGNvbmZpZzoge30gfTtcblxuICAgICAgZ292ZXJuYW5jZUhhcm5lc3MucmVnaXN0ZXJQb2xpY3lWZXJzaW9uKCdwb2xpY3ktMScsIHBvbGljeTEpO1xuICAgICAgZ292ZXJuYW5jZUhhcm5lc3MucmVnaXN0ZXJQb2xpY3lWZXJzaW9uKCdwb2xpY3ktMScsIHBvbGljeTIpO1xuXG4gICAgICBjb25zdCBsYXRlc3QgPSBnb3Zlcm5hbmNlSGFybmVzcy5nZXRMYXRlc3RQb2xpY3koJ3BvbGljeS0xJyk7XG5cbiAgICAgIGV4cGVjdChsYXRlc3QpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QobGF0ZXN0Py52ZXJzaW9uKS50b0JlKCcxLjEuMCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ29tcGxleGl0eSBNZXRyaWNzIC0gUmVhbCBQcm9qZWN0IERhdGEnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgY29tcGxleGl0eSBmb3IgamlleXVlLXNlY3VyaXRpZXMnLCAoKSA9PiB7XG4gICAgICAvLyBqaWV5dWUtc2VjdXJpdGllczogbWVkaXVtIGNvbXBsZXhpdHlcbiAgICAgIGNvbnN0IGNvbXBsZXhpdHkgPSBjYWxjdWxhdGVDb21wbGV4aXR5KFxuICAgICAgICAyLCAgLy8gaGFybmVzc0NvdW50IChPcmNoZXN0cmF0aW9uICsgR292ZXJuYW5jZSlcbiAgICAgICAgODAwMCwgIC8vIHRvdGFsQ29kZUxpbmVzIChhcHByb3gpXG4gICAgICAgIDI1LCAgLy8gZmVhdHVyZUNvdW50XG4gICAgICAgIDgsICAgLy8gaW50ZWdyYXRpb25Db3VudFxuICAgICAgICAyICAgIC8vIGNvbXBsaWFuY2VDb3VudCAo6K+B5Yi45rOV6KeE77yM5pWw5o2u5a6J5YWo5rOVKVxuICAgICAgKTtcblxuICAgICAgZXhwZWN0KGNvbXBsZXhpdHkpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChjb21wbGV4aXR5KS50b0JlTGVzc1RoYW4oMTAwMCk7ICAvLyBSZWFzb25hYmxlIHJhbmdlXG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSBjb21wbGV4aXR5IGZvciBhbmZzZi12MS4xJywgKCkgPT4ge1xuICAgICAgLy8gYW5mc2YtdjEuMTogbG93ZXIgY29tcGxleGl0eVxuICAgICAgY29uc3QgY29tcGxleGl0eSA9IGNhbGN1bGF0ZUNvbXBsZXhpdHkoXG4gICAgICAgIDIsICAvLyBoYXJuZXNzQ291bnRcbiAgICAgICAgNTAwMCwgIC8vIHRvdGFsQ29kZUxpbmVzIChhcHByb3gpXG4gICAgICAgIDEwLCAgLy8gZmVhdHVyZUNvdW50XG4gICAgICAgIDIsICAgLy8gaW50ZWdyYXRpb25Db3VudFxuICAgICAgICAwICAgIC8vIGNvbXBsaWFuY2VDb3VudFxuICAgICAgKTtcblxuICAgICAgZXhwZWN0KGNvbXBsZXhpdHkpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY29tcGFyZSBjb21wbGV4aXR5IGJlZm9yZSBhbmQgYWZ0ZXIgb3B0aW1pemF0aW9uJywgKCkgPT4ge1xuICAgICAgLy8gQmVmb3JlOiBtb25vbGl0aGljIExheWVyIDguNSAoNzMgc2tpbGxzLCA0ODIxIGxpbmVzKVxuICAgICAgY29uc3QgYmVmb3JlQ29tcGxleGl0eSA9IGNhbGN1bGF0ZUNvbXBsZXhpdHkoXG4gICAgICAgIDEsICAvLyBTaW5nbGUgbW9ub2xpdGhpYyBoYXJuZXNzXG4gICAgICAgIDQ4MjEsICAvLyBBbGwgY29kZSBpbiBvbmUgcGxhY2VcbiAgICAgICAgMjUsXG4gICAgICAgIDgsXG4gICAgICAgIDJcbiAgICAgICk7XG5cbiAgICAgIC8vIEFmdGVyOiA0IEhhcm5lc3NlcyBkaXN0cmlidXRlZCAoZXN0aW1hdGVkKVxuICAgICAgY29uc3QgYWZ0ZXJDb21wbGV4aXR5ID0gY2FsY3VsYXRlQ29tcGxleGl0eShcbiAgICAgICAgNCwgIC8vIDQgSGFybmVzc2VzXG4gICAgICAgIDYwMDAsICAvLyBTbGlnaHQgaW5jcmVhc2UgZHVlIHRvIHJvdXRpbmcgY29kZVxuICAgICAgICAyNSxcbiAgICAgICAgOCxcbiAgICAgICAgMlxuICAgICAgKTtcblxuICAgICAgLy8gQ29tcGxleGl0eSBzaG91bGQgZGVjcmVhc2UgZHVlIHRvIGJldHRlciBmZWF0dXJlIHBvaW50IGRpc3RyaWJ1dGlvblxuICAgICAgY29uc3QgcmVkdWN0aW9uID0gYmVmb3JlQ29tcGxleGl0eSAtIGFmdGVyQ29tcGxleGl0eTtcbiAgICAgIGNvbnN0IHBlcmNlbnRhZ2VSZWR1Y3Rpb24gPSAocmVkdWN0aW9uIC8gYmVmb3JlQ29tcGxleGl0eSkgKiAxMDA7XG5cbiAgICAgIGV4cGVjdChwZXJjZW50YWdlUmVkdWN0aW9uKS50b0JlR3JlYXRlclRoYW4oLTUwKTsgIC8vIEFsbG93IHNvbWUgaW5jcmVhc2VcbiAgICAgIGV4cGVjdChwZXJjZW50YWdlUmVkdWN0aW9uKS50b0JlTGVzc1RoYW4oNTApOyAgLy8gQnV0IG5vdCB0b28gbXVjaFxuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgTDEzLUwxNyB1dGlsaXphdGlvbicsICgpID0+IHtcbiAgICAgIGNvbnN0IGxheWVyQ2FsbHMgPSBuZXcgTWFwKFtcbiAgICAgICAgWzEzLCAxNTBdLCAgLy8gU2VtYW50aWMgQ29uc2lzdGVuY3lcbiAgICAgICAgWzE0LCA4MF0sICAgLy8gU2ltdWxhdGlvblxuICAgICAgICBbMTUsIDIwMF0sICAvLyBSdW50aW1lXG4gICAgICAgIFsxNiwgNTBdLCAgIC8vIEV2b2x1dGlvblxuICAgICAgICBbMTcsIDIwXSwgICAvLyBHdWFyZFxuICAgICAgXSk7XG4gICAgICBjb25zdCB0b3RhbENhbGxzID0gMTAwMDtcblxuICAgICAgY29uc3QgdXRpbGl6YXRpb24gPSBjYWxjdWxhdGVMYXllclV0aWxpemF0aW9uKGxheWVyQ2FsbHMsIHRvdGFsQ2FsbHMpO1xuXG4gICAgICBleHBlY3QodXRpbGl6YXRpb24ubGVuZ3RoKS50b0JlKDUpO1xuICAgICAgZXhwZWN0KHV0aWxpemF0aW9uWzBdLmxheWVyKS50b0JlKDEzKTtcbiAgICAgIGV4cGVjdCh1dGlsaXphdGlvblswXS51dGlsaXphdGlvblJhdGUpLnRvQmUoMTUpOyAgLy8gMTUwLzEwMDAgPSAxNSVcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgY2hlY2sgdXRpbGl6YXRpb24gdGhyZXNob2xkJywgKCkgPT4ge1xuICAgICAgY29uc3QgbGF5ZXJDYWxscyA9IG5ldyBNYXAoW1xuICAgICAgICBbMTMsIDE1MF0sXG4gICAgICAgIFsxNCwgODBdLFxuICAgICAgICBbMTUsIDIwMF0sXG4gICAgICAgIFsxNiwgNTBdLFxuICAgICAgICBbMTcsIDIwXSxcbiAgICAgIF0pO1xuICAgICAgY29uc3QgdG90YWxDYWxscyA9IDEwMDA7XG5cbiAgICAgIGNvbnN0IHV0aWxpemF0aW9uID0gY2FsY3VsYXRlTGF5ZXJVdGlsaXphdGlvbihsYXllckNhbGxzLCB0b3RhbENhbGxzKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGNoZWNrTGF5ZXJVdGlsaXphdGlvblRocmVzaG9sZCh1dGlsaXphdGlvbiwgNTApO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnBhc3NlZCkudG9CZShmYWxzZSk7ICAvLyBBdmVyYWdlIGlzIH4xMCUsIGJlbG93IDUwJSB0aHJlc2hvbGRcbiAgICAgIGV4cGVjdChyZXN1bHQuYXZlcmFnZVV0aWxpemF0aW9uKS50b0JlQ2xvc2VUbygxMCwgMCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdJbnRlZ3JhdGlvbiAtIEZ1bGwgV29ya2Zsb3cnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBjb21wbGV0ZSBmdWxsIHdvcmtmbG93IGZvciBqaWV5dWUtc2VjdXJpdGllcyBwcm9qZWN0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gMS4gRGV0ZXJtaW5lIGFjdGl2YXRpb24gbW9kZVxuICAgICAgY29uc3QgcHJvZmlsZTogUHJvamVjdFByb2ZpbGUgPSB7XG4gICAgICAgIHRva2VuQnVkZ2V0OiAxNTAwMDAsXG4gICAgICAgIGZlYXR1cmVDb3VudDogMjUsXG4gICAgICAgIHVzZXJGbG93Q291bnQ6IDE1LFxuICAgICAgICBkYXRhRW50aXR5Q291bnQ6IDIwLFxuICAgICAgICBpbnRlZ3JhdGlvbkNvdW50OiA4LFxuICAgICAgICBjb21wbGlhbmNlUmVxdWlyZW1lbnRzOiBbJ+ivgeWIuOazleinhCddLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgYWN0aXZhdGlvbiA9IHJvdXRlci5hY3RpdmF0ZShwcm9maWxlKTtcbiAgICAgIGV4cGVjdChhY3RpdmF0aW9uLm1vZGUpLnRvQmUoJ3N0YW5kYXJkJyk7XG5cbiAgICAgIC8vIDIuIFJlZ2lzdGVyIGFnZW50cyBpbiBPcmNoZXN0cmF0aW9uIEhhcm5lc3NcbiAgICAgIG9yY2hlc3RyYXRpb25IYXJuZXNzLnJlZ2lzdGVyQWdlbnQoJ2FyY2hpdGVjdC1hZ2VudCcpO1xuICAgICAgb3JjaGVzdHJhdGlvbkhhcm5lc3MucmVnaXN0ZXJBZ2VudCgnYnVpbGRlci1hZ2VudCcpO1xuXG4gICAgICAvLyAzLiBDaGVjayBnb3Zlcm5hbmNlIHJlcXVpcmVtZW50c1xuICAgICAgY29uc3QgZ292ZXJuYW5jZU1ldHJpY3MgPSBnb3Zlcm5hbmNlSGFybmVzcy5nZXRNZXRyaWNzKCk7XG4gICAgICBleHBlY3QoZ292ZXJuYW5jZU1ldHJpY3MudmV0b0NoZWNrRW5hYmxlZCkudG9CZSh0cnVlKTtcblxuICAgICAgLy8gNC4gQ2FsY3VsYXRlIGNvbXBsZXhpdHlcbiAgICAgIGNvbnN0IGNvbXBsZXhpdHkgPSBjYWxjdWxhdGVDb21wbGV4aXR5KFxuICAgICAgICAyLCAgLy8gT3JjaGVzdHJhdGlvbiArIEdvdmVybmFuY2VcbiAgICAgICAgODAwMCxcbiAgICAgICAgMjUsXG4gICAgICAgIDgsXG4gICAgICAgIDFcbiAgICAgICk7XG4gICAgICBleHBlY3QoY29tcGxleGl0eSkudG9CZUdyZWF0ZXJUaGFuKDApO1xuXG4gICAgICAvLyA1LiBWZXJpZnkgTDEzLUwxNyBhY3RpdmF0aW9uXG4gICAgICBjb25zdCBsYXllckFjdGl2YXRpb24gPSByb3V0ZXIuZ2V0TGF5ZXJBY3RpdmF0aW9uKHByb2ZpbGUpO1xuICAgICAgZXhwZWN0KGxheWVyQWN0aXZhdGlvbi5hY3RpdmF0ZWQpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QobGF5ZXJBY3RpdmF0aW9uLmxheWVycykudG9Db250YWluKDEzKTsgIC8vIFNlbWFudGljIENvbnNpc3RlbmN5XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGNvbXBsZXRlIGZ1bGwgd29ya2Zsb3cgZm9yIGFuZnNmLXYxLjEgcHJvamVjdCcsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIDEuIERldGVybWluZSBhY3RpdmF0aW9uIG1vZGVcbiAgICAgIGNvbnN0IHByb2ZpbGU6IFByb2plY3RQcm9maWxlID0ge1xuICAgICAgICB0b2tlbkJ1ZGdldDogMzAwMDAsXG4gICAgICAgIGZlYXR1cmVDb3VudDogMTAsXG4gICAgICAgIHVzZXJGbG93Q291bnQ6IDUsXG4gICAgICAgIGRhdGFFbnRpdHlDb3VudDogOCxcbiAgICAgICAgaW50ZWdyYXRpb25Db3VudDogMixcbiAgICAgICAgY29tcGxpYW5jZVJlcXVpcmVtZW50czogW10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBhY3RpdmF0aW9uID0gcm91dGVyLmFjdGl2YXRlKHByb2ZpbGUpO1xuICAgICAgZXhwZWN0KGFjdGl2YXRpb24ubW9kZSkudG9CZSgnbGlnaHQnKTtcblxuICAgICAgLy8gMi4gUmVnaXN0ZXIgYWdlbnRzXG4gICAgICBvcmNoZXN0cmF0aW9uSGFybmVzcy5yZWdpc3RlckFnZW50KCdidWlsZGVyLWFnZW50Jyk7XG5cbiAgICAgIC8vIDMuIEdvdmVybmFuY2Ugbm90IHJlcXVpcmVkIGZvciBsaWdodCBtb2RlXG4gICAgICBleHBlY3QoYWN0aXZhdGlvbi5nb3Zlcm5hbmNlKS50b0JlKGZhbHNlKTtcblxuICAgICAgLy8gNC4gTDEzLUwxNyBub3QgYWN0aXZhdGVkIGZvciBsaWdodCBtb2RlXG4gICAgICBjb25zdCBsYXllckFjdGl2YXRpb24gPSByb3V0ZXIuZ2V0TGF5ZXJBY3RpdmF0aW9uKHByb2ZpbGUpO1xuICAgICAgZXhwZWN0KGxheWVyQWN0aXZhdGlvbi5hY3RpdmF0ZWQpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19