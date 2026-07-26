"""
CultureFlow — Booking Schemas
Pydantic models for online/walk-in bookings, approvals, rejections, and rescheduling.
"""

from datetime import date, datetime, time
import uuid

from pydantic import BaseModel, EmailStr, Field

from app.models.booking import BookingStatus
from app.schemas.common import OrmBase


class BookingCreate(BaseModel):
    school_id: uuid.UUID | None = None
    booking_date: date
    start_time: time | None = None
    end_time: time | None = None
    contact_name: str = Field(..., min_length=2, max_length=150)
    contact_phone: str | None = Field(None, max_length=30)
    contact_email: EmailStr | None = None
    purpose: str | None = Field(None, max_length=500)
    expected_num: int = Field(1, ge=1)
    notes: str | None = Field(None, max_length=1000)


class BookingUpdate(BaseModel):
    school_id: uuid.UUID | None = None
    booking_date: date | None = None
    start_time: time | None = None
    end_time: time | None = None
    contact_name: str | None = Field(None, min_length=2, max_length=150)
    contact_phone: str | None = Field(None, max_length=30)
    contact_email: EmailStr | None = None
    purpose: str | None = Field(None, max_length=500)
    expected_num: int | None = Field(None, ge=1)
    notes: str | None = Field(None, max_length=1000)
    status: BookingStatus | None = None


class BookingRejectRequest(BaseModel):
    rejection_reason: str = Field(..., min_length=3, max_length=500)


class BookingRescheduleRequest(BaseModel):
    new_booking_date: date
    new_start_time: time | None = None
    new_end_time: time | None = None
    notes: str | None = Field(None, max_length=1000)


class BookingOut(OrmBase):
    id: uuid.UUID
    school_id: uuid.UUID | None = None
    created_by: uuid.UUID | None = None
    booking_date: date
    start_time: time | None = None
    end_time: time | None = None
    status: BookingStatus
    contact_name: str
    contact_phone: str | None = None
    contact_email: str | None = None
    purpose: str | None = None
    expected_num: int
    notes: str | None = None
    rejection_reason: str | None = None
    rescheduled_from: uuid.UUID | None = None
    school_name: str | None = None
    created_at: datetime
    updated_at: datetime
