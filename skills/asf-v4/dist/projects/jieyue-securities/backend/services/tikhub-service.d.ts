/**
 * TikHub 服务 - 捷阅证券项目集成
 * 提供统一的社交媒体数据解析接口
 */
import { VideoInfo, NoteInfo, ParsedVideo } from '@/integrations/tikhub';
/**
 * TikHub 服务类
 */
export declare class TikHubService {
    private client;
    constructor(apiKey?: string);
    /**
     * 解析视频 URL，自动识别平台并获取数据
     * @param url 社交媒体视频/笔记 URL
     * @returns 解析后的视频数据
     */
    parseVideoUrl(url: string): Promise<ParsedVideo>;
    /**
     * 检测 URL 所属平台
     * @param url 视频 URL
     * @returns 平台类型
     */
    private detectPlatform;
    /**
     * 获取抖音视频信息
     */
    getDouyinVideo(url: string): Promise<VideoInfo>;
    /**
     * 获取抖音用户资料
     */
    getDouyinUser(userId: string): Promise<any>;
    /**
     * 获取抖音热点榜
     */
    getDouyinHotList(): Promise<any>;
    /**
     * 搜索抖音视频
     */
    searchDouyinVideos(keyword: string): Promise<any>;
    /**
     * 获取 TikTok 视频信息
     */
    getTikTokVideo(url: string): Promise<VideoInfo>;
    /**
     * 获取 TikTok 用户资料
     */
    getTikTokUser(userId: string): Promise<any>;
    /**
     * 获取 TikTok 创作者分析
     */
    getTikTokCreatorAnalytics(creatorId: string, startDate?: string, endDate?: string): Promise<any>;
    /**
     * 获取小红书笔记信息
     */
    getXiaohongshuNote(url: string): Promise<NoteInfo>;
    /**
     * 获取小红书用户资料
     */
    getXiaohongshuUser(userId: string): Promise<any>;
    /**
     * 获取 B 站视频信息
     */
    getBilibiliVideo(url: string): Promise<VideoInfo>;
    /**
     * 获取 B 站用户资料
     */
    getBilibiliUser(userId: string): Promise<any>;
    /**
     * 检查账户余额
     */
    checkBalance(): Promise<any>;
    /**
     * 检查速率限制
     */
    checkRateLimit(): Promise<any>;
}
export default TikHubService;
