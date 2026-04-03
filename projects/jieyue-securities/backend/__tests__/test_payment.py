# Payment Service Tests

import pytest
from unittest.mock import Mock, patch, AsyncMock
from decimal import Decimal
from datetime import datetime

from src.services.payment.base import (
    PaymentOrder,
    RefundOrder,
    PaymentMethod,
    PaymentStatus
)
from src.services.payment.wechat_pay import WeChatPayService
from src.services.payment.alipay import AlipayService


class TestPaymentOrder:
    """支付订单测试"""
    
    def test_create_payment_order(self):
        """测试创建支付订单"""
        order = PaymentOrder(
            order_id="ORDER_123",
            user_id=1,
            amount=Decimal("100.00"),
            method=PaymentMethod.WECHAT,
            description="账户充值"
        )
        
        assert order.order_id == "ORDER_123"
        assert order.user_id == 1
        assert order.amount == Decimal("100.00")
        assert order.method == PaymentMethod.WECHAT
        assert order.status == PaymentStatus.INIT
    
    def test_payment_order_to_dict(self):
        """测试订单转字典"""
        order = PaymentOrder(
            order_id="ORDER_123",
            user_id=1,
            amount=Decimal("100.00"),
            method=PaymentMethod.ALIPAY
        )
        
        data = order.to_dict()
        
        assert data["order_id"] == "ORDER_123"
        assert data["amount"] == 100.0
        assert data["method"] == "alipay"


class TestRefundOrder:
    """退款订单测试"""
    
    def test_create_refund_order(self):
        """测试创建退款订单"""
        refund = RefundOrder(
            refund_id="REFUND_123",
            order_id="ORDER_123",
            amount=Decimal("50.00"),
            reason="用户申请退款"
        )
        
        assert refund.refund_id == "REFUND_123"
        assert refund.order_id == "ORDER_123"
        assert refund.amount == Decimal("50.00")
        assert refund.status == PaymentStatus.INIT


