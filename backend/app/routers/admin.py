"""
CultureFlow — Admin Router
Staff user management, role assignments, password resets, and system audit logs.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User, UserRole
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    AuditLogOut,
    ResetPasswordRequest,
)
from app.schemas.auth import UserOut
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.utils.deps import require_roles, get_db
from app.utils.security import get_password_hash

router = APIRouter(prefix="/api/admin", tags=["Admin Panel"])


# ── STAFF USER MANAGEMENT ──────────────────────────────────────────────────────
@router.get("/users", response_model=PaginatedResponse[UserOut])
async def list_users(
    query: str | None = Query(None, description="Search by name or email"),
    role: UserRole | None = Query(None),
    is_active: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    """Fetch list of staff users."""
    stmt = select(User)
    count_stmt = select(func.count(User.id))

    filters = []
    if query:
        search_pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                User.email.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
            )
        )
    if role:
        filters.append(User.role == role)
    if is_active is not None:
        filters.append(User.is_active == is_active)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(User.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    users = result.scalars().all()

    return PaginatedResponse.build(
        items=[UserOut.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_staff_user(
    payload: AdminUserCreate,
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new staff user account."""
    existing = await db.execute(select(User).where(User.email == payload.email.lower().strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_pw = get_password_hash(payload.password)
    user = User(
        email=payload.email.lower().strip(),
        hashed_password=hashed_pw,
        full_name=payload.full_name.strip(),
        phone=payload.phone,
        role=payload.role,
        is_active=True,
    )
    db.add(user)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_USER",
        entity_type="User",
        entity_id=user.id,
        details={"email": user.email, "role": user.role.value},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.put("/users/{user_id}", response_model=UserOut)
async def update_staff_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Update staff user account or change role."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(user, field, val)

    audit = AuditLog(
        user_id=current_user.id,
        action="UPDATE_USER",
        entity_type="User",
        entity_id=user.id,
        details={"updated_fields": list(update_data.keys())},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.post("/users/{user_id}/reset-password", response_model=SuccessResponse)
async def reset_user_password(
    user_id: uuid.UUID,
    payload: ResetPasswordRequest,
    current_user: User = Depends(require_roles(UserRole.admin)),
    db: AsyncSession = Depends(get_db),
):
    """Reset a staff user's password."""
    res = await db.execute(select(User).where(User.id == user_id))
    user = res.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = get_password_hash(payload.new_password)

    audit = AuditLog(
        user_id=current_user.id,
        action="RESET_PASSWORD",
        entity_type="User",
        entity_id=user.id,
        details={"target_email": user.email},
    )
    db.add(audit)

    await db.commit()
    return SuccessResponse(message="User password reset successfully")


# ── AUDIT LOGS VIEWER ────────────────────────────────────────────────────────
@router.get("/audit-logs", response_model=PaginatedResponse[AuditLogOut])
async def list_audit_logs(
    action: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    """Fetch paginated system audit logs."""
    stmt = select(AuditLog)
    count_stmt = select(func.count(AuditLog.id))

    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
        count_stmt = count_stmt.where(AuditLog.action.ilike(f"%{action}%"))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    logs = result.scalars().all()

    return PaginatedResponse.build(
        items=[AuditLogOut.model_validate(l) for l in logs],
        total=total,
        page=page,
        page_size=page_size,
    )
