/**
 * CultureFlow — Mobile Bottom Navigation
 * Shown on small screens instead of the sidebar.
 */

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, CalendarDays, FileText, ScanLine,
} from 'lucide-react'
import { cn } from '@/utils'
import { useAuthStore } from '@/stores/authStore'
import type { UserRole } from '@/types'

const MOBILE_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin','manager','receptionist','finance_officer','tour_guide'] as UserRole[] },
  { label: 'Visitors', path: '/visitors', icon: Users, roles: ['admin','manager','receptionist','tour_guide'] as UserRole[] },
  { label: 'Bookings', path: '/bookings', icon: CalendarDays, roles: ['admin','manager','receptionist','tour_guide'] as UserRole[] },
  { label: 'Reports', path: '/reports', icon: FileText, roles: ['admin','manager','finance_officer'] as UserRole[] },
  { label: 'Digitize', path: '/digitize', icon: ScanLine, roles: ['admin','manager','receptionist'] as UserRole[] },
]

export default function MobileNav() {
  const { user } = useAuthStore()

  const items = MOBILE_NAV.filter(
    (item) => user && item.roles.includes(user.role)
  ).slice(0, 5)

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-gray-900/95 backdrop-blur border-t border-gray-800 safe-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-xl min-w-[56px]',
                  'text-gray-500 transition-all duration-150',
                  isActive && 'text-teal-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    'w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-150',
                    isActive && 'bg-teal-500/15'
                  )}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
