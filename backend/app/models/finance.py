"""
CultureFlow — Finance Models: Ticket, Payment, PaymentItem
"""

import uuid
import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    String, Numeric, Boolean, Enum, DateTime, Integer,
    ForeignKey, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class PaymentMethod(str, enum.Enum):
    cash = "cash"
    card = "card"
    ecocash = "ecocash"
    bank_transfer = "bank_transfer"
    free = "free"
    other = "other"


class Ticket(Base):
    """Configurable ticket/admission price categories."""

    __tablename__ = "tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)  # e.g. "Student", "Adult"
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False, default=Decimal("0.00")
    )
    currency: Mapped[str] = mapped_column(String(5), nullable=False, default="USD")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    payment_items: Mapped[list["PaymentItem"]] = relationship(
        "PaymentItem", back_populates="ticket"
    )

    def __repr__(self) -> str:
        return f"<Ticket {self.name} @ {self.currency} {self.price}>"


class Payment(Base):
    """A payment record linked to a visit."""

    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    visit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )
    currency: Mapped[str] = mapped_column(String(5), nullable=False, default="USD")
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="paymentmethod"),
        nullable=False,
        default=PaymentMethod.cash,
    )
    receipt_number: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ────────────────────────────────────────────────────
    visit: Mapped["Visit | None"] = relationship("Visit", back_populates="payments")  # noqa: F821
    created_by_user: Mapped["User | None"] = relationship("User", back_populates="payments")  # noqa: F821
    items: Mapped[list["PaymentItem"]] = relationship(
        "PaymentItem", back_populates="payment", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_payments_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Payment {self.receipt_number} [{self.currency} {self.total_amount}]>"


class PaymentItem(Base):
    """Line items within a payment (ticket type × quantity)."""

    __tablename__ = "payment_items"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    payment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False,
    )
    ticket_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tickets.id", ondelete="SET NULL"), nullable=True
    )
    description: Mapped[str | None] = mapped_column(String(200), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )
    total_price: Mapped[Decimal] = mapped_column(
        Numeric(precision=10, scale=2), nullable=False
    )

    # ── Relationships ────────────────────────────────────────────────────
    payment: Mapped["Payment"] = relationship("Payment", back_populates="items")
    ticket: Mapped["Ticket | None"] = relationship("Ticket", back_populates="payment_items")

    def __repr__(self) -> str:
        return f"<PaymentItem {self.quantity}x {self.description} = {self.total_price}>"
