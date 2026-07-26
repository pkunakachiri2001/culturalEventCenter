"""
CultureFlow — Global Search Router
Unified fast search across Visitors, Schools, Bookings, Visits, Receipts, and Digitized Records.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.digitization import DigitizedRecord
from app.models.finance import Payment
from app.models.school import School
from app.models.user import User
from app.models.visit import Visit
from app.models.visitor import Visitor
from app.utils.deps import get_current_active_user, get_db

router = APIRouter(prefix="/api/search", tags=["Global Search"])


class SearchResultItem(BaseModel):
    id: str
    category: str  # "visitor", "school", "booking", "visit", "payment", "digitized"
    title: str
    subtitle: str | None = None
    url_path: str
    badge_label: str | None = None


class GlobalSearchResponse(BaseModel):
    query: str
    total_results: int
    results: list[SearchResultItem]


@router.get("", response_model=GlobalSearchResponse)
async def global_search(
    q: str = Query(..., min_length=1, description="Search query string"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute unified search across all system modules."""
    query_str = q.strip()
    pattern = f"%{query_str}%"
    results: list[SearchResultItem] = []

    # 1. Search Visitors
    v_res = await db.execute(
        select(Visitor)
        .where(
            or_(
                Visitor.full_name.ilike(pattern),
                Visitor.phone.ilike(pattern),
                Visitor.email.ilike(pattern),
            )
        )
        .limit(10)
    )
    for v in v_res.scalars().all():
        results.append(
            SearchResultItem(
                id=str(v.id),
                category="visitor",
                title=v.full_name,
                subtitle=f"Phone: {v.phone or 'N/A'} • Type: {v.visitor_type.value}",
                url_path="/visitors",
                badge_label="Visitor",
            )
        )

    # 2. Search Schools
    s_res = await db.execute(
        select(School)
        .where(
            or_(
                School.name.ilike(pattern),
                School.province.ilike(pattern),
                School.contact_teacher.ilike(pattern),
            )
        )
        .limit(10)
    )
    for s in s_res.scalars().all():
        results.append(
            SearchResultItem(
                id=str(s.id),
                category="school",
                title=s.name,
                subtitle=f"Province: {s.province or 'General'} • Teacher: {s.contact_teacher or 'N/A'}",
                url_path="/schools",
                badge_label="School",
            )
        )

    # 3. Search Bookings
    b_res = await db.execute(
        select(Booking)
        .where(
            or_(
                Booking.contact_name.ilike(pattern),
                Booking.purpose.ilike(pattern),
            )
        )
        .limit(10)
    )
    for b in b_res.scalars().all():
        results.append(
            SearchResultItem(
                id=str(b.id),
                category="booking",
                title=f"Booking: {b.contact_name}",
                subtitle=f"Date: {b.booking_date} • Status: {b.status.value}",
                url_path="/bookings",
                badge_label="Booking",
            )
        )

    # 4. Search Visits
    vt_res = await db.execute(
        select(Visit)
        .where(
            or_(
                Visit.qr_code.ilike(pattern),
                Visit.purpose.ilike(pattern),
            )
        )
        .limit(10)
    )
    for vt in vt_res.scalars().all():
        results.append(
            SearchResultItem(
                id=str(vt.id),
                category="visit",
                title=f"Visit Pass: {vt.qr_code}",
                subtitle=f"Date: {vt.visit_date} • Visitors: {vt.total_visitors}",
                url_path="/visitors",
                badge_label="Visit Pass",
            )
        )

    # 5. Search Payments
    p_res = await db.execute(
        select(Payment)
        .where(
            or_(
                Payment.receipt_number.ilike(pattern),
                Payment.notes.ilike(pattern),
            )
        )
        .limit(10)
    )
    for p in p_res.scalars().all():
        results.append(
            SearchResultItem(
                id=str(p.id),
                category="payment",
                title=f"Receipt #{p.receipt_number}",
                subtitle=f"Amount: ${p.total_amount:.2f} • Method: {p.payment_method.value}",
                url_path="/finance",
                badge_label="Receipt",
            )
        )

    # 6. Search Digitized Records
    d_res = await db.execute(
        select(DigitizedRecord)
        .where(
            or_(
                DigitizedRecord.original_filename.ilike(pattern),
                DigitizedRecord.raw_ocr_text.ilike(pattern),
            )
        )
        .limit(10)
    )
    for d in d_res.scalars().all():
        results.append(
            SearchResultItem(
                id=str(d.id),
                category="digitized",
                title=f"AI Scan: {d.original_filename or d.id}",
                subtitle=f"Status: {d.status.value} • Confidence: {int(d.overall_confidence * 100)}%",
                url_path="/digitize",
                badge_label="AI Digitization",
            )
        )

    return GlobalSearchResponse(
        query=query_str,
        total_results=len(results),
        results=results,
    )
