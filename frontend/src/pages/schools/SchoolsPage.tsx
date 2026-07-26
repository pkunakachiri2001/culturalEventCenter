/**
 * CultureFlow — School Management Page
 * Register schools, manage contact teachers, view province records and historical visit logs.
 */

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  School as SchoolIcon,
  Plus,
  Search,
  MapPin,
  User,
  Phone,
  Mail,
  CalendarDays,
  Edit,
  Trash2,
  ExternalLink,
  BookOpen,
  LayoutGrid,
  List,
  Filter,
  CheckCircle2,
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
  Spinner,
} from '@/components/ui'
import {
  listSchools,
  createSchool,
  updateSchool,
  deleteSchool,
  getSchoolVisits,
  type CreateSchoolData,
  type ListSchoolsParams,
} from '@/services/schools'
import type { School, Visit } from '@/types'
import { formatDate, getInitials, cn } from '@/utils'

const PROVINCES = [
  'Harare',
  'Bulawayo',
  'Manicaland',
  'Mashonaland Central',
  'Mashonaland East',
  'Mashonaland West',
  'Masvingo',
  'Matabeleland North',
  'Matabeleland South',
  'Midlands',
  'Other / International',
]

const schoolSchema = z.object({
  name: z.string().min(2, 'School name is required'),
  province: z.string().optional(),
  country: z.string().default('Zimbabwe'),
  contact_teacher: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})
