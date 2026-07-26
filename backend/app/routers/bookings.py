"""
CultureFlow — Booking Management Router
Online & walk-in booking coordination, approvals, rejections, rescheduling, and visit check-in conversion.
"""

from datetime import date, datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.booking import Booking, BookingStatus
from app.models.school import School
from app.models.user import User, UserRole
from app.models.visit import Visit, VisitType
from app.schemas.booking import (
    BookingCreate,
    BookingOut,
    BookingRejectRequest,
    BookingRescheduleRequest,
    BookingUpdate,
)
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.visitor import VisitOut
from app.utils.deps import get_current_active_user, get_db, require_roles

router = APIRouter(prefix="/api/bookings", tags=["Booking Management"])


@router.get("", response_model=PaginatedResponse[BookingOut])
async def list_bookings(
    query: str | None = Query(None, description="Search by contact name, phone, or purpose"),
    status: BookingStatus | None = Query(None, description="Filter by booking status"),
    school_id: uuid.UUID | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch paginated bookings with search and status filters."""
    stmt = select(Booking).options(selectinload(Booking.school))
    count_stmt = select(func.count(Booking.id))

    filters = []
    if query:
        search_pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                Booking.contact_name.ilike(search_pattern),
                Booking.contact_phone.ilike(search_pattern),
                Booking.contact_email.ilike(search_pattern),
                Booking.purpose.ilike(search_pattern),
            )
        )
    if status:
        filters.append(Booking.status == status)
    if school_id:
        filters.append(Booking.school_id == school_id)
    if start_date:
        filters.append(Booking.booking_date >= start_date)
    if end_date:
        filters.append(Booking.booking_date <= end_date)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Booking.booking_date.asc(), Booking.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    bookings = result.scalars().all()

    out_items = []
    for b in bookings:
        b_out = BookingOut.model_validate(b)
        if b.school:
            b_out.school_name = b.school.name
        out_items.append(b_out)

    return PaginatedResponse.build(
        items=out_items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=BookingOut, status_code=status.HTTP_201_CREATED)
async def create_booking(
    payload: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new booking request."""
    booking = Booking(
        school_id=payload.school_id,
        created_by=current_user.id,
        booking_date=payload.booking_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        status=BookingStatus.pending,
        contact_name=payload.contact_name,
        contact_phone=payload.contact_phone,
        contact_email=payload.contact_email,
        purpose=payload.purpose,
        expected_num=payload.expected_num,
        notes=payload.notes,
    )
    db.add(booking)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_BOOKING",
        entity_type="Booking",
        entity_id=booking.id,
        details={"contact_name": booking.contact_name, "message": f"Created booking for {booking.contact_name}"},
    )
    db.add(audit)

    await db.commit()

    res = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == booking.id)
    )
    b_loaded = res.scalar_one()
    b_out = BookingOut.model_validate(b_loaded)
    if b_loaded.school:
        b_out.school_name = b_loaded.school.name

    return b_out


@router.get("/{booking_id}", response_model=BookingOut)
async def get_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single booking details."""
    res = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == booking_id)
    )
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    b_out = BookingOut.model_validate(booking)
    if booking.school:
        b_out.school_name = booking.school.name
    return b_out


@router.put("/{booking_id}", response_model=BookingOut)
async def update_booking(
    booking_id: uuid.UUID,
    payload: BookingUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update booking parameters."""
    res = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == booking_id)
    )
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(booking, field, val)

    await db.commit()
    await db.refresh(booking)

    b_out = BookingOut.model_validate(booking)
    if booking.school:
        b_out.school_name = booking.school.name
    return b_out


