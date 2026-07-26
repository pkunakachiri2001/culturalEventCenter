"""
CultureFlow — Async Database Engine & Session Factory
Uses SQLAlchemy 2.0 async with asyncpg for Neon PostgreSQL.
"""

import logging
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# ── Engine ────────────────────────────────────────────────────────────────────
db_url = settings.DATABASE_URL or "sqlite+aiosqlite:///cultureflow.db"
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+asyncpg://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

is_sqlite = db_url.startswith("sqlite")
if is_sqlite:
    import tempfile
    from pathlib import Path
    tmp_db = Path(tempfile.gettempdir()) / "cultureflow.db"
    db_url = f"sqlite+aiosqlite:///{tmp_db}"

engine_kwargs = {
    "echo": settings.DEBUG,
}

if not is_sqlite:
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {"server_settings": {"application_name": "cultureflow"}},
    })

engine = create_async_engine(db_url, **engine_kwargs)

# ── Session Factory ───────────────────────────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ── Base Model ────────────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """All ORM models inherit from this base."""
    pass


_db_initialized = False

# ── Dependency ────────────────────────────────────────────────────────────────
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides an async database session.
    Automatically commits on success, rolls back on exception.
    """
    global _db_initialized
    if not _db_initialized:
        await init_db()
        _db_initialized = True

    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# ── Health Check ──────────────────────────────────────────────────────────────
async def check_database_connection() -> bool:
    """Ping the database. Returns True if reachable."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        logger.error("Database connection check failed: %s", exc)
        return False


# ── Init DB ───────────────────────────────────────────────────────────────────
async def init_db() -> None:
    """
    Create all tables if they don't exist and seed default admin user.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created / verified.")

    # Seed Admin User
    from app.models.user import User, UserRole
    from sqlalchemy import select
    from passlib.context import CryptContext

    pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        existing = result.scalar_one_or_none()
        if not existing:
            admin = User(
                email=settings.ADMIN_EMAIL,
                password_hash=pwd_ctx.hash(settings.ADMIN_PASSWORD),
                full_name=settings.ADMIN_FULL_NAME,
                role=UserRole.admin,
                is_active=True,
            )
            session.add(admin)
            await session.commit()
            logger.info("Default admin user created: %s", settings.ADMIN_EMAIL)
