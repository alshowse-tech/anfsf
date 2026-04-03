/**
 * TikHub 服务 - 捷阅证券项目集成
 * 提供统一的社交媒体数据解析接口
 */

import { TikHubClient } from '@/integrations/tikhub';
import {
  VideoInfo,
  NoteInfo,
  ParsedVideo,
  Platform,
  TikHubError,
} from '@/integrations/tikhub';

/**
 * 平台检测正则表达式
 */
const PLATFORM_PATTERNS: Record<Platform, RegExp> = {
  douyin: /(?:douyin\.com|iesdouyin\.com|v\.douyin\.com)/i,
  tiktok: /(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i,
  xiaohongshu: /(?:xiaohongshu\.com|xhslink\.com)/i,
  bilibili: /(?:bilibili\.com|b23\.tv)/i,
};

/**
 * TikHub 服务类
 */
export class TikHubService {
  private client: TikHubClient;

  constructor(apiKey?: string) {
    const configApiKey = apiKey || process.env.TIKHUB_API_KEY;
    
    // 如果没有 API key，使用占位符（会在实际调用时失败）
    this.client = new TikHubClient({
      apiKey: configApiKey || 'placeholder-key',
      baseURL: process.env.TIKHUB_REGION === 'GLOBAL' 
        ? 'https://api.tikhub.io' 
        : 'https://api.tikhub.dev',
    });
  }

  /**
   * 解析视频 URL，自动识别平台并获取数据
   * @param url 社交媒体视频/笔记 URL
   * @returns 解析后的视频数据
   */
  async parseVideoUrl(url: string): Promise<ParsedVideo> {
    const platform = this.detectPlatform(url);
    
    switch (platform) {
      case 'douyin':
        return {
          platform,
          data: await this.client.douyin.getVideoInfo(url),
        };
      case 'tiktok':
        return {
          platform,
          data: await this.client.tiktok.getVideoInfo(url),
        };
      case 'xiaohongshu':
        return {
          platform,
          data: await this.client.xiaohongshu.getNoteInfo(url),
        };
      case 'bilibili':
        return {
          platform,
          data: await this.client.bilibili.getVideoInfo(url),
        };
      default:
        throw new TikHubError(
          `Unsupported platform: ${url}`,
          400,
          'INVALID_REQUEST'
        );
    }
  }

  /**
   * 检测 URL 所属平台
   * @param url 视频 URL
   * @returns 平台类型
   */
  private detectPlatform(url: string): Platform {
    for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
      if (pattern.test(url)) {
        return platform as Platform;
      }
    }
    throw new TikHubError(
      'Unknown platform, please provide a valid social media URL',
      400,
      'INVALID_REQUEST'
    );
  }

  /**
   * 获取抖音视频信息
   */
  async getDouyinVideo(url: string): Promise<VideoInfo> {
    return this.client.douyin.getVideoInfo(url);
  }

  /**
   * 获取抖音用户资料
   */
  async getDouyinUser(userId: string) {
    return this.client.douyin.getUserProfile(userId);
  }

  /**
   * 获取抖音热点榜
   */
  async getDouyinHotList() {
    return this.client.douyin.getHotBillboard();
  }

  /**
   * 搜索抖音视频
   */
  async searchDouyinVideos(keyword: string) {
    return this.client.douyin.searchVideos(keyword);
  }

  /**
   * 获取 TikTok 视频信息
   */
  async getTikTokVideo(url: string): Promise<VideoInfo> {
    return this.client.tiktok.getVideoInfo(url);
  }

  /**
   * 获取 TikTok 用户资料
   */
  async getTikTokUser(userId: string) {
    return this.client.tiktok.getUserProfile(userId);
  }

  /**
   * 获取 TikTok 创作者分析
   */
  async getTikTokCreatorAnalytics(creatorId: string, startDate?: string, endDate?: string) {
    return this.client.tiktok.getCreatorAnalytics(creatorId, startDate, endDate);
  }

  /**
   * 获取小红书笔记信息
   */
  async getXiaohongshuNote(url: string): Promise<NoteInfo> {
    return this.client.xiaohongshu.getNoteInfo(url);
  }

  /**
   * 获取小红书用户资料
   */
  async getXiaohongshuUser(userId: string) {
    return this.client.xiaohongshu.getUserProfile(userId);
  }

  /**
   * 获取 B 站视频信息
   */
  async getBilibiliVideo(url: string): Promise<VideoInfo> {
    return this.client.bilibili.getVideoInfo(url);
  }

  /**
   * 获取 B 站用户资料
   */
  async getBilibiliUser(userId: string) {
    return this.client.bilibili.getUserProfile(userId);
  }

  /**
   * 检查账户余额
   */
  async checkBalance() {
    return this.client.checkBalance();
  }

  /**
   * 检查速率限制
   */
  async checkRateLimit() {
    return this.client.checkRateLimit();
  }
}

export default TikHubService;
