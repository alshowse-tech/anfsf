"""
Loguru 日志配置
"""
import sys
from loguru import logger
from pathlib import Path
from datetime import datetime
import logging


def setup_logging(log_level: str = "INFO", log_file: str = "logs/app.log"):
    """
    配置 Loguru 日志
    
    Args:
        log_level: 日志级别 (DEBUG/INFO/WARNING/ERROR)
        log_file: 日志文件路径
    """
    # 移除默认处理器
    logger.remove()
    
    # 创建日志目录
    log_path = Path(log_file)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 控制台输出 (彩色)
    logger.add(
        sys.stderr,
        level=log_level,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        colorize=True,
        backtrace=True,
        diagnose=True
    )
    
    # 文件输出 (所有级别)
    logger.add(
        log_file,
        level="DEBUG",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation="100 MB",  # 每个文件最大 100MB
        retention="30 days",  # 保留 30 天
        compression="zip",  # 压缩旧日志
        enqueue=True,  # 异步写入
        backtrace=True,
        diagnose=True
    )
    
    # 错误日志单独文件
    error_log_file = str(log_path.parent / "error.log")
    logger.add(
        error_log_file,
        level="ERROR",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
        rotation="100 MB",
        retention="90 days",
        compression="zip",
        enqueue=True,
        backtrace=True,
        diagnose=True
    )
    
    # 访问日志
    access_log_file = str(log_path.parent / "access.log")
    logger.add(
        access_log_file,
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | ACCESS | {message}",
        rotation="100 MB",
        retention="30 days",
        compression="zip",
        enqueue=True
    )
    
    logger.info(f"✅ 日志系统初始化完成 (级别：{log_level})")
    logger.info(f"📁 日志文件：{log_file}")
    logger.info(f"📁 错误日志：{error_log_file}")
    logger.info(f"📁 访问日志：{access_log_file}")


class InterceptHandler(logging.Handler):
    """
    拦截标准 logging 模块的日志，重定向到 Loguru
    """
    def emit(self, record):
        # 获取对应的 Loguru 级别
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno
        
        # 找到调用栈
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1
        
        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def intercept_standard_logging():
    """拦截标准 logging 模块"""
    logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)
    
    # 设置第三方库的日志级别
    for name in ["uvicorn", "uvicorn.access", "uvicorn.error"]:
        logging.getLogger(name).handlers = [InterceptHandler()]


def log_request(request, response_time: float):
    """记录 HTTP 请求日志"""
    logger.info(
        f"{request.method} {request.url.path} - {response_time*1000:.2f}ms",
        extra={"access_log": True}
    )


def log_trade(symbol: str, side: str, quantity: int, price: float):
    """记录交易日志"""
    logger.info(
        f"📊 交易：{symbol} {side} {quantity}股 @ ¥{price}",
        extra={"trade": True}
    )


def log_signal(symbol: str, signal_type: str, reason: str):
    """记录交易信号日志"""
    logger.info(
        f"📡 信号：{symbol} {signal_type} - {reason}",
        extra={"signal": True}
    )


def log_error(error: Exception, context: dict = None):
    """记录错误日志"""
    if context:
        logger.error(f"❌ 错误：{error} | 上下文：{context}", exc_info=True)
    else:
        logger.error(f"❌ 错误：{error}", exc_info=True)


def log_performance(operation: str, duration: float, threshold: float = 1.0):
    """记录性能日志"""
    if duration > threshold:
        logger.warning(
            f"⚠️ 性能警告：{operation} 耗时 {duration*1000:.2f}ms (阈值：{threshold*1000}ms)"
        )
    else:
        logger.debug(f"✅ 性能：{operation} 耗时 {duration*1000:.2f}ms")
