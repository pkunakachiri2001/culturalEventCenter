"""
CultureFlow — AI Digitization Router
Upload, OCR + Gemini extraction, human review, duplicate detection, and database confirmation.
"""

from datetime import date, datetime, timezone
from pathlib import Path
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import get_settings
from app.models.audit import AuditLog
from app.models.digitization import DigitizedRecord, DigitizationStatus
from app.models.school import School
from app.models.user import User, UserRole
from app.models.visit import Visit, VisitType, VisitVisitor
from app.models.visitor import Visitor, VisitorType
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.digitization import (
    DigitizedRecordOut,
    DigitizedRecordUpdate,
)
from app.schemas.visitor import VisitOut
from app.services.ocr_service import (
    calculate_overall_confidence,
    process_image_with_ai,
    run_tesseract_ocr,
)
from app.utils.deps import get_current_active_user, get_db

router = APIRouter(prefix="/api/digitize", tags=["AI Digitization"])
settings = get_settings()


@router.post("/upload", response_model=DigitizedRecordOut, status_code=status.HTTP_201_CREATED)
async def upload_and_digitize(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload handwritten register page, run OCR + Groq AI extraction, and store record for review."""
    filename = file.filename or f"scan_{uuid.uuid4().hex[:6]}.jpg"
    ext = Path(filename).suffix.lower()

    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".pdf"]:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload JPG, PNG, WEBP, or PDF images.",
        )

    # Save uploaded file to static upload dir
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    saved_filename = f"{uuid.uuid4().hex}_{filename}"
    file_path = upload_dir / saved_filename

    contents = await file.read()
    with open(file_path, "wb") as f:
        f.write(contents)

    image_url = f"/uploads/{saved_filename}"

    # Step 1: Run OCR text extraction
    raw_ocr_text = run_tesseract_ocr(file_path)

    # Step 2: Groq AI structured field extraction
    extracted_fields = await process_image_with_ai(file_path, raw_ocr_text)

    # Step 3: Compute confidence score
    overall_confidence = calculate_overall_confidence(extracted_fields)

    # Step 4: Duplicate Detection
    visitor_name = extracted_fields.get("visitor_name", {}).get("value")
    visit_date_val = extracted_fields.get("visit_date", {}).get("value")

    is_duplicate = False
    duplicate_of_id = None

    if visitor_name and visit_date_val:
        dup_res = await db.execute(
            select(DigitizedRecord).where(
                and_(
                    DigitizedRecord.status.in_([DigitizationStatus.needs_review, DigitizationStatus.saved]),
                    DigitizedRecord.extracted_data["visitor_name"]["value"].astext == visitor_name,
                )
            )
        )
        dup_existing = dup_res.scalar_one_or_none()
        if dup_existing:
            is_duplicate = True
            duplicate_of_id = dup_existing.id

    # Create DigitizedRecord in DB
    record = DigitizedRecord(
        created_by=current_user.id,
        original_image_url=image_url,
        original_filename=filename,
        raw_ocr_text=raw_ocr_text,
        extracted_data=extracted_fields,
        overall_confidence=overall_confidence,
        status=DigitizationStatus.needs_review,
        is_duplicate=is_duplicate,
        duplicate_of=duplicate_of_id,
    )
    db.add(record)

    audit = AuditLog(
        user_id=current_user.id,
        action="UPLOAD_DIGITIZATION",
        entity_type="DigitizedRecord",
        entity_id=record.id,
        details={
            "filename": filename,
            "overall_confidence": overall_confidence,
            "is_duplicate": is_duplicate,
        },
    )
    db.add(audit)

    await db.commit()
    await db.refresh(record)
    return DigitizedRecordOut.model_validate(record)


@router.get("/records", response_model=PaginatedResponse[DigitizedRecordOut])
async def list_digitized_records(
    status_filter: DigitizationStatus | None = Query(None, alias="status"),
    is_duplicate: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch paginated list of digitized historical records."""
    stmt = select(DigitizedRecord)
    count_stmt = select(func.count(DigitizedRecord.id))

    filters = []
    if status_filter:
        filters.append(DigitizedRecord.status == status_filter)
    if is_duplicate is not None:
        filters.append(DigitizedRecord.is_duplicate == is_duplicate)

    if filters:
        stmt = stmt.where(and_(*filters))
        count_stmt = count_stmt.where(and_(*filters))

    total_res = await db.execute(count_stmt)
    total = total_res.scalar_one()

    offset = (page - 1) * page_size
    stmt = stmt.order_by(DigitizedRecord.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(stmt)
    records = result.scalars().all()

    return PaginatedResponse.build(
        items=[DigitizedRecordOut.model_validate(r) for r in records],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/records/{record_id}", response_model=DigitizedRecordOut)
async def get_digitized_record(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Get single digitized record details."""
    res = await db.execute(select(DigitizedRecord).where(DigitizedRecord.id == record_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Digitized record not found")
    return DigitizedRecordOut.model_validate(record)


@router.put("/records/{record_id}", response_model=DigitizedRecordOut)
async def update_digitized_record(
    record_id: uuid.UUID,
    payload: DigitizedRecordUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Update manual field corrections for a digitized record."""
    res = await db.execute(select(DigitizedRecord).where(DigitizedRecord.id == record_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Digitized record not found")

    if payload.extracted_data is not None:
        record.extracted_data = payload.extracted_data
        record.overall_confidence = calculate_overall_confidence(payload.extracted_data)

    if payload.reviewer_notes is not None:
        record.reviewer_notes = payload.reviewer_notes

    if payload.status is not None:
        record.status = payload.status

    await db.commit()
    await db.refresh(record)
    return DigitizedRecordOut.model_validate(record)


@router.post("/records/{record_id}/confirm", response_model=VisitOut)
async def confirm_and_save_to_database(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Confirm reviewed record and create official PostgreSQL Visit & Visitor records.
    Permanently links the original uploaded image to the Visit record.
    """
    res = await db.execute(select(DigitizedRecord).where(DigitizedRecord.id == record_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Digitized record not found")

    data = record.extracted_data or {}

    # Extract field values
    visitor_name = data.get("visitor_name", {}).get("value") or "Historical Guest"
    school_name = data.get("school", {}).get("value")
    phone = data.get("phone", {}).get("value")
    email = data.get("email", {}).get("value")
    purpose = data.get("purpose", {}).get("value") or "Historical Visit Log"
    notes = data.get("notes", {}).get("value")

    # Date parsing
    visit_date_str = data.get("visit_date", {}).get("value")
    try:
        visit_date = date.fromisoformat(visit_date_str) if visit_date_str else date.today()
    except ValueError:
        visit_date = date.today()

    num_students = int(data.get("num_students", {}).get("value") or 0)
    num_teachers = int(data.get("num_teachers", {}).get("value") or 0)
    num_adults = 1 if not num_students else 0

    # Optional school lookup or creation
    school_obj = None
    if school_name:
        s_res = await db.execute(select(School).where(School.name.ilike(school_name.strip())))
        school_obj = s_res.scalar_one_or_none()
        if not school_obj:
            school_obj = School(
                name=school_name.strip(),
                province=data.get("province", {}).get("value"),
                country=data.get("country", {}).get("value") or "Zimbabwe",
                phone=phone,
                email=email,
                visit_count=1,
            )
            db.add(school_obj)
            await db.flush()
        else:
            school_obj.visit_count += 1

    # Create Visitor
    visitor_obj = Visitor(
        full_name=visitor_name,
        phone=phone,
        email=email,
        visitor_type=VisitorType.student if school_obj else VisitorType.individual,
        nationality=data.get("country", {}).get("value") or "Zimbabwe",
        notes=f"Digitized from historical scan: {record.original_filename or record.id}",
    )
    db.add(visitor_obj)
    await db.flush()

    # Create Visit
    now = datetime.now(timezone.utc)
    qr_code = f"CF-HIST-{uuid.uuid4().hex[:8].upper()}"

    visit = Visit(
        created_by=current_user.id,
        school_id=school_obj.id if school_obj else None,
        visit_type=VisitType.school if school_obj else VisitType.individual,
        visit_date=visit_date,
        check_in_time=now.time(),
        num_students=num_students,
        num_teachers=num_teachers,
        num_adults=num_adults,
        purpose=purpose,
        qr_code=qr_code,
        notes=f"Digitized Record linked. Original Image: {record.original_image_url}",
        is_checked_out=True,  # Historical visits default to checked out
    )
    db.add(visit)
    await db.flush()

    # Link Visitor
    db.add(VisitVisitor(visit_id=visit.id, visitor_id=visitor_obj.id, is_leader=True))

    # Update Digitized Record status and link visit
    record.status = DigitizationStatus.saved
    record.mapped_visit_id = visit.id

    audit = AuditLog(
        user_id=current_user.id,
        action="CONFIRM_DIGITIZATION",
        entity_type="DigitizedRecord",
        entity_id=record.id,
        details={"visit_id": str(visit.id), "visitor_name": visitor_name},
    )
    db.add(audit)

    await db.commit()

    res_v = await db.execute(
        select(Visit).options(selectinload(Visit.school)).where(Visit.id == visit.id)
    )
    v_loaded = res_v.scalar_one()

    v_out = VisitOut.model_validate(v_loaded)
    if v_loaded.school:
        v_out.school_name = v_loaded.school.name
    return v_out


@router.post("/records/{record_id}/reject", response_model=DigitizedRecordOut)
async def reject_digitized_record(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Reject a digitized record scan."""
    res = await db.execute(select(DigitizedRecord).where(DigitizedRecord.id == record_id))
    record = res.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Digitized record not found")

    record.status = DigitizationStatus.rejected
    await db.commit()
    await db.refresh(record)
    return DigitizedRecordOut.model_validate(record)
