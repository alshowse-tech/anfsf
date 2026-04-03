"""
支付宝支付服务
集成支付宝 SDK
"""

import hashlib
import time
import uuid
from typing import Optional, Dict, Any
from decimal import Decimal
from datetime import datetime

from .base import (
    PaymentServiceBase,
    PaymentOrder,
    RefundOrder,
    PaymentMethod,
    PaymentStatus
)


class AlipayService(PaymentServiceBase):
    """支付宝支付服务"""
    
    def __init__(
        self,
        app_id: str,
        private_key: str,
        alipay_public_key: str,
        notify_url: str = "/api/payment/alipay/notify",
        sandbox: bool = True
    ):
        self.app_id = app_id
        self.private_key = private_key
        self.alipay_public_key = alipay_public_key
        self.notify_url = notify_url
        self.sandbox = sandbox
        
        # API 网关
        self.gateway_url = (
            "https://openapi.alipay.com/gateway.do"
            if not sandbox
            else "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
        )
    
    def _generate_out_trade_no(self) -> str:
        """生成商户订单号"""
        return f"ALIPAY_{int(time.time() * 1000)}_{uuid.uuid4().hex[:8]}"
    
    def _generate_sign(self, params: Dict[str, Any]) -> str:
        """
        生成签名 (RSA2)
        """
        # 过滤空值和 sign 本身
        filtered_params = {
            k: v for k, v in sorted(params.items())
            if v is not None and k != "sign" and k != "sign_type"
        }
        
        # 拼接签名字符串
        sign_str = "&".join(f"{k}={v}" for k, v in filtered_params)
        
        # RSA 签名
        from Crypto.Signature import PKCS1_v1_5
        from Crypto.Hash import SHA256
        from Crypto.PublicKey import RSA
        
        key = RSA.import_key(self.private_key.encode('utf-8'))
        signer = PKCS1_v1_5.new(key)
        digest = SHA256.new(sign_str.encode('utf-8'))
        signature = signer.sign(digest)
        
        import base64
        return base64.b64encode(signature).decode('utf-8')
    
    def _verify_sign(self, params: Dict[str, Any]) -> bool:
        """
        验证签名
        """
        try:
            sign = params.pop("sign", None)
            if not sign:
                return False
            
            # 过滤空值
            filtered_params = {
                k: v for k, v in sorted(params.items())
                if v is not None and k != "sign_type"
            }
            
            # 拼接签名字符串
            sign_str = "&".join(f"{k}={v}" for k, v in filtered_params)
            
            from Crypto.Signature import PKCS1_v1_5
            from Crypto.Hash import SHA256
            from Crypto.PublicKey import RSA
            import base64
            
            key = RSA.import_key(self.alipay_public_key.encode('utf-8'))
            signer = PKCS1_v1_5.new(key)
            digest = SHA256.new(sign_str.encode('utf-8'))
            
            return signer.verify(digest, base64.b64decode(sign))
        
        except Exception:
            return False
    
    async def create_order(self, order: PaymentOrder) -> Dict[str, Any]:
        """
        创建支付订单 (手机网站支付/电脑网站支付)
        """
        import httpx
        
        # 公共参数
        biz_content = {
            "out_trade_no": order.order_id,
            "total_amount": str(order.amount),
            "subject": order.description,
            "product_code": "QUICK_WAP_WAY" if order.extra_data.get("trade_type") == "WAP" else "FAST_INSTANT_TRADE_PAY",
            "timeout_express": "30m"
        }
        
        # 添加返回 URL
        if order.extra_data.get("return_url"):
            biz_content["quit_url"] = order.extra_data["return_url"]
        
        params = {
            "app_id": self.app_id,
            "method": "alipay.trade.wap.pay" if order.extra_data.get("trade_type") == "WAP" else "alipay.trade.page.pay",
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "notify_url": self.notify_url,
            "biz_content": str(biz_content)
        }
        
        # 生成签名
        params["sign"] = self._generate_sign(params)
        
        try:
            # 对于支付宝，我们返回支付链接
            # 前端需要重定向到这个链接
            query_string = "&".join(f"{k}={v}" for k, v in params.items())
            pay_url = f"{self.gateway_url}?{query_string}"
            
            order.status = PaymentStatus.PENDING
            
            return {
                "success": True,
                "pay_url": pay_url,
                "order_id": order.order_id
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def query_order(self, order_id: str) -> PaymentOrder:
        """
        查询订单状态
        """
        import httpx
        
        biz_content = {
            "out_trade_no": order_id
        }
        
        params = {
            "app_id": self.app_id,
            "method": "alipay.trade.query",
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "biz_content": str(biz_content)
        }
        
        params["sign"] = self._generate_sign(params)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.gateway_url, data=params)
                response.raise_for_status()
                result = response.json()
                
                alipay_response = result.get("alipay_trade_query_response", {})
                
                # 创建 PaymentOrder 对象
                order = PaymentOrder(
                    order_id=order_id,
                    user_id=0,
                    amount=Decimal(alipay_response.get("total_amount", "0")),
                    method=PaymentMethod.ALIPAY
                )
                
                # 映射状态
                trade_status = alipay_response.get("trade_status", "")
                if trade_status == "TRADE_SUCCESS" or trade_status == "TRADE_FINISHED":
                    order.status = PaymentStatus.SUCCESS
                    order.paid_at = datetime.now()
                elif trade_status == "TRADE_CLOSED":
                    order.status = PaymentStatus.FAILED
                else:
                    order.status = PaymentStatus.PENDING
                
                order.transaction_id = alipay_response.get("trade_no")
                
                return order
        
        except Exception as e:
            order = PaymentOrder(
                order_id=order_id,
                user_id=0,
                amount=Decimal("0"),
                method=PaymentMethod.ALIPAY
            )
            order.status = PaymentStatus.FAILED
            order.extra_data = {"error": str(e)}
            return order
    
    async def handle_callback(self, callback_data: Dict[str, Any]) -> PaymentOrder:
        """
        处理支付回调
        """
        # 验证签名
        if not self._verify_sign(callback_data.copy()):
            raise ValueError("Invalid signature")
        
        # 创建订单对象
        order = PaymentOrder(
            order_id=callback_data.get("out_trade_no"),
            user_id=0,
            amount=Decimal(callback_data.get("total_amount", "0")),
            method=PaymentMethod.ALIPAY
        )
        
        # 更新状态
        trade_status = callback_data.get("trade_status", "")
        if trade_status == "TRADE_SUCCESS" or trade_status == "TRADE_FINISHED":
            order.status = PaymentStatus.SUCCESS
            order.paid_at = datetime.now()
            order.transaction_id = callback_data.get("trade_no")
        
        return order
    
    async def refund(self, refund_order: RefundOrder) -> Dict[str, Any]:
        """
        处理退款
        """
        import httpx
        
        biz_content = {
            "out_trade_no": refund_order.order_id,
            "out_request_no": refund_order.refund_id,
            "refund_amount": str(refund_order.amount),
            "refund_reason": refund_order.reason
        }
        
        params = {
            "app_id": self.app_id,
            "method": "alipay.trade.refund",
            "format": "JSON",
            "charset": "utf-8",
            "sign_type": "RSA2",
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "version": "1.0",
            "biz_content": str(biz_content)
        }
        
        params["sign"] = self._generate_sign(params)
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(self.gateway_url, data=params)
                response.raise_for_status()
                result = response.json()
                
                alipay_response = result.get("alipay_trade_refund_response", {})
                
                refund_order.status = PaymentStatus.PENDING
                refund_order.refunded_at = datetime.now()
                
                return {
                    "success": True,
                    "refund_id": refund_order.refund_id,
                    "status": alipay_response.get("fund_change"),
                    "buyer_logon_id": alipay_response.get("buyer_logon_id")
                }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def verify_signature(self, callback_data: Dict[str, Any]) -> bool:
        """
        验证回调签名
        """
        return self._verify_sign(callback_data.copy())
