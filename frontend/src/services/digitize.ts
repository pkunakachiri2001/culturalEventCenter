/**
 * CultureFlow — AI Digitization Service
 */

import api from '@/services/api'
import type { PaginatedResponse, DigitizedRecord, Visit } from '@/types'

export interface ListDigitizedParams {
  status?: string
  is_duplicate?: boolean
  page?: number
  page_size?: number
}

export interface UpdateDigitizedRecordData {
  extracted_data?: Record<string, any>
  reviewer_notes?: string | null
  status?: string
}

export async function uploadAndDigitize(file: File): Promise<DigitizedRecord> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await api.post<DigitizedRecord>('/api/digitize/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function listDigitizedRecords(params?: ListDigitizedParams): Promise<PaginatedResponse<DigitizedRecord>> {
  const { data } = await api.get<PaginatedResponse<DigitizedRecord>>('/api/digitize/records', { params })
  return data
}

export async function getDigitizedRecord(id: string): Promise<DigitizedRecord> {
  const { data } = await api.get<DigitizedRecord>(`/api/digitize/records/${id}`)
  return data
}

export async function updateDigitizedRecord(id: string, updateData: UpdateDigitizedRecordData): Promise<DigitizedRecord> {
  const { data } = await api.put<DigitizedRecord>(`/api/digitize/records/${id}`, updateData)
  return data
}

export async function confirmDigitizedRecord(id: string): Promise<Visit> {
  const { data } = await api.post<Visit>(`/api/digitize/records/${id}/confirm`)
  return data
}

export async function rejectDigitizedRecord(id: string): Promise<DigitizedRecord> {
  const { data } = await api.post<DigitizedRecord>(`/api/digitize/records/${id}/reject`)
  return data
}
