/**
 * ANFSF L3/L17 — Security Auditor Skill
 *
 * Independent security audit capability.
 * OWASP Top 10 checks, input validation, auth/authorization analysis,
 * data exposure detection, and security recommendation generation.
 */

import { Skill, SkillResult } from './base';
import { IR, ServiceIR, UIIR, DataIR } from '../req-graph/graph-engine';

export interface SecurityAuditContext {
  /** IR to audit */
  ir: IR;
  /** Source code snippets (optional) */
  sourceFiles?: Array<{ path: string; content: string }>;
  /** Security policy overrides */
  policies?: Record<string, unknown>;
}

export interface SecurityFinding {
  /** Finding ID */
  id: string;
  /** OWASP category */
  category: string;
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Location description */
  location: string;
  /** Issue description */
  description: string;
  /** Recommended fix */
  recommendation: string;
  /** CWE reference */
  cweId?: string;
  /** Affected IR element */
  affectedElement: string;
}

export interface SecurityScore {
  /** Overall score (0-100, higher = more secure) */
  overall: number;
  /** Per-category scores */
  categories: Record<string, number>;
}

export interface SecurityAuditResult extends SkillResult {
  /** Security findings */
  findings: SecurityFinding[];
  /** Security score */
  score: SecurityScore;
  /** Total findings by severity */
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  /** Whether the audit passed (no critical/high findings) */
  passed: boolean;
}

// OWASP Top 10 categories we check
const OWASP_CATEGORIES = [
  'A01:2021 - Broken Access Control',
  'A02:2021 - Cryptographic Failures',
  'A03:2021 - Injection',
  'A04:2021 - Insecure Design',
  'A05:2021 - Security Misconfiguration',
  'A06:2021 - Vulnerable and Outdated Components',
  'A07:2021 - Identification and Authentication Failures',
  'A08:2021 - Software and Data Integrity Failures',
  'A09:2021 - Security Logging and Monitoring Failures',
  'A10:2021 - Server-Side Request Forgery',
];

const CWE_MAP: Record<string, string> = {
  'sql-injection': 'CWE-89',
  'xss': 'CWE-79',
  'csrf': 'CWE-352',
  'broken-auth': 'CWE-287',
  'sensitive-data': 'CWE-200',
  'insecure-direct-object': 'CWE-639',
  'missing-access-control': 'CWE-284',
  'input-validation': 'CWE-20',
  'password-policy': 'CWE-521',
  'logging': 'CWE-778',
};

/**
 * Security Auditor Skill — OWASP Top 10 security checks.
 */
export class SecurityAuditorSkill extends Skill {
  name = 'security-auditor';
  version = '1.0.0';
  description = '安全审计 Skill — OWASP Top 10 检查和漏洞检测';

  execute(ctx: SecurityAuditContext): Promise<SecurityAuditResult> {
    const startTime = Date.now();
    const { ir } = ctx;

    const findings: SecurityFinding[] = [];

    // Check endpoints for security issues
    findings.push(...this.checkEndpoints(ir.service));

    // Check data entities for exposure risks
    findings.push(...this.checkDataExposure(ir.data));

    // Check UI for XSS/input validation
    findings.push(...this.checkUIComponents(ir.ui));

    // Check auth and access control
    findings.push(...this.checkAccessControl(ir));

    // Check source files if provided
    if (ctx.sourceFiles) {
      findings.push(...this.checkSourceFiles(ctx.sourceFiles));
    }

    // Calculate scores
    const score = this.calculateScore(findings);
    const summary = this.summarize(findings);

    return Promise.resolve({
      findings,
      score,
      summary,
      passed: summary.critical === 0 && summary.high === 0,
      executionTime: Date.now() - startTime,
      metadata: { name: this.name, version: this.version, checksPerformed: OWASP_CATEGORIES.length },
    });
  }

  // ---------------------------------------------------------------------------
  // Endpoint Security Checks
  // ---------------------------------------------------------------------------

  private checkEndpoints(service: ServiceIR): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let id = 0;

