# 捷阅证券 - TikHub 集成文档

## 📋 概述

TikHub 服务已集成到捷阅证券项目中，用于解析和获取社交媒体平台上的视频数据。

## 🎯 使用场景

1. **视频内容分析**: 解析抖音、TikTok、小红书、B 站视频链接，获取详细信息
2. **热点监控**: 获取各平台热点榜单，追踪热门内容
3. **用户分析**: 获取创作者资料和统计数据
4. **内容审核**: 自动识别视频内容，辅助审核流程

## 💻 代码示例

### 基础使用

```typescript
import { TikHubService } from './backend/services/tikhub-service';

// 创建服务实例
const tikhubService = new TikHubService();

// 解析任意平台视频链接
async function analyzeVideo(url: string) {
  try {
    const result = await tikhubService.parseVideoUrl(url);
    
    console.log(`平台：${result.platform}`);
    console.log(`标题：${result.data.title}`);
    console.log(`作者：${result.data.author.nickname}`);
    console.log(`播放量：${result.data.statistics.playCount}`);
    
    return result;
  } catch (error) {
    console.error('解析失败:', error);
    throw error;
  }
}
```

### 平台特定功能

```typescript
// 抖音
const douyinVideo = await tikhubService.getDouyinVideo('https://v.douyin.com/xxx');
const douyinHotList = await tikhubService.getDouyinHotList();

// TikTok
const tiktokVideo = await tikhubService.getTikTokVideo('https://www.tiktok.com/@user/video/xxx');
const creatorAnalytics = await tikhubService.getTikTokCreatorAnalytics('creator_id');

// 小红书
const xiaohongshuNote = await tikhubService.getXiaohongshuNote('https://www.xiaohongshu.com/explore/xxx');

// B 站
const bilibiliVideo = await tikhubService.getBilibiliVideo('https://www.bilibili.com/video/BVxxx');
```

### 集成到 Task Service

```typescript
// projects/jieyue-securities/backend/services/task-service.ts

import { TikHubService } from './tikhub-service';

class TaskService {
  private tikhubService: TikHubService;

  constructor() {
    this.tikhubService = new TikHubService();
  }

  async processSocialMediaTask(task: Task) {
    if (task.type === 'SOCIAL_MEDIA_ANALYSIS') {
      const videoData = await this.tikhubService.parseVideoUrl(task.videoUrl);
      
      // 更新任务数据
      task.data = {
        platform: videoData.platform,
        title: videoData.data.title,
        author: videoData.data.author.nickname,
        statistics: videoData.data.statistics,
        analyzedAt: new Date().toISOString(),
      };
      
      return task;
    }
  }
}
```

## ⚙️ 配置

### 环境变量

在捷阅证券项目的 `.env` 文件中添加：

```bash
# TikHub API 配置
TIKHUB_API_KEY=your_api_key_here
TIKHUB_REGION=CN  # CN 或 GLOBAL
```

### Docker 部署

在 `docker-compose.yml` 中添加环境变量：

```yaml
services:
  backend:
    environment:
      - TIKHUB_API_KEY=${TIKHUB_API_KEY}
      - TIKHUB_REGION=${TIKHUB_REGION:-CN}
```

## 📊 数据流

```
用户提交视频 URL
    ↓
TikHubService.parseVideoUrl()
    ↓
自动识别平台 (抖音/TikTok/小红书/B 站)
    ↓
调用对应 TikHub API
    ↓
返回标准化数据
    ↓
存储到任务数据
```

## 🛡️ 错误处理

```typescript
import { TikHubError } from '@/integrations/tikhub';

async function safeParseVideo(url: string) {
  try {
    return await tikhubService.parseVideoUrl(url);
  } catch (error) {
    if (error instanceof TikHubError) {
      // 处理 TikHub 特定错误
      switch (error.statusCode) {
        case 401:
          throw new Error('API 认证失败，请检查配置');
        case 402:
          throw new Error('账户余额不足');
        case 404:
          throw new Error('视频不存在或已删除');
        case 429:
          throw new Error('请求过于频繁，请稍后重试');
        default:
          throw error;
      }
    }
    throw error;
  }
}
```

## 🧪 测试

```bash
# 运行 TikHub 相关测试
npm test -- --testPathPattern=tikhub

# 验证 API 连接
npx ts-node scripts/verify-tikhub.ts
```

## 📈 监控

建议监控以下指标：

1. **API 调用成功率**: 监控 `parseVideoUrl()` 的成功/失败率
2. **响应时间**: 记录 API 调用耗时
3. **余额预警**: 当余额低于阈值时告警
4. **速率限制**: 监控剩余请求数

## 🔐 安全注意事项

1. **API Key 保护**: 不要将 API Key 提交到代码仓库
2. **访问控制**: 限制 TikHub 服务的访问权限
3. **数据缓存**: 敏感数据不要缓存过久
4. **日志脱敏**: 日志中不要输出完整的 API Key

## 📚 相关文档

- TikHub SDK 文档：`/docs/tikhub-integration.md`
- API 验证脚本：`/scripts/verify-tikhub.ts`
- 单元测试：`/src/integrations/tikhub/__tests__/tikhub-client.test.ts`
