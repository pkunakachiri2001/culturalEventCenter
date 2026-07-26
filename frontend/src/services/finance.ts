/**
 * CultureFlow — Finance API Service
 */

import api from '@/services/api'
import type { PaginatedResponse, Ticket, Payment, PaymentMethod } from '@/types'

export interface ListPaymentsParams {
  query?: string
  payment_method?: PaymentMethod
  start_date?: string
  end_date?: string
  visit_id?: string
  page?: number
  page_size?: number
}

export interface CreateTicketData {
  name: string
  description?: string | null
  price: number
  currency?: string
  is_active?: boolean
  sort_order?: number
}

export interface CreatePaymentItemData {
  ticket_id?: string | null
  description?: string | null
  quantity: number
  unit_price: number
}

export interface CreatePaymentData {
  visit_id?: string | null
  payment_method: PaymentMethod
  currency?: string
  items: CreatePaymentItemData[]
  notes?: string | null
}

export interface MethodSummary {
  method: string
  count: number
  amount: number
}

export interface FinancialSummary {
  todays_revenue: number
  monthly_revenue: number
  total_transactions_today: number
  total_transactions_month: number
  method_breakdown: MethodSummary[]
}

export async function listTickets(activeOnly = true): Promise<Ticket[]> {
  const { data } = await api.get<Ticket[]>('/api/finance/tickets', {
    params: { active_only: activeOnly },
  })
  return data
}

export async function createTicket(ticketData: CreateTicketData): Promise<Ticket> {
  const { data } = await api.post<Ticket>('/api/finance/tickets', ticketData)
  return data
}

export async function updateTicket(id: string, ticketData: Partial<CreateTicketData>): Promise<Ticket> {
  const { data } = await api.put<Ticket>(`/api/finance/tickets/${id}`, ticketData)
  return data
}

export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/api/finance/tickets/${id}`)
}

export async function listPayments(params?: ListPaymentsParams): Promise<PaginatedResponse<Payment>> {
  const { data } = await api.get<PaginatedResponse<Payment>>('/api/finance/payments', { params })
  return data
}

export async function processPayment(paymentData: CreatePaymentData): Promise<Payment> {
  const { data } = await api.post<Payment>('/api/finance/payments', paymentData)
  return data
}

export async function getPayment(id: string): Promise<Payment> {
  const { data } = await api.get<Payment>(`/api/finance/payments/${id}`)
  return data
}

export async function getFinancialSummary(): Promise<FinancialSummary> {
  const { data } = await api.get<FinancialSummary>('/api/finance/summary')
  return data
}
