"""
性能优化工具
"""
import asyncio
import time
from functools import wraps
from typing import Any, Callable, Dict, Optional
from collections import OrderedDict
import hashlib
import json
from loguru import logger


# ========== LRU 缓存 ==========

class LRUCache:
    """LRU 缓存实现"""
    
    def __init__(self, capacity: int = 1000):
        self.capacity = capacity
        self.cache: OrderedDict = OrderedDict()
    
    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        
        # 移动到末尾 (最近使用)
        self.cache.move_to_end(key)
        return self.cache[key]
    
    def put(self, key: str, value: Any) -> None:
        if key in self.cache:
            self.cache.move_to_end(key)
        
        self.cache[key] = value
        
        # 超出容量，删除最旧的
        if len(self.cache) > self.capacity:
            self.cache.popitem(last=False)
    
    def clear(self) -> None:
        self.cache.clear()


# 全局缓存实例
lru_cache = LRUCache(capacity=10000)


# ========== 缓存装饰器 ==========

def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    缓存函数结果装饰器
    
    Args:
        ttl: 缓存过期时间 (秒)
        key_prefix: 缓存键前缀
    """
    cache_store: Dict[str, Dict] = {}
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            # 生成缓存键
            key = _generate_cache_key(func.__name__, args, kwargs, key_prefix)
            
            # 检查缓存
            if key in cache_store:
                cached = cache_store[key]
                if time.time() - cached['time'] < ttl:
                    logger.debug(f"✅ 缓存命中：{key}")
                    return cached['value']
                else:
                    del cache_store[key]
            
            # 执行函数
            start_time = time.time()
            result = await func(*args, **kwargs)
            duration = time.time() - start_time
            
            # 存入缓存
            cache_store[key] = {
                'value': result,
                'time': time.time()
            }
            
            logger.debug(f"⚡ 缓存写入：{key} (耗时：{duration*1000:.2f}ms)")
            return result
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            # 生成缓存键
            key = _generate_cache_key(func.__name__, args, kwargs, key_prefix)
            
            # 检查缓存
            if key in cache_store:
                cached = cache_store[key]
                if time.time() - cached['time'] < ttl:
                    logger.debug(f"✅ 缓存命中：{key}")
                    return cached['value']
                else:
                    del cache_store[key]
            
            # 执行函数
            start_time = time.time()
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            # 存入缓存
            cache_store[key] = {
                'value': result,
                'time': time.time()
            }
            
            logger.debug(f"⚡ 缓存写入：{key} (耗时：{duration*1000:.2f}ms)")
            return result
        
        def _generate_cache_key(func_name: str, args: tuple, kwargs: dict, prefix: str) -> str:
            key_data = {
                'func': func_name,
                'args': args,
                'kwargs': kwargs
            }
            key_str = json.dumps(key_data, sort_keys=True, default=str)
            key_hash = hashlib.md5(key_str.encode()).hexdigest()
            return f"{prefix}{func_name}:{key_hash}" if prefix else f"{func_name}:{key_hash}"
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator


# ========== 性能监控装饰器 ==========

def monitor_performance(threshold: float = 1.0):
    """
    性能监控装饰器
    
    Args:
        threshold: 性能阈值 (秒)，超过此值记录警告
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                return await func(*args, **kwargs)
            finally:
                duration = time.time() - start_time
                if duration > threshold:
                    logger.warning(
                        f"⚠️ 性能警告：{func.__name__} 耗时 {duration*1000:.2f}ms (阈值：{threshold*1000}ms)"
                    )
                else:
                    logger.debug(f"✅ 性能：{func.__name__} 耗时 {duration*1000:.2f}ms")
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            try:
                return func(*args, **kwargs)
            finally:
                duration = time.time() - start_time
                if duration > threshold:
                    logger.warning(
                        f"⚠️ 性能警告：{func.__name__} 耗时 {duration*1000:.2f}ms (阈值：{threshold*1000}ms)"
                    )
                else:
                    logger.debug(f"✅ 性能：{func.__name__} 耗时 {duration*1000:.2f}ms")
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    
    return decorator


# ========== 批量处理工具 ==========

async def batch_process(items: list, batch_size: int, processor: Callable):
    """
    批量处理
    
    Args:
        items: 待处理项列表
        batch_size: 每批数量
        processor: 处理函数 (异步)
    """
    results = []
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        logger.debug(f"处理批次 {i//batch_size + 1}/{(len(items) + batch_size - 1)//batch_size}")
        
        batch_results = await processor(batch)
        results.extend(batch_results)
        
        # 避免过快请求
        if i + batch_size < len(items):
            await asyncio.sleep(0.1)
    
    return results


def batch_process_sync(items: list, batch_size: int, processor: Callable):
    """
    批量处理 (同步版本)
    """
    results = []
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        logger.debug(f"处理批次 {i//batch_size + 1}/{(len(items) + batch_size - 1)//batch_size}")
        
        batch_results = processor(batch)
        results.extend(batch_results)
    
    return results


# ========== 连接池监控 ==========

class PoolMonitor:
    """连接池监控"""
    
    def __init__(self, pool_name: str):
        self.pool_name = pool_name
        self.active_count = 0
        self.total_count = 0
        self.wait_count = 0
    
    def acquire(self):
        self.active_count += 1
        self.total_count += 1
        logger.debug(f"🔗 {self.pool_name} 获取连接 (活跃：{self.active_count})")
    
    def release(self):
        self.active_count = max(0, self.active_count - 1)
        logger.debug(f"🔗 {self.pool_name} 释放连接 (活跃：{self.active_count})")
    
    def wait(self):
        self.wait_count += 1
        logger.warning(f"⚠️ {self.pool_name} 连接池等待 (等待数：{self.wait_count})")
    
    def get_stats(self) -> Dict:
        return {
            'pool_name': self.pool_name,
            'active': self.active_count,
            'total': self.total_count,
            'waiting': self.wait_count
        }