type SchoolFormValues = z.infer<typeof schoolSchema>

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selectedProvince, setSelectedProvince] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Modals & Drawers
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)

  const [historySchool, setHistorySchool] = useState<School | null>(null)
  const [schoolVisits, setSchoolVisits] = useState<Visit[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)

  // ── Fetch Schools ─────────────────────────────────────────────────────────────
  const loadSchools = async () => {
    setLoading(true)
    try {
      const params: ListSchoolsParams = {
        query: query || undefined,
        province: selectedProvince || undefined,
        page: 1,
        page_size: 50,
      }
      const data = await listSchools(params)
      setSchools(data.items)
      setTotal(data.total)
    } catch {
      toast.error('Failed to load schools directory.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchools()
  }, [query, selectedProvince])

  // ── Open History Drawer ───────────────────────────────────────────────────────
  const openHistory = async (school: School) => {
    setHistorySchool(school)
    setVisitsLoading(true)
    try {
      const res = await getSchoolVisits(school.id)
      setSchoolVisits(res.items)
    } catch {
      toast.error('Failed to load visit history for school.')
    } finally {
      setVisitsLoading(false)
    }
  }

  // ── Delete School Action ─────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this school record?')) return
    try {
      await deleteSchool(id)
      toast.success('School deleted successfully.')
      loadSchools()
    } catch {
      toast.error('Delete failed. Admin or Manager privileges required.')
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <SchoolIcon className="w-6 h-6 text-teal-400" />
            School Management
          </h1>
          <p className="page-subtitle">Educational partner registry, teacher contacts, and visit records.</p>
        </div>

        <Button
          onClick={() => {
            setEditingSchool(null)
            setFormModalOpen(true)
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Register New School
        </Button>
      </div>

      {/* ── Filters Bar ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
        <div className="sm:col-span-2">
          <Input
            placeholder="Search by school name, teacher, phone, or email..."
            leftIcon={<Search className="w-4 h-4 text-gray-400" />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <Select
          options={[
            { value: '', label: 'All Provinces' },
            ...PROVINCES.map((p) => ({ value: p, label: p })),
          ]}
          value={selectedProvince}
          onChange={(e) => setSelectedProvince(e.target.value)}
        />

        <div className="flex items-center justify-end gap-1 bg-gray-800/60 p-1 rounded-lg border border-gray-700/50">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium',
              viewMode === 'grid' ? 'bg-teal-600/30 text-teal-300' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
            Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-2 rounded-md transition-colors text-xs flex items-center gap-1 font-medium',
              viewMode === 'table' ? 'bg-teal-600/30 text-teal-300' : 'text-gray-400 hover:text-gray-200'
            )}
          >
            <List className="w-4 h-4" />
            Table
          </button>
        </div>
      </div>

      {/* ── Main Content Grid / Table ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-6 space-y-4">
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      ) : schools.length === 0 ? (
        <Card className="text-center py-16 text-gray-500">
          <SchoolIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-semibold text-gray-300">No schools registered yet</p>
          <p className="text-sm mt-1">Click "Register New School" to add educational partner records.</p>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <SchoolCard
              key={school.id}
              school={school}
              onEdit={() => {
                setEditingSchool(school)
                setFormModalOpen(true)
              }}
              onDelete={() => handleDelete(school.id)}
              onViewHistory={() => openHistory(school)}
            />
          ))}
        </div>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-800">
                <tr>
                  <th className="py-3 px-4">School Name</th>
                  <th className="py-3 px-4">Province</th>
                  <th className="py-3 px-4">Contact Teacher</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4">Visits</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {schools.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-100 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">
                        {getInitials(s.name)}
                      </div>
                      <span>{s.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="teal">{s.province || 'General'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-300">{s.contact_teacher || '—'}</td>
                    <td className="py-3 px-4 text-xs text-gray-400">{s.phone || '—'}</td>
                    <td className="py-3 px-4 font-semibold text-teal-300">{s.visit_count}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openHistory(s)}
                          className="p-1.5 text-gray-400 hover:text-teal-300 transition-colors"
                          title="View Visit History"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingSchool(s)
                            setFormModalOpen(true)
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
                          title="Edit School"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                          title="Delete School"
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
        </Card>
      )}

      {/* ── MODAL 1: ADD / EDIT SCHOOL ───────────────────────────────────────── */}
      <Modal
        open={formModalOpen}
        onClose={() => setFormModalOpen(false)}
        title={editingSchool ? 'Edit School Details' : 'Register New School'}
        description="Enter school contact and province information"
        size="md"
      >
        <SchoolFormModal
          editingSchool={editingSchool}
          onSuccess={() => {
            setFormModalOpen(false)
            loadSchools()
          }}
        />
      </Modal>

      {/* ── MODAL 2: SCHOOL VISIT HISTORY DRAWER ──────────────────────────────── */}
      {historySchool && (
        <Modal
          open={!!historySchool}
          onClose={() => setHistorySchool(null)}
          title={`${historySchool.name} — Visit History`}
          description={`Province: ${historySchool.province || 'General'} | Total Visits Recorded: ${historySchool.visit_count}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs bg-gray-900 p-3 rounded-xl border border-gray-800">
              <div>
                <span className="text-gray-500 block">Contact Teacher:</span>
                <span className="font-semibold text-gray-200">{historySchool.contact_teacher || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Phone / Email:</span>
                <span className="font-semibold text-gray-200">
                  {historySchool.phone || historySchool.email || 'N/A'}
                </span>
              </div>
            </div>

            <div className="divide-y divide-gray-800/60 max-h-80 overflow-y-auto pr-1">
              {visitsLoading ? (
                <div className="py-8 text-center"><Spinner /></div>
              ) : schoolVisits.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No logged visits recorded for this school yet.
                </div>
              ) : (
                schoolVisits.map((v) => (
                  <div key={v.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-gray-200">{v.purpose || 'School Educational Tour'}</p>
                      <p className="text-gray-500 mt-0.5">
                        Date: {formatDate(v.visit_date)} | Entry: {v.check_in_time || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-teal-300">
                        {v.num_students} Students / {v.num_teachers} Teachers
                      </p>
                      <span className="text-[10px] text-gray-500 font-mono">{v.qr_code}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" onClick={() => setHistorySchool(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SUB-COMPONENT: SCHOOL CARD ─────────────────────────────────────────────────
function SchoolCard({
  school,
  onEdit,
  onDelete,
  onViewHistory,
}: {
  school: School
  onEdit: () => void
  onDelete: () => void
  onViewHistory: () => void
}) {
  return (
    <Card hover className="flex flex-col justify-between p-5 space-y-4 border border-gray-800 hover:border-teal-500/40">
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center font-bold text-sm shrink-0 border border-teal-500/20">
              {getInitials(school.name)}
            </div>
            <div>
              <h3 className="font-bold text-gray-100 text-base leading-snug">{school.name}</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-teal-400 shrink-0" />
                {school.province || 'General Province'}
              </p>
            </div>
          </div>

          <Badge variant="teal" className="shrink-0 font-bold">
            {school.visit_count} visits
          </Badge>
        </div>

        <div className="space-y-2 pt-3 border-t border-gray-800/80 text-xs text-gray-400">
          {school.contact_teacher && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{school.contact_teacher}</span>
            </div>
          )}
          {school.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span>{school.phone}</span>
            </div>
          )}
          {school.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{school.email}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs">
        <button
          onClick={onViewHistory}
          className="text-teal-400 hover:underline flex items-center gap-1 font-medium"
        >
          <BookOpen className="w-3.5 h-3.5" />
          History Log
        </button>

        <div className="flex items-center gap-2">
          <button onClick={onEdit} className="p-1.5 text-gray-400 hover:text-gray-200">
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-500 hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  )
}

// ── SUB-COMPONENT: SCHOOL FORM MODAL ───────────────────────────────────────────
function SchoolFormModal({
  editingSchool,
  onSuccess,
}: {
  editingSchool: School | null
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchoolFormValues>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: editingSchool?.name ?? '',
      province: editingSchool?.province ?? 'Harare',
      country: editingSchool?.country ?? 'Zimbabwe',
      contact_teacher: editingSchool?.contact_teacher ?? '',
      phone: editingSchool?.phone ?? '',
      email: editingSchool?.email ?? '',
      address: editingSchool?.address ?? '',
      notes: editingSchool?.notes ?? '',
    },
  })

  const onSubmit = async (values: SchoolFormValues) => {
    setLoading(true)
    try {
      if (editingSchool) {
        await updateSchool(editingSchool.id, values)
        toast.success('School updated successfully!')
      } else {
        await createSchool(values as CreateSchoolData)
        toast.success('New school registered successfully!')
      }
      onSuccess()
    } catch {
      toast.error('Failed to save school details.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="School Name"
        id="name"
        placeholder="e.g. Prince Edward School"
        error={errors.name?.message}
        {...register('name')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Province"
          id="province"
          options={PROVINCES.map((p) => ({ value: p, label: p }))}
          {...register('province')}
        />
        <Input
          label="Country"
          id="country"
          defaultValue="Zimbabwe"
          {...register('country')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Contact Teacher / Coordinator"
          id="contact_teacher"
          placeholder="e.g. Mr. M. Moyo"
          {...register('contact_teacher')}
        />
        <Input
          label="Phone Number"
          id="phone"
          placeholder="e.g. +263 77 000 0000"
          {...register('phone')}
        />
      </div>

      <Input
        label="Email Address"
        id="email"
        type="email"
        placeholder="e.g. admin@school.ac.zw"
        error={errors.email?.message}
        {...register('email')}
      />

      <Input
        label="Physical Address"
        id="address"
        placeholder="School address details"
        {...register('address')}
      />

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
        <Button type="submit" loading={loading}>
          {editingSchool ? 'Save Changes' : 'Register School'}
        </Button>
      </div>
    </form>
  )
}
