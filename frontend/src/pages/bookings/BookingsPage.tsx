/**
 * CultureFlow — Booking Management Module
 * Group tour coordination, approvals, rejections, rescheduling, calendar timeline, and visit check-in conversion.
 */

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  CalendarDays,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Users,
  School as SchoolIcon,
  Phone,
  Mail,
  UserCheck,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  AlertCircle,
  Trash2,
} from 'lucide-react'
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Skeleton,
  Alert,
} from '@/components/ui'
import {
  listBookings,
  createBooking,
  approveBooking,
  rejectBooking,
  rescheduleBooking,
  convertBookingToVisit,
  deleteBooking,
  type CreateBookingData,
  type ListBookingsParams,
} from '@/services/bookings'
import { listSchools } from '@/services/schools'
import type { Booking, BookingStatus, School } from '@/types'
import { formatDate, getInitials, cn } from '@/utils'

const bookingSchema = z.object({
  school_id: z.string().optional(),
  booking_date: z.string().min(1, 'Booking date is required'),
  start_time: z.string().optional(),
  contact_name: z.string().min(2, 'Contact person name is required'),
  contact_phone: z.string().optional(),
  contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  purpose: z.string().optional(),
  expected_num: z.number().min(1, 'Expected attendees must be at least 1').default(20),
  notes: z.string().optional(),
})
type BookingFormValues = z.infer<typeof bookingSchema>

