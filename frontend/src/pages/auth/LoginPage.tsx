/**
 * CultureFlow — Login Page
 * Real implementation comes in Module 2 (Auth).
 * This scaffold renders a beautiful branded login form.
 */

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { Button, Input, Alert } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { cn } from '@/utils'

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    try {
      await login(data)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      setError(msg ?? 'Invalid email or password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex">
      {/* ── Branding Panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-teal-950 via-gray-900 to-gray-950 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {/* Decorative grid */}
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Glowing orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-400/10 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">CF</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Nyatsime Heritage<br/>and Culture Center</h1>
              <p className="text-teal-400 text-sm">Cultural Centre Management</p>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Manage your<br />
            <span className="text-teal-400">cultural centre</span><br />
            with confidence.
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Replace paper books, handwritten diaries, and spreadsheets 
            with one modern digital system.
          </p>

          <div className="mt-12 grid grid-cols-2 gap-4">
            {[
              { label: 'Visitors Tracked', value: '10,000+' },
              { label: 'Schools Registered', value: '500+' },
              { label: 'Records Digitized', value: '50,000+' },
              { label: 'Years of Data', value: '20+' },
            ].map((stat) => (
              <div key={stat.label} className="glass rounded-xl p-4">
                <p className="text-2xl font-bold text-teal-300">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Login Form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <span className="text-white font-bold">CF</span>
            </div>
            <div>
              <p className="font-bold text-gray-100">Nyatsime Heritage</p>
              <p className="text-xs text-gray-500">Cultural Centre Management</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-100 mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-8">Sign in to your account to continue.</p>

          {error && (
            <Alert variant="error" className="mb-6">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="Email address"
              type="email"
              id="email"
              autoComplete="email"
              placeholder="admin@nyatsime.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type={showPass ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              leftIcon={<Lock className="w-4 h-4" />}
              rightIcon={
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="hover:text-gray-300 transition-colors"
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full mt-2"
              id="login-btn"
            >
              Sign in
            </Button>
          </form>

          <p className="text-xs text-gray-600 text-center mt-8">
            Nyatsime Heritage v1.0 — Internal use only
          </p>
        </div>
      </div>
    </div>
  )
}
