/**
 * CultureFlow — Visitor Management Module
 * Individual, School, and Group check-in, live directory, QR check-in/out, and printable pass.
 */

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  Users,
  UserPlus,
  QrCode,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  X,
  School,
  UserCheck,
  LogOut,
  Sparkles,
  Calendar,
  Phone,
  Mail,
  Trash2,
  Edit,
  Building2,
  Filter,
} from 'lucide-react'
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Spinner,
  Alert,
  Skeleton,
} from '@/components/ui'
import {
  listVisits,
  listVisitors,
  checkInVisit,
  checkOutVisit,
  deleteVisitor,
  type ListVisitsParams,
  type ListVisitorsParams,
  type CheckInVisitData,
} from '@/services/visitors'
import type { Visit, Visitor, VisitType, VisitorType } from '@/types'
import { formatDateTime, formatDate, getInitials, cn } from '@/utils'

// ── Check-in Schema ───────────────────────────────────────────────────────────
const checkInSchema = z.object({
  visit_type: z.enum(['individual', 'school', 'group', 'vip']),
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  id_number: z.string().optional(),
  visitor_type: z.enum(['individual', 'student', 'teacher', 'group_member', 'vip']),
  num_students: z.number().min(0).default(0),
  num_teachers: z.number().min(0).default(0),
  num_adults: z.number().min(0).default(1),
  purpose: z.string().optional(),
  notes: z.string().optional(),
})
type CheckInFormValues = z.infer<typeof checkInSchema>

