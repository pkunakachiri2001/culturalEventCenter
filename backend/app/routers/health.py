"""
CultureFlow — Health Check Router
"""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db, check_database_connection
from app.config import get_settings
from app.schemas.common import HealthResponse

router = APIRouter(prefix="/api", tags=["health"])

settings = get_settings()

APP_VERSION = "1.0.0"


@router.get("/health", response_model=HealthResponse, summary="Health Check")
async def health_check() -> HealthResponse:
    """
    Returns application health status and database connectivity.
    Used by Render for health checks and uptime monitoring.
    """
    db_ok = await check_database_connection()
    return HealthResponse(
        status="ok",
        db="connected" if db_ok else "disconnected",
        version=APP_VERSION,
        environment=settings.APP_ENV,
        timestamp=datetime.now(timezone.utc),
    )


@router.get("/health/init", summary="Manual DB Init & Debugging")
async def manual_init_db():
    """Manually trigger DB init and capture exact exceptions for Vercel debugging."""
    from app.database import init_db
    try:
        await init_db()
        return {"status": "ok", "message": "Database and Admin User initialized successfully!"}
    except Exception as e:
        import traceback
        return {
            "status": "error",
            "error_type": type(e).__name__,
            "error_msg": str(e),
            "traceback": traceback.format_exc(),
        }
