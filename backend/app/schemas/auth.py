"""
CultureFlow — Auth & User Schemas
Pydantic schemas for authentication request/response payloads.
"""

from datetime import datetime
import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole
from app.schemas.common import OrmBase


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    old_password: str = Field(..., min_length=6)
    new_password: str = Field(..., min_length=6)


class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=150)
    avatar_url: str | None = Field(None, max_length=500)


class UserOut(OrmBase):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    avatar_url: str | None = None
    last_login: datetime | None = None
    created_at: datetime
