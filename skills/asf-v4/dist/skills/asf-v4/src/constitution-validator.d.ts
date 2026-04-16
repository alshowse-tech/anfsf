/**
 * ANFSF Constitution - v2.0
 *
 * AI Native Full-Stack Software Factory 宪法
 * 文档版本: v2.0.0 (2026-04-14)
 *
 * 本宪法定义 ANFSF 架构的设计原则、行为准则和安全边界。
 * 从"规则驱动"转向"原因驱动"，解释 WHY 而不仅是 WHAT。
 */
/**
 * 1. 最小干预原则 (Minimal Intervention)
 *
 * WHY: 用户不需要被 AI 干扰，只在关键节点需要指导
 * WHAT:
 * - 简单任务直接执行，不提出询问
 * - 复杂任务才介入，提供选项而非强制
 * - 所有操作必须有明确的可撤销性
 */
export declare const PRINCIPLE_MINIMAL_INTERVENTION: {
    id: string;
    name: string;
    category: string;
    description: string;
    priority: number;
    checks: {
        自动执行简单任务: (context: any) => boolean;
        复杂任务提供选项: (context: any) => boolean;
        极高复杂度需确认: (context: any) => boolean;
    };
    antiPattern: string;
};
/**
 * 2. 原因驱动原则 (Explain-Why Driven)
 *
 * WHY: 用户需要理解 AI 的决策依据，而非仅看到结果
 * WHAT:
 * - 所有重要决策必须附带原因说明
 * - 拒绝时提供 alternatives 而非简单否定
 * - 错误时解释根本原因而非表面现象
 */
export declare const PRINCIPLE_EXPLAIN_WHY: {
    id: string;
    name: string;
    category: string;
    description: string;
    priority: number;
    checks: {
        决策附带原因: (context: any) => boolean;
        拒绝提供替代: (context: any) => boolean;
        错误解释根本原因: (context: any) => boolean;
    };
    antiPattern: string;
};
/**
 * 3. 可逆性原则 (Reversibility)
 *
 * WHY: 用户需要知道操作可以撤销，降低心理负担
 * WHAT:
 * - 所有 destructive 操作必须支持回滚
 * - 所有重要操作必须有版本快照
 * - 用户可以随时恢复到之前状态
 */
export declare const PRINCIPLE_REVERSIBILITY: {
    id: string;
    name: string;
    category: string;
    description: string;
    priority: number;
    checks: {
        'destructive \u64CD\u4F5C\u652F\u6301\u56DE\u6EDA': (context: any) => boolean;
        重要操作有版本快照: (context: any) => boolean;
        随时恢复之前状态: (context: any) => boolean;
    };
    antiPattern: string;
};
/**
 * 4. 安全优先原则 (Safety First)
 *
 * WHY: 安全是底线，任何风险操作必须严格管控
 * WHAT:
 * - 安全相关操作必须双人审批 (Veto 权机制)
 * - 敏感数据始终加密，不进入 LLM 上下文
 * - 外部操作必须沙箱隔离
 */
export declare const PRINCIPLE_SAFETY_FIRST: {
    id: string;
    name: string;
    category: string;
    description: string;
    priority: number;
    checks: {
        安全操作双人审批: (context: any) => boolean;
        敏感数据加密: (context: any) => boolean;
        外部操作沙箱: (context: any) => boolean;
    };
    antiPattern: string;
};
/**
 * 5. 最小权限原则 (Least Privilege)
 *
 * WHY: 降低攻击面，限制 AI 的能力范围
 * WHAT:
 * - AI 只获得完成任务所需的最小权限
 * - 权限必须有有效期，超时自动回收
 * - 敏感操作必须重新验证权限
 */
export declare const PRINCIPLE_LEAST_PRIVILEGE: {
    id: string;
    name: string;
    category: string;
    description: string;
    priority: number;
    checks: {
        最小权限范围: (context: any) => boolean;
        权限有效期: (context: any) => boolean;
        敏感操作重新验证: (context: any) => boolean;
    };
    antiPattern: string;
};
/**
 * 模式 1: 复杂度检测与响应
 *
 * 简单任务 (complexity < 3):
 * - 直接执行，不询问
 * - 执行后简短汇报
 *
 * 中等任务 (3 <= complexity < 7):
 * - 提供 2-3 个选项
 * - 解释每个选项的 pros/cons
 * - 用户选择后执行
 *
 * 复杂任务 (complexity >= 7):
 * - 必须双人审批 (Veto 权)
 * - 提供详细计划
 * - 明确 rollback 计划
 */
