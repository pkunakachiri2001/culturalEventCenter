"""
CultureFlow — Dashboard Schemas
Response payloads for real-time statistics, trends, and dashboard widgets.
"""

from datetime import date, datetime
from decimal import Decimal
import uuid

from pydantic import BaseModel

from app.models.booking import BookingStatus


class TrendPoint(BaseModel):
    date: str  # YYYY-MM-DD format
    value: float


class RecentActivityItem(BaseModel):
    id: uuid.UUID
    action: str
    entity_type: str
    description: str
    user_name: str
    created_at: datetime


class UpcomingBookingItem(BaseModel):
    id: uuid.UUID
    school_name: str | None = None
    contact_name: str
    contact_phone: str | None = None
    booking_date: date
    start_time: str | None = None
    expected_num: int
    status: BookingStatus


class DashboardStatsResponse(BaseModel):
    todays_visitors: int
    monthly_visitors: int
    todays_revenue: float
    monthly_revenue: float
    upcoming_bookings_count: int
    schools_registered_count: int
    pending_digitization_count: int
    visitor_trend: list[TrendPoint]
    revenue_trend: list[TrendPoint]
    recent_activities: list[RecentActivityItem]
    upcoming_bookings: list[UpcomingBookingItem]
