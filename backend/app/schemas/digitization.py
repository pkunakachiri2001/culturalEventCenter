"""
CultureFlow — Digitization Schemas
Pydantic models for OCR text extractions, AI field mapping, human review, and confirmation.
"""

from datetime import datetime
from typing import Any
import uuid

from pydantic import BaseModel, Field

from app.models.digitization import DigitizationStatus
from app.schemas.common import OrmBase


class ExtractedFieldDetail(BaseModel):
    value: Any = None
    confidence: float = 0.0


class ExtractedDataSchema(BaseModel):
    visitor_name: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    school: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    teacher: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    phone: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    email: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    province: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    country: ExtractedFieldDetail = Field(default_factory=lambda: ExtractedFieldDetail(value="Zimbabwe", confidence=1.0))
    visit_date: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    num_students: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    num_teachers: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    payment: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    purpose: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)
    notes: ExtractedFieldDetail = Field(default_factory=ExtractedFieldDetail)


class DigitizedRecordUpdate(BaseModel):
    extracted_data: dict[str, Any] | None = None
    reviewer_notes: str | None = Field(None, max_length=1000)
    status: DigitizationStatus | None = None


class DigitizedRecordOut(OrmBase):
    id: uuid.UUID
    created_by: uuid.UUID | None = None
    mapped_visit_id: uuid.UUID | None = None
    original_image_url: str
    original_filename: str | None = None
    raw_ocr_text: str | None = None
    extracted_data: dict[str, Any] | None = None
    overall_confidence: float
    status: DigitizationStatus
    is_duplicate: bool
    duplicate_of: uuid.UUID | None = None
    reviewer_notes: str | None = None
    created_at: datetime
    updated_at: datetime
