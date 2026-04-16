/**
 * TikHub 配置管理
 * 支持中国大陆和中国大陆以外地区的 API 域名
 */
import { TikHubConfig } from './types';
/**
 * 默认配置
 * 中国大陆地区使用 api.tikhub.dev
 * 其他地区使用 api.tikhub.io
 */
export declare const DEFAULT_CONFIG: TikHubConfig;
/**
 * 中国大陆以外的 API 域名
 */
export declare const GLOBAL_BASE_URL = "https://api.tikhub.io";
/**
 * 中国大陆的 API 域名
 */
export declare const CN_BASE_URL = "https://api.tikhub.dev";
/**
 * 根据地区获取 API 域名
 * @param isCn 是否在中国大陆
 * @returns API 域名
 */
export declare function getBaseURL(isCn?: boolean): string;
/**
 * 创建 TikHub 配置
 * @param apiKey API 密钥
 * @param isCn 是否在中国大陆（默认 true）
 * @param overrides 覆盖配置
 * @returns 完整的 TikHub 配置
 */
export declare function createConfig(apiKey?: string, isCn?: boolean, overrides?: Partial<TikHubConfig>): TikHubConfig;
/**
 * 验证配置是否有效
 * @param config 配置对象
 * @returns 是否有效
 */
export declare function validateConfig(config: TikHubConfig): boolean;
/**
 * 从环境变量加载配置
 * @returns TikHub 配置
 */
export declare function loadConfigFromEnv(): TikHubConfig;
