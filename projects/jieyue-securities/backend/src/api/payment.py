# Payment API Routes

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from decimal import Decimal
from typing import Optional
import uuid
from datetime import datetime

from src.db.session import get_db
from src.db.models import Wallet, Transaction, TransactionType, TransactionStatus
from src.services.payment.base import PaymentOrder, RefundOrder, PaymentMethod, PaymentStatus
from src.services.payment.wechat_pay import WeChatPayService
from src.services.payment.alipay import AlipayService

router = APIRouter(prefix="/api/payment", tags=["payment"])

# 支付配置 (应从环境变量读取)
WECHAT_CONFIG = {
    "app_id": "wx_test_app_id",
    "mch_id": "1234567890",
    "api_key": "test_api_key",
    "api_secret": "test_api_secret",
    "sandbox": True
}

ALIPAY_CONFIG = {
    "app_id": "2021000000000000",
    "private_key": "-----BEGIN RSA PRIVATE KEY-----\nTEST_KEY\n-----END RSA PRIVATE KEY-----",
    "alipay_public_key": "-----BEGIN PUBLIC KEY-----\nTEST_PUBLIC_KEY\n-----END PUBLIC KEY-----",
    "sandbox": True
}

# 初始化支付服务
wechat_pay = WeChatPayService(**WECHAT_CONFIG)
alipay_pay = AlipayService(**ALIPAY_CONFIG)


class CreateOrderRequest(BaseModel):
    amount: float
    method: str  # "wechat" or "alipay"
    description: Optional[str] = "账户充值"


class CreateOrderResponse(BaseModel):
    success: bool
    order_id: str
    pay_url: Optional[str] = None
    code_url: Optional[str] = None
    pay_params: Optional[dict] = None
    error: Optional[str] = None


