/**
 * ANFSF V1.5.0 - Experience Harness
 * 
 * Merged from UI/UX Harness + Evolution Harness.
 * Responsible for GenUI, Style Validation, Personalization Budget, KPI Optimization, and Data Flywheel.
 */

export interface ProjectData {
  projectId: string;
  tokenBudget: number;
  featureCount: number;
  complexity: number;
  economicsScore: number;
  reworkRate: number;
  successRate: number;
  timestamp: number;
}

// UI/UX Types
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

interface UIUXConfig {
  enableGenUI: boolean;
  enableStyleValidation: boolean;
  enablePersonalizationBudget: boolean;
  styleLoadingTimeout: number;
  criticalCSSInline: boolean;
}

// Evolution Types
interface AgentKPI {
  name: string;
  value: number;
  target: number;
}

interface EvolutionConfig {
  enableKPIOptimizer: boolean;
  enableDataFlywheel: boolean;
  enableProgressiveEvolution: boolean;
  kpiUpdateInterval: number;
  calibrationThreshold: number;
}

// Merged Config
export interface ExperienceConfig extends UIUXConfig, EvolutionConfig {
  styleCacheSize: number;
}

const DEFAULT_CONFIG: ExperienceConfig = {
  // UI/UX
  enableGenUI: true,
  enableStyleValidation: true,
  enablePersonalizationBudget: true,
  styleLoadingTimeout: 5000,
  criticalCSSInline: true,
  // Evolution
  enableKPIOptimizer: true,
  enableDataFlywheel: true,
  enableProgressiveEvolution: true,
  kpiUpdateInterval: 300000,
  calibrationThreshold: 10,
  // Shared
  styleCacheSize: 100,
};

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

interface KPIOptimizationResult {
  success: boolean;
  optimizedKPIs: AgentKPI[];
  improvements: string[];
  errors: string[];
}

interface DataFlywheelResult {
  dataPoints: number;
  modelUpdates: number;
  feedbackLoops: number;
  timestamp: number;
}

/**
 * Experience Harness - merged UI/UX + Evolution functionality.
 */
export class ExperienceHarness {
  private config: ExperienceConfig;
  private budgetConfig: PersonalizationBudgetConfig;
  private styleCache: Map<string, StyleReport>;
  private projectData: ProjectData[];
  private kpiHistory: Map<string, AgentKPI[]>;

  constructor(config: Partial<ExperienceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.budgetConfig = DEFAULT_BUDGET_CONFIG;
    this.styleCache = new Map();
    this.projectData = [];
    this.kpiHistory = new Map();
  }

  // ========== UI/UX Methods ==========

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

  private calculatePersonalizationBudget(prd: any): number {
    if (!this.config.enablePersonalizationBudget) return 0;

    const { baseBudget, userSegmentMultiplier, deviceTypeMultiplier, maxBudget } = this.budgetConfig;
    const segmentMultiplier = prd.userSegment === 'premium' ? userSegmentMultiplier : 1.0;
    const deviceMultiplier = prd.deviceType === 'mobile' ? deviceTypeMultiplier : 1.0;
    const budget = baseBudget * segmentMultiplier * deviceMultiplier;

    return Math.min(budget, maxBudget);
  }

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

  private async loadStyle(url: string): Promise<boolean> {
    return new Promise((resolve) => setTimeout(() => resolve(true), 100));
  }

  // ========== Evolution Methods ==========

