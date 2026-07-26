/**
 * CultureFlow — Reports & File Export Module
 * Daily, Monthly, Annual, Revenue, and School reports with CSV, Excel, and PDF file downloads.
 */

import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import {
  FileText,
  Download,
  Calendar,
  Filter,
  DollarSign,
  Users,
  School,
  CalendarDays,
  FileSpreadsheet,
  FileCode,
  FileType,
  RefreshCw,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react'
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Skeleton,
  Alert,
} from '@/components/ui'
import {
  getReportSummary,
  downloadReportCsv,
  downloadReportExcel,
  downloadReportPdf,
  type ReportFilterParams,
} from '@/services/reports'
import type { ReportSummaryResponse } from '@/types'
import { formatCurrency, formatDate, cn } from '@/utils'

export default function ReportsPage() {
  const [reportType, setReportType] = useState<'daily' | 'monthly' | 'annual' | 'revenue' | 'school'>('daily')
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0])

  const [data, setData] = useState<ReportSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const [exportingFormat, setExportingFormat] = useState<'csv' | 'excel' | 'pdf' | null>(null)

  // ── Load Report Preview ──────────────────────────────────────────────────────
  const loadReport = async () => {
    setLoading(true)
    try {
      const params: ReportFilterParams = {
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
      }
      const res = await getReportSummary(params)
      setData(res)
    } catch {
      toast.error('Failed to generate report preview.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [reportType, startDate, endDate])

  // ── Export Handlers ──────────────────────────────────────────────────────────
  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExportingFormat(format)
    const params: ReportFilterParams = {
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
    }
    try {
      if (format === 'csv') await downloadReportCsv(params)
      else if (format === 'excel') await downloadReportExcel(params)
      else if (format === 'pdf') await downloadReportPdf(params)
      toast.success(`Report exported successfully as ${format.toUpperCase()}!`)
    } catch {
      toast.error(`Failed to export ${format.toUpperCase()} report file.`)
    } finally {
      setExportingFormat(null)
    }
  }

  const categoryCards = [
    {
      type: 'daily',
      title: 'Daily Attendance Report',
      desc: 'Check-in log, headcounts & daily visit breakdown',
      icon: Users,
      badgeColor: 'bg-teal-500/10 text-teal-400',
    },
    {
      type: 'revenue',
      title: 'Revenue & Receipts Report',
      desc: 'Itemized receipts, currency totals & payment methods',
      icon: DollarSign,
      badgeColor: 'bg-emerald-500/10 text-emerald-400',
    },
    {
      type: 'school',
      title: 'School Partner Report',
      desc: 'Educational visits, student totals & province metrics',
      icon: School,
      badgeColor: 'bg-blue-500/10 text-blue-400',
    },
    {
      type: 'monthly',
      title: 'Monthly Summary',
      desc: 'Monthly trends, visitor growth & reservation counts',
      icon: TrendingUp,
      badgeColor: 'bg-purple-500/10 text-purple-400',
    },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <FileText className="w-6 h-6 text-teal-400" />
            Reports & Analytics
          </h1>
          <p className="page-subtitle">Generate operational summaries and export PDF, Excel, and CSV files.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            loading={exportingFormat === 'csv'}
            className="flex items-center gap-1.5 border-gray-700 hover:bg-gray-800 text-gray-200"
          >
            <FileCode className="w-4 h-4 text-amber-400" />
            CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('excel')}
            loading={exportingFormat === 'excel'}
            className="flex items-center gap-1.5 border-gray-700 hover:bg-gray-800 text-gray-200"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Excel
          </Button>
          <Button
            size="sm"
            onClick={() => handleExport('pdf')}
            loading={exportingFormat === 'pdf'}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500"
          >
            <FileType className="w-4 h-4" />
            PDF Report
          </Button>
        </div>
      </div>

      {/* ── Category Cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {categoryCards.map((card) => {
          const Icon = card.icon
          const isSelected = reportType === card.type
          return (
            <button
              key={card.type}
              onClick={() => setReportType(card.type as any)}
              className={cn(
                'p-4 rounded-xl border text-left transition-all flex flex-col justify-between space-y-3',
                isSelected
                  ? 'bg-teal-950/40 border-teal-500 ring-1 ring-teal-500/50'
                  : 'bg-gray-900 border-gray-800 hover:border-gray-700'
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className={cn('p-2.5 rounded-xl', card.badgeColor)}>
                  <Icon className="w-5 h-5" />
                </div>
                {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-400" />}
              </div>
              <div>
                <p className="font-bold text-gray-100 text-sm">{card.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{card.desc}</p>
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Date Filter Bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
        <Input
          label="Start Date"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        <div className="pt-5 flex justify-end">
          <Button
            variant="outline"
            onClick={loadReport}
            loading={loading}
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Generate Preview
          </Button>
        </div>
      </div>

      {/* ── Live Report Data & Preview ────────────────────────────────────────── */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-4 gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-100">{data?.title || 'Report Analytics'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Period: <span className="text-teal-300 font-semibold">{data?.start_date}</span> to{' '}
              <span className="text-teal-300 font-semibold">{data?.end_date}</span>
            </p>
          </div>

          <Badge variant="teal" className="capitalize self-start sm:self-auto">
            {reportType} Report
          </Badge>
        </div>

        {/* Aggregated Key Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/50">
            <span className="text-[10px] text-gray-400 font-semibold uppercase block">TOTAL VISITORS</span>
            <span className="text-xl font-bold text-gray-100">
              {loading ? '...' : data?.total_visitors.toLocaleString()}
            </span>
          </div>

          <div className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/50">
            <span className="text-[10px] text-gray-400 font-semibold uppercase block">TOTAL REVENUE</span>
            <span className="text-xl font-bold text-emerald-400">
              {loading ? '...' : formatCurrency(data?.total_revenue || 0)}
            </span>
          </div>

          <div className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/50">
            <span className="text-[10px] text-gray-400 font-semibold uppercase block">REGISTERED SCHOOLS</span>
            <span className="text-xl font-bold text-blue-300">
              {loading ? '...' : data?.total_schools}
            </span>
          </div>

          <div className="p-3 bg-gray-800/40 rounded-xl border border-gray-700/50">
            <span className="text-[10px] text-gray-400 font-semibold uppercase block">BOOKINGS PROCESSED</span>
            <span className="text-xl font-bold text-purple-300">
              {loading ? '...' : data?.total_bookings}
            </span>
          </div>
        </div>

        {/* Breakdown Data Table */}
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded" />
              ))}
            </div>
          ) : !data?.breakdown_rows || data.breakdown_rows.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-gray-300">No records found for selected date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-800/80 text-gray-400 uppercase text-[10px] tracking-wider border-b border-gray-800">
                  <tr>
                    {Object.keys(data.breakdown_rows[0]).map((header) => (
                      <th key={header} className="py-3 px-4 capitalize">
                        {header.replace('_', ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60">
                  {data.breakdown_rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                      {Object.values(row).map((val: any, valIdx) => (
                        <td key={valIdx} className="py-2.5 px-4">
                          {typeof val === 'number' && valIdx === Object.values(row).length - 1 && typeof Object.keys(row)[valIdx] === 'string' && Object.keys(row)[valIdx].includes('amount')
                            ? formatCurrency(val)
                            : String(val ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
