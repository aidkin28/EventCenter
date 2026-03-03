"""API route modules."""

from .goals import router as goals_router
from .updates import router as updates_router

__all__ = ["goals_router", "updates_router"]