    for (const endpoint of service.endpoints) {
      const location = `${endpoint.method.toUpperCase()} ${endpoint.path}`;

      // Check for missing authentication on write operations
      if (['post', 'put', 'delete', 'patch'].includes(endpoint.method.toLowerCase())) {
        if (!endpoint.request?.auth) {
          findings.push({
            id: `SEC-${++id}`,
            category: 'A01:2021 - Broken Access Control',
            severity: 'high',
            location,
            description: `Write endpoint without authentication: ${location}`,
            recommendation: 'Add authentication middleware and role-based access control',
            cweId: CWE_MAP['missing-access-control'],
            affectedElement: `endpoint:${endpoint.path}`,
          });
        }
      }

      // Check for SQL injection risk (unvalidated params)
      if (endpoint.request?.params && !endpoint.request.validation) {
        findings.push({
          id: `SEC-${++id}`,
          category: 'A03:2021 - Injection',
          severity: 'medium',
          location,
          description: `Endpoint with unvalidated parameters: ${location}`,
          recommendation: 'Add input validation and parameterized queries',
          cweId: CWE_MAP['input-validation'],
          affectedElement: `endpoint:${endpoint.path}`,
        });
      }

      // Check DELETE without ID validation
      if (endpoint.method.toLowerCase() === 'delete' && endpoint.request?.params?.id) {
        if (!endpoint.request.params.id.type || endpoint.request.params.id.type === 'string') {
          findings.push({
            id: `SEC-${++id}`,
            category: 'A01:2021 - Broken Access Control',
            severity: 'medium',
            location,
            description: `DELETE endpoint accepts untyped ID: ${location}`,
            recommendation: 'Validate ID format (UUID) and check ownership before deletion',
            cweId: CWE_MAP['insecure-direct-object'],
            affectedElement: `endpoint:${endpoint.path}`,
          });
        }
      }

      // Check for exposed internal paths
      if (endpoint.path.includes('/internal') || endpoint.path.includes('/admin') || endpoint.path.includes('/debug')) {
        findings.push({
          id: `SEC-${++id}`,
          category: 'A05:2021 - Security Misconfiguration',
          severity: 'low',
          location,
          description: `Potentially sensitive endpoint exposed: ${location}`,
          recommendation: 'Restrict access to internal endpoints using network-level controls',
          affectedElement: `endpoint:${endpoint.path}`,
        });
      }
    }