@router.post("/create-order", response_model=CreateOrderResponse)
async def create_payment_order(
    request: CreateOrderRequest,
    user_id: int,
    db: Session = Depends(get_db)
):
    """
    创建支付订单
    """
    if request.amount <= 0:
        raise HTTPException(status_code=400, detail="充值金额必须大于 0")
    
    # 生成订单号
    order_id = f"ORDER_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
    
    # 创建支付订单对象
    payment_order = PaymentOrder(
        order_id=order_id,
        user_id=user_id,
        amount=Decimal(str(request.amount)),
        method=PaymentMethod(request.method),
        description=request.description
    )
    
    try:
        # 调用支付服务创建订单
        if request.method == "wechat":
            result = await wechat_pay.create_order(payment_order)
        elif request.method == "alipay":
            result = await alipay_pay.create_order(payment_order)
        else:
            raise HTTPException(status_code=400, detail="不支持的支付方式")
        
        if result.get("success"):
            # 保存订单到数据库
            transaction = Transaction(
                user_id=user_id,
                type=TransactionType.RECHARGE,
                amount=payment_order.amount,
                status=TransactionStatus.INIT
            )
            transaction.extra_data = {
                "payment_order_id": order_id,
                "payment_method": request.method
            }
            db.add(transaction)
            db.commit()
            
            return CreateOrderResponse(
                success=True,
                order_id=order_id,
                pay_url=result.get("pay_url"),
                code_url=result.get("code_url"),
                pay_params=result.get("pay_params")
            )
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "创建订单失败"))
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/query-order/{order_id}")
async def query_payment_order(
    order_id: str,
    db: Session = Depends(get_db)
):
    """
    查询支付订单状态
    """
    try:
        # 先从数据库查询
        transaction = db.query(Transaction).filter(
            Transaction.extra_data["payment_order_id"].astext == order_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="订单不存在")
        
        # 从支付平台查询最新状态
        payment_method = transaction.extra_data.get("payment_method", "wechat")
        if payment_method == "wechat":
            order = await wechat_pay.query_order(order_id)
        else:
            order = await alipay_pay.query_order(order_id)
        
        # 更新数据库状态
        if order.status == PaymentStatus.SUCCESS:
            transaction.status = TransactionStatus.SUCCESS
            
            # 更新钱包余额
            wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()
            if not wallet:
                wallet = Wallet(user_id=transaction.user_id, balance=0)
                db.add(wallet)
            wallet.balance += transaction.amount
            
            db.commit()
        
        return {
            "success": True,
            "order_id": order_id,
            "status": order.status.value,
            "amount": float(order.amount),
            "paid_at": order.paid_at.isoformat() if order.paid_at else None
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/wechat/notify")
async def wechat_payment_notify(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    微信支付回调
    """
    try:
        callback_data = await request.json()
        
        # 处理回调
        order = await wechat_pay.handle_callback(callback_data)
        
        if order.status == PaymentStatus.SUCCESS:
            # 更新数据库
            transaction = db.query(Transaction).filter(
                Transaction.extra_data["payment_order_id"].astext == order.order_id
            ).first()
            
            if transaction:
                transaction.status = TransactionStatus.SUCCESS
                
                # 更新钱包
                wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()
                if not wallet:
                    wallet = Wallet(user_id=transaction.user_id, balance=0)
                    db.add(wallet)
                wallet.balance += transaction.amount
                
                db.commit()
        
        # 返回成功响应给微信
        return {
            "code": "SUCCESS",
            "message": "OK"
        }
    
    except Exception as e:
        return {
            "code": "FAIL",
            "message": str(e)
        }


@router.post("/alipay/notify")
async def alipay_payment_notify(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    支付宝支付回调
    """
    try:
        # 支付宝回调是 form-data
        form_data = await request.form()
        callback_data = dict(form_data)
        
        # 处理回调
        order = await alipay_pay.handle_callback(callback_data)
        
        if order.status == PaymentStatus.SUCCESS:
            # 更新数据库
            transaction = db.query(Transaction).filter(
                Transaction.extra_data["payment_order_id"].astext == order.order_id
            ).first()
            
            if transaction:
                transaction.status = TransactionStatus.SUCCESS
                
                # 更新钱包
                wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()
                if not wallet:
                    wallet = Wallet(user_id=transaction.user_id, balance=0)
                    db.add(wallet)
                wallet.balance += transaction.amount
                
                db.commit()
        
        # 返回成功响应给支付宝
        return "success"
    
    except Exception as e:
        return "fail"


@router.post("/refund")
async def refund_payment(
    order_id: str,
    amount: float,
    reason: Optional[str] = "用户申请退款",
    db: Session = Depends(get_db)
):
    """
    退款处理
    """
    try:
        # 查询原订单
        transaction = db.query(Transaction).filter(
            Transaction.extra_data["payment_order_id"].astext == order_id
        ).first()
        
        if not transaction:
            raise HTTPException(status_code=404, detail="订单不存在")
        
        if transaction.status != TransactionStatus.SUCCESS:
            raise HTTPException(status_code=400, detail="订单未支付成功")
        
        # 生成退款单号
        refund_id = f"REFUND_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:8]}"
        
        refund_order = RefundOrder(
            refund_id=refund_id,
            order_id=order_id,
            amount=Decimal(str(amount)),
            reason=reason
        )
        
        # 调用支付服务退款
        payment_method = transaction.extra_data.get("payment_method", "wechat")
        if payment_method == "wechat":
            result = await wechat_pay.refund(refund_order)
        else:
            result = await alipay_pay.refund(refund_order)
        
        if result.get("success"):
            # 更新数据库
            transaction.status = TransactionStatus.REFUNDED
            
            # 扣减钱包余额
            wallet = db.query(Wallet).filter(Wallet.user_id == transaction.user_id).first()
            if wallet:
                wallet.balance -= transaction.amount
            
            # 创建退款记录
            refund_transaction = Transaction(
                user_id=transaction.user_id,
                type=TransactionType.REFUND,
                amount=transaction.amount,
                status=TransactionStatus.SUCCESS
            )
            db.add(refund_transaction)
            db.commit()
            
            return {
                "success": True,
                "refund_id": refund_id,
                "message": "退款成功"
            }
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "退款失败"))
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
