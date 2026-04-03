"""
捷阅证券信息助手 - 日志系统
提供结构化日志、日志分级、日志轮转、敏感信息过滤功能
"""

import logging
import sys
import json
import re
from datetime import datetime
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from typing import Any, Dict, Optional
from pathlib import Path
from dotenv import load_dotenv
import os

load_dotenv()


# ============== 敏感信息过滤器 ==============

class SensitiveDataFilter(logging.Filter):
    """敏感信息过滤器"""
    
    # 敏感信息模式
    SENSITIVE_PATTERNS = [
        (r'password["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'password=***'),
        (r'passwd["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'passwd=***'),
        (r'secret["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'secret=***'),
        (r'token["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'token=***'),
        (r'api_key["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'api_key=***'),
        (r'authorization["\']?\s*[:=]\s*["\']?[^"\'\s,}]+', 'authorization=***'),
        (r'Bearer\s+[A-Za-z0-9\-_\.]+', 'Bearer ***'),
        (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 'email=***'),
        (r'\b\d{11}\b', 'phone=***'),  # 手机号
        (r'\b\d{16,19}\b', 'card=***'),  # 银行卡号
    ]
    
    def filter(self, record: logging.LogRecord) -> bool:
        """
        过滤日志记录中的敏感信息
        
        Args:
            record: 日志记录
            
        Returns:
            bool: 是否保留日志
        """
        # 过滤消息
        if record.msg:
            record.msg = self._sanitize(str(record.msg))
        
        # 过滤参数
        if record.args:
            if isinstance(record.args, dict):
                record.args = {
                    k: self._sanitize(str(v)) if isinstance(v, str) else v
                    for k, v in record.args.items()
                }
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    self._sanitize(str(arg)) if isinstance(arg, str) else arg
                    for arg in record.args
                )
        
        return True
    
    def _sanitize(self, text: str) -> str:
        """
        清理文本中的敏感信息
        
        Args:
            text: 原始文本
            
        Returns:
            str: 清理后的文本
        """
        sanitized = text
        for pattern, replacement in self.SENSITIVE_PATTERNS:
            sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)
        return sanitized


# ============== 结构化日志格式化器 ==============

class StructuredFormatter(logging.Formatter):
    """结构化日志格式化器（JSON 格式）"""
    
    def __init__(self, include_extra: bool = True):
        """
        初始化格式化器
        
        Args:
            include_extra: 是否包含额外字段
        """
        super().__init__()
        self.include_extra = include_extra
    
    def format(self, record: logging.LogRecord) -> str:
        """
        格式化日志记录为 JSON
        
        Args:
            record: 日志记录
            
        Returns:
            str: JSON 格式日志
        """
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # 添加额外字段
        if self.include_extra:
            extra_fields = {
                k: v for k, v in record.__dict__.items()
                if k not in {
                    'name', 'msg', 'args', 'created', 'filename', 'funcName',
                    'levelname', 'levelno', 'lineno', 'module', 'msecs',
                    'pathname', 'process', 'processName', 'relativeCreated',
                    'stack_info', 'exc_info', 'exc_text', 'thread', 'threadName',
                    'message', 'asctime'
                }
            }
            if extra_fields:
                log_data["extra"] = extra_fields
        
        # 添加异常信息
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data, ensure_ascii=False, default=str)


class ConsoleFormatter(logging.Formatter):
    """控制台日志格式化器（人类可读格式）"""
    
    # 日志级别颜色
    COLORS = {
        'DEBUG': '\033[36m',     # 青色
        'INFO': '\033[32m',      # 绿色
        'WARNING': '\033[33m',   # 黄色
        'ERROR': '\033[31m',     # 红色
        'CRITICAL': '\033[35m',  # 紫色
    }
    RESET = '\033[0m'
    
    def format(self, record: logging.LogRecord) -> str:
        """
        格式化日志记录
        
        Args:
            record: 日志记录
            
        Returns:
            str: 格式化后的日志
        """
        # 添加颜色
        color = self.COLORS.get(record.levelname, '')
        reset = self.RESET
        
        # 格式化时间
        asctime = datetime.fromtimestamp(record.created).strftime('%Y-%m-%d %H:%M:%S')
        
        # 构建日志消息
        log_msg = (
            f"{color}[{asctime}] [{record.levelname:8}]{reset} "
            f"{record.name}: {record.getMessage()}"
        )
        
        # 添加异常信息
        if record.exc_info:
            log_msg += f"\n{self.formatException(record.exc_info)}"
        
        return log_msg


# ============== 日志配置 ==============

class LoggerConfig:
    """日志配置类"""
    
    def __init__(
        self,
        log_level: str = "INFO",
        log_dir: str = "logs",
        log_file: str = "app.log",
        max_bytes: int = 10 * 1024 * 1024,  # 10MB
        backup_count: int = 10,
        log_format: str = "json",  # "json" or "console"
        include_sensitive: bool = False
    ):
        """
        初始化日志配置
        
        Args:
            log_level: 日志级别
            log_dir: 日志目录
            log_file: 日志文件名
            max_bytes: 单个日志文件最大大小
            backup_count: 保留的备份文件数量
            log_format: 日志格式 ("json" 或 "console")
            include_sensitive: 是否记录敏感信息（生产环境应为 False）
        """
        self.log_level = getattr(logging, log_level.upper(), logging.INFO)
        self.log_dir = Path(log_dir)
        self.log_file = log_file
        self.max_bytes = max_bytes
        self.backup_count = backup_count
        self.log_format = log_format
        self.include_sensitive = include_sensitive
        
        # 创建日志目录
        self.log_dir.mkdir(parents=True, exist_ok=True)
    
    def setup_logger(self, name: str) -> logging.Logger:
        """
        设置并返回日志器
        
        Args:
            name: 日志器名称
            
        Returns:
            logging.Logger: 配置好的日志器
        """
        logger = logging.getLogger(name)
        logger.setLevel(self.log_level)
        
        # 避免重复添加处理器
        if logger.handlers:
            return logger
        
        # 创建控制台处理器
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(self.log_level)
        
        if self.log_format == "json":
            console_formatter = StructuredFormatter()
        else:
            console_formatter = ConsoleFormatter()
        
        console_handler.setFormatter(console_formatter)
        
        # 添加敏感信息过滤器
        if not self.include_sensitive:
            console_handler.addFilter(SensitiveDataFilter())
        
        logger.addHandler(console_handler)
        
        # 创建文件处理器（带轮转）
        file_path = self.log_dir / self.log_file
        file_handler = RotatingFileHandler(
            file_path,
            maxBytes=self.max_bytes,
            backupCount=self.backup_count,
            encoding='utf-8'
        )
        file_handler.setLevel(self.log_level)
        file_handler.setFormatter(StructuredFormatter())
        
        if not self.include_sensitive:
            file_handler.addFilter(SensitiveDataFilter())
        
        logger.addHandler(file_handler)
        
        # 创建按时间轮转的处理器（每天）
        time_file_path = self.log_dir / self.log_file.replace('.log', '.time.log')
        time_handler = TimedRotatingFileHandler(
            time_file_path,
            when='D',
            interval=1,
            backupCount=self.backup_count,
            encoding='utf-8'
        )
        time_handler.setLevel(self.log_level)
        time_handler.setFormatter(StructuredFormatter())
        
        if not self.include_sensitive:
            time_handler.addFilter(SensitiveDataFilter())
        
        logger.addHandler(time_handler)
        
        return logger


# ============== 全局日志器 ==============

# 从环境变量加载配置
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_DIR = os.getenv("LOG_DIR", "logs")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")
INCLUDE_SENSITIVE = os.getenv("INCLUDE_SENSITIVE", "false").lower() == "true"

# 创建日志配置
logger_config = LoggerConfig(
    log_level=LOG_LEVEL,
    log_dir=LOG_DIR,
    log_format=LOG_FORMAT,
    include_sensitive=INCLUDE_SENSITIVE
)

# 创建全局日志器
logger = logger_config.setup_logger("jieyue")


# ============== 便捷日志函数 ==============

def get_logger(name: str) -> logging.Logger:
    """
    获取命名日志器
    
    Args:
        name: 日志器名称
        
    Returns:
        logging.Logger: 日志器
    """
    return logger_config.setup_logger(name)


def log_debug(message: str, **kwargs):
    """记录 DEBUG 日志"""
    logger.debug(message, extra=kwargs)


def log_info(message: str, **kwargs):
    """记录 INFO 日志"""
    logger.info(message, extra=kwargs)


def log_warning(message: str, **kwargs):
    """记录 WARNING 日志"""
    logger.warning(message, extra=kwargs)


def log_error(message: str, exc_info: bool = False, **kwargs):
    """记录 ERROR 日志"""
    logger.error(message, exc_info=exc_info, extra=kwargs)


def log_critical(message: str, exc_info: bool = False, **kwargs):
    """记录 CRITICAL 日志"""
    logger.critical(message, exc_info=exc_info, extra=kwargs)


# 导出
__all__ = [
    "logger",
    "get_logger",
    "log_debug",
    "log_info",
    "log_warning",
    "log_error",
    "log_critical",
    "LoggerConfig",
    "StructuredFormatter",
    "ConsoleFormatter",
    "SensitiveDataFilter"
]
