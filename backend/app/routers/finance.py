"""
CultureFlow — Finance & Payment Management Router
Ticket pricing categories, POS payment processing, receipts, and financial analytics.
"""

from datetime import date, datetime, timezone
from decimal import Decimal
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, or_, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.audit import AuditLog
from app.models.finance import Payment, PaymentItem, PaymentMethod, Ticket
from app.models.user import User, UserRole
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.finance import (
    FinancialSummaryResponse,
    MethodSummary,
    PaymentCreate,
    PaymentOut,
    TicketCreate,
    TicketOut,
    TicketUpdate,
)
from app.utils.deps import get_current_active_user, get_db, require_roles

router = APIRouter(prefix="/api/finance", tags=["Finance Management"])


# ── TICKET CATEGORIES ENDPOINTS ────────────────────────────────────────────────
@router.get("/tickets", response_model=list[TicketOut])
async def list_tickets(
    active_only: bool = Query(True, description="Filter active ticket categories"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """List admission ticket pricing categories."""
    stmt = select(Ticket)
    if active_only:
        stmt = stmt.where(Ticket.is_active.is_(True))
    stmt = stmt.order_by(Ticket.sort_order.asc(), Ticket.name.asc())

    result = await db.execute(stmt)
    tickets = result.scalars().all()
    return [TicketOut.model_validate(t) for t in tickets]


@router.post("/tickets", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.finance_officer)),
    db: AsyncSession = Depends(get_db),
):
    """Create a new admission ticket price category."""
    ticket = Ticket(
        name=payload.name,
        description=payload.description,
        price=payload.price,
        currency=payload.currency,
        is_active=payload.is_active,
        sort_order=payload.sort_order,
    )
    db.add(ticket)

    audit = AuditLog(
        user_id=current_user.id,
        action="CREATE_TICKET_CATEGORY",
        entity_type="Ticket",
        entity_id=ticket.id,
        details={"name": ticket.name, "price": str(ticket.price)},
    )
    db.add(audit)

    await db.commit()
    await db.refresh(ticket)
    return TicketOut.model_validate(ticket)