    return findings;
  }

  // ---------------------------------------------------------------------------
  // Data Exposure Checks
  // ---------------------------------------------------------------------------

  private checkDataExposure(data: DataIR): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let id = 100;

    const sensitiveFields = ['password', 'secret', 'token', 'ssn', 'credit_card', 'phone', 'email', 'address', 'apiKey', 'privateKey'];

    for (const entity of data.entities) {
      for (const field of entity.fields) {
        const fieldNameLower = field.name.toLowerCase();

        // Check for sensitive fields without protection
        if (sensitiveFields.some(s => fieldNameLower.includes(s))) {
          if (fieldNameLower.includes('password') || fieldNameLower.includes('secret') || fieldNameLower.includes('privatekey')) {
            findings.push({
              id: `SEC-${++id}`,
              category: 'A02:2021 - Cryptographic Failures',
              severity: 'critical',
              location: `entity:${entity.name}`,
              description: `Sensitive field "${field.name}" may store plaintext secrets`,
              recommendation: 'Hash passwords with bcrypt/argon2, encrypt other sensitive fields at rest',
              cweId: CWE_MAP['sensitive-data'],
              affectedElement: `entity:${entity.name}.field:${field.name}`,
            });
          } else {
            findings.push({
              id: `SEC-${++id}`,
              category: 'A02:2021 - Cryptographic Failures',
              severity: 'medium',
              location: `entity:${entity.name}`,
              description: `Sensitive field "${field.name}" detected — ensure encryption at rest`,
              recommendation: 'Apply field-level encryption for PII data',
              cweId: CWE_MAP['sensitive-data'],
              affectedElement: `entity:${entity.name}.field:${field.name}`,
            });
          }
        }
      }
    }

    return findings;
  }

  // ---------------------------------------------------------------------------
  // UI Security Checks
  // ---------------------------------------------------------------------------

  private checkUIComponents(ui: UIIR): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let id = 200;

    for (const component of ui.components) {
      // Check for dangerouslySetInnerHTML patterns
      if (component.props?.dangerouslySetInnerHTML || component.props?.html) {
        findings.push({
          id: `SEC-${++id}`,
          category: 'A03:2021 - Injection',
          severity: 'high',
          location: `component:${component.name}`,
          description: 'Component accepts raw HTML input — XSS risk',
          recommendation: 'Sanitize HTML input using DOMPurify or equivalent',
          cweId: CWE_MAP['xss'],
          affectedElement: `component:${component.name}`,
        });
      }

      // Check for unvalidated user input in props
      if (component.props?.url || component.props?.src || component.props?.href) {
        findings.push({
          id: `SEC-${++id}`,
          category: 'A03:2021 - Injection',
          severity: 'medium',
          location: `component:${component.name}`,
          description: 'Component accepts URL props — validate to prevent open redirects',
          recommendation: 'Validate URLs against allowlist and sanitize',
          affectedElement: `component:${component.name}`,
        });
      }
    }

    return findings;
  }

  // ---------------------------------------------------------------------------
  // Access Control Checks
  // ---------------------------------------------------------------------------

  private checkAccessControl(ir: IR): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let id = 300;

    // Check if any entity has no relationship to user/owner
    const hasUserEntity = ir.data.entities.some(e =>
      e.name.toLowerCase().includes('user') || e.name.toLowerCase().includes('account')
    );

    if (!hasUserEntity && ir.data.entities.length > 0) {
      findings.push({
        id: `SEC-${++id}`,
        category: 'A07:2021 - Identification and Authentication Failures',
        severity: 'high',
        location: 'data-layer',
        description: 'No user/account entity found — authentication layer may be missing',
        recommendation: 'Define User entity with authentication fields',
        cweId: CWE_MAP['broken-auth'],
        affectedElement: 'data-layer',
      });
    }

    // Check if services have dependency on auth
    for (const service of ir.service.services) {
      if (!service.dependencies.some(d => d.toLowerCase().includes('auth') || d.toLowerCase().includes('user'))) {
        findings.push({
          id: `SEC-${++id}`,
          category: 'A01:2021 - Broken Access Control',
          severity: 'low',
          location: `service:${service.name}`,
          description: `Service "${service.name}" has no auth dependency`,
          recommendation: 'Consider adding auth middleware or user service dependency',
          cweId: CWE_MAP['missing-access-control'],
          affectedElement: `service:${service.name}`,
        });
      }
    }

    return findings;
  }

  // ---------------------------------------------------------------------------
  // Source Code Checks
  // ---------------------------------------------------------------------------

  private checkSourceFiles(files: Array<{ path: string; content: string }>): SecurityFinding[] {
    const findings: SecurityFinding[] = [];
    let id = 400;

    const dangerousPatterns = [
      { pattern: /eval\s*\(/, desc: 'Use of eval() — code injection risk', category: 'A03:2021 - Injection', severity: 'critical' as const, cwe: CWE_MAP['sql-injection'] },
      { pattern: /innerHTML\s*=/, desc: 'Direct innerHTML assignment — XSS risk', category: 'A03:2021 - Injection', severity: 'high' as const, cwe: CWE_MAP['xss'] },
      { pattern: /document\.write\s*\(/, desc: 'document.write() — XSS risk', category: 'A03:2021 - Injection', severity: 'high' as const, cwe: CWE_MAP['xss'] },
      { pattern: /password.*=.*['"][^'"]{1,3}['"]/, desc: 'Hardcoded password detected', category: 'A07:2021 - Identification and Authentication Failures', severity: 'critical' as const, cwe: CWE_MAP['password-policy'] },
      { pattern: /console\.log.*password|console\.log.*secret|console\.log.*token/i, desc: 'Sensitive data in console.log', category: 'A09:2021 - Security Logging and Monitoring Failures', severity: 'medium' as const, cwe: CWE_MAP['logging'] },
    ];

    for (const file of files) {
      for (const { pattern, desc, category, severity, cwe } of dangerousPatterns) {
        const match = pattern.exec(file.content);
        if (match) {
          const lineNum = file.content.substring(0, match.index).split('\n').length;
          findings.push({
            id: `SEC-${++id}`,
            category,
            severity,
            location: `${file.path}:${lineNum}`,
            description: desc,
            recommendation: `Remove or replace dangerous pattern at ${file.path}:${lineNum}`,
            cweId: cwe,
            affectedElement: `file:${file.path}`,
          });
        }
      }
    }

    return findings;
  }

  // ---------------------------------------------------------------------------
  // Scoring
  // ---------------------------------------------------------------------------

  private calculateScore(findings: SecurityFinding[]): SecurityScore {
    const severityWeights = { critical: 25, high: 15, medium: 5, low: 2, info: 0 };

    const totalDeduction = findings.reduce(
      (sum, f) => sum + severityWeights[f.severity],
      0
    );

    const overall = Math.max(0, 100 - totalDeduction);

    // Per-category scores
    const categories: Record<string, number> = {};
    for (const cat of OWASP_CATEGORIES) {
      const catFindings = findings.filter(f => f.category === cat);
      const catDeduction = catFindings.reduce((sum, f) => sum + severityWeights[f.severity], 0);
      categories[cat] = Math.max(0, 100 - catDeduction);
    }

    return { overall, categories };
  }

  private summarize(findings: SecurityFinding[]) {
    return {
      critical: findings.filter(f => f.severity === 'critical').length,
      high: findings.filter(f => f.severity === 'high').length,
      medium: findings.filter(f => f.severity === 'medium').length,
      low: findings.filter(f => f.severity === 'low').length,
      info: findings.filter(f => f.severity === 'info').length,
    };
  }
}

/**
 * Create a SecurityAuditorSkill instance.
 */
export function createSecurityAuditorSkill(): SecurityAuditorSkill {
  return new SecurityAuditorSkill();
}
