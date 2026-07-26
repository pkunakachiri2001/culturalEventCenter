"""
CultureFlow — School Schemas
Pydantic models for educational institutions, contacts, and visit histories.
"""

from datetime import datetime
import uuid

from pydantic import BaseModel, EmailStr, Field

from app.schemas.common import OrmBase


class SchoolCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    province: str | None = Field(None, max_length=100)
    country: str = Field("Zimbabwe", min_length=2, max_length=100)
    contact_teacher: str | None = Field(None, max_length=150)
    phone: str | None = Field(None, max_length=30)
    email: EmailStr | None = None
    address: str | None = Field(None, max_length=500)
    notes: str | None = Field(None, max_length=1000)


class SchoolUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=255)
    province: str | None = Field(None, max_length=100)
    country: str | None = Field(None, max_length=100)
    contact_teacher: str | None = Field(None, max_length=150)
    phone: str | None = Field(None, max_length=30)
    email: EmailStr | None = None
    address: str | None = Field(None, max_length=500)
    notes: str | None = Field(None, max_length=1000)


class SchoolOut(OrmBase):
    id: uuid.UUID
    name: str
    province: str | None = None
    country: str
    contact_teacher: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    notes: str | None = None
    visit_count: int
    created_at: datetime
    updated_at: datetime
