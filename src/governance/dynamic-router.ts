/**
 * ANFSF V1.5.0 - Dynamic Router for Layer 8.5 Harness Selection
 * 
 * Routes requests to appropriate Harness based on project complexity and token budget.
 * Enables on-demand activation of L13-L17 layers.
 */

export interface ProjectProfile {
  tokenBudget: number;
  featureCount: number;
  userFlowCount: number;
  dataEntityCount: number;
  integrationCount: number;
  complianceRequirements: string[];
}

export interface HarnessActivation {
  orchestration: boolean;
  governance: boolean;
  uiux: boolean;
  evolution: boolean;
  mode: 'light' | 'standard' | 'full';
  reason: string;
}

export interface RouterConfig {
  lightThreshold: number;      // Token budget threshold for light mode
  standardThreshold: number;   // Token budget threshold for standard mode
  requireComplianceCheck: boolean;
}

const DEFAULT_CONFIG: RouterConfig = {
  lightThreshold: 50000,
  standardThreshold: 200000,
  requireComplianceCheck: true,
};

/**
 * Dynamic Router - decides which Harnesses to activate based on project profile.
 */
export class DynamicRouter {
  private config: RouterConfig;

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate project complexity score (0-1).
   */
  calculateComplexity(profile: ProjectProfile): number {
    const featureScore = Math.min(profile.featureCount / 50, 1) * 0.25;
    const flowScore = Math.min(profile.userFlowCount / 20, 1) * 0.20;
    const entityScore = Math.min(profile.dataEntityCount / 30, 1) * 0.20;
    const integrationScore = Math.min(profile.integrationCount / 10, 1) * 0.20;
    const complianceScore = Math.min(profile.complianceRequirements.length / 5, 1) * 0.15;

    return featureScore + flowScore + entityScore + integrationScore + complianceScore;
  }

  /**
   * Determine activation mode based on token budget and complexity.
   */
  determineMode(profile: ProjectProfile): 'light' | 'standard' | 'full' {
    if (profile.tokenBudget < this.config.lightThreshold) {
      return 'light';
    } else if (profile.tokenBudget < this.config.standardThreshold) {
      return 'standard';
    } else {
      return 'full';
    }
  }

  /**
   * Decide which Harnesses to activate.
   */
  activate(profile: ProjectProfile): HarnessActivation {
    const mode = this.determineMode(profile);
    const complexity = this.calculateComplexity(profile);

    // Check compliance requirements
    const hasCompliance = profile.complianceRequirements.length > 0;
    const needsGovernance = hasCompliance || complexity > 0.6;

    // Base activation (always needed)
    const activation: HarnessActivation = {
      orchestration: true,
      governance: needsGovernance,
      uiux: mode !== 'light',
      evolution: mode === 'full',
      mode,
      reason: this.getActivationReason(mode, complexity, needsGovernance),
    };

    // Override for compliance
    if (this.config.requireComplianceCheck && hasCompliance) {
      activation.governance = true;
      activation.reason += ' (compliance required)';
    }

    return activation;
  }

  /**
   * Get human-readable activation reason.
   */
  private getActivationReason(
    mode: string,
    complexity: number,
    needsGovernance: boolean
  ): string {
    const reasons: string[] = [];

    if (mode === 'light') {
      reasons.push('Low token budget');
    } else if (mode === 'standard') {
      reasons.push('Medium token budget');
    } else {
      reasons.push('High token budget');
    }

    if (complexity > 0.6) {
      reasons.push(`High complexity (${(complexity * 100).toFixed(0)}%)`);
    }

    if (needsGovernance) {
      reasons.push('Governance required');
    }

    return reasons.join(', ');
  }

  /**
   * Get L13-L17 activation status.
   */
  getLayerActivation(profile: ProjectProfile): { layers: number[]; activated: boolean } {
    const activation = this.activate(profile);
    
    const layers: number[] = [];
    
    // L13-L17 activation rules
    if (activation.uiux) {
      layers.push(13); // Semantic Consistency
    }
    if (activation.uiux && activation.mode !== 'light') {
      layers.push(14); // Simulation
    }
    if (activation.mode === 'full') {
      layers.push(15, 16, 17); // Runtime + Evolution + Guard
    }

    return {
      layers,
      activated: layers.length > 0,
    };
  }
}

/**
 * Singleton router instance.
 */
let defaultRouter: DynamicRouter | null = null;

export function getDefaultRouter(): DynamicRouter {
  if (!defaultRouter) {
    defaultRouter = new DynamicRouter();
  }
  return defaultRouter;
}

export function resetDefaultRouter(): void {
  defaultRouter = null;
}
