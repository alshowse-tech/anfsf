/**
 * 治理配置持久化存储
 *
 * 层级：Layer 8.5 - Governance Control Plane
 * 功能：治理配置持久化、版本管理、热更新
 * 版本：V1.0.0
 * 状态：🟡 开发中
 */
import { GovernanceConfig, SandboxConfig } from './comfyui-workflow-orchestrator';
import { QualityGuardConfig, RollbackConfig } from './video-quality-guard';
import { MCPBusConfig } from './mcp-video-bus';
/**
 * 配置版本
 */
export interface ConfigVersion {
    /** 版本号 */
    version: string;
    /** 创建时间 */
    createdAt: number;
    /** 创建者 */
    createdBy: string;
    /** 变更说明 */
    changeDescription?: string;
}
/**
 * 配置快照
 */
export interface ConfigSnapshot {
    /** 配置 ID */
    id: string;
    /** 配置版本 */
    version: ConfigVersion;
    /** 治理配置 */
    governance: GovernanceConfig;
    /** 沙箱配置 */
    sandbox: SandboxConfig;
    /** 质量门禁配置 */
    qualityGuard: QualityGuardConfig;
    /** 回滚配置 */
    rollback: RollbackConfig;
    /** MCP 总线配置 */
    mcpBus: MCPBusConfig;
    /** 是否激活 */
    isActive: boolean;
}
/**
 * 配置存储接口
 */
export interface ConfigStore {
    /** 保存配置 */
    save(snapshot: ConfigSnapshot): Promise<void>;
    /** 获取配置 */
    get(id: string): Promise<ConfigSnapshot | undefined>;
    /** 获取激活配置 */
    getActive(): Promise<ConfigSnapshot | undefined>;
    /** 激活配置 */
    activate(id: string): Promise<void>;
    /** 列出所有配置 */
    list(): Promise<ConfigSnapshot[]>;
    /** 删除配置 */
    delete(id: string): Promise<void>;
}
/**
 * 配置验证结果
 */
export interface ConfigValidationResult {
    /** 是否有效 */
    valid: boolean;
    /** 错误信息 */
    errors: string[];
    /** 警告信息 */
    warnings: string[];
}
/**
 * 内存配置存储 (生产环境可替换为数据库存储)
 */
export declare class InMemoryConfigStore implements ConfigStore {
    private store;
    private activeConfigId;
    save(snapshot: ConfigSnapshot): Promise<void>;
    get(id: string): Promise<ConfigSnapshot | undefined>;
    getActive(): Promise<ConfigSnapshot | undefined>;
    activate(id: string): Promise<void>;
    list(): Promise<ConfigSnapshot[]>;
    delete(id: string): Promise<void>;
    /**
     * 创建默认配置快照
     */
    createDefaultSnapshot(createdBy?: string): ConfigSnapshot;
    /**
     * 验证配置
     */
    private validateConfig;
}
/**
 * 配置管理器
 */
export declare class ConfigManager {
    private store;
    private changeListeners;
    constructor(store?: ConfigStore);
    /**
     * 初始化默认配置
     */
    initialize(createdBy?: string): Promise<ConfigSnapshot>;
    /**
     * 获取当前配置
     */
    getCurrentConfig(): Promise<ConfigSnapshot>;
    /**
     * 创建配置副本
     */
    cloneConfig(baseId: string, newVersion: string, changeDescription: string): Promise<ConfigSnapshot>;
    /**
     * 更新配置
     */
    updateConfig(id: string, updates: Partial<ConfigSnapshot>): Promise<ConfigSnapshot>;
    /**
     * 激活配置
     */
    activateConfig(id: string): Promise<void>;
    /**
     * 列出所有配置
     */
    listConfigs(): Promise<ConfigSnapshot[]>;
    /**
     * 注册配置变更监听器
     */
    onChange(listener: (snapshot: ConfigSnapshot) => void): void;
    /**
     * 导出配置为 JSON
     */
    exportConfig(id: string): Promise<string>;
    /**
     * 从 JSON 导入配置
     */
    importConfig(json: string): Promise<ConfigSnapshot>;
    private notifyChangeListeners;
}
export default ConfigManager;
