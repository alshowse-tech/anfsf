"use strict";
/**
 * ANFSF V1.5.0 - Requirement Refiner Skill Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const requirement_refiner_skill_1 = require("../requirement-refiner-skill");
const memory_consolidation_skill_1 = require("../memory-consolidation-skill");
const context_compressor_skill_1 = require("../context-compressor-skill");
const hybrid_retriever_skill_1 = require("../hybrid-retriever-skill");
const hallucination_guard_skill_1 = require("../hallucination-guard-skill");
const evolution_harness_1 = require("../../harness/evolution-harness");
const kpi_dashboard_1 = require("../../harness/kpi-dashboard");
(0, globals_1.describe)('RequirementRefinerSkill Tests', () => {
    let skill;
    let memorySkill;
    let contextCompressor;
    let hybridRetriever;
    let hallucinationGuard;
    let evolutionHarness;
    let kpiDashboard;
    (0, globals_1.beforeEach)(() => {
        memorySkill = new memory_consolidation_skill_1.MemoryConsolidationSkill();
        contextCompressor = new context_compressor_skill_1.ContextCompressorSkill();
        hybridRetriever = new hybrid_retriever_skill_1.HybridRetrieverSkill();
        hallucinationGuard = new hallucination_guard_skill_1.HallucinationGuardSkill();
        evolutionHarness = new evolution_harness_1.EvolutionHarness();
        kpiDashboard = new kpi_dashboard_1.KPIDashboard();
        skill = new requirement_refiner_skill_1.RequirementRefinerSkill(memorySkill, contextCompressor, hybridRetriever, hallucinationGuard, evolutionHarness, kpiDashboard);
    });
    (0, globals_1.describe)('execute', () => {
        (0, globals_1.it)('should refine simple requirement with two-source context', async () => {
            const ctx = {
                rawRequirement: '开发一个 AI 辅助的近视防控管理系统',
                enableTwoSource: true,
                enableABValidation: true,
            };
            const result = await skill.execute(ctx);
            (0, globals_1.expect)(result.graph).toBeDefined();
            (0, globals_1.expect)(result.graph.nodes.length).toBeGreaterThan(0);
            (0, globals_1.expect)(result.traceId).toBeDefined();
        });
        (0, globals_1.it)('should perform A/B self-validation when enabled', async () => {
            const ctx = {
                rawRequirement: '开发一个证券信息系统',
                enableTwoSource: true,
                enableABValidation: true,
            };
            const result = await skill.execute(ctx);
            (0, globals_1.expect)(result.improvement).toBeDefined();
            // Improvement can be negative (two-source worse than baseline)
            (0, globals_1.expect)(result.usedBaseline).toBeDefined();
        });
        (0, globals_1.it)('should rollback to baseline when improvement < 15%', async () => {
            const ctx = {
                rawRequirement: '简单需求',
                enableTwoSource: true,
                enableABValidation: true,
            };
            const result = await skill.execute(ctx);
            // If improvement < 0.15, should use baseline
            if (result.improvement < 0.15) {
                (0, globals_1.expect)(result.usedBaseline).toBe(true);
            }
        });
        (0, globals_1.it)('should record twoSourceImprovement to KPI Dashboard', async () => {
            const ctx = {
                rawRequirement: '测试需求',
                enableTwoSource: true,
                enableABValidation: true,
            };
            await skill.execute(ctx);
            const metrics = kpiDashboard.getCurrentMetrics();
            (0, globals_1.expect)(metrics).toBeDefined();
        });
        (0, globals_1.it)('should work with two-source disabled', async () => {
            const ctx = {
                rawRequirement: '简单需求',
                enableTwoSource: false,
                enableABValidation: false,
            };
            const result = await skill.execute(ctx);
            (0, globals_1.expect)(result.graph).toBeDefined();
            (0, globals_1.expect)(result.usedBaseline).toBe(false);
        });
    });
    (0, globals_1.describe)('runTwoSource', () => {
        (0, globals_1.it)('should combine history and current context', async () => {
            const rawRequirement = '开发一个电商系统';
            const traceId = 'test-trace';
            // Access private method via any cast for testing
            const twoSourceResult = await skill.runTwoSource(rawRequirement, traceId);
            (0, globals_1.expect)(twoSourceResult).toBeDefined();
            (0, globals_1.expect)(twoSourceResult.nodes).toBeDefined();
            (0, globals_1.expect)(twoSourceResult.edges).toBeDefined();
        });
    });
    (0, globals_1.describe)('runBaselineOneSource', () => {
        (0, globals_1.it)('should use current context only', async () => {
            const rawRequirement = '开发一个博客系统';
            const traceId = 'test-trace';
            const baselineResult = await skill.runBaselineOneSource(rawRequirement, traceId);
            (0, globals_1.expect)(baselineResult).toBeDefined();
            (0, globals_1.expect)(baselineResult.nodes.length).toBeGreaterThan(0);
        });
    });
    (0, globals_1.describe)('calculateImprovement', () => {
        (0, globals_1.it)('should calculate improvement between two-source and baseline', () => {
            const twoSource = {
                nodes: Array(10).fill({ id: 'n1', type: 'requirement', content: 'test' }),
                edges: Array(9).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
                quality: 0.9,
                completeness: 0.95,
                traceId: 'trace1',
            };
            const baseline = {
                nodes: Array(7).fill({ id: 'n1', type: 'requirement', content: 'test' }),
                edges: Array(6).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
                quality: 0.8,
                completeness: 0.85,
                traceId: 'trace2',
            };
            const improvement = skill.calculateImprovement(twoSource, baseline);
            (0, globals_1.expect)(improvement).toBeGreaterThan(0);
            (0, globals_1.expect)(improvement).toBeLessThanOrEqual(1);
        });
        (0, globals_1.it)('should return negative improvement when two-source is worse', () => {
            const twoSource = {
                nodes: Array(5).fill({ id: 'n1', type: 'requirement', content: 'test' }),
                edges: Array(4).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
                quality: 0.7,
                completeness: 0.75,
                traceId: 'trace1',
            };
            const baseline = {
                nodes: Array(10).fill({ id: 'n1', type: 'requirement', content: 'test' }),
                edges: Array(9).fill({ from: 'n1', to: 'n2', type: 'depends_on' }),
                quality: 0.9,
                completeness: 0.95,
                traceId: 'trace2',
            };
            const improvement = skill.calculateImprovement(twoSource, baseline);
            (0, globals_1.expect)(improvement).toBeLessThan(0);
        });
    });
    (0, globals_1.describe)('buildGraph', () => {
        (0, globals_1.it)('should build Requirement Graph from verified statements', () => {
            const rawRequirement = '测试需求';
            const verifiedStatements = ['需求 1', '需求 2', '需求 3'];
            const traceId = 'test-trace';
            const graph = skill.buildGraph(rawRequirement, verifiedStatements, traceId);
            (0, globals_1.expect)(graph.nodes.length).toBe(3);
            (0, globals_1.expect)(graph.edges.length).toBe(2);
            (0, globals_1.expect)(graph.quality).toBe(0.9);
            (0, globals_1.expect)(graph.traceId).toBe(traceId);
        });
        (0, globals_1.it)('should handle empty verified statements', () => {
            const rawRequirement = '测试需求';
            const verifiedStatements = [];
            const traceId = 'test-trace';
            const graph = skill.buildGraph(rawRequirement, verifiedStatements, traceId);
            (0, globals_1.expect)(graph.nodes.length).toBe(0);
            (0, globals_1.expect)(graph.edges.length).toBe(0);
        });
    });
    (0, globals_1.describe)('getMetadata', () => {
        (0, globals_1.it)('should return skill metadata', () => {
            const metadata = skill.getMetadata();
            (0, globals_1.expect)(metadata.name).toBe('requirement-refiner');
            (0, globals_1.expect)(metadata.version).toBe('1.0.0');
            (0, globals_1.expect)(metadata.improvementThreshold).toBe(0.20); // Updated threshold
            (0, globals_1.expect)(metadata.abValidationEnabled).toBe(true);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbC50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL3NraWxscy9fX3Rlc3RzX18vcmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7QUFFSCwyQ0FBaUU7QUFDakUsNEVBQXVFO0FBQ3ZFLDhFQUF5RTtBQUN6RSwwRUFBcUU7QUFDckUsc0VBQWlFO0FBQ2pFLDRFQUF1RTtBQUN2RSx1RUFBbUU7QUFDbkUsK0RBQTJEO0FBRTNELElBQUEsa0JBQVEsRUFBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7SUFDN0MsSUFBSSxLQUE4QixDQUFDO0lBQ25DLElBQUksV0FBcUMsQ0FBQztJQUMxQyxJQUFJLGlCQUF5QyxDQUFDO0lBQzlDLElBQUksZUFBcUMsQ0FBQztJQUMxQyxJQUFJLGtCQUEyQyxDQUFDO0lBQ2hELElBQUksZ0JBQWtDLENBQUM7SUFDdkMsSUFBSSxZQUEwQixDQUFDO0lBRS9CLElBQUEsb0JBQVUsRUFBQyxHQUFHLEVBQUU7UUFDZCxXQUFXLEdBQUcsSUFBSSxxREFBd0IsRUFBRSxDQUFDO1FBQzdDLGlCQUFpQixHQUFHLElBQUksaURBQXNCLEVBQUUsQ0FBQztRQUNqRCxlQUFlLEdBQUcsSUFBSSw2Q0FBb0IsRUFBRSxDQUFDO1FBQzdDLGtCQUFrQixHQUFHLElBQUksbURBQXVCLEVBQUUsQ0FBQztRQUNuRCxnQkFBZ0IsR0FBRyxJQUFJLG9DQUFnQixFQUFFLENBQUM7UUFDMUMsWUFBWSxHQUFHLElBQUksNEJBQVksRUFBRSxDQUFDO1FBRWxDLEtBQUssR0FBRyxJQUFJLG1EQUF1QixDQUNqQyxXQUFXLEVBQ1gsaUJBQWlCLEVBQ2pCLGVBQWUsRUFDZixrQkFBa0IsRUFDbEIsZ0JBQWdCLEVBQ2hCLFlBQVksQ0FDYixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFB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QUksS0FBYSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFFckYsSUFBQSxnQkFBTSxFQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25DLElBQUEsZ0JBQU0sRUFBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBQSxrQkFBUSxFQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDM0IsSUFBQSxZQUFFLEVBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUVyQyxJQUFBLGdCQUFNLEVBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2xELElBQUEsZ0JBQU0sRUFBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3ZDLElBQUEsZ0JBQU0sRUFBQyxRQUFRLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxvQkFBb0I7WUFDdEUsSUFBQSxnQkFBTSxFQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFORlNGIFYxLjUuMCAtIFJlcXVpcmVtZW50IFJlZmluZXIgU2tpbGwgVGVzdHNcbiAqL1xuXG5pbXBvcnQgeyBkZXNjcmliZSwgaXQsIGV4cGVjdCwgYmVmb3JlRWFjaCB9IGZyb20gJ0BqZXN0L2dsb2JhbHMnO1xuaW1wb3J0IHsgUmVxdWlyZW1lbnRSZWZpbmVyU2tpbGwgfSBmcm9tICcuLi9yZXF1aXJlbWVudC1yZWZpbmVyLXNraWxsJztcbmltcG9ydCB7IE1lbW9yeUNvbnNvbGlkYXRpb25Ta2lsbCB9IGZyb20gJy4uL21lbW9yeS1jb25zb2xpZGF0aW9uLXNraWxsJztcbmltcG9ydCB7IENvbnRleHRDb21wcmVzc29yU2tpbGwgfSBmcm9tICcuLi9jb250ZXh0LWNvbXByZXNzb3Itc2tpbGwnO1xuaW1wb3J0IHsgSHlicmlkUmV0cmlldmVyU2tpbGwgfSBmcm9tICcuLi9oeWJyaWQtcmV0cmlldmVyLXNraWxsJztcbmltcG9ydCB7IEhhbGx1Y2luYXRpb25HdWFyZFNraWxsIH0gZnJvbSAnLi4vaGFsbHVjaW5hdGlvbi1ndWFyZC1za2lsbCc7XG5pbXBvcnQgeyBFdm9sdXRpb25IYXJuZXNzIH0gZnJvbSAnLi4vLi4vaGFybmVzcy9ldm9sdXRpb24taGFybmVzcyc7XG5pbXBvcnQgeyBLUElEYXNoYm9hcmQgfSBmcm9tICcuLi8uLi9oYXJuZXNzL2twaS1kYXNoYm9hcmQnO1xuXG5kZXNjcmliZSgnUmVxdWlyZW1lbnRSZWZpbmVyU2tpbGwgVGVzdHMnLCAoKSA9PiB7XG4gIGxldCBza2lsbDogUmVxdWlyZW1lbnRSZWZpbmVyU2tpbGw7XG4gIGxldCBtZW1vcnlTa2lsbDogTWVtb3J5Q29uc29saWRhdGlvblNraWxsO1xuICBsZXQgY29udGV4dENvbXByZXNzb3I6IENvbnRleHRDb21wcmVzc29yU2tpbGw7XG4gIGxldCBoeWJyaWRSZXRyaWV2ZXI6IEh5YnJpZFJldHJpZXZlclNraWxsO1xuICBsZXQgaGFsbHVjaW5hdGlvbkd1YXJkOiBIYWxsdWNpbmF0aW9uR3VhcmRTa2lsbDtcbiAgbGV0IGV2b2x1dGlvbkhhcm5lc3M6IEV2b2x1dGlvbkhhcm5lc3M7XG4gIGxldCBrcGlEYXNoYm9hcmQ6IEtQSURhc2hib2FyZDtcblxuICBiZWZvcmVFYWNoKCgpID0+IHtcbiAgICBtZW1vcnlTa2lsbCA9IG5ldyBNZW1vcnlDb25zb2xpZGF0aW9uU2tpbGwoKTtcbiAgICBjb250ZXh0Q29tcHJlc3NvciA9IG5ldyBDb250ZXh0Q29tcHJlc3NvclNraWxsKCk7XG4gICAgaHlicmlkUmV0cmlldmVyID0gbmV3IEh5YnJpZFJldHJpZXZlclNraWxsKCk7XG4gICAgaGFsbHVjaW5hdGlvbkd1YXJkID0gbmV3IEhhbGx1Y2luYXRpb25HdWFyZFNraWxsKCk7XG4gICAgZXZvbHV0aW9uSGFybmVzcyA9IG5ldyBFdm9sdXRpb25IYXJuZXNzKCk7XG4gICAga3BpRGFzaGJvYXJkID0gbmV3IEtQSURhc2hib2FyZCgpO1xuXG4gICAgc2tpbGwgPSBuZXcgUmVxdWlyZW1lbnRSZWZpbmVyU2tpbGwoXG4gICAgICBtZW1vcnlTa2lsbCxcbiAgICAgIGNvbnRleHRDb21wcmVzc29yLFxuICAgICAgaHlicmlkUmV0cmlldmVyLFxuICAgICAgaGFsbHVjaW5hdGlvbkd1YXJkLFxuICAgICAgZXZvbHV0aW9uSGFybmVzcyxcbiAgICAgIGtwaURhc2hib2FyZFxuICAgICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdleGVjdXRlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgcmVmaW5lIHNpbXBsZSByZXF1aXJlbWVudCB3aXRoIHR3by1zb3VyY2UgY29udGV4dCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgcmF3UmVxdWlyZW1lbnQ6ICflvIDlj5HkuIDkuKogQUkg6L6F5Yqp55qE6L+R6KeG6Ziy5o6n566h55CG57O757ufJyxcbiAgICAgICAgZW5hYmxlVHdvU291cmNlOiB0cnVlLFxuICAgICAgICBlbmFibGVBQlZhbGlkYXRpb246IHRydWUsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBza2lsbC5leGVjdXRlKGN0eCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuZ3JhcGgpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QocmVzdWx0LmdyYXBoLm5vZGVzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xuICAgICAgZXhwZWN0KHJlc3VsdC50cmFjZUlkKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBwZXJmb3JtIEEvQiBzZWxmLXZhbGlkYXRpb24gd2hlbiBlbmFibGVkJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgY3R4ID0ge1xuICAgICAgICByYXdSZXF1aXJlbWVudDogJ+W8gOWPkeS4gOS4quivgeWIuOS/oeaBr+ezu+e7nycsXG4gICAgICAgIGVuYWJsZVR3b1NvdXJjZTogdHJ1ZSxcbiAgICAgICAgZW5hYmxlQUJWYWxpZGF0aW9uOiB0cnVlLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2tpbGwuZXhlY3V0ZShjdHgpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmltcHJvdmVtZW50KS50b0JlRGVmaW5lZCgpO1xuICAgICAgLy8gSW1wcm92ZW1lbnQgY2FuIGJlIG5lZ2F0aXZlICh0d28tc291cmNlIHdvcnNlIHRoYW4gYmFzZWxpbmUpXG4gICAgICBleHBlY3QocmVzdWx0LnVzZWRCYXNlbGluZSkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcm9sbGJhY2sgdG8gYmFzZWxpbmUgd2hlbiBpbXByb3ZlbWVudCA8IDE1JScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgcmF3UmVxdWlyZW1lbnQ6ICfnroDljZXpnIDmsYInLFxuICAgICAgICBlbmFibGVUd29Tb3VyY2U6IHRydWUsXG4gICAgICAgIGVuYWJsZUFCVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNraWxsLmV4ZWN1dGUoY3R4KTtcblxuICAgICAgLy8gSWYgaW1wcm92ZW1lbnQgPCAwLjE1LCBzaG91bGQgdXNlIGJhc2VsaW5lXG4gICAgICBpZiAocmVzdWx0LmltcHJvdmVtZW50IDwgMC4xNSkge1xuICAgICAgICBleHBlY3QocmVzdWx0LnVzZWRCYXNlbGluZSkudG9CZSh0cnVlKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVjb3JkIHR3b1NvdXJjZUltcHJvdmVtZW50IHRvIEtQSSBEYXNoYm9hcmQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBjdHggPSB7XG4gICAgICAgIHJhd1JlcXVpcmVtZW50OiAn5rWL6K+V6ZyA5rGCJyxcbiAgICAgICAgZW5hYmxlVHdvU291cmNlOiB0cnVlLFxuICAgICAgICBlbmFibGVBQlZhbGlkYXRpb246IHRydWUsXG4gICAgICB9O1xuXG4gICAgICBhd2FpdCBza2lsbC5leGVjdXRlKGN0eCk7XG5cbiAgICAgIGNvbnN0IG1ldHJpY3MgPSBrcGlEYXNoYm9hcmQuZ2V0Q3VycmVudE1ldHJpY3MoKTtcbiAgICAgIGV4cGVjdChtZXRyaWNzKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB3b3JrIHdpdGggdHdvLXNvdXJjZSBkaXNhYmxlZCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGN0eCA9IHtcbiAgICAgICAgcmF3UmVxdWlyZW1lbnQ6ICfnroDljZXpnIDmsYInLFxuICAgICAgICBlbmFibGVUd29Tb3VyY2U6IGZhbHNlLFxuICAgICAgICBlbmFibGVBQlZhbGlkYXRpb246IGZhbHNlLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2tpbGwuZXhlY3V0ZShjdHgpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmdyYXBoKS50b0JlRGVmaW5lZCgpO1xuICAgICAgZXhwZWN0KHJlc3VsdC51c2VkQmFzZWxpbmUpLnRvQmUoZmFsc2UpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgncnVuVHdvU291cmNlJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY29tYmluZSBoaXN0b3J5IGFuZCBjdXJyZW50IGNvbnRleHQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByYXdSZXF1aXJlbWVudCA9ICflvIDlj5HkuIDkuKrnlLXllYbns7vnu58nO1xuICAgICAgY29uc3QgdHJhY2VJZCA9ICd0ZXN0LXRyYWNlJztcblxuICAgICAgLy8gQWNjZXNzIHByaXZhdGUgbWV0aG9kIHZpYSBhbnkgY2FzdCBmb3IgdGVzdGluZ1xuICAgICAgY29uc3QgdHdvU291cmNlUmVzdWx0ID0gYXdhaXQgKHNraWxsIGFzIGFueSkucnVuVHdvU291cmNlKHJhd1JlcXVpcmVtZW50LCB0cmFjZUlkKTtcblxuICAgICAgZXhwZWN0KHR3b1NvdXJjZVJlc3VsdCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdCh0d29Tb3VyY2VSZXN1bHQubm9kZXMpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QodHdvU291cmNlUmVzdWx0LmVkZ2VzKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgncnVuQmFzZWxpbmVPbmVTb3VyY2UnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCB1c2UgY3VycmVudCBjb250ZXh0IG9ubHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByYXdSZXF1aXJlbWVudCA9ICflvIDlj5HkuIDkuKrljZrlrqLns7vnu58nO1xuICAgICAgY29uc3QgdHJhY2VJZCA9ICd0ZXN0LXRyYWNlJztcblxuICAgICAgY29uc3QgYmFzZWxpbmVSZXN1bHQgPSBhd2FpdCAoc2tpbGwgYXMgYW55KS5ydW5CYXNlbGluZU9uZVNvdXJjZShyYXdSZXF1aXJlbWVudCwgdHJhY2VJZCk7XG5cbiAgICAgIGV4cGVjdChiYXNlbGluZVJlc3VsdCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChiYXNlbGluZVJlc3VsdC5ub2Rlcy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NhbGN1bGF0ZUltcHJvdmVtZW50JywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIGltcHJvdmVtZW50IGJldHdlZW4gdHdvLXNvdXJjZSBhbmQgYmFzZWxpbmUnLCAoKSA9PiB7XG4gICAgICBjb25zdCB0d29Tb3VyY2UgPSB7XG4gICAgICAgIG5vZGVzOiBBcnJheSgxMCkuZmlsbCh7IGlkOiAnbjEnLCB0eXBlOiAncmVxdWlyZW1lbnQnLCBjb250ZW50OiAndGVzdCcgfSksXG4gICAgICAgIGVkZ2VzOiBBcnJheSg5KS5maWxsKHsgZnJvbTogJ24xJywgdG86ICduMicsIHR5cGU6ICdkZXBlbmRzX29uJyB9KSxcbiAgICAgICAgcXVhbGl0eTogMC45LFxuICAgICAgICBjb21wbGV0ZW5lc3M6IDAuOTUsXG4gICAgICAgIHRyYWNlSWQ6ICd0cmFjZTEnLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgYmFzZWxpbmUgPSB7XG4gICAgICAgIG5vZGVzOiBBcnJheSg3KS5maWxsKHsgaWQ6ICduMScsIHR5cGU6ICdyZXF1aXJlbWVudCcsIGNvbnRlbnQ6ICd0ZXN0JyB9KSxcbiAgICAgICAgZWRnZXM6IEFycmF5KDYpLmZpbGwoeyBmcm9tOiAnbjEnLCB0bzogJ24yJywgdHlwZTogJ2RlcGVuZHNfb24nIH0pLFxuICAgICAgICBxdWFsaXR5OiAwLjgsXG4gICAgICAgIGNvbXBsZXRlbmVzczogMC44NSxcbiAgICAgICAgdHJhY2VJZDogJ3RyYWNlMicsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBpbXByb3ZlbWVudCA9IChza2lsbCBhcyBhbnkpLmNhbGN1bGF0ZUltcHJvdmVtZW50KHR3b1NvdXJjZSwgYmFzZWxpbmUpO1xuXG4gICAgICBleHBlY3QoaW1wcm92ZW1lbnQpLnRvQmVHcmVhdGVyVGhhbigwKTtcbiAgICAgIGV4cGVjdChpbXByb3ZlbWVudCkudG9CZUxlc3NUaGFuT3JFcXVhbCgxKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG5lZ2F0aXZlIGltcHJvdmVtZW50IHdoZW4gdHdvLXNvdXJjZSBpcyB3b3JzZScsICgpID0+IHtcbiAgICAgIGNvbnN0IHR3b1NvdXJjZSA9IHtcbiAgICAgICAgbm9kZXM6IEFycmF5KDUpLmZpbGwoeyBpZDogJ24xJywgdHlwZTogJ3JlcXVpcmVtZW50JywgY29udGVudDogJ3Rlc3QnIH0pLFxuICAgICAgICBlZGdlczogQXJyYXkoNCkuZmlsbCh7IGZyb206ICduMScsIHRvOiAnbjInLCB0eXBlOiAnZGVwZW5kc19vbicgfSksXG4gICAgICAgIHF1YWxpdHk6IDAuNyxcbiAgICAgICAgY29tcGxldGVuZXNzOiAwLjc1LFxuICAgICAgICB0cmFjZUlkOiAndHJhY2UxJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGJhc2VsaW5lID0ge1xuICAgICAgICBub2RlczogQXJyYXkoMTApLmZpbGwoeyBpZDogJ24xJywgdHlwZTogJ3JlcXVpcmVtZW50JywgY29udGVudDogJ3Rlc3QnIH0pLFxuICAgICAgICBlZGdlczogQXJyYXkoOSkuZmlsbCh7IGZyb206ICduMScsIHRvOiAnbjInLCB0eXBlOiAnZGVwZW5kc19vbicgfSksXG4gICAgICAgIHF1YWxpdHk6IDAuOSxcbiAgICAgICAgY29tcGxldGVuZXNzOiAwLjk1LFxuICAgICAgICB0cmFjZUlkOiAndHJhY2UyJyxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGltcHJvdmVtZW50ID0gKHNraWxsIGFzIGFueSkuY2FsY3VsYXRlSW1wcm92ZW1lbnQodHdvU291cmNlLCBiYXNlbGluZSk7XG5cbiAgICAgIGV4cGVjdChpbXByb3ZlbWVudCkudG9CZUxlc3NUaGFuKDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnYnVpbGRHcmFwaCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGJ1aWxkIFJlcXVpcmVtZW50IEdyYXBoIGZyb20gdmVyaWZpZWQgc3RhdGVtZW50cycsICgpID0+IHtcbiAgICAgIGNvbnN0IHJhd1JlcXVpcmVtZW50ID0gJ+a1i+ivlemcgOaxgic7XG4gICAgICBjb25zdCB2ZXJpZmllZFN0YXRlbWVudHMgPSBbJ+mcgOaxgiAxJywgJ+mcgOaxgiAyJywgJ+mcgOaxgiAzJ107XG4gICAgICBjb25zdCB0cmFjZUlkID0gJ3Rlc3QtdHJhY2UnO1xuXG4gICAgICBjb25zdCBncmFwaCA9IChza2lsbCBhcyBhbnkpLmJ1aWxkR3JhcGgocmF3UmVxdWlyZW1lbnQsIHZlcmlmaWVkU3RhdGVtZW50cywgdHJhY2VJZCk7XG5cbiAgICAgIGV4cGVjdChncmFwaC5ub2Rlcy5sZW5ndGgpLnRvQmUoMyk7XG4gICAgICBleHBlY3QoZ3JhcGguZWRnZXMubGVuZ3RoKS50b0JlKDIpO1xuICAgICAgZXhwZWN0KGdyYXBoLnF1YWxpdHkpLnRvQmUoMC45KTtcbiAgICAgIGV4cGVjdChncmFwaC50cmFjZUlkKS50b0JlKHRyYWNlSWQpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZW1wdHkgdmVyaWZpZWQgc3RhdGVtZW50cycsICgpID0+IHtcbiAgICAgIGNvbnN0IHJhd1JlcXVpcmVtZW50ID0gJ+a1i+ivlemcgOaxgic7XG4gICAgICBjb25zdCB2ZXJpZmllZFN0YXRlbWVudHM6IHN0cmluZ1tdID0gW107XG4gICAgICBjb25zdCB0cmFjZUlkID0gJ3Rlc3QtdHJhY2UnO1xuXG4gICAgICBjb25zdCBncmFwaCA9IChza2lsbCBhcyBhbnkpLmJ1aWxkR3JhcGgocmF3UmVxdWlyZW1lbnQsIHZlcmlmaWVkU3RhdGVtZW50cywgdHJhY2VJZCk7XG5cbiAgICAgIGV4cGVjdChncmFwaC5ub2Rlcy5sZW5ndGgpLnRvQmUoMCk7XG4gICAgICBleHBlY3QoZ3JhcGguZWRnZXMubGVuZ3RoKS50b0JlKDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnZ2V0TWV0YWRhdGEnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gc2tpbGwgbWV0YWRhdGEnLCAoKSA9PiB7XG4gICAgICBjb25zdCBtZXRhZGF0YSA9IHNraWxsLmdldE1ldGFkYXRhKCk7XG5cbiAgICAgIGV4cGVjdChtZXRhZGF0YS5uYW1lKS50b0JlKCdyZXF1aXJlbWVudC1yZWZpbmVyJyk7XG4gICAgICBleHBlY3QobWV0YWRhdGEudmVyc2lvbikudG9CZSgnMS4wLjAnKTtcbiAgICAgIGV4cGVjdChtZXRhZGF0YS5pbXByb3ZlbWVudFRocmVzaG9sZCkudG9CZSgwLjIwKTsgLy8gVXBkYXRlZCB0aHJlc2hvbGRcbiAgICAgIGV4cGVjdChtZXRhZGF0YS5hYlZhbGlkYXRpb25FbmFibGVkKS50b0JlKHRydWUpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19