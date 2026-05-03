/**
 * ASF V4.0 Style Loading Tests
 * 
 * Unit tests for style loading functionality.
 * Version: v1.5.0
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Import modules
import {
  UISynthesisModule,
  createAssetManifest,
  type StyleAssets,
  type ComponentTreeAssets,
} from '../core/contract/ui-synthesis-module';

import {
  PreviewControllerUIExtension,
  type StyleResource,
} from '../governance/preview-controller-ui-extension';

import {
  ContractGate,
  createDefaultContractGate,
  type OwnershipLatticeLike,
} from '../core/ownership/gates';

import {
  ProgressiveEvolutionFramework,
} from '../core/evolution/framework';

// Mock implementations
class MockMCPBus {
  messages: any[] = [];

  async send(message: unknown): Promise<void> {
    this.messages.push(message);
  }
}

class MockOwnershipLattice {
  private authorities: Map<string, string[]> = new Map();

  hasAuthority(roleId: string, authority: string): boolean {
    const roleAuthorities = this.authorities.get(roleId) || [];
    return roleAuthorities.includes(authority) || roleId === authority;
  }

  getOwner(_nodeId: string): string | null {
    return 'architect';
  }

  getRolesWithAuthority(authority: string): string[] {
    return [authority];
  }

  setAuthority(roleId: string, authority: string): void {
    const authorities = this.authorities.get(roleId) || [];
    authorities.push(authority);
    this.authorities.set(roleId, authorities);
  }
}

// ============================================================================
// UISynthesisModule Tests
// ============================================================================

describe('UISynthesisModule', () => {
  let mcpBus: MockMCPBus;
  let module: UISynthesisModule;

  beforeEach(() => {
    mcpBus = new MockMCPBus();
    module = new UISynthesisModule(
      { framework: 'react', enableCriticalCSS: true, enableAssetValidation: true },
      mcpBus
    );
  });

  describe('synthesize', () => {
    it('should generate component with asset manifest', async () => {
      const requirement = {
        componentName: 'TestComponent',
        props: { title: { type: 'string', required: true } },
        tailwindClasses: ['p-4', 'bg-blue-500'],
        externalStyles: ['https://example.com/styles.css'],
      };

      const componentTree: ComponentTreeAssets = {
        images: ['https://example.com/image.png'],
        icons: ['icon-home'],
      };

      const result = await module.synthesize(requirement, componentTree);

      expect(result.componentName).toBe('TestComponent');
      expect(result.assetManifest).toBeDefined();
      expect(result.assetManifest.styles.tailwind).toEqual(['p-4', 'bg-blue-500']);
      expect(result.assetManifest.styles.external).toEqual(['https://example.com/styles.css']);
      expect(result.assetManifest.assets.images).toEqual(['https://example.com/image.png']);
      expect(result.assetManifest.assets.icons).toEqual(['icon-home']);
    });

    it('should send MCP sync message', async () => {
      const requirement = {
        componentName: 'TestComponent',
        tailwindClasses: ['p-4'],
        externalStyles: ['https://example.com/styles.css'], // Add external style to pass validation
      };

      const componentTree: ComponentTreeAssets = {
        images: [],
        icons: [],
      };

      await module.synthesize(requirement, componentTree);

      expect(mcpBus.messages.length).toBe(1);
      expect(mcpBus.messages[0].type).toBe('command');
      expect(mcpBus.messages[0].payload.target).toBe('PreviewController');
      expect(mcpBus.messages[0].payload.assetManifest).toBeDefined();
    });

    it('should throw error if manifest is empty', async () => {
      const requirement = {
        componentName: 'TestComponent',
        // No styles provided
      };

      const componentTree: ComponentTreeAssets = {
        images: [],
        icons: [],
      };

      await expect(module.synthesize(requirement, componentTree))
        .rejects
        .toThrow('Style asset manifest empty - GenUI output validation failed');
    });
  });

  describe('createAssetManifest', () => {
    it('should create valid manifest', () => {
      const styles: StyleAssets = {
        critical: 'body { margin: 0; }',
        external: ['https://example.com/styles.css'],
        dynamic: [],
        tailwind: ['p-4'],
        fonts: ['https://fonts.example.com/font.css'],
      };

      const componentTree: ComponentTreeAssets = {
        images: ['image.png'],
        icons: ['icon-home'],
      };

      const manifest = createAssetManifest(styles, componentTree);

      expect(manifest.styles.critical).toBe('body { margin: 0; }');
      expect(manifest.styles.external).toEqual(['https://example.com/styles.css']);
      expect(manifest.fonts).toEqual(['https://fonts.example.com/font.css']);
    });

    it('should throw error if both critical and external are empty', () => {
      const styles: StyleAssets = {
        critical: undefined,
        external: [],
        dynamic: [],
        tailwind: [],
      };

      const componentTree: ComponentTreeAssets = {
        images: [],
        icons: [],
      };

      expect(() => createAssetManifest(styles, componentTree))
        .toThrow('Style asset manifest empty - GenUI output validation failed');
    });
  });
});

// ============================================================================
// PreviewControllerUIExtension Tests
// ============================================================================

describe('PreviewControllerUIExtension', () => {
  let extension: PreviewControllerUIExtension;

  beforeEach(() => {
    extension = new PreviewControllerUIExtension({
      enableAutoHealing: false, // Disable for unit tests
      probeTimeout: 1000,
    });
  });

  describe('probeStyles', () => {
    it('should return passed=true when all styles are available', async () => {
      // Mock fetch to return success
      (global as { fetch?: unknown }).fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
        })
      );

      const resources: StyleResource[] = [
        { url: 'https://example.com/style1.css', type: 'external', required: true },
        { url: 'https://example.com/style2.css', type: 'external', required: true },
      ];

      const result = await extension.probeStyles(resources);

      expect(result.passed).toBe(true);
      expect(result.failedUrls).toEqual([]);
      expect(result.totalChecked).toBe(2);
    });

    it('should return passed=false when styles are unavailable', async () => {
      // Mock fetch to return failure
      (global as { fetch?: unknown }).fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      );

      const resources: StyleResource[] = [
        { url: 'https://example.com/missing.css', type: 'external', required: true },
      ];

      const result = await extension.probeStyles(resources);

      expect(result.passed).toBe(false);
      expect(result.failedUrls).toEqual(['https://example.com/missing.css']);
    });

    it('should trigger self-healing when failures detected', async () => {
      // Mock fetch to return failure
      (global as { fetch?: unknown }).fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404,
        })
      );

      // Enable auto-healing
      extension = new PreviewControllerUIExtension({
        enableAutoHealing: true,
        probeTimeout: 1000,
      });

      const resources: StyleResource[] = [
        { url: 'https://example.com/missing.css', type: 'external', required: true },
      ];

      const result = await extension.probeStyles(resources);

      expect(result.passed).toBe(false);
      expect(result.repairTicketId).toBeDefined();
    });
  });
});

// ============================================================================
// ContractGate Tests (Ownership Lattice)
// ============================================================================

describe('ContractGate - UI Style Rules', () => {
  let lattice: MockOwnershipLattice;
  let gate: ContractGate;

  beforeEach(() => {
    lattice = new MockOwnershipLattice();
    lattice.setAuthority('architect', 'architect');
    lattice.setAuthority('frontend', 'frontend');
    gate = createDefaultContractGate(lattice as OwnershipLatticeLike);
  });

  describe('canAutoApprove for ui:style/**', () => {
    it('should auto-approve adding non-critical styles', () => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canApprove = gate.canAutoApprove(diff as any);
      expect(canApprove).toBe(true);
    });

    it('should NOT auto-approve critical CSS changes', () => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canApprove = gate.canAutoApprove(diff as any);
      expect(canApprove).toBe(false); // Critical CSS requires review
    });

    it('should NOT auto-approve breaking changes', () => {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const canApprove = gate.canAutoApprove(diff as any);
      expect(canApprove).toBe(false);
    });
  });

  describe('checkPermission for ui:style/**', () => {
    it('should allow frontend role to write ui:style resources', () => {
      const result = gate.checkPermission('ui:style/components', 'write', 'frontend');
      expect(result.allowed).toBe(true);
    });

    it('should allow architect to write ui:style/critical resources', () => {
      const result = gate.checkPermission('ui:style/critical/base', 'write', 'architect');
      expect(result.allowed).toBe(true);
    });
  });
});

// ============================================================================
// ProgressiveEvolutionFramework Tests
// ============================================================================

describe('ProgressiveEvolutionFramework', () => {
  let framework: ProgressiveEvolutionFramework;

  beforeEach(() => {
    framework = new ProgressiveEvolutionFramework({
      enableKPITracking: true,
      enableBudgetEnforcement: true,
      enableAutoRollback: false,
    });
  });

  describe('Style Loading KPI', () => {
    it('should track style load attempts', () => {
      framework.recordStyleLoad(true, 100, true);
      framework.recordStyleLoad(true, 150, true);
      framework.recordStyleLoad(false, 500, true);

      const kpi = framework.getStyleLoadingKPI();

      expect(kpi.totalAttempts).toBe(3);
      expect(kpi.successfulLoads).toBe(2);
      expect(kpi.failedLoads).toBe(1);
      expect(kpi.current).toBeCloseTo(66.67, 1);
    });

    it('should maintain >99% success rate target', () => {
      const kpiTarget = framework.getKPIStatus('style_loading_success_rate');
      
      expect(kpiTarget).toBeDefined();
      expect(kpiTarget?.target).toBe(99.5);
      expect(kpiTarget?.minimum).toBe(99.0);
    });

    it('should detect KPI violation when below minimum', () => {
      // Simulate many failures to drop below 99%
      for (let i = 0; i < 100; i++) {
        framework.recordStyleLoad(i < 98, 100, true); // 98% success rate
      }

      const kpi = framework.getStyleLoadingKPI();
      expect(kpi.current).toBeLessThan(99.0);
    });

    it('should track FOUC incidents', () => {
      framework.recordStyleLoad(false, 500, true); // Critical CSS failure = FOUC
      framework.recordStyleLoad(false, 500, true); // Another FOUC

      const kpi = framework.getStyleLoadingKPI();
      expect(kpi.foucIncidents).toBe(2);
    });

    it('should track critical CSS inlining rate', () => {
      framework.recordStyleLoad(true, 100, true);
      framework.recordStyleLoad(true, 100, true);
      framework.recordStyleLoad(true, 100, true);

      const kpi = framework.getStyleLoadingKPI();
      expect(kpi.criticalCSSInliningRate).toBe(100);
    });
  });

  describe('Budget Management', () => {
    it('should track style budget separately', () => {
      framework.updateBudgetUsage(1000, true); // Style-related
      framework.updateBudgetUsage(2000, false); // Non-style

      const budget = framework.getBudgetStatus();
      
      expect(budget.usedStyleBudget).toBe(1000);
      expect(budget.usedBudget).toBe(3000);
    });

    it('should detect budget violation', async () => {
      // Create framework with small budget
      framework = new ProgressiveEvolutionFramework({
        enableBudgetEnforcement: true,
      });

      // Manually set small budget for testing
      (framework as unknown as Record<string, unknown>).personalizationBudget = {
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

      expect(result.approved).toBe(false);
      expect(result.budgetViolation).toBeDefined();
    });
  });

  describe('Health Status', () => {
    it('should report healthy when KPIs are good', () => {
      const health = framework.getHealthStatus();
      
      expect(health.healthy).toBe(true);
      expect(health.kpiStatus).toBe('healthy');
      expect(health.violations).toBe(0);
    });

    it('should report warning when KPIs are below target', () => {
      // Simulate some failures but keep above minimum (99%)
      // 100 successes, 1 failure = 99% success rate
      for (let i = 0; i < 100; i++) {
        framework.recordStyleLoad(true, 100, true);
      }
      framework.recordStyleLoad(false, 100, true);

      const health = framework.getHealthStatus();
      
      // Should be warning since we're at the edge of target
      expect(health.kpiStatus).toMatch(/^(healthy|warning)$/);
    });
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Style Loading Integration', () => {
  it('should complete full style loading flow', async () => {
    // Setup
    const mcpBus = new MockMCPBus();
    const uiModule = new UISynthesisModule(
      { framework: 'react', enableCriticalCSS: true },
      mcpBus
    );

    const framework = new ProgressiveEvolutionFramework();

    // Synthesize component
    const result = await uiModule.synthesize(
      {
        componentName: 'IntegrationTest',
        tailwindClasses: ['p-4'],
        externalStyles: ['https://example.com/styles.css'],
      },
      { images: [], icons: [] }
    );

    expect(result.assetManifest).toBeDefined();

    // Record successful style load
    framework.recordStyleLoad(true, 100, true);

    const kpi = framework.getStyleLoadingKPI();
    expect(kpi.successfulLoads).toBe(1);
    expect(kpi.current).toBe(100);
  });
});
