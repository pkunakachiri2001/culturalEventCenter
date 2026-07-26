/**
 * CultureFlow — Visitor & Visit API Service
 */

import api from '@/services/api'
import type { PaginatedResponse, Visitor, Visit, VisitType, VisitorType } from '@/types'

export interface ListVisitorsParams {
  query?: string
  visitor_type?: VisitorType
  page?: number
  page_size?: number
}

export interface ListVisitsParams {
  query?: string
  visit_type?: VisitType
  visit_date?: string
  is_checked_out?: boolean
  page?: number
  page_size?: number
}

export interface CreateVisitorData {
  full_name: string
  phone?: string | null
  email?: string | null
  id_number?: string | null
  visitor_type?: VisitorType
  nationality?: string | null
  notes?: string | null
}

export interface CheckInVisitData {
  visit_type: VisitType
  visitor_id?: string | null
  visitor_data?: CreateVisitorData | null
  school_id?: string | null
  booking_id?: string | null
  num_students?: number
  num_teachers?: number
  num_adults?: number
  purpose?: string | null
  notes?: string | null
}

export interface CheckOutVisitData {
  qr_code?: string | null
  visit_id?: string | null
}

export async function listVisitors(params?: ListVisitorsParams): Promise<PaginatedResponse<Visitor>> {
  const { data } = await api.get<PaginatedResponse<Visitor>>('/api/visitors', { params })
  return data
}

export async function createVisitor(visitorData: CreateVisitorData): Promise<Visitor> {
  const { data } = await api.post<Visitor>('/api/visitors', visitorData)
  return data
}

export async function getVisitor(id: string): Promise<Visitor> {
  const { data } = await api.get<Visitor>(`/api/visitors/${id}`)
  return data
}

export async function updateVisitor(id: string, visitorData: Partial<CreateVisitorData>): Promise<Visitor> {
  const { data } = await api.put<Visitor>(`/api/visitors/${id}`, visitorData)
  return data
}

export async function deleteVisitor(id: string): Promise<void> {
  await api.delete(`/api/visitors/${id}`)
}

export async function listVisits(params?: ListVisitsParams): Promise<PaginatedResponse<Visit>> {
  const { data } = await api.get<PaginatedResponse<Visit>>('/api/visits', { params })
  return data
}

export async function checkInVisit(checkInData: CheckInVisitData): Promise<Visit> {
  const { data } = await api.post<Visit>('/api/visits/check-in', checkInData)
  return data
}

export async function checkOutVisit(checkOutData: CheckOutVisitData): Promise<Visit> {
  const { data } = await api.post<Visit>('/api/visits/check-out', checkOutData)
  return data
}

export async function getVisit(id: string): Promise<Visit> {
  const { data } = await api.get<Visit>(`/api/visits/${id}`)
  return data
}
