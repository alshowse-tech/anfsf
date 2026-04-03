"""User Service - Authentication & User Management"""

from datetime import datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select
import uuid

from models.user import User
from models.wallet import Wallet
from models.ownership_record import OwnershipRecord

from core.security import verify_password, get_password_hash
from core.layer8 import create_ownership_root


class UserService:
    """Service for user management and authentication"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID"""
        return self.db.get(User, user_id)
    
    def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        stmt = select(User).where(User.email == email)
        return self.db.execute(stmt).scalar_one_or_none()
    
    def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        stmt = select(User).where(User.username == username)
        return self.db.execute(stmt).scalar_one_or_none()
    
    def create_user(
        self,
        email: str,
        username: str,
        password: str,
        full_name: Optional[str] = None,
        is_superuser: bool = False
    ) -> User:
        """Create a new user with wallet and ownership root"""
        # Create user
        user = User(
            email=email,
            username=username,
            hashed_password=get_password_hash(password),
            full_name=full_name,
            is_superuser=is_superuser,
            is_active=True,
            is_verified=False
        )
        self.db.add(user)
        self.db.flush()  # Get user ID
        
        # Create wallet for user
        wallet = Wallet(
            user_id=user.id,
            balance_cents=0,
            currency="CNY",
            status="active"
        )
        self.db.add(wallet)
        
        # Create Layer 8.5 ownership root
        ownership_root = create_ownership_root(
            db=self.db,
            owner_id=user.id,
            asset_type="user",
            asset_id=user.id
        )
        user.ownership_root_id = ownership_root.id
        
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = self.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            return None
        
        # Update last login
        user.last_login_at = datetime.utcnow()
        self.db.commit()
        return user
    
    def update_user(self, user_id: uuid.UUID, **kwargs) -> Optional[User]:
        """Update user fields"""
        user = self.get_by_id(user_id)
        if not user:
            return None
        
        for key, value in kwargs.items():
            if hasattr(user, key) and key not in ['id', 'created_at']:
                setattr(user, key, value)
        
        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def verify_user(self, user_id: uuid.UUID) -> Optional[User]:
        """Verify user account"""
        return self.update_user(user_id, is_verified=True)
    
    def deactivate_user(self, user_id: uuid.UUID) -> Optional[User]:
        """Deactivate user account"""
        return self.update_user(user_id, is_active=False)
    
    def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        is_active: Optional[bool] = None
    ) -> List[User]:
        """List users with pagination"""
        stmt = select(User)
        
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        
        stmt = stmt.offset(skip).limit(limit)
        return self.db.execute(stmt).scalars().all()
