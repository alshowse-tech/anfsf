/**
 * ANFSF V1.5.0 - External Review Agent
 * 
 * Independent code auditor with veto power.
 * Deployed separately from main ANFSF architecture.
 * Does NOT share memory/reward/retriever with main system.
 */

import { Pool } from 'pg';

// ============================================================================
// Types
// ============================================================================

export interface ReviewPayload {
  generatedCode: string;
  requirementGraph: any;
  traceId: string;
  timestamp: number;
}

export interface ReviewResult {
  passed: boolean;
  score: number;
  hasVeto: boolean;
  issues: string[];
  traceId: string;
  latency: number;
}

export interface AuditResult {
  criticalIssues: string[];
  majorIssues: string[];
  minorIssues: string[];
  hallucinationScore: number;
}

// ============================================================================
// External Review Agent
// ============================================================================

export class ExternalReviewAgent {
  private dbPool: Pool;
  private readonly SCORE_THRESHOLD = 0.85;
  private readonly HALLUCINATION_THRESHOLD = 0.70;

  constructor(dbConfig: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  }) {
    // Independent KPI database (TimescaleDB)
    this.dbPool = new Pool(dbConfig);
  }

  /**
   * Review generated code with independent analysis.
   */
  async review(payload: ReviewPayload): Promise<ReviewResult> {
    const startTime = Date.now();

    try {
      // 1. Independent static analysis (simulated ESLint/SonarQube)
      const staticIssues = await this.runStaticAnalysis(payload.generatedCode);

      // 2. Independent model reasoning (qwen bailian)
      const auditResult = await this.runModelAudit(payload);

      // 3. Compute final score
      const finalScore = this.computeFinalScore(staticIssues, auditResult);

      // 4. Check veto conditions
      const hasVeto = this.checkVetoConditions(auditResult, staticIssues);

      // 5. Record to independent KPI database
      await this.recordKPI({
        traceId: payload.traceId,
        score: finalScore,
        hasVeto,
        latency: Date.now() - startTime,
      });

      const passed = !hasVeto && finalScore >= this.SCORE_THRESHOLD;

      return {
        passed,
        score: finalScore,
        hasVeto,
        issues: [...staticIssues, ...auditResult.majorIssues],
        traceId: payload.traceId,
        latency: Date.now() - startTime,
      };
    } catch (error) {
      console.error('[ExternalReviewAgent] Review failed:', error);
      return {
        passed: false,
        score: 0,
        hasVeto: true,
        issues: [`Review failed: ${error}`],
        traceId: payload.traceId,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Run independent static analysis.
   */
  private async runStaticAnalysis(code: string): Promise<string[]> {
    const issues: string[] = [];

    // Simulated ESLint/SonarQube checks
    // In production, integrate with actual tools

    // Check 1: Code complexity (simplified)
    const lines = code.split('\n');
    if (lines.length > 500) {
      issues.push('Code file too long (>500 lines)');
    }

    // Check 2: Function length (simplified)
    const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
    if (functionMatches.length > 0) {
      // Check for very long functions
      const avgFunctionLength = lines.length / functionMatches.length;
      if (avgFunctionLength > 100) {
        issues.push('Functions too long (avg >100 lines)');
      }
    }

    // Check 3: TODO/FIXME comments
    const todoCount = (code.match(/TODO|FIXME/g) || []).length;
    if (todoCount > 5) {
      issues.push(`Too many TODO/FIXME comments (${todoCount})`);
    }

    return issues;
  }

  /**
   * Run independent model audit using qwen bailian.
   */
  private async runModelAudit(payload: ReviewPayload): Promise<AuditResult> {
    // In production, call qwen bailian API independently
    // This is a simplified simulation

    const issues: string[] = [];
    let hallucinationScore = 0.85; // Simulated

    // Check for potential hallucinations
    if (payload.generatedCode.includes('unknown_api') || 
        payload.generatedCode.includes('not_defined')) {
      hallucinationScore = 0.50;
      issues.push('Potential hallucinated API calls detected');
    }

    return {
      criticalIssues: issues.filter(i => i.includes('critical')),
      majorIssues: issues,
      minorIssues: [],
      hallucinationScore,
    };
  }

  /**
   * Compute final score from multiple factors.
   */
  private computeFinalScore(issues: string[], audit: AuditResult): number {
    // Base score
    let score = 1.0;

    // Deduct for issues
    score -= issues.length * 0.05;

    // Deduct for hallucination
    if (audit.hallucinationScore < this.HALLUCINATION_THRESHOLD) {
      score -= 0.20;
    }

    // Ensure score is within bounds
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check veto conditions.
   */
  private checkVetoConditions(audit: AuditResult, issues: string[]): boolean {
    // Any critical issues → veto
    if (audit.criticalIssues.length > 0) return true;

    // Hallucination score too low → veto
    if (audit.hallucinationScore < this.HALLUCINATION_THRESHOLD) return true;

    // Too many major issues → veto
    if (audit.majorIssues.length > 5) return true;

    return false;
  }

  /**
   * Record KPI to independent database.
   */
  private async recordKPI(metrics: {
    traceId: string;
    score: number;
    hasVeto: boolean;
    latency: number;
  }): Promise<void> {
    try {
      await this.dbPool.query(
        'INSERT INTO kpi_metrics (time, trace_id, score, has_veto, latency_ms) VALUES (NOW(), $1, $2, $3, $4)',
        [metrics.traceId, metrics.score, metrics.hasVeto, metrics.latency]
      );
    } catch (error) {
      console.error('[ExternalReviewAgent] Failed to record KPI:', error);
    }
  }

  /**
   * Get recent KPI metrics.
   */
  async getRecentKPIs(limit: number = 10): Promise<any[]> {
    const result = await this.dbPool.query(
      'SELECT time, trace_id, score, has_veto, latency_ms FROM kpi_metrics ORDER BY time DESC LIMIT $1',
      [limit]
    );
    return result.rows;
  }

  /**
   * Close database connection.
   */
  async destroy(): Promise<void> {
    await this.dbPool.end();
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createExternalReviewAgent(options?: { mockPool?: boolean }): ExternalReviewAgent {
  if (options?.mockPool) {
    return new ExternalReviewAgentWithMockDb();
  }
  return new ExternalReviewAgent({
    host: process.env.EXTERNAL_REVIEW_DB_HOST || 'localhost',
    port: parseInt(process.env.EXTERNAL_REVIEW_DB_PORT || '5433'),
    user: process.env.EXTERNAL_REVIEW_DB_USER || 'external_review',
    password: process.env.EXTERNAL_REVIEW_DB_PASSWORD || 'external_review_password',
    database: process.env.EXTERNAL_REVIEW_DB_NAME || 'kpi_db',
  });
}

/**
 * In-memory mock implementation for testing without PostgreSQL.
 */
class ExternalReviewAgentWithMockDb extends ExternalReviewAgent {
  private mockKpiRecords: Array<{
    time: Date;
    trace_id: string;
    score: number;
    has_veto: boolean;
    latency_ms: number;
  }> = [];

  constructor() {
    super({ host: 'localhost', port: 5433, user: 'mock', password: 'mock', database: 'mock' });
    // Override the dbPool with a mock
    (this as any).dbPool = {
      query: async (sql: string, params?: any[]) => {
        if (sql.startsWith('INSERT')) {
          this.mockKpiRecords.push({
            time: new Date(),
            trace_id: params![0],
            score: params![1],
            has_veto: params![2],
            latency_ms: params![3],
          });
          return { rows: [] };
        }
        if (sql.startsWith('SELECT')) {
          const limit = params?.[0] ?? 10;
          const sorted = [...this.mockKpiRecords].sort((a, b) => b.time.getTime() - a.time.getTime());
          return { rows: sorted.slice(0, limit) };
        }
        return { rows: [] };
      },
      end: async () => {},
    };
  }
}
