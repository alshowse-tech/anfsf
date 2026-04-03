# Database Tests

import pytest
from sqlalchemy.orm import Session
from decimal import Decimal
from src.db.models import (
    User, Wallet, Task, Transaction, Content, Summary, PricingConfig,
    TaskStatus, ContentType, TransactionType, TransactionStatus
)
from datetime import datetime, timedelta


class TestUserModel:
    """用户模型测试"""
    
    def test_create_user(self, db_session: Session):
        """测试创建用户"""
        user = User(phone="13800138000", wx_openid="test_openid")
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        
        assert user.id is not None
        assert user.phone == "13800138000"
        assert user.status == 1
    
    def test_user_unique_phone(self, db_session: Session):
        """测试手机号唯一性（如果需要）"""
        user1 = User(phone="13800138000")
        user2 = User(phone="13800138000")
        db_session.add(user1)
        db_session.add(user2)
        # 当前 schema 未设置唯一约束，应允许
        db_session.commit()


class TestWalletModel:
    """钱包模型测试"""
    
    def test_create_wallet(self, db_session: Session, test_user):
        """测试创建钱包"""
        wallet = Wallet(user_id=test_user.id, balance=Decimal("100.00"))
        db_session.add(wallet)
        db_session.commit()
        
        assert wallet.balance == Decimal("100.00")
    
    def test_wallet_balance_precision(self, db_session: Session, test_user):
        """测试余额精度"""
        wallet = Wallet(user_id=test_user.id, balance=Decimal("99.99"))
        db_session.add(wallet)
        db_session.commit()
        
        assert wallet.balance == Decimal("99.99")


class TestTaskModel:
    """任务模型测试"""
    
    def test_create_task(self, db_session: Session, test_user):
        """测试创建任务"""
        task = Task(
            user_id=test_user.id,
            url="https://www.douyin.com/video/123",
            url_hash="abc123",
            platform="douyin",
            status=TaskStatus.INIT,
            content_type=ContentType.VIDEO
        )
        db_session.add(task)
        db_session.commit()
        db_session.refresh(task)
        
        assert task.id is not None
        assert task.status == TaskStatus.INIT
        assert task.content_type == ContentType.VIDEO
    
    def test_task_status_transition(self, db_session: Session, test_user):
        """测试任务状态流转"""
        task = Task(
            user_id=test_user.id,
            url="https://example.com",
            status=TaskStatus.INIT
        )
        db_session.add(task)
        db_session.commit()
        
        # 模拟状态流转
        task.status = TaskStatus.PARSING
        db_session.commit()
        assert task.status == TaskStatus.PARSING
        
        task.status = TaskStatus.ASR_PROCESSING
        db_session.commit()
        assert task.status == TaskStatus.ASR_PROCESSING
        
        task.status = TaskStatus.SUCCESS
        db_session.commit()
        assert task.status == TaskStatus.SUCCESS


class TestTransactionModel:
    """交易模型测试"""
    
    def test_create_recharge_transaction(self, db_session: Session, test_user):
        """测试创建充值交易"""
        transaction = Transaction(
            user_id=test_user.id,
            type=TransactionType.RECHARGE,
            amount=Decimal("100.00"),
            status=TransactionStatus.SUCCESS
        )
        db_session.add(transaction)
        db_session.commit()
        
        assert transaction.type == TransactionType.RECHARGE
        assert transaction.amount == Decimal("100.00")
    
    def test_create_consume_transaction(self, db_session: Session, test_user, test_task):
        """测试创建消费交易"""
        transaction = Transaction(
            user_id=test_user.id,
            task_id=test_task.id,
            type=TransactionType.CONSUME,
            amount=Decimal("2.50"),
            status=TransactionStatus.SUCCESS
        )
        db_session.add(transaction)
        db_session.commit()
        
        assert transaction.task_id == test_task.id
        assert transaction.type == TransactionType.CONSUME


class TestPricingConfig:
    """定价配置测试"""
    
    def test_create_pricing_config(self, db_session: Session):
        """测试创建定价配置"""
        config = PricingConfig(
            base_price=Decimal("1.00"),
            per_minute_price=Decimal("0.01"),
            start_time=datetime.now(),
            end_time=datetime.now() + timedelta(days=365),
            status=1
        )
        db_session.add(config)
        db_session.commit()
        
        assert config.base_price == Decimal("1.00")
        assert config.per_minute_price == Decimal("0.01")
    
    def test_get_active_pricing(self, db_session: Session):
        """测试获取生效中的定价"""
        now = datetime.now()
        config1 = PricingConfig(
            base_price=Decimal("1.00"),
            per_minute_price=Decimal("0.01"),
            start_time=now - timedelta(days=1),
            end_time=now + timedelta(days=365),
            status=1
        )
        config2 = PricingConfig(
            base_price=Decimal("2.00"),
            per_minute_price=Decimal("0.02"),
            start_time=now - timedelta(days=365),
            end_time=now - timedelta(days=1),
            status=1
        )
        db_session.add(config1)
        db_session.add(config2)
        db_session.commit()
        
        # 获取生效中的配置
        active_config = db_session.query(PricingConfig).filter(
            PricingConfig.start_time <= now,
            PricingConfig.end_time >= now,
            PricingConfig.status == 1
        ).first()
        
        assert active_config.id == config1.id
