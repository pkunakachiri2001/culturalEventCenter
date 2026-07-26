"""
CultureFlow — Pydantic Schemas Package
"""

from app.schemas.common import (
    PaginatedResponse,
    SuccessResponse,
    ErrorDetail,
    ErrorResponse,
    HealthResponse,
)
from app.schemas.auth import (
    TokenResponse,
    RefreshTokenRequest,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    UserOut,
)
from app.schemas.dashboard import (
    DashboardStatsResponse,
    TrendPoint,
    RecentActivityItem,
    UpcomingBookingItem,
)
from app.schemas.visitor import (
    VisitorCreate,
    VisitorUpdate,
    VisitorOut,
    VisitCheckInRequest,
    VisitCheckOutRequest,
    VisitOut,
)
from app.schemas.school import (
    SchoolCreate,
    SchoolUpdate,
    SchoolOut,
)
from app.schemas.booking import (
    BookingCreate,
    BookingUpdate,
    BookingRejectRequest,
    BookingRescheduleRequest,
    BookingOut,
)
from app.schemas.finance import (
    TicketCreate,
    TicketUpdate,
    TicketOut,
    PaymentItemCreate,
    PaymentItemOut,
    PaymentCreate,
    PaymentOut,
    FinancialSummaryResponse,
)
from app.schemas.reports import (
    ReportRow,
    ReportSummaryResponse,
)
from app.schemas.digitization import (
    DigitizedRecordOut,
    DigitizedRecordUpdate,
)
from app.schemas.admin import (
    AdminUserCreate,
    AdminUserUpdate,
    AuditLogOut,
)

__all__ = [
    "PaginatedResponse",
    "SuccessResponse",
    "ErrorDetail",
    "ErrorResponse",
    "HealthResponse",
    "TokenResponse",
    "RefreshTokenRequest",
    "PasswordChangeRequest",
    "ProfileUpdateRequest",
    "UserOut",
    "DashboardStatsResponse",
    "TrendPoint",
    "RecentActivityItem",
    "UpcomingBookingItem",
    "VisitorCreate",
    "VisitorUpdate",
    "VisitorOut",
    "VisitCheckInRequest",
    "VisitCheckOutRequest",
    "VisitOut",
    "SchoolCreate",
    "SchoolUpdate",
    "SchoolOut",
    "BookingCreate",
    "BookingUpdate",
    "BookingRejectRequest",
    "BookingRescheduleRequest",
    "BookingOut",
    "TicketCreate",
    "TicketUpdate",
    "TicketOut",
    "PaymentItemCreate",
    "PaymentItemOut",
    "PaymentCreate",
    "PaymentOut",
    "FinancialSummaryResponse",
    "ReportRow",
    "ReportSummaryResponse",
    "DigitizedRecordOut",
    "DigitizedRecordUpdate",
    "AdminUserCreate",
    "AdminUserUpdate",
    "AuditLogOut",
]
