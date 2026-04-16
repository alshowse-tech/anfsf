"use strict";
/**
 * TikHub 服务 - 捷阅证券项目集成
 * 提供统一的社交媒体数据解析接口
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TikHubService = void 0;
const tikhub_1 = require("@/integrations/tikhub");
const tikhub_2 = require("@/integrations/tikhub");
/**
 * 平台检测正则表达式
 */
const PLATFORM_PATTERNS = {
    douyin: /(?:douyin\.com|iesdouyin\.com|v\.douyin\.com)/i,
    tiktok: /(?:tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)/i,
    xiaohongshu: /(?:xiaohongshu\.com|xhslink\.com)/i,
    bilibili: /(?:bilibili\.com|b23\.tv)/i,
};
/**
 * TikHub 服务类
 */
class TikHubService {
    constructor(apiKey) {
        const configApiKey = apiKey || process.env.TIKHUB_API_KEY;
        // 如果没有 API key，使用占位符（会在实际调用时失败）
        this.client = new tikhub_1.TikHubClient({
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
    async parseVideoUrl(url) {
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
                throw new tikhub_2.TikHubError(`Unsupported platform: ${url}`, 400, 'INVALID_REQUEST');
        }
    }
    /**
     * 检测 URL 所属平台
     * @param url 视频 URL
     * @returns 平台类型
     */
    detectPlatform(url) {
        for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
            if (pattern.test(url)) {
                return platform;
            }
        }
        throw new tikhub_2.TikHubError('Unknown platform, please provide a valid social media URL', 400, 'INVALID_REQUEST');
    }
    /**
     * 获取抖音视频信息
     */
    async getDouyinVideo(url) {
        return this.client.douyin.getVideoInfo(url);
    }
    /**
     * 获取抖音用户资料
     */
    async getDouyinUser(userId) {
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
    async searchDouyinVideos(keyword) {
        return this.client.douyin.searchVideos(keyword);
    }
    /**
     * 获取 TikTok 视频信息
     */
    async getTikTokVideo(url) {
        return this.client.tiktok.getVideoInfo(url);
    }
    /**
     * 获取 TikTok 用户资料
     */
    async getTikTokUser(userId) {
        return this.client.tiktok.getUserProfile(userId);
    }
    /**
     * 获取 TikTok 创作者分析
     */
    async getTikTokCreatorAnalytics(creatorId, startDate, endDate) {
        return this.client.tiktok.getCreatorAnalytics(creatorId, startDate, endDate);
    }
    /**
     * 获取小红书笔记信息
     */
    async getXiaohongshuNote(url) {
        return this.client.xiaohongshu.getNoteInfo(url);
    }
    /**
     * 获取小红书用户资料
     */
    async getXiaohongshuUser(userId) {
        return this.client.xiaohongshu.getUserProfile(userId);
    }
    /**
     * 获取 B 站视频信息
     */
    async getBilibiliVideo(url) {
        return this.client.bilibili.getVideoInfo(url);
    }
    /**
     * 获取 B 站用户资料
     */
    async getBilibiliUser(userId) {
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
exports.TikHubService = TikHubService;
exports.default = TikHubService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGlraHViLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9wcm9qZWN0cy9qaWV5dWUtc2VjdXJpdGllcy9iYWNrZW5kL3NlcnZpY2VzL3Rpa2h1Yi1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILGtEQUFxRDtBQUNyRCxrREFNK0I7QUFFL0I7O0dBRUc7QUFDSCxNQUFNLGlCQUFpQixHQUE2QjtJQUNsRCxNQUFNLEVBQUUsZ0RBQWdEO0lBQ3hELE1BQU0sRUFBRSxrREFBa0Q7SUFDMUQsV0FBVyxFQUFFLG9DQUFvQztJQUNqRCxRQUFRLEVBQUUsNEJBQTRCO0NBQ3ZDLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQWEsYUFBYTtJQUd4QixZQUFZLE1BQWU7UUFDekIsTUFBTSxZQUFZLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDO1FBRTFELGdDQUFnQztRQUNoQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUkscUJBQVksQ0FBQztZQUM3QixNQUFNLEVBQUUsWUFBWSxJQUFJLGlCQUFpQjtZQUN6QyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLEtBQUssUUFBUTtnQkFDN0MsQ0FBQyxDQUFDLHVCQUF1QjtnQkFDekIsQ0FBQyxDQUFDLHdCQUF3QjtTQUM3QixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsR0FBVztRQUM3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTFDLFFBQVEsUUFBUSxFQUFFLENBQUM7WUFDakIsS0FBSyxRQUFRO2dCQUNYLE9BQU87b0JBQ0wsUUFBUTtvQkFDUixJQUFJLEVBQUUsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxD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LE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFXO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBYztRQUNsQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsWUFBWTtRQUNoQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7SUFDcEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGNBQWM7UUFDbEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQ3RDLENBQUM7Q0FDRjtBQWpLRCxzQ0FpS0M7QUFFRCxrQkFBZSxhQUFhLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFRpa0h1YiDmnI3liqEgLSDmjbfpmIXor4HliLjpobnnm67pm4bmiJBcbiAqIOaPkOS+m+e7n+S4gOeahOekvuS6pOWqkuS9k+aVsOaNruino+aekOaOpeWPo1xuICovXG5cbmltcG9ydCB7IFRpa0h1YkNsaWVudCB9IGZyb20gJ0AvaW50ZWdyYXRpb25zL3Rpa2h1Yic7XG5pbXBvcnQge1xuICBWaWRlb0luZm8sXG4gIE5vdGVJbmZvLFxuICBQYXJzZWRWaWRlbyxcbiAgUGxhdGZvcm0sXG4gIFRpa0h1YkVycm9yLFxufSBmcm9tICdAL2ludGVncmF0aW9ucy90aWtodWInO1xuXG4vKipcbiAqIOW5s+WPsOajgOa1i+ato+WImeihqOi+vuW8j1xuICovXG5jb25zdCBQTEFURk9STV9QQVRURVJOUzogUmVjb3JkPFBsYXRmb3JtLCBSZWdFeHA+ID0ge1xuICBkb3V5aW46IC8oPzpkb3V5aW5cXC5jb218aWVzZG91eWluXFwuY29tfHZcXC5kb3V5aW5cXC5jb20pL2ksXG4gIHRpa3RvazogLyg/OnRpa3Rva1xcLmNvbXx2bVxcLnRpa3Rva1xcLmNvbXx2dFxcLnRpa3Rva1xcLmNvbSkvaSxcbiAgeGlhb2hvbmdzaHU6IC8oPzp4aWFvaG9uZ3NodVxcLmNvbXx4aHNsaW5rXFwuY29tKS9pLFxuICBiaWxpYmlsaTogLyg/OmJpbGliaWxpXFwuY29tfGIyM1xcLnR2KS9pLFxufTtcblxuLyoqXG4gKiBUaWtIdWIg5pyN5Yqh57G7XG4gKi9cbmV4cG9ydCBjbGFzcyBUaWtIdWJTZXJ2aWNlIHtcbiAgcHJpdmF0ZSBjbGllbnQ6IFRpa0h1YkNsaWVudDtcblxuICBjb25zdHJ1Y3RvcihhcGlLZXk/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb25maWdBcGlLZXkgPSBhcGlLZXkgfHwgcHJvY2Vzcy5lbnYuVElLSFVCX0FQSV9LRVk7XG4gICAgXG4gICAgLy8g5aaC5p6c5rKh5pyJIEFQSSBrZXnvvIzkvb/nlKjljaDkvY3nrKbvvIjkvJrlnKjlrp7pmYXosIPnlKjml7blpLHotKXvvIlcbiAgICB0aGlzLmNsaWVudCA9IG5ldyBUaWtIdWJDbGllbnQoe1xuICAgICAgYXBpS2V5OiBjb25maWdBcGlLZXkgfHwgJ3BsYWNlaG9sZGVyLWtleScsXG4gICAgICBiYXNlVVJMOiBwcm9jZXNzLmVudi5USUtIVUJfUkVHSU9OID09PSAnR0xPQkFMJyBcbiAgICAgICAgPyAnaHR0cHM6Ly9hcGkudGlraHViLmlvJyBcbiAgICAgICAgOiAnaHR0cHM6Ly9hcGkudGlraHViLmRldicsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICog6Kej5p6Q6KeG6aKRIFVSTO+8jOiHquWKqOivhuWIq+W5s+WPsOW5tuiOt+WPluaVsOaNrlxuICAgKiBAcGFyYW0gdXJsIOekvuS6pOWqkuS9k+inhumikS/nrJTorrAgVVJMXG4gICAqIEByZXR1cm5zIOino+aekOWQjueahOinhumikeaVsOaNrlxuICAgKi9cbiAgYXN5bmMgcGFyc2VWaWRlb1VybCh1cmw6IHN0cmluZyk6IFByb21pc2U8UGFyc2VkVmlkZW8+IHtcbiAgICBjb25zdCBwbGF0Zm9ybSA9IHRoaXMuZGV0ZWN0UGxhdGZvcm0odXJsKTtcbiAgICBcbiAgICBzd2l0Y2ggKHBsYXRmb3JtKSB7XG4gICAgICBjYXNlICdkb3V5aW4nOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHBsYXRmb3JtLFxuICAgICAgICAgIGRhdGE6IGF3YWl0IHRoaXMuY2xpZW50LmRvdXlpbi5nZXRWaWRlb0luZm8odXJsKSxcbiAgICAgICAgfTtcbiAgICAgIGNhc2UgJ3Rpa3Rvayc6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGxhdGZvcm0sXG4gICAgICAgICAgZGF0YTogYXdhaXQgdGhpcy5jbGllbnQudGlrdG9rLmdldFZpZGVvSW5mbyh1cmwpLFxuICAgICAgICB9O1xuICAgICAgY2FzZSAneGlhb2hvbmdzaHUnOlxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHBsYXRmb3JtLFxuICAgICAgICAgIGRhdGE6IGF3YWl0IHRoaXMuY2xpZW50LnhpYW9ob25nc2h1LmdldE5vdGVJbmZvKHVybCksXG4gICAgICAgIH07XG4gICAgICBjYXNlICdiaWxpYmlsaSc6XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgcGxhdGZvcm0sXG4gICAgICAgICAgZGF0YTogYXdhaXQgdGhpcy5jbGllbnQuYmlsaWJpbGkuZ2V0VmlkZW9JbmZvKHVybCksXG4gICAgICAgIH07XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgVGlrSHViRXJyb3IoXG4gICAgICAgICAgYFVuc3VwcG9ydGVkIHBsYXRmb3JtOiAke3VybH1gLFxuICAgICAgICAgIDQwMCxcbiAgICAgICAgICAnSU5WQUxJRF9SRVFVRVNUJ1xuICAgICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiDmo4DmtYsgVVJMIOaJgOWxnuW5s+WPsFxuICAgKiBAcGFyYW0gdXJsIOinhumikSBVUkxcbiAgICogQHJldHVybnMg5bmz5Y+w57G75Z6LXG4gICAqL1xuICBwcml2YXRlIGRldGVjdFBsYXRmb3JtKHVybDogc3RyaW5nKTogUGxhdGZvcm0ge1xuICAgIGZvciAoY29uc3QgW3BsYXRmb3JtLCBwYXR0ZXJuXSBvZiBPYmplY3QuZW50cmllcyhQTEFURk9STV9QQVRURVJOUykpIHtcbiAgICAgIGlmIChwYXR0ZXJuLnRlc3QodXJsKSkge1xuICAgICAgICByZXR1cm4gcGxhdGZvcm0gYXMgUGxhdGZvcm07XG4gICAgICB9XG4gICAgfVxuICAgIHRocm93IG5ldyBUaWtIdWJFcnJvcihcbiAgICAgICdVbmtub3duIHBsYXRmb3JtLCBwbGVhc2UgcHJvdmlkZSBhIHZhbGlkIHNvY2lhbCBtZWRpYSBVUkwnLFxuICAgICAgNDAwLFxuICAgICAgJ0lOVkFMSURfUkVRVUVTVCdcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaKlumfs+inhumikeS/oeaBr1xuICAgKi9cbiAgYXN5bmMgZ2V0RG91eWluVmlkZW8odXJsOiBzdHJpbmcpOiBQcm9taXNlPFZpZGVvSW5mbz4ge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC5kb3V5aW4uZ2V0VmlkZW9JbmZvKHVybCk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+W5oqW6Z+z55So5oi36LWE5paZXG4gICAqL1xuICBhc3luYyBnZXREb3V5aW5Vc2VyKHVzZXJJZDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LmRvdXlpbi5nZXRVc2VyUHJvZmlsZSh1c2VySWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPluaKlumfs+eDreeCueamnFxuICAgKi9cbiAgYXN5bmMgZ2V0RG91eWluSG90TGlzdCgpIHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQuZG91eWluLmdldEhvdEJpbGxib2FyZCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIOaQnOe0ouaKlumfs+inhumikVxuICAgKi9cbiAgYXN5bmMgc2VhcmNoRG91eWluVmlkZW9zKGtleXdvcmQ6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC5kb3V5aW4uc2VhcmNoVmlkZW9zKGtleXdvcmQpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPliBUaWtUb2sg6KeG6aKR5L+h5oGvXG4gICAqL1xuICBhc3luYyBnZXRUaWtUb2tWaWRlbyh1cmw6IHN0cmluZyk6IFByb21pc2U8VmlkZW9JbmZvPiB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LnRpa3Rvay5nZXRWaWRlb0luZm8odXJsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5YgVGlrVG9rIOeUqOaIt+i1hOaWmVxuICAgKi9cbiAgYXN5bmMgZ2V0VGlrVG9rVXNlcih1c2VySWQ6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC50aWt0b2suZ2V0VXNlclByb2ZpbGUodXNlcklkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5YgVGlrVG9rIOWIm+S9nOiAheWIhuaekFxuICAgKi9cbiAgYXN5bmMgZ2V0VGlrVG9rQ3JlYXRvckFuYWx5dGljcyhjcmVhdG9ySWQ6IHN0cmluZywgc3RhcnREYXRlPzogc3RyaW5nLCBlbmREYXRlPzogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LnRpa3Rvay5nZXRDcmVhdG9yQW5hbHl0aWNzKGNyZWF0b3JJZCwgc3RhcnREYXRlLCBlbmREYXRlKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5blsI/nuqLkuabnrJTorrDkv6Hmga9cbiAgICovXG4gIGFzeW5jIGdldFhpYW9ob25nc2h1Tm90ZSh1cmw6IHN0cmluZyk6IFByb21pc2U8Tm90ZUluZm8+IHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQueGlhb2hvbmdzaHUuZ2V0Tm90ZUluZm8odXJsKTtcbiAgfVxuXG4gIC8qKlxuICAgKiDojrflj5blsI/nuqLkuabnlKjmiLfotYTmlplcbiAgICovXG4gIGFzeW5jIGdldFhpYW9ob25nc2h1VXNlcih1c2VySWQ6IHN0cmluZykge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC54aWFvaG9uZ3NodS5nZXRVc2VyUHJvZmlsZSh1c2VySWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPliBCIOermeinhumikeS/oeaBr1xuICAgKi9cbiAgYXN5bmMgZ2V0QmlsaWJpbGlWaWRlbyh1cmw6IHN0cmluZyk6IFByb21pc2U8VmlkZW9JbmZvPiB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LmJpbGliaWxpLmdldFZpZGVvSW5mbyh1cmwpO1xuICB9XG5cbiAgLyoqXG4gICAqIOiOt+WPliBCIOermeeUqOaIt+i1hOaWmVxuICAgKi9cbiAgYXN5bmMgZ2V0QmlsaWJpbGlVc2VyKHVzZXJJZDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LmJpbGliaWxpLmdldFVzZXJQcm9maWxlKHVzZXJJZCk7XG4gIH1cblxuICAvKipcbiAgICog5qOA5p+l6LSm5oi35L2Z6aKdXG4gICAqL1xuICBhc3luYyBjaGVja0JhbGFuY2UoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LmNoZWNrQmFsYW5jZSgpO1xuICB9XG5cbiAgLyoqXG4gICAqIOajgOafpemAn+eOh+mZkOWItlxuICAgKi9cbiAgYXN5bmMgY2hlY2tSYXRlTGltaXQoKSB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LmNoZWNrUmF0ZUxpbWl0KCk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgVGlrSHViU2VydmljZTtcbiJdfQ==