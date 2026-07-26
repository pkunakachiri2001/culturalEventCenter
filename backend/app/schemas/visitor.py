"""
CultureFlow — Visitor & Visit Schemas
Pydantic models for visitor records, check-ins, check-outs, and passes.
"""

from datetime import date, datetime, time
import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.visitor import VisitorType
from app.models.visit import VisitType
from app.schemas.common import OrmBase


# ── Visitor Schemas ───────────────────────────────────────────────────────────
class VisitorCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=200)
    phone: str | None = Field(None, max_length=30)
    email: EmailStr | None = None
    id_number: str | None = Field(None, max_length=50)
    visitor_type: VisitorType = VisitorType.individual
    nationality: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=1000)


class VisitorUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=2, max_length=200)
    phone: str | None = Field(None, max_length=30)
    email: EmailStr | None = None
    id_number: str | None = Field(None, max_length=50)
    visitor_type: VisitorType | None = None
    nationality: str | None = Field(None, max_length=100)
    notes: str | None = Field(None, max_length=1000)


class VisitorOut(OrmBase):
    id: uuid.UUID
    full_name: str
    phone: str | None = None
    email: str | None = None
    id_number: str | None = None
    visitor_type: VisitorType
    nationality: str | None = None
    notes: str | None = None
    created_at: datetime


# ── Visit Check-In & Check-Out Schemas ────────────────────────────────────────
class VisitCheckInRequest(BaseModel):
    visit_type: VisitType = VisitType.individual
    visitor_id: uuid.UUID | None = None
    visitor_data: VisitorCreate | None = None  # If registering a new visitor during check-in
    school_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
    num_students: int = Field(0, ge=0)
    num_teachers: int = Field(0, ge=0)
    num_adults: int = Field(1, ge=0)
    purpose: str | None = Field(None, max_length=500)
    notes: str | None = Field(None, max_length=1000)


class VisitCheckOutRequest(BaseModel):
    qr_code: str | None = None
    visit_id: uuid.UUID | None = None


# ── Visit Output Schema ───────────────────────────────────────────────────────
class VisitOut(OrmBase):
    id: uuid.UUID
    created_by: uuid.UUID | None = None
    school_id: uuid.UUID | None = None
    booking_id: uuid.UUID | None = None
    visit_type: VisitType
    visit_date: date
    check_in_time: time | None = None
    check_out_time: time | None = None
    num_students: int
    num_teachers: int
    num_adults: int
    total_visitors: int
    purpose: str | None = None
    qr_code: str | None = None
    notes: str | None = None
    is_checked_out: bool
    created_at: datetime
    updated_at: datetime

    # Embedded lightweight relations if loaded
    visitors: list[VisitorOut] = []
    school_name: str | None = None
