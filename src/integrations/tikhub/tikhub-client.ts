/**
 * TikHub API 客户端
 * 提供对所有支持的社交媒体平台的统一访问接口
 */

import { TikHubConfig } from './types';
import {
  VideoInfo,
  UserProfile,
  NoteInfo,
  HotList,
  SearchResult,
  AnalyticsData,
  BalanceInfo,
  RateLimitInfo,
  TikHubError,
  ERROR_CODES,
  HTTP_STATUS,
} from './types';
import { DEFAULT_CONFIG, validateConfig } from './config';

/**
 * TikHub API 客户端类
 */
export class TikHubClient {
  private apiKey: string;
  private baseURL: string;
  private timeout: number;
  private retryCount: number;
  private enableCache: boolean;
  private cache: Map<string, { data: any; expires: number }> = new Map();

  constructor(config: Partial<TikHubConfig> = {}) {
    const finalConfig = {
      ...DEFAULT_CONFIG,
      ...config,
      apiKey: config.apiKey || process.env.TIKHUB_API_KEY || '',
    };

    if (!validateConfig(finalConfig)) {
      throw new TikHubError(
        'Invalid configuration: API key is required',
        HTTP_STATUS.BAD_REQUEST,
        ERROR_CODES.INVALID_REQUEST
      );
    }

    this.apiKey = finalConfig.apiKey;
    this.baseURL = finalConfig.baseURL;
    this.timeout = finalConfig.timeout;
    this.retryCount = finalConfig.retryCount;
    this.enableCache = finalConfig.enableCache;
  }

  // ==================== 通用 HTTP 方法 ====================