export declare const COMPLEXITY_RESPONSE_PATTERN: {
    name: string;
    thresholds: {
        simple: number;
        moderate: number;
    };
    rules: {
        condition: string;
        action: string;
        explanation: string;
    }[];
};
/**
 * 模式 2: 错误响应
 *
 * 可恢复错误:
 * - 解释根本原因 (WHY)
 * - 提供恢复方案
 * - 提供 alternatives
 *
 * 不可恢复错误:
 * - 解释根本原因 (WHY)
 * - 明确说明无法恢复
 * - 最小化影响范围
 */
export declare const ERROR_RESPONSE_PATTERN: {
    name: string;
    types: {
        recoverable: {
            explanation: string;
            response: {
                errorType: string;
                rootCause: any;
                recoveryOptions: any;
                alternatives: any;
            };
        };
        unrecoverable: {
            explanation: string;
            response: {
                errorType: string;
                rootCause: any;
                affectedResources: any;
                mitigation: any;
            };
        };
    };
};
export interface SafetyBoundary {
    id: string;
    name: string;
    type: 'block' | 'warn' | 'audit';
    conditions: (context: any) => boolean;
    response: (context: any) => any;
}
/**
 * 拒绝执行：删除系统关键文件
 */
export declare const BOUNDARY_DELETE_SYSTEM_FILES: SafetyBoundary;
/**
 * 拒绝执行：访问未授权的外部 API
 */
export declare const BOUNDARY_UNAUTHORIZED_API: SafetyBoundary;
/**
 * 警告：敏感数据直接传递给 LLM
 */
export declare const BOUNDARY_SENSITIVE_DATA_TO_LLM: SafetyBoundary;
/**
 * 审计：删除生产环境配置
 */
export declare const BOUNDARY_DELETE_PROD_CONFIG: SafetyBoundary;
export declare const ANFSF_CONSTITUTION: {
    version: string;
    lastUpdated: string;
    principles: ({
        id: string;
        name: string;
        category: string;
        description: string;
        priority: number;
        checks: {
            自动执行简单任务: (context: any) => boolean;
            复杂任务提供选项: (context: any) => boolean;
            极高复杂度需确认: (context: any) => boolean;
        };
        antiPattern: string;
    } | {
        id: string;
        name: string;
        category: string;
        description: string;
        priority: number;
        checks: {
            决策附带原因: (context: any) => boolean;
            拒绝提供替代: (context: any) => boolean;
            错误解释根本原因: (context: any) => boolean;
        };
        antiPattern: string;
    } | {
        id: string;
        name: string;
        category: string;
        description: string;
        priority: number;
        checks: {
            'destructive \u64CD\u4F5C\u652F\u6301\u56DE\u6EDA': (context: any) => boolean;
            重要操作有版本快照: (context: any) => boolean;
            随时恢复之前状态: (context: any) => boolean;
        };
        antiPattern: string;
    } | {
        id: string;
        name: string;
        category: string;
        description: string;
        priority: number;
        checks: {
            安全操作双人审批: (context: any) => boolean;
            敏感数据加密: (context: any) => boolean;
            外部操作沙箱: (context: any) => boolean;
        };
        antiPattern: string;
    } | {
        id: string;
        name: string;
        category: string;
        description: string;
        priority: number;
        checks: {
            最小权限范围: (context: any) => boolean;
            权限有效期: (context: any) => boolean;
            敏感操作重新验证: (context: any) => boolean;
        };
        antiPattern: string;
    })[];
    patterns: ({
        name: string;
        thresholds: {
            simple: number;
            moderate: number;
        };
        rules: {
            condition: string;
            action: string;
            explanation: string;
        }[];
    } | {
        name: string;
        types: {
            recoverable: {
                explanation: string;
                response: {
                    errorType: string;
                    rootCause: any;
                    recoveryOptions: any;
                    alternatives: any;
                };
            };
            unrecoverable: {
                explanation: string;
                response: {
                    errorType: string;
                    rootCause: any;
                    affectedResources: any;
                    mitigation: any;
                };
            };
        };
    })[];
    boundaries: SafetyBoundary[];
};
export declare class ConstitutionValidator {
    private boundaries;
    validate(context: any): {
        allowed: boolean;
        reasons: string[];
    };
}
export declare function createConstitutionValidator(): ConstitutionValidator;
