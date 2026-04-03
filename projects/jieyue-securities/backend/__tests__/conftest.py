# Backend conftest.py - Pytest configuration and fixtures

import pytest
import sys
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from src.db.session import Base, get_db
from src.db.models import User, Wallet, Task, Transaction, TransactionType, TransactionStatus, TaskStatus, ContentType
from src.main import app
from fastapi.testclient import TestClient

# Test database URL (SQLite for fast testing)
TEST_DATABASE_URL = "sqlite:///./test_jieyue_securities.db"

@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine"""
    engine = create_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session(test_engine):
    """Create a fresh database session for each test"""
    connection = test_engine.connect()
    transaction = connection.begin()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=connection)
    
    session = SessionLocal()
    try:
        yield session
    finally:
        transaction.rollback()
        connection.close()

@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with database override"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    """Create a test user"""
    user = User(phone="13800138000", wx_openid="test_openid_123")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    # Create wallet for user
    wallet = Wallet(user_id=user.id, balance=100.00)
    db_session.add(wallet)
    db_session.commit()
    
    return user

@pytest.fixture
def test_task(db_session, test_user):
    """Create a test task"""
    task = Task(
        user_id=test_user.id,
        url="https://www.douyin.com/video/test123",
        url_hash="abc123hash",
        platform="douyin",
        status=TaskStatus.INIT,
        content_type=ContentType.VIDEO
    )
    db_session.add(task)
    db_session.commit()
    db_session.refresh(task)
    return task