@router.post("/{booking_id}/approve", response_model=BookingOut)
async def approve_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.receptionist)),
    db: AsyncSession = Depends(get_db),
):
    """Approve a pending booking."""
    res = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == booking_id)
    )
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    booking.status = BookingStatus.approved

    audit = AuditLog(
        user_id=current_user.id,
        action="APPROVE_BOOKING",
        entity_type="Booking",
        entity_id=booking.id,
        details={"message": f"Approved booking for {booking.contact_name}"},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(booking)

    b_out = BookingOut.model_validate(booking)
    if booking.school:
        b_out.school_name = booking.school.name
    return b_out


@router.post("/{booking_id}/reject", response_model=BookingOut)
async def reject_booking(
    booking_id: uuid.UUID,
    payload: BookingRejectRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.receptionist)),
    db: AsyncSession = Depends(get_db),
):
    """Reject a booking with reason."""
    res = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == booking_id)
    )
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    booking.status = BookingStatus.rejected
    booking.rejection_reason = payload.rejection_reason

    audit = AuditLog(
        user_id=current_user.id,
        action="REJECT_BOOKING",
        entity_type="Booking",
        entity_id=booking.id,
        details={"reason": payload.rejection_reason, "message": f"Rejected booking for {booking.contact_name}"},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(booking)

    b_out = BookingOut.model_validate(booking)
    if booking.school:
        b_out.school_name = booking.school.name
    return b_out


@router.post("/{booking_id}/reschedule", response_model=BookingOut)
async def reschedule_booking(
    booking_id: uuid.UUID,
    payload: BookingRescheduleRequest,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.receptionist)),
    db: AsyncSession = Depends(get_db),
):
    """Reschedule an existing booking."""
    res = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == booking_id)
    )
    original = res.scalar_one_or_none()
    if not original:
        raise HTTPException(status_code=404, detail="Booking record not found")

    original.status = BookingStatus.rescheduled

    # Create new rescheduled booking
    new_booking = Booking(
        school_id=original.school_id,
        created_by=current_user.id,
        booking_date=payload.new_booking_date,
        start_time=payload.new_start_time or original.start_time,
        end_time=payload.new_end_time or original.end_time,
        status=BookingStatus.pending,
        contact_name=original.contact_name,
        contact_phone=original.contact_phone,
        contact_email=original.contact_email,
        purpose=original.purpose,
        expected_num=original.expected_num,
        notes=payload.notes or original.notes,
        rescheduled_from=original.id,
    )
    db.add(new_booking)

    audit = AuditLog(
        user_id=current_user.id,
        action="RESCHEDULE_BOOKING",
        entity_type="Booking",
        entity_id=original.id,
        details={"new_date": str(payload.new_booking_date), "message": f"Rescheduled booking {original.id}"},
    )
    db.add(audit)

    await db.commit()

    res_new = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == new_booking.id)
    )
    b_loaded = res_new.scalar_one()
    b_out = BookingOut.model_validate(b_loaded)
    if b_loaded.school:
        b_out.school_name = b_loaded.school.name
    return b_out


@router.post("/{booking_id}/convert-to-visit", response_model=VisitOut)
async def convert_booking_to_visit(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Convert an approved booking directly into an active Visit record upon on-site arrival."""
    res = await db.execute(
        select(Booking).options(selectinload(Booking.school)).where(Booking.id == booking_id)
    )
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    now = datetime.now(timezone.utc)
    qr_code = f"CF-VISIT-{uuid.uuid4().hex[:8].upper()}"

    v_type = VisitType.school if booking.school_id else VisitType.group

    visit = Visit(
        created_by=current_user.id,
        school_id=booking.school_id,
        booking_id=booking.id,
        visit_type=v_type,
        visit_date=now.date(),
        check_in_time=now.time(),
        num_students=booking.expected_num if booking.school_id else 0,
        num_teachers=2 if booking.school_id else 0,
        num_adults=booking.expected_num if not booking.school_id else 0,
        purpose=booking.purpose or f"Booking: {booking.contact_name}",
        qr_code=qr_code,
        notes=booking.notes,
        is_checked_out=False,
    )
    db.add(visit)

    # Mark booking as completed
    booking.status = BookingStatus.completed

    # If linked to school, increment visit count
    if booking.school_id:
        s_res = await db.execute(select(School).where(School.id == booking.school_id))
        school_obj = s_res.scalar_one_or_none()
        if school_obj:
            school_obj.visit_count += 1

    audit = AuditLog(
        user_id=current_user.id,
        action="CONVERT_BOOKING_TO_VISIT",
        entity_type="Visit",
        entity_id=visit.id,
        details={"booking_id": str(booking.id), "qr_code": qr_code},
    )
    db.add(audit)

    await db.commit()

    res_v = await db.execute(
        select(Visit).options(selectinload(Visit.school)).where(Visit.id == visit.id)
    )
    v_loaded = res_v.scalar_one()

    v_out = VisitOut.model_validate(v_loaded)
    if v_loaded.school:
        v_out.school_name = v_loaded.school.name
    return v_out


@router.delete("/{booking_id}", response_model=SuccessResponse)
async def delete_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a booking record (Admin / Manager only)."""
    res = await db.execute(select(Booking).where(Booking.id == booking_id))
    booking = res.scalar_one_or_none()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking record not found")

    await db.delete(booking)
    await db.commit()
    return SuccessResponse(message="Booking deleted successfully")