class TestWeChatPayService:
    """微信支付服务测试"""
    
    @pytest.fixture
    def wechat_service(self):
        return WeChatPayService(
            app_id="wx_test_app_id",
            mch_id="1234567890",
            api_key="test_api_key",
            api_secret="test_api_secret",
            sandbox=True
        )
    
    def test_generate_nonce_str(self, wechat_service):
        """测试生成随机字符串"""
        nonce1 = wechat_service._generate_nonce_str()
        nonce2 = wechat_service._generate_nonce_str()
        
        assert len(nonce1) == 32
        assert nonce1 != nonce2
    
    def test_generate_timestamp(self, wechat_service):
        """测试生成时间戳"""
        timestamp = wechat_service._generate_timestamp()
        
        assert isinstance(timestamp, int)
        assert timestamp > 0
    
    def test_generate_sign(self, wechat_service):
        """测试生成签名"""
        params = {
            "appid": "wx123",
            "mch_id": "123456",
            "nonce_str": "abc123",
            "total_fee": "100"
        }
        
        sign = wechat_service._generate_sign(params)
        
        assert len(sign) == 32
        assert sign.isupper()
    
    @pytest.mark.asyncio
    async def test_create_order_native(self, wechat_service):
        """测试创建 Native 支付订单"""
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.json.return_value = {
                "code_url": "weixin://wxpay/bizpayurl?test=123",
                "prepay_id": "wx26160922123456789"
            }
            mock_post.return_value.__aenter__.return_value.raise_for_status = Mock()
            
            order = PaymentOrder(
                order_id="ORDER_TEST",
                user_id=1,
                amount=Decimal("100.00"),
                method=PaymentMethod.WECHAT,
                extra_data={"trade_type": "NATIVE"}
            )
            
            result = await wechat_service.create_order(order)
            
            assert result["success"] is True
            assert "code_url" in result
    
    @pytest.mark.asyncio
    async def test_query_order_success(self, wechat_service):
        """测试查询订单成功"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json.return_value = {
                "trade_state": "SUCCESS",
                "transaction_id": "1234567890",
                "success_time": "2024-01-01T12:00:00Z",
                "amount": {"total": 10000}
            }
            mock_get.return_value.__aenter__.return_value.raise_for_status = Mock()
            
            order = await wechat_service.query_order("ORDER_TEST")
            
            assert order.status == PaymentStatus.SUCCESS
            assert order.transaction_id == "1234567890"
    
    @pytest.mark.asyncio
    async def test_query_order_pending(self, wechat_service):
        """测试查询订单待支付"""
        with patch('httpx.AsyncClient.get') as mock_get:
            mock_get.return_value.__aenter__.return_value.json.return_value = {
                "trade_state": "NOTPAY",
                "amount": {"total": 10000}
            }
            mock_get.return_value.__aenter__.return_value.raise_for_status = Mock()
            
            order = await wechat_service.query_order("ORDER_TEST")
            
            assert order.status == PaymentStatus.PENDING
    
    @pytest.mark.asyncio
    async def test_refund(self, wechat_service):
        """测试退款"""
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.json.return_value = {
                "out_refund_no": "REFUND_TEST",
                "status": "PROCESSING"
            }
            mock_post.return_value.__aenter__.return_value.raise_for_status = Mock()
            
            refund_order = RefundOrder(
                refund_id="REFUND_TEST",
                order_id="ORDER_TEST",
                amount=Decimal("50.00"),
                reason="用户申请退款"
            )
            
            result = await wechat_service.refund(refund_order)
            
            assert result["success"] is True
            assert result["refund_id"] == "REFUND_TEST"


class TestAlipayService:
    """支付宝支付服务测试"""
    
    @pytest.fixture
    def alipay_service(self):
        # 使用测试密钥
        return AlipayService(
            app_id="2021000000000000",
            private_key="-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MvDvJx8HxPZfJx8H\n-----END RSA PRIVATE KEY-----",
            alipay_public_key="-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWy\n-----END PUBLIC KEY-----",
            sandbox=True
        )
    
    def test_generate_out_trade_no(self, alipay_service):
        """测试生成商户订单号"""
        order_no1 = alipay_service._generate_out_trade_no()
        order_no2 = alipay_service._generate_out_trade_no()
        
        assert order_no1.startswith("ALIPAY_")
        assert order_no1 != order_no2
    
    @pytest.mark.asyncio
    async def test_create_order_wap(self, alipay_service):
        """测试创建 WAP 支付订单"""
        order = PaymentOrder(
            order_id="ORDER_TEST",
            user_id=1,
            amount=Decimal("100.00"),
            method=PaymentMethod.ALIPAY,
            extra_data={"trade_type": "WAP"}
        )
        
        result = await alipay_service.create_order(order)
        
        assert result["success"] is True
        assert "pay_url" in result
        assert "gateway.do" in result["pay_url"]
    
    @pytest.mark.asyncio
    async def test_query_order_success(self, alipay_service):
        """测试查询订单成功"""
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.json.return_value = {
                "alipay_trade_query_response": {
                    "trade_status": "TRADE_SUCCESS",
                    "trade_no": "202401011234567890",
                    "total_amount": "100.00"
                }
            }
            mock_post.return_value.__aenter__.return_value.raise_for_status = Mock()
            
            order = await alipay_service.query_order("ORDER_TEST")
            
            assert order.status == PaymentStatus.SUCCESS
            assert order.transaction_id == "202401011234567890"
    
    @pytest.mark.asyncio
    async def test_refund(self, alipay_service):
        """测试退款"""
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.return_value.__aenter__.return_value.json.return_value = {
                "alipay_trade_refund_response": {
                    "fund_change": "Y",
                    "buyer_logon_id": "138***0000"
                }
            }
            mock_post.return_value.__aenter__.return_value.raise_for_status = Mock()
            
            refund_order = RefundOrder(
                refund_id="REFUND_TEST",
                order_id="ORDER_TEST",
                amount=Decimal("50.00"),
                reason="用户申请退款"
            )
            
            result = await alipay_service.refund(refund_order)
            
            assert result["success"] is True
            assert result["refund_id"] == "REFUND_TEST"
