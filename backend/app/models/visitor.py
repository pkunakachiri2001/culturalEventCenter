"""
CultureFlow — Visitor Model
Represents an individual person who has visited the cultural centre.
"""

import uuid
import enum
from datetime import datetime

from sqlalchemy import String, Enum, DateTime, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class VisitorType(str, enum.Enum):
    individual = "individual"
    student = "student"
    teacher = "teacher"
    group_member = "group_member"
    vip = "vip"


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    id_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    visitor_type: Mapped[VisitorType] = mapped_column(
        Enum(VisitorType, name="visitortype"),
        nullable=False,
        default=VisitorType.individual,
    )
    nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ────────────────────────────────────────────────────
    visit_links: Mapped[list["VisitVisitor"]] = relationship(  # noqa: F821
        "VisitVisitor", back_populates="visitor"
    )

    __table_args__ = (
        Index("ix_visitors_phone", "phone"),
        Index("ix_visitors_email", "email"),
    )

    def __repr__(self) -> str:
        return f"<Visitor {self.full_name}>"
