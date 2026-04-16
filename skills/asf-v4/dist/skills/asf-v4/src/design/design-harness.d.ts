/**
 * Design UI/UX Harness 集成
 *
 * 层级：Layer 8.5.6 - UI Contract Pack
 * 功能：将 DesignSystemConfigLoader 集成到 ANFSF UI/UX Harness
 * 版本：V1.0.0
 * 状态：✅ 完成
 */
import { MatchResult, DesignSystemMeta } from './design-system-config';
export interface DesignContext {
    requirement: string;
    matchedDesign?: MatchResult;
    designContent?: string;
}
export interface DesignSystemResponse {
    designSystem: string;
    matchedBy: 'user_specified' | 'keyword' | 'alias' | 'default';
    confidence: number;
    metadata?: DesignSystemMeta;
    designContent?: string;
    error?: string;
}
/**
 * UI/UX Design Harness
 *
 * 负责根据用户需求匹配设计系统，并加载对应的 DESIGN.md 内容
 */
export declare class DesignHarness {
    private configLoader;
    private designSystemsPath;
    constructor(designSystemsPath?: string);
    /**
     * 根据需求匹配设计系统
     *
     * @param requirement 用户需求描述
     * @returns 设计系统匹配结果
     */
    match(requirement: string): DesignSystemResponse;
    /**
     * 获取设计系统内容
     *
     * @param designSystemName 设计系统名称
     * @returns DESIGN.md 内容
     */
    getDesignContent(designSystemName: string): string | null;
    /**
     * 根据需求匹配并获取设计系统内容
     *
     * @param requirement 用户需求描述
     * @returns 完整的设计系统响应
     */
    matchWithContent(requirement: string): DesignSystemResponse;
    /**
     * 获取所有可用的设计系统
     *
     * @returns 设计系统元数据列表
     */
    getAllDesignSystems(): Record<string, DesignSystemMeta>;
    /**
     * 获取设计系统列表（仅名称）
     *
     * @returns 设计系统名称数组
     */
    getDesignSystemList(): string[];
    /**
     * 获取默认设计系统
     *
     * @returns 默认设计系统名称
     */
    getDefault(): string;
    /**
     * 获取配置版本
     *
     * @returns 配置版本号
     */
    getVersion(): string;
    /**
     * 验证设计系统是否存在
     *
     * @param designSystemName 设计系统名称
     * @returns 是否存在
     */
    exists(designSystemName: string): boolean;
    /**
     * 搜索设计系统
     *
     * @param query 搜索关键词
     * @returns 匹配的设计系统列表
     */
    search(query: string): DesignSystemResponse[];
}
export declare function getDesignHarness(designSystemsPath?: string): DesignHarness;
export default DesignHarness;
