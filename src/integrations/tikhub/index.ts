/**
 * TikHub SDK 导出
 * 统一导出所有类型、配置和客户端
 */

// 客户端
export { TikHubClient } from './tikhub-client';
export { default as TikHubClientDefault } from './tikhub-client';

// 配置
export {
  DEFAULT_CONFIG,
  GLOBAL_BASE_URL,
  CN_BASE_URL,
  getBaseURL,
  createConfig,
  validateConfig,
  loadConfigFromEnv,
} from './config';

// 类型
export type {
  UserProfile,
  VideoInfo,
  NoteInfo,
  HotList,
  SearchResult,
  AnalyticsData,
  BalanceInfo,
  RateLimitInfo,
  ParsedVideo,
  TikHubConfig,
  Platform,
} from './types';

// 错误
export { TikHubError, HTTP_STATUS, ERROR_CODES } from './types';
