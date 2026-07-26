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

import urllib.parse
parsed_url = urllib.parse.urlsplit(db_url)
query_params = urllib.parse.parse_qs(parsed_url.query)

requires_ssl = False
if 'sslmode' in query_params and query_params['sslmode'][0] == 'require':
    requires_ssl = True

# Completely wipe all query parameters to ensure asyncpg never receives incompatible kwargs
query_params.clear()

new_query = urllib.parse.urlencode(query_params, doseq=True)
db_url = urllib.parse.urlunsplit((parsed_url.scheme, parsed_url.netloc, parsed_url.path, new_query, parsed_url.fragment))

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
    connect_args = {"server_settings": {"application_name": "cultureflow"}}
    if requires_ssl:
        # asyncpg requires ssl=True rather than sslmode=require in the connection string
        connect_args["ssl"] = True

    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 10,
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": connect_args,
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
    # Ensure all ORM models are registered in Base.metadata before create_all
    import app.models  # noqa: F401

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, checkfirst=True)
        logger.info("Database tables created / verified.")
    except Exception as e:
        logger.error("Database table creation failed: %s", e)
        raise e
    # Seed Admin User
    from app.models.user import User, UserRole
    from app.utils.security import hash_password
    from sqlalchemy import select

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(User).where(User.email == settings.ADMIN_EMAIL)
            )
            existing = result.scalar_one_or_none()
            if not existing:
                admin = User(
                    email=settings.ADMIN_EMAIL,
                    password_hash=hash_password(settings.ADMIN_PASSWORD),
                    full_name=settings.ADMIN_FULL_NAME,
                    role=UserRole.admin,
                    is_active=True,
                )
                session.add(admin)
                await session.commit()
                logger.info("Default admin user created: %s", settings.ADMIN_EMAIL)
    except Exception as e:
        logger.warning("Admin user seed skipped or failed: %s", e)
