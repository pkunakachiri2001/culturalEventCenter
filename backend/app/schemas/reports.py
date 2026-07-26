"""
CultureFlow — Reports Schemas
Pydantic models for report filtering, summary data, and breakdown rows.
"""

from datetime import date
from typing import Any

from pydantic import BaseModel


class ReportRow(BaseModel):
    label: str
    date_str: str | None = None
    metric_primary: str | int | float
    metric_secondary: str | int | float | None = None
    category: str | None = None


class ReportSummaryResponse(BaseModel):
    report_type: str
    title: str
    start_date: str
    end_date: str
    total_visitors: int
    total_revenue: float
    total_schools: int
    total_bookings: int
    breakdown_rows: list[dict[str, Any]]
