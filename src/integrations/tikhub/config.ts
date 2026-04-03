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
export const DEFAULT_CONFIG: TikHubConfig = {
  apiKey: process.env.TIKHUB_API_KEY || '',
  baseURL: 'https://api.tikhub.dev', // 中国大陆使用
  timeout: 30000,
  retryCount: 3,
  enableCache: true,
};

/**
 * 中国大陆以外的 API 域名
 */
export const GLOBAL_BASE_URL = 'https://api.tikhub.io';

/**
 * 中国大陆的 API 域名
 */
export const CN_BASE_URL = 'https://api.tikhub.dev';

/**
 * 根据地区获取 API 域名
 * @param isCn 是否在中国大陆
 * @returns API 域名
 */
export function getBaseURL(isCn: boolean = true): string {
  return isCn ? CN_BASE_URL : GLOBAL_BASE_URL;
}

/**
 * 创建 TikHub 配置
 * @param apiKey API 密钥
 * @param isCn 是否在中国大陆（默认 true）
 * @param overrides 覆盖配置
 * @returns 完整的 TikHub 配置
 */
export function createConfig(
  apiKey?: string,
  isCn: boolean = true,
  overrides?: Partial<TikHubConfig>
): TikHubConfig {
  return {
    ...DEFAULT_CONFIG,
    apiKey: apiKey || process.env.TIKHUB_API_KEY || '',
    baseURL: getBaseURL(isCn),
    ...overrides,
  };
}

/**
 * 验证配置是否有效
 * @param config 配置对象
 * @returns 是否有效
 */
export function validateConfig(config: TikHubConfig): boolean {
  if (!config.apiKey || config.apiKey.trim() === '') {
    return false;
  }
  if (!config.baseURL || !config.baseURL.startsWith('https://')) {
    return false;
  }
  if (config.timeout <= 0) {
    return false;
  }
  if (config.retryCount < 0) {
    return false;
  }
  return true;
}

/**
 * 从环境变量加载配置
 * @returns TikHub 配置
 */
export function loadConfigFromEnv(): TikHubConfig {
  const isCn = process.env.TIKHUB_REGION === 'CN' || process.env.TIKHUB_REGION !== 'GLOBAL';
  
  return {
    apiKey: process.env.TIKHUB_API_KEY || '',
    baseURL: isCn ? CN_BASE_URL : GLOBAL_BASE_URL,
    timeout: parseInt(process.env.TIKHUB_TIMEOUT || '30000', 10),
    retryCount: parseInt(process.env.TIKHUB_RETRY_COUNT || '3', 10),
    enableCache: process.env.TIKHUB_ENABLE_CACHE !== 'false',
  };
}
