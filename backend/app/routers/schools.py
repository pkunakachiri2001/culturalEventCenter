"""
CultureFlow — School Management Router
CRUD for educational institution partners, contact teachers, and visit histories.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.school import School
from app.models.user import User, UserRole
from app.models.visit import Visit
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.school import SchoolCreate, SchoolOut, SchoolUpdate
from app.schemas.visitor import VisitOut
from app.utils.deps import get_current_active_user, get_db, require_roles

router = APIRouter(prefix="/api/schools", tags=["School Management"])


@router.get("", response_model=PaginatedResponse[SchoolOut])
async def list_schools(
    query: str | None = Query(None, description="Search by name, contact teacher, phone, or email"),
    province: str | None = Query(None, description="Filter by province"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List schools with search, province filtering, and pagination."""
    stmt = select(School)
    count_stmt = select(func.count(School.id))

    filters = []
    if query:
        search_pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                School.name.ilike(search_pattern),
                School.contact_teacher.ilike(search_pattern),
                School.phone.ilike(search_pattern),
                School.email.ilike(search_pattern),
            )
        )
    if province:
        filters.append(School.province.ilike(province.strip()))

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(School.name.asc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    items = result.scalars().all()

    return PaginatedResponse.build(
        items=[SchoolOut.model_validate(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=SchoolOut, status_code=status.HTTP_201_CREATED)
async def create_school(
    payload: SchoolCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Register a new school."""
    school = School(
        name=payload.name,
        province=payload.province,
        country=payload.country,
        contact_teacher=payload.contact_teacher,
        phone=payload.phone,
        email=payload.email,
        address=payload.address,
        notes=payload.notes,
        visit_count=0,
    )
    db.add(school)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_SCHOOL",
        entity_type="School",
        entity_id=school.id,
        details={"name": school.name, "message": f"Registered school {school.name}"},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(school)
    return SchoolOut.model_validate(school)


@router.get("/{school_id}", response_model=SchoolOut)
async def get_school(
    school_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single school details."""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School record not found")
    return SchoolOut.model_validate(school)


@router.put("/{school_id}", response_model=SchoolOut)
async def update_school(
    school_id: uuid.UUID,
    payload: SchoolUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update school details."""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School record not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(school, field, val)

    await db.commit()
    await db.refresh(school)
    return SchoolOut.model_validate(school)


@router.delete("/{school_id}", response_model=SuccessResponse)
async def delete_school(
    school_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    """Delete a school record (Admin / Manager only)."""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School record not found")

    await db.delete(school)
    await db.commit()
    return SuccessResponse(message="School deleted successfully")


@router.get("/{school_id}/visits", response_model=PaginatedResponse[VisitOut])
async def list_school_visits(
    school_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch complete past visit log history for a specific school."""
    stmt = (
        select(Visit)
        .where(Visit.school_id == school_id)
        .options(selectinload(Visit.school))
    )
    count_stmt = select(func.count(Visit.id)).where(Visit.school_id == school_id)

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Visit.visit_date.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    visits = result.scalars().all()

    out_items = []
    for v in visits:
        v_out = VisitOut.model_validate(v)
        if v.school:
            v_out.school_name = v.school.name
        out_items.append(v_out)

    return PaginatedResponse.build(
        items=out_items,
        total=total,
        page=page,
        page_size=page_size,
    )
