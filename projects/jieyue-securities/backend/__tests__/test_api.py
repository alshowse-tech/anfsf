# API Tests - User endpoints

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from src.db.models import User, Wallet

class TestUserAPI:
    """用户 API 测试"""
    
    def test_get_user_profile(self, client: TestClient, test_user, db_session: Session):
        """测试获取用户信息"""
        response = client.get(f"/api/users/{test_user.id}/profile")
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == test_user.id
        assert data["phone"] == test_user.phone
    
    def test_get_user_profile_not_found(self, client: TestClient):
        """测试获取不存在的用户"""
        response = client.get("/api/users/999999/profile")
        assert response.status_code == 404
    
    def test_update_user_profile(self, client: TestClient, test_user, db_session: Session):
        """测试更新用户信息"""
        response = client.put(
            f"/api/users/{test_user.id}/profile",
            json={"phone": "13900139000", "nickname": "Test User"}
        )
        assert response.status_code == 200
        db_session.refresh(test_user)
        assert test_user.phone == "13900139000"


class TestWalletAPI:
    """钱包 API 测试"""
    
    def test_get_balance(self, client: TestClient, test_user, db_session: Session):
        """测试获取余额"""
        response = client.get(f"/api/wallets/{test_user.id}/balance")
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == test_user.id
        assert data["balance"] == 100.00
    
    def test_get_balance_not_found(self, client: TestClient):
        """测试获取不存在的钱包"""
        response = client.get("/api/wallets/999999/balance")
        assert response.status_code == 404
    
    def test_recharge(self, client: TestClient, test_user, db_session: Session):
        """测试充值"""
        response = client.post(
            f"/api/wallets/recharge",
            json={"amount": 50.00},
            params={"user_id": test_user.id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["amount"] == 50.00
        assert data["status"] == "SUCCESS"
        
        # Verify balance updated
        wallet = db_session.query(Wallet).filter(Wallet.user_id == test_user.id).first()
        assert wallet.balance == 150.00
    
    def test_recharge_invalid_amount(self, client: TestClient, test_user):
        """测试充值无效金额"""
        response = client.post(
            f"/api/wallets/recharge",
            json={"amount": -10.00},
            params={"user_id": test_user.id}
        )
        assert response.status_code == 400
    
    def test_deduct_success(self, client: TestClient, test_user, db_session: Session):
        """测试扣费成功"""
        response = client.post(
            f"/api/wallets/deduct",
            params={"user_id": test_user.id, "amount": 10.00, "task_id": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        wallet = db_session.query(Wallet).filter(Wallet.user_id == test_user.id).first()
        assert wallet.balance == 90.00
    
    def test_deduct_insufficient_balance(self, client: TestClient, test_user, db_session: Session):
        """测试余额不足"""
        # Set low balance
        wallet = db_session.query(Wallet).filter(Wallet.user_id == test_user.id).first()
        wallet.balance = 5.00
        db_session.commit()
        
        response = client.post(
            f"/api/wallets/deduct",
            params={"user_id": test_user.id, "amount": 10.00, "task_id": 1}
        )
        data = response.json()
        assert data["success"] is False
        assert "余额不足" in data["error"]
    
    def test_refund(self, client: TestClient, test_user, db_session: Session):
        """测试退款"""
        initial_balance = float(db_session.query(Wallet).filter(
            Wallet.user_id == test_user.id
        ).first().balance)
        
        response = client.post(
            f"/api/wallets/refund",
            params={"user_id": test_user.id, "amount": 20.00, "task_id": 1}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        
        wallet = db_session.query(Wallet).filter(Wallet.user_id == test_user.id).first()
        assert wallet.balance == initial_balance + 20.00
