/**
 * CultureFlow — Admin Panel Workspace
 * User management, RBAC role assignment, staff activation, password resets, and system audit log viewer.
 */

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  ShieldCheck,
  UserPlus,
  Users,
  KeyRound,
  Search,
  Lock,
  Mail,
  User as UserIcon,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Edit,
} from 'lucide-react'
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Skeleton,
} from '@/components/ui'
import {
  listUsers,
  createUser,
  updateUser,
  resetPassword,
  listAuditLogs,
  type AuditLog,
  type CreateUserData,
  type ListUsersParams,
} from '@/services/admin'
import type { User, UserRole } from '@/types'
import { formatDateTime, formatDate, getInitials, cn } from '@/utils'

const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  full_name: z.string().min(2, 'Full name is required'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'receptionist', 'finance_officer', 'tour_guide']),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
type UserFormValues = z.infer<typeof userSchema>

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users')

  // Staff Users State
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('')

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [auditLoading, setAuditLoading] = useState(true)

  // Modals State
  const [createModalOpen, setCreateModalOpen] = useState(false)

  const [resetModalUser, setResetModalUser] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // ── Load Users ──────────────────────────────────────────────────────────────
  const loadUsers = async () => {
    setUsersLoading(true)
    try {
      const params: ListUsersParams = {
        query: query || undefined,
        role: (roleFilter as UserRole) || undefined,
        page: 1,
        page_size: 50,
      }
      const data = await listUsers(params)
      setUsers(data.items)
    } catch {
      toast.error('Failed to load staff users.')
    } finally {
      setUsersLoading(false)
    }
  }

  // ── Load Audit Logs ─────────────────────────────────────────────────────────
  const loadAudit = async () => {
    setAuditLoading(true)
    try {
      const data = await listAuditLogs({ page: 1, page_size: 50 })
      setAuditLogs(data.items)
    } catch {
      toast.error('Failed to load audit logs.')
    } finally {
      setAuditLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'users') loadUsers()
    if (activeTab === 'audit') loadAudit()
  }, [activeTab, query, roleFilter])

  // ── Toggle User Active Status ────────────────────────────────────────────────
  const handleToggleActive = async (user: User) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active })
      toast.success(`User ${user.full_name} ${!user.is_active ? 'activated' : 'deactivated'}.`)
      loadUsers()
    } catch {
      toast.error('Failed to update user status.')
    }
  }

  // ── Handle Password Reset ──────────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetModalUser || newPassword.length < 8) return
    setResetLoading(true)
    try {
      await resetPassword(resetModalUser.id, newPassword)
      toast.success(`Password reset for ${resetModalUser.full_name}!`)
      setResetModalUser(null)
      setNewPassword('')
    } catch {
      toast.error('Password reset failed.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-teal-400" />
            Admin Panel & Governance
          </h1>
          <p className="page-subtitle font-normal">Manage staff accounts, roles, access permissions, and audit trails.</p>
        </div>

        <Button onClick={() => setCreateModalOpen(true)} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Create Staff Account
        </Button>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            activeTab === 'users'
              ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
              : 'text-gray-400 hover:text-gray-200'
          )}
        >
          <Users className="w-4 h-4" />
          Staff User Management ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
            activeTab === 'audit'
              ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
              : 'text-gray-400 hover:text-gray-200'
          )}
        >
          <Activity className="w-4 h-4" />
          System Audit Logs ({auditLogs.length})
        </button>
      </div>

      {/* ── TAB 1: USERS MANAGEMENT ───────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search staff name or email..."
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Select
              options={[
                { value: '', label: 'All Roles' },
                { value: 'admin', label: 'Administrator' },
                { value: 'manager', label: 'Manager' },
                { value: 'receptionist', label: 'Receptionist' },
                { value: 'finance_officer', label: 'Finance Officer' },
                { value: 'tour_guide', label: 'Tour Guide' },
              ]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            />
          </div>

          <Card className="!p-0 overflow-hidden">
            {usersLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-gray-300">No staff user accounts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joined Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-semibold text-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-600/20 text-teal-400 font-bold flex items-center justify-center text-xs">
                              {getInitials(u.full_name)}
                            </div>
                            <div>
                              <p className="font-bold text-gray-100">{u.full_name}</p>
                              <p className="text-xs text-gray-400 font-normal">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={getRoleBadge(u.role)} className="capitalize font-mono">
                            {u.role.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={u.is_active ? 'green' : 'red'}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">{formatDate(u.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setResetModalUser(u)
                                setNewPassword('')
                              }}
                              className="p-1.5 text-gray-400 hover:text-amber-300 rounded transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(u)}
                              className={cn(
                                'p-1.5 rounded transition-colors',
                                u.is_active ? 'text-gray-400 hover:text-red-400' : 'text-gray-400 hover:text-emerald-400'
                              )}
                              title={u.is_active ? 'Deactivate User' : 'Activate User'}
                            >
                              {u.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
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
        </div>
      )}

      {/* ── TAB 2: SYSTEM AUDIT LOGS ─────────────────────────────────────────── */}
      {activeTab === 'audit' && (
        <Card className="!p-0 overflow-hidden">
          {auditLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-300">No system audit logs found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-800/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Entity</th>
                    <th className="py-3 px-4">Entity ID</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-teal-300">{log.action}</td>
                      <td className="py-3 px-4 font-semibold text-gray-200">{log.entity_type || 'System'}</td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-500 max-w-[120px] truncate">
                        {log.entity_id || '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-gray-400 max-w-xs truncate">
                        {log.changes ? JSON.stringify(log.changes) : '—'}
                      </td>
                      <td className="py-3 px-4 text-gray-400">{formatDateTime(log.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── MODAL 1: CREATE STAFF USER ────────────────────────────────────────── */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Staff Account"
        description="Register a new Cultural Centre staff member."
        size="md"
      >
        <UserFormModal
          onSuccess={() => {
            setCreateModalOpen(false)
            loadUsers()
          }}
        />
      </Modal>

      {/* ── MODAL 2: RESET PASSWORD ──────────────────────────────────────────── */}
      {resetModalUser && (
        <Modal
          open={!!resetModalUser}
          onClose={() => setResetModalUser(null)}
          title="Reset Staff Password"
          description={`Enter a new password for ${resetModalUser.full_name} (${resetModalUser.email})`}
          size="sm"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <Input
              label="New Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setResetModalUser(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={resetLoading}>
                Set New Password
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── SUB-COMPONENT: USER FORM MODAL ─────────────────────────────────────────────
function UserFormModal({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'receptionist',
    },
  })

  const onSubmit = async (values: UserFormValues) => {
    setLoading(true)
    try {
      await createUser(values as CreateUserData)
      toast.success('Staff user created successfully!')
      onSuccess()
    } catch {
      toast.error('Failed to create staff user.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Full Name"
        id="full_name"
        placeholder="e.g. Tendai Moyo"
        error={errors.full_name?.message}
        {...register('full_name')}
      />

      <Input
        label="Email Address"
        type="email"
        id="email"
        placeholder="e.g. tendai@culturalcenter.org"
        error={errors.email?.message}
        {...register('email')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Select
          label="Role & Access Permission"
          id="role"
          options={[
            { value: 'receptionist', label: 'Receptionist (Visits & Check-in)' },
            { value: 'finance_officer', label: 'Finance Officer (POS & Receipts)' },
            { value: 'manager', label: 'Manager (Bookings & Reports)' },
            { value: 'admin', label: 'Administrator (Full Access)' },
            { value: 'tour_guide', label: 'Tour Guide' },
          ]}
          {...register('role')}
        />
        <Input
          label="Initial Password"
          type="password"
          id="password"
          placeholder="Min 8 characters"
          error={errors.password?.message}
          {...register('password')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
        <Button type="submit" loading={loading}>
          Create Account
        </Button>
      </div>
    </form>
  )
}

function getRoleBadge(role: UserRole) {
  switch (role) {
    case 'admin':
      return 'purple'
    case 'manager':
      return 'teal'
    case 'finance_officer':
      return 'green'
    case 'receptionist':
      return 'amber'
    default:
      return 'gray'
  }
}
