"""
CultureFlow — Application Configuration
Reads all settings from environment variables / .env file.
"""

from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import AnyUrl, field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ───────────────────────────────────────────────────────────────
    APP_NAME: str = "CultureFlow"
    APP_ENV: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = False

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "sqlite+aiosqlite:///cultureflow.db"

    # ── Security ──────────────────────────────────────────────────────────
    SECRET_KEY: str = "cultureflow_default_secret_key_32bytes_min_length"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── AI ────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    # ── OCR ───────────────────────────────────────────────────────────────
    OCR_ENGINE: Literal["tesseract", "paddleocr"] = "tesseract"
    TESSERACT_CMD: str = ""  # Path override for Windows

    # ── File Uploads ──────────────────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 20

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173"

    # ── First Admin (seeded on first startup) ─────────────────────────────
    ADMIN_EMAIL: str = "admin@cultureflow.com"
    ADMIN_PASSWORD: str = "ChangeMe123!"
    ADMIN_FULL_NAME: str = "System Administrator"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v or v.startswith("postgresql+asyncpg://user:password"):
            # Provide default fallback for local dev if not configured
            return "sqlite+aiosqlite:///./cultureflow.db"
        return v


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance (singleton)."""
    return Settings()
