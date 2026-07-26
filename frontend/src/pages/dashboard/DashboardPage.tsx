/**
 * CultureFlow — Production Dashboard Page
 * Real-time metrics, 7-day trendlines, recent activities, and upcoming bookings.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  School,
  CalendarDays,
  DollarSign,
  ScanLine,
  TrendingUp,
  Clock,
  RefreshCw,
  PlusCircle,
  FileText,
  Building,
  ArrowRight,
  Activity,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Card, Skeleton, Button, Badge, Alert } from '@/components/ui'
import { getDashboardStats } from '@/services/dashboard'
import type { DashboardStatsResponse, TrendPoint } from '@/types'
import { formatCurrency, formatDateTime, formatDate, cn } from '@/utils'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadStats = async (isManual = false) => {
    if (isManual) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const res = await getDashboardStats()
      setData(res)
    } catch (err: unknown) {
      setError('Failed to load dashboard metrics. Ensure backend server is running.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  const statCards = [
    {
      label: "Today's Visitors",
      value: data ? data.todays_visitors.toLocaleString() : '0',
      sub: `${data ? data.monthly_visitors.toLocaleString() : 0} this month`,
      icon: Users,
      color: 'bg-teal-500/10 text-teal-400',
    },
    {
      label: "Today's Revenue",
      value: data ? formatCurrency(data.todays_revenue) : '$0.00',
      sub: `${data ? formatCurrency(data.monthly_revenue) : '$0.00'} this month`,
      icon: DollarSign,
      color: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      label: 'Upcoming Bookings',
      value: data ? data.upcoming_bookings_count.toString() : '0',
      sub: 'Approved or pending',
      icon: CalendarDays,
      color: 'bg-purple-500/10 text-purple-400',
    },
    {
      label: 'Schools Registered',
      value: data ? data.schools_registered_count.toString() : '0',
      sub: 'Active educational partners',
      icon: School,
      color: 'bg-blue-500/10 text-blue-400',
    },
    {
      label: 'Pending Digitization',
      value: data ? data.pending_digitization_count.toString() : '0',
      sub: 'Historical records to process',
      icon: ScanLine,
      color: 'bg-amber-500/10 text-amber-400',
    },
    {
      label: 'Monthly Traffic Trend',
      value: data ? `${data.monthly_visitors.toLocaleString()}` : '0',
      sub: 'Total visits recorded this month',
      icon: TrendingUp,
      color: 'bg-indigo-500/10 text-indigo-400',
    },
  ]

  return (
    <div className="animate-fade-in space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-teal-400" />
            Dashboard Overview
          </h1>
          <p className="page-subtitle">Real-time operational summary & metrics for CultureFlow.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            loading={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
            Refresh
          </Button>

          <Link to="/visitors/new">
            <Button size="sm" className="flex items-center gap-2">
              <PlusCircle className="w-4 h-4" />
              Check-in Visitor
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Dashboard Synchronization Error">
          {error}
        </Alert>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                </div>
                <Skeleton className="h-3 w-32" />
              </Card>
            ))
          : statCards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.label} className="stat-card card-hover flex flex-col justify-between p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                      <p className="text-2xl font-bold text-gray-100 mt-1">{card.value}</p>
                    </div>
                    <div className={cn('p-2.5 rounded-xl shrink-0', card.color)}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-800/80">{card.sub}</p>
                </div>
              )
            })}
      </div>

      {/* 7-Day Trend Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SparklineCard
          title="7-Day Visitor Volume"
          subtitle="Daily check-in totals over past 7 days"
          trendData={data?.visitor_trend || []}
          loading={loading}
          color="#14b8a6"
          unit="visitors"
        />

        <SparklineCard
          title="7-Day Revenue Stream"
          subtitle="Daily USD receipts collected over past 7 days"
          trendData={data?.revenue_trend || []}
          loading={loading}
          color="#10b981"
          unit="$"
        />
      </div>

      {/* Quick Action Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <QuickLinkCard
          to="/visitors/new"
          title="Register Visitor"
          desc="Individual or group walk-in check-in"
          icon={Users}
          badgeColor="bg-teal-500/10 text-teal-400"
        />
        <QuickLinkCard
          to="/digitize/upload"
          title="Digitize Historical Book"
          desc="Upload diary pages for AI OCR extraction"
          icon={FileText}
          badgeColor="bg-amber-500/10 text-amber-400"
        />
        <QuickLinkCard
          to="/schools/new"
          title="Register School"
          desc="Add new educational institution partner"
          icon={Building}
          badgeColor="bg-blue-500/10 text-blue-400"
        />
      </div>

      {/* Content Grid: Recent Activity & Upcoming Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent Activity Feed */}
        <div className="lg:col-span-3">
          <Card className="!p-0 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-400" />
                <h2 className="font-semibold text-gray-200">Recent System Activity</h2>
              </div>
              <span className="text-xs text-gray-500">Live Audit Feed</span>
            </div>

            <div className="divide-y divide-gray-800/60 flex-1">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 px-6 py-4">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))
              ) : !data?.recent_activities || data.recent_activities.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No recent audit activity recorded yet.
                </div>
              ) : (
                data.recent_activities.map((item) => (
                  <div key={item.id} className="flex items-start gap-3.5 px-6 py-4 hover:bg-gray-800/20 transition-colors">
                    <div className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-teal-400 shrink-0 mt-0.5">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-gray-200 truncate">{item.action}</p>
                        <span className="text-[10px] text-gray-500 shrink-0">{formatDateTime(item.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                      <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                        <span>by</span>
                        <span className="text-gray-300 font-medium">{item.user_name}</span>
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Upcoming Bookings Widget */}
        <div className="lg:col-span-2">
          <Card className="!p-0 h-full flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-purple-400" />
                <h2 className="font-semibold text-gray-200">Upcoming Bookings</h2>
              </div>
              <Link to="/bookings" className="text-xs text-teal-400 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-gray-800/60 flex-1">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="px-6 py-4 space-y-2">
                    <Skeleton className="h-3.5 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                ))
              ) : !data?.upcoming_bookings || data.upcoming_bookings.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No upcoming bookings scheduled for today or future dates.
                </div>
              ) : (
                data.upcoming_bookings.map((b) => (
                  <div key={b.id} className="p-4 px-6 hover:bg-gray-800/20 transition-colors">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-100 truncate">
                        {b.school_name || b.contact_name}
                      </p>
                      <Badge variant={b.status === 'approved' ? 'green' : 'amber'}>
                        {b.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
                        {formatDate(b.booking_date)}
                      </span>
                      {b.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-gray-500" />
                          {b.start_time}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-gray-500" />
                        {b.expected_num} visitors
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SparklineCard({
  title,
  subtitle,
  trendData,
  loading,
  color,
  unit,
}: {
  title: string
  subtitle: string
  trendData: TrendPoint[]
  loading: boolean
  color: string
  unit: string
}) {
  const maxVal = Math.max(...trendData.map((t) => t.value), 1)

  return (
    <Card className="flex flex-col justify-between p-6">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-100">{title}</h3>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>

      {loading ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : (
        <div className="relative pt-2">
          {/* Simple Clean Bar Trend Representation */}
          <div className="flex items-end justify-between gap-2 h-28">
            {trendData.map((pt, idx) => {
              const heightPercent = Math.max(10, Math.round((pt.value / maxVal) * 100))
              const dayLabel = new Date(pt.date).toLocaleDateString('en-US', { weekday: 'short' })
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 border border-gray-700 text-[10px] text-gray-200 px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-10">
                    {unit === '$' ? formatCurrency(pt.value) : `${pt.value} ${unit}`}
                  </div>
                  <div className="w-full bg-gray-800 rounded-t flex flex-col justify-end h-full overflow-hidden">
                    <div
                      className="w-full transition-all duration-500 rounded-t"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase">{dayLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}

function QuickLinkCard({
  to,
  title,
  desc,
  icon: Icon,
  badgeColor,
}: {
  to: string
  title: string
  desc: string
  icon: React.ElementType
  badgeColor: string
}) {
  return (
    <Link to={to} className="group">
      <Card hover className="flex items-center gap-4 p-4 border border-gray-800 group-hover:border-teal-500/40 transition-colors">
        <div className={cn('p-3 rounded-xl shrink-0', badgeColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-200 group-hover:text-teal-300 transition-colors truncate">
            {title}
          </p>
          <p className="text-xs text-gray-500 truncate mt-0.5">{desc}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all shrink-0" />
      </Card>
    </Link>
  )
}
