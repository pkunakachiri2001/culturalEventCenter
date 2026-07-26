"""
CultureFlow — Visitor & Visit Management Router
Check-in, Check-out, QR Pass Generation, Directory Search, and History.
"""

from datetime import date, datetime, timezone
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.school import School
from app.models.user import User, UserRole
from app.models.visit import Visit, VisitType, VisitVisitor
from app.models.visitor import Visitor, VisitorType
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.visitor import (
    VisitCheckInRequest,
    VisitCheckOutRequest,
    VisitorCreate,
    VisitorOut,
    VisitorUpdate,
    VisitOut,
)
from app.utils.deps import get_current_active_user, get_db, require_roles

router = APIRouter(tags=["Visitor Management"])


# ── VISITOR DIRECTORY ENDPOINTS ────────────────────────────────────────────────
@router.get("/api/visitors", response_model=PaginatedResponse[VisitorOut])
async def list_visitors(
    query: str | None = Query(None, description="Search by name, phone, email, or ID number"),
    visitor_type: VisitorType | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Search and list visitors with pagination."""
    stmt = select(Visitor)
    count_stmt = select(func.count(Visitor.id))

    filters = []
    if query:
        search_pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                Visitor.full_name.ilike(search_pattern),
                Visitor.phone.ilike(search_pattern),
                Visitor.email.ilike(search_pattern),
                Visitor.id_number.ilike(search_pattern),
            )
        )
    if visitor_type:
        filters.append(Visitor.visitor_type == visitor_type)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Visitor.full_name.asc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return PaginatedResponse.build(
        items=[VisitorOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/api/visitors", response_model=VisitorOut, status_code=status.HTTP_201_CREATED)
async def create_visitor(
    payload: VisitorCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new individual visitor."""
    visitor = Visitor(
        full_name=payload.full_name,
        phone=payload.phone,
        email=payload.email,
        id_number=payload.id_number,
        visitor_type=payload.visitor_type,
        nationality=payload.nationality,
        notes=payload.notes,
    )
    db.add(visitor)

    # Log audit entry
    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_VISITOR",
        entity_type="Visitor",
        entity_id=visitor.id,
        details={"full_name": visitor.full_name, "message": f"Registered visitor {visitor.full_name}"},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(visitor)
    return VisitorOut.model_validate(visitor)


@router.get("/api/visitors/{visitor_id}", response_model=VisitorOut)
async def get_visitor(
    visitor_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single visitor details."""
    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id))
    visitor = result.scalar_one_or_none()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")
    return VisitorOut.model_validate(visitor)


@router.put("/api/visitors/{visitor_id}", response_model=VisitorOut)
async def update_visitor(
    visitor_id: uuid.UUID,
    payload: VisitorUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update visitor record."""
    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id))
    visitor = result.scalar_one_or_none()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(visitor, field, val)

    await db.commit()
    await db.refresh(visitor)
    return VisitorOut.model_validate(visitor)


