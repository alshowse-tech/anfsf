/**
 * L14 Simulation Layer - Auto Decision Engine
 *
 * Automatically decides simulation level based on project risk profile.
 */
export interface ProjectRiskProfile {
    domainRisk: number;
    scaleRisk: number;
    dataRisk: number;
    complianceRisk: number;
}
export interface SimulationLevel {
    level: 0 | 1 | 2 | 3;
    description: string;
    enabledModules: string[];
}
export declare class AutoDecisionEngine {
    /**
     * Compute risk score from profile
     */
    computeRiskScore(profile: ProjectRiskProfile): number;
    /**
     * Decide simulation level based on risk score
     */
    decideSimulationLevel(riskScore: number): SimulationLevel;
    /**
     * Extract risk profile from PRD
     */
    extractRiskProfile(prd: any): ProjectRiskProfile;
    /**
     * Main entry: decide simulation level from PRD
     */
    decide(prd: any): SimulationLevel;
}
