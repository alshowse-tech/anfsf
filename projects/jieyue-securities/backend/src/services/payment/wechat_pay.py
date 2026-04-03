"""
微信支付服务
集成微信支付 SDK
"""

import hashlib
import hmac
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


class WeChatPayService(PaymentServiceBase):
    """微信支付服务"""
    
    def __init__(
        self,
        app_id: str,
        mch_id: str,
        api_key: str,
        api_secret: Optional[str] = None,
        cert_path: Optional[str] = None,
        key_path: Optional[str] = None,
        notify_url: str = "/api/payment/wechat/notify",
        sandbox: bool = True
    ):
        self.app_id = app_id
        self.mch_id = mch_id
        self.api_key = api_key
        self.api_secret = api_secret
        self.cert_path = cert_path
        self.key_path = key_path
        self.notify_url = notify_url
        self.sandbox = sandbox
        
        # API 端点
        self.base_url = (
            "https://api.mch.weixin.qq.com/v3"
            if not sandbox
            else "https://api.mch.weixin.qq.com/sandbox/v3"
        )
    
    def _generate_nonce_str(self) -> str:
        """生成随机字符串"""
        return uuid.uuid4().hex
    
    def _generate_timestamp(self) -> int:
        """生成时间戳"""
        return int(time.time())
    
    def _generate_sign(self, params: Dict[str, Any]) -> str:
        """
        生成签名 (v2 版本)
        """
        sorted_params = sorted(params.items())
        sign_str = "&".join(f"{k}={v}" for k, v in sorted_params if v is not None)
        sign_str += f"&key={self.api_key}"
        
        return hashlib.md5(sign_str.encode('utf-8')).hexdigest().upper()
    
    def _generate_v3_sign(
        self,
        method: str,
        url: str,
        timestamp: int,
        nonce_str: str,
        body: str = ""
    ) -> str:
        """
        生成 v3 版本签名
        """
        sign_content = f"{method}\n{url}\n{timestamp}\n{nonce_str}\n{body}\n"
        
        # 使用 API v3 密钥进行 HMAC-SHA256 签名
        signature = hmac.new(
            self.api_secret.encode('utf-8'),
            sign_content.encode('utf-8'),
            hashlib.sha256
        ).digest()
        
        import base64
        return base64.b64encode(signature).decode('utf-8')
    
    async def create_order(self, order: PaymentOrder) -> Dict[str, Any]:
        """
        创建支付订单 (JSAPI/Native)
        """
        import httpx
        
        # 准备请求参数
        nonce_str = self._generate_nonce_str()
        timestamp = self._generate_timestamp()
        
        # v3 版本请求体
        payload = {
            "appid": self.app_id,
            "mchid": self.mch_id,
            "description": order.description,
            "out_trade_no": order.order_id,
            "notify_url": self.notify_url,
            "amount": {
                "total": int(order.amount * 100),  # 转换为分
                "currency": "CNY"
            }
        }
        
        # 如果是 Native 支付，添加支付类型
        if order.extra_data.get("trade_type") == "NATIVE":
            payload["trade_type"] = "NATIVE"
        
        # 生成签名
        url_path = "/v3/pay/transactions/jsapi" if order.extra_data.get("trade_type") == "JSAPI" else "/v3/pay/transactions/native"
        signature = self._generate_v3_sign(
            method="POST",
            url=f"{self.base_url}{url_path}",
            timestamp=timestamp,
            nonce_str=nonce_str,
            body=str(payload)
        )
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f'WECHATPAY2-SHA256-RSA2048 {signature}',
            "Wechatpay-Serial": "YOUR_MERCHANT_CERTIFICATE_SERIAL"
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}{url_path}",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                
                # 更新订单状态
                order.status = PaymentStatus.PENDING
                order.transaction_id = result.get("transaction_id")
                
                # 返回前端所需参数
                if order.extra_data.get("trade_type") == "NATIVE":
                    return {
                        "success": True,
                        "code_url": result.get("code_url"),  # 二维码链接
                        "order_id": order.order_id
                    }
                else:
                    # JSAPI 支付需要再次签名
                    pay_params = {
                        "appId": self.app_id,
                        "timeStamp": str(timestamp),
                        "nonceStr": nonce_str,
                        "package": f"prepay_id={result.get('prepay_id')}",
                        "signType": "RSA"
                    }
                    pay_params["paySign"] = self._generate_v3_sign(
                        method="POST",
                        url="/v3/pay/transactions/jsapi",
                        timestamp=timestamp,
                        nonce_str=nonce_str,
                        body=str(pay_params)
                    )
                    
                    return {
                        "success": True,
                        "pay_params": pay_params,
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
        
        nonce_str = self._generate_nonce_str()
        timestamp = self._generate_timestamp()
        
        signature = self._generate_v3_sign(
            method="GET",
            url=f"{self.base_url}/pay/transactions/out-trade-no/{order_id}",
            timestamp=timestamp,
            nonce_str=nonce_str
        )
        
        headers = {
            "Accept": "application/json",
            "Authorization": f'WECHATPAY2-SHA256-RSA2048 {signature}',
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/pay/transactions/out-trade-no/{order_id}",
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                
                # 创建 PaymentOrder 对象
                order = PaymentOrder(
                    order_id=order_id,
                    user_id=0,  # 需要从数据库获取
                    amount=Decimal(str(result.get("amount", {}).get("total", 0))) / 100,
                    method=PaymentMethod.WECHAT
                )
                
                # 映射状态
                trade_state = result.get("trade_state", "")
                if trade_state == "SUCCESS":
                    order.status = PaymentStatus.SUCCESS
                    order.paid_at = datetime.fromisoformat(result.get("success_time", ""))
                elif trade_state == "NOTPAY":
                    order.status = PaymentStatus.PENDING
                else:
                    order.status = PaymentStatus.FAILED
                
                order.transaction_id = result.get("transaction_id")
                
                return order
        
        except Exception as e:
            # 返回失败订单
            order = PaymentOrder(
                order_id=order_id,
                user_id=0,
                amount=Decimal("0"),
                method=PaymentMethod.WECHAT
            )
            order.status = PaymentStatus.FAILED
            order.extra_data = {"error": str(e)}
            return order
    
    async def handle_callback(self, callback_data: Dict[str, Any]) -> PaymentOrder:
        """
        处理支付回调
        """
        # 验证签名
        if not self.verify_signature(callback_data):
            raise ValueError("Invalid signature")
        
        # 解析回调数据
        resource = callback_data.get("resource", {})
        decrypted_data = self._decrypt_resource(resource)
        
        # 创建订单对象
        order = PaymentOrder(
            order_id=decrypted_data.get("out_trade_no"),
            user_id=0,  # 需要从数据库获取
            amount=Decimal(str(decrypted_data.get("amount", {}).get("total", 0))) / 100,
            method=PaymentMethod.WECHAT
        )
        
        # 更新状态
        trade_state = decrypted_data.get("trade_state", "")
        if trade_state == "SUCCESS":
            order.status = PaymentStatus.SUCCESS
            order.paid_at = datetime.now()
            order.transaction_id = decrypted_data.get("transaction_id")
        
        return order
    
    def _decrypt_resource(self, resource: Dict[str, Any]) -> Dict[str, Any]:
        """
        解密回调资源
        """
        from cryptography.hazmat.primitives.ciphers.aead import AESGCM
        import base64
        
        ciphertext = base64.b64decode(resource.get("ciphertext", ""))
        nonce = base64.b64decode(resource.get("nonce", ""))
        associated_data = resource.get("associated_data", "")
        
        aesgcm = AESGCM(self.api_secret.encode('utf-8'))
        decrypted = aesgcm.decrypt(nonce, ciphertext, associated_data.encode('utf-8'))
        
        import json
        return json.loads(decrypted.decode('utf-8'))
    
    async def refund(self, refund_order: RefundOrder) -> Dict[str, Any]:
        """
        处理退款
        """
        import httpx
        
        nonce_str = self._generate_nonce_str()
        timestamp = self._generate_timestamp()
        
        payload = {
            "out_trade_no": refund_order.order_id,
            "out_refund_no": refund_order.refund_id,
            "reason": refund_order.reason,
            "amount": {
                "refund": int(refund_order.amount * 100),
                "total": int(refund_order.amount * 100),
                "currency": "CNY"
            }
        }
        
        signature = self._generate_v3_sign(
            method="POST",
            url=f"{self.base_url}/v3/refund/domestic/refunds",
            timestamp=timestamp,
            nonce_str=nonce_str,
            body=str(payload)
        )
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": f'WECHATPAY2-SHA256-RSA2048 {signature}',
        }
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/v3/refund/domestic/refunds",
                    json=payload,
                    headers=headers
                )
                response.raise_for_status()
                result = response.json()
                
                refund_order.status = PaymentStatus.PENDING
                refund_order.refunded_at = datetime.now()
                
                return {
                    "success": True,
                    "refund_id": result.get("out_refund_no"),
                    "status": result.get("status")
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
        try:
            # 获取签名相关头信息
            signature = callback_data.get("signature", "")
            timestamp = callback_data.get("timestamp", "")
            nonce = callback_data.get("nonce", "")
            body = callback_data.get("body", "")
            
            # 重新计算签名
            sign_content = f"{timestamp}\n{nonce}\n{body}\n"
            
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import padding
            from cryptography.hazmat.backends import default_backend
            
            # 加载微信支付平台证书
            # 实际使用时需要从证书加载公钥
            # 这里简化处理
            return True  # TODO: 实现完整的签名验证
        
        except Exception:
            return False
