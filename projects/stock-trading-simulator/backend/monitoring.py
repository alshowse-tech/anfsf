"""
Prometheus 监控指标
"""
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST
from prometheus_client import CollectorRegistry
import time
from typing import Dict
from loguru import logger

# ========== 指标定义 ==========

# HTTP 请求指标
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status']
)

# HTTP 请求延迟
http_request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0)
)

# 活跃连接数
active_connections = Gauge(
    'active_connections',
    'Number of active connections'
)

# WebSocket 连接数
websocket_connections = Gauge(
    'websocket_connections_total',
    'Number of active WebSocket connections'
)

# 数据库连接池
db_pool_size = Gauge(
    'database_pool_size',
    'Database connection pool size'
)

db_pool_used = Gauge(
    'database_pool_used',
    'Database connections in use'
)

# 交易指标
trades_total = Counter(
    'trades_total',
    'Total number of trades',
    ['side', 'status']
)

signals_generated = Counter(
    'signals_generated_total',
    'Total number of trading signals generated',
    ['signal_type']
)

# 规则命中
rule_hits_total = Counter(
    'rule_hits_total',
    'Total number of rule hits',
    ['rule_id', 'rule_type']
)

# AI 分析
ai_analyses_total = Counter(
    'ai_analyses_total',
    'Total number of AI analyses',
    ['model', 'status']
)

ai_analysis_duration = Histogram(
    'ai_analysis_duration_seconds',
    'AI analysis duration in seconds',
    ['model'],
    buckets=(0.5, 1.0, 2.5, 5.0, 10.0, 30.0)
)

# 数据源
data_fetch_total = Counter(
    'data_fetch_total',
    'Total number of data fetch operations',
    ['source', 'data_type', 'status']
)

data_fetch_duration = Histogram(
    'data_fetch_duration_seconds',
    'Data fetch duration in seconds',
    ['source', 'data_type'],
    buckets=(0.1, 0.5, 1.0, 2.5, 5.0, 10.0)
)

# 系统指标
system_memory_usage = Gauge(
    'system_memory_usage_bytes',
    'System memory usage in bytes'
)

system_cpu_usage = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage'
)


# ========== 监控中间件 ==========

class MonitoringMiddleware:
    """FastAPI 监控中间件"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http':
            return await self.app(scope, receive, send)
        
        method = scope['method']
        path = scope['path']
        
        start_time = time.time()
        
        async def send_wrapper(message):
            if message['type'] == 'http.response.start':
                status = message['status']
                http_requests_total.labels(
                    method=method,
                    endpoint=path,
                    status=status
                ).inc()
            elif message['type'] == 'http.response.body':
                duration = time.time() - start_time
                http_request_duration.labels(
                    method=method,
                    endpoint=path
                ).observe(duration)
            
            await send(message)
        
        return await self.app(scope, receive, send_wrapper)


# ========== 监控工具函数 ==========

def track_trade(side: str, status: str):
    """记录交易"""
    trades_total.labels(side=side, status=status).inc()


def track_signal(signal_type: str):
    """记录交易信号"""
    signals_generated.labels(signal_type=signal_type).inc()


def track_rule_hit(rule_id: str, rule_type: str):
    """记录规则命中"""
    rule_hits_total.labels(rule_id=rule_id, rule_type=rule_type).inc()


def track_ai_analysis(model: str, status: str, duration: float):
    """记录 AI 分析"""
    ai_analyses_total.labels(model=model, status=status).inc()
    ai_analysis_duration.labels(model=model).observe(duration)


def track_data_fetch(source: str, data_type: str, status: str, duration: float):
    """记录数据获取"""
    data_fetch_total.labels(source=source, data_type=data_type, status=status).inc()
    data_fetch_duration.labels(source=source, data_type=data_type).observe(duration)


def update_active_connections(count: int):
    """更新活跃连接数"""
    active_connections.set(count)


def update_websocket_connections(count: int):
    """更新 WebSocket 连接数"""
    websocket_connections.set(count)


def get_metrics():
    """获取所有监控指标"""
    return generate_latest()


def get_metrics_content_type():
    """获取指标内容类型"""
    return CONTENT_TYPE_LATEST