@router.delete("/api/visitors/{visitor_id}", response_model=SuccessResponse)
async def delete_visitor(
    visitor_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a visitor record (Admin / Manager only)."""
    result = await db.execute(select(Visitor).where(Visitor.id == visitor_id))
    visitor = result.scalar_one_or_none()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")

    await db.delete(visitor)
    await db.commit()
    return SuccessResponse(message="Visitor deleted successfully")


# ── VISIT LOG & CHECK-IN / CHECK-OUT ENDPOINTS ────────────────────────────────
@router.get("/api/visits", response_model=PaginatedResponse[VisitOut])
async def list_visits(
    query: str | None = Query(None, description="Search by purpose or school name"),
    visit_type: VisitType | None = Query(None),
    visit_date: date | None = Query(None),
    is_checked_out: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch paginated visit history & active visits."""
    stmt = select(Visit).options(
        selectinload(Visit.school),
        selectinload(Visit.visitor_links).selectinload(VisitVisitor.visitor),
    )
    count_stmt = select(func.count(Visit.id))

    filters = []
    if query:
        search_pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                Visit.purpose.ilike(search_pattern),
                Visit.qr_code.ilike(search_pattern),
                Visit.notes.ilike(search_pattern),
            )
        )
    if visit_type:
        filters.append(Visit.visit_type == visit_type)
    if visit_date:
        filters.append(Visit.visit_date == visit_date)
    if is_checked_out is not None:
        filters.append(Visit.is_checked_out == is_checked_out)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Visit.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    visits = result.scalars().all()

    out_items = []
    for v in visits:
        v_out = VisitOut.model_validate(v)
        v_out.visitors = [
            VisitorOut.model_validate(link.visitor)
            for link in v.visitor_links
            if link.visitor
        ]
        if v.school:
            v_out.school_name = v.school.name
        out_items.append(v_out)

    return PaginatedResponse.build(
        items=out_items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/api/visits/check-in", response_model=VisitOut, status_code=status.HTTP_201_CREATED)
async def check_in_visitor(
    payload: VisitCheckInRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new visit check-in (Individual, School, or Group)."""
    now = datetime.now(timezone.utc)
    qr_code = f"CF-VISIT-{uuid.uuid4().hex[:8].upper()}"

    visitor_obj = None

    # Handle inline visitor creation if supplied
    if payload.visitor_data:
        visitor_obj = Visitor(
            full_name=payload.visitor_data.full_name,
            phone=payload.visitor_data.phone,
            email=payload.visitor_data.email,
            id_number=payload.visitor_data.id_number,
            visitor_type=payload.visitor_data.visitor_type,
            nationality=payload.visitor_data.nationality,
            notes=payload.visitor_data.notes,
        )
        db.add(visitor_obj)
        await db.flush()
    elif payload.visitor_id:
        v_res = await db.execute(select(Visitor).where(Visitor.id == payload.visitor_id))
        visitor_obj = v_res.scalar_one_or_none()

    # Create Visit
    visit = Visit(
        created_by=current_user.id,
        school_id=payload.school_id,
        booking_id=payload.booking_id,
        visit_type=payload.visit_type,
        visit_date=now.date(),
        check_in_time=now.time(),
        num_students=payload.num_students,
        num_teachers=payload.num_teachers,
        num_adults=payload.num_adults if payload.num_adults > 0 else 1,
        purpose=payload.purpose,
        qr_code=qr_code,
        notes=payload.notes,
        is_checked_out=False,
    )
    db.add(visit)
    await db.flush()

    # Link Visitor if available
    if visitor_obj:
        link = VisitVisitor(visit_id=visit.id, visitor_id=visitor_obj.id, is_leader=True)
        db.add(link)

    # Log audit entry
    audit = AuditLog(
        user_id=current_user.id,
        action="VISITOR_CHECK_IN",
        entity_type="Visit",
        entity_id=visit.id,
        details={"visit_type": payload.visit_type.value, "qr_code": qr_code, "message": f"Checked in visit {qr_code}"},
    )
    db.add(audit)

    await db.commit()

    # Refetch visit with relations
    res = await db.execute(
        select(Visit)
        .options(
            selectinload(Visit.school),
            selectinload(Visit.visitor_links).selectinload(VisitVisitor.visitor),
        )
        .where(Visit.id == visit.id)
    )
    v_loaded = res.scalar_one()

    v_out = VisitOut.model_validate(v_loaded)
    v_out.visitors = [
        VisitorOut.model_validate(link.visitor)
        for link in v_loaded.visitor_links
        if link.visitor
    ]
    if v_loaded.school:
        v_out.school_name = v_loaded.school.name

    return v_out


@router.post("/api/visits/check-out", response_model=VisitOut)
async def check_out_visitor(
    payload: VisitCheckOutRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark an active visit as checked out using QR code or Visit ID."""
    if not payload.qr_code and not payload.visit_id:
        raise HTTPException(status_code=400, detail="Provide either qr_code or visit_id")

    stmt = select(Visit).options(
        selectinload(Visit.school),
        selectinload(Visit.visitor_links).selectinload(VisitVisitor.visitor),
    )
    if payload.qr_code:
        stmt = stmt.where(Visit.qr_code == payload.qr_code.strip())
    else:
        stmt = stmt.where(Visit.id == payload.visit_id)

    res = await db.execute(stmt)
    visit = res.scalar_one_or_none()

    if not visit:
        raise HTTPException(status_code=404, detail="Active visit record not found")

    if visit.is_checked_out:
        raise HTTPException(status_code=400, detail="Visit is already checked out")

    now = datetime.now(timezone.utc)
    visit.is_checked_out = True
    visit.check_out_time = now.time()

    audit = AuditLog(
        user_id=current_user.id,
        action="VISITOR_CHECK_OUT",
        entity_type="Visit",
        entity_id=visit.id,
        details={"qr_code": visit.qr_code, "message": f"Checked out visit {visit.qr_code}"},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(visit)

    v_out = VisitOut.model_validate(visit)
    v_out.visitors = [
        VisitorOut.model_validate(link.visitor)
        for link in visit.visitor_links
        if link.visitor
    ]
    if visit.school:
        v_out.school_name = visit.school.name

    return v_out


@router.get("/api/visits/{visit_id}", response_model=VisitOut)
async def get_visit(
    visit_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single visit record details."""
    res = await db.execute(
        select(Visit)
        .options(
            selectinload(Visit.school),
            selectinload(Visit.visitor_links).selectinload(VisitVisitor.visitor),
        )
        .where(Visit.id == visit_id)
    )
    visit = res.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit record not found")

    v_out = VisitOut.model_validate(visit)
    v_out.visitors = [
        VisitorOut.model_validate(link.visitor)
        for link in visit.visitor_links
        if link.visitor
    ]
    if visit.school:
        v_out.school_name = visit.school.name

    return v_out
