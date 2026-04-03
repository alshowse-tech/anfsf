/**
 * Architecture Auto Scaling Engine
 * 
 * Automatically decides architecture mode (light/full) based on project complexity.
 */

export interface ArchitectureMode {
  mode: 'light' | 'full';
  enabledLayers: number[];
  description: string;
}

export class ArchitectureAutoScaler {
  /**
   * Compute project complexity from PRD
   */
  computeComplexity(prd: any): number {
    const featureCount = (prd.features?.length || 0) / 50;
    const userFlowCount = (prd.userFlows?.length || 0) / 20;
    const dataEntityCount = (prd.dataEntities?.length || 0) / 30;
    const integrationCount = (prd.integrations?.length || 0) / 10;
    const complianceCount = (prd.compliance?.length || 0) / 5;

    return (
      Math.min(featureCount, 1) * 0.25 +
      Math.min(userFlowCount, 1) * 0.20 +
      Math.min(dataEntityCount, 1) * 0.20 +
      Math.min(integrationCount, 1) * 0.20 +
      Math.min(complianceCount, 1) * 0.15
    );
  }

  /**
   * Decide architecture mode based on complexity and budget
   */
  decideMode(prd: any, budget?: number): ArchitectureMode {
    const complexity = this.computeComplexity(prd);
    const budgetFactor = budget ? (budget < 50000 ? 0.5 : 1) : 1;
    const adjustedComplexity = complexity * budgetFactor;

    if (adjustedComplexity < 0.4) {
      return {
        mode: 'light',
        enabledLayers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        description: '轻量模式 (L1-L12)',
      };
    } else {
      return {
        mode: 'full',
        enabledLayers: [1, 2, 3, 4, 5, 6, 7, 8, 8.5, 9, 10, 11, 12, 13, 14, 15, 16, 17],
        description: '完整模式 (L1-L17)',
      };
    }
  }
}
