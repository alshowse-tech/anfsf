/**
 * Design System 配置加载器
 *
 * 层级：Layer 8.5.6 - UI Contract Pack
 * 功能：读取 design-mapping.yaml，关键词匹配设计系统
 * 版本：V1.0.0
 * 状态：✅ 完成
 */
export interface DesignMappingConfig {
    version: string;
    default: string;
    keywords: Record<string, string>;
    excludes: Array<{
        pattern: string;
        design: string;
    }>;
    aliases: Record<string, string[]>;
    designSystems: Record<string, DesignSystemMeta>;
}
export interface DesignSystemMeta {
    name: string;
    description: string;
    tags: string[];
    primaryColor: string;
    darkMode: boolean;
}
export interface MatchResult {
    designSystem: string;
    matchedBy: 'user_specified' | 'keyword' | 'alias' | 'default';
    confidence: number;
    metadata?: DesignSystemMeta;
}
export declare class DesignSystemConfigLoader {
    private static instance;
    private config;
    private configPath;
    private lastModified;
    private fileWatcher;
    private constructor();
    static getInstance(configPath?: string): DesignSystemConfigLoader;
    /**
     * 加载配置文件
     */
    private loadConfig;
    /**
     * 解析 YAML (使用 js-yaml)
     */
    private parseYaml;
    /**
     * 获取默认配置
     */
    private getDefaultConfig;
    /**
     * 监听配置文件变化
     */
    private watchConfigFile;
    /**
     * 重新加载配置
     */
    private reload;
    /**
     * 匹配设计系统
     */
    match(text: string): MatchResult;
    /**
     * 提取用户指定的设计系统
     */
    private extractUserSpecified;
    /**
     * 解析别名
     */
    resolveAlias(input: string): string | null;
    /**
     * 检查排除规则
     */
    private isExcluded;
    /**
     * 获取默认设计系统
     */
    getDefault(): string;
    /**
     * 获取所有设计系统元数据
     */
    getAllDesignSystems(): Record<string, DesignSystemMeta>;
    /**
     * 获取配置版本
     */
    getVersion(): string;
    /**
     * 清理资源
     */
    dispose(): void;
}
export default DesignSystemConfigLoader;
