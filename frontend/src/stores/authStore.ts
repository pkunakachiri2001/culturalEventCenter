/**
 * CultureFlow — Auth Store (Zustand)
 * Persisted to localStorage. Manages user session and token lifecycle.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginCredentials, AuthTokens } from '@/types'
import api from '@/services/api'

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
  updateProfile: (data: { full_name: string; avatar_url?: string | null }) => Promise<void>
  changePassword: (data: { old_password: string; new_password: string }) => Promise<void>
  setTokens: (tokens: AuthTokens) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (credentials) => {
        set({ isLoading: true })
        try {
          // FastAPI OAuth2 form format (application/x-www-form-urlencoded)
          const formData = new URLSearchParams()
          formData.append('username', credentials.email)
          formData.append('password', credentials.password)

          const { data: tokens } = await api.post<AuthTokens>('/api/auth/login', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          })

          localStorage.setItem('access_token', tokens.access_token)
          localStorage.setItem('refresh_token', tokens.refresh_token)

          const { data: user } = await api.get<User>('/api/auth/me', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
          })

          set({
            user,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            isAuthenticated: true,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await api.post('/api/auth/logout').catch(() => {}) // fire-and-forget
        } finally {
          get().clearAuth()
        }
      },

      refreshUser: async () => {
        try {
          const { data: user } = await api.get<User>('/api/auth/me')
          set({ user })
        } catch {
          // Token may be invalid
        }
      },

      updateProfile: async (profileData) => {
        const { data: updatedUser } = await api.put<User>('/api/auth/profile', profileData)
        set({ user: updatedUser })
      },

      changePassword: async (passwordData) => {
        await api.post('/api/auth/password', passwordData)
      },

      setTokens: (tokens) => {
        localStorage.setItem('access_token', tokens.access_token)
        localStorage.setItem('refresh_token', tokens.refresh_token)
        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
        })
      },

      clearAuth: () => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
