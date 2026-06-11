/**
 * ANFSF PRD Quality Pre-Check
 *
 * Evaluates PRD text before formal LLM analysis.
 * Scores 0-100 across four dimensions. Low scores trigger guided mode.
 *
 * Task: T-101
 */

// ============================================================================
// Types
// ============================================================================

export interface PRDQualityDimensions {
  /** Does the PRD cover features, user roles, core flows? */
  completeness: number;       // 0-25
  /** Is the PRD internally consistent (no contradictions)? */
  consistency: number;        // 0-25
  /** Are requirements quantifiable (not vague like "fast", "pretty")? */
  quantifiability: number;    // 0-25
  /** Can each feature be mapped to acceptance criteria? */
  verifiability: number;      // 0-25
}

export interface PRDQualityReport {
  /** Overall score 0-100 */
  score: number;
  /** Individual dimension scores */
  dimensions: PRDQualityDimensions;
  /** Traffic light: green (≥70), yellow (40-69), red (<40) */
  level: 'green' | 'yellow' | 'red';
  /** Specific issues found */
  issues: string[];
  /** Suggested improvements */
  suggestions: string[];
  /** Whether guided mode should be triggered */
  triggerGuidedMode: boolean;
}

// ============================================================================
// Vague term detection
// ============================================================================

const VAGUE_TERMS = [
  // Chinese (no word boundaries — Chinese chars aren't \w in regex)
  /快/g, /很快/g, /非常快/g,
  /多/g, /很多/g, /大量/g,
  /好看/g, /漂亮/g, /美观/g,
  /好用/g, /易用/g, /方便/g,
  /简单/g, /容易/g,
  /稳定/g, /可靠/g, /安全/g,
  /高性能/g, /高并发/g,
  /尽量/g, /尽可能/g, /适当/g,
  /大概/g, /左右/g, /差不多/g,
  /齐全/g, /全面/g,
  /希望/g, /最好/g, /最好能/g,
  // English
  /\bfast\b/gi, /\bquick\b/gi, /\bsoon\b/gi,
  /\bmany\b/gi, /\bmuch\b/gi, /\blarge\b/gi,
  /\bpretty\b/gi, /\bgood\b/gi, /\bnice\b/gi,
  /\beasy\b/gi, /\bsimple\b/gi,
  /\bstable\b/gi, /\breliable\b/gi, /\bsecure\b/gi,
  /\bhigh.?performance\b/gi, /\bhigh.?concurrency\b/gi,
  /\bas much as possible\b/gi, /\bappropriate\b/gi,
  /\broughly\b/gi, /\bapproximately\b/gi,
];

// ============================================================================
// Quality Check Functions
// ============================================================================

/**
 * Check completeness: does the PRD mention user roles, features, and flows?
 */
function checkCompleteness(text: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;

  // Has user roles / personas?
  if (/用户|角色|user|role|persona|admin|管理员|普通用户|游客/i.test(text)) {
    score += 10;
  } else {
    issues.push('未明确描述用户角色或用户类型');
  }

  // Has feature descriptions (multiple)?
  const featureMatches = text.match(/功能|feature|模块|module|需求|requirement/gi);
  if (featureMatches && featureMatches.length >= 3) {
    score += 8;
  } else if (featureMatches && featureMatches.length >= 1) {
    score += 4;
    issues.push('功能描述较少，可能遗漏了核心功能');
  } else {
    issues.push('未找到明确的功能描述');
  }

  // Has flow / process descriptions?
  if (/流程|步骤|flow|step|process|操作|页面/.test(text)) {
    score += 7;
  } else {
    issues.push('未描述用户操作流程或页面交互');
  }

  return { score: Math.min(score, 25), issues };
}

/**
 * Check consistency: look for contradictory statements.
 */
function checkConsistency(text: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 25; // Start full, deduct for problems

  // Check for contradicting patterns
  const patterns = [
    { a: /批量|batch|bulk/i, b: /单条|单个|single|individual/i, msg: '同时提到批量和单条处理，可能存在矛盾' },
    { a: /实时|real.?time/i, b: /离线|offline|异步|async/i, msg: '同时提到实时和离线/异步，可能存在矛盾' },
    { a: /简单|simple|minimal/i, b: /复杂|complex|advanced|全面|comprehensive/i, msg: '需求复杂度描述不一致' },
  ];

  for (const p of patterns) {
    if (p.a.test(text) && p.b.test(text)) {
      issues.push(p.msg);
      score -= 8;
    }
  }

  return { score: Math.max(0, score), issues };
}

