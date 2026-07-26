"""
CultureFlow — Common Pydantic Schemas
Shared response wrappers and pagination models used across all modules.
"""

from typing import Generic, TypeVar, Any
from datetime import datetime
import uuid

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class OrmBase(BaseModel):
    """Base schema with ORM mode enabled."""
    model_config = ConfigDict(from_attributes=True)


# ── Generic Paginated Response ────────────────────────────────────────────────
class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int

    @classmethod
    def build(
        cls,
        items: list[T],
        total: int,
        page: int,
        page_size: int,
    ) -> "PaginatedResponse[T]":
        total_pages = max(1, -(-total // page_size))  # Ceiling division
        return cls(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )


# ── Generic Success / Error ───────────────────────────────────────────────────
class SuccessResponse(BaseModel):
    success: bool = True
    message: str


class ErrorDetail(BaseModel):
    field: str | None = None
    message: str


class ErrorResponse(BaseModel):
    success: bool = False
    error: str
    details: list[ErrorDetail] | None = None


# ── Health ────────────────────────────────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    db: str
    version: str
    environment: str
    timestamp: datetime
