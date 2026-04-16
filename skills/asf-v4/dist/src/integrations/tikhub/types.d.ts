/**
 * TikHub API 类型定义
 * 涵盖所有支持的社交媒体平台的数据结构
 */
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
/**
 * TikHub API 错误
 */
export declare class TikHubError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode: number, code: string);
}
/**
 * HTTP 状态码映射
 */
export declare const HTTP_STATUS: {
    BAD_REQUEST: number;
    UNAUTHORIZED: number;
    PAYMENT_REQUIRED: number;
    FORBIDDEN: number;
    NOT_FOUND: number;
    TOO_MANY_REQUESTS: number;
    INTERNAL_SERVER_ERROR: number;
};
/**
 * 错误码映射
 */
export declare const ERROR_CODES: {
    INVALID_REQUEST: string;
    INVALID_TOKEN: string;
    TOKEN_EXPIRED: string;
    INSUFFICIENT_PERMISSIONS: string;
    INSUFFICIENT_BALANCE: string;
    DATA_NOT_FOUND: string;
    RATE_LIMIT_EXCEEDED: string;
    SERVER_ERROR: string;
    UNKNOWN_ERROR: string;
};
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
