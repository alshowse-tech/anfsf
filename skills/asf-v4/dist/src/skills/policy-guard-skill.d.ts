/**
 * ANFSF V1.5.0 - Policy Guard Skill
 *
 * Policy enforcement guard for ownership, security, and compliance.
 * Integrated into Governance Harness.
 * Target latency: <10ms
 */
import { Skill, SkillResult } from './base';
export interface PolicyCheckResult extends SkillResult {
    passed: boolean;
    score: number;
    violations: PolicyViolation[];
}
export interface PolicyViolation {
    type: 'security' | 'compliance' | 'ownership';
    severity: 'critical' | 'major' | 'minor';
    message: string;
    code?: string;
}
export interface OwnershipCheckResult {
    passed: boolean;
    owner?: string;
    conflicts: string[];
}
export declare class PolicyGuardSkill extends Skill {
    name: string;
    version: string;
    description: string;
    /**
     * Execute policy guard checks.
     * Target: <10ms
     */
    execute(ctx: any): Promise<PolicyCheckResult>;
    /**
     * Check security patterns.
     */
    private checkSecurityPatterns;
    /**
     * Check compliance patterns.
     */
    private checkCompliancePatterns;
    /**
     * Check ownership metadata.
     */
    private checkOwnership;
    /**
     * Get skill metadata.
     */
    getMetadata(): Record<string, any>;
}
/**
 * Create PolicyGuardSkill instance.
 */
export declare function createPolicyGuardSkill(): PolicyGuardSkill;
