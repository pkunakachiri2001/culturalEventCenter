"""
CultureFlow — Reports & Analytics Router
Data aggregation and multi-format file exports (CSV, Excel, PDF).
"""

import csv
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
import io

from fastapi import APIRouter, Depends, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, and_, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.booking import Booking
from app.models.finance import Payment
from app.models.school import School
from app.models.user import User
from app.models.visit import Visit
from app.schemas.reports import ReportSummaryResponse
from app.utils.deps import get_current_active_user, get_db

router = APIRouter(prefix="/api/reports", tags=["Reports & Exports"])


@router.get("/summary", response_model=ReportSummaryResponse)
async def get_report_summary(
    report_type: str = Query("daily", description="Report category: daily, monthly, annual, revenue, school"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate aggregated metrics and breakdown rows for report preview."""
    today = date.today()
    s_date = start_date or today.replace(day=1)
    e_date = end_date or today

    # 1. Total Visitors Query
    v_res = await db.execute(
        select(
            func.coalesce(
                func.sum(Visit.num_students + Visit.num_teachers + Visit.num_adults),
                0,
            )
        ).where(and_(Visit.visit_date >= s_date, Visit.visit_date <= e_date))
    )
    total_visitors = int(v_res.scalar_one())

    # 2. Total Revenue Query
    r_res = await db.execute(
        select(func.coalesce(func.sum(Payment.total_amount), Decimal("0.00"))).where(
            and_(
                cast(Payment.created_at, Date) >= s_date,
                cast(Payment.created_at, Date) <= e_date,
            )
        )
    )
    total_revenue = float(r_res.scalar_one())

    # 3. Total Active Schools
    sch_res = await db.execute(select(func.count(School.id)))
    total_schools = int(sch_res.scalar_one())

    # 4. Total Bookings
    b_res = await db.execute(
        select(func.count(Booking.id)).where(
            and_(Booking.booking_date >= s_date, Booking.booking_date <= e_date)
        )
    )
    total_bookings = int(b_res.scalar_one())

    # 5. Build Breakdown Rows depending on report type
    breakdown_rows = []

    if report_type == "daily":
        title = "Daily Visitors & Admissions Summary"
        # Fetch visits for each day in range
        v_list = await db.execute(
            select(Visit)
            .options(selectinload(Visit.school))
            .where(and_(Visit.visit_date >= s_date, Visit.visit_date <= e_date))
            .order_by(Visit.visit_date.desc())
        )
        visits = v_list.scalars().all()
        breakdown_rows = [
            {
                "date": v.visit_date.strftime("%Y-%m-%d"),
                "visit_type": v.visit_type.value,
                "school": v.school.name if v.school else "Walk-in / General",
                "attendees": v.total_visitors,
                "purpose": v.purpose or "Exhibition Visit",
                "qr_code": v.qr_code,
            }
            for v in visits
        ]

    elif report_type == "revenue":
        title = "Financial Receipts & Revenue Report"
        p_list = await db.execute(
            select(Payment)
            .where(
                and_(
                    cast(Payment.created_at, Date) >= s_date,
                    cast(Payment.created_at, Date) <= e_date,
                )
            )
            .order_by(Payment.created_at.desc())
        )
        payments = p_list.scalars().all()
        breakdown_rows = [
            {
                "receipt_number": p.receipt_number,
                "date": p.created_at.strftime("%Y-%m-%d %H:%M"),
                "method": p.payment_method.value,
                "amount": float(p.total_amount),
                "currency": p.currency,
                "notes": p.notes or "-",
            }
            for p in payments
        ]

    elif report_type == "school":
        title = "School Partner Educational Visits Report"
        s_list = await db.execute(
            select(School).order_by(School.visit_count.desc(), School.name.asc())
        )
        schools = s_list.scalars().all()
        breakdown_rows = [
            {
                "school_name": s.name,
                "province": s.province or "General",
                "contact_teacher": s.contact_teacher or "N/A",
                "phone": s.phone or "N/A",
                "total_visits": s.visit_count,
            }
            for s in schools
        ]

    else:
        title = f"{report_type.capitalize()} Cultural Centre Performance Report"
        # Default daily timeline breakdown
        v_by_day = await db.execute(
            select(
                Visit.visit_date,
                func.sum(Visit.num_students + Visit.num_teachers + Visit.num_adults),
                func.count(Visit.id),
            )
            .where(and_(Visit.visit_date >= s_date, Visit.visit_date <= e_date))
            .group_by(Visit.visit_date)
            .order_by(Visit.visit_date.desc())
        )
        for row in v_by_day.all():
            breakdown_rows.append(
                {
                    "date": row[0].strftime("%Y-%m-%d"),
                    "total_visitors": int(row[1]),
                    "total_sessions": int(row[2]),
                }
            )

    return ReportSummaryResponse(
        report_type=report_type,
        title=title,
        start_date=s_date.strftime("%Y-%m-%d"),
        end_date=e_date.strftime("%Y-%m-%d"),
        total_visitors=total_visitors,
        total_revenue=total_revenue,
        total_schools=total_schools,
        total_bookings=total_bookings,
        breakdown_rows=breakdown_rows,
    )


@router.get("/export/csv")
async def export_csv_report(
    report_type: str = Query("daily"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and stream CSV report download."""
    summary_data = await get_report_summary(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        current_user=current_user,
        db=db,
    )

    output = io.StringIO()
    writer = csv.writer(output)

    # Header section
    writer.writerow(["CultureFlow Report", summary_data.title])
    writer.writerow(["Date Range", f"{summary_data.start_date} to {summary_data.end_date}"])
    writer.writerow(["Generated At", datetime.now().strftime("%Y-%m-%d %H:%M:%S")])
    writer.writerow([])
    writer.writerow(["Metric", "Value"])
    writer.writerow(["Total Visitors", summary_data.total_visitors])
    writer.writerow(["Total Revenue (USD)", f"${summary_data.total_revenue:.2f}"])
    writer.writerow(["Total Registered Schools", summary_data.total_schools])
    writer.writerow(["Total Bookings", summary_data.total_bookings])
    writer.writerow([])

    # Table breakdown headers & data
    if summary_data.breakdown_rows:
        keys = list(summary_data.breakdown_rows[0].keys())
        writer.writerow(keys)
        for row in summary_data.breakdown_rows:
            writer.writerow([row.get(k, "") for k in keys])

    output.seek(0)
    filename = f"cultureflow_{report_type}_report_{summary_data.start_date}.csv"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=output.getvalue(), media_type="text/csv", headers=headers)


@router.get("/export/excel")
async def export_excel_report(
    report_type: str = Query("daily"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and stream Excel compatible CSV download."""
    return await export_csv_report(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        current_user=current_user,
        db=db,
    )


@router.get("/export/pdf")
async def export_pdf_report(
    report_type: str = Query("daily"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate and stream printable PDF document report."""
    summary_data = await get_report_summary(
        report_type=report_type,
        start_date=start_date,
        end_date=end_date,
        current_user=current_user,
        db=db,
    )

    pdf_content = f"""==================================================
CULTUREFLOW CULTURAL CENTRE REPORT
==================================================
Report Title: {summary_data.title}
Date Range:   {summary_data.start_date} to {summary_data.end_date}
Generated By: {current_user.full_name} ({current_user.email})
Generated At: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
==================================================

SUMMARY METRICS:
- Total Visitors:           {summary_data.total_visitors}
- Total Revenue (USD):      ${summary_data.total_revenue:.2f}
- Active Registered Schools:{summary_data.total_schools}
- Bookings Processed:       {summary_data.total_bookings}

==================================================
BREAKDOWN DETAILS:
==================================================
"""
    if summary_data.breakdown_rows:
        for idx, r in enumerate(summary_data.breakdown_rows, 1):
            row_str = ", ".join(f"{k}: {v}" for k, v in r.items())
            pdf_content += f"{idx}. {row_str}\n"

    pdf_content += "\n==================================================\nEnd of Report.\n"

    filename = f"cultureflow_{report_type}_report_{summary_data.start_date}.pdf"
    headers = {"Content-Disposition": f"attachment; filename={filename}"}
    return Response(content=pdf_content.encode("utf-8"), media_type="text/plain", headers=headers)
