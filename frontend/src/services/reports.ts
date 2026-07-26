/**
 * CultureFlow — Reports & File Export Service
 */

import api from '@/services/api'
import type { ReportSummaryResponse } from '@/types'

export interface ReportFilterParams {
  report_type?: 'daily' | 'monthly' | 'annual' | 'revenue' | 'school'
  start_date?: string
  end_date?: string
}

export async function getReportSummary(params?: ReportFilterParams): Promise<ReportSummaryResponse> {
  const { data } = await api.get<ReportSummaryResponse>('/api/reports/summary', { params })
  return data
}

export async function downloadReportCsv(params?: ReportFilterParams): Promise<void> {
  const response = await api.get('/api/reports/export/csv', {
    params,
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, `cultureflow_${params?.report_type || 'report'}.csv`)
}

export async function downloadReportExcel(params?: ReportFilterParams): Promise<void> {
  const response = await api.get('/api/reports/export/excel', {
    params,
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, `cultureflow_${params?.report_type || 'report'}.xlsx`)
}

export async function downloadReportPdf(params?: ReportFilterParams): Promise<void> {
  const response = await api.get('/api/reports/export/pdf', {
    params,
    responseType: 'blob',
  })
  triggerBlobDownload(response.data, `cultureflow_${params?.report_type || 'report'}.pdf`)
}

function triggerBlobDownload(blobData: BlobPart, filename: string) {
  const blob = new Blob([blobData])
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  window.URL.revokeObjectURL(url)
  document.body.removeChild(a)
}
