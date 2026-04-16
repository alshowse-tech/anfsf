/**
 * MemPalace Wing Manager - ANFSF V1.5.0 优化版
 *
 * 支持中大型项目的模块化 Wing 隔离管理
 *
 * @module asf-v4/memory/mempalace-wing-manager
 */
import { RefinedGraph } from '../../core/types';
export interface WingConfig {
    name: string;
    scope: string;
    maxSize: number;
    ttl: number;
    isolation: boolean;
}
export interface WingState {
    config: WingConfig;
    entries: Map<string, any>;
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
}
export declare class MemPalaceWingManager {
    private wings;
    private defaultConfig;
    constructor();
    /**
     * 创建 Wing
     */
    createWing(name: string, graph: RefinedGraph): Promise<void>;
    /**
     * 初始化 Wing 数据
     */
    private initializeWing;
    /**
     * 获取 Wing
     */
    getWing(name: string): WingState | undefined;
    /**
     * 存储数据到 Wing
     */
    set<T>(wingName: string, key: string, value: T): void;
    /**
     * 从 Wing 获取数据
     */
    get<T>(wingName: string, key: string): T | undefined;
    /**
     * 清除过期 Wing
     */
    cleanupExpired(): number;
    /**
     * 驱逐最旧数据
     */
    private evictOldest;
    /**
     * 获取 Wing 状态报告
     */
    getStatus(): {
        totalWings: number;
        totalEntries: number;
        wings: Array<{
            name: string;
            scope: string;
            entries: number;
            accessCount: number;
            age: number;
        }>;
    };
}
export declare function getGlobalWingManager(): MemPalaceWingManager;
export declare function createWingManager(): MemPalaceWingManager;
