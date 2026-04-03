"""
支付服务基类
定义支付接口规范
"""

from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from decimal import Decimal
from datetime import datetime
from enum import Enum


class PaymentMethod(str, Enum):
    WECHAT = "wechat"
    ALIPAY = "alipay"


class PaymentStatus(str, Enum):
    INIT = "INIT"
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class PaymentOrder:
    """支付订单"""
    
    def __init__(
        self,
        order_id: str,
        user_id: int,
        amount: Decimal,
        method: PaymentMethod,
        description: str = "账户充值",
        **kwargs
    ):
        self.order_id = order_id
        self.user_id = user_id
        self.amount = amount
        self.method = method
        self.description = description
        self.status = PaymentStatus.INIT
        self.created_at = datetime.now()
        self.paid_at: Optional[datetime] = None
        self.transaction_id: Optional[str] = None  # 第三方支付流水号
        self.extra_data: Dict[str, Any] = kwargs
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "order_id": self.order_id,
            "user_id": self.user_id,
            "amount": float(self.amount),
            "method": self.method.value,
            "description": self.description,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
            "transaction_id": self.transaction_id,
            "extra_data": self.extra_data
        }


class RefundOrder:
    """退款订单"""
    
    def __init__(
        self,
        refund_id: str,
        order_id: str,
        amount: Decimal,
        reason: str = "用户申请退款"
    ):
        self.refund_id = refund_id
        self.order_id = order_id
        self.amount = amount
        self.reason = reason
        self.status = PaymentStatus.INIT
        self.created_at = datetime.now()
        self.refunded_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "refund_id": self.refund_id,
            "order_id": self.order_id,
            "amount": float(self.amount),
            "reason": self.reason,
            "status": self.status.value,
            "created_at": self.created_at.isoformat(),
            "refunded_at": self.refunded_at.isoformat() if self.refunded_at else None
        }


class PaymentServiceBase(ABC):
    """支付服务基类"""
    
    @abstractmethod
    async def create_order(self, order: PaymentOrder) -> Dict[str, Any]:
        """
        创建支付订单
        返回：包含支付参数（如二维码、支付链接等）
        """
        pass
    
    @abstractmethod
    async def query_order(self, order_id: str) -> PaymentOrder:
        """
        查询订单状态
        """
        pass
    
    @abstractmethod
    async def handle_callback(self, callback_data: Dict[str, Any]) -> PaymentOrder:
        """
        处理支付回调
        验证签名、更新订单状态
        """
        pass
    
    @abstractmethod
    async def refund(self, refund_order: RefundOrder) -> Dict[str, Any]:
        """
        处理退款
        """
        pass
    
    @abstractmethod
    def verify_signature(self, callback_data: Dict[str, Any]) -> bool:
        """
        验证回调签名
        """
        pass
