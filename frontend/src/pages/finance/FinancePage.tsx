/**
 * CultureFlow — Finance & Payment Management Module
 * Ticket pricing configuration, POS till checkout, receipt generation, and real-time revenue analytics.
 */

import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import toast from 'react-hot-toast'
import {
  DollarSign,
  CreditCard,
  Receipt,
  Ticket as TicketIcon,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  TrendingUp,
  Clock,
  Trash2,
  Edit,
  ShoppingCart,
  Wallet,
  Building,
  Tag,
  BadgePercent,
  RefreshCw,
} from 'lucide-react'
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Modal,
  Skeleton,
  Alert,
} from '@/components/ui'
import {
  listTickets,
  createTicket,
  updateTicket,
  deleteTicket,
  listPayments,
  processPayment,
  getFinancialSummary,
  type FinancialSummary,
  type CreatePaymentData,
  type CreatePaymentItemData,
} from '@/services/finance'
import type { Ticket, Payment, PaymentMethod } from '@/types'
import { formatCurrency, formatDateTime, formatDate, cn } from '@/utils'

const ticketSchema = z.object({
  name: z.string().min(2, 'Category name is required'),
  description: z.string().optional(),
  price: z.number().min(0, 'Price must be greater than or equal to 0'),
  currency: z.string().default('USD'),
  sort_order: z.number().default(0),
})
type TicketFormValues = z.infer<typeof ticketSchema>

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'receipts' | 'tickets' | 'pos'>('receipts')

  // Financial Summary State
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  // Payments / Receipts State
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsTotal, setPaymentsTotal] = useState(0)
  const [paymentsLoading, setPaymentsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('')

  // Ticket Categories State
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [ticketsLoading, setTicketsLoading] = useState(true)

  // Modals & Active Receipt
  const [ticketModalOpen, setTicketModalOpen] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [activeReceipt, setActiveReceipt] = useState<Payment | null>(null)

  // ── Load Financial Summary ──────────────────────────────────────────────────
  const loadSummary = async () => {
    setSummaryLoading(true)
    try {
      const data = await getFinancialSummary()
      setSummary(data)
    } catch {
      // Graceful fallback if empty
    } finally {
      setSummaryLoading(false)
    }
  }

  // ── Load Receipts ───────────────────────────────────────────────────────────
  const loadReceipts = async () => {
    setPaymentsLoading(true)
    try {
      const data = await listPayments({
        query: query || undefined,
        payment_method: (methodFilter as PaymentMethod) || undefined,
        page: 1,
        page_size: 30,
      })
      setPayments(data.items)
      setPaymentsTotal(data.total)
    } catch {
      toast.error('Failed to load receipts.')
    } finally {
      setPaymentsLoading(false)
    }
  }

  // ── Load Ticket Categories ──────────────────────────────────────────────────
  const loadTicketsData = async () => {
    setTicketsLoading(true)
    try {
      const data = await listTickets(false)
      setTickets(data)
    } catch {
      toast.error('Failed to load ticket categories.')
    } finally {
      setTicketsLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
    if (activeTab === 'receipts') loadReceipts()
    if (activeTab === 'tickets' || activeTab === 'pos') loadTicketsData()
  }, [activeTab, query, methodFilter])

  // ── Delete Ticket Category ──────────────────────────────────────────────────
  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm('Are you sure you want to deactivate this ticket category?')) return
    try {
      await deleteTicket(id)
      toast.success('Ticket category deactivated.')
      loadTicketsData()
    } catch {
      toast.error('Deactivation failed.')
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* ── Page Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-teal-400" />
            Financial Management
          </h1>
          <p className="page-subtitle">Track revenue, manage ticket pricing categories, and issue receipts.</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadSummary()
              if (activeTab === 'receipts') loadReceipts()
              else loadTicketsData()
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab('pos')}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500"
          >
            <ShoppingCart className="w-4 h-4" />
            POS Till Checkout
          </Button>
        </div>
      </div>

      {/* ── Revenue Summary Banner ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4 bg-emerald-950/20 border-emerald-500/30">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Today's Total Receipts</p>
            <p className="text-2xl font-bold text-emerald-300">
              {summary ? formatCurrency(summary.todays_revenue) : '$0.00'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {summary?.total_transactions_today || 0} transaction(s)
            </p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4 bg-teal-950/20 border-teal-500/30">
          <div className="p-3 rounded-xl bg-teal-500/10 text-teal-400">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-medium">Monthly Total Revenue</p>
            <p className="text-2xl font-bold text-teal-300">
              {summary ? formatCurrency(summary.monthly_revenue) : '$0.00'}
            </p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              {summary?.total_transactions_month || 0} total transactions
            </p>
          </div>
        </Card>

        <Card className="p-4 flex flex-col justify-between sm:col-span-2 bg-gray-900/60 border-gray-800">
          <p className="text-xs text-gray-400 font-medium mb-2">Today's Payment Method Breakdown</p>
          <div className="flex flex-wrap items-center gap-2">
            {!summary?.method_breakdown || summary.method_breakdown.length === 0 ? (
              <span className="text-xs text-gray-500">No payment receipts recorded today yet.</span>
            ) : (
              summary.method_breakdown.map((m) => (
                <div
                  key={m.method}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/80 border border-gray-700/60 text-xs"
                >
                  <span className="capitalize font-bold text-gray-200">{m.method}:</span>
                  <span className="text-emerald-400 font-semibold">{formatCurrency(m.amount)}</span>
                  <span className="text-[10px] text-gray-500">({m.count})</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <TabButton
          active={activeTab === 'receipts'}
          onClick={() => setActiveTab('receipts')}
          icon={<Receipt className="w-4 h-4" />}
          label="Receipts & Transactions"
          count={paymentsTotal}
        />
        <TabButton
          active={activeTab === 'pos'}
          onClick={() => setActiveTab('pos')}
          icon={<ShoppingCart className="w-4 h-4" />}
          label="POS Till Checkout"
        />
        <TabButton
          active={activeTab === 'tickets'}
          onClick={() => setActiveTab('tickets')}
          icon={<TicketIcon className="w-4 h-4" />}
          label="Admission Ticket Prices"
          count={tickets.length}
        />
      </div>

      {/* ── TAB 1: RECEIPTS & TRANSACTIONS ─────────────────────────────────────── */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-gray-900/60 p-4 rounded-xl border border-gray-800">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search by receipt number or notes..."
                leftIcon={<Search className="w-4 h-4 text-gray-400" />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <Select
              options={[
                { value: '', label: 'All Payment Methods' },
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'ecocash', label: 'EcoCash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'free', label: 'Free / Complimentary' },
              ]}
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
            />
          </div>

          <Card className="!p-0 overflow-hidden">
            {paymentsLoading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-lg" />
                ))}
              </div>
            ) : payments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-gray-300">No payment receipts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-800/80 text-gray-400 uppercase text-[11px] tracking-wider border-b border-gray-800">
                    <tr>
                      <th className="py-3 px-4">Receipt Number</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Line Items</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs font-bold text-teal-300">
                          {p.receipt_number || 'N/A'}
                        </td>
                        <td className="py-3 px-4 capitalize">
                          <Badge variant={getMethodBadge(p.payment_method)}>{p.payment_method}</Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">
                          {p.items?.length || 0} item(s)
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          {formatCurrency(p.total_amount)}
                        </td>
                        <td className="py-3 px-4 text-xs text-gray-400">{formatDateTime(p.created_at)}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setActiveReceipt(p)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-teal-300 hover:bg-gray-800 transition-colors"
                            title="View & Print Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── TAB 2: POS TILL CHECKOUT ──────────────────────────────────────────── */}
      {activeTab === 'pos' && (
        <POSTillWidget
          tickets={tickets.filter((t) => t.is_active)}
          onPaymentProcessed={(newPayment) => {
            setActiveTab('receipts')
            setActiveReceipt(newPayment)
            loadSummary()
          }}
        />
      )}

      {/* ── TAB 3: TICKET PRICING CATEGORIES ──────────────────────────────────── */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-200">Admission Ticket Price Categories</h2>
            <Button
              size="sm"
              onClick={() => {
                setEditingTicket(null)
                setTicketModalOpen(true)
              }}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Ticket Category
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ticketsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-5 space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-8 w-20" />
                </Card>
              ))
            ) : tickets.length === 0 ? (
              <Card className="sm:col-span-3 text-center py-12 text-gray-500">
                <TicketIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold text-gray-300">No ticket price categories defined</p>
                <p className="text-xs mt-1">Click "Add Ticket Category" to configure admission rates.</p>
              </Card>
            ) : (
              tickets.map((ticket) => (
                <Card
                  key={ticket.id}
                  hover
                  className={cn(
                    'p-5 space-y-3 border',
                    ticket.is_active ? 'border-gray-800' : 'border-gray-800/40 opacity-60'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-100 text-base">{ticket.name}</h3>
                      {ticket.description && (
                        <p className="text-xs text-gray-400 mt-0.5">{ticket.description}</p>
                      )}
                    </div>
                    <Badge variant={ticket.is_active ? 'green' : 'gray'}>
                      {ticket.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-gray-800 flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-emerald-400">
                      {formatCurrency(ticket.price)}
                    </span>
                    <span className="text-xs text-gray-500 font-mono">{ticket.currency}</span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => {
                        setEditingTicket(ticket)
                        setTicketModalOpen(true)
                      }}
                      className="p-1 text-gray-400 hover:text-gray-200"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {ticket.is_active && (
                      <button
                        onClick={() => handleDeleteTicket(ticket.id)}
                        className="p-1 text-gray-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: ADD / EDIT TICKET CATEGORY ───────────────────────────────── */}
      <Modal
        open={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        title={editingTicket ? 'Edit Ticket Category' : 'Add Ticket Category'}
        description="Set admission fee and category parameters"
        size="sm"
      >
        <TicketFormModal
          editingTicket={editingTicket}
          onSuccess={() => {
            setTicketModalOpen(false)
            loadTicketsData()
          }}
        />
      </Modal>

      {/* ── MODAL 2: PRINT RECEIPT ────────────────────────────────────────────── */}
      {activeReceipt && (
        <Modal
          open={!!activeReceipt}
          onClose={() => setActiveReceipt(null)}
          title="Official Entry Receipt"
          description="CultureFlow Financial Transaction Record"
          size="md"
        >
          <div className="space-y-6">
            <div
              id="printable-receipt"
              className="p-6 rounded-2xl bg-gray-950 border border-gray-800 space-y-4 font-mono text-xs text-gray-300"
            >
              <div className="text-center border-b border-gray-800 pb-4 space-y-1">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">CultureFlow</h2>
                <p className="text-[10px] text-teal-400 uppercase">Cultural Centre Official Receipt</p>
                <p className="text-[10px] text-gray-500 font-sans">{formatDateTime(activeReceipt.created_at)}</p>
                <code className="text-xs font-bold text-teal-300 block pt-1">{activeReceipt.receipt_number}</code>
              </div>

              <div className="space-y-2 py-2">
                <div className="flex justify-between font-bold text-gray-400 border-b border-gray-800 pb-1 text-[11px]">
                  <span>ITEM</span>
                  <span>QTY × PRICE</span>
                  <span>TOTAL</span>
                </div>
                {activeReceipt.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate max-w-[140px]">{item.description || 'Admission Ticket'}</span>
                    <span>{item.quantity} × {formatCurrency(item.unit_price)}</span>
                    <span className="font-semibold text-gray-100">{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-800 pt-3 space-y-1 text-right text-sm">
                <div className="flex justify-between font-bold text-base text-white">
                  <span>GRAND TOTAL:</span>
                  <span className="text-emerald-400">{formatCurrency(activeReceipt.total_amount)}</span>
                </div>
                <p className="text-[10px] text-gray-500 uppercase font-sans">
                  PAYMENT METHOD: <span className="text-gray-300 font-bold">{activeReceipt.payment_method}</span>
                </p>
              </div>

              <div className="text-center pt-4 border-t border-gray-800/60 text-[10px] text-gray-500 font-sans">
                Thank you for supporting the Cultural Centre.
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setActiveReceipt(null)}>
                Close
              </Button>
              <Button onClick={() => window.print()} className="flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── SUB-COMPONENT: POS TILL CHECKOUT WIDGET ────────────────────────────────────
function POSTillWidget({
  tickets,
  onPaymentProcessed,
}: {
  tickets: Ticket[]
  onPaymentProcessed: (p: Payment) => void
}) {
  const [cart, setCart] = useState<Record<string, number>>({})
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleUpdateQty = (ticketId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[ticketId] || 0
      const next = Math.max(0, current + delta)
      if (next === 0) {
        const copy = { ...prev }
        delete copy[ticketId]
        return copy
      }
      return { ...prev, [ticketId]: next }
    })
  }

  const selectedItems = Object.entries(cart)
    .map(([id, qty]) => {
      const t = tickets.find((tk) => tk.id === id)
      return t ? { ticket: t, quantity: qty, total: t.price * qty } : null
    })
    .filter(Boolean)

  const grandTotal = selectedItems.reduce((sum, item) => sum + (item?.total || 0), 0)

  const handleCheckout = async () => {
    if (selectedItems.length === 0) {
      toast.error('Add at least one ticket to the cart.')
      return
    }
    setLoading(true)
    try {
      const payload: CreatePaymentData = {
        payment_method: paymentMethod,
        currency: 'USD',
        notes: notes || null,
        items: selectedItems.map((item) => ({
          ticket_id: item!.ticket.id,
          description: `${item!.ticket.name} Ticket`,
          quantity: item!.quantity,
          unit_price: item!.ticket.price,
        })),
      }
      const payment = await processPayment(payload)
      toast.success(`Receipt ${payment.receipt_number} generated!`)
      setCart({})
      setNotes('')
      onPaymentProcessed(payment)
    } catch {
      toast.error('Payment checkout failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Ticket Selection Panel */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-base font-bold text-gray-200 flex items-center gap-2">
          <TicketIcon className="w-5 h-5 text-teal-400" />
          Select Ticket Categories
        </h2>

        {tickets.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            No active ticket categories. Configure pricing categories under the "Admission Ticket Prices" tab.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tickets.map((ticket) => {
              const qty = cart[ticket.id] || 0
              return (
                <div
                  key={ticket.id}
                  className={cn(
                    'p-4 rounded-xl border flex items-center justify-between transition-all',
                    qty > 0
                      ? 'bg-teal-950/40 border-teal-500 text-teal-200'
                      : 'bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700'
                  )}
                >
                  <div>
                    <p className="font-bold text-gray-100">{ticket.name}</p>
                    <p className="text-sm font-semibold text-emerald-400 mt-0.5">
                      {formatCurrency(ticket.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateQty(ticket.id, -1)}
                      className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-sm text-gray-100">{qty}</span>
                    <button
                      onClick={() => handleUpdateQty(ticket.id, 1)}
                      className="w-8 h-8 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cart Summary & Checkout Panel */}
      <Card className="p-6 flex flex-col justify-between space-y-6">
        <div>
          <h2 className="text-base font-bold text-gray-100 border-b border-gray-800 pb-3 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-teal-400" />
            Till Order Summary
          </h2>

          <div className="divide-y divide-gray-800 py-3 space-y-2 max-h-48 overflow-y-auto">
            {selectedItems.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">Cart is empty.</p>
            ) : (
              selectedItems.map((item) => (
                <div key={item!.ticket.id} className="pt-2 flex justify-between text-xs">
                  <div>
                    <span className="font-semibold text-gray-200">{item!.ticket.name}</span>
                    <span className="text-gray-500 block">
                      {item!.quantity} × {formatCurrency(item!.ticket.price)}
                    </span>
                  </div>
                  <span className="font-bold text-emerald-400">{formatCurrency(item!.total)}</span>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t border-gray-800 space-y-4">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-400 font-semibold uppercase">TOTAL DUE</span>
              <span className="text-2xl font-bold text-emerald-400">{formatCurrency(grandTotal)}</span>
            </div>

            <Select
              label="Payment Method"
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'ecocash', label: 'EcoCash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'free', label: 'Free / Complimentary' },
              ]}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
            />

            <Input
              label="Notes / Reference (Optional)"
              placeholder="e.g. EcoCash Reference Number"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <Button
          onClick={handleCheckout}
          loading={loading}
          disabled={selectedItems.length === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-500 py-3 text-base"
        >
          Process Payment & Print Receipt
        </Button>
      </Card>
    </div>
  )
}

// ── SUB-COMPONENT: TICKET FORM MODAL ───────────────────────────────────────────
function TicketFormModal({
  editingTicket,
  onSuccess,
}: {
  editingTicket: Ticket | null
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      name: editingTicket?.name ?? '',
      description: editingTicket?.description ?? '',
      price: editingTicket?.price ?? 0,
      currency: editingTicket?.currency ?? 'USD',
      sort_order: editingTicket?.sort_order ?? 0,
    },
  })

  const onSubmit = async (values: TicketFormValues) => {
    setLoading(true)
    try {
      if (editingTicket) {
        await updateTicket(editingTicket.id, values)
        toast.success('Ticket category updated!')
      } else {
        await createTicket(values)
        toast.success('New ticket category created!')
      }
      onSuccess()
    } catch {
      toast.error('Failed to save ticket category.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Category Name"
        id="name"
        placeholder="e.g. Student Admission"
        error={errors.name?.message}
        {...register('name')}
      />

      <Input
        label="Description (Optional)"
        id="description"
        placeholder="e.g. Primary and Secondary school pupils"
        {...register('description')}
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Price (USD)"
          type="number"
          step="0.01"
          id="price"
          error={errors.price?.message}
          {...register('price', { valueAsNumber: true })}
        />
        <Input
          label="Currency"
          id="currency"
          defaultValue="USD"
          {...register('currency')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
        <Button type="submit" loading={loading}>
          {editingTicket ? 'Save Changes' : 'Create Category'}
        </Button>
      </div>
    </form>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  count?: number
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors',
        active
          ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className="ml-1 text-[11px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full font-bold">
          {count}
        </span>
      )}
    </button>
  )
}

function getMethodBadge(method: PaymentMethod) {
  switch (method) {
    case 'cash':
      return 'green'
    case 'card':
      return 'teal'
    case 'ecocash':
      return 'amber'
    case 'bank_transfer':
      return 'purple'
    case 'free':
      return 'gray'
    default:
      return 'gray'
  }
}
