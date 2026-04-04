/**
 * ANFSF V1.5.0 - UI/UX Harness
 * 
 * Responsible for GenUI, Style Loading, and Personalization Budget.
 * Phase 2 of Layer 8.5 decomposition.
 */

// Simple type definitions to avoid circular dependencies
interface ComponentTree {
  components?: any[];
  layout?: any;
  designTokens?: any;
  styles?: {
    external?: string[];
  };
}

interface StyleReport {
  passed: boolean;
  criticalCSSInlined: boolean;
  externalStylesLoaded: number;
  externalStylesTotal: number;
  foucDetected: boolean;
  recommendations: string[];
  timestamp: number;
}

export interface UIUXConfig {
  enableGenUI: boolean;
  enableStyleValidation: boolean;
  enablePersonalizationBudget: boolean;
  styleLoadingTimeout: number;
  criticalCSSInline: boolean;
}

const DEFAULT_CONFIG: UIUXConfig = {
  enableGenUI: true,
  enableStyleValidation: true,
  enablePersonalizationBudget: true,
  styleLoadingTimeout: 5000,
  criticalCSSInline: true,
};

export interface UIComponentResult {
  componentTree: ComponentTree | null;
  styleReport: StyleReport | null;
  personalizationBudget: number;
  errors: string[];
}

export interface PersonalizationBudgetConfig {
  baseBudget: number;
  userSegmentMultiplier: number;
  deviceTypeMultiplier: number;
  maxBudget: number;
}

const DEFAULT_BUDGET_CONFIG: PersonalizationBudgetConfig = {
  baseBudget: 100,
  userSegmentMultiplier: 1.5,
  deviceTypeMultiplier: 1.2,
  maxBudget: 500,
};

/**
 * UI/UX Harness - manages UI synthesis, style validation, and personalization.
 */
export class UIUXHarness {
  private config: UIUXConfig;
  private budgetConfig: PersonalizationBudgetConfig;
  private styleCache: Map<string, StyleReport>;

  constructor(config: Partial<UIUXConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.budgetConfig = DEFAULT_BUDGET_CONFIG;
    this.styleCache = new Map();
  }

  /**
   * Synthesize UI components from PRD.
   */
  async synthesizeUI(prd: any): Promise<UIComponentResult> {
    if (!this.config.enableGenUI) {
      return {
        componentTree: null,
        styleReport: null,
        personalizationBudget: 0,
        errors: ['GenUI disabled'],
      };
    }

    const errors: string[] = [];

    // Create mock component tree (in production, use actual synthesis)
    const componentTree: ComponentTree = {
      components: prd.features?.map((f: any) => ({
        name: f.name,
        type: f.type,
      })) || [],
      layout: { type: 'responsive' },
      designTokens: { primary: '#007bff' },
      styles: {
        external: ['https://example.com/styles.css'],
      },
    };

    // Validate style loading
    let styleReport: StyleReport | null = null;
    if (this.config.enableStyleValidation) {
      styleReport = await this.validateStyleLoading(componentTree);
      if (!styleReport.passed) {
        errors.push(...styleReport.recommendations);
      }
    }

    // Calculate personalization budget
    const personalizationBudget = this.calculatePersonalizationBudget(prd);

    return {
      componentTree,
      styleReport,
      personalizationBudget,
      errors,
    };
    } catch (error) {
      errors.push(`UI synthesis failed: ${error}`);
      return {
        componentTree: null,
        styleReport: null,
        personalizationBudget: 0,
        errors,
      };
    }
  }

  /**
   * Validate style loading.
   */
  async validateStyleLoading(componentTree: ComponentTree): Promise<StyleReport> {
    const cacheKey = JSON.stringify(componentTree);
    
    // Check cache
    if (this.styleCache.has(cacheKey)) {
      return this.styleCache.get(cacheKey)!;
    }

    const report: StyleReport = {
      passed: true,
      criticalCSSInlined: this.config.criticalCSSInline,
      externalStylesLoaded: 0,
      externalStylesTotal: 0,
      foucDetected: false,
      recommendations: [],
      timestamp: Date.now(),
    };

    // Extract style URLs from component tree
    const styleUrls = this.extractStyleUrls(componentTree);
    report.externalStylesTotal = styleUrls.length;

    // Validate each style URL
    for (const url of styleUrls) {
      try {
        // Simulate style loading (in production, use actual fetch)
        const loaded = await this.loadStyle(url);
        if (loaded) {
          report.externalStylesLoaded++;
        } else {
          report.passed = false;
          report.recommendations.push(`Failed to load style: ${url}`);
        }
      } catch (error) {
        report.passed = false;
        report.recommendations.push(`Style loading error: ${url} - ${error}`);
      }
    }

    // Check critical CSS
    if (this.config.criticalCSSInline && !report.criticalCSSInlined) {
      report.passed = false;
      report.recommendations.push('Critical CSS not inlined - may cause FOUC');
    }

    // Cache result
    this.styleCache.set(cacheKey, report);

    return report;
  }

  /**
   * Calculate personalization budget.
   */
  calculatePersonalizationBudget(prd: any): number {
    if (!this.config.enablePersonalizationBudget) {
      return 0;
    }

    const { baseBudget, userSegmentMultiplier, deviceTypeMultiplier, maxBudget } = this.budgetConfig;

    // Determine user segment
    const userSegment = prd.userSegment || 'standard';
    const segmentMultiplier = userSegment === 'premium' ? userSegmentMultiplier : 1.0;

    // Determine device type
    const deviceType = prd.deviceType || 'desktop';
    const deviceMultiplier = deviceType === 'mobile' ? deviceTypeMultiplier : 1.0;

    // Calculate budget
    const budget = baseBudget * segmentMultiplier * deviceMultiplier;

    return Math.min(budget, maxBudget);
  }

  /**
   * Extract style URLs from component tree.
   */
  private extractStyleUrls(componentTree: ComponentTree): string[] {
    const urls: string[] = [];
    
    // Extract from external styles
    if (componentTree.styles?.external) {
      urls.push(...componentTree.styles.external);
    }

    // Extract from component styles
    if (componentTree.components) {
      for (const component of componentTree.components) {
        if (component.styleUrl) {
          urls.push(component.styleUrl);
        }
      }
    }

    return urls;
  }

  /**
   * Load style from URL (simulated).
   */
  private async loadStyle(url: string): Promise<boolean> {
    // In production, use actual fetch
    // For now, simulate successful loading
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 100);
    });
  }

  /**
   * Clear style cache.
   */
  clearStyleCache(): void {
    this.styleCache.clear();
  }

  /**
   * Get harness metrics.
   */
  getMetrics(): {
    styleCacheSize: number;
    genUIEnabled: boolean;
    styleValidationEnabled: boolean;
  } {
    return {
      styleCacheSize: this.styleCache.size,
      genUIEnabled: this.config.enableGenUI,
      styleValidationEnabled: this.config.enableStyleValidation,
    };
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.styleCache.clear();
  }
}

/**
 * Singleton harness instance.
 */
let defaultHarness: UIUXHarness | null = null;

export function getDefaultHarness(): UIUXHarness {
  if (!defaultHarness) {
    defaultHarness = new UIUXHarness();
  }
  return defaultHarness;
}

export function resetDefaultHarness(): void {
  defaultHarness = null;
}
