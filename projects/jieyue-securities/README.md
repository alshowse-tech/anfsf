# 捷阅证券信息助手

## 视频解析功能配置

### 1. 获取 DashScope API Key

1. 访问 [阿里云 DashScope 控制台](https://dashscope.console.aliyun.com/)
2. 创建或获取 API Key
3. 确保 API Key 有以下权限：
   - 音频转文字（ASR）服务
   - Qwen 大模型服务

### 2. 配置环境变量

在启动 backend 服务前，设置环境变量：

```bash
export DASHSCOPE_API_KEY="your-real-api-key-here"
```

或者在 `.env` 文件中：

```env
DASHSCOPE_API_KEY=your-real-api-key-here
```

### 3. 启动服务

```bash
cd backend
source venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### 4. 测试视频解析

使用抖音链接进行测试：

```bash
curl -X POST http://localhost:8000/api/task/create \
  -H "Content-Type: application/json" \
  -d '{"url": "https://v.douyin.com/qCkhMi8y3qs/", "user_id": 1}'
```

### 5. 监控

查看日志以监控处理过程：

```bash
tail -f backend.log
```

## 功能说明

- **短链接展开**: 自动展开抖音短链接
- **URL 解析**: 调用 AnyVideo 智能解析服务
- **ASR 语音识别**: 调用百炼 ASR 服务进行语音识别
- **摘要生成**: 调用百炼大模型生成结构化摘要
- **任务状态管理**: 自动更新任务状态和结果

## 故障排除

### 常见问题

1. **API Key 无效**: 检查 API Key 是否正确，是否有足够权限
2. **网络连接问题**: 确保服务器可以访问 DashScope API
3. **超时问题**: 调整 `timeout` 参数（默认 300 秒）

### 日志级别

默认日志级别为 INFO。如需更详细日志，可以在 `src/main.py` 中调整：

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```