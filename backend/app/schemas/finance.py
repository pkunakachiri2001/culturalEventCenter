"""
CultureFlow — Finance Schemas
Pydantic models for admission tickets, payments, line items, receipts, and financial metrics.
"""

from datetime import datetime
from decimal import Decimal
import uuid

from pydantic import BaseModel, Field

from app.models.finance import PaymentMethod
from app.schemas.common import OrmBase


# ── Ticket Schemas ────────────────────────────────────────────────────────────
class TicketCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)
    price: Decimal = Field(..., ge=0)
    currency: str = Field("USD", max_length=5)
    is_active: bool = True
    sort_order: int = Field(0, ge=0)


class TicketUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=100)
    description: str | None = Field(None, max_length=500)
    price: Decimal | None = Field(None, ge=0)
    currency: str | None = Field(None, max_length=5)
    is_active: bool | None = None
    sort_order: int | None = Field(None, ge=0)


class TicketOut(OrmBase):
    id: uuid.UUID
    name: str
    description: str | None = None
    price: Decimal
    currency: str
    is_active: bool
    sort_order: int
    created_at: datetime


# ── Payment Line Item Schemas ────────────────────────────────────────────────
class PaymentItemCreate(BaseModel):
    ticket_id: uuid.UUID | None = None
    description: str | None = Field(None, max_length=200)
    quantity: int = Field(1, ge=1)
    unit_price: Decimal = Field(..., ge=0)


class PaymentItemOut(OrmBase):
    id: uuid.UUID
    payment_id: uuid.UUID
    ticket_id: uuid.UUID | None = None
    description: str | None = None
    quantity: int
    unit_price: Decimal
    total_price: Decimal


# ── Payment Receipt Schemas ──────────────────────────────────────────────────
class PaymentCreate(BaseModel):
    visit_id: uuid.UUID | None = None
    payment_method: PaymentMethod = PaymentMethod.cash
    currency: str = Field("USD", max_length=5)
    items: list[PaymentItemCreate] = Field(..., min_items=1)
    notes: str | None = Field(None, max_length=500)


class PaymentOut(OrmBase):
    id: uuid.UUID
    visit_id: uuid.UUID | None = None
    created_by: uuid.UUID | None = None
    total_amount: Decimal
    currency: str
    payment_method: PaymentMethod
    receipt_number: str | None = None
    notes: str | None = None
    items: list[PaymentItemOut] = []
    created_at: datetime


# ── Financial Dashboard Summary Schema ────────────────────────────────────────
class MethodSummary(BaseModel):
    method: str
    count: int
    amount: float


class FinancialSummaryResponse(BaseModel):
    todays_revenue: float
    monthly_revenue: float
    total_transactions_today: int
    total_transactions_month: int
    method_breakdown: list[MethodSummary]
