import { useState } from 'react'
import { User as UserIcon, Mail, Shield, Clock, Key, Save, Lock } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import { Card, Button, Input, Alert } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/stores/authStore'
import { getRoleLabel, formatDateTime, getInitials } from '@/utils'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
})
type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z.object({
  old_password: z.string().min(6, 'Password must be at least 6 characters'),
  new_password: z.string().min(6, 'New password must be at least 6 characters'),
  confirm_password: z.string().min(6, 'Confirm password must be at least 6 characters'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})
type PasswordForm = z.infer<typeof passwordSchema>

export default function ProfilePage() {
  const { user } = useAuth()
  const { updateProfile, changePassword } = useAuthStore()
  
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name ?? '',
    },
  })

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  if (!user) return null

  const onUpdateProfile = async (data: ProfileForm) => {
    setProfileLoading(true)
    try {
      await updateProfile({ full_name: data.full_name })
      toast.success('Profile updated successfully!')
    } catch (err: unknown) {
      toast.error('Failed to update profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  const onChangePassword = async (data: PasswordForm) => {
    setPasswordError(null)
    setPasswordLoading(true)
    try {
      await changePassword({
        old_password: data.old_password,
        new_password: data.new_password,
      })
      toast.success('Password changed successfully!')
      resetPasswordForm()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setPasswordError(msg ?? 'Failed to change password. Check your current password.')
    } finally {
      setPasswordLoading(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-4xl space-y-8">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <UserIcon className="w-6 h-6 text-teal-400" />
            My Profile
          </h1>
          <p className="page-subtitle">Manage your account details and security settings.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Overview */}
        <Card className="lg:col-span-1 flex flex-col items-center text-center p-6 space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-teal-600/30 border-2 border-teal-600/40 flex items-center justify-center shrink-0">
            <span className="text-3xl font-bold text-teal-300">{getInitials(user.full_name)}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-100">{user.full_name}</h2>
            <p className="text-gray-400 text-sm mt-0.5">{getRoleLabel(user.role)}</p>
          </div>

          <div className="w-full pt-4 border-t border-gray-800 space-y-3 text-left">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={user.email} />
            <InfoRow icon={<Shield className="w-4 h-4" />} label="Role" value={getRoleLabel(user.role)} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="Last Login" value={formatDateTime(user.last_login)} />
            <InfoRow icon={<UserIcon className="w-4 h-4" />} label="Account Status" value={user.is_active ? 'Active' : 'Inactive'} />
          </div>
        </Card>

        {/* Profile Details & Password Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile Card */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Edit Account Details</h2>
            <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
              <Input
                label="Full Name"
                id="full_name"
                leftIcon={<UserIcon className="w-4 h-4" />}
                error={profileErrors.full_name?.message}
                {...registerProfile('full_name')}
              />

              <div>
                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  leftIcon={<Mail className="w-4 h-4" />}
                />
                <p className="text-xs text-gray-500 mt-1">Email address cannot be changed.</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={profileLoading} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Save Profile
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Password Card */}
          <Card>
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Change Password</h2>
            {passwordError && (
              <Alert variant="error" className="mb-4">
                {passwordError}
              </Alert>
            )}

            <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                id="old_password"
                leftIcon={<Lock className="w-4 h-4" />}
                error={passwordErrors.old_password?.message}
                {...registerPassword('old_password')}
              />

              <Input
                label="New Password"
                type="password"
                id="new_password"
                leftIcon={<Key className="w-4 h-4" />}
                error={passwordErrors.new_password?.message}
                {...registerPassword('new_password')}
              />

              <Input
                label="Confirm New Password"
                type="password"
                id="confirm_password"
                leftIcon={<Key className="w-4 h-4" />}
                error={passwordErrors.confirm_password?.message}
                {...registerPassword('confirm_password')}
              />

              <div className="flex justify-end pt-2">
                <Button type="submit" variant="secondary" loading={passwordLoading} className="flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  Update Password
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg bg-gray-800/40 border border-gray-700/50">
      <div className="text-gray-400 mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-medium text-gray-200 truncate mt-0.5">{value}</p>
      </div>
    </div>
  )
}
