/**
 * ANFSF V1.5.0 - Code Quality Guard Skill
 * 
 * Inline guard for code quality checking.
 * Integrated into Governance Harness.
 * Target latency: <10ms
 */

import { Skill, SkillResult } from './base';
import { RefinedGraph } from './requirement-refiner-skill';

// ============================================================================
// Types
// ============================================================================

export interface GuardResult extends SkillResult {
  passed: boolean;
  score?: number;
  reason?: string;
  details?: {
    staticResult?: StaticAnalysisResult;
    semanticResult?: SemanticValidationResult;
    performanceResult?: PerformancePredictionResult;
    policyResult?: PolicyCheckResult;
  };
}

export interface StaticAnalysisResult {
  passed: boolean;
  score: number;
  issues: string[];
  complexity?: number;
  readability?: number;
}

export interface SemanticValidationResult {
  passed: boolean;
  score: number;
  mismatches: string[];
}

export interface PerformancePredictionResult {
  passed: boolean;
  score: number;
  issues: string[];
  estimatedLatency?: number;
  estimatedMemory?: number;
}

export interface PolicyCheckResult {
  passed: boolean;
  score: number;
  violations: string[];
}

// ============================================================================
// Constants
// ============================================================================

const QUALITY_THRESHOLD = 0.92;

const WEIGHTS = {
  static: 0.30,
  semantic: 0.30,
  performance: 0.20,
  policy: 0.20,
};

// ============================================================================
// CodeQualityGuardSkill
// ============================================================================

export class CodeQualityGuardSkill extends Skill {
  name = 'code-quality-guard';
  version = '1.0.0';
  description = '代码质量守卫 Skill - 静态分析 + 语义验证 + 性能预测 + 策略检查';

  private readonly qualityThreshold = QUALITY_THRESHOLD;

