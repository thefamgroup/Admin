import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...i: ClassValue[]) => twMerge(clsx(i))

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateTime = (d: string) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

export const initials = (name: string) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

export const statusColor: Record<string, string> = {
  // bookings
  pending:     'badge-amber',
  confirmed:   'badge-blue',
  in_progress: 'badge-purple',
  completed:   'badge-green',
  cancelled:   'badge-red',
  // quotes
  draft:       'badge-grey',
  sent:        'badge-blue',
  accepted:    'badge-green',
  declined:    'badge-red',
  paid:        'badge-green',
  overdue:     'badge-red',
  // leads
  new:         'badge-blue',
  contacted:   'badge-amber',
  quoted:      'badge-purple',
  won:         'badge-green',
  lost:        'badge-red',
  // team
  active:      'badge-green',
  inactive:    'badge-red',
  on_leave:    'badge-amber',
  // messages
  unread:      'badge-blue',
  read:        'badge-grey',
  replied:     'badge-green',
  archived:    'badge-grey',
}
