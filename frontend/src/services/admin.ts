/**
 * CultureFlow — Admin & User Management Service
 */

import api from '@/services/api'
import type { PaginatedResponse, User, UserRole } from '@/types'

export interface ListUsersParams {
  query?: string
  role?: UserRole
  is_active?: boolean
  page?: number
  page_size?: number
}

export interface CreateUserData {
  email: string
  full_name: string
  phone?: string | null
  role: UserRole
  password: string
}

export interface AuditLog {
  id: string
  user_id?: string | null
  action: string
  entity_type?: string | null
  entity_id?: string | null
  changes?: Record<string, any> | null
  ip_address?: string | null
  created_at: string
}

export async function listUsers(params?: ListUsersParams): Promise<PaginatedResponse<User>> {
  const { data } = await api.get<PaginatedResponse<User>>('/api/admin/users', { params })
  return data
}

export async function createUser(userData: CreateUserData): Promise<User> {
  const { data } = await api.post<User>('/api/admin/users', userData)
  return data
}

export async function updateUser(id: string, userData: Partial<CreateUserData> & { is_active?: boolean }): Promise<User> {
  const { data } = await api.put<User>(`/api/admin/users/${id}`, userData)
  return data
}

export async function resetPassword(id: string, new_password: string): Promise<void> {
  await api.post(`/api/admin/users/${id}/reset-password`, { new_password })
}

export async function listAuditLogs(params?: { action?: string; page?: number; page_size?: number }): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await api.get<PaginatedResponse<AuditLog>>('/api/admin/audit-logs', { params })
  return data
}
