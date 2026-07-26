/**
 * CultureFlow — Root Application Router
 */

import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Spinner } from '@/components/ui'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'

// ── Eager-loaded pages ────────────────────────────────────────────────────────
import LoginPage from '@/pages/auth/LoginPage'

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('@/pages/dashboard/DashboardPage'))
const VisitorsPage  = lazy(() => import('@/pages/visitors/VisitorsPage'))
const SchoolsPage   = lazy(() => import('@/pages/schools/SchoolsPage'))
const BookingsPage  = lazy(() => import('@/pages/bookings/BookingsPage'))
const FinancePage   = lazy(() => import('@/pages/finance/FinancePage'))
const ReportsPage   = lazy(() => import('@/pages/reports/ReportsPage'))
const DigitizePage  = lazy(() => import('@/pages/digitize/DigitizePage'))
const SearchPage    = lazy(() => import('@/pages/search/SearchPage'))
const AdminPage     = lazy(() => import('@/pages/admin/AdminPage'))
const ProfilePage   = lazy(() => import('@/pages/profile/ProfilePage'))

function PageLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          },
          success: { iconTheme: { primary: '#14b8a6', secondary: '#f0fdfa' } },
          error:   { iconTheme: { primary: '#f87171', secondary: '#fff1f2' } },
        }}
      />

      <Routes>
        {/* ── Public ─────────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Protected — App Shell ───────────────────────────────── */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={
            <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
          } />

          <Route path="visitors/*" element={
            <Suspense fallback={<PageLoader />}><VisitorsPage /></Suspense>
          } />

          <Route path="schools/*" element={
            <Suspense fallback={<PageLoader />}><SchoolsPage /></Suspense>
          } />

          <Route path="bookings/*" element={
            <Suspense fallback={<PageLoader />}><BookingsPage /></Suspense>
          } />

          <Route path="finance/*" element={
            <Suspense fallback={<PageLoader />}><FinancePage /></Suspense>
          } />

          <Route path="reports/*" element={
            <Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>
          } />

          <Route path="digitize/*" element={
            <Suspense fallback={<PageLoader />}><DigitizePage /></Suspense>
          } />

          <Route path="search" element={
            <Suspense fallback={<PageLoader />}><SearchPage /></Suspense>
          } />

          <Route path="admin/*" element={
            <Suspense fallback={<PageLoader />}><AdminPage /></Suspense>
          } />

          <Route path="profile" element={
            <Suspense fallback={<PageLoader />}><ProfilePage /></Suspense>
          } />
        </Route>

        {/* ── 404 ─────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
