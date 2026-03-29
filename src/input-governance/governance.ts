/**
 * AI Native Full-Stack Software Factory
 * Layer 3: Input Governance Layer (输入治理层)
 * 
 * @version 1.0.0
 * @date 2026-03-29
 */

import { AINativePRD } from '../prd/prd-parser';

/**
 * 一致性检查结果
 */
export interface ConsistencyReport {
  consistent: boolean;
  issues: ConsistencyIssue[];
}

export interface ConsistencyIssue {
  type: 'prd-design' | 'design-api' | 'api-implementation';
  severity: 'critical' | 'warning' | 'info';
  description: string;
  suggestion: string;
}

/**
 * 完整性检查结果
 */
export interface CompletenessReport {
  complete: boolean;
  missing: MissingItem[];
  completionRate: number;
}

export interface MissingItem {
  category: 'state' | 'api' | 'constraint';
  item: string;
  impact: string;
}

/**
 * 模糊性检测结果
 */
export interface AmbiguityReport {
  ambiguous: boolean;
  items: AmbiguousItem[];
}

export interface AmbiguousItem {
  location: string;
  text: string;
  ambiguity: string;
  suggestion: string;
}

/**
 * 冲突解决结果
 */
export interface ConflictResolution {
  resolved: boolean;
  conflicts: Conflict[];
  resolutions: Resolution[];
}

export interface Conflict {
  id: string;
  type: 'requirement' | 'design' | 'constraint';
  description: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface Resolution {
  conflictId: string;
  resolution: string;
  impact: string;
}

/**
 * Input Governance Engine
 */
export class InputGovernanceEngine {
  /**
   * 一致性检查 (PRD/Design/API)
   */
  checkConsistency(prd: AINativePRD, design: any, api: any): ConsistencyReport {
    const issues: ConsistencyIssue[] = [];

    // 检查 PRD 与 Design 一致性
    if (!this.checkPRDDesignConsistency(prd, design)) {
      issues.push({
        type: 'prd-design',
        severity: 'critical',
        description: 'PRD and Design are inconsistent',
        suggestion: 'Review and align PRD with Design',
      });
    }

    // 检查 Design 与 API 一致性
    if (!this.checkDesignAPIConsistency(design, api)) {
      issues.push({
        type: 'design-api',
        severity: 'critical',
        description: 'Design and API are inconsistent',
        suggestion: 'Review and align Design with API',
      });
    }

    return {
      consistent: issues.length === 0,
      issues,
    };
  }

  /**
   * 完整性检查 (状态/API/约束)
   */
  checkCompleteness(prd: AINativePRD): CompletenessReport {
    const missing: MissingItem[] = [];
    let totalItems = 0;
    let completeItems = 0;

    // 检查状态完整性
    if (!prd.features || prd.features.length === 0) {
      missing.push({
        category: 'state',
        item: 'features',
        impact: 'Cannot proceed without features',
      });
    } else {
      totalItems += prd.features.length;
      completeItems += prd.features.filter(f => f.status === 'approved').length;
    }

    // 检查 API 完整性
    if (!prd.backendSpecs || !prd.backendSpecs.api) {
      missing.push({
        category: 'api',
        item: 'API specifications',
        impact: 'Cannot generate backend without API specs',
      });
    }

    // 检查约束完整性
    if (!prd.constraints || prd.constraints.length === 0) {
      missing.push({
        category: 'constraint',
        item: 'constraints',
        impact: 'May lead to technical debt',
      });
    }

    const completionRate = totalItems > 0 ? (completeItems / totalItems) * 100 : 0;

    return {
      complete: missing.length === 0,
      missing,
      completionRate,
    };
  }

  /**
   * 模糊需求识别
   */
  detectAmbiguities(prd: AINativePRD): AmbiguityReport {
    const items: AmbiguousItem[] = [];
    const ambiguousWords = [
      'maybe', 'possibly', 'might', 'could', 'should',
      'fast', 'slow', 'large', 'small', 'user-friendly',
      'etc', 'and so on', 'approximately',
    ];

    // 检查 feature 描述
    prd.features.forEach(feature => {
      ambiguousWords.forEach(word => {
        if (feature.description.toLowerCase().includes(word)) {
          items.push({
            location: `features/${feature.id}`,
            text: feature.description,
            ambiguity: `Contains ambiguous word: "${word}"`,
            suggestion: 'Use specific, measurable terms',
          });
        }
      });
    });

    return {
      ambiguous: items.length > 0,
      items,
    };
  }

  /**
   * 冲突解决
   */
  resolveConflicts(prd: AINativePRD): ConflictResolution {
    const conflicts: Conflict[] = [];
    const resolutions: Resolution[] = [];

    // 检测需求冲突
    conflicts.push(...this.detectRequirementConflicts(prd));

    // 检测设计冲突
    // conflicts.push(...this.detectDesignConflicts(design));

    // 解决冲突
    conflicts.forEach(conflict => {
      const resolution = this.generateResolution(conflict);
      if (resolution) {
        resolutions.push(resolution);
      }
    });

    return {
      resolved: resolutions.length === conflicts.length,
      conflicts,
      resolutions,
    };
  }

  /**
   * 检测需求冲突
   */
  private detectRequirementConflicts(prd: AINativePRD): Conflict[] {
    const conflicts: Conflict[] = [];

    // 检查约束冲突
    if (prd.constraints) {
      for (let i = 0; i < prd.constraints.length; i++) {
        for (let j = i + 1; j < prd.constraints.length; j++) {
          if (this.areConstraintsConflicting(prd.constraints[i], prd.constraints[j])) {
            conflicts.push({
              id: `conflict-${i}-${j}`,
              type: 'constraint',
              description: `Constraint ${prd.constraints[i].id} conflicts with ${prd.constraints[j].id}`,
              severity: 'critical',
            });
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * 检查约束是否冲突
   */
  private areConstraintsConflicting(c1: any, c2: any): boolean {
    // TODO: 实现冲突检测逻辑
    return false;
  }

  /**
   * 生成解决方案
   */
  private generateResolution(conflict: Conflict): Resolution | null {
    // TODO: 实现冲突解决逻辑
    return {
      conflictId: conflict.id,
      resolution: 'Manual review required',
      impact: 'May require PRD update',
    };
  }

  /**
   * 检查 PRD 与 Design 一致性
   */
  private checkPRDDesignConsistency(prd: AINativePRD, design: any): boolean {
    // TODO: 实现一致性检查
    return true;
  }

  /**
   * 检查 Design 与 API 一致性
   */
  private checkDesignAPIConsistency(design: any, api: any): boolean {
    // TODO: 实现一致性检查
    return true;
  }
}

export default InputGovernanceEngine;
