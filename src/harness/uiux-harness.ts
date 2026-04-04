/**
 * ANFSF V1.5.0 - UI/UX Harness (独立版)
 * 
 * Responsible for GenUI, Style Validation, and Personalization Budget.
 * Separated from Experience Harness.
 */

export interface UIUXConfig {
  enableGenUI: boolean;
  enableStyleValidation: boolean;
  enablePersonalizationBudget: boolean;
  styleLoadingTimeout: number;
  criticalCSSInline: boolean;
  styleCacheSize: number;
}

const DEFAULT_CONFIG: UIUXConfig = {
  enableGenUI: true,
  enableStyleValidation: true,
  enablePersonalizationBudget: true,
  styleLoadingTimeout: 5000,
  criticalCSSInline: true,
  styleCacheSize: 100,
};

interface ComponentTree {
  components?: any[];
  layout?: any;
  designTokens?: any;
  styles?: { external?: string[] };
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

interface PersonalizationBudgetConfig {
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

export interface UIComponentResult {
  componentTree: ComponentTree | null;
  styleReport: StyleReport | null;
  personalizationBudget: number;
  errors: string[];
}

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
      return { componentTree: null, styleReport: null, personalizationBudget: 0, errors: ['GenUI disabled'] };
    }

    const errors: string[] = [];
    const componentTree: ComponentTree = {
      components: prd.features?.map((f: any) => ({ name: f.name, type: f.type })) || [],
      layout: { type: 'responsive' },
      designTokens: { primary: '#007bff' },
      styles: { external: ['https://example.com/styles.css'] },
    };

    let styleReport: StyleReport | null = null;
    if (this.config.enableStyleValidation) {
      styleReport = await this.validateStyleLoading(componentTree);
      if (!styleReport.passed) errors.push(...styleReport.recommendations);
    }

    const personalizationBudget = this.calculatePersonalizationBudget(prd);

    return { componentTree, styleReport, personalizationBudget, errors };
  }

  /**
   * Validate style loading.
   */
  private async validateStyleLoading(componentTree: ComponentTree): Promise<StyleReport> {
    const cacheKey = JSON.stringify(componentTree);
    if (this.styleCache.has(cacheKey)) return this.styleCache.get(cacheKey)!;

    const report: StyleReport = {
      passed: true,
      criticalCSSInlined: this.config.criticalCSSInline,
      externalStylesLoaded: 0,
      externalStylesTotal: 0,
      foucDetected: false,
      recommendations: [],
      timestamp: Date.now(),
    };

    const styleUrls = this.extractStyleUrls(componentTree);
    report.externalStylesTotal = styleUrls.length;

    for (const url of styleUrls) {
      const loaded = await this.loadStyle(url);
      if (loaded) report.externalStylesLoaded++;
      else {
        report.passed = false;
        report.recommendations.push(`Failed to load style: ${url}`);
      }
    }

    if (this.config.criticalCSSInline && !report.criticalCSSInlined) {
      report.passed = false;
      report.recommendations.push('Critical CSS not inlined - may cause FOUC');
    }

    // Enforce cache size limit
    if (this.styleCache.size >= this.config.styleCacheSize) {
      const firstKey = this.styleCache.keys().next().value;
      if (firstKey) this.styleCache.delete(firstKey);
    }
    this.styleCache.set(cacheKey, report);

    return report;
  }

  /**
   * Calculate personalization budget.
   */
  private calculatePersonalizationBudget(prd: any): number {
    if (!this.config.enablePersonalizationBudget) return 0;

    const { baseBudget, userSegmentMultiplier, deviceTypeMultiplier, maxBudget } = this.budgetConfig;
    const segmentMultiplier = prd.userSegment === 'premium' ? userSegmentMultiplier : 1.0;
    const deviceMultiplier = prd.deviceType === 'mobile' ? deviceTypeMultiplier : 1.0;
    const budget = baseBudget * segmentMultiplier * deviceMultiplier;

    return Math.min(budget, maxBudget);
  }

  /**
   * Extract style URLs from component tree.
   */
  private extractStyleUrls(componentTree: ComponentTree): string[] {
    const urls: string[] = [];
    if (componentTree.styles?.external) urls.push(...componentTree.styles.external);
    if (componentTree.components) {
      for (const component of componentTree.components) {
        if (component.styleUrl) urls.push(component.styleUrl);
      }
    }
    return urls;
  }

  /**
   * Load style from URL (simulated).
   */
  private async loadStyle(url: string): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 100));
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
    personalizationBudgetEnabled: boolean;
  } {
    return {
      styleCacheSize: this.styleCache.size,
      genUIEnabled: this.config.enableGenUI,
      styleValidationEnabled: this.config.enableStyleValidation,
      personalizationBudgetEnabled: this.config.enablePersonalizationBudget,
    };
  }

  /**
   * Cleanup resources.
   */
  dispose(): void {
    this.styleCache.clear();
  }
}

export function createUIUXHarness(config?: Partial<UIUXConfig>): UIUXHarness {
  return new UIUXHarness(config);
}
