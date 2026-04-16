/**
 * TikHub API 客户端
 * 提供对所有支持的社交媒体平台的统一访问接口
 */
import { TikHubConfig } from './types';
import { VideoInfo, UserProfile, NoteInfo, HotList, SearchResult, AnalyticsData, BalanceInfo, RateLimitInfo } from './types';
/**
 * TikHub API 客户端类
 */
export declare class TikHubClient {
    private apiKey;
    private baseURL;
    private timeout;
    private retryCount;
    private enableCache;
    private cache;
    constructor(config?: Partial<TikHubConfig>);
    /**
     * 发送 GET 请求
     */
    get<T>(endpoint: string, params?: Record<string, any>): Promise<T>;
    /**
     * 发送 POST 请求
     */
    post<T>(endpoint: string, data?: Record<string, any>): Promise<T>;
    /**
     * 通用请求方法，带重试和错误处理
     */
    private request;
    /**
     * 处理 HTTP 错误响应
     */
    private handleError;
    douyin: {
        /**
         * 获取抖音视频信息
         */
        getVideoInfo: (url: string) => Promise<VideoInfo>;
        /**
         * 获取抖音用户资料
         */
        getUserProfile: (userId: string) => Promise<UserProfile>;
        /**
         * 获取抖音热点榜
         */
        getHotBillboard: () => Promise<HotList>;
        /**
         * 搜索抖音视频
         */
        searchVideos: (keyword: string, cursor?: string) => Promise<SearchResult>;
    };
    tiktok: {
        /**
         * 获取 TikTok 视频信息
         */
        getVideoInfo: (url: string) => Promise<VideoInfo>;
        /**
         * 获取 TikTok 用户资料
         */
        getUserProfile: (userId: string) => Promise<UserProfile>;
        /**
         * 获取 TikTok 创作者分析数据
         */
        getCreatorAnalytics: (creatorId: string, startDate?: string, endDate?: string) => Promise<AnalyticsData>;
    };
    xiaohongshu: {
        /**
         * 获取小红书笔记信息
         */
        getNoteInfo: (url: string) => Promise<NoteInfo>;
        /**
         * 获取小红书用户资料
         */
        getUserProfile: (userId: string) => Promise<UserProfile>;
    };
    bilibili: {
        /**
         * 获取 B 站视频信息
         */
        getVideoInfo: (url: string) => Promise<VideoInfo>;
        /**
         * 获取 B 站用户资料
         */
        getUserProfile: (userId: string) => Promise<UserProfile>;
    };
    /**
     * 检查账户余额
     */
    checkBalance(): Promise<BalanceInfo>;
    /**
     * 检查速率限制
     */
    checkRateLimit(): Promise<RateLimitInfo>;
    /**
     * 清除所有缓存
     */
    clearCache(): void;
    /**
     * 清除特定缓存
     */
    invalidateCache(key: string): void;
}
export default TikHubClient;
