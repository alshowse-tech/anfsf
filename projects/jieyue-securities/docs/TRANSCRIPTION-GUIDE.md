# 音视频转文字使用指南

## 概述

本服务提供完整的音视频转文字功能，支持以下流程：

1. **输入 URL** - 支持抖音、TikTok 等平台的视频链接
2. **自动解析** - 通过 TikHub API 解析视频并获取下载链接
3. **下载存储** - 下载视频并上传到阿里云 OSS
4. **语音识别** - 调用阿里云百炼模型进行音频转文字
5. **结果返回** - 返回转写文本和相关元数据

---

## 快速开始

### 1. 环境配置

复制环境变量模板并配置：

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件，配置以下变量：

```env
# TikHub 配置
TIKHUB_API_KEY=your_api_key
TIKHUB_BASE_URL=https://api.tikhub.dev

# 阿里云 OSS 配置
ALIYUN_OSS_ACCESS_KEY=your_access_key
ALIYUN_OSS_SECRET_KEY=your_secret_key
ALIYUN_OSS_BUCKET=your-bucket-name
ALIYUN_OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com

# 阿里云百炼配置
ALIYUN_BAILIAN_API_KEY=your_api_key
ALIYUN_BAILIAN_BASE_URL=https://dashscope.aliyuncs.com/api/v1
```

### 2. 安装依赖

```bash
cd backend
pip install -r requirements.txt
```

### 3. 启动服务

```bash
# 开发模式
python main.py

# 或使用 uvicorn
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## API 使用

### 同步转写（推荐短音频/视频）

**POST** `/api/v1/transcribe/sync`

```bash
curl -X POST http://localhost:8000/api/v1/transcribe/sync \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.douyin.com/video/xxxxx",
    "is_audio": false,
    "language": "zh-CN",
    "timeout": 600
  }'
```

**响应示例：**

```json
{
  "success": true,
  "video_id": "uuid-xxx",
  "task_id": "task-xxx",
  "transcription": "这是转写后的文字内容...",
  "oss_url": "https://bucket.oss.cn-hangzhou.aliyuncs.com/videos/uuid-xxx.mp4",
  "duration": 120,
  "created_at": "2024-01-01T12:00:00",
  "completed_at": "2024-01-01T12:02:00"
}
```

### 异步转写（推荐长视频）

**POST** `/api/v1/transcribe/`

```bash
curl -X POST http://localhost:8000/api/v1/transcribe/ \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://www.douyin.com/video/xxxxx",
    "is_audio": false,
    "language": "zh-CN",
    "timeout": 600
  }'
```

**响应示例：**

```json
{
  "task_id": "task-uuid-xxx",
  "status": "pending",
  "message": "转写任务已创建，正在后台处理"
}
```

**查询状态：**

**GET** `/api/v1/transcribe/{task_id}`

```bash
curl http://localhost:8000/api/v1/transcribe/task-uuid-xxx
```

**响应示例：**

```json
{
  "task_id": "task-uuid-xxx",
  "status": "completed",
  "progress": 100,
  "message": "转写完成",
  "result": {
    "success": true,
    "transcription": "这是转写后的文字内容...",
    "oss_url": "https://..."
  },
  "created_at": "2024-01-01T12:00:00",
  "completed_at": "2024-01-01T12:02:00"
}
```

### 获取纯文本结果

**GET** `/api/v1/transcribe/{task_id}/result`

```bash
curl http://localhost:8000/api/v1/transcribe/task-uuid-xxx/result
```

---

## 前端使用

### React 组件

```tsx
import { MediaTranscription } from './components/MediaTranscription';

function App() {
  return (
    <MediaTranscription
      apiUrl="/api/v1"
      showAdvanced={true}
      onComplete={(result) => {
        console.log('转写完成:', result);
      }}
    />
  );
}
```

### 组件属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `apiUrl` | string | `/api/v1` | API 基础 URL |
| `showAdvanced` | boolean | `false` | 显示高级选项 |
| `onComplete` | function | - | 转写完成回调 |

---

## 核心模块

### TikHub 客户端

**文件：** `backend/src/services/tikhub_client.py`

```python
from services.tikhub_client import TikHubClient

client = TikHubClient(api_key="your_api_key")

# 解析视频
video_info = await client.parse_video_url("https://www.douyin.com/video/xxx")
print(f"视频标题：{video_info.title}")
print(f"下载链接：{video_info.download_url}")

# 下载视频
await client.download_video(video_info.download_url, "video.mp4")
```

### OSS 存储服务

**文件：** `backend/src/services/oss_storage.py`

```python
from services.oss_storage import OSSStorage

storage = OSSStorage()

# 上传文件
oss_url = await storage.upload_file("video.mp4", "videos/test.mp4")
print(f"OSS URL: {oss_url}")

# 下载文件
await storage.download_file("videos/test.mp4", "downloaded.mp4")

