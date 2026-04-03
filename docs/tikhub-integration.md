# TikHub API 使用指南

## 📋 概述

TikHub SDK 为 ANFSF V4 提供社交媒体数据获取能力，支持以下平台：

- 📱 抖音 (Douyin)
- 🎵 TikTok
- 📕 小红书 (Xiaohongshu)
- 📺 哔哩哔哩 (Bilibili)

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

在项目根目录创建 `.env` 文件：

```bash
# TikHub API 配置
TIKHUB_API_KEY=your_api_key_here
TIKHUB_REGION=CN  # CN 或 GLOBAL
TIKHUB_TIMEOUT=30000
TIKHUB_RETRY_COUNT=3
TIKHUB_ENABLE_CACHE=true
```

### 3. 验证连接

```bash
npx ts-node scripts/verify-tikhub.ts
```

## 📦 核心模块

### TikHubClient

基础 API 客户端，提供所有平台的直接访问接口。

```typescript
import { TikHubClient } from '@/integrations/tikhub';

const client = new TikHubClient({
  apiKey: 'your-api-key',
  baseURL: 'https://api.tikhub.dev', // 中国大陆
  timeout: 30000,
  retryCount: 3,
  enableCache: true,
});
```

### TikHubService

捷阅证券项目的高级封装服务，提供统一的视频解析接口。

```typescript
import { TikHubService } from '@/services/tikhub-service';

const service = new TikHubService();

// 自动识别平台并解析
const result = await service.parseVideoUrl('https://v.douyin.com/xxx');
console.log(result.platform); // 'douyin'
console.log(result.data);     // 视频数据
```

## 📱 平台接口

### 抖音 (Douyin)

```typescript
// 获取视频信息
const video = await client.douyin.getVideoInfo('https://v.douyin.com/xxx');

// 获取用户资料
const user = await client.douyin.getUserProfile('user_id');

// 获取热点榜
const hotList = await client.douyin.getHotBillboard();

// 搜索视频
const results = await client.douyin.searchVideos('关键词');
```

### TikTok

```typescript
// 获取视频信息
const video = await client.tiktok.getVideoInfo('https://www.tiktok.com/@user/video/xxx');

// 获取用户资料
const user = await client.tiktok.getUserProfile('user_id');

// 获取创作者分析
const analytics = await client.tiktok.getCreatorAnalytics(
  'creator_id',
  '2024-01-01',
  '2024-01-31'
);
```

### 小红书 (Xiaohongshu)

```typescript
// 获取笔记信息
const note = await client.xiaohongshu.getNoteInfo('https://www.xiaohongshu.com/explore/xxx');

// 获取用户资料
const user = await client.xiaohongshu.getUserProfile('user_id');
```

### 哔哩哔哩 (Bilibili)

```typescript
// 获取视频信息
const video = await client.bilibili.getVideoInfo('https://www.bilibili.com/video/BVxxx');

// 获取用户资料
const user = await client.bilibili.getUserProfile('user_id');
```

## 🔧 状态管理

```typescript
// 检查账户余额
const balance = await client.checkBalance();
console.log(`余额：${balance.balance} ${balance.currency}`);

// 检查速率限制
const rateLimit = await client.checkRateLimit();
console.log(`剩余请求：${rateLimit.remaining}/${rateLimit.limit}`);
```

## 🛡️ 错误处理

```typescript
import { TikHubError, HTTP_STATUS, ERROR_CODES } from '@/integrations/tikhub';

try {
  const video = await client.douyin.getVideoInfo(url);
} catch (error) {
  if (error instanceof TikHubError) {
    switch (error.statusCode) {
      case HTTP_STATUS.UNAUTHORIZED:
        console.error('API Token 无效或过期');
        break;
      case HTTP_STATUS.PAYMENT_REQUIRED:
        console.error('账户余额不足');
        break;
      case HTTP_STATUS.TOO_MANY_REQUESTS:
        console.error('请求过快，请稍后重试');
        break;
      case HTTP_STATUS.NOT_FOUND:
        console.error('视频不存在或已删除');
        break;
      default:
        console.error(`API 错误：${error.message}`);
    }
  }
}
```

## 📊 数据类型

### VideoInfo

```typescript
interface VideoInfo {
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
```

### UserProfile

```typescript
interface UserProfile {
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
```

## 🧪 测试

运行单元测试：

```bash
npm test -- --testPathPattern=tikhub
```

## 📝 最佳实践

1. **缓存使用**: 启用缓存可减少 API 调用，默认缓存 5 分钟
2. **错误重试**: 客户端自动重试（指数退避），最多 3 次
3. **速率限制**: 检查 `checkRateLimit()` 避免超限
4. **余额监控**: 定期检查 `checkBalance()` 确保服务可用
5. **超时设置**: 根据网络情况调整 timeout（默认 30 秒）

## 🔗 相关链接

- TikHub 官网：https://tikhub.io
- API 文档：https://docs.tikhub.io
- 中国大陆 API：https://api.tikhub.dev
- 全球 API：https://api.tikhub.io

## 📞 支持

如有问题，请查看：
- 项目文档：`/docs/tikhub-integration.md`
- 测试用例：`src/integrations/tikhub/__tests__/`
- 示例代码：`scripts/verify-tikhub.ts`
