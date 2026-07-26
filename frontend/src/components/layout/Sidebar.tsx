/**
 * CultureFlow — Sidebar Navigation
 */

import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Users, School, CalendarDays, FileText,
  DollarSign, ScanLine, Search, Settings, X, LogOut,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { cn, getInitials, getRoleLabel } from '@/utils'
import type { UserRole } from '@/types'

interface NavItem {
  label: string
  path: string
  icon: React.ElementType
  roles: UserRole[]
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ['admin', 'manager', 'receptionist', 'finance_officer', 'tour_guide'],
  },
  {
    label: 'Visitors',
    path: '/visitors',
    icon: Users,
    roles: ['admin', 'manager', 'receptionist', 'tour_guide'],
  },
  {
    label: 'Schools',
    path: '/schools',
    icon: School,
    roles: ['admin', 'manager', 'receptionist'],
  },
  {
    label: 'Bookings',
    path: '/bookings',
    icon: CalendarDays,
    roles: ['admin', 'manager', 'receptionist', 'tour_guide'],
  },
  {
    label: 'Finance',
    path: '/finance',
    icon: DollarSign,
    roles: ['admin', 'manager', 'finance_officer'],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: FileText,
    roles: ['admin', 'manager', 'finance_officer'],
  },
  {
    label: 'Digitize',
    path: '/digitize',
    icon: ScanLine,
    roles: ['admin', 'manager', 'receptionist'],
  },
  {
    label: 'Search',
    path: '/search',
    icon: Search,
    roles: ['admin', 'manager', 'receptionist', 'finance_officer', 'tour_guide'],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role)
  )

  const sidebarContent = (
    <aside
      className={cn(
        'flex flex-col h-full bg-gray-900 border-r border-gray-800 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-gray-800 min-h-[65px]">
        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">CF</span>
        </div>
        {!collapsed && (
          <div className="animate-fade-in overflow-hidden">
            <p className="font-bold text-gray-100 text-sm leading-none">CultureFlow</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">Cultural Centre</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="ml-auto text-gray-500 hover:text-gray-300 transition-colors hidden lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          onClick={onMobileClose}
          className="ml-auto text-gray-500 hover:text-gray-300 transition-colors lg:hidden"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Nav Links ─────────────────────────────────────────────── */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname.startsWith(item.path)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={cn(
                'sidebar-link',
                isActive && 'active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="icon" />
              {!collapsed && (
                <span className="animate-fade-in truncate">{item.label}</span>
              )}
            </NavLink>
          )
        })}

        {/* Admin section */}
        {user?.role === 'admin' && (
          <>
            <div className={cn(
              'pt-4 pb-1',
              !collapsed && 'px-3'
            )}>
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-widest text-gray-600 font-medium">
                  Admin
                </p>
              )}
            </div>
            <NavLink
              to="/admin"
              onClick={onMobileClose}
              className={cn(
                'sidebar-link',
                location.pathname.startsWith('/admin') && 'active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? 'Admin' : undefined}
            >
              <Settings className="icon" />
              {!collapsed && <span className="animate-fade-in">Admin Panel</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* ── User Profile ──────────────────────────────────────────── */}
      <div className="p-3 border-t border-gray-800">
        <div className={cn(
          'flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800 transition-colors cursor-default',
          collapsed && 'justify-center'
        )}>
          <div className="w-8 h-8 rounded-full bg-teal-600/30 border border-teal-600/40 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-teal-300">
              {user ? getInitials(user.full_name) : '?'}
            </span>
          </div>
          {!collapsed && user && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-gray-200 truncate">{user.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{getRoleLabel(user.role)}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout()}
              className="text-gray-500 hover:text-red-400 transition-colors ml-auto shrink-0"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">{sidebarContent}</div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onMobileClose}
          />
          <div className="relative z-10 animate-slide-in">{sidebarContent}</div>
        </div>
      )}
    </>
  )
}
