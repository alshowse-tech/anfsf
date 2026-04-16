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
export declare class InputGovernanceEngine {
    /**
     * 一致性检查 (PRD/Design/API)
     */
    checkConsistency(prd: AINativePRD, design: any, api: any): ConsistencyReport;
    /**
     * 完整性检查 (状态/API/约束)
     */
    checkCompleteness(prd: AINativePRD): CompletenessReport;
    /**
     * 模糊需求识别
     */
    detectAmbiguities(prd: AINativePRD): AmbiguityReport;
    /**
     * 冲突解决
     */
    resolveConflicts(prd: AINativePRD): ConflictResolution;
    /**
     * 检测需求冲突
     */
    private detectRequirementConflicts;
    /**
     * 检查约束是否冲突
     */
    private areConstraintsConflicting;
    /**
     * 生成解决方案
     */
    private generateResolution;
    /**
     * 检查 PRD 与 Design 一致性
     */
    private checkPRDDesignConsistency;
    /**
     * 检查 Design 与 API 一致性
     */
    private checkDesignAPIConsistency;
}
export default InputGovernanceEngine;
