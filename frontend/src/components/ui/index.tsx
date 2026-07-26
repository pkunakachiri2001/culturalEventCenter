/**
 * CultureFlow — UI Primitives
 * Button, Input, Card, Badge, Spinner, Alert, Modal, Skeleton
 */

import React from 'react'
import { cn } from '@/utils'
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, disabled, children, className, ...props }, ref) => {
    const variants = {
      primary:   'btn-primary',
      secondary: 'btn-secondary',
      danger:    'btn-danger',
      ghost:     'btn-ghost',
      outline:   'btn-outline',
    }
    const sizes = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && <Spinner size="sm" className="mr-1" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, rightIcon, id, className, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`
    return (
      <div className="form-group w-full">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'form-input',
              leftIcon && 'pl-9',
              rightIcon && 'pr-9',
              error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const inputId = id ?? `ta-${Math.random().toString(36).slice(2)}`
    return (
      <div className="form-group w-full">
        {label && <label htmlFor={inputId} className="form-label">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={cn(
            'form-input resize-none',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          rows={3}
          {...props}
        />
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

// ── Select ────────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, id, className, ...props }, ref) => {
    const inputId = id ?? `sel-${Math.random().toString(36).slice(2)}`
    return (
      <div className="form-group w-full">
        {label && <label htmlFor={inputId} className="form-label">{label}</label>}
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'form-input appearance-none cursor-pointer',
            error && 'border-red-500',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <p className="form-error">{error}</p>}
      </div>
    )
  }
)
Select.displayName = 'Select'

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export function Card({ hover, className, children, ...props }: CardProps) {
  return (
    <div className={cn(hover ? 'card-hover' : 'card', 'card-body', className)} {...props}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────────
type BadgeVariant = 'teal' | 'amber' | 'red' | 'gray' | 'green' | 'purple'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

export function Badge({ variant = 'gray', className, children, ...props }: BadgeProps) {
  return (
    <span className={cn(`badge-${variant}`, className)} {...props}>
      {children}
    </span>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-8 h-8' }
  return (
    <svg
      className={cn('animate-spin text-teal-400', sizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-label="Loading"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

// ── Alert ─────────────────────────────────────────────────────────────────────
type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const ALERT_STYLES: Record<AlertVariant, { wrapper: string; icon: React.ElementType }> = {
  info:    { wrapper: 'bg-blue-500/10 border-blue-500/20 text-blue-300', icon: Info },
  success: { wrapper: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300', icon: CheckCircle2 },
  warning: { wrapper: 'bg-amber-500/10 border-amber-500/20 text-amber-300', icon: AlertTriangle },
  error:   { wrapper: 'bg-red-500/10 border-red-500/20 text-red-300', icon: AlertCircle },
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const { wrapper, icon: Icon } = ALERT_STYLES[variant]
  return (
    <div className={cn('flex gap-3 p-4 rounded-lg border text-sm', wrapper, className)}>
      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
      <div>
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />
}

// ── Modal ─────────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ open, onClose, title, description, children, size = 'md' }: ModalProps) {
  const maxWidth = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-full mx-4 max-h-[90vh] overflow-y-auto',
            'bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl animate-slide-up',
            maxWidth[size]
          )}
        >
          <div className="flex items-start justify-between p-6 border-b border-gray-800">
            <div>
              <DialogPrimitive.Title className="text-lg font-semibold text-gray-100">
                {title}
              </DialogPrimitive.Title>
              {description && (
                <DialogPrimitive.Description className="text-sm text-gray-400 mt-1">
                  {description}
                </DialogPrimitive.Description>
              )}
            </div>
            <DialogPrimitive.Close asChild>
              <button
                className="text-gray-500 hover:text-gray-300 transition-colors ml-4 mt-0.5"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogPrimitive.Close>
          </div>
          <div className="p-6">{children}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

// ── Empty State ───────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-state-icon">
          <Icon className="w-7 h-7" />
        </div>
      )}
      <h3 className="text-base font-semibold text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  )
}
