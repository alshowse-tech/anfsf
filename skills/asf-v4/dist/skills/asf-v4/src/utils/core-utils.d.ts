/**
 * Core Utilities - ANFSF v2.0
 *
 * 核心工具函数集合，提供通用的计算和验证功能
 *
 * @module asf-v4/utils/core-utils
 */
/**
 * 计算角色成本
 * @param role 角色对象
 * @returns 成本数值
 */
export declare function computeRoleCost(role: any): number;
/**
 * 计算经济学评分
 * @param roles 角色数组
 * @param totalBudget 总预算
 * @returns 经济学评分 (0-1)
 */
export declare function computeEconomicsScore(roles: any[], totalBudget: number): number;
/**
 * 计算接口成本
 * @param interfaces 接口数组
 * @returns 接口总成本
 */
export declare function computeInterfaceCost(interfaces: any[]): number;
/**
 * 预测单个任务的返工风险
 * @param task 任务对象
 * @returns 返工风险 (0-1)
 */
export declare function predictReworkRisk(task: any): number;
/**
 * 计算任务组的总返工风险
 * @param tasks 任务数组
 * @returns 平均返工风险
 */
export declare function computeTotalReworkRisk(tasks: any[]): number;
/**
 * 确定最优角色数量
 * @param complexity 复杂度
 * @returns 角色数量
 */
export declare function determineOptimalRoleCount(complexity: number): number;
/**
 * 计算合同耦合边界
 * @param roles 角色数组
 * @returns 耦合度 (0-1)
 */
export declare function computeContractCouplingBound(roles: any[]): number;
/**
 * 生成所有权证明
 * @param resource 资源对象
 * @returns 证明字符串
 */
export declare function generateOwnershipProof(resource: any): string;
/**
 * 验证证明列表
 * @param proofs 证明数组
 * @returns 验证结果
 */
export declare function validateProofs(proofs: any[]): boolean;
/**
 * 规范化资源
 * @param resource 资源对象
 * @returns 规范化后的资源
 */
export declare function canonicalizeResource(resource: any): any;
/**
 * 解决所有权冲突
 * @param conflict 冲突对象
 * @returns 解决方案
 */
export declare function resolveOwnershipConflict(conflict: any): {
    resolved: boolean;
    solution: any;
};
