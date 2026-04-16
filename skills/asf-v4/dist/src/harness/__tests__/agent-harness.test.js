"use strict";
/**
 * Agent Harness Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const agent_harness_1 = require("../agent-harness");
describe('AgentHarness', () => {
    let harness;
    beforeEach(() => {
        harness = new agent_harness_1.AgentHarness({ enableLogging: false });
    });
    describe('RunTest', () => {
        it('should run test successfully', async () => {
            const scenario = {
                id: 'test-1',
                name: 'Test Scenario',
                type: 'unit',
                config: {},
                expectedOutcomes: [],
                successCriteria: {
                    minPassRate: 0.9,
                    maxErrorRate: 0.1,
                },
            };
            const result = await harness.runTest(scenario);
            expect(result.scenarioId).toBe('test-1');
            expect(result.status).toBeDefined();
            expect(result.executionTime).toBeGreaterThan(0);
        });
        it('should handle test failure', async () => {
            const scenario = {
                id: 'test-2',
                name: 'Failing Test',
                type: 'integration',
                config: {},
                expectedOutcomes: [],
                successCriteria: {
                    minPassRate: 0.99, // High threshold to trigger failure
                    maxErrorRate: 0.01,
                },
            };
            const result = await harness.runTest(scenario);
            expect(result.scenarioId).toBe('test-2');
            expect(result.status).toBeDefined();
        });
        it('should track test results', async () => {
            const scenario = {
                id: 'test-3',
                name: 'Tracked Test',
                type: 'unit',
                config: {},
                expectedOutcomes: [],
                successCriteria: {},
            };
            await harness.runTest(scenario);
            const storedResult = harness.getTestResult('test-3');
            expect(storedResult).toBeDefined();
            expect(storedResult?.scenarioId).toBe('test-3');
        });
    });
    describe('DeployWithCanary', () => {
        it('should deploy policy with canary', async () => {
            const policy = {
                id: 'policy-1',
                name: 'Test Policy',
                type: 'routing',
                version: '1.0.0',
                config: {},
            };
            const result = await harness.deployWithCanary(policy, {
                stages: [0.1, 0.5, 1.0],
                stageDurationMs: 100, // Short duration for testing
                rollbackOnFailure: true,
            });
            expect(result.deploymentId).toBeDefined();
            expect(result.startTime).toBeDefined();
        });
        it('should handle deployment rollback', async () => {
            const policy = {
                id: 'policy-2',
                name: 'Rollback Policy',
                type: 'routing',
                version: '1.0.0',
                config: {},
                rollbackPolicy: {
                    enabled: true,
                    triggers: [
                        {
                            metric: 'error_rate',
                            operator: 'gt',
                            threshold: 0.01, // Low threshold to trigger rollback
                        },
                    ],
                },
            };
            const result = await harness.deployWithCanary(policy, {
                stages: [0.1, 0.5, 1.0],
                stageDurationMs: 100,
                rollbackOnFailure: true,
            });
            expect(result).toBeDefined();
        });
        it('should track active deployments', async () => {
            const policy = {
                id: 'policy-3',
                name: 'Tracked Policy',
                type: 'routing',
                version: '1.0.0',
                config: {},
            };
            const result = await harness.deployWithCanary(policy, {
                stageDurationMs: 100,
            });
            const deployments = harness.getActiveDeployments();
            expect(deployments.length).toBeGreaterThan(0);
        });
    });
    describe('Rollback', () => {
        it('should rollback deployment', async () => {
            const policy = {
                id: 'policy-4',
                name: 'Rollback Test',
                type: 'routing',
                version: '1.0.0',
                config: {},
            };
            const result = await harness.deployWithCanary(policy, {
                stageDurationMs: 100,
            });
            await harness.rollback(result.deploymentId);
            const updatedResult = harness.getDeployment(result.deploymentId);
            expect(updatedResult?.rollbackInfo?.triggered).toBe(true);
        });
        it('should throw error for non-existent deployment', async () => {
            await expect(harness.rollback('non-existent-id')).rejects.toThrow();
        });
    });
    describe('Ownership Check', () => {
        it('should set and check ownership', async () => {
            harness.setOwnership('resource', '/path/to/resource', 'owner-role');
            const scenario = {
                id: 'test-ownership',
                name: 'Ownership Test',
                type: 'unit',
                config: {
                    testData: {
                        resourceType: 'resource',
                        resourcePath: '/path/to/resource',
                    },
                },
                expectedOutcomes: [],
                successCriteria: {},
            };
            const result = await harness.runTest(scenario);
            expect(result).toBeDefined();
        });
    });
    describe('Logging', () => {
        it('should collect logs', async () => {
            const harnessWithLogging = new agent_harness_1.AgentHarness({ enableLogging: true });
            const scenario = {
                id: 'test-log',
                name: 'Logging Test',
                type: 'unit',
                config: {},
                expectedOutcomes: [],
                successCriteria: {},
            };
            await harnessWithLogging.runTest(scenario);
            const logs = harnessWithLogging.getLogs();
            expect(logs.length).toBeGreaterThan(0);
        });
        it('should limit log buffer', async () => {
            const logs = harness.getLogs(10);
            expect(logs.length).toBeLessThanOrEqual(10);
        });
    });
    describe('Statistics', () => {
        it('should track multiple tests', async () => {
            for (let i = 0; i < 5; i++) {
                const scenario = {
                    id: `test-${i}`,
                    name: `Test ${i}`,
                    type: 'unit',
                    config: {},
                    expectedOutcomes: [],
                    successCriteria: {},
                };
                await harness.runTest(scenario);
            }
            // Just verify we can run multiple tests
            const deployments = harness.getActiveDeployments();
            expect(Array.isArray(deployments)).toBe(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWdlbnQtaGFybmVzcy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2hhcm5lc3MvX190ZXN0c19fL2FnZW50LWhhcm5lc3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7O0FBRUgsb0RBQWdEO0FBR2hELFFBQVEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO0lBQzVCLElBQUksT0FBcUIsQ0FBQztJQUUxQixVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsT0FBTyxHQUFHLElBQUksNEJBQVksQ0FBQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZELENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7UUFDdkIsRUFBRSxDQUFDLDhCQUE4QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVDLE1BQU0sUUFBUSxHQUFpQjtnQkFDN0IsRUFBRSxFQUFFLFFBQVE7Z0JBQ1osSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLElBQUksRUFBRSxNQUFNO2dCQUNaLE1BQU0sRUFBRSxFQUFFO2dCQUNWLGdCQUFnQixFQUFFLEVBQUU7Z0JBQ3BCLGVBQWUsRUFBRTtvQkFDZixXQUFXLEVBQUUsR0FBRztvQkFDaEIsWUFBWSxFQUFFLEdBQUc7aUJBQ2xCO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUvQyxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xELENBQUMs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QUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQixNQUFNLFFBQVEsR0FBaUI7b0JBQzdCLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtvQkFDZixJQUFJLEVBQUUsUUFBUSxDQUFDLEVBQUU7b0JBQ2pCLElBQUksRUFBRSxNQUFNO29CQUNaLE1BQU0sRUFBRSxFQUFFO29CQUNWLGdCQUFnQixFQUFFLEVBQUU7b0JBQ3BCLGVBQWUsRUFBRSxFQUFFO2lCQUNwQixDQUFDO2dCQUNGLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNsQyxDQUFDO1lBRUQsd0NBQXdDO1lBQ3hDLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ25ELE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQWdlbnQgSGFybmVzcyBUZXN0c1xuICovXG5cbmltcG9ydCB7IEFnZW50SGFybmVzcyB9IGZyb20gJy4uL2FnZW50LWhhcm5lc3MnO1xuaW1wb3J0IHsgVGVzdFNjZW5hcmlvLCBQb2xpY3kgfSBmcm9tICcuLi8uLi9oYXJuZXNzL3R5cGVzJztcblxuZGVzY3JpYmUoJ0FnZW50SGFybmVzcycsICgpID0+IHtcbiAgbGV0IGhhcm5lc3M6IEFnZW50SGFybmVzcztcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBoYXJuZXNzID0gbmV3IEFnZW50SGFybmVzcyh7IGVuYWJsZUxvZ2dpbmc6IGZhbHNlIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnUnVuVGVzdCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJ1biB0ZXN0IHN1Y2Nlc3NmdWxseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHNjZW5hcmlvOiBUZXN0U2NlbmFyaW8gPSB7XG4gICAgICAgIGlkOiAndGVzdC0xJyxcbiAgICAgICAgbmFtZTogJ1Rlc3QgU2NlbmFyaW8nLFxuICAgICAgICB0eXBlOiAndW5pdCcsXG4gICAgICAgIGNvbmZpZzoge30sXG4gICAgICAgIGV4cGVjdGVkT3V0Y29tZXM6IFtdLFxuICAgICAgICBzdWNjZXNzQ3JpdGVyaWE6IHtcbiAgICAgICAgICBtaW5QYXNzUmF0ZTogMC45LFxuICAgICAgICAgIG1heEVycm9yUmF0ZTogMC4xLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFybmVzcy5ydW5UZXN0KHNjZW5hcmlvKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zY2VuYXJpb0lkKS50b0JlKCd0ZXN0LTEnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5leGVjdXRpb25UaW1lKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB0ZXN0IGZhaWx1cmUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBzY2VuYXJpbzogVGVzdFNjZW5hcmlvID0ge1xuICAgICAgICBpZDogJ3Rlc3QtMicsXG4gICAgICAgIG5hbWU6ICdGYWlsaW5nIFRlc3QnLFxuICAgICAgICB0eXBlOiAnaW50ZWdyYXRpb24nLFxuICAgICAgICBjb25maWc6IHt9LFxuICAgICAgICBleHBlY3RlZE91dGNvbWVzOiBbXSxcbiAgICAgICAgc3VjY2Vzc0NyaXRlcmlhOiB7XG4gICAgICAgICAgbWluUGFzc1JhdGU6IDAuOTksIC8vIEhpZ2ggdGhyZXNob2xkIHRvIHRyaWdnZXIgZmFpbHVyZVxuICAgICAgICAgIG1heEVycm9yUmF0ZTogMC4wMSxcbiAgICAgICAgfSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhcm5lc3MucnVuVGVzdChzY2VuYXJpbyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc2NlbmFyaW9JZCkudG9CZSgndGVzdC0yJyk7XG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1cykudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdHJhY2sgdGVzdCByZXN1bHRzJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3Qgc2NlbmFyaW86IFRlc3RTY2VuYXJpbyA9IHtcbiAgICAgICAgaWQ6ICd0ZXN0LTMnLFxuICAgICAgICBuYW1lOiAnVHJhY2tlZCBUZXN0JyxcbiAgICAgICAgdHlwZTogJ3VuaXQnLFxuICAgICAgICBjb25maWc6IHt9LFxuICAgICAgICBleHBlY3RlZE91dGNvbWVzOiBbXSxcbiAgICAgICAgc3VjY2Vzc0NyaXRlcmlhOiB7fSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGhhcm5lc3MucnVuVGVzdChzY2VuYXJpbyk7XG4gICAgICBjb25zdCBzdG9yZWRSZXN1bHQgPSBoYXJuZXNzLmdldFRlc3RSZXN1bHQoJ3Rlc3QtMycpO1xuXG4gICAgICBleHBlY3Qoc3RvcmVkUmVzdWx0KS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHN0b3JlZFJlc3VsdD8uc2NlbmFyaW9JZCkudG9CZSgndGVzdC0zJyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdEZXBsb3lXaXRoQ2FuYXJ5JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZGVwbG95IHBvbGljeSB3aXRoIGNhbmFyeScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHBvbGljeTogUG9saWN5ID0ge1xuICAgICAgICBpZDogJ3BvbGljeS0xJyxcbiAgICAgICAgbmFtZTogJ1Rlc3QgUG9saWN5JyxcbiAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgICBjb25maWc6IHt9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFybmVzcy5kZXBsb3lXaXRoQ2FuYXJ5KHBvbGljeSwge1xuICAgICAgICBzdGFnZXM6IFswLjEsIDAuNSwgMS4wXSxcbiAgICAgICAgc3RhZ2VEdXJhdGlvbk1zOiAxMDAsIC8vIFNob3J0IGR1cmF0aW9uIGZvciB0ZXN0aW5nXG4gICAgICAgIHJvbGxiYWNrT25GYWlsdXJlOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuZGVwbG95bWVudElkKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5zdGFydFRpbWUpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBkZXBsb3ltZW50IHJvbGxiYWNrJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgcG9saWN5OiBQb2xpY3kgPSB7XG4gICAgICAgIGlkOiAncG9saWN5LTInLFxuICAgICAgICBuYW1lOiAnUm9sbGJhY2sgUG9saWN5JyxcbiAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgICBjb25maWc6IHt9LFxuICAgICAgICByb2xsYmFja1BvbGljeToge1xuICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXG4gICAgICAgICAgdHJpZ2dlcnM6IFtcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgbWV0cmljOiAnZXJyb3JfcmF0ZScsXG4gICAgICAgICAgICAgIG9wZXJhdG9yOiAnZ3QnLFxuICAgICAgICAgICAgICB0aHJlc2hvbGQ6IDAuMDEsIC8vIExvdyB0aHJlc2hvbGQgdG8gdHJpZ2dlciByb2xsYmFja1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICBdLFxuICAgICAgICB9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFybmVzcy5kZXBsb3lXaXRoQ2FuYXJ5KHBvbGljeSwge1xuICAgICAgICBzdGFnZXM6IFswLjEsIDAuNSwgMS4wXSxcbiAgICAgICAgc3RhZ2VEdXJhdGlvbk1zOiAxMDAsXG4gICAgICAgIHJvbGxiYWNrT25GYWlsdXJlOiB0cnVlLFxuICAgICAgfSk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRyYWNrIGFjdGl2ZSBkZXBsb3ltZW50cycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHBvbGljeTogUG9saWN5ID0ge1xuICAgICAgICBpZDogJ3BvbGljeS0zJyxcbiAgICAgICAgbmFtZTogJ1RyYWNrZWQgUG9saWN5JyxcbiAgICAgICAgdHlwZTogJ3JvdXRpbmcnLFxuICAgICAgICB2ZXJzaW9uOiAnMS4wLjAnLFxuICAgICAgICBjb25maWc6IHt9LFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFybmVzcy5kZXBsb3lXaXRoQ2FuYXJ5KHBvbGljeSwge1xuICAgICAgICBzdGFnZUR1cmF0aW9uTXM6IDEwMCxcbiAgICAgIH0pO1xuXG4gICAgICBjb25zdCBkZXBsb3ltZW50cyA9IGhhcm5lc3MuZ2V0QWN0aXZlRGVwbG95bWVudHMoKTtcbiAgICAgIGV4cGVjdChkZXBsb3ltZW50cy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1JvbGxiYWNrJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcm9sbGJhY2sgZGVwbG95bWVudCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHBvbGljeTogUG9saWN5ID0ge1xuICAgICAgICBpZDogJ3BvbGljeS00JyxcbiAgICAgICAgbmFtZTogJ1JvbGxiYWNrIFRlc3QnLFxuICAgICAgICB0eXBlOiAncm91dGluZycsXG4gICAgICAgIHZlcnNpb246ICcxLjAuMCcsXG4gICAgICAgIGNvbmZpZzoge30sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYXJuZXNzLmRlcGxveVdpdGhDYW5hcnkocG9saWN5LCB7XG4gICAgICAgIHN0YWdlRHVyYXRpb25NczogMTAwLFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGhhcm5lc3Mucm9sbGJhY2socmVzdWx0LmRlcGxveW1lbnRJZCk7XG5cbiAgICAgIGNvbnN0IHVwZGF0ZWRSZXN1bHQgPSBoYXJuZXNzLmdldERlcGxveW1lbnQocmVzdWx0LmRlcGxveW1lbnRJZCk7XG4gICAgICBleHBlY3QodXBkYXRlZFJlc3VsdD8ucm9sbGJhY2tJbmZvPy50cmlnZ2VyZWQpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIGZvciBub24tZXhpc3RlbnQgZGVwbG95bWVudCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGF3YWl0IGV4cGVjdChoYXJuZXNzLnJvbGxiYWNrKCdub24tZXhpc3RlbnQtaWQnKSkucmVqZWN0cy50b1Rocm93KCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdPd25lcnNoaXAgQ2hlY2snLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCBzZXQgYW5kIGNoZWNrIG93bmVyc2hpcCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGhhcm5lc3Muc2V0T3duZXJzaGlwKCdyZXNvdXJjZScsICcvcGF0aC90by9yZXNvdXJjZScsICdvd25lci1yb2xlJyk7XG5cbiAgICAgIGNvbnN0IHNjZW5hcmlvOiBUZXN0U2NlbmFyaW8gPSB7XG4gICAgICAgIGlkOiAndGVzdC1vd25lcnNoaXAnLFxuICAgICAgICBuYW1lOiAnT3duZXJzaGlwIFRlc3QnLFxuICAgICAgICB0eXBlOiAndW5pdCcsXG4gICAgICAgIGNvbmZpZzoge1xuICAgICAgICAgIHRlc3REYXRhOiB7XG4gICAgICAgICAgICByZXNvdXJjZVR5cGU6ICdyZXNvdXJjZScsXG4gICAgICAgICAgICByZXNvdXJjZVBhdGg6ICcvcGF0aC90by9yZXNvdXJjZScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgZXhwZWN0ZWRPdXRjb21lczogW10sXG4gICAgICAgIHN1Y2Nlc3NDcml0ZXJpYToge30sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYXJuZXNzLnJ1blRlc3Qoc2NlbmFyaW8pO1xuXG4gICAgICBleHBlY3QocmVzdWx0KS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnTG9nZ2luZycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNvbGxlY3QgbG9ncycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGhhcm5lc3NXaXRoTG9nZ2luZyA9IG5ldyBBZ2VudEhhcm5lc3MoeyBlbmFibGVMb2dnaW5nOiB0cnVlIH0pO1xuXG4gICAgICBjb25zdCBzY2VuYXJpbzogVGVzdFNjZW5hcmlvID0ge1xuICAgICAgICBpZDogJ3Rlc3QtbG9nJyxcbiAgICAgICAgbmFtZTogJ0xvZ2dpbmcgVGVzdCcsXG4gICAgICAgIHR5cGU6ICd1bml0JyxcbiAgICAgICAgY29uZmlnOiB7fSxcbiAgICAgICAgZXhwZWN0ZWRPdXRjb21lczogW10sXG4gICAgICAgIHN1Y2Nlc3NDcml0ZXJpYToge30sXG4gICAgICB9O1xuXG4gICAgICBhd2FpdCBoYXJuZXNzV2l0aExvZ2dpbmcucnVuVGVzdChzY2VuYXJpbyk7XG5cbiAgICAgIGNvbnN0IGxvZ3MgPSBoYXJuZXNzV2l0aExvZ2dpbmcuZ2V0TG9ncygpO1xuICAgICAgZXhwZWN0KGxvZ3MubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGxpbWl0IGxvZyBidWZmZXInLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBsb2dzID0gaGFybmVzcy5nZXRMb2dzKDEwKTtcbiAgICAgIGV4cGVjdChsb2dzLmxlbmd0aCkudG9CZUxlc3NUaGFuT3JFcXVhbCgxMCk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdTdGF0aXN0aWNzJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgdHJhY2sgbXVsdGlwbGUgdGVzdHMnLCBhc3luYyAoKSA9PiB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IDU7IGkrKykge1xuICAgICAgICBjb25zdCBzY2VuYXJpbzogVGVzdFNjZW5hcmlvID0ge1xuICAgICAgICAgIGlkOiBgdGVzdC0ke2l9YCxcbiAgICAgICAgICBuYW1lOiBgVGVzdCAke2l9YCxcbiAgICAgICAgICB0eXBlOiAndW5pdCcsXG4gICAgICAgICAgY29uZmlnOiB7fSxcbiAgICAgICAgICBleHBlY3RlZE91dGNvbWVzOiBbXSxcbiAgICAgICAgICBzdWNjZXNzQ3JpdGVyaWE6IHt9LFxuICAgICAgICB9O1xuICAgICAgICBhd2FpdCBoYXJuZXNzLnJ1blRlc3Qoc2NlbmFyaW8pO1xuICAgICAgfVxuXG4gICAgICAvLyBKdXN0IHZlcmlmeSB3ZSBjYW4gcnVuIG11bHRpcGxlIHRlc3RzXG4gICAgICBjb25zdCBkZXBsb3ltZW50cyA9IGhhcm5lc3MuZ2V0QWN0aXZlRGVwbG95bWVudHMoKTtcbiAgICAgIGV4cGVjdChBcnJheS5pc0FycmF5KGRlcGxveW1lbnRzKSkudG9CZSh0cnVlKTtcbiAgICB9KTtcbiAgfSk7XG59KTtcbiJdfQ==