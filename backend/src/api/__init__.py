"""API Routes"""

from .health import router as health_router
from .users import router as users_router
from .wallets import router as wallets_router
from .tasks import router as tasks_router
from .transcription import router as transcription_router

__all__ = [
    "health_router",
    "users_router",
    "wallets_router",
    "tasks_router",
    "transcription_router",
]
