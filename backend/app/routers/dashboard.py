"""
CultureFlow — Dashboard Router
Real-time summary statistics, visitor trends, upcoming bookings, and activity feeds.
"""

from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.booking import Booking, BookingStatus
from app.models.digitization import DigitizedRecord, DigitizationStatus
from app.models.finance import Payment
from app.models.school import School
from app.models.user import User
from app.models.visit import Visit
from app.schemas.dashboard import (
    DashboardStatsResponse,
    RecentActivityItem,
    TrendPoint,
    UpcomingBookingItem,
)
from app.utils.deps import get_current_active_user, get_db

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch real-time metrics, 7-day trendlines, activity feeds, and upcoming bookings."""
    today = date.today()
    first_of_month = today.replace(day=1)

    # 1. Today's Visitor Count
    todays_visitors_res = await db.execute(
        select(
            func.coalesce(
                func.sum(Visit.num_students + Visit.num_teachers + Visit.num_adults),
                0,
            )
        ).where(Visit.visit_date == today)
    )
    todays_visitors = int(todays_visitors_res.scalar_one())

    # 2. Monthly Visitor Count
    monthly_visitors_res = await db.execute(
        select(
            func.coalesce(
                func.sum(Visit.num_students + Visit.num_teachers + Visit.num_adults),
                0,
            )
        ).where(Visit.visit_date >= first_of_month)
    )
    monthly_visitors = int(monthly_visitors_res.scalar_one())

    # 3. Today's Revenue
    todays_revenue_res = await db.execute(
        select(func.coalesce(func.sum(Payment.total_amount), Decimal("0.00"))).where(
            cast(Payment.created_at, Date) == today
        )
    )
    todays_revenue = float(todays_revenue_res.scalar_one())

    # 4. Monthly Revenue
    monthly_revenue_res = await db.execute(
        select(func.coalesce(func.sum(Payment.total_amount), Decimal("0.00"))).where(
            cast(Payment.created_at, Date) >= first_of_month
        )
    )
    monthly_revenue = float(monthly_revenue_res.scalar_one())

    # 5. Upcoming Bookings Count
    upcoming_bookings_count_res = await db.execute(
        select(func.count(Booking.id)).where(
            and_(
                Booking.booking_date >= today,
                Booking.status.in_([BookingStatus.pending, BookingStatus.approved]),
            )
        )
    )
    upcoming_bookings_count = int(upcoming_bookings_count_res.scalar_one())

    # 6. Registered Schools Count
    schools_count_res = await db.execute(select(func.count(School.id)))
    schools_registered_count = int(schools_count_res.scalar_one())

    # 7. Pending Digitization Count
    pending_dig_res = await db.execute(
        select(func.count(DigitizedRecord.id)).where(
            DigitizedRecord.status == DigitizationStatus.pending
        )
    )
    pending_digitization_count = int(pending_dig_res.scalar_one())

    # 8. 7-Day Visitor & Revenue Trend
    visitor_trend: list[TrendPoint] = []
    revenue_trend: list[TrendPoint] = []

    for d in range(6, -1, -1):
        target_date = today - timedelta(days=d)
        date_str = target_date.strftime("%Y-%m-%d")

        v_res = await db.execute(
            select(
                func.coalesce(
                    func.sum(Visit.num_students + Visit.num_teachers + Visit.num_adults),
                    0,
                )
            ).where(Visit.visit_date == target_date)
        )
        v_count = float(v_res.scalar_one())
        visitor_trend.append(TrendPoint(date=date_str, value=v_count))

        r_res = await db.execute(
            select(
                func.coalesce(func.sum(Payment.total_amount), Decimal("0.00"))
            ).where(cast(Payment.created_at, Date) == target_date)
        )
        r_amount = float(r_res.scalar_one())
        revenue_trend.append(TrendPoint(date=date_str, value=r_amount))

    # 9. Recent Activity Items (from AuditLogs)
    audit_res = await db.execute(
        select(AuditLog)
        .options(selectinload(AuditLog.user))
        .order_by(AuditLog.created_at.desc())
        .limit(10)
    )
    audit_logs = audit_res.scalars().all()

    recent_activities = [
        RecentActivityItem(
            id=log.id,
            action=log.action or "UNKNOWN",
            entity_type=str(log.entity_type or "system"),
            description=log.changes.get("message", f"{log.action} on {log.entity_type or 'system'}")
            if log.changes and isinstance(log.changes, dict)
            else f"{log.action} on {log.entity_type or 'system'}",
            user_name=log.user.full_name if log.user else "System",
            created_at=log.created_at or datetime.now(timezone.utc),
        )
        for log in audit_logs
    ]

    # 10. Top Upcoming Bookings
    bookings_res = await db.execute(
        select(Booking)
        .options(selectinload(Booking.school))
        .where(
            and_(
                Booking.booking_date >= today,
                Booking.status.in_([BookingStatus.pending, BookingStatus.approved]),
            )
        )
        .order_by(Booking.booking_date.asc())
        .limit(5)
    )
    bookings_list = bookings_res.scalars().all()

    upcoming_bookings = [
        UpcomingBookingItem(
            id=b.id,
            school_name=b.school.name if b.school else None,
            contact_name=b.contact_name or "Unknown Contact",
            contact_phone=b.contact_phone,
            booking_date=b.booking_date,
            start_time=b.start_time.strftime("%H:%M") if b.start_time else None,
            expected_num=b.expected_num or 0,
            status=b.status,
        )
        for b in bookings_list
    ]

    return DashboardStatsResponse(
        todays_visitors=todays_visitors,
        monthly_visitors=monthly_visitors,
        todays_revenue=todays_revenue,
        monthly_revenue=monthly_revenue,
        upcoming_bookings_count=upcoming_bookings_count,
        schools_registered_count=schools_registered_count,
        pending_digitization_count=pending_digitization_count,
        visitor_trend=visitor_trend,
        revenue_trend=revenue_trend,
        recent_activities=recent_activities,
        upcoming_bookings=upcoming_bookings,
    )
