/**
 * ANFSF V1.5.0 - Policy Guard Skill
 * 
 * Policy enforcement guard for ownership, security, and compliance.
 * Integrated into Governance Harness.
 * Target latency: <10ms
 */

import { Skill, SkillResult } from './base';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Constants
// ============================================================================

const SECURITY_PATTERNS = [
  { pattern: /eval\s*\(/i, severity: 'critical', message: 'eval() usage detected' },
  { pattern: /new\s+Function\s*\(/i, severity: 'critical', message: 'new Function() usage detected' },
  { pattern: /exec\s*\(/i, severity: 'major', message: 'exec() usage detected' },
  { pattern: /execSync\s*\(/i, severity: 'major', message: 'execSync() usage detected' },
  { pattern: /spawn\s*\(/i, severity: 'major', message: 'spawn() usage detected' },
];

const COMPLIANCE_PATTERNS = [
  { pattern: /password\s*=\s*['"][^'"]+['"]/i, severity: 'critical', message: 'Hardcoded password detected' },
  { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'critical', message: 'Hardcoded API key detected' },
  { pattern: /secret\s*=\s*['"][^'"]+['"]/i, severity: 'critical', message: 'Hardcoded secret detected' },
  { pattern: /token\s*=\s*['"][^'"]+['"]/i, severity: 'major', message: 'Hardcoded token detected' },
  { pattern: /private[_-]?key/i, severity: 'critical', message: 'Private key reference detected' },
];

const OWNERSHIP_PATTERNS = [
  { pattern: /\/\/\s*Owner:\s*(.+)/i, type: 'owner' },
  { pattern: /\/\/\s*Copyright/i, type: 'copyright' },
  { pattern: /\/\/\s*License:\s*(.+)/i, type: 'license' },
];

// ============================================================================
// PolicyGuardSkill
// ============================================================================

export class PolicyGuardSkill extends Skill {
  name = 'policy-guard';
  version = '1.0.0';
  description = '策略守卫 Skill - 所有权校验 + 安全策略 + 合规检查';

  /**
   * Execute policy guard checks.
   * Target: <10ms
   */
  async execute(ctx: any): Promise<PolicyCheckResult> {
    const generatedCode = typeof ctx === 'string' ? ctx : (ctx.code || ctx.generatedCode || '');
    const violations: PolicyViolation[] = [];
    let score = 1.0;

    try {
      // Check 1: Security patterns
      const securityViolations = this.checkSecurityPatterns(generatedCode);
      violations.push(...securityViolations);

      // Check 2: Compliance patterns
      const complianceViolations = this.checkCompliancePatterns(generatedCode);
      violations.push(...complianceViolations);

      // Check 3: Ownership check
      const ownershipCheck = this.checkOwnership(generatedCode);
      if (!ownershipCheck.passed) {
        for (const conflict of ownershipCheck.conflicts) {
          violations.push({
            type: 'ownership',
            severity: 'minor',
            message: conflict,
          });
        }
      }

      // Calculate score based on violations
      for (const violation of violations) {
        switch (violation.severity) {
          case 'critical':
            score -= 0.30;
            break;
          case 'major':
            score -= 0.15;
            break;
          case 'minor':
            score -= 0.05;
            break;
        }
      }

      // Ensure score is within bounds
      score = Math.max(0, Math.min(1, score));

      // Critical violations always fail
      const hasCriticalViolations = violations.some(v => v.severity === 'critical');

      return {
        passed: !hasCriticalViolations && score >= 0.70,
        score,
        violations,
      };
    } catch (error) {
      return {
        passed: false,
        score: 0,
        violations: [{
          type: 'security',
          severity: 'critical',
          message: `Policy check error: ${error}`,
        }],
      };
    }
  }

  /**
   * Check security patterns.
   */
  private checkSecurityPatterns(code: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const { pattern, severity, message } of SECURITY_PATTERNS) {
      if (pattern.test(code)) {
        violations.push({
          type: 'security',
          severity: severity as 'critical' | 'major' | 'minor',
          message,
          code: pattern.source,
        });
      }
    }

    return violations;
  }

  /**
   * Check compliance patterns.
   */
  private checkCompliancePatterns(code: string): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const { pattern, severity, message } of COMPLIANCE_PATTERNS) {
      if (pattern.test(code)) {
        violations.push({
          type: 'compliance',
          severity: severity as 'critical' | 'major' | 'minor',
          message,
          code: pattern.source,
        });
      }
    }

    return violations;
  }

  /**
   * Check ownership metadata.
   */
  private checkOwnership(code: string): OwnershipCheckResult {
    const conflicts: string[] = [];
    let owner: string | undefined;

    for (const { pattern, type } of OWNERSHIP_PATTERNS) {
      const match = code.match(pattern);
      if (match) {
        if (type === 'owner') {
          owner = match[1]?.trim();
        }
      }
    }

    // Check for conflicting ownership
    const ownerMatches = code.match(/\/\/\s*Owner:\s*(.+)/gi) || [];
    if (ownerMatches.length > 1) {
      const owners = new Set(ownerMatches.map(m => m.split(':')[1]?.trim()));
      if (owners.size > 1) {
        conflicts.push(`Multiple owners detected: ${Array.from(owners).join(', ')}`);
      }
    }

    return {
      passed: conflicts.length === 0,
      owner,
      conflicts,
    };
  }

  /**
   * Get skill metadata.
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      securityPatterns: SECURITY_PATTERNS.length,
      compliancePatterns: COMPLIANCE_PATTERNS.length,
      targetLatency: '<10ms',
    };
  }
}

/**
 * Create PolicyGuardSkill instance.
 */
export function createPolicyGuardSkill(): PolicyGuardSkill {
  return new PolicyGuardSkill();
}
