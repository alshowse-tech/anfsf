"""Queue Configuration - Redis Background Tasks"""

import redis
import logging
from typing import Optional
from .settings import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Redis connection pool
redis_pool: Optional[redis.ConnectionPool] = None


def get_redis_pool() -> redis.ConnectionPool:
    """Get Redis connection pool"""
    global redis_pool
    if redis_pool is None:
        redis_pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            decode_responses=True
        )
    return redis_pool


def get_queue_connection() -> redis.Redis:
    """Get Redis connection for queue operations"""
    return redis.Redis(connection_pool=get_redis_pool())


def enqueue_task(queue_name: str, task_data: dict) -> bool:
    """Enqueue a task to Redis"""
    try:
        import json
        r = get_queue_connection()
        r.lpush(f"{settings.queue_prefix}{queue_name}", json.dumps(task_data))
        logger.debug(f"Enqueued task to {queue_name}: {task_data}")
        return True
    except Exception as e:
        logger.error(f"Failed to enqueue task: {e}")
        return False


def dequeue_task(queue_name: str, timeout: int = 0) -> Optional[dict]:
    """Dequeue a task from Redis"""
    try:
        import json
        r = get_queue_connection()
        result = r.brpop(f"{settings.queue_prefix}{queue_name}", timeout=timeout)
        if result:
            return json.loads(result[1])
        return None
    except Exception as e:
        logger.error(f"Failed to dequeue task: {e}")
        return None


def get_queue_length(queue_name: str) -> int:
    """Get queue length"""
    try:
        r = get_queue_connection()
        return r.llen(f"{settings.queue_prefix}{queue_name}")
    except Exception as e:
        logger.error(f"Failed to get queue length: {e}")
        return 0
