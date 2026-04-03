/**
 * L14 Simulation Layer - Auto Decision Engine
 * 
 * Automatically decides simulation level based on project risk profile.
 */

export interface ProjectRiskProfile {
  domainRisk: number;      // 业务域风险 (0-1): 金融/医疗=高，工具/娱乐=低
  scaleRisk: number;       // 规模风险 (0-1): 用户规模预期
  dataRisk: number;        // 数据敏感性 (0-1): PII/金融数据=高
  complianceRisk: number;  // 合规要求 (0-1): 证券/医疗法规=高
}

export interface SimulationLevel {
  level: 0 | 1 | 2 | 3;
  description: string;
  enabledModules: string[];
}

export class AutoDecisionEngine {
  /**
   * Compute risk score from profile
   */
  computeRiskScore(profile: ProjectRiskProfile): number {
    return (
      profile.domainRisk * 0.35 +
      profile.scaleRisk * 0.25 +
      profile.dataRisk * 0.25 +
      profile.complianceRisk * 0.15
    );
  }

  /**
   * Decide simulation level based on risk score
   */
  decideSimulationLevel(riskScore: number): SimulationLevel {
    if (riskScore < 0.3) {
      return {
        level: 0,
        description: '跳过模拟',
        enabledModules: [],
      };
    } else if (riskScore < 0.6) {
      return {
        level: 1,
        description: '轻量模拟',
        enabledModules: ['user-behavior'],
      };
    } else if (riskScore < 0.8) {
      return {
        level: 2,
        description: '完整模拟',
        enabledModules: ['user-behavior', 'load'],
      };
    } else {
      return {
        level: 3,
        description: '强化模拟',
        enabledModules: ['user-behavior', 'load', 'exception', 'boundary'],
      };
    }
  }

  /**
   * Extract risk profile from PRD
   */
  extractRiskProfile(prd: any): ProjectRiskProfile {
    // Domain risk
    const domain = prd.domain?.toLowerCase() || '';
    const domainRisk = 
      domain.includes('金融') || domain.includes('证券') || domain.includes('医疗') ? 0.9 :
      domain.includes('电商') || domain.includes('教育') ? 0.5 :
      0.2;

    // Scale risk (based on expected users)
    const expectedUsers = prd.expectedUsers || 0;
    const scaleRisk = 
      expectedUsers > 1000000 ? 0.9 :
      expectedUsers > 100000 ? 0.6 :
      expectedUsers > 10000 ? 0.3 :
      0.1;

    // Data risk
    const handlesPII = prd.handlesPII || false;
    const handlesFinancial = prd.handlesFinancial || false;
    const dataRisk = 
      handlesFinancial ? 0.9 :
      handlesPII ? 0.7 :
      0.2;

    // Compliance risk
    const compliance = prd.compliance || [];
    const complianceRisk = 
      compliance.some((c: string) => /证券|金融|医疗|HIPAA|GDPR/.test(c)) ? 0.9 :
      compliance.length > 0 ? 0.5 :
      0.1;

    return {
      domainRisk,
      scaleRisk,
      dataRisk,
      complianceRisk,
    };
  }

  /**
   * Main entry: decide simulation level from PRD
   */
  decide(prd: any): SimulationLevel {
    const profile = this.extractRiskProfile(prd);
    const riskScore = this.computeRiskScore(profile);
    return this.decideSimulationLevel(riskScore);
  }
}
