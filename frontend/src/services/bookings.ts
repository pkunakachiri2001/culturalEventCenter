/**
 * CultureFlow — Booking Management API Service
 */

import api from '@/services/api'
import type { PaginatedResponse, Booking, BookingStatus, Visit } from '@/types'

export interface ListBookingsParams {
  query?: string
  status?: BookingStatus
  school_id?: string
  start_date?: string
  end_date?: string
  page?: number
  page_size?: number
}

export interface CreateBookingData {
  school_id?: string | null
  booking_date: string
  start_time?: string | null
  end_time?: string | null
  contact_name: string
  contact_phone?: string | null
  contact_email?: string | null
  purpose?: string | null
  expected_num: number
  notes?: string | null
}

export interface RescheduleBookingData {
  new_booking_date: string
  new_start_time?: string | null
  new_end_time?: string | null
  notes?: string | null
}

export async function listBookings(params?: ListBookingsParams): Promise<PaginatedResponse<Booking>> {
  const { data } = await api.get<PaginatedResponse<Booking>>('/api/bookings', { params })
  return data
}

export async function createBooking(bookingData: CreateBookingData): Promise<Booking> {
  const { data } = await api.post<Booking>('/api/bookings', bookingData)
  return data
}

export async function getBooking(id: string): Promise<Booking> {
  const { data } = await api.get<Booking>(`/api/bookings/${id}`)
  return data
}

export async function updateBooking(id: string, bookingData: Partial<CreateBookingData>): Promise<Booking> {
  const { data } = await api.put<Booking>(`/api/bookings/${id}`, bookingData)
  return data
}

export async function approveBooking(id: string): Promise<Booking> {
  const { data } = await api.post<Booking>(`/api/bookings/${id}/approve`)
  return data
}

export async function rejectBooking(id: string, rejection_reason: string): Promise<Booking> {
  const { data } = await api.post<Booking>(`/api/bookings/${id}/reject`, { rejection_reason })
  return data
}

export async function rescheduleBooking(id: string, rescheduleData: RescheduleBookingData): Promise<Booking> {
  const { data } = await api.post<Booking>(`/api/bookings/${id}/reschedule`, rescheduleData)
  return data
}

export async function convertBookingToVisit(id: string): Promise<Visit> {
  const { data } = await api.post<Visit>(`/api/bookings/${id}/convert-to-visit`)
  return data
}

export async function deleteBooking(id: string): Promise<void> {
  await api.delete(`/api/bookings/${id}`)
}