# 删除文件
await storage.delete_file("videos/test.mp4")
```

### 百炼客户端

**文件：** `backend/src/services/bailian_client.py`

```python
from services.bailian_client import BailianClient

client = BailianClient(api_key="your_api_key")

# 音频转文字
result = await client.transcribe_and_wait("https://oss.url/audio.mp3")
print(f"转写结果：{result['text']}")

# 视频转文字
result = await client.transcribe_and_wait(
    "https://oss.url/video.mp4",
    is_video=True
)
```

### 媒体处理器

**文件：** `backend/src/services/media_processor.py`

```python
from services.media_processor import MediaProcessor

processor = MediaProcessor()

# 完整流程
result = await processor.process_url(
    "https://www.douyin.com/video/xxx",
    progress_callback=lambda p: print(f"{p.step}: {p.progress}%")
)

if result.success:
    print(f"转写文本：{result.transcription}")
else:
    print(f"错误：{result.error_message}")
```

---

## 错误处理

### 常见错误码

| 错误 | 说明 | 解决方案 |
|------|------|----------|
| `400 Bad Request` | 请求参数错误 | 检查 URL 格式和参数 |
| `401 Unauthorized` | API Key 无效 | 检查 TikHub/百炼 API Key |
| `402 Payment Required` | 余额不足 | 充值 TikHub/阿里云账户 |
| `404 Not Found` | 视频不存在 | 检查 URL 是否正确 |
| `429 Too Many Requests` | 请求过于频繁 | 降低请求频率 |
| `500 Internal Server Error` | 服务器错误 | 查看日志，联系支持 |

### 错误处理示例

```python
try:
    result = await processor.process_url(url)
    if not result.success:
        print(f"处理失败：{result.error_message}")
except Exception as e:
    print(f"异常：{str(e)}")
```

---

## 最佳实践

### 1. 超时设置

- 短视频（< 1 分钟）：60 秒
- 中视频（1-5 分钟）：300 秒
- 长视频（> 5 分钟）：600-1800 秒

### 2. 重试机制

```python
async def transcribe_with_retry(url, max_retries=3):
    for i in range(max_retries):
        try:
            result = await processor.process_url(url)
            if result.success:
                return result
        except Exception as e:
            if i == max_retries - 1:
                raise
            await asyncio.sleep(2 ** i)  # 指数退避
```

### 3. 临时文件清理

```python
# 定期清理临时文件
processor.cleanup_temp_files(max_age=3600)  # 清理 1 小时前的文件
```

### 4. 并发控制

```python
# 限制并发任务数
semaphore = asyncio.Semaphore(5)

async def process_with_limit(url):
    async with semaphore:
        return await processor.process_url(url)
```

---

## 性能优化

### 1. 使用异步模式

对于长视频或批量处理，使用异步模式避免阻塞：

```python
# 提交任务
response = await fetch('/api/v1/transcribe/', { method: 'POST', ... })
const taskId = response.task_id;

// 轮询状态
while (true) {
  const status = await fetch(`/api/v1/transcribe/${taskId}`);
  if (status.status === 'completed') break;
  await sleep(2000);
}
```

### 2. CDN 加速

将 OSS Bucket 配置 CDN 加速，提高文件访问速度。

### 3. 结果缓存

对相同 URL 的转写结果进行缓存，避免重复处理。

---

## 安全建议

1. **API Key 保护**：不要将 API Key 提交到代码仓库
2. **访问控制**：配置 OSS Bucket 为私有，使用签名 URL
3. **速率限制**：在 API 层面实现请求频率限制
4. **输入验证**：验证用户输入的 URL 格式
5. **日志审计**：记录所有转写请求用于审计

---

## 故障排查

### TikHub 解析失败

1. 检查 API Key 是否有效
2. 确认域名是否正确（中国大陆使用 `api.tikhub.dev`）
3. 检查视频 URL 是否有效
4. 查看 TikHub 账户余额

### OSS 上传失败

1. 检查 AccessKey/SecretKey 是否正确
2. 确认 Bucket 名称和 Endpoint 配置
3. 检查网络连接
4. 建议安装 `oss2` SDK：`pip install oss2`

### 百炼转写失败

1. 检查 API Key 是否有效
2. 确认音频/视频格式支持
3. 检查文件是否可公开访问
4. 查看百炼控制台的任务状态

---

## 支持的平台

- ✅ 抖音（Douyin）
- ✅ TikTok
- ✅ 西瓜视频
- ✅ 快手
- ✅ 哔哩哔哩
- ✅ 小红书
- ✅ 直接音频/视频 URL

---

## 更新日志

### v1.0.0 (2024-01-01)

- ✅ 初始版本发布
- ✅ TikHub 集成
- ✅ 阿里云 OSS 存储
- ✅ 阿里云百炼转写
- ✅ 同步/异步 API
- ✅ React 前端组件

---

## 联系方式

如有问题，请联系技术支持或提交 Issue。
