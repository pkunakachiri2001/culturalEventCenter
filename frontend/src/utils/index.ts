/**
 * CultureFlow — Utility Functions
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, isValid } from 'date-fns'
import type { UserRole, BookingStatus, VisitType, DigitizationStatus } from '@/types'

// ── Tailwind class merger ─────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date formatting ───────────────────────────────────────────────────────────
export function formatDate(dateStr: string | null | undefined, fmt = 'dd MMM yyyy'): string {
  if (!dateStr) return '—'
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
    return isValid(d) ? format(d, fmt) : '—'
  } catch {
    return '—'
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  return formatDate(dateStr, 'dd MMM yyyy, HH:mm')
}

export function formatTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '—'
  // time strings come as "HH:MM:SS" from backend
  return timeStr.slice(0, 5)
}

// ── Currency formatting ───────────────────────────────────────────────────────
export function formatCurrency(
  amount: number | null | undefined,
  currency = 'USD'
): string {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

// ── Number formatting ─────────────────────────────────────────────────────────
export function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-US').format(n)
}

// ── Role labels ───────────────────────────────────────────────────────────────
export const ROLE_LABELS: Record<UserRole, string> = {
  admin:          'Administrator',
  manager:        'Manager',
  receptionist:   'Receptionist',
  finance_officer:'Finance Officer',
  tour_guide:     'Tour Guide',
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] ?? role
}

// ── Role badge colour classes ─────────────────────────────────────────────────
export const ROLE_COLORS: Record<UserRole, string> = {
  admin:          'badge-red',
  manager:        'badge-purple',
  receptionist:   'badge-teal',
  finance_officer:'badge-amber',
  tour_guide:     'badge-green',
}

// ── Booking status label & colour ─────────────────────────────────────────────
export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending:     'Pending',
  approved:    'Approved',
  rejected:    'Rejected',
  cancelled:   'Cancelled',
  completed:   'Completed',
  rescheduled: 'Rescheduled',
}

export const BOOKING_STATUS_COLORS: Record<BookingStatus, string> = {
  pending:     'badge-amber',
  approved:    'badge-teal',
  rejected:    'badge-red',
  cancelled:   'badge-gray',
  completed:   'badge-green',
  rescheduled: 'badge-purple',
}

// ── Digitization status ───────────────────────────────────────────────────────
export const DIGITIZATION_STATUS_LABELS: Record<DigitizationStatus, string> = {
  processing:   'Processing',
  needs_review: 'Needs Review',
  confirmed:    'Confirmed',
  rejected:     'Rejected',
  saved:        'Saved',
}

export const DIGITIZATION_STATUS_COLORS: Record<DigitizationStatus, string> = {
  processing:   'badge-gray',
  needs_review: 'badge-amber',
  confirmed:    'badge-teal',
  rejected:     'badge-red',
  saved:        'badge-green',
}

// ── Confidence score colour ───────────────────────────────────────────────────
export function confidenceColor(score: number): string {
  if (score >= 0.85) return 'text-emerald-400'
  if (score >= 0.60) return 'text-amber-400'
  return 'text-red-400'
}

// ── Zimbabwe provinces ────────────────────────────────────────────────────────
export const ZIM_PROVINCES = [
  'Bulawayo',
  'Harare',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
]

// ── Truncate text ─────────────────────────────────────────────────────────────
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '…'
}

// ── Generate initials ─────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}
