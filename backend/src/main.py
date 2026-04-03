"""
捷阅证券后端 - Main Application Entry Point
FastAPI application with Layer 8.5 governance integration
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

# Import configuration
from config.database import engine, create_tables, get_db_session, close_db_session
from config.settings import get_settings
from config.queue import get_queue_connection

# Import Layer 8.5
from core.layer8 import readiness_gate, publish_to_mcp_bus

# Import models (for table creation)
from models.base import Base
from models.user import User
from models.wallet import Wallet
from models.transaction import Transaction
from models.task import Task
from models.transcription import Transcription
from models.contract import Contract
from models.ownership_record import OwnershipRecord

# Import API routers
from api import (
    health_router,
    users_router,
    wallets_router,
    tasks_router,
    transcription_router,
)


settings = get_settings()


def register_probes():
    """Register Layer 8.5 Readiness Gate probes"""
    
    async def check_database():
        """Check database connectivity"""
        try:
            db = get_db_session()
            db.execute("SELECT 1")
            close_db_session(db)
            return True
        except Exception as e:
            logger.error(f"Database probe failed: {e}")
            return False
    
    async def check_redis():
        """Check Redis connectivity"""
        try:
            r = get_queue_connection()
            r.ping()
            return True
        except Exception as e:
            logger.error(f"Redis probe failed: {e}")
            return False
    
    readiness_gate.register_probe("database", check_database)
    readiness_gate.register_probe("redis", check_redis)
    logger.info("Layer 8.5 Readiness Gate probes registered")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("=" * 60)
    logger.info(f"Starting {settings.app_name} v{settings.app_version}")
    logger.info("=" * 60)
    
    # Create database tables
    create_tables()
    logger.info("Database tables created")
    
    # Register readiness probes
    register_probes()
    
    # Check readiness
    is_ready = await readiness_gate.is_ready()
    if is_ready:
        logger.info("✓ All readiness probes passed")
    else:
        logger.warning("✗ Some readiness probes failed")
    
    # Publish startup event to MCP Bus
    publish_to_mcp_bus(
        event_type="application.started",
        payload={
            "app_name": settings.app_name,
            "version": settings.app_version,
            "layer8_enabled": settings.layer8_enabled
        }
    )
    
    logger.info(f"Application ready at http://0.0.0.0:8000")
    logger.info("=" * 60)
    
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    publish_to_mcp_bus(
        event_type="application.stopped",
        payload={"app_name": settings.app_name}
    )


def create_app() -> FastAPI:
    """Create FastAPI application factory"""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="捷阅证券后端 API - Layer 8.5 治理控制面集成",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json"
    )
    
    # Configure CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Register routers
    app.include_router(health_router)
    app.include_router(users_router)
    app.include_router(wallets_router)
    app.include_router(tasks_router)
    app.include_router(transcription_router)
    
    logger.info("API routers registered")
    
    return app


# Create application instance
app = create_app()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level="info"
    )
