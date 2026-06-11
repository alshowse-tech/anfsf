/**
 * ANFSF Pipeline — Fix Engine (T-301)
 *
 * Two-dimensional fix matrix: Code Source × Problem Type → Fix Level
 *
 *   - L1: Auto-fix (styles, types, format) — system commits automatically
 *   - L2: Suggest fix (interface params, field names) — generates diff, dev confirms
 *   - L3: Locate only (business logic, algorithms) — report location, dev fixes
 */

import type { CodeSource } from './code-annotator';

// ============================================================================
// Types
// ============================================================================

export type FixLevel = 'L1' | 'L2' | 'L3';
export type ProblemType =
  | 'style_deviation'    // CSS/spacing issues
  | 'spelling_format'    // typos, formatting
  | 'type_mismatch'      // TS type errors
  | 'interface_change'   // API field changes
  | 'unused_variable'    // dead code
  | 'conditional_flaw'   // logic gaps
  | 'business_logic'     // wrong business rules
  | 'algorithm_issue';   // performance/algorithm

export interface FixRecord {
  id: string;
  projectId: string;
  testCaseId?: string;
  feedbackId?: string;
  level: FixLevel;
  file: string;
  line: number;
  problemType: ProblemType;
  issueDescription: string;
  fixDescription?: string;
  fixStatus: 'pending' | 'auto_fixed' | 'suggestion_ready' | 'dev_fixed' | 'located_only' | 'confirmed';
  fixedBy?: 'system' | string;
  fixedAt?: number;
  confirmedBy?: string;
  confirmedAt?: number;
}

export interface FixResult {
  level: FixLevel;
  record: FixRecord;
  /** L2 only: suggested diff */
  suggestedDiff?: string;
  /** Action the developer should take */
  action: 'auto_fix_applied' | 'review_suggestion' | 'manual_fix_required' | 'no_action';
}

// ============================================================================
// Fix Matrix
// ============================================================================

/**
 * Two-dimensional matrix:
 *   rows: code source (generated / modified / new)
 *   cols: problem type
 *   cells: fix level (L1/L2/L3)
 */
const FIX_MATRIX: Record<CodeSource, Partial<Record<ProblemType, FixLevel>>> = {
  generated: {
    style_deviation: 'L1',
    spelling_format: 'L1',
    type_mismatch: 'L1',
    interface_change: 'L2',
    unused_variable: 'L1',
    conditional_flaw: 'L2',
    business_logic: 'L1',     // Generated skeleton logic flaws are auto-fixable
    algorithm_issue: 'L1',     // Same — skeleton code is system's responsibility
  },
  modified: {
    style_deviation: 'L1',
    spelling_format: 'L1',
    type_mismatch: 'L2',
    interface_change: 'L2',
    unused_variable: 'L2',
    conditional_flaw: 'L3',
    business_logic: 'L3',
    algorithm_issue: 'L3',
  },
  new: {
    style_deviation: 'L1',
    spelling_format: 'L1',
    type_mismatch: 'L2',
    interface_change: 'L3',
    unused_variable: 'L2',
    conditional_flaw: 'L3',
    business_logic: 'L3',
    algorithm_issue: 'L3',
  },
};

// ============================================================================
// Fix Engine
// ============================================================================

export class FixEngine {
  private fixCounter = 0;

  /**
   * Determine the fix level for a given problem.
   */
  classify(source: CodeSource, problemType: ProblemType): FixLevel {
    return FIX_MATRIX[source]?.[problemType] ?? 'L3'; // Default: conservative
  }

  /**
   * Create a fix record with the appropriate level.
   */
  createFix(params: {
    projectId: string;
    source: CodeSource;
    problemType: ProblemType;
    file: string;
    line: number;
    description: string;
    testCaseId?: string;
    feedbackId?: string;
  }): FixResult {
    const level = this.classify(params.source, params.problemType);

    const record: FixRecord = {
      id: `fix_${Date.now()}_${++this.fixCounter}`,
      projectId: params.projectId,
      testCaseId: params.testCaseId,
      feedbackId: params.feedbackId,
      level,
      file: params.file,
      line: params.line,
      problemType: params.problemType,
      issueDescription: params.description,
      fixStatus: 'pending',
    };

    let action: FixResult['action'];
    let suggestedDiff: string | undefined;

    switch (level) {
      case 'L1':
        record.fixStatus = 'auto_fixed';
        record.fixedBy = 'system';
        record.fixedAt = Date.now();
        action = 'auto_fix_applied';
        break;
      case 'L2':
        record.fixStatus = 'suggestion_ready';
        action = 'review_suggestion';
        suggestedDiff = `[Suggested fix for ${params.file}:${params.line}]`;
        break;
      case 'L3':
        record.fixStatus = 'located_only';
        action = 'manual_fix_required';
        break;
    }

    return { level, record, suggestedDiff, action };
  }

  /**
   * Confirm a fix (PM or dev marks it as resolved).
   */
  confirmFix(record: FixRecord, confirmedBy: string): FixRecord {
    return {
      ...record,
      fixStatus: 'confirmed',
      confirmedBy,
      confirmedAt: Date.now(),
    };
  }

  /**
   * Get summary statistics for a set of fix records.
   */
  summarize(records: FixRecord[]): { l1: number; l2: number; l3: number; total: number; confirmed: number; pending: number } {
    return {
      l1: records.filter(r => r.level === 'L1').length,
      l2: records.filter(r => r.level === 'L2').length,
      l3: records.filter(r => r.level === 'L3').length,
      total: records.length,
      confirmed: records.filter(r => r.fixStatus === 'confirmed').length,
      pending: records.filter(r => r.fixStatus !== 'confirmed').length,
    };
  }
}