@router.put("/tickets/{ticket_id}", response_model=TicketOut)
async def update_ticket(
    ticket_id: uuid.UUID,
    payload: TicketUpdate,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager, UserRole.finance_officer)),
    db: AsyncSession = Depends(get_db),
):
    """Update an admission ticket category."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket category not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(ticket, field, val)

    await db.commit()
    await db.refresh(ticket)
    return TicketOut.model_validate(ticket)


@router.delete("/tickets/{ticket_id}", response_model=SuccessResponse)
async def delete_ticket(
    ticket_id: uuid.UUID,
    current_user: User = Depends(require_roles(UserRole.admin, UserRole.manager)),
    db: AsyncSession = Depends(get_db),
):
    """Soft-deactivate an admission ticket category."""
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket category not found")

    ticket.is_active = False
    await db.commit()
    return SuccessResponse(message="Ticket category deactivated successfully")


# ── PAYMENTS & RECEIPTS ENDPOINTS ──────────────────────────────────────────────
@router.get("/payments", response_model=PaginatedResponse[PaymentOut])
async def list_payments(
    query: str | None = Query(None, description="Search by receipt number or notes"),
    payment_method: PaymentMethod | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    visit_id: uuid.UUID | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch paginated list of processed payments and receipts."""
    stmt = select(Payment).options(selectinload(Payment.items))
    count_stmt = select(func.count(Payment.id))

    filters = []
    if query:
        search_pattern = f"%{query.strip()}%"
        filters.append(
            or_(
                Payment.receipt_number.ilike(search_pattern),
                Payment.notes.ilike(search_pattern),
            )
        )
    if payment_method:
        filters.append(Payment.payment_method == payment_method)
    if visit_id:
        filters.append(Payment.visit_id == visit_id)
    if start_date:
        filters.append(cast(Payment.created_at, Date) >= start_date)
    if end_date:
        filters.append(cast(Payment.created_at, Date) <= end_date)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(Payment.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    payments = result.scalars().all()

    return PaginatedResponse.build(
        items=[PaymentOut.model_validate(p) for p in payments],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def process_payment(
    payload: PaymentCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Process a new payment transaction and issue receipt number."""
    now = datetime.now(timezone.utc)
    receipt_number = f"RCP-{now.strftime('%Y%m%d')}-{uuid.uuid4().hex[:4].upper()}"

    # Calculate total amount across line items
    calculated_total = Decimal("0.00")
    items_to_create = []

    for item_data in payload.items:
        item_total = Decimal(str(item_data.quantity)) * item_data.unit_price
        calculated_total += item_total
        items_to_create.append(
            PaymentItem(
                ticket_id=item_data.ticket_id,
                description=item_data.description,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                total_price=item_total,
            )
        )

    payment = Payment(
        visit_id=payload.visit_id,
        created_by=current_user.id,
        total_amount=calculated_total,
        currency=payload.currency,
        payment_method=payload.payment_method,
        receipt_number=receipt_number,
        notes=payload.notes,
        items=items_to_create,
    )
    db.add(payment)

    audit = AuditLog(
        user_id=current_user.id,
        action="PROCESS_PAYMENT",
        entity_type="Payment",
        entity_id=payment.id,
        details={
            "receipt_number": receipt_number,
            "total_amount": str(calculated_total),
            "payment_method": payload.payment_method.value,
        },
    )
    db.add(audit)

    await db.commit()

    res = await db.execute(
        select(Payment).options(selectinload(Payment.items)).where(Payment.id == payment.id)
    )
    loaded_payment = res.scalar_one()
    return PaymentOut.model_validate(loaded_payment)


@router.get("/payments/{payment_id}", response_model=PaymentOut)
async def get_payment(
    payment_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single payment receipt details."""
    res = await db.execute(
        select(Payment).options(selectinload(Payment.items)).where(Payment.id == payment_id)
    )
    payment = res.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment record not found")
    return PaymentOut.model_validate(payment)


# ── FINANCIAL SUMMARY METRICS ENDPOINT ───────────────────────────────────────
@router.get("/summary", response_model=FinancialSummaryResponse)
async def get_financial_summary(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch real-time financial metrics and payment method breakdowns."""
    today = date.today()
    first_of_month = today.replace(day=1)

    # 1. Today's Revenue
    todays_revenue_res = await db.execute(
        select(func.coalesce(func.sum(Payment.total_amount), Decimal("0.00"))).where(
            cast(Payment.created_at, Date) == today
        )
    )
    todays_revenue = float(todays_revenue_res.scalar_one())

    # 2. Monthly Revenue
    monthly_revenue_res = await db.execute(
        select(func.coalesce(func.sum(Payment.total_amount), Decimal("0.00"))).where(
            cast(Payment.created_at, Date) >= first_of_month
        )
    )
    monthly_revenue = float(monthly_revenue_res.scalar_one())

    # 3. Transactions Today Count
    trans_today_res = await db.execute(
        select(func.count(Payment.id)).where(cast(Payment.created_at, Date) == today)
    )
    total_transactions_today = int(trans_today_res.scalar_one())

    # 4. Transactions Month Count
    trans_month_res = await db.execute(
        select(func.count(Payment.id)).where(cast(Payment.created_at, Date) >= first_of_month)
    )
    total_transactions_month = int(trans_month_res.scalar_one())

    # 5. Method Breakdown Today
    method_res = await db.execute(
        select(
            Payment.payment_method,
            func.count(Payment.id),
            func.coalesce(func.sum(Payment.total_amount), Decimal("0.00")),
        )
        .where(cast(Payment.created_at, Date) == today)
        .group_by(Payment.payment_method)
    )
    method_rows = method_res.all()

    method_breakdown = [
        MethodSummary(
            method=row[0].value if hasattr(row[0], "value") else str(row[0]),
            count=int(row[1]),
            amount=float(row[2]),
        )
        for row in method_rows
    ]

    return FinancialSummaryResponse(
        todays_revenue=todays_revenue,
        monthly_revenue=monthly_revenue,
        total_transactions_today=total_transactions_today,
        total_transactions_month=total_transactions_month,
        method_breakdown=method_breakdown,
    )
