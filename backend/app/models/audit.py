"""
CultureFlow — AuditLog Model
Immutable record of every significant user action.
"""

import uuid
from datetime import datetime

from sqlalchemy import String, DateTime, ForeignKey, func, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    # e.g. "create", "update", "delete", "login", "checkout"

    entity_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # e.g. "visit", "booking", "user"

    entity_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # Stored as string to accommodate any UUID or int PK

    changes: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    # {"before": {...}, "after": {...}} or {"message": "..."}

    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # ── Relationships ────────────────────────────────────────────────────
    user: Mapped["User | None"] = relationship("User", back_populates="audit_logs")  # noqa: F821

    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_audit_logs_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog {self.action} on {self.entity_type}:{self.entity_id}>"