/**
 * Check quantifiability: detect vague/immeasurable terms.
 */
function checkQuantifiability(text: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let vagueCount = 0;

  for (const pattern of VAGUE_TERMS) {
    const matches = text.match(pattern);
    if (matches) {
      vagueCount += matches.length;
    }
  }

  // Each vague term reduces score
  const score = Math.max(0, 25 - Math.min(vagueCount * 2, 25));

  if (vagueCount >= 8) {
    issues.push(`检测到 ${vagueCount} 个模糊词汇（如"快""多""好看"），建议量化需求`);
  } else if (vagueCount >= 3) {
    issues.push(`检测到 ${vagueCount} 个模糊词汇，部分需求可能需要量化`);
  }

  // Bonus: check for quantifiable metrics
  if (/\d+\s*(秒|ms|毫秒|分钟|min|second|s)\b/.test(text)) issues.pop(); // Has timing metrics
  if (/\d+\s*(人|用户|user|qps|tps|并发|concurrent)\b/.test(text)) issues.pop(); // Has scale metrics

  return { score, issues };
}

/**
 * Check verifiability: can each feature be tested?
 */
function checkVerifiability(text: string): { score: number; issues: string[] } {
  const issues: string[] = [];
  let score = 0;

  // Has acceptance criteria or test scenarios?
  if (/验收|测试|test|验证|verify|acceptance|criteria|标准|条件/.test(text)) {
    score += 12;
  } else {
    issues.push('未找到验收标准或测试场景描述');
  }

  // Has measurable outcomes?
  if (/预期|expect|should|应当|必须|must|结果|输出|output|显示|展示/.test(text)) {
    score += 8;
  } else {
    issues.push('缺少可验证的预期结果描述');
  }

  // Has error/edge case handling?
  if (/错误|异常|error|exception|边界|edge.?case|fallback|降级/.test(text)) {
    score += 5;
    // Edge case handling is a bonus, don't deduct if missing
  }

  return { score: Math.min(score, 25), issues };
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Evaluate PRD quality and return a structured report.
 *
 * @param prdText - The raw PRD text to evaluate
 * @returns A quality report with score, level, issues, and suggestions
 */
export function evaluatePRDQuality(prdText: string): PRDQualityReport {
  const text = prdText.trim();

  if (text.length < 20) {
    return {
      score: 0,
      dimensions: { completeness: 0, consistency: 0, quantifiability: 0, verifiability: 0 },
      level: 'red',
      issues: ['PRD 文本过短（少于 20 字符），无法进行有效评估'],
      suggestions: ['请提供更详细的产品需求描述，至少包含用户角色、核心功能、操作流程'],
      triggerGuidedMode: true,
    };
  }

  const completeness = checkCompleteness(text);
  const consistency = checkConsistency(text);
  const quantifiability = checkQuantifiability(text);
  const verifiability = checkVerifiability(text);

  const dimensions: PRDQualityDimensions = {
    completeness: completeness.score,
    consistency: consistency.score,
    quantifiability: quantifiability.score,
    verifiability: verifiability.score,
  };

  const totalScore = dimensions.completeness + dimensions.consistency
    + dimensions.quantifiability + dimensions.verifiability;

  const level: PRDQualityReport['level'] =
    totalScore >= 70 ? 'green' : totalScore >= 40 ? 'yellow' : 'red';

  const allIssues = [
    ...completeness.issues,
    ...consistency.issues,
    ...quantifiability.issues,
    ...verifiability.issues,
  ];

  const suggestions: string[] = [];
  if (dimensions.completeness < 15) {
    suggestions.push('建议补充：用户角色定义、核心功能列表、用户操作流程');
  }
  if (dimensions.consistency < 15) {
    suggestions.push('建议检查：PRD 中是否存在相互矛盾的需求描述');
  }
  if (dimensions.quantifiability < 15) {
    suggestions.push('建议量化：将模糊需求（如"快"）替换为具体指标（如"响应时间 < 500ms"）');
  }
  if (dimensions.verifiability < 15) {
    suggestions.push('建议添加：每个功能的验收标准和预期结果');
  }

  return {
    score: totalScore,
    dimensions,
    level,
    issues: allIssues,
    suggestions,
    triggerGuidedMode: level === 'red',
  };
}
