/**
 * CultureFlow — Global TypeScript Types
 */

// ── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'manager' | 'receptionist' | 'finance_officer' | 'tour_guide'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
  avatar_url: string | null
  last_login: string | null
  created_at: string
}

export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface LoginCredentials {
  email: string
  password: string
}

// ── Common ────────────────────────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ApiError {
  success: false
  error: string
  details?: { field?: string; message: string }[]
}

// ── School ────────────────────────────────────────────────────────────────────
export interface School {
  id: string
  name: string
  province: string | null
  country: string
  contact_teacher: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  visit_count: number
  created_at: string
  updated_at: string
}

// ── Visitor ───────────────────────────────────────────────────────────────────
export type VisitorType = 'individual' | 'student' | 'teacher' | 'group_member' | 'vip'

export interface Visitor {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  id_number: string | null
  visitor_type: VisitorType
  nationality: string | null
  notes: string | null
  created_at: string
}

// ── Visit ─────────────────────────────────────────────────────────────────────
export type VisitType = 'individual' | 'school' | 'group' | 'vip'

export interface Visit {
  id: string
  created_by: string | null
  school_id: string | null
  booking_id: string | null
  visit_type: VisitType
  visit_date: string
  check_in_time: string | null
  check_out_time: string | null
  num_students: number
  num_teachers: number
  num_adults: number
  purpose: string | null
  qr_code: string | null
  notes: string | null
  is_checked_out: boolean
  total_visitors: number
  school?: School
  school_name?: string | null
  visitors?: Visitor[]
  created_at: string
  updated_at: string
}

// ── Booking ───────────────────────────────────────────────────────────────────
export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed' | 'rescheduled'

export interface Booking {
  id: string
  school_id: string | null
  created_by: string | null
  booking_date: string
  start_time: string | null
  end_time: string | null
  status: BookingStatus
  contact_name: string
  contact_phone: string | null
  contact_email: string | null
  purpose: string | null
  expected_num: number
  notes: string | null
  rejection_reason: string | null
  school?: School
  school_name?: string | null
  created_at: string
  updated_at: string
}

// ── Finance ───────────────────────────────────────────────────────────────────
export type PaymentMethod = 'cash' | 'card' | 'ecocash' | 'bank_transfer' | 'free' | 'other'

export interface Ticket {
  id: string
  name: string
  description: string | null
  price: number
  currency: string
  is_active: boolean
  sort_order: number
  created_at: string
}

export interface PaymentItem {
  id: string
  payment_id: string
  ticket_id: string | null
  description: string | null
  quantity: number
  unit_price: number
  total_price: number
  ticket?: Ticket
}

export interface Payment {
  id: string
  visit_id: string | null
  created_by: string | null
  total_amount: number
  currency: string
  payment_method: PaymentMethod
  receipt_number: string | null
  notes: string | null
  items: PaymentItem[]
  created_at: string
}

// ── Digitization ──────────────────────────────────────────────────────────────
export type DigitizationStatus = 'processing' | 'needs_review' | 'confirmed' | 'rejected' | 'saved'

export interface ExtractedField {
  value: string | number | null
  confidence: number
}

export interface ExtractedData {
  visitor_name?: ExtractedField
  school?: ExtractedField
  teacher?: ExtractedField
  phone?: ExtractedField
  email?: ExtractedField
  province?: ExtractedField
  country?: ExtractedField
  visit_date?: ExtractedField
  num_students?: ExtractedField
  num_teachers?: ExtractedField
  payment?: ExtractedField
  purpose?: ExtractedField
  notes?: ExtractedField
}

export interface DigitizedRecord {
  id: string
  created_by: string | null
  mapped_visit_id: string | null
  original_image_url: string
  original_filename: string | null
  raw_ocr_text: string | null
  extracted_data: ExtractedData | null
  overall_confidence: number
  status: DigitizationStatus
  is_duplicate: boolean
  duplicate_of: string | null
  reviewer_notes: string | null
  created_at: string
  updated_at: string
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface TrendPoint {
  date: string
  value: number
}

export interface RecentActivityItem {
  id: string
  action: string
  entity_type: string
  description: string
  user_name: string
  created_at: string
}

export interface UpcomingBookingItem {
  id: string
  school_name: string | null
  contact_name: string
  contact_phone: string | null
  booking_date: string
  start_time: string | null
  expected_num: number
  status: BookingStatus
}

export interface DashboardStatsResponse {
  todays_visitors: number
  monthly_visitors: number
  todays_revenue: number
  monthly_revenue: number
  upcoming_bookings_count: number
  schools_registered_count: number
  pending_digitization_count: number
  visitor_trend: TrendPoint[]
  revenue_trend: TrendPoint[]
  recent_activities: RecentActivityItem[]
  upcoming_bookings: UpcomingBookingItem[]
}

// ── Reports ───────────────────────────────────────────────────────────────────
export interface ReportSummaryResponse {
  report_type: string
  title: string
  start_date: string
  end_date: string
  total_visitors: number
  total_revenue: number
  total_schools: number
  total_bookings: number
  breakdown_rows: Record<string, any>[]
}
