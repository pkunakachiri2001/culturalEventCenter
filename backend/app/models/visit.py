"""
CultureFlow — Visit & VisitVisitor Models
A Visit is a single recorded visit event.
VisitVisitor is the many-to-many join between visits and individual visitors.
"""

import uuid
import enum
from datetime import datetime, date, time

from sqlalchemy import (
    String, Integer, Enum, DateTime, Date, Time,
    ForeignKey, Boolean, func, Index, text
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class VisitType(str, enum.Enum):
    individual = "individual"
    school = "school"
    group = "group"
    vip = "vip"


class Visit(Base):
    __tablename__ = "visits"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    # ── Who created it ───────────────────────────────────────────────────
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    # ── Optional links ───────────────────────────────────────────────────
    school_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("schools.id", ondelete="SET NULL"), nullable=True
    )
    booking_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("bookings.id", ondelete="SET NULL"), nullable=True
    )
    # ── Visit details ────────────────────────────────────────────────────
    visit_type: Mapped[VisitType] = mapped_column(
        Enum(VisitType, name="visittype"), nullable=False, default=VisitType.individual
    )
    visit_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    check_in_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    check_out_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    num_students: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    num_teachers: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    num_adults: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    purpose: Mapped[str | None] = mapped_column(String(500), nullable=True)
    qr_code: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    is_checked_out: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
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
    created_by_user: Mapped["User"] = relationship(  # noqa: F821
        "User", back_populates="visits", foreign_keys=[created_by]
    )
    school: Mapped["School | None"] = relationship(  # noqa: F821
        "School", back_populates="visits"
    )
    booking: Mapped["Booking | None"] = relationship(  # noqa: F821
        "Booking", back_populates="visit", foreign_keys=[booking_id]
    )
    visitor_links: Mapped[list["VisitVisitor"]] = relationship(
        "VisitVisitor", back_populates="visit", cascade="all, delete-orphan"
    )
    payments: Mapped[list["Payment"]] = relationship(  # noqa: F821
        "Payment", back_populates="visit", cascade="all, delete-orphan"
    )
    digitized_records: Mapped[list["DigitizedRecord"]] = relationship(  # noqa: F821
        "DigitizedRecord", back_populates="mapped_visit", foreign_keys="DigitizedRecord.mapped_visit_id"
    )

    __table_args__ = (
        Index("ix_visits_visit_date", "visit_date"),
        Index("ix_visits_school_id", "school_id"),
        Index("ix_visits_created_by", "created_by"),
    )

    @property
    def total_visitors(self) -> int:
        return self.num_students + self.num_teachers + self.num_adults

    def __repr__(self) -> str:
        return f"<Visit {self.id} [{self.visit_type} on {self.visit_date}]>"


class VisitVisitor(Base):
    """Many-to-many join table: Visit ↔ Visitor."""

    __tablename__ = "visit_visitors"

    visit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visits.id", ondelete="CASCADE"),
        primary_key=True,
    )
    visitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visitors.id", ondelete="CASCADE"),
        primary_key=True,
    )
    is_leader: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Relationships ────────────────────────────────────────────────────
    visit: Mapped["Visit"] = relationship("Visit", back_populates="visitor_links")
    visitor: Mapped["Visitor"] = relationship("Visitor", back_populates="visit_links")  # noqa: F821