  async optimizeKPIs(agentId: string, currentKPIs: AgentKPI[]): Promise<KPIOptimizationResult> {
    if (!this.config.enableKPIOptimizer) {
      return { success: false, optimizedKPIs: currentKPIs, improvements: [], errors: ['KPI Optimizer disabled'] };
    }

    const errors: string[] = [];
    const improvements: string[] = [];
    const history = this.kpiHistory.get(agentId) || [];
    const trends = this.calculateKPITrends(history, currentKPIs);

    const optimizedKPIs = currentKPIs.map((kpi, index) => {
      const trend = trends[index] || 0;
      if (trend > 0.1) {
        improvements.push(`KPI ${kpi.name} trending up (+${(trend * 100).toFixed(1)}%)`);
        return { ...kpi, target: kpi.target * 1.1 };
      } else if (trend < -0.1) {
        improvements.push(`KPI ${kpi.name} trending down (${(trend * 100).toFixed(1)}%)`);
        return { ...kpi, target: kpi.target * 0.9 };
      }
      return kpi;
    });

    if (!this.kpiHistory.has(agentId)) this.kpiHistory.set(agentId, []);
    this.kpiHistory.get(agentId)!.push(...currentKPIs);

    return { success: true, optimizedKPIs, improvements, errors };
  }

  async runDataFlywheel(): Promise<DataFlywheelResult> {
    if (!this.config.enableDataFlywheel) {
      return { dataPoints: 0, modelUpdates: 0, feedbackLoops: 0, timestamp: Date.now() };
    }

    let dataPoints = this.projectData.length;
    let modelUpdates = 0;
    let feedbackLoops = 0;

    if (dataPoints > 0) {
      modelUpdates = await this.updateModels();
      feedbackLoops = await this.runFeedbackLoops();
    }

    return { dataPoints, modelUpdates, feedbackLoops, timestamp: Date.now() };
  }

  collectProjectData(data: ProjectData): void {
    this.projectData.push(data);
    if (this.projectData.length >= this.config.calibrationThreshold && this.shouldRecalibrate()) {
      this.calibrateEconomicsWeights();
    }
  }

  // ========== Shared Methods ==========

  private calculateKPITrends(history: AgentKPI[], current: AgentKPI[]): number[] {
    if (history.length === 0) return current.map(() => 0);
    const trends: number[] = [];
    const avgHistory = this.averageKPIs(history);
    for (let i = 0; i < current.length; i++) {
      const currentValue = current[i].value;
      const avgValue = avgHistory[i]?.value || 0;
      trends.push(avgValue === 0 ? 0 : (currentValue - avgValue) / avgValue);
    }
    return trends;
  }

  private averageKPIs(kpis: AgentKPI[]): AgentKPI[] {
    if (kpis.length === 0) return [];
    const sum = kpis.reduce((acc, kpi) => acc.map((val, idx) => val + (kpis[0].name === kpi.name ? kpi.value : 0)), new Array(kpis.length).fill(0));
    return kpis.map((kpi, idx) => ({ ...kpi, value: sum[idx] / kpis.length }));
  }

  private shouldRecalibrate(): boolean {
    const hoursSinceLastCalibration = (Date.now() - 0) / (1000 * 60 * 60);
    return hoursSinceLastCalibration >= 24;
  }

  private calibrateEconomicsWeights(): void {
    // Placeholder for calibration logic
  }

  private async updateModels(): Promise<number> { return 1; }
  private async runFeedbackLoops(): Promise<number> { return this.projectData.length; }

  // ========== Utility Methods ==========

  clearStyleCache(): void { this.styleCache.clear(); }

  getMetrics(): {
    styleCacheSize: number;
    genUIEnabled: boolean;
    styleValidationEnabled: boolean;
    kpiOptimizerEnabled: boolean;
    dataFlywheelEnabled: boolean;
    projectDataCount: number;
  } {
    return {
      styleCacheSize: this.styleCache.size,
      genUIEnabled: this.config.enableGenUI,
      styleValidationEnabled: this.config.enableStyleValidation,
      kpiOptimizerEnabled: this.config.enableKPIOptimizer,
      dataFlywheelEnabled: this.config.enableDataFlywheel,
      projectDataCount: this.projectData.length,
    };
  }

  dispose(): void {
    this.styleCache.clear();
    this.projectData = [];
    this.kpiHistory.clear();
  }
}

export function getDefaultExperienceHarness(): ExperienceHarness {
  return new ExperienceHarness();
}
