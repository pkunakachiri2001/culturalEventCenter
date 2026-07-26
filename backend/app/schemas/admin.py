"""
CultureFlow — Admin Schemas
Pydantic models for user administration, role assignment, and audit log inspection.
"""

from datetime import datetime
from typing import Any
import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole
from app.schemas.common import OrmBase


class AdminUserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=100)
    phone: str | None = Field(None, max_length=50)
    role: UserRole = UserRole.receptionist
    password: str = Field(..., min_length=8)


class AdminUserUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=100)
    phone: str | None = Field(None, max_length=50)
    role: UserRole | None = None
    is_active: bool | None = None


class ResetPasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


class AuditLogOut(OrmBase):
    id: uuid.UUID
    user_id: uuid.UUID | None = None
    action: str
    entity_type: str | None = None
    entity_id: str | None = None
    changes: dict[str, Any] | None = None
    ip_address: str | None = None
    created_at: datetime
