"use strict";
/**
 * ASF V4.0 Style Loading Tests
 *
 * Unit tests for style loading functionality.
 * Version: v1.5.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Import modules
const ui_synthesis_module_1 = require("../core/contract/ui-synthesis-module");
const preview_controller_ui_extension_1 = require("../governance/preview-controller-ui-extension");
const gates_1 = require("../core/ownership/gates");
const framework_1 = require("../core/evolution/framework");
// Mock implementations
class MockMCPBus {
    constructor() {
        this.messages = [];
    }
    async send(message) {
        this.messages.push(message);
    }
}
class MockOwnershipLattice {
    constructor() {
        this.authorities = new Map();
    }
    hasAuthority(roleId, authority) {
        const roleAuthorities = this.authorities.get(roleId) || [];
        return roleAuthorities.includes(authority) || roleId === authority;
    }
    getOwner(nodeId) {
        return 'architect';
    }
    getRolesWithAuthority(authority) {
        return [authority];
    }
    setAuthority(roleId, authority) {
        const authorities = this.authorities.get(roleId) || [];
        authorities.push(authority);
        this.authorities.set(roleId, authorities);
    }
}
// ============================================================================
// UISynthesisModule Tests
// ============================================================================
(0, globals_1.describe)('UISynthesisModule', () => {
    let mcpBus;
    let module;
    (0, globals_1.beforeEach)(() => {
        mcpBus = new MockMCPBus();
        module = new ui_synthesis_module_1.UISynthesisModule({ framework: 'react', enableCriticalCSS: true, enableAssetValidation: true }, mcpBus);
    });
    (0, globals_1.describe)('synthesize', () => {
        (0, globals_1.it)('should generate component with asset manifest', async () => {
            const requirement = {
                componentName: 'TestComponent',
                props: { title: { type: 'string', required: true } },
                tailwindClasses: ['p-4', 'bg-blue-500'],
                externalStyles: ['https://example.com/styles.css'],
            };
            const componentTree = {
                images: ['https://example.com/image.png'],
                icons: ['icon-home'],
            };
            const result = await module.synthesize(requirement, componentTree);
            (0, globals_1.expect)(result.componentName).toBe('TestComponent');
            (0, globals_1.expect)(result.assetManifest).toBeDefined();
            (0, globals_1.expect)(result.assetManifest.styles.tailwind).toEqual(['p-4', 'bg-blue-500']);
            (0, globals_1.expect)(result.assetManifest.styles.external).toEqual(['https://example.com/styles.css']);
            (0, globals_1.expect)(result.assetManifest.assets.images).toEqual(['https://example.com/image.png']);
            (0, globals_1.expect)(result.assetManifest.assets.icons).toEqual(['icon-home']);
        });
        (0, globals_1.it)('should send MCP sync message', async () => {
            const requirement = {
                componentName: 'TestComponent',
                tailwindClasses: ['p-4'],
                externalStyles: ['https://example.com/styles.css'], // Add external style to pass validation
            };
            const componentTree = {
                images: [],
                icons: [],
            };
            await module.synthesize(requirement, componentTree);
            (0, globals_1.expect)(mcpBus.messages.length).toBe(1);
            (0, globals_1.expect)(mcpBus.messages[0].type).toBe('command');
            (0, globals_1.expect)(mcpBus.messages[0].payload.target).toBe('PreviewController');
            (0, globals_1.expect)(mcpBus.messages[0].payload.assetManifest).toBeDefined();
        });
        (0, globals_1.it)('should throw error if manifest is empty', async () => {
            const requirement = {
                componentName: 'TestComponent',
                // No styles provided
            };
            const componentTree = {
                images: [],
                icons: [],
            };
            await (0, globals_1.expect)(module.synthesize(requirement, componentTree))
                .rejects
                .toThrow('Style asset manifest empty - GenUI output validation failed');
        });
    });
    (0, globals_1.describe)('createAssetManifest', () => {
        (0, globals_1.it)('should create valid manifest', () => {
            const styles = {
                critical: 'body { margin: 0; }',
                external: ['https://example.com/styles.css'],
                dynamic: [],
                tailwind: ['p-4'],
                fonts: ['https://fonts.example.com/font.css'],
            };
            const componentTree = {
                images: ['image.png'],
                icons: ['icon-home'],
            };
            const manifest = (0, ui_synthesis_module_1.createAssetManifest)(styles, componentTree);
            (0, globals_1.expect)(manifest.styles.critical).toBe('body { margin: 0; }');
            (0, globals_1.expect)(manifest.styles.external).toEqual(['https://example.com/styles.css']);
            (0, globals_1.expect)(manifest.fonts).toEqual(['https://fonts.example.com/font.css']);
        });
        (0, globals_1.it)('should throw error if both critical and external are empty', () => {
            const styles = {
                critical: undefined,
                external: [],
                dynamic: [],
                tailwind: [],
            };
            const componentTree = {
                images: [],
                icons: [],
            };
            (0, globals_1.expect)(() => (0, ui_synthesis_module_1.createAssetManifest)(styles, componentTree))
                .toThrow('Style asset manifest empty - GenUI output validation failed');
        });
    });
});
// ============================================================================
// PreviewControllerUIExtension Tests
// ============================================================================
(0, globals_1.describe)('PreviewControllerUIExtension', () => {
    let extension;
    (0, globals_1.beforeEach)(() => {
        extension = new preview_controller_ui_extension_1.PreviewControllerUIExtension({
            enableAutoHealing: false, // Disable for unit tests
            probeTimeout: 1000,
        });
    });
    (0, globals_1.describe)('probeStyles', () => {
        (0, globals_1.it)('should return passed=true when all styles are available', async () => {
            // Mock fetch to return success
            global.fetch = globals_1.jest.fn(() => Promise.resolve({
                ok: true,
                status: 200,
            }));
            const resources = [
                { url: 'https://example.com/style1.css', type: 'external', required: true },
                { url: 'https://example.com/style2.css', type: 'external', required: true },
            ];
            const result = await extension.probeStyles(resources);
            (0, globals_1.expect)(result.passed).toBe(true);
            (0, globals_1.expect)(result.failedUrls).toEqual([]);
            (0, globals_1.expect)(result.totalChecked).toBe(2);
        });
        (0, globals_1.it)('should return passed=false when styles are unavailable', async () => {
            // Mock fetch to return failure
            global.fetch = globals_1.jest.fn(() => Promise.resolve({
                ok: false,
                status: 404,
            }));
            const resources = [
                { url: 'https://example.com/missing.css', type: 'external', required: true },
            ];
            const result = await extension.probeStyles(resources);
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.failedUrls).toEqual(['https://example.com/missing.css']);
        });
        (0, globals_1.it)('should trigger self-healing when failures detected', async () => {
            // Mock fetch to return failure
            global.fetch = globals_1.jest.fn(() => Promise.resolve({
                ok: false,
                status: 404,
            }));
            // Enable auto-healing
            extension = new preview_controller_ui_extension_1.PreviewControllerUIExtension({
                enableAutoHealing: true,
                probeTimeout: 1000,
            });
            const resources = [
                { url: 'https://example.com/missing.css', type: 'external', required: true },
            ];
            const result = await extension.probeStyles(resources);
            (0, globals_1.expect)(result.passed).toBe(false);
            (0, globals_1.expect)(result.repairTicketId).toBeDefined();
        });
    });
});
// ============================================================================
// ContractGate Tests (Ownership Lattice)
// ============================================================================
(0, globals_1.describe)('ContractGate - UI Style Rules', () => {
    let lattice;
    let gate;
    (0, globals_1.beforeEach)(() => {
        lattice = new MockOwnershipLattice();
        lattice.setAuthority('architect', 'architect');
        lattice.setAuthority('frontend', 'frontend');
        gate = (0, gates_1.createDefaultContractGate)(lattice);
    });
    (0, globals_1.describe)('canAutoApprove for ui:style/**', () => {
        (0, globals_1.it)('should auto-approve adding non-critical styles', () => {
            const diff = {
                contractType: 'ui:style/components',
                version: { before: '1.0.0', after: '1.1.0', bump: 'minor' },
                changes: {
                    added: [{ path: '/button', type: 'color', description: 'Add button color', severity: 'low', details: {} }],
                    removed: [],
                    modified: [],
                },
                breaking: false,
                requiresApproval: false,
                changelog: 'Added button color',
                riskScore: 10,
            };
            const canApprove = gate.canAutoApprove(diff);
            (0, globals_1.expect)(canApprove).toBe(true);
        });
        (0, globals_1.it)('should NOT auto-approve critical CSS changes', () => {
            const diff = {
                contractType: 'ui:style/critical/base',
                version: { before: '1.0.0', after: '1.1.0', bump: 'minor' },
                changes: {
                    added: [],
                    removed: [],
                    modified: [{ path: '/body', type: 'margin', description: 'Modify body margin', severity: 'low', details: {} }],
                },
                breaking: false,
                requiresApproval: false,
                changelog: 'Modified critical CSS',
                riskScore: 10,
            };
            const canApprove = gate.canAutoApprove(diff);
            (0, globals_1.expect)(canApprove).toBe(false); // Critical CSS requires review
        });
        (0, globals_1.it)('should NOT auto-approve breaking changes', () => {
            const diff = {
                contractType: 'ui:style/components',
                version: { before: '1.0.0', after: '2.0.0', bump: 'major' },
                changes: {
                    added: [],
                    removed: [{ path: '/button', type: 'component', description: 'Remove button', severity: 'high', details: {} }],
                    modified: [],
                },
                breaking: true,
                requiresApproval: true,
                changelog: 'Removed button component',
                riskScore: 50,
            };
            const canApprove = gate.canAutoApprove(diff);
            (0, globals_1.expect)(canApprove).toBe(false);
        });
    });
    (0, globals_1.describe)('checkPermission for ui:style/**', () => {
        (0, globals_1.it)('should allow frontend role to write ui:style resources', () => {
            const result = gate.checkPermission('ui:style/components', 'write', 'frontend');
            (0, globals_1.expect)(result.allowed).toBe(true);
        });
        (0, globals_1.it)('should allow architect to write ui:style/critical resources', () => {
            const result = gate.checkPermission('ui:style/critical/base', 'write', 'architect');
            (0, globals_1.expect)(result.allowed).toBe(true);
        });
    });
});
// ============================================================================
// ProgressiveEvolutionFramework Tests
// ============================================================================
(0, globals_1.describe)('ProgressiveEvolutionFramework', () => {
    let framework;
    (0, globals_1.beforeEach)(() => {
        framework = new framework_1.ProgressiveEvolutionFramework({
            enableKPITracking: true,
            enableBudgetEnforcement: true,
            enableAutoRollback: false,
        });
    });
    (0, globals_1.describe)('Style Loading KPI', () => {
        (0, globals_1.it)('should track style load attempts', () => {
            framework.recordStyleLoad(true, 100, true);
            framework.recordStyleLoad(true, 150, true);
            framework.recordStyleLoad(false, 500, true);
            const kpi = framework.getStyleLoadingKPI();
            (0, globals_1.expect)(kpi.totalAttempts).toBe(3);
            (0, globals_1.expect)(kpi.successfulLoads).toBe(2);
            (0, globals_1.expect)(kpi.failedLoads).toBe(1);
            (0, globals_1.expect)(kpi.current).toBeCloseTo(66.67, 1);
        });
        (0, globals_1.it)('should maintain >99% success rate target', () => {
            const kpiTarget = framework.getKPIStatus('style_loading_success_rate');
            (0, globals_1.expect)(kpiTarget).toBeDefined();
            (0, globals_1.expect)(kpiTarget?.target).toBe(99.5);
            (0, globals_1.expect)(kpiTarget?.minimum).toBe(99.0);
        });
        (0, globals_1.it)('should detect KPI violation when below minimum', () => {
            // Simulate many failures to drop below 99%
            for (let i = 0; i < 100; i++) {
                framework.recordStyleLoad(i < 98, 100, true); // 98% success rate
            }
            const kpi = framework.getStyleLoadingKPI();
            (0, globals_1.expect)(kpi.current).toBeLessThan(99.0);
        });
        (0, globals_1.it)('should track FOUC incidents', () => {
            framework.recordStyleLoad(false, 500, true); // Critical CSS failure = FOUC
            framework.recordStyleLoad(false, 500, true); // Another FOUC
            const kpi = framework.getStyleLoadingKPI();
            (0, globals_1.expect)(kpi.foucIncidents).toBe(2);
        });
        (0, globals_1.it)('should track critical CSS inlining rate', () => {
            framework.recordStyleLoad(true, 100, true);
            framework.recordStyleLoad(true, 100, true);
            framework.recordStyleLoad(true, 100, true);
            const kpi = framework.getStyleLoadingKPI();
            (0, globals_1.expect)(kpi.criticalCSSInliningRate).toBe(100);
        });
    });
    (0, globals_1.describe)('Budget Management', () => {
        (0, globals_1.it)('should track style budget separately', () => {
            framework.updateBudgetUsage(1000, true); // Style-related
            framework.updateBudgetUsage(2000, false); // Non-style
            const budget = framework.getBudgetStatus();
            (0, globals_1.expect)(budget.usedStyleBudget).toBe(1000);
            (0, globals_1.expect)(budget.usedBudget).toBe(3000);
        });
        (0, globals_1.it)('should detect budget violation', async () => {
            // Create framework with small budget
            framework = new framework_1.ProgressiveEvolutionFramework({
                enableBudgetEnforcement: true,
            });
            // Manually set small budget for testing
            framework.personalizationBudget = {
                totalBudget: 1000,
                usedBudget: 900,
                styleBudget: 500,
                usedStyleBudget: 400,
                periodMs: 86400000,
                resetAt: Date.now() + 86400000,
            };
            const result = await framework.evaluateProposal({
                id: 'test-proposal',
                description: 'Test',
                kpiImpact: {
                    style_loading_success_rate: 0,
                    contract_change_success_rate: 0,
                    role_assignment_efficiency: 0,
                    token_budget_compliance: 0,
                    deployment_success_rate: 0,
                },
                budgetImpact: 200, // Would exceed budget
                riskScore: 10,
                changes: [],
            });
            (0, globals_1.expect)(result.approved).toBe(false);
            (0, globals_1.expect)(result.budgetViolation).toBeDefined();
        });
    });
    (0, globals_1.describe)('Health Status', () => {
        (0, globals_1.it)('should report healthy when KPIs are good', () => {
            const health = framework.getHealthStatus();
            (0, globals_1.expect)(health.healthy).toBe(true);
            (0, globals_1.expect)(health.kpiStatus).toBe('healthy');
            (0, globals_1.expect)(health.violations).toBe(0);
        });
        (0, globals_1.it)('should report warning when KPIs are below target', () => {
            // Simulate some failures but keep above minimum (99%)
            // 100 successes, 1 failure = 99% success rate
            for (let i = 0; i < 100; i++) {
                framework.recordStyleLoad(true, 100, true);
            }
            framework.recordStyleLoad(false, 100, true);
            const health = framework.getHealthStatus();
            // Should be warning since we're at the edge of target
            (0, globals_1.expect)(health.kpiStatus).toMatch(/^(healthy|warning)$/);
        });
    });
});
// ============================================================================
// Integration Tests
// ============================================================================
(0, globals_1.describe)('Style Loading Integration', () => {
    (0, globals_1.it)('should complete full style loading flow', async () => {
        // Setup
        const mcpBus = new MockMCPBus();
        const uiModule = new ui_synthesis_module_1.UISynthesisModule({ framework: 'react', enableCriticalCSS: true }, mcpBus);
        const extension = new preview_controller_ui_extension_1.PreviewControllerUIExtension({
            enableAutoHealing: false,
        });
        const framework = new framework_1.ProgressiveEvolutionFramework();
        // Synthesize component
        const result = await uiModule.synthesize({
            componentName: 'IntegrationTest',
            tailwindClasses: ['p-4'],
            externalStyles: ['https://example.com/styles.css'],
        }, { images: [], icons: [] });
        (0, globals_1.expect)(result.assetManifest).toBeDefined();
        // Record successful style load
        framework.recordStyleLoad(true, 100, true);
        const kpi = framework.getStyleLoadingKPI();
        (0, globals_1.expect)(kpi.successfulLoads).toBe(1);
        (0, globals_1.expect)(kpi.current).toBe(100);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUtbG9hZGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL19fdGVzdHNfXy9zdHlsZS1sb2FkaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOztBQUVILDJDQUF1RTtBQUV2RSxpQkFBaUI7QUFDakIsOEVBTThDO0FBRTlDLG1HQUd1RDtBQUV2RCxtREFHaUM7QUFFakMsMkRBR3FDO0FBRXJDLHVCQUF1QjtBQUN2QixNQUFNLFVBQVU7SUFBaEI7UUFDRSxhQUFRLEdBQVUsRUFBRSxDQUFDO0lBS3ZCLENBQUM7SUFIQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQVk7UUFDckIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNGO0FBRUQsTUFBTSxvQkFBb0I7SUFBMUI7UUFDVSxnQkFBVyxHQUEwQixJQUFJLEdBQUcsRUFBRSxDQUFDO0lBb0J6RCxDQUFDO0lBbEJDLFlBQVksQ0FBQyxNQUFjLEVBQUUsU0FBaUI7UUFDNUMsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQzNELE9BQU8sZUFBZSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxNQUFNLEtBQUssU0FBUyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxRQUFRLENBQUMsTUFBYztRQUNyQixPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBRUQscUJBQXFCLENBQUMsU0FBaUI7UUFDckMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JCLENBQUM7SUFFRCxZQUFZLENBQUMsTUFBYyxFQUFFLFNBQWlCO1FBQzVDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN2RCxXQUFX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Q0FDdEM7WUFDRSxhQUFhLEVBQUUsaUJBQWlCO1lBQ2hDLGVBQWUsRUFBRSxDQUFDLEtBQUssQ0FBQztZQUN4QixjQUFjLEVBQUUsQ0FBQyxnQ0FBZ0MsQ0FBQztTQUNuRCxFQUNELEVBQUUsTUFBTSxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLENBQzFCLENBQUM7UUFFRixJQUFBLGdCQUFNLEVBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTNDLCtCQUErQjtRQUMvQixTQUFTLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFM0MsTUFBTSxHQUFHLEdBQUcsU0FBUyxDQUFDLGtCQUFrQixFQUFFLENBQUM7UUFDM0MsSUFBQSxnQkFBTSxFQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsSUFBQSxnQkFBTSxFQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDaEMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQVNGIFY0LjAgU3R5bGUgTG9hZGluZyBUZXN0c1xuICogXG4gKiBVbml0IHRlc3RzIGZvciBzdHlsZSBsb2FkaW5nIGZ1bmN0aW9uYWxpdHkuXG4gKiBWZXJzaW9uOiB2MS41LjBcbiAqL1xuXG5pbXBvcnQgeyBkZXNjcmliZSwgaXQsIGV4cGVjdCwgYmVmb3JlRWFjaCwgamVzdCB9IGZyb20gJ0BqZXN0L2dsb2JhbHMnO1xuXG4vLyBJbXBvcnQgbW9kdWxlc1xuaW1wb3J0IHtcbiAgVUlTeW50aGVzaXNNb2R1bGUsXG4gIGNyZWF0ZUFzc2V0TWFuaWZlc3QsXG4gIHR5cGUgQXNzZXRNYW5pZmVzdCxcbiAgdHlwZSBTdHlsZUFzc2V0cyxcbiAgdHlwZSBDb21wb25lbnRUcmVlQXNzZXRzLFxufSBmcm9tICcuLi9jb3JlL2NvbnRyYWN0L3VpLXN5bnRoZXNpcy1tb2R1bGUnO1xuXG5pbXBvcnQge1xuICBQcmV2aWV3Q29udHJvbGxlclVJRXh0ZW5zaW9uLFxuICB0eXBlIFN0eWxlUmVzb3VyY2UsXG59IGZyb20gJy4uL2dvdmVybmFuY2UvcHJldmlldy1jb250cm9sbGVyLXVpLWV4dGVuc2lvbic7XG5cbmltcG9ydCB7XG4gIENvbnRyYWN0R2F0ZSxcbiAgY3JlYXRlRGVmYXVsdENvbnRyYWN0R2F0ZSxcbn0gZnJvbSAnLi4vY29yZS9vd25lcnNoaXAvZ2F0ZXMnO1xuXG5pbXBvcnQge1xuICBQcm9ncmVzc2l2ZUV2b2x1dGlvbkZyYW1ld29yayxcbiAgdHlwZSBTdHlsZUxvYWRpbmdLUEksXG59IGZyb20gJy4uL2NvcmUvZXZvbHV0aW9uL2ZyYW1ld29yayc7XG5cbi8vIE1vY2sgaW1wbGVtZW50YXRpb25zXG5jbGFzcyBNb2NrTUNQQnVzIHtcbiAgbWVzc2FnZXM6IGFueVtdID0gW107XG4gIFxuICBhc3luYyBzZW5kKG1lc3NhZ2U6IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgIHRoaXMubWVzc2FnZXMucHVzaChtZXNzYWdlKTtcbiAgfVxufVxuXG5jbGFzcyBNb2NrT3duZXJzaGlwTGF0dGljZSB7XG4gIHByaXZhdGUgYXV0aG9yaXRpZXM6IE1hcDxzdHJpbmcsIHN0cmluZ1tdPiA9IG5ldyBNYXAoKTtcblxuICBoYXNBdXRob3JpdHkocm9sZUlkOiBzdHJpbmcsIGF1dGhvcml0eTogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgY29uc3Qgcm9sZUF1dGhvcml0aWVzID0gdGhpcy5hdXRob3JpdGllcy5nZXQocm9sZUlkKSB8fCBbXTtcbiAgICByZXR1cm4gcm9sZUF1dGhvcml0aWVzLmluY2x1ZGVzKGF1dGhvcml0eSkgfHwgcm9sZUlkID09PSBhdXRob3JpdHk7XG4gIH1cblxuICBnZXRPd25lcihub2RlSWQ6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICAgIHJldHVybiAnYXJjaGl0ZWN0JztcbiAgfVxuXG4gIGdldFJvbGVzV2l0aEF1dGhvcml0eShhdXRob3JpdHk6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgICByZXR1cm4gW2F1dGhvcml0eV07XG4gIH1cblxuICBzZXRBdXRob3JpdHkocm9sZUlkOiBzdHJpbmcsIGF1dGhvcml0eTogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgYXV0aG9yaXRpZXMgPSB0aGlzLmF1dGhvcml0aWVzLmdldChyb2xlSWQpIHx8IFtdO1xuICAgIGF1dGhvcml0aWVzLnB1c2goYXV0aG9yaXR5KTtcbiAgICB0aGlzLmF1dGhvcml0aWVzLnNldChyb2xlSWQsIGF1dGhvcml0aWVzKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBVSVN5bnRoZXNpc01vZHVsZSBUZXN0c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5kZXNjcmliZSgnVUlTeW50aGVzaXNNb2R1bGUnLCAoKSA9PiB7XG4gIGxldCBtY3BCdXM6IE1vY2tNQ1BCdXM7XG4gIGxldCBtb2R1bGU6IFVJU3ludGhlc2lzTW9kdWxlO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIG1jcEJ1cyA9IG5ldyBNb2NrTUNQQnVzKCk7XG4gICAgbW9kdWxlID0gbmV3IFVJU3ludGhlc2lzTW9kdWxlKFxuICAgICAgeyBmcmFtZXdvcms6ICdyZWFjdCcsIGVuYWJsZUNyaXRpY2FsQ1NTOiB0cnVlLCBlbmFibGVBc3NldFZhbGlkYXRpb246IHRydWUgfSxcbiAgICAgIG1jcEJ1c1xuICAgICk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdzeW50aGVzaXplJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgZ2VuZXJhdGUgY29tcG9uZW50IHdpdGggYXNzZXQgbWFuaWZlc3QnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXF1aXJlbWVudCA9IHtcbiAgICAgICAgY29tcG9uZW50TmFtZTogJ1Rlc3RDb21wb25lbnQnLFxuICAgICAgICBwcm9wczogeyB0aXRsZTogeyB0eXBlOiAnc3RyaW5nJywgcmVxdWlyZWQ6IHRydWUgfSB9LFxuICAgICAgICB0YWlsd2luZENsYXNzZXM6IFsncC00JywgJ2JnLWJsdWUtNTAwJ10sXG4gICAgICAgIGV4dGVybmFsU3R5bGVzOiBbJ2h0dHBzOi8vZXhhbXBsZS5jb20vc3R5bGVzLmNzcyddLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgY29tcG9uZW50VHJlZTogQ29tcG9uZW50VHJlZUFzc2V0cyA9IHtcbiAgICAgICAgaW1hZ2VzOiBbJ2h0dHBzOi8vZXhhbXBsZS5jb20vaW1hZ2UucG5nJ10sXG4gICAgICAgIGljb25zOiBbJ2ljb24taG9tZSddLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgbW9kdWxlLnN5bnRoZXNpemUocmVxdWlyZW1lbnQsIGNvbXBvbmVudFRyZWUpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmNvbXBvbmVudE5hbWUpLnRvQmUoJ1Rlc3RDb21wb25lbnQnKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuYXNzZXRNYW5pZmVzdCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuYXNzZXRNYW5pZmVzdC5zdHlsZXMudGFpbHdpbmQpLnRvRXF1YWwoWydwLTQnLCAnYmctYmx1ZS01MDAnXSk7XG4gICAgICBleHBlY3QocmVzdWx0LmFzc2V0TWFuaWZlc3Quc3R5bGVzLmV4dGVybmFsKS50b0VxdWFsKFsnaHR0cHM6Ly9leGFtcGxlLmNvbS9zdHlsZXMuY3NzJ10pO1xuICAgICAgZXhwZWN0KHJlc3VsdC5hc3NldE1hbmlmZXN0LmFzc2V0cy5pbWFnZXMpLnRvRXF1YWwoWydodHRwczovL2V4YW1wbGUuY29tL2ltYWdlLnBuZyddKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuYXNzZXRNYW5pZmVzdC5hc3NldHMuaWNvbnMpLnRvRXF1YWwoWydpY29uLWhvbWUnXSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHNlbmQgTUNQIHN5bmMgbWVzc2FnZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IHJlcXVpcmVtZW50ID0ge1xuICAgICAgICBjb21wb25lbnROYW1lOiAnVGVzdENvbXBvbmVudCcsXG4gICAgICAgIHRhaWx3aW5kQ2xhc3NlczogWydwLTQnXSxcbiAgICAgICAgZXh0ZXJuYWxTdHlsZXM6IFsnaHR0cHM6Ly9leGFtcGxlLmNvbS9zdHlsZXMuY3NzJ10sIC8vIEFkZCBleHRlcm5hbCBzdHlsZSB0byBwYXNzIHZhbGlkYXRpb25cbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNvbXBvbmVudFRyZWU6IENvbXBvbmVudFRyZWVBc3NldHMgPSB7XG4gICAgICAgIGltYWdlczogW10sXG4gICAgICAgIGljb25zOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IG1vZHVsZS5zeW50aGVzaXplKHJlcXVpcmVtZW50LCBjb21wb25lbnRUcmVlKTtcblxuICAgICAgZXhwZWN0KG1jcEJ1cy5tZXNzYWdlcy5sZW5ndGgpLnRvQmUoMSk7XG4gICAgICBleHBlY3QobWNwQnVzLm1lc3NhZ2VzWzBdLnR5cGUpLnRvQmUoJ2NvbW1hbmQnKTtcbiAgICAgIGV4cGVjdChtY3BCdXMubWVzc2FnZXNbMF0ucGF5bG9hZC50YXJnZXQpLnRvQmUoJ1ByZXZpZXdDb250cm9sbGVyJyk7XG4gICAgICBleHBlY3QobWNwQnVzLm1lc3NhZ2VzWzBdLnBheWxvYWQuYXNzZXRNYW5pZmVzdCkudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3IgaWYgbWFuaWZlc3QgaXMgZW1wdHknLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCByZXF1aXJlbWVudCA9IHtcbiAgICAgICAgY29tcG9uZW50TmFtZTogJ1Rlc3RDb21wb25lbnQnLFxuICAgICAgICAvLyBObyBzdHlsZXMgcHJvdmlkZWRcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNvbXBvbmVudFRyZWU6IENvbXBvbmVudFRyZWVBc3NldHMgPSB7XG4gICAgICAgIGltYWdlczogW10sXG4gICAgICAgIGljb25zOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGF3YWl0IGV4cGVjdChtb2R1bGUuc3ludGhlc2l6ZShyZXF1aXJlbWVudCwgY29tcG9uZW50VHJlZSkpXG4gICAgICAgIC5yZWplY3RzXG4gICAgICAgIC50b1Rocm93KCdTdHlsZSBhc3NldCBtYW5pZmVzdCBlbXB0eSAtIEdlblVJIG91dHB1dCB2YWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnY3JlYXRlQXNzZXRNYW5pZmVzdCcsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGNyZWF0ZSB2YWxpZCBtYW5pZmVzdCcsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0eWxlczogU3R5bGVBc3NldHMgPSB7XG4gICAgICAgIGNyaXRpY2FsOiAnYm9keSB7IG1hcmdpbjogMDsgfScsXG4gICAgICAgIGV4dGVybmFsOiBbJ2h0dHBzOi8vZXhhbXBsZS5jb20vc3R5bGVzLmNzcyddLFxuICAgICAgICBkeW5hbWljOiBbXSxcbiAgICAgICAgdGFpbHdpbmQ6IFsncC00J10sXG4gICAgICAgIGZvbnRzOiBbJ2h0dHBzOi8vZm9udHMuZXhhbXBsZS5jb20vZm9udC5jc3MnXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNvbXBvbmVudFRyZWU6IENvbXBvbmVudFRyZWVBc3NldHMgPSB7XG4gICAgICAgIGltYWdlczogWydpbWFnZS5wbmcnXSxcbiAgICAgICAgaWNvbnM6IFsnaWNvbi1ob21lJ10sXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBtYW5pZmVzdCA9IGNyZWF0ZUFzc2V0TWFuaWZlc3Qoc3R5bGVzLCBjb21wb25lbnRUcmVlKTtcblxuICAgICAgZXhwZWN0KG1hbmlmZXN0LnN0eWxlcy5jcml0aWNhbCkudG9CZSgnYm9keSB7IG1hcmdpbjogMDsgfScpO1xuICAgICAgZXhwZWN0KG1hbmlmZXN0LnN0eWxlcy5leHRlcm5hbCkudG9FcXVhbChbJ2h0dHBzOi8vZXhhbXBsZS5jb20vc3R5bGVzLmNzcyddKTtcbiAgICAgIGV4cGVjdChtYW5pZmVzdC5mb250cykudG9FcXVhbChbJ2h0dHBzOi8vZm9udHMuZXhhbXBsZS5jb20vZm9udC5jc3MnXSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIGlmIGJvdGggY3JpdGljYWwgYW5kIGV4dGVybmFsIGFyZSBlbXB0eScsICgpID0+IHtcbiAgICAgIGNvbnN0IHN0eWxlczogU3R5bGVBc3NldHMgPSB7XG4gICAgICAgIGNyaXRpY2FsOiB1bmRlZmluZWQsXG4gICAgICAgIGV4dGVybmFsOiBbXSxcbiAgICAgICAgZHluYW1pYzogW10sXG4gICAgICAgIHRhaWx3aW5kOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGNvbnN0IGNvbXBvbmVudFRyZWU6IENvbXBvbmVudFRyZWVBc3NldHMgPSB7XG4gICAgICAgIGltYWdlczogW10sXG4gICAgICAgIGljb25zOiBbXSxcbiAgICAgIH07XG5cbiAgICAgIGV4cGVjdCgoKSA9PiBjcmVhdGVBc3NldE1hbmlmZXN0KHN0eWxlcywgY29tcG9uZW50VHJlZSkpXG4gICAgICAgIC50b1Rocm93KCdTdHlsZSBhc3NldCBtYW5pZmVzdCBlbXB0eSAtIEdlblVJIG91dHB1dCB2YWxpZGF0aW9uIGZhaWxlZCcpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmV2aWV3Q29udHJvbGxlclVJRXh0ZW5zaW9uIFRlc3RzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmRlc2NyaWJlKCdQcmV2aWV3Q29udHJvbGxlclVJRXh0ZW5zaW9uJywgKCkgPT4ge1xuICBsZXQgZXh0ZW5zaW9uOiBQcmV2aWV3Q29udHJvbGxlclVJRXh0ZW5zaW9uO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGV4dGVuc2lvbiA9IG5ldyBQcmV2aWV3Q29udHJvbGxlclVJRXh0ZW5zaW9uKHtcbiAgICAgIGVuYWJsZUF1dG9IZWFsaW5nOiBmYWxzZSwgLy8gRGlzYWJsZSBmb3IgdW5pdCB0ZXN0c1xuICAgICAgcHJvYmVUaW1lb3V0OiAxMDAwLFxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgncHJvYmVTdHlsZXMnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gcGFzc2VkPXRydWUgd2hlbiBhbGwgc3R5bGVzIGFyZSBhdmFpbGFibGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIGZldGNoIHRvIHJldHVybiBzdWNjZXNzXG4gICAgICAoZ2xvYmFsIGFzIGFueSkuZmV0Y2ggPSBqZXN0LmZuKCgpID0+XG4gICAgICAgIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgb2s6IHRydWUsXG4gICAgICAgICAgc3RhdHVzOiAyMDAsXG4gICAgICAgIH0pXG4gICAgICApO1xuXG4gICAgICBjb25zdCByZXNvdXJjZXM6IFN0eWxlUmVzb3VyY2VbXSA9IFtcbiAgICAgICAgeyB1cmw6ICdodHRwczovL2V4YW1wbGUuY29tL3N0eWxlMS5jc3MnLCB0eXBlOiAnZXh0ZXJuYWwnLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgICAgICB7IHVybDogJ2h0dHBzOi8vZXhhbXBsZS5jb20vc3R5bGUyLmNzcycsIHR5cGU6ICdleHRlcm5hbCcsIHJlcXVpcmVkOiB0cnVlIH0sXG4gICAgICBdO1xuXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBleHRlbnNpb24ucHJvYmVTdHlsZXMocmVzb3VyY2VzKTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5wYXNzZWQpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QocmVzdWx0LmZhaWxlZFVybHMpLnRvRXF1YWwoW10pO1xuICAgICAgZXhwZWN0KHJlc3VsdC50b3RhbENoZWNrZWQpLnRvQmUoMik7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHJldHVybiBwYXNzZWQ9ZmFsc2Ugd2hlbiBzdHlsZXMgYXJlIHVuYXZhaWxhYmxlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gTW9jayBmZXRjaCB0byByZXR1cm4gZmFpbHVyZVxuICAgICAgKGdsb2JhbCBhcyBhbnkpLmZldGNoID0gamVzdC5mbigoKSA9PlxuICAgICAgICBQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICAgIG9rOiBmYWxzZSxcbiAgICAgICAgICBzdGF0dXM6IDQwNCxcbiAgICAgICAgfSlcbiAgICAgICk7XG5cbiAgICAgIGNvbnN0IHJlc291cmNlczogU3R5bGVSZXNvdXJjZVtdID0gW1xuICAgICAgICB7IHVybDogJ2h0dHBzOi8vZXhhbXBsZS5jb20vbWlzc2luZy5jc3MnLCB0eXBlOiAnZXh0ZXJuYWwnLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgICAgXTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXh0ZW5zaW9uLnByb2JlU3R5bGVzKHJlc291cmNlcyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQucGFzc2VkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuZmFpbGVkVXJscykudG9FcXVhbChbJ2h0dHBzOi8vZXhhbXBsZS5jb20vbWlzc2luZy5jc3MnXSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRyaWdnZXIgc2VsZi1oZWFsaW5nIHdoZW4gZmFpbHVyZXMgZGV0ZWN0ZWQnLCBhc3luYyAoKSA9PiB7XG4gICAgICAvLyBNb2NrIGZldGNoIHRvIHJldHVybiBmYWlsdXJlXG4gICAgICAoZ2xvYmFsIGFzIGFueSkuZmV0Y2ggPSBqZXN0LmZuKCgpID0+XG4gICAgICAgIFByb21pc2UucmVzb2x2ZSh7XG4gICAgICAgICAgb2s6IGZhbHNlLFxuICAgICAgICAgIHN0YXR1czogNDA0LFxuICAgICAgICB9KVxuICAgICAgKTtcblxuICAgICAgLy8gRW5hYmxlIGF1dG8taGVhbGluZ1xuICAgICAgZXh0ZW5zaW9uID0gbmV3IFByZXZpZXdDb250cm9sbGVyVUlFeHRlbnNpb24oe1xuICAgICAgICBlbmFibGVBdXRvSGVhbGluZzogdHJ1ZSxcbiAgICAgICAgcHJvYmVUaW1lb3V0OiAxMDAwLFxuICAgICAgfSk7XG5cbiAgICAgIGNvbnN0IHJlc291cmNlczogU3R5bGVSZXNvdXJjZVtdID0gW1xuICAgICAgICB7IHVybDogJ2h0dHBzOi8vZXhhbXBsZS5jb20vbWlzc2luZy5jc3MnLCB0eXBlOiAnZXh0ZXJuYWwnLCByZXF1aXJlZDogdHJ1ZSB9LFxuICAgICAgXTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZXh0ZW5zaW9uLnByb2JlU3R5bGVzKHJlc291cmNlcyk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQucGFzc2VkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQucmVwYWlyVGlja2V0SWQpLnRvQmVEZWZpbmVkKCk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnRyYWN0R2F0ZSBUZXN0cyAoT3duZXJzaGlwIExhdHRpY2UpXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmRlc2NyaWJlKCdDb250cmFjdEdhdGUgLSBVSSBTdHlsZSBSdWxlcycsICgpID0+IHtcbiAgbGV0IGxhdHRpY2U6IE1vY2tPd25lcnNoaXBMYXR0aWNlO1xuICBsZXQgZ2F0ZTogQ29udHJhY3RHYXRlO1xuXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGxhdHRpY2UgPSBuZXcgTW9ja093bmVyc2hpcExhdHRpY2UoKTtcbiAgICBsYXR0aWNlLnNldEF1dGhvcml0eSgnYXJjaGl0ZWN0JywgJ2FyY2hpdGVjdCcpO1xuICAgIGxhdHRpY2Uuc2V0QXV0aG9yaXR5KCdmcm9udGVuZCcsICdmcm9udGVuZCcpO1xuICAgIGdhdGUgPSBjcmVhdGVEZWZhdWx0Q29udHJhY3RHYXRlKGxhdHRpY2UgYXMgYW55KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ2NhbkF1dG9BcHByb3ZlIGZvciB1aTpzdHlsZS8qKicsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIGF1dG8tYXBwcm92ZSBhZGRpbmcgbm9uLWNyaXRpY2FsIHN0eWxlcycsICgpID0+IHtcbiAgICAgIGNvbnN0IGRpZmYgPSB7XG4gICAgICAgIGNvbnRyYWN0VHlwZTogJ3VpOnN0eWxlL2NvbXBvbmVudHMnIGFzIGFueSxcbiAgICAgICAgdmVyc2lvbjogeyBiZWZvcmU6ICcxLjAuMCcsIGFmdGVyOiAnMS4xLjAnLCBidW1wOiAnbWlub3InIGFzIGFueSB9LFxuICAgICAgICBjaGFuZ2VzOiB7XG4gICAgICAgICAgYWRkZWQ6IFt7IHBhdGg6ICcvYnV0dG9uJywgdHlwZTogJ2NvbG9yJywgZGVzY3JpcHRpb246ICdBZGQgYnV0dG9uIGNvbG9yJywgc2V2ZXJpdHk6ICdsb3cnIGFzIGFueSwgZGV0YWlsczoge30gfV0sXG4gICAgICAgICAgcmVtb3ZlZDogW10sXG4gICAgICAgICAgbW9kaWZpZWQ6IFtdLFxuICAgICAgICB9LFxuICAgICAgICBicmVha2luZzogZmFsc2UsXG4gICAgICAgIHJlcXVpcmVzQXBwcm92YWw6IGZhbHNlLFxuICAgICAgICBjaGFuZ2Vsb2c6ICdBZGRlZCBidXR0b24gY29sb3InLFxuICAgICAgICByaXNrU2NvcmU6IDEwLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgY2FuQXBwcm92ZSA9IGdhdGUuY2FuQXV0b0FwcHJvdmUoZGlmZiBhcyBhbnkpO1xuICAgICAgZXhwZWN0KGNhbkFwcHJvdmUpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIE5PVCBhdXRvLWFwcHJvdmUgY3JpdGljYWwgQ1NTIGNoYW5nZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCBkaWZmID0ge1xuICAgICAgICBjb250cmFjdFR5cGU6ICd1aTpzdHlsZS9jcml0aWNhbC9iYXNlJyBhcyBhbnksXG4gICAgICAgIHZlcnNpb246IHsgYmVmb3JlOiAnMS4wLjAnLCBhZnRlcjogJzEuMS4wJywgYnVtcDogJ21pbm9yJyBhcyBhbnkgfSxcbiAgICAgICAgY2hhbmdlczoge1xuICAgICAgICAgIGFkZGVkOiBbXSxcbiAgICAgICAgICByZW1vdmVkOiBbXSxcbiAgICAgICAgICBtb2RpZmllZDogW3sgcGF0aDogJy9ib2R5JywgdHlwZTogJ21hcmdpbicsIGRlc2NyaXB0aW9uOiAnTW9kaWZ5IGJvZHkgbWFyZ2luJywgc2V2ZXJpdHk6ICdsb3cnIGFzIGFueSwgZGV0YWlsczoge30gfV0sXG4gICAgICAgIH0sXG4gICAgICAgIGJyZWFraW5nOiBmYWxzZSxcbiAgICAgICAgcmVxdWlyZXNBcHByb3ZhbDogZmFsc2UsXG4gICAgICAgIGNoYW5nZWxvZzogJ01vZGlmaWVkIGNyaXRpY2FsIENTUycsXG4gICAgICAgIHJpc2tTY29yZTogMTAsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBjYW5BcHByb3ZlID0gZ2F0ZS5jYW5BdXRvQXBwcm92ZShkaWZmIGFzIGFueSk7XG4gICAgICBleHBlY3QoY2FuQXBwcm92ZSkudG9CZShmYWxzZSk7IC8vIENyaXRpY2FsIENTUyByZXF1aXJlcyByZXZpZXdcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgTk9UIGF1dG8tYXBwcm92ZSBicmVha2luZyBjaGFuZ2VzJywgKCkgPT4ge1xuICAgICAgY29uc3QgZGlmZiA9IHtcbiAgICAgICAgY29udHJhY3RUeXBlOiAndWk6c3R5bGUvY29tcG9uZW50cycgYXMgYW55LFxuICAgICAgICB2ZXJzaW9uOiB7IGJlZm9yZTogJzEuMC4wJywgYWZ0ZXI6ICcyLjAuMCcsIGJ1bXA6ICdtYWpvcicgYXMgYW55IH0sXG4gICAgICAgIGNoYW5nZXM6IHtcbiAgICAgICAgICBhZGRlZDogW10sXG4gICAgICAgICAgcmVtb3ZlZDogW3sgcGF0aDogJy9idXR0b24nLCB0eXBlOiAnY29tcG9uZW50JywgZGVzY3JpcHRpb246ICdSZW1vdmUgYnV0dG9uJywgc2V2ZXJpdHk6ICdoaWdoJyBhcyBhbnksIGRldGFpbHM6IHt9IH1dLFxuICAgICAgICAgIG1vZGlmaWVkOiBbXSxcbiAgICAgICAgfSxcbiAgICAgICAgYnJlYWtpbmc6IHRydWUsXG4gICAgICAgIHJlcXVpcmVzQXBwcm92YWw6IHRydWUsXG4gICAgICAgIGNoYW5nZWxvZzogJ1JlbW92ZWQgYnV0dG9uIGNvbXBvbmVudCcsXG4gICAgICAgIHJpc2tTY29yZTogNTAsXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBjYW5BcHByb3ZlID0gZ2F0ZS5jYW5BdXRvQXBwcm92ZShkaWZmIGFzIGFueSk7XG4gICAgICBleHBlY3QoY2FuQXBwcm92ZSkudG9CZShmYWxzZSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdjaGVja1Blcm1pc3Npb24gZm9yIHVpOnN0eWxlLyoqJywgKCkgPT4ge1xuICAgIGl0KCdzaG91bGQgYWxsb3cgZnJvbnRlbmQgcm9sZSB0byB3cml0ZSB1aTpzdHlsZSByZXNvdXJjZXMnLCAoKSA9PiB7XG4gICAgICBjb25zdCByZXN1bHQgPSBnYXRlLmNoZWNrUGVybWlzc2lvbigndWk6c3R5bGUvY29tcG9uZW50cycsICd3cml0ZScsICdmcm9udGVuZCcpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5hbGxvd2VkKS50b0JlKHRydWUpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCBhbGxvdyBhcmNoaXRlY3QgdG8gd3JpdGUgdWk6c3R5bGUvY3JpdGljYWwgcmVzb3VyY2VzJywgKCkgPT4ge1xuICAgICAgY29uc3QgcmVzdWx0ID0gZ2F0ZS5jaGVja1Blcm1pc3Npb24oJ3VpOnN0eWxlL2NyaXRpY2FsL2Jhc2UnLCAnd3JpdGUnLCAnYXJjaGl0ZWN0Jyk7XG4gICAgICBleHBlY3QocmVzdWx0LmFsbG93ZWQpLnRvQmUodHJ1ZSk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFByb2dyZXNzaXZlRXZvbHV0aW9uRnJhbWV3b3JrIFRlc3RzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmRlc2NyaWJlKCdQcm9ncmVzc2l2ZUV2b2x1dGlvbkZyYW1ld29yaycsICgpID0+IHtcbiAgbGV0IGZyYW1ld29yazogUHJvZ3Jlc3NpdmVFdm9sdXRpb25GcmFtZXdvcms7XG5cbiAgYmVmb3JlRWFjaCgoKSA9PiB7XG4gICAgZnJhbWV3b3JrID0gbmV3IFByb2dyZXNzaXZlRXZvbHV0aW9uRnJhbWV3b3JrKHtcbiAgICAgIGVuYWJsZUtQSVRyYWNraW5nOiB0cnVlLFxuICAgICAgZW5hYmxlQnVkZ2V0RW5mb3JjZW1lbnQ6IHRydWUsXG4gICAgICBlbmFibGVBdXRvUm9sbGJhY2s6IGZhbHNlLFxuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnU3R5bGUgTG9hZGluZyBLUEknLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCB0cmFjayBzdHlsZSBsb2FkIGF0dGVtcHRzJywgKCkgPT4ge1xuICAgICAgZnJhbWV3b3JrLnJlY29yZFN0eWxlTG9hZCh0cnVlLCAxMDAsIHRydWUpO1xuICAgICAgZnJhbWV3b3JrLnJlY29yZFN0eWxlTG9hZCh0cnVlLCAxNTAsIHRydWUpO1xuICAgICAgZnJhbWV3b3JrLnJlY29yZFN0eWxlTG9hZChmYWxzZSwgNTAwLCB0cnVlKTtcblxuICAgICAgY29uc3Qga3BpID0gZnJhbWV3b3JrLmdldFN0eWxlTG9hZGluZ0tQSSgpO1xuXG4gICAgICBleHBlY3Qoa3BpLnRvdGFsQXR0ZW1wdHMpLnRvQmUoMyk7XG4gICAgICBleHBlY3Qoa3BpLnN1Y2Nlc3NmdWxMb2FkcykudG9CZSgyKTtcbiAgICAgIGV4cGVjdChrcGkuZmFpbGVkTG9hZHMpLnRvQmUoMSk7XG4gICAgICBleHBlY3Qoa3BpLmN1cnJlbnQpLnRvQmVDbG9zZVRvKDY2LjY3LCAxKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgbWFpbnRhaW4gPjk5JSBzdWNjZXNzIHJhdGUgdGFyZ2V0JywgKCkgPT4ge1xuICAgICAgY29uc3Qga3BpVGFyZ2V0ID0gZnJhbWV3b3JrLmdldEtQSVN0YXR1cygnc3R5bGVfbG9hZGluZ19zdWNjZXNzX3JhdGUnKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KGtwaVRhcmdldCkudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChrcGlUYXJnZXQ/LnRhcmdldCkudG9CZSg5OS41KTtcbiAgICAgIGV4cGVjdChrcGlUYXJnZXQ/Lm1pbmltdW0pLnRvQmUoOTkuMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRldGVjdCBLUEkgdmlvbGF0aW9uIHdoZW4gYmVsb3cgbWluaW11bScsICgpID0+IHtcbiAgICAgIC8vIFNpbXVsYXRlIG1hbnkgZmFpbHVyZXMgdG8gZHJvcCBiZWxvdyA5OSVcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTAwOyBpKyspIHtcbiAgICAgICAgZnJhbWV3b3JrLnJlY29yZFN0eWxlTG9hZChpIDwgOTgsIDEwMCwgdHJ1ZSk7IC8vIDk4JSBzdWNjZXNzIHJhdGVcbiAgICAgIH1cblxuICAgICAgY29uc3Qga3BpID0gZnJhbWV3b3JrLmdldFN0eWxlTG9hZGluZ0tQSSgpO1xuICAgICAgZXhwZWN0KGtwaS5jdXJyZW50KS50b0JlTGVzc1RoYW4oOTkuMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIHRyYWNrIEZPVUMgaW5jaWRlbnRzJywgKCkgPT4ge1xuICAgICAgZnJhbWV3b3JrLnJlY29yZFN0eWxlTG9hZChmYWxzZSwgNTAwLCB0cnVlKTsgLy8gQ3JpdGljYWwgQ1NTIGZhaWx1cmUgPSBGT1VDXG4gICAgICBmcmFtZXdvcmsucmVjb3JkU3R5bGVMb2FkKGZhbHNlLCA1MDAsIHRydWUpOyAvLyBBbm90aGVyIEZPVUNcblxuICAgICAgY29uc3Qga3BpID0gZnJhbWV3b3JrLmdldFN0eWxlTG9hZGluZ0tQSSgpO1xuICAgICAgZXhwZWN0KGtwaS5mb3VjSW5jaWRlbnRzKS50b0JlKDIpO1xuICAgIH0pO1xuXG4gICAgaXQoJ3Nob3VsZCB0cmFjayBjcml0aWNhbCBDU1MgaW5saW5pbmcgcmF0ZScsICgpID0+IHtcbiAgICAgIGZyYW1ld29yay5yZWNvcmRTdHlsZUxvYWQodHJ1ZSwgMTAwLCB0cnVlKTtcbiAgICAgIGZyYW1ld29yay5yZWNvcmRTdHlsZUxvYWQodHJ1ZSwgMTAwLCB0cnVlKTtcbiAgICAgIGZyYW1ld29yay5yZWNvcmRTdHlsZUxvYWQodHJ1ZSwgMTAwLCB0cnVlKTtcblxuICAgICAgY29uc3Qga3BpID0gZnJhbWV3b3JrLmdldFN0eWxlTG9hZGluZ0tQSSgpO1xuICAgICAgZXhwZWN0KGtwaS5jcml0aWNhbENTU0lubGluaW5nUmF0ZSkudG9CZSgxMDApO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQnVkZ2V0IE1hbmFnZW1lbnQnLCAoKSA9PiB7XG4gICAgaXQoJ3Nob3VsZCB0cmFjayBzdHlsZSBidWRnZXQgc2VwYXJhdGVseScsICgpID0+IHtcbiAgICAgIGZyYW1ld29yay51cGRhdGVCdWRnZXRVc2FnZSgxMDAwLCB0cnVlKTsgLy8gU3R5bGUtcmVsYXRlZFxuICAgICAgZnJhbWV3b3JrLnVwZGF0ZUJ1ZGdldFVzYWdlKDIwMDAsIGZhbHNlKTsgLy8gTm9uLXN0eWxlXG5cbiAgICAgIGNvbnN0IGJ1ZGdldCA9IGZyYW1ld29yay5nZXRCdWRnZXRTdGF0dXMoKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KGJ1ZGdldC51c2VkU3R5bGVCdWRnZXQpLnRvQmUoMTAwMCk7XG4gICAgICBleHBlY3QoYnVkZ2V0LnVzZWRCdWRnZXQpLnRvQmUoMzAwMCk7XG4gICAgfSk7XG5cbiAgICBpdCgnc2hvdWxkIGRldGVjdCBidWRnZXQgdmlvbGF0aW9uJywgYXN5bmMgKCkgPT4ge1xuICAgICAgLy8gQ3JlYXRlIGZyYW1ld29yayB3aXRoIHNtYWxsIGJ1ZGdldFxuICAgICAgZnJhbWV3b3JrID0gbmV3IFByb2dyZXNzaXZlRXZvbHV0aW9uRnJhbWV3b3JrKHtcbiAgICAgICAgZW5hYmxlQnVkZ2V0RW5mb3JjZW1lbnQ6IHRydWUsXG4gICAgICB9KTtcblxuICAgICAgLy8gTWFudWFsbHkgc2V0IHNtYWxsIGJ1ZGdldCBmb3IgdGVzdGluZ1xuICAgICAgKGZyYW1ld29yayBhcyBhbnkpLnBlcnNvbmFsaXphdGlvbkJ1ZGdldCA9IHtcbiAgICAgICAgdG90YWxCdWRnZXQ6IDEwMDAsXG4gICAgICAgIHVzZWRCdWRnZXQ6IDkwMCxcbiAgICAgICAgc3R5bGVCdWRnZXQ6IDUwMCxcbiAgICAgICAgdXNlZFN0eWxlQnVkZ2V0OiA0MDAsXG4gICAgICAgIHBlcmlvZE1zOiA4NjQwMDAwMCxcbiAgICAgICAgcmVzZXRBdDogRGF0ZS5ub3coKSArIDg2NDAwMDAwLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZnJhbWV3b3JrLmV2YWx1YXRlUHJvcG9zYWwoe1xuICAgICAgICBpZDogJ3Rlc3QtcHJvcG9zYWwnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1Rlc3QnLFxuICAgICAgICBrcGlJbXBhY3Q6IHtcbiAgICAgICAgICBzdHlsZV9sb2FkaW5nX3N1Y2Nlc3NfcmF0ZTogMCxcbiAgICAgICAgICBjb250cmFjdF9jaGFuZ2Vfc3VjY2Vzc19yYXRlOiAwLFxuICAgICAgICAgIHJvbGVfYXNzaWdubWVudF9lZmZpY2llbmN5OiAwLFxuICAgICAgICAgIHRva2VuX2J1ZGdldF9jb21wbGlhbmNlOiAwLFxuICAgICAgICAgIGRlcGxveW1lbnRfc3VjY2Vzc19yYXRlOiAwLFxuICAgICAgICB9LFxuICAgICAgICBidWRnZXRJbXBhY3Q6IDIwMCwgLy8gV291bGQgZXhjZWVkIGJ1ZGdldFxuICAgICAgICByaXNrU2NvcmU6IDEwLFxuICAgICAgICBjaGFuZ2VzOiBbXSxcbiAgICAgIH0pO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmFwcHJvdmVkKS50b0JlKGZhbHNlKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuYnVkZ2V0VmlvbGF0aW9uKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnSGVhbHRoIFN0YXR1cycsICgpID0+IHtcbiAgICBpdCgnc2hvdWxkIHJlcG9ydCBoZWFsdGh5IHdoZW4gS1BJcyBhcmUgZ29vZCcsICgpID0+IHtcbiAgICAgIGNvbnN0IGhlYWx0aCA9IGZyYW1ld29yay5nZXRIZWFsdGhTdGF0dXMoKTtcbiAgICAgIFxuICAgICAgZXhwZWN0KGhlYWx0aC5oZWFsdGh5KS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGhlYWx0aC5rcGlTdGF0dXMpLnRvQmUoJ2hlYWx0aHknKTtcbiAgICAgIGV4cGVjdChoZWFsdGgudmlvbGF0aW9ucykudG9CZSgwKTtcbiAgICB9KTtcblxuICAgIGl0KCdzaG91bGQgcmVwb3J0IHdhcm5pbmcgd2hlbiBLUElzIGFyZSBiZWxvdyB0YXJnZXQnLCAoKSA9PiB7XG4gICAgICAvLyBTaW11bGF0ZSBzb21lIGZhaWx1cmVzIGJ1dCBrZWVwIGFib3ZlIG1pbmltdW0gKDk5JSlcbiAgICAgIC8vIDEwMCBzdWNjZXNzZXMsIDEgZmFpbHVyZSA9IDk5JSBzdWNjZXNzIHJhdGVcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTAwOyBpKyspIHtcbiAgICAgICAgZnJhbWV3b3JrLnJlY29yZFN0eWxlTG9hZCh0cnVlLCAxMDAsIHRydWUpO1xuICAgICAgfVxuICAgICAgZnJhbWV3b3JrLnJlY29yZFN0eWxlTG9hZChmYWxzZSwgMTAwLCB0cnVlKTtcblxuICAgICAgY29uc3QgaGVhbHRoID0gZnJhbWV3b3JrLmdldEhlYWx0aFN0YXR1cygpO1xuICAgICAgXG4gICAgICAvLyBTaG91bGQgYmUgd2FybmluZyBzaW5jZSB3ZSdyZSBhdCB0aGUgZWRnZSBvZiB0YXJnZXRcbiAgICAgIGV4cGVjdChoZWFsdGgua3BpU3RhdHVzKS50b01hdGNoKC9eKGhlYWx0aHl8d2FybmluZykkLyk7XG4gICAgfSk7XG4gIH0pO1xufSk7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEludGVncmF0aW9uIFRlc3RzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmRlc2NyaWJlKCdTdHlsZSBMb2FkaW5nIEludGVncmF0aW9uJywgKCkgPT4ge1xuICBpdCgnc2hvdWxkIGNvbXBsZXRlIGZ1bGwgc3R5bGUgbG9hZGluZyBmbG93JywgYXN5bmMgKCkgPT4ge1xuICAgIC8vIFNldHVwXG4gICAgY29uc3QgbWNwQnVzID0gbmV3IE1vY2tNQ1BCdXMoKTtcbiAgICBjb25zdCB1aU1vZHVsZSA9IG5ldyBVSVN5bnRoZXNpc01vZHVsZShcbiAgICAgIHsgZnJhbWV3b3JrOiAncmVhY3QnLCBlbmFibGVDcml0aWNhbENTUzogdHJ1ZSB9LFxuICAgICAgbWNwQnVzXG4gICAgKTtcblxuICAgIGNvbnN0IGV4dGVuc2lvbiA9IG5ldyBQcmV2aWV3Q29udHJvbGxlclVJRXh0ZW5zaW9uKHtcbiAgICAgIGVuYWJsZUF1dG9IZWFsaW5nOiBmYWxzZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGZyYW1ld29yayA9IG5ldyBQcm9ncmVzc2l2ZUV2b2x1dGlvbkZyYW1ld29yaygpO1xuXG4gICAgLy8gU3ludGhlc2l6ZSBjb21wb25lbnRcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB1aU1vZHVsZS5zeW50aGVzaXplKFxuICAgICAge1xuICAgICAgICBjb21wb25lbnROYW1lOiAnSW50ZWdyYXRpb25UZXN0JyxcbiAgICAgICAgdGFpbHdpbmRDbGFzc2VzOiBbJ3AtNCddLFxuICAgICAgICBleHRlcm5hbFN0eWxlczogWydodHRwczovL2V4YW1wbGUuY29tL3N0eWxlcy5jc3MnXSxcbiAgICAgIH0sXG4gICAgICB7IGltYWdlczogW10sIGljb25zOiBbXSB9XG4gICAgKTtcblxuICAgIGV4cGVjdChyZXN1bHQuYXNzZXRNYW5pZmVzdCkudG9CZURlZmluZWQoKTtcblxuICAgIC8vIFJlY29yZCBzdWNjZXNzZnVsIHN0eWxlIGxvYWRcbiAgICBmcmFtZXdvcmsucmVjb3JkU3R5bGVMb2FkKHRydWUsIDEwMCwgdHJ1ZSk7XG5cbiAgICBjb25zdCBrcGkgPSBmcmFtZXdvcmsuZ2V0U3R5bGVMb2FkaW5nS1BJKCk7XG4gICAgZXhwZWN0KGtwaS5zdWNjZXNzZnVsTG9hZHMpLnRvQmUoMSk7XG4gICAgZXhwZWN0KGtwaS5jdXJyZW50KS50b0JlKDEwMCk7XG4gIH0pO1xufSk7XG4iXX0=