  /**
   * 发送 GET 请求
   */
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.request<T>('GET', url.toString());
  }

  /**
   * 发送 POST 请求
   */
  async post<T>(endpoint: string, data?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, this.baseURL);
    return this.request<T>('POST', url.toString(), data);
  }

  /**
   * 通用请求方法，带重试和错误处理
   */
  private async request<T>(
    method: string,
    url: string,
    body?: Record<string, any>
  ): Promise<T> {
    const cacheKey = `${method}:${url}:${JSON.stringify(body || {})}`;

    // 检查缓存
    if (this.enableCache && method === 'GET') {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        return cached.data as T;
      }
    }

    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 处理响应
        if (!response.ok) {
          throw await this.handleError(response);
        }

        const result = await response.json();

        // 缓存 GET 请求结果
        if (this.enableCache && method === 'GET') {
          const cacheTTL = 5 * 60 * 1000; // 5 分钟
          this.cache.set(cacheKey, {
            data: result,
            expires: Date.now() + cacheTTL,
          });
        }

        return result as T;
      } catch (error) {
        lastError = error as Error;
        
        // 如果是认证错误或余额不足，不重试
        if (error instanceof TikHubError && 
            (error.statusCode === HTTP_STATUS.UNAUTHORIZED || error.statusCode === HTTP_STATUS.PAYMENT_REQUIRED)) {
          throw error;
        }

        // 等待后重试（指数退避）
        if (attempt < this.retryCount) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new TikHubError(
      'Request failed after all retries',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      ERROR_CODES.SERVER_ERROR
    );
  }

  /**
   * 处理 HTTP 错误响应
   */
  private async handleError(response: Response): Promise<TikHubError> {
    let errorBody: any = {};
    try {
      errorBody = await response.json();
    } catch {
      // 忽略解析错误
    }

    const statusCode = response.status;
    let code = ERROR_CODES.UNKNOWN_ERROR;
    let message = errorBody.message || `HTTP ${statusCode}`;

    switch (statusCode) {
      case HTTP_STATUS.BAD_REQUEST:
        code = ERROR_CODES.INVALID_REQUEST;
        break;
      case HTTP_STATUS.UNAUTHORIZED:
        code = ERROR_CODES.INVALID_TOKEN;
        message = errorBody.message || 'API token is invalid or expired';
        break;
      case HTTP_STATUS.PAYMENT_REQUIRED:
        code = ERROR_CODES.INSUFFICIENT_BALANCE;
        message = errorBody.message || 'Insufficient balance';
        break;
      case HTTP_STATUS.FORBIDDEN:
        code = ERROR_CODES.INSUFFICIENT_PERMISSIONS;
        break;
      case HTTP_STATUS.NOT_FOUND:
        code = ERROR_CODES.DATA_NOT_FOUND;
        break;
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        code = ERROR_CODES.RATE_LIMIT_EXCEEDED;
        break;
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        code = ERROR_CODES.SERVER_ERROR;
        break;
    }

    return new TikHubError(message, statusCode, code);
  }

  // ==================== 抖音接口 ====================

  douyin = {
    /**
     * 获取抖音视频信息
     */
    getVideoInfo: async (url: string): Promise<VideoInfo> => {
      return this.get<VideoInfo>('/api/douyin/video_detail', { url });
    },

    /**
     * 获取抖音用户资料
     */
    getUserProfile: async (userId: string): Promise<UserProfile> => {
      return this.get<UserProfile>('/api/douyin/user_profile', { user_id: userId });
    },

    /**
     * 获取抖音热点榜
     */
    getHotBillboard: async (): Promise<HotList> => {
      return this.get<HotList>('/api/douyin/hot_list');
    },

    /**
     * 搜索抖音视频
     */
    searchVideos: async (keyword: string, cursor?: string): Promise<SearchResult> => {
      return this.get<SearchResult>('/api/douyin/search/video', { keyword, cursor });
    },
  };

  // ==================== TikTok 接口 ====================

  tiktok = {
    /**
     * 获取 TikTok 视频信息
     */
    getVideoInfo: async (url: string): Promise<VideoInfo> => {
      return this.get<VideoInfo>('/api/tiktok/video_detail', { url });
    },

    /**
     * 获取 TikTok 用户资料
     */
    getUserProfile: async (userId: string): Promise<UserProfile> => {
      return this.get<UserProfile>('/api/tiktok/user_profile', { user_id: userId });
    },

    /**
     * 获取 TikTok 创作者分析数据
     */
    getCreatorAnalytics: async (
      creatorId: string,
      startDate?: string,
      endDate?: string
    ): Promise<AnalyticsData> => {
      return this.get<AnalyticsData>('/api/tiktok/creator_analytics', {
        creator_id: creatorId,
        start_date: startDate,
        end_date: endDate,
      });
    },
  };

  // ==================== 小红书接口 ====================

  xiaohongshu = {
    /**
     * 获取小红书笔记信息
     */
    getNoteInfo: async (url: string): Promise<NoteInfo> => {
      return this.get<NoteInfo>('/api/xiaohongshu/note_detail', { url });
    },

    /**
     * 获取小红书用户资料
     */
    getUserProfile: async (userId: string): Promise<UserProfile> => {
      return this.get<UserProfile>('/api/xiaohongshu/user_profile', { user_id: userId });
    },
  };

  // ==================== 哔哩哔哩接口 ====================

  bilibili = {
    /**
     * 获取 B 站视频信息
     */
    getVideoInfo: async (url: string): Promise<VideoInfo> => {
      return this.get<VideoInfo>('/api/bilibili/video_detail', { url });
    },

    /**
     * 获取 B 站用户资料
     */
    getUserProfile: async (userId: string): Promise<UserProfile> => {
      return this.get<UserProfile>('/api/bilibili/user_profile', { user_id: userId });
    },
  };

  // ==================== 状态管理接口 ====================

  /**
   * 检查账户余额
   */
  async checkBalance(): Promise<BalanceInfo> {
    return this.get<BalanceInfo>('/api/user/balance');
  }

  /**
   * 检查速率限制
   */
  async checkRateLimit(): Promise<RateLimitInfo> {
    return this.get<RateLimitInfo>('/api/user/rate_limit');
  }

  // ==================== 缓存管理 ====================

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 清除特定缓存
   */
  invalidateCache(key: string): void {
    this.cache.delete(key);
  }
}

export default TikHubClient;
