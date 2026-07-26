/**
 * CultureFlow — School Management API Service
 */

import api from '@/services/api'
import type { PaginatedResponse, School, Visit } from '@/types'

export interface ListSchoolsParams {
  query?: string
  province?: string
  page?: number
  page_size?: number
}

export interface CreateSchoolData {
  name: string
  province?: string | null
  country?: string
  contact_teacher?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  notes?: string | null
}

export async function listSchools(params?: ListSchoolsParams): Promise<PaginatedResponse<School>> {
  const { data } = await api.get<PaginatedResponse<School>>('/api/schools', { params })
  return data
}

export async function createSchool(schoolData: CreateSchoolData): Promise<School> {
  const { data } = await api.post<School>('/api/schools', schoolData)
  return data
}

export async function getSchool(id: string): Promise<School> {
  const { data } = await api.get<School>(`/api/schools/${id}`)
  return data
}

export async function updateSchool(id: string, schoolData: Partial<CreateSchoolData>): Promise<School> {
  const { data } = await api.put<School>(`/api/schools/${id}`, schoolData)
  return data
}

export async function deleteSchool(id: string): Promise<void> {
  await api.delete(`/api/schools/${id}`)
}

export async function getSchoolVisits(id: string, page = 1): Promise<PaginatedResponse<Visit>> {
  const { data } = await api.get<PaginatedResponse<Visit>>(`/api/schools/${id}/visits`, {
    params: { page, page_size: 20 },
  })
  return data
}
