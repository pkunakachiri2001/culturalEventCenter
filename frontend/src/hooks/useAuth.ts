/**
 * CultureFlow — Auth Hook
 */

import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, logout } = useAuthStore()

  function hasRole(...roles: UserRole[]): boolean {
    if (!user) return false
    return roles.includes(user.role)
  }

  function hasAnyRole(...roles: UserRole[]): boolean {
    return hasRole(...roles)
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    hasRole,
    hasAnyRole,
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isReceptionist: user?.role === 'receptionist',
    isFinanceOfficer: user?.role === 'finance_officer',
    isTourGuide: user?.role === 'tour_guide',
  }
}
