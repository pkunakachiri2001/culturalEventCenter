"""
CultureFlow — FastAPI Application Entry Point
"""

import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.database import init_db
from app.routers.health import router as health_router
from app.routers.auth import router as auth_router
from app.routers.dashboard import router as dashboard_router
from app.routers.visitors import router as visitors_router
from app.routers.schools import router as schools_router
from app.routers.bookings import router as bookings_router
from app.routers.finance import router as finance_router
from app.routers.reports import router as reports_router
from app.routers.digitization import router as digitization_router
from app.routers.search import router as search_router
from app.routers.admin import router as admin_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("cultureflow")

settings = get_settings()


# ── App Instance ──────────────────────────────────────────────────────────────
app = FastAPI(
    title="CultureFlow API",
    description="Cultural Centre Management System — Backend API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup_event():
    """Startup lifecycle hook (using on_event for better serverless ASGI support)."""
    logger.info("🚀 CultureFlow API starting up...")

    # Create upload directory (fall back to /tmp on serverless read-only filesystems)
    try:
        upload_path = Path(settings.UPLOAD_DIR)
        upload_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        import tempfile
        upload_path = Path(tempfile.gettempdir()) / "uploads"
        upload_path.mkdir(parents=True, exist_ok=True)
    logger.info("Upload directory ready: %s", upload_path.resolve())
    logger.info("✅ CultureFlow API ready.")


# ── Middleware ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Static Files (uploaded images) ───────────────────────────────────────────
try:
    upload_path = Path(settings.UPLOAD_DIR)
    upload_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")
except Exception:
    import tempfile
    upload_path = Path(tempfile.gettempdir()) / "uploads"
    upload_path.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_path)), name="uploads")


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(health_router)
app.include_router(auth_router)
app.include_router(dashboard_router)
app.include_router(visitors_router)
app.include_router(schools_router)
app.include_router(bookings_router)
app.include_router(finance_router)
app.include_router(reports_router)
app.include_router(digitization_router)
app.include_router(search_router)
app.include_router(admin_router)
# app.include_router(visitors_router)
# app.include_router(schools_router)
# ...


# ── Global Exception Handlers ────────────────────────────────────────────────
@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"success": False, "error": "Resource not found"},
    )


@app.exception_handler(500)
async def server_error_handler(request: Request, exc):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "error": "Internal server error"},
    )



