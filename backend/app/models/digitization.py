"""
CultureFlow — DigitizedRecord Model
Stores OCR + AI extraction results from uploaded historical documents.
"""

import uuid
import enum
from datetime import datetime

from sqlalchemy import (
    String, Text, Float, Boolean, Enum, DateTime, ForeignKey, func, Index
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class DigitizationStatus(str, enum.Enum):
    processing = "processing"    # OCR/AI in progress
    needs_review = "needs_review"  # Extracted, waiting for human review
    confirmed = "confirmed"      # Human reviewed and approved
    rejected = "rejected"        # Human rejected (bad scan / duplicate)
    saved = "saved"              # Confirmed and saved to visits table


class DigitizedRecord(Base):
    __tablename__ = "digitized_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    mapped_visit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("visits.id", ondelete="SET NULL"), nullable=True
    )
    original_image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_ocr_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    """
    extracted_data JSON shape:
    {
      "visitor_name": {"value": "...", "confidence": 0.95},
      "school": {"value": "...", "confidence": 0.80},
      "teacher": {"value": "...", "confidence": 0.70},
      "phone": {"value": "...", "confidence": 0.90},
      "email": {"value": null, "confidence": 0.0},
      "province": {"value": "...", "confidence": 0.85},
      "country": {"value": "Zimbabwe", "confidence": 0.99},
      "visit_date": {"value": "2018-03-15", "confidence": 0.75},
      "num_students": {"value": 45, "confidence": 0.88},
      "num_teachers": {"value": 3, "confidence": 0.88},
      "payment": {"value": "USD 5.00", "confidence": 0.60},
      "purpose": {"value": "...", "confidence": 0.70},
      "notes": {"value": null, "confidence": 0.0}
    }
    """
    overall_confidence: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[DigitizationStatus] = mapped_column(
        Enum(DigitizationStatus, name="digitizationstatus"),
        nullable=False,
        default=DigitizationStatus.processing,
        index=True,
    )
    is_duplicate: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    duplicate_of: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("digitized_records.id", ondelete="SET NULL"), nullable=True
    )
    reviewer_notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
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
    created_by_user: Mapped["User | None"] = relationship(  # noqa: F821
        "User", back_populates="digitized_records"
    )
    mapped_visit: Mapped["Visit | None"] = relationship(  # noqa: F821
        "Visit", back_populates="digitized_records", foreign_keys=[mapped_visit_id]
    )
    duplicate_record: Mapped["DigitizedRecord | None"] = relationship(
        "DigitizedRecord", remote_side="DigitizedRecord.id", foreign_keys=[duplicate_of]
    )

    __table_args__ = (
        Index("ix_digitized_records_status", "status"),
        Index("ix_digitized_records_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<DigitizedRecord {self.id} [{self.status}] confidence={self.overall_confidence:.2f}>"
