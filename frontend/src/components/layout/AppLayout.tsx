/**
 * CultureFlow — App Shell Layout
 * Wraps authenticated pages with sidebar + header + main content area.
 */

import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/visitors':   'Visitor Management',
  '/schools':    'School Management',
  '/bookings':   'Booking Management',
  '/finance':    'Finance',
  '/reports':    'Reports',
  '/digitize':   'AI Digitization',
  '/search':     'Global Search',
  '/admin':      'Admin Panel',
  '/profile':    'My Profile',
}

export default function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    location.pathname.startsWith(path)
  )?.[1]

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div className="main-content">
        <Header onMenuClick={() => setMobileOpen(true)} title={title} />
        <main className="page-container pb-20 lg:pb-6">
          <Outlet />
        </main>
      </div>

      <MobileNav />
    </div>
  )
}
