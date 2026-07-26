"""
CultureFlow — Booking Model
"""

import uuid
import enum
from datetime import datetime, date, time

from sqlalchemy import (
    String, Integer, Enum, DateTime, Date, Time,
    ForeignKey, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class BookingStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    cancelled = "cancelled"
    completed = "completed"
    rescheduled = "rescheduled"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    school_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    booking_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus, name="bookingstatus"),
        nullable=False,
        default=BookingStatus.pending,
    )
    contact_name: Mapped[str] = mapped_column(String(150), nullable=False)
    contact_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    purpose: Mapped[str | None] = mapped_column(String(500), nullable=True)
    expected_num: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    rejection_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    rescheduled_from: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationships ────────────────────────────────────────────────────
    school: Mapped["School | None"] = relationship("School", back_populates="bookings")  # noqa: F821
    created_by_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="bookings", foreign_keys=[created_by]
    )
    visit: Mapped["Visit | None"] = relationship(  # noqa: F821
        "Visit", back_populates="booking", foreign_keys="Visit.booking_id"
    )
    rescheduled_booking: Mapped["Booking | None"] = relationship(
        "Booking", remote_side="Booking.id", foreign_keys=[rescheduled_from]
    )

    __table_args__ = (
        Index("ix_bookings_date_status", "booking_date", "status", postgresql_if_not_exists=True),
    )

    def __repr__(self) -> str:
        return f"<Booking {self.id} [{self.status} on {self.booking_date}]>"
