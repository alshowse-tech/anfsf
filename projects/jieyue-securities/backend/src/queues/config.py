# BullMQ 队列配置
from pydantic import RedisSettings

# Redis 配置
REDIS_HOST = "localhost"
REDIS_PORT = 6379
REDIS_DB = 0

# 队列定义
QUEUE_PARSE = "queue_parse"
QUEUE_ASR = "queue_asr"
QUEUE_SUMMARY = "queue_summary"
QUEUE_BILLING = "queue_billing"

# 重试配置
RETRY_ATTEMPTS = 3
RETRY_BACKOFF = {
    "type": "exponential",
    "delay": 2000  # 2 秒起始
}

# 任务超时配置
TASK_TIMEOUT = {
    QUEUE_PARSE: 60000,      # 1 分钟
    QUEUE_ASR: 300000,       # 5 分钟
    QUEUE_SUMMARY: 120000,   # 2 分钟
    QUEUE_BILLING: 30000     # 30 秒
}
