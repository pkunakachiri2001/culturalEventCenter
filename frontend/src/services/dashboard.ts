/**
 * CultureFlow — Dashboard Service
 * Fetches aggregate metrics, 7-day trendlines, activities, and upcoming bookings.
 */

import api from '@/services/api'
import type { DashboardStatsResponse } from '@/types'

export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  const { data } = await api.get<DashboardStatsResponse>('/api/dashboard/stats')
  return data
}