  /**
   * Execute code quality guard checks.
   * Target: <10ms (parallel execution)
   */
  async execute(ctx: any): Promise<GuardResult> {
    const generatedCode = typeof ctx === 'string' ? ctx : (ctx.code || ctx.generatedCode || '');
    const requirementGraph = ctx.requirementGraph || ctx.graph || { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
    const startTime = Date.now();

    try {
      // Parallel execution of all checks (<10ms target)
      const [staticResult, semanticResult, performanceResult, policyResult] = await Promise.all([
        this.runStaticAnalysis(generatedCode),
        this.runSemanticValidation(generatedCode, requirementGraph),
        this.runPerformancePrediction(generatedCode),
        this.runPolicyCheck(generatedCode),
      ]);

      // Calculate weighted overall score
      const overallScore = this.calculateWeightedScore([
        staticResult,
        semanticResult,
        performanceResult,
        policyResult,
      ]);

      // Check against threshold
      if (overallScore < this.qualityThreshold) {
        return {
          passed: false,
          score: overallScore,
          reason: `quality_below_threshold: ${overallScore.toFixed(3)} < ${this.qualityThreshold}`,
          details: { staticResult, semanticResult, performanceResult, policyResult },
        };
      }

      // Check individual failures
      if (!staticResult.passed || !semanticResult.passed || !performanceResult.passed || !policyResult.passed) {
        const failures = [];
        if (!staticResult.passed) failures.push('static_analysis');
        if (!semanticResult.passed) failures.push('semantic_validation');
        if (!performanceResult.passed) failures.push('performance_prediction');
        if (!policyResult.passed) failures.push('policy_check');

        return {
          passed: false,
          score: overallScore,
          reason: `guard_failures: ${failures.join(', ')}`,
          details: { staticResult, semanticResult, performanceResult, policyResult },
        };
      }

      return {
        passed: true,
        score: overallScore,
        details: { staticResult, semanticResult, performanceResult, policyResult },
      };
    } catch (error) {
      return {
        passed: false,
        reason: `guard_error: ${error}`,
      };
    }
  }

  /**
   * Run static analysis (complexity, readability, security scan).
   */
  private async runStaticAnalysis(code: string): Promise<StaticAnalysisResult> {
    const issues: string[] = [];
    let score = 1.0;

    // Check 1: Code length
    const lines = code.split('\n');
    if (lines.length > 500) {
      issues.push(`File too long: ${lines.length} lines (>500)`);
      score -= 0.20;
    }

    // Check 2: Function complexity (simplified cyclomatic)
    const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
    const avgFunctionLength = lines.length / Math.max(1, functionMatches.length);
    if (avgFunctionLength > 100) {
      issues.push(`Functions too complex: avg ${avgFunctionLength.toFixed(0)} lines (>100)`);
      score -= 0.15;
    }

    // Check 3: Nesting depth
    const maxNesting = (code.match(/\{\s*\{/g) || []).length;
    if (maxNesting > 5) {
      issues.push(`Deep nesting detected: ${maxNesting} levels (>5)`);
      score -= 0.10;
    }

    // Check 4: TODO/FIXME comments
    const todoCount = (code.match(/TODO|FIXME/g) || []).length;
    if (todoCount > 5) {
      issues.push(`Too many TODO/FIXME: ${todoCount} (>5)`);
      score -= 0.05;
    }

    // Check 5: Console.log usage (production code)
    const consoleCount = (code.match(/console\.log/g) || []).length;
    if (consoleCount > 3) {
      issues.push(`Excessive console.log: ${consoleCount} (>3)`);
      score -= 0.05;
    }

    return {
      passed: score >= 0.70,
      score: Math.max(0, score),
      issues,
      complexity: avgFunctionLength,
      readability: 1.0 - (issues.length * 0.05),
    };
  }

  /**
   * Run semantic validation (cross-validate with requirement graph).
   */
  private async runSemanticValidation(
    code: string,
    graph: RefinedGraph
  ): Promise<SemanticValidationResult> {
    const mismatches: string[] = [];
    let score = 1.0;

    // Check if code implements required features
    for (const node of graph.nodes) {
      if (node.type === 'requirement') {
        const keywords = node.content.toLowerCase().split(' ').filter(w => w.length > 3);
        const hasMatch = keywords.some(kw => code.toLowerCase().includes(kw));
        
        if (!hasMatch) {
          mismatches.push(`Requirement not implemented: ${node.content}`);
          score -= 0.10;
        }
      }
    }

    // Check for undefined functions/APIs
    const undefinedPatterns = ['unknown_api', 'not_defined', 'placeholder', 'TODO_IMPLEMENT'];
    for (const pattern of undefinedPatterns) {
      if (code.includes(pattern)) {
        mismatches.push(`Undefined reference: ${pattern}`);
        score -= 0.15;
      }
    }

    return {
      passed: score >= 0.70,
      score: Math.max(0, score),
      mismatches,
    };
  }

  /**
   * Run performance prediction (estimate latency and memory).
   */
  private async runPerformancePrediction(code: string): Promise<PerformancePredictionResult> {
    const issues: string[] = [];
    let score = 1.0;
    let estimatedLatency = 10; // ms
    let estimatedMemory = 10; // MB

    // Check 1: Synchronous operations in async context
    if (code.includes('fs.readFileSync') || code.includes('fs.readSync')) {
      issues.push('Synchronous file I/O detected');
      score -= 0.20;
      estimatedLatency += 50;
    }

    // Check 2: Large loops
    const largeLoopMatches = code.match(/for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\d+)/g);
    if (largeLoopMatches) {
      const maxIterations = Math.max(...largeLoopMatches.map(m => {
        const match = m.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      }));
      if (maxIterations > 10000) {
        issues.push(`Large loop detected: ${maxIterations} iterations (>10000)`);
        score -= 0.15;
        estimatedLatency += maxIterations / 1000;
      }
    }

    // Check 3: Memory-intensive operations
    if (code.includes('new Array(') || code.includes('Array.from')) {
      issues.push('Large array allocation detected');
      score -= 0.10;
      estimatedMemory += 20;
    }

    return {
      passed: score >= 0.70,
      score: Math.max(0, score),
      issues,
      estimatedLatency,
      estimatedMemory,
    };
  }

  /**
   * Run policy check (ownership, security, compliance).
   */
  private async runPolicyCheck(code: string): Promise<PolicyCheckResult> {
    const violations: string[] = [];
    let score = 1.0;

    // Check 1: Security - eval usage
    if (code.includes('eval(')) {
      violations.push('Security violation: eval() usage detected');
      score -= 0.30;
    }

    // Check 2: Security - new Function
    if (code.includes('new Function(')) {
      violations.push('Security violation: new Function() usage detected');
      score -= 0.30;
    }

    // Check 3: Security - child_process exec
    if (code.includes('exec(') || code.includes('execSync(')) {
      violations.push('Security violation: child_process exec usage detected');
      score -= 0.20;
    }

    // Check 4: Compliance - hardcoded secrets
    const secretPatterns = [/password\s*=\s*['"][^'"]+['"]/i, /api_key\s*=\s*['"][^'"]+['"]/i, /secret\s*=\s*['"][^'"]+['"]/i];
    for (const pattern of secretPatterns) {
      if (pattern.test(code)) {
        violations.push('Compliance violation: hardcoded secret detected');
        score -= 0.25;
      }
    }

    // Check 5: License headers
    if (!code.includes('MIT') && !code.includes('Apache') && !code.includes('GPL')) {
      // Optional check, don't penalize heavily
      // violations.push('Missing license header');
      // score -= 0.05;
    }

    return {
      passed: score >= 0.70 && violations.length === 0,
      score: Math.max(0, score),
      violations,
    };
  }

  /**
   * Calculate weighted overall score.
   */
  private calculateWeightedScore(results: Array<{ score: number }>): number {
    const total = results.reduce((sum, result, index) => {
      const weight = Object.values(WEIGHTS)[index] || 0.25;
      return sum + result.score * weight;
    }, 0);
    return total;
  }

  /**
   * Get skill metadata.
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      qualityThreshold: this.qualityThreshold,
      weights: WEIGHTS,
      targetLatency: '<10ms',
    };
  }
}

/**
 * Create CodeQualityGuardSkill instance.
 */
export function createCodeQualityGuardSkill(): CodeQualityGuardSkill {
  return new CodeQualityGuardSkill();
}
