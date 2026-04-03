/**
 * TikHub API 类型定义
 * 涵盖所有支持的社交媒体平台的数据结构
 */

// ==================== 通用类型 ====================

/**
 * 用户资料信息
 */
export interface UserProfile {
  id: string;
  uniqueId: string;
  nickname: string;
  avatar: string;
  signature: string;
  verified: boolean;
  statistics: {
    followerCount: number;
    followingCount: number;
    videoCount: number;
    likeCount: number;
  };
}

/**
 * 视频信息
 */
export interface VideoInfo {
  id: string;
  url: string;
  title: string;
  description: string;
  author: UserProfile;
  statistics: {
    playCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
  };
  media: {
    type: 'video' | 'image';
    urls: string[];
    duration?: number;
    cover?: string;
  };
  createdAt: string;
}

/**
 * 笔记信息（小红书）
 */
export interface NoteInfo {
  id: string;
  url: string;
  title: string;
  description: string;
  author: UserProfile;
  statistics: {
    viewCount: number;
    likeCount: number;
    commentCount: number;
    shareCount: number;
    collectCount: number;
  };
  media: {
    type: 'video' | 'image';
    urls: string[];
    duration?: number;
    cover?: string;
  };
  createdAt: string;
  tags: string[];
}

/**
 * 热点榜单数据
 */
export interface HotList {
  platform: string;
  category: string;
  updatedAt: string;
  items: Array<{
    rank: number;
    title: string;
    hotValue: number;
    videoId?: string;
    url?: string;
  }>;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  keyword: string;
  total: number;
  hasMore: boolean;
  cursor: string;
  items: Array<VideoInfo | NoteInfo>;
}

/**
 * 创作者分析数据
 */
export interface AnalyticsData {
  creatorId: string;
  period: {
    start: string;
    end: string;
  };
  overview: {
    totalViews: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    followerGrowth: number;
  };
  videos: Array<{
    videoId: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    publishedAt: string;
  }>;
}

// ==================== 账户状态类型 ====================

/**
 * 账户余额信息
 */
export interface BalanceInfo {
  balance: number;
  currency: string;
  isFree: boolean;
}

/**
 * 速率限制信息
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// ==================== 错误类型 ====================

/**
 * TikHub API 错误
 */
export class TikHubError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'TikHubError';
  }
}

/**
 * HTTP 状态码映射
 */
export const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
};

/**
 * 错误码映射
 */
export const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

// ==================== 平台类型 ====================

/**
 * 支持的平台
 */
export type Platform = 'douyin' | 'tiktok' | 'xiaohongshu' | 'bilibili';

/**
 * 解析后的视频数据
 */
export interface ParsedVideo {
  platform: Platform;
  data: VideoInfo | NoteInfo;
}

// ==================== 配置类型 ====================

/**
 * TikHub 配置
 */
export interface TikHubConfig {
  apiKey: string;
  baseURL: string;
  timeout: number;
  retryCount: number;
  enableCache: boolean;
}
