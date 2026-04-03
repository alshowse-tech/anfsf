# URL 解析器使用指南

捷阅证券信息助手的 URL 输入优化模块，支持抖音、小红书、B 站等平台的分享链接和短链接解析。

## 📋 目录

- [功能概述](#功能概述)
- [支持的平台](#支持的平台)
- [后端使用](#后端使用)
- [前端使用](#前端使用)
- [API 接口](#api-接口)
- [示例](#示例)
- [常见问题](#常见问题)

---

## 功能概述

### 核心功能

1. **URL 提取**: 从分享文案中自动提取 URL
2. **平台识别**: 识别链接所属的短视频/社交平台
3. **短链接展开**: 将短链接转换为标准链接
4. **实时预览**: 前端实时显示识别结果和平台信息

### 用户场景

用户通过 APP 分享按钮获得的链接通常包含：
- **分享文案**: 如"8.71 复制打开抖音，看看【迷糊君的作品】..."
- **短链接**: 如 https://v.douyin.com/qCkhMi8y3qs/
- **多余文本**: 如"复制后打开【小红书】查看笔记！"

本模块能够智能处理这些复杂情况，提取出纯净的视频链接。

---

## 支持的平台

| 平台 | 标准链接格式 | 短链接格式 | 图标 |
|------|-------------|-----------|------|
| 抖音 | `https://www.douyin.com/video/{id}` | `https://v.douyin.com/{id}/` | 🎵 |
| 小红书 | `https://www.xiaohongshu.com/explore/{id}` | `http://xhslink.com/o/{id}` | 📕 |
| B 站 | `https://www.bilibili.com/video/{BV id}` | `https://b23.tv/{id}` | 📺 |
| 快手 | `https://www.kuaishou.com/short-video/{id}` | `https://v.kuaishou.com/{id}` | 📹 |
| 视频号 | `https://channels.weixin.qq.com/web/pages?feedId={id}` | - | 💬 |

---

## 后端使用

### 安装依赖

```bash
pip install aiohttp
```

### 基本用法

```python
from src.utils.url_parser import ShareURLParser, parse_share_url

# 方式 1: 使用便捷函数
result = parse_share_url("8.71 复制打开抖音，看看【作品】https://v.douyin.com/abc123/")
print(result.platform)  # 'douyin'
print(result.video_id)  # 'abc123'
print(result.is_short_link)  # True

# 方式 2: 使用解析器类
parser = ShareURLParser()

# 提取 URL
url = parser.extract_url("看看这个 https://www.douyin.com/video/123")
# 返回：https://www.douyin.com/video/123

# 识别平台
platform = parser.identify_platform("https://www.bilibili.com/video/BV1abc2")
# 返回：'bilibili'

# 完整解析
parsed = parser.parse("复制后打开【小红书】查看笔记！http://xhslink.com/o/abc123")
print(parsed.platform)  # 'xiaohongshu'
print(parsed.platform_name)  # '小红书'
print(parsed.platform_icon)  # '📕'
```

### 短链接展开

```python
from src.services.url_expander import URLExpander, expand_short_url
import asyncio

async def main():
    expander = URLExpander()
    
    # 展开短链接
    standard_url = await expander.expand("https://v.douyin.com/abc123/")
    print(standard_url)  # https://www.douyin.com/video/abc123
    
    # 获取视频信息
    video_info = await expander.get_video_info(standard_url, 'douyin')
    print(video_info.title)
    print(video_info.author)

asyncio.run(main())
```

### API 使用

```python
from fastapi import FastAPI
from src.utils.url_parser import parse_share_url
from src.services.url_expander import expand_short_url

app = FastAPI()

@app.post("/api/url/parse")
async def parse_url(text: str):
    """解析分享文案中的 URL"""
    result = parse_share_url(text)
    if result:
        return {
            "success": True,
            "data": {
                "url": result.original_url,
                "platform": result.platform,
                "platform_name": ShareURLParser().get_platform_name(result.platform),
                "platform_icon": ShareURLParser().get_platform_icon(result.platform),
                "video_id": result.video_id,
                "is_short_link": result.is_short_link,
            }
        }
    return {"success": False, "error": "未找到有效 URL"}

@app.post("/api/url/expand")
async def expand_url(url: str):
    """展开短链接"""
    try:
        expanded = await expand_short_url(url)
        return {"success": True, "expanded_url": expanded}
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

## 前端使用

### 智能输入框组件

```tsx
import { SmartURLInput } from '@/components/SmartURLInput';

function MyComponent() {
  const handleUrlValidated = (url: string, platform: string) => {
    console.log('验证通过的 URL:', url);
    console.log('平台:', platform);
    // 可以在这里调用后端 API 获取更多信息
  };

  const handleUrlCleared = () => {
    console.log('URL 已清空');
  };

  return (
    <SmartURLInput
      onUrlValidated={handleUrlValidated}
      onUrlCleared={handleUrlCleared}
      placeholder="粘贴抖音/小红书/B 站分享链接或文案..."
    />
  );
}
```

### 平台图标组件

```tsx
import { PlatformIcon, PlatformIconSimple } from '@/components/PlatformIcon';

function MyComponent() {
  return (
    <div>
      {/* 带背景的图标 */}
      <PlatformIcon platform="douyin" size="md" showName={true} />
      
      {/* 简单图标 */}
      <PlatformIconSimple platform="bilibili" size="lg" />
    </div>
  );
}
```

### Props 说明

#### SmartURLInput

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `onUrlValidated` | `(url, platform) => void` | 必填 | URL 验证通过回调 |
| `onUrlCleared` | `() => void` | - | URL 清空回调 |
| `placeholder` | `string` | '粘贴抖音/小红书/B 站分享链接或文案...' | 占位符 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `initialValue` | `string` | `''` | 初始值 |
| `className` | `string` | `''` | 自定义类名 |

#### PlatformIcon

| Prop | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `platform` | `string` | 必填 | 平台标识 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 图标大小 |
| `showName` | `boolean` | `false` | 是否显示平台名称 |
| `className` | `string` | `''` | 自定义类名 |

---

## API 接口

### POST /api/url/parse

解析分享文案中的 URL

**请求:**
```json
{
  "text": "8.71 复制打开抖音，看看【迷糊君的作品】https://v.douyin.com/qCkhMi8y3qs/ UYm:/ 11/07"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "url": "https://v.douyin.com/qCkhMi8y3qs/",
    "platform": "douyin",
    "platform_name": "抖音",
    "platform_icon": "🎵",
    "video_id": "qCkhMi8y3qs",
    "is_short_link": true,
    "normalized_url": "https://www.douyin.com/video/qCkhMi8y3qs"
  }
}
```

### POST /api/url/expand

展开短链接

**请求:**
```json
{
  "url": "https://v.douyin.com/qCkhMi8y3qs/"
}
```

**响应:**
```json
{
  "success": true,
  "expanded_url": "https://www.douyin.com/video/qCkhMi8y3qs",
  "video_info": {
    "title": "视频标题",
    "author": "作者名",
    "cover_url": "https://...",
    "duration": 60
  }
}
```

---

## 示例

### 完整流程示例

```python
# 1. 解析用户输入的分享文案
from src.utils.url_parser import parse_share_url
from src.services.url_expander import expand_short_url

user_input = "8.71 复制打开抖音，看看【迷糊君的作品】https://v.douyin.com/qCkhMi8y3qs/ UYm:/ 11/07"

# 2. 提取并识别 URL
parsed = parse_share_url(user_input)
if parsed:
    print(f"平台：{parsed.platform}")
    print(f"视频 ID: {parsed.video_id}")
    print(f"是否短链接：{parsed.is_short_link}")
    
    # 3. 如果是短链接，展开为标准链接
    if parsed.is_short_link:
        standard_url = await expand_short_url(parsed.original_url)
        print(f"标准链接：{standard_url}")
        
        # 4. 获取视频详细信息
        video_info = await get_video_details(standard_url, parsed.platform)
        print(f"视频标题：{video_info.title}")
        print(f"作者：{video_info.author}")
```

### 前端集成示例

```tsx
// pages/analyze.tsx
import { useState } from 'react';
import { SmartURLInput } from '@/components/SmartURLInput';
import { PlatformIcon } from '@/components/PlatformIcon';

export default function AnalyzePage() {
  const [videoInfo, setVideoInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUrlValidated = async (url: string, platform: string) => {
    setLoading(true);
    
    try {
      // 调用后端 API 获取视频信息
      const response = await fetch('/api/url/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      if (data.success) {
        setVideoInfo(data.video_info);
      }
    } catch (error) {
      console.error('获取视频信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">视频分析</h1>
      
      <SmartURLInput onUrlValidated={handleUrlValidated} />
      
      {loading && <div>加载中...</div>}
      
      {videoInfo && (
        <div className="mt-4 p-4 bg-white rounded-lg shadow">
          <div className="flex items-center gap-2 mb-2">
            <PlatformIcon platform={videoInfo.platform} />
            <h2 className="text-lg font-semibold">{videoInfo.title}</h2>
          </div>
          <p className="text-gray-600">作者：{videoInfo.author}</p>
          <img src={videoInfo.cover_url} alt="封面" className="mt-2 rounded" />
        </div>
      )}
    </div>
  );
}
```

---

## 常见问题

### Q: 为什么短链接展开失败？

A: 可能的原因：
1. 网络连接问题
2. 平台反爬机制
3. 短链接已过期

解决方案：
- 检查网络连接
- 增加重试机制（已内置）
- 使用缓存减少请求

### Q: 如何添加新平台支持？

A: 修改 `url_parser.py` 中的 `PLATFORM_PATTERNS` 字典：

```python
PLATFORM_PATTERNS = {
    'new_platform': [
        (r'https?://(?:www\.)?newplatform\.com/video/(\w+)', False),
        (r'https?://short\.newplatform\.com/(\w+)', True),
    ],
    # ...
}
```

同时更新 `PLATFORM_NAMES` 和 `PLATFORM_ICONS`。

### Q: 缓存如何管理？

A: `URLExpander` 内置了 24 小时缓存：
- 自动缓存展开结果
- 定期清理过期缓存
- 可手动调用 `clear_cache()` 清空

### Q: 如何测试？

A: 运行单元测试：

```bash
cd backend
pytest src/__tests__/test_url_parser.py -v
```

---

## 更新日志

- **v1.0.0** (2026-04-01): 初始版本
  - 支持抖音、小红书、B 站、快手、视频号
  - 实现 URL 提取、平台识别、短链接展开
  - 提供前端智能输入框组件
  - 完整的单元测试覆盖

---

## 联系方式

如有问题或建议，请联系捷阅证券技术团队。
