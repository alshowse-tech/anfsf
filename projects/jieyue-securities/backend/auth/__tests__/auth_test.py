"""
捷阅证券信息助手 - 认证模块单元测试
"""

import pytest
import sys
import os

# 添加 backend 路径到 sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from auth.jwt_service import JwtService
from auth.password_service import PasswordService
from auth.session_service import SessionService


class TestJwtService:
    """JWT 服务测试"""
    
    @pytest.fixture
    def jwt_service(self):
        """创建 JWT 服务实例"""
        return JwtService(
            secret_key="test-secret-key-for-testing",
            algorithm="HS256",
            access_token_expire_minutes=30,
            refresh_token_expire_days=7
        )
    
    def test_generate_token(self, jwt_service):
        """测试生成令牌"""
        payload = {"sub": "user123", "type": "access"}
        token = jwt_service.generate_token(payload)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_token(self, jwt_service):
        """测试验证令牌"""
        payload = {"sub": "user123", "type": "access"}
        token = jwt_service.generate_token(payload)
        
        verified_payload = jwt_service.verify_token(token)
        
        assert verified_payload["sub"] == "user123"
        assert verified_payload["type"] == "access"
        assert "exp" in verified_payload
        assert "iat" in verified_payload
    
    def test_verify_expired_token(self, jwt_service):
        """测试验证过期令牌"""
        # 创建立即过期的令牌
        payload = {"sub": "user123", "type": "access"}
        token = jwt_service.generate_token(payload, expire_minutes=-1)
        
        with pytest.raises(Exception) as exc_info:
            jwt_service.verify_token(token)
        
        assert "expired" in str(exc_info.value).lower() or exc_info.value.status_code == 401
    
    def test_verify_invalid_token(self, jwt_service):
        """测试验证无效令牌"""
        with pytest.raises(Exception) as exc_info:
            jwt_service.verify_token("invalid.token.here")
        
        assert exc_info.value.status_code == 401
    
    def test_refresh_token(self, jwt_service):
        """测试刷新令牌"""
        # 生成刷新令牌
        refresh_token = jwt_service.generate_refresh_token("user123")
        
        # 使用刷新令牌获取新的访问令牌
        new_access_token = jwt_service.refresh_token(refresh_token)
        
        assert new_access_token is not None
        assert isinstance(new_access_token, str)
        
        # 验证新令牌
        payload = jwt_service.verify_token(new_access_token)
        assert payload["sub"] == "user123"
    
    def test_generate_token_with_custom_expire(self, jwt_service):
        """测试自定义过期时间"""
        payload = {"sub": "user123"}
        token = jwt_service.generate_token(payload, expire_minutes=60)
        
        verified = jwt_service.verify_token(token)
        assert verified["sub"] == "user123"


class TestPasswordService:
    """密码服务测试"""
    
    @pytest.fixture
    def password_service(self):
        """创建密码服务实例"""
        return PasswordService(rounds=12)
    
    def test_hash_password(self, password_service):
        """测试密码哈希"""
        password = "TestPassword123"
        hashed = password_service.hash(password)
        
        assert hashed is not None
        assert isinstance(hashed, str)
        assert hashed.startswith("$2")  # bcrypt 哈希以$2 开头
    
    def test_hash_different_for_same_password(self, password_service):
        """测试相同密码生成不同哈希"""
        password = "TestPassword123"
        hash1 = password_service.hash(password)
        hash2 = password_service.hash(password)
        
        assert hash1 != hash2  # bcrypt 使用随机盐，每次哈希都不同
    
    def test_compare_password_success(self, password_service):
        """测试密码验证成功"""
        password = "TestPassword123"
        hashed = password_service.hash(password)
        
        assert password_service.compare(password, hashed) is True
    
    def test_compare_password_failure(self, password_service):
        """测试密码验证失败"""
        password = "TestPassword123"
        hashed = password_service.hash(password)
        
        assert password_service.compare("WrongPassword456", hashed) is False
    
    def test_compare_with_different_hash(self, password_service):
        """测试不同哈希的密码验证"""
        password = "TestPassword123"
        hash1 = password_service.hash(password)
        hash2 = password_service.hash(password)
        
        # 虽然哈希不同，但验证应该都成功
        assert password_service.compare(password, hash1) is True
        assert password_service.compare(password, hash2) is True


class TestSessionService:
    """Session 服务测试"""
    
    @pytest.fixture
    def session_service(self):
        """创建 Session 服务实例"""
        # 使用测试 Redis
        return SessionService(
            redis_url="redis://localhost:6379/1",  # 使用不同的数据库
            session_expire_hours=24
        )
    
    @pytest.mark.skip(reason="需要 Redis 服务")
    def test_create_session(self, session_service):
        """测试创建会话"""
        session_id = session_service.create_session("user123")
        
        assert session_id is not None
        assert isinstance(session_id, str)
    
    @pytest.mark.skip(reason="需要 Redis 服务")
    def test_get_session(self, session_service):
        """测试获取会话"""
        session_id = session_service.create_session("user123", {"test": "data"})
        session_data = session_service.get_session(session_id)
        
        assert session_data is not None
        assert session_data["user_id"] == "user123"
    
    @pytest.mark.skip(reason="需要 Redis 服务")
    def test_validate_session(self, session_service):
        """测试验证会话"""
        session_id = session_service.create_session("user123")
        
        assert session_service.validate_session(session_id) is True
        assert session_service.validate_session("invalid-session") is False
    
    @pytest.mark.skip(reason="需要 Redis 服务")
    def test_delete_session(self, session_service):
        """测试删除会话"""
        session_id = session_service.create_session("user123")
        
        assert session_service.delete_session(session_id) is True
        assert session_service.validate_session(session_id) is False
    
    @pytest.mark.skip(reason="需要 Redis 服务")
    def test_refresh_session(self, session_service):
        """测试刷新会话"""
        session_id = session_service.create_session("user123")
        
        assert session_service.refresh_session(session_id) is True


class TestIntegration:
    """集成测试"""
    
    @pytest.fixture
    def services(self):
        """创建服务实例"""
        return {
            "jwt": JwtService(secret_key="test-key"),
            "password": PasswordService(),
        }
    
    def test_full_auth_flow(self, services):
        """测试完整认证流程"""
        jwt_service = services["jwt"]
        password_service = services["password"]
        
        # 1. 注册：加密密码
        password = "SecurePassword123"
        password_hash = password_service.hash(password)
        
        # 2. 登录：验证密码
        assert password_service.compare(password, password_hash) is True
        
        # 3. 生成令牌
        user_id = "user123"
        access_token = jwt_service.generate_token({"sub": user_id, "type": "access"})
        refresh_token = jwt_service.generate_refresh_token(user_id)
        
        # 4. 验证令牌
        payload = jwt_service.verify_token(access_token)
        assert payload["sub"] == user_id
        
        # 5. 刷新令牌
        new_access_token = jwt_service.refresh_token(refresh_token)
        assert new_access_token is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
