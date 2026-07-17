import Cookies from 'js-cookie'
import type { LoginResponse, Booking, Quote, Lead, Message, TeamMember, DashboardStats, Paginated } from '../types'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = Cookies.get('tfg_token')
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message?.error || err?.message || `HTTP ${res.status}`)
  }
  return res.json()
}

const get  = <T>(path: string) => request<T>(path)
const post = <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) })
const patch = <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) })
const del  = <T>(path: string) => request<T>(path, { method: 'DELETE' })

// ── Auth ──────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    post<LoginResponse>('/auth/login', { email, password }),
  me: () => get<{ id: string; email: string; firstName: string; lastName: string; role: string }>('/auth/me'),
}

// ── Dashboard ─────────────────────────────────────────────────────
export const dashboardApi = {
  getStats: () => get<DashboardStats>('/dashboard/stats'),
}

// ── Bookings ──────────────────────────────────────────────────────
export const bookingsApi = {
  list:       (params?: string) => get<Paginated<Booking>>(`/bookings${params ? '?' + params : ''}`),
  one:        (id: string) => get<Booking>(`/bookings/${id}`),
  stats:      () => get<any>('/bookings/stats'),
  calendar:   (year: number, month: number) => get<Booking[]>(`/bookings/calendar?year=${year}&month=${month}`),
  create:     (data: Partial<Booking>) => post<Booking>('/bookings', data),
  update:     (id: string, data: Partial<Booking>) => patch<Booking>(`/bookings/${id}`, data),
  remove:     (id: string) => del<void>(`/bookings/${id}`),
}

// ── Quotes ────────────────────────────────────────────────────────
export const quotesApi = {
  list:   (status?: string) => get<Quote[]>(`/quotes${status ? '?status=' + status : ''}`),
  one:    (id: string) => get<Quote>(`/quotes/${id}`),
  stats:  () => get<any>('/quotes/stats'),
  create: (data: Partial<Quote>) => post<Quote>('/quotes', data),
  update: (id: string, data: Partial<Quote>) => patch<Quote>(`/quotes/${id}`, data),
  remove: (id: string) => del<void>(`/quotes/${id}`),
}

// ── Leads ─────────────────────────────────────────────────────────
export const leadsApi = {
  list:    (status?: string) => get<Lead[]>(`/leads${status ? '?status=' + status : ''}`),
  kanban:  () => get<{ status: string; leads: Lead[] }[]>('/leads/kanban'),
  stats:   () => get<any>('/leads/stats'),
  one:     (id: string) => get<Lead>(`/leads/${id}`),
  create:  (data: Partial<Lead>) => post<Lead>('/leads', data),
  update:  (id: string, data: Partial<Lead>) => patch<Lead>(`/leads/${id}`, data),
  remove:  (id: string) => del<void>(`/leads/${id}`),
}

// ── Inbox ─────────────────────────────────────────────────────────
export const inboxApi = {
  list:     (status?: string) => get<Message[]>(`/inbox${status ? '?status=' + status : ''}`),
  one:      (id: string) => get<Message>(`/inbox/${id}`),
  create:   (data: Partial<Message>) => post<Message>('/inbox', data),
  update:   (id: string, data: Partial<Message>) => patch<Message>(`/inbox/${id}`, data),
  markRead: (id: string) => patch<Message>(`/inbox/${id}/read`, {}),
  unread:   () => get<number>('/inbox/unread-count'),
  reply:    (id: string, text: string) => post<{ sent: boolean }>(`/inbox/${id}/reply`, { text }),
}

// ── Team ──────────────────────────────────────────────────────────
export const teamApi = {
  list:   (status?: string) => get<TeamMember[]>(`/team${status ? '?status=' + status : ''}`),
  one:    (id: string) => get<TeamMember>(`/team/${id}`),
  stats:  () => get<any>('/team/stats'),
  create: (data: Partial<TeamMember>) => post<TeamMember>('/team', data),
  update: (id: string, data: Partial<TeamMember>) => patch<TeamMember>(`/team/${id}`, data),
  remove: (id: string) => del<void>(`/team/${id}`),
}

// ── Settings ──────────────────────────────────────────────────────
export const settingsApi = {
  list:   (group?: string) => get<any[]>(`/settings${group ? '?group=' + group : ''}`),
  upsert: (data: { key: string; value: string; label?: string; group?: string }) => post('/settings', data),
  bulk:   (settings: any[]) => post('/settings/bulk', { settings }),
}