export default function BookingsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [query, setQuery] = useState('')

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [rejectingBooking, setRejectingBooking] = useState<Booking | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('09:00')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)

  // ── Fetch Bookings ────────────────────────────────────────────────────────────
  const loadBookings = async () => {
    setLoading(true)
    try {
      const params: ListBookingsParams = {
        query: query || undefined,
        status: (statusFilter as BookingStatus) || undefined,
        page: 1,
        page_size: 100,
      }
      const data = await listBookings(params)
      setBookings(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Failed to load bookings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBookings()
  }, [query, statusFilter])

  // ── Action Handlers ──────────────────────────────────────────────────────────
  const handleApprove = async (id: string) => {
    try {
      await approveBooking(id)
      toast.success('Booking approved successfully!')
      loadBookings()
    } catch {
      toast.error('Failed to approve booking.')
    }
  }

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!rejectingBooking || !rejectionReason.trim()) return
    setRejectLoading(true)
    try {
      await rejectBooking(rejectingBooking.id, rejectionReason.trim())
      toast.success('Booking rejected.')
      setRejectingBooking(null)
      setRejectionReason('')
      loadBookings()
    } catch {
      toast.error('Rejection failed.')
    } finally {
      setRejectLoading(false)
    }
  }

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reschedulingBooking || !rescheduleDate) return
    setRescheduleLoading(true)
    try {
      await rescheduleBooking(reschedulingBooking.id, {
        new_booking_date: rescheduleDate,
        new_start_time: rescheduleTime || null,
      })
      toast.success('Booking rescheduled successfully!')
      setReschedulingBooking(null)
      loadBookings()
    } catch {
      toast.error('Reschedule failed.')
    } finally {
      setRescheduleLoading(false)
    }
  }

  const handleConvertToVisit = async (id: string) => {
    try {
      const visit = await convertBookingToVisit(id)
      toast.success(`Booking converted to Active Visit! Pass Code: ${visit.qr_code}`)
      loadBookings()
    } catch {
      toast.error('Failed to convert booking to active visit check-in.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this booking?')) return
    try {
      await deleteBooking(id)
      toast.success('Booking deleted.')
      loadBookings()
    } catch {
      toast.error('Delete failed.')
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-teal-400" />
            Booking Management
          </h1>
          <p className="page-subtitle">Schedule group tours, manage school reservations, and approve visits.</p>
        </div>

        <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Booking Request
        </Button>
      </div>

      {/* ── Controls Bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {['', 'pending', 'approved', 'rejected', 'completed', 'rescheduled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors',
                statusFilter === st
                  ? 'bg-teal-600/30 text-teal-300 border border-teal-500/30'
                  : 'bg-gray-800/60 text-gray-400 hover:text-gray-200'
              )}
            >
              {st || 'All Statuses'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <Input
            placeholder="Search contact or purpose..."
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-48"
          />

          <div className="flex items-center gap-1 bg-gray-800/60 p-1 rounded-lg border border-gray-700/50 shrink-0">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                viewMode === 'list' ? 'bg-teal-600/30 text-teal-300' : 'text-gray-400'
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={cn(
                'px-2.5 py-1 rounded text-xs font-medium transition-colors',
                viewMode === 'calendar' ? 'bg-teal-600/30 text-teal-300' : 'text-gray-400'
              )}
            >
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* ── VIEW 1: LIST / TABLE VIEW ─────────────────────────────────────────── */}
      {viewMode === 'list' ? (
        <Card className="!p-0 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-300">No booking requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-300">
                <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Contact / School</th>
                    <th className="py-3 px-4">Booking Date & Time</th>
                    <th className="py-3 px-4">Expected Attendees</th>
                    <th className="py-3 px-4">Purpose</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(booking.school_name || booking.contact_name)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-200">{booking.contact_name}</p>
                            {booking.school_name && (
                              <p className="text-[11px] text-teal-400 font-normal">{booking.school_name}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-300">
                        <div className="font-semibold">{formatDate(booking.booking_date)}</div>
                        <div className="text-gray-500">{booking.start_time || '09:00 AM'}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-teal-300">{booking.expected_num} pers.</td>
                      <td className="py-3 px-4 text-xs text-gray-400 max-w-xs truncate">
                        {booking.purpose || 'General Group Tour'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getBookingBadge(booking.status)}>{booking.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {booking.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(booking.id)}
                                className="p-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Approve Booking"
                              >
                                <CheckCircle2 className="w-4.5 h-4.5" />
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingBooking(booking)
                                  setRejectionReason('')
                                }}
                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                title="Reject Booking"
                              >
                                <XCircle className="w-4.5 h-4.5" />
                              </button>
                            </>
                          )}

                          {booking.status === 'approved' && (
                            <Button
                              size="sm"
                              onClick={() => handleConvertToVisit(booking.id)}
                              className="text-xs py-1 px-2.5 flex items-center gap-1 bg-teal-600 hover:bg-teal-500"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              Check-In Group
                            </Button>
                          )}

                          <button
                            onClick={() => {
                              setReschedulingBooking(booking)
                              setRescheduleDate(booking.booking_date)
                            }}
                            className="p-1.5 text-gray-400 hover:text-teal-300 transition-colors"
                            title="Reschedule"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(booking.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        /* ── VIEW 2: CALENDAR TIMELINE VIEW ───────────────────────────────────── */
        <CalendarViewGrid bookings={bookings} onSelectBooking={(b) => setReschedulingBooking(b)} />
      )}

      {/* ── MODAL 1: NEW BOOKING REQUEST ─────────────────────────────────────── */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Group Booking Request"
        description="Schedule a school or group visit."
        size="md"
      >
        <BookingFormModal
          onSuccess={() => {
            setCreateModalOpen(false)
            loadBookings()
          }}
        />
      </Modal>

      {/* ── MODAL 2: REJECT BOOKING REASON ────────────────────────────────────── */}
      {rejectingBooking && (
        <Modal
          open={!!rejectingBooking}
          onClose={() => setRejectingBooking(null)}
          title="Reject Booking Request"
          description={`Rejecting booking for ${rejectingBooking.contact_name}`}
          size="sm"
        >
          <form onSubmit={handleReject} className="space-y-4">
            <Input
              label="Rejection Reason"
              placeholder="e.g. Venue fully booked on this date"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setRejectingBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" loading={rejectLoading}>
                Confirm Rejection
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── MODAL 3: RESCHEDULE BOOKING ───────────────────────────────────────── */}
      {reschedulingBooking && (
        <Modal
          open={!!reschedulingBooking}
          onClose={() => setReschedulingBooking(null)}
          title="Reschedule Booking"
          description={`Select a new date and time for ${reschedulingBooking.contact_name}`}
          size="sm"
        >
          <form onSubmit={handleReschedule} className="space-y-4">
            <Input
              label="New Booking Date"
              type="date"
              value={rescheduleDate}
              onChange={(e) => setRescheduleDate(e.target.value)}
              required
            />

            <Input
              label="New Arrival Time"
              type="time"
              value={rescheduleTime}
              onChange={(e) => setRescheduleTime(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setReschedulingBooking(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={rescheduleLoading}>
                Reschedule Booking
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── SUB-COMPONENT: CALENDAR VIEW GRID ──────────────────────────────────────────
function CalendarViewGrid({
  bookings,
  onSelectBooking,
}: {
  bookings: Booking[]
  onSelectBooking: (b: Booking) => void
}) {
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-teal-400" />
          {monthName}
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={handleNextMonth} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-gray-400 py-2 border-b border-gray-800">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} className="h-28 bg-gray-950/40 rounded-lg" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
          const dayBookings = bookings.filter((b) => b.booking_date === dateStr)

          return (
            <div key={dayNum} className="h-28 bg-gray-900/60 p-1.5 rounded-lg border border-gray-800 flex flex-col justify-between overflow-hidden">
              <span className="text-xs font-semibold text-gray-400">{dayNum}</span>
              <div className="space-y-1 overflow-y-auto max-h-20">
                {dayBookings.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelectBooking(b)}
                    className={cn(
                      'w-full text-[10px] p-1 rounded font-semibold truncate text-left transition-opacity hover:opacity-80',
                      b.status === 'approved' ? 'bg-teal-900/80 text-teal-200 border border-teal-700/50' : 'bg-amber-900/80 text-amber-200 border border-amber-700/50'
                    )}
                  >
                    {b.school_name || b.contact_name} ({b.expected_num}p)
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ── SUB-COMPONENT: BOOKING FORM MODAL ──────────────────────────────────────────
function BookingFormModal({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<School[]>([])

  useEffect(() => {
    listSchools({ page_size: 100 }).then((res) => setSchools(res.items)).catch(() => {})
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      expected_num: 20,
    },
  })

  const onSubmit = async (values: BookingFormValues) => {
    setLoading(true)
    try {
      await createBooking(values as CreateBookingData)
      toast.success('Booking request submitted!')
      onSuccess()
    } catch {
      toast.error('Failed to create booking.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Select
        label="Select School (Optional)"
        id="school_id"
        options={[
          { value: '', label: 'None — General Group / Private Tour' },
          ...schools.map((s) => ({ value: s.id, label: `${s.name} (${s.province || 'General'})` })),
        ]}
        {...register('school_id')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Booking Date"
          type="date"
          id="booking_date"
          error={errors.booking_date?.message}
          {...register('booking_date')}
        />
        <Input
          label="Arrival Time"
          type="time"
          id="start_time"
          defaultValue="09:00"
          {...register('start_time')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Contact Person Name"
          id="contact_name"
          placeholder="e.g. Mrs. S. Dube"
          error={errors.contact_name?.message}
          {...register('contact_name')}
        />
        <Input
          label="Phone Number"
          id="contact_phone"
          placeholder="e.g. +263 77 111 2222"
          {...register('contact_phone')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Email Address"
          type="email"
          id="contact_email"
          placeholder="e.g. booking@school.com"
          error={errors.contact_email?.message}
          {...register('contact_email')}
        />
        <Input
          label="Expected Attendees"
          type="number"
          id="expected_num"
          error={errors.expected_num?.message}
          {...register('expected_num', { valueAsNumber: true })}
        />
      </div>

      <Input
        label="Tour / Visit Purpose"
        id="purpose"
        placeholder="e.g. Cultural Heritage & History Workshop"
        {...register('purpose')}
      />

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
        <Button type="submit" loading={loading}>
          Submit Booking Request
        </Button>
      </div>
    </form>
  )
}

function getBookingBadge(status: BookingStatus) {
  switch (status) {
    case 'approved':
      return 'green'
    case 'pending':
      return 'amber'
    case 'rejected':
      return 'red'
    case 'completed':
      return 'teal'
    case 'rescheduled':
      return 'purple'
    default:
      return 'gray'
  }
}