export default function VisitorsPage() {
  const [activeTab, setActiveTab] = useState<'visits' | 'directory' | 'checkin'>('visits')

  // Visits State
  const [visits, setVisits] = useState<Visit[]>([])
  const [visitsTotal, setVisitsTotal] = useState(0)
  const [visitsLoading, setVisitsLoading] = useState(true)
  const [visitsQuery, setVisitsQuery] = useState('')
  const [visitTypeFilter, setVisitTypeFilter] = useState<string>('')
  const [checkedOutFilter, setCheckedOutFilter] = useState<string>('false') // Default to active visits

  // Visitors Directory State
  const [visitors, setVisitors] = useState<Visitor[]>([])
  const [visitorsTotal, setVisitorsTotal] = useState(0)
  const [visitorsLoading, setVisitorsLoading] = useState(true)
  const [visitorsQuery, setVisitorsQuery] = useState('')

  // Modals & Active Selections
  const [passModalVisit, setPassModalVisit] = useState<Visit | null>(null)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [qrInput, setQrInput] = useState('')
  const [qrLoading, setQrLoading] = useState(false)

  // ── Fetch Visits ─────────────────────────────────────────────────────────────
  const loadVisits = async () => {
    setVisitsLoading(true)
    try {
      const params: ListVisitsParams = {
        query: visitsQuery || undefined,
        visit_type: (visitTypeFilter as VisitType) || undefined,
        is_checked_out: checkedOutFilter === '' ? undefined : checkedOutFilter === 'true',
        page: 1,
        page_size: 30,
      }
      const data = await listVisits(params)
      setVisits(data.items)
      setVisitsTotal(data.total)
    } catch {
      toast.error('Failed to load visit records.')
    } finally {
      setVisitsLoading(false)
    }
  }

  // ── Fetch Visitors Directory ──────────────────────────────────────────────────
  const loadVisitors = async () => {
    setVisitorsLoading(true)
    try {
      const params: ListVisitorsParams = {
        query: visitorsQuery || undefined,
        page: 1,
        page_size: 30,
      }
      const data = await listVisitors(params)
      setVisitors(data.items)
      setVisitorsTotal(data.total)
    } catch {
      toast.error('Failed to load visitor directory.')
    } finally {
      setVisitorsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'visits') loadVisits()
    if (activeTab === 'directory') loadVisitors()
  }, [activeTab, visitsQuery, visitTypeFilter, checkedOutFilter, visitorsQuery])

  // ── Quick QR Check-out ───────────────────────────────────────────────────────
  const handleQrCheckOut = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qrInput.trim()) return
    setQrLoading(true)
    try {
      const updated = await checkOutVisit({ qr_code: qrInput.trim() })
      toast.success(`Check-out successful for Pass: ${updated.qr_code}`)
      setQrModalOpen(false)
      setQrInput('')
      loadVisits()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      toast.error(msg ?? 'Check-out failed. Invalid or expired QR pass.')
    } finally {
      setQrLoading(false)
    }
  }

  // ── Direct Check-out Action ──────────────────────────────────────────────────
  const handleDirectCheckOut = async (visitId: string) => {
    try {
      await checkOutVisit({ visit_id: visitId })
      toast.success('Visitor successfully checked out!')
      loadVisits()
    } catch {
      toast.error('Check-out failed.')
    }
  }

  // ── Delete Visitor ───────────────────────────────────────────────────────────
  const handleDeleteVisitor = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this visitor record?')) return
    try {
      await deleteVisitor(id)
      toast.success('Visitor record deleted.')
      loadVisitors()
    } catch {
      toast.error('Action failed. Required Admin or Manager privileges.')
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-400" />
            Visitor Management
          </h1>
          <p className="page-subtitle">Check-in guests, issue visitor passes, and track entry history.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQrModalOpen(true)}
            className="flex items-center gap-2 border-teal-500/30 text-teal-300 hover:bg-teal-500/10"
          >
            <QrCode className="w-4 h-4 text-teal-400" />
            QR Check-out
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab('checkin')}
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            New Check-in
          </Button>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <TabButton
          active={activeTab === 'visits'}
          onClick={() => setActiveTab('visits')}
          icon={<Clock className="w-4 h-4" />}
          label="Active Visits & History"
          count={visitsTotal}
        />
        <TabButton
          active={activeTab === 'directory'}
          onClick={() => setActiveTab('directory')}
          icon={<Users className="w-4 h-4" />}
          label="Visitor Directory"
          count={visitorsTotal}
        />
        <TabButton
          active={activeTab === 'checkin'}
          onClick={() => setActiveTab('checkin')}
          icon={<UserPlus className="w-4 h-4" />}
          label="New Check-in Form"
        />
      </div>

      {/* ── TAB 1: VISITS LOG ──────────────────────────────────────────────────── */}
      {activeTab === 'visits' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search by purpose, QR code, or notes..."
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                value={visitsQuery}
                onChange={(e) => setVisitsQuery(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Visit Types' },
                { value: 'individual', label: 'Individual' },
                { value: 'school', label: 'School Group' },
                { value: 'group', label: 'General Group' },
                { value: 'vip', label: 'VIP Visitor' },
              ]}
              value={visitTypeFilter}
              onChange={(e) => setVisitTypeFilter(e.target.value)}
            />
            <Select
              options={[
                { value: 'false', label: 'Active On-Site Visits' },
                { value: 'true', label: 'Checked Out History' },
                { value: '', label: 'All Statuses' },
              ]}
              value={checkedOutFilter}
              onChange={(e) => setCheckedOutFilter(e.target.value)}
            />
          </div>

          {/* Visits Table */}
          <Card className="!p-0 overflow-hidden">
            {visitsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : visits.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-gray-300">No visit records found</p>
                <p className="text-xs mt-1">Try adjusting filters or click "New Check-in" above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Visitor / Group</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Headcount</th>
                      <th className="py-3 px-4">Check-in Time</th>
                      <th className="py-3 px-4">Pass QR Code</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {visits.map((visit) => {
                      const leader = visit.visitors?.[0]
                      const name = leader?.full_name || visit.school_name || visit.purpose || 'Walk-in Visitor'
                      return (
                        <tr key={visit.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-500/20">
                                {getInitials(name)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-200 truncate">{name}</p>
                                {leader?.phone && <p className="text-[11px] text-gray-500">{leader.phone}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 capitalize">
                            <Badge variant={getVisitTypeBadge(visit.visit_type)}>{visit.visit_type}</Badge>
                          </td>
                          <td className="py-3 px-4 font-semibold text-gray-200">
                            {visit.total_visitors} <span className="text-xs text-gray-500 font-normal">pers.</span>
                          </td>
                          <td className="py-3 px-4 text-xs text-gray-400">
                            {visit.check_in_time || formatDate(visit.visit_date)}
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs text-teal-300 font-mono bg-teal-950/60 border border-teal-800/50 px-2 py-0.5 rounded">
                              {visit.qr_code || 'N/A'}
                            </code>
                          </td>
                          <td className="py-3 px-4">
                            {visit.is_checked_out ? (
                              <Badge variant="gray">Checked Out</Badge>
                            ) : (
                              <Badge variant="green" className="animate-pulse">
                                On-Site
                              </Badge>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                title="Print Visitor Pass"
                                onClick={() => setPassModalVisit(visit)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-teal-300 hover:bg-gray-800 transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {!visit.is_checked_out && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDirectCheckOut(visit.id)}
                                  className="text-xs py-1 px-2.5 flex items-center gap-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                                >
                                  <LogOut className="w-3 h-3" />
                                  Check Out
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 2: VISITOR DIRECTORY ───────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800 flex items-center gap-3">
            <Input
              placeholder="Search directory by name, phone, email, or ID number..."
              leftIcon={<Search className="w-4 h-4 text-gray-400" />}
              value={visitorsQuery}
              onChange={(e) => setVisitorsQuery(e.target.value)}
              className="max-w-md"
            />
          </div>

          <Card className="!p-0 overflow-hidden">
            {visitorsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : visitors.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-gray-300">No visitors found in directory</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Visitor Name</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Contact Phone</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Registered Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {visitors.map((visitor) => (
                      <tr key={visitor.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-medium text-gray-100 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-teal-600/30 text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                            {getInitials(visitor.full_name)}
                          </div>
                          <span>{visitor.full_name}</span>
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <Badge variant="teal">{visitor.visitor_type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">{visitor.phone || '—'}</td>
                        <td className="py-3 px-4 text-xs text-gray-400">{visitor.email || '—'}</td>
                        <td className="py-3 px-4 text-xs text-gray-400">{formatDate(visitor.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteVisitor(visitor.id)}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                            title="Delete visitor record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 3: CHECK-IN FORM ───────────────────────────────────────────────── */}
      {activeTab === 'checkin' && (
        <CheckInFormWidget
          onSuccess={(visit) => {
            setActiveTab('visits')
            setPassModalVisit(visit)
          }}
        />
      )}

      {/* ── MODAL 1: PRINT VISITOR PASS ────────────────────────────────────────── */}
      {passModalVisit && (
        <Modal
          open={!!passModalVisit}
          onClose={() => setPassModalVisit(null)}
          title="Visitor Admission Pass"
          description="Official cultural centre entry receipt and badge"
          size="md"
        >
          <div className="space-y-6">
            <div
              id="printable-pass"
              className="p-6 rounded-2xl bg-gradient-to-br from-gray-900 via-gray-950 to-teal-950 border-2 border-teal-500/40 space-y-6 text-center relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2 text-left">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center font-bold text-white text-xs">
                    CF
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base leading-none">CultureFlow</h3>
                    <p className="text-[10px] text-teal-400">Cultural Centre Admission Pass</p>
                  </div>
                </div>
                <Badge variant="teal" className="capitalize">
                  {passModalVisit.visit_type}
                </Badge>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Visitor / Leader</p>
                <h2 className="text-xl font-bold text-white">
                  {passModalVisit.visitors?.[0]?.full_name || passModalVisit.school_name || 'Walk-in Guest'}
                </h2>
                <p className="text-xs text-teal-300 font-medium">
                  Total Attendees: {passModalVisit.total_visitors} person(s)
                </p>
              </div>

              {/* Visual Simulated QR Code Box */}
              <div className="my-4 flex flex-col items-center justify-center p-4 bg-white/5 border border-teal-500/20 rounded-xl space-y-2">
                <QrCode className="w-24 h-24 text-teal-300" />
                <code className="text-xs font-mono font-bold tracking-wider text-teal-200">
                  {passModalVisit.qr_code}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-2 text-left text-xs bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                <div>
                  <span className="text-gray-500 block text-[10px]">ENTRY DATE</span>
                  <span className="font-semibold text-gray-200">{formatDate(passModalVisit.visit_date)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">CHECK-IN TIME</span>
                  <span className="font-semibold text-gray-200">{passModalVisit.check_in_time || 'Just now'}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setPassModalVisit(null)}>
                Close
              </Button>
              <Button onClick={() => window.print()} className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Admission Pass
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── MODAL 2: QUICK QR CHECK-OUT ────────────────────────────────────────── */}
      <Modal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Quick QR Check-out"
        description="Scan or enter the visitor pass QR code token to complete check-out."
        size="sm"
      >
        <form onSubmit={handleQrCheckOut} className="space-y-4">
          <Input
            label="QR Pass Token Code"
            placeholder="e.g. CF-VISIT-A1B2C3D4"
            value={qrInput}
            onChange={(e) => setQrInput(e.target.value)}
            leftIcon={<QrCode className="w-4 h-4" />}
            autoFocus
          />

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setQrModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={qrLoading} className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              Check Out Visitor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ── SUB-COMPONENT: CHECK-IN FORM WIDGET ────────────────────────────────────────
function CheckInFormWidget({ onSuccess }: { onSuccess: (visit: Visit) => void }) {
  const [loading, setLoading] = useState(false)
  const [visitType, setVisitType] = useState<VisitType>('individual')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckInFormValues>({
    resolver: zodResolver(checkInSchema),
    defaultValues: {
      visit_type: 'individual',
      visitor_type: 'individual',
      num_students: 0,
      num_teachers: 0,
      num_adults: 1,
    },
  })

  const handleTypeChange = (type: VisitType) => {
    setVisitType(type)
    setValue('visit_type', type)
    if (type === 'school') {
      setValue('visitor_type', 'student')
    } else if (type === 'individual') {
      setValue('visitor_type', 'individual')
    }
  }

  const onSubmit = async (values: CheckInFormValues) => {
    setLoading(true)
    try {
      const payload: CheckInVisitData = {
        visit_type: values.visit_type,
        visitor_data: {
          full_name: values.full_name,
          phone: values.phone || null,
          email: values.email || null,
          id_number: values.id_number || null,
          visitor_type: values.visitor_type,
        },
        num_students: values.num_students,
        num_teachers: values.num_teachers,
        num_adults: values.num_adults,
        purpose: values.purpose || null,
        notes: values.notes || null,
      }

      const createdVisit = await checkInVisit(payload)
      toast.success('Visitor successfully checked in!')
      onSuccess(createdVisit)
    } catch (err: unknown) {
      toast.error('Check-in failed. Please verify form details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-teal-400" />
          Visitor Admission & Check-in
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Complete check-in details to issue a digital pass and QR code token.
        </p>
      </div>

      {/* Visit Type Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <TypeCard
          selected={visitType === 'individual'}
          onClick={() => handleTypeChange('individual')}
          title="Individual / Family"
          desc="Single or family walk-in"
          icon={Users}
        />
        <TypeCard
          selected={visitType === 'school'}
          onClick={() => handleTypeChange('school')}
          title="School Visit"
          desc="Educational group tour"
          icon={School}
        />
        <TypeCard
          selected={visitType === 'group'}
          onClick={() => handleTypeChange('group')}
          title="General Group"
          desc="Private or tourist group"
          icon={Building2}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Lead Visitor / Contact Name"
            id="full_name"
            placeholder="e.g. John Doe or Teacher Name"
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <Input
            label="Phone Number"
            id="phone"
            placeholder="e.g. +263 77 123 4567"
            leftIcon={<Phone className="w-4 h-4" />}
            {...register('phone')}
          />

          <Input
            label="Email Address"
            id="email"
            placeholder="e.g. contact@school.ac.zw"
            leftIcon={<Mail className="w-4 h-4" />}
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="ID / Passport Number (Optional)"
            id="id_number"
            placeholder="Identification number"
            {...register('id_number')}
          />
        </div>

        {visitType !== 'individual' && (
          <div className="p-4 bg-gray-800/40 rounded-xl border border-gray-700/60 space-y-3">
            <p className="text-xs font-semibold text-teal-300 uppercase tracking-wide">
              Group Attendee Counts
            </p>
            <div className="grid grid-cols-3 gap-3">
              <Input
                label="Students"
                type="number"
                id="num_students"
                {...register('num_students', { valueAsNumber: true })}
              />
              <Input
                label="Teachers"
                type="number"
                id="num_teachers"
                {...register('num_teachers', { valueAsNumber: true })}
              />
              <Input
                label="Adults / Chaperones"
                type="number"
                id="num_adults"
                {...register('num_adults', { valueAsNumber: true })}
              />
            </div>
          </div>
        )}

        <Input
          label="Purpose of Visit"
          id="purpose"
          placeholder="e.g. General Exhibition Tour, Educational Workshop"
          {...register('purpose')}
        />

        <div className="flex justify-end pt-4">
          <Button type="submit" loading={loading} className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Complete Check-in & Issue Pass
          </Button>
        </div>
      </form>
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        active
          ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className="ml-1 text-[11px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-bold">
          {count}
        </span>
      )}
    </button>
  )
}

function TypeCard({
  selected,
  onClick,
  title,
  desc,
  icon: Icon,
}: {
  selected: boolean
  onClick: () => void
  title: string
  desc: string
  icon: React.ElementType
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between',
        selected
          ? 'bg-teal-950/40 border-teal-500 text-teal-200 ring-1 ring-teal-500/50'
          : 'bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-700'
      )}
    >
      <Icon className={cn('w-5 h-5 mb-2', selected ? 'text-teal-400' : 'text-gray-500')} />
      <div>
        <p className="text-xs font-bold text-gray-200">{title}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
      </div>
    </button>
  )
}

function getVisitTypeBadge(type: VisitType) {
  switch (type) {
    case 'individual':
      return 'teal'
    case 'school':
      return 'amber'
    case 'group':
      return 'purple'
    case 'vip':
      return 'green'
    default:
      return 'gray'
  }
}
