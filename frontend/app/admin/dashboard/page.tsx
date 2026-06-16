'use client'
import { useEffect, useState } from 'react'
import { dashboardApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/lib/types'
import { CalendarDays, FileText, Users2, Inbox, UsersRound, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'

function StatCard({ label, value, sub, color, icon: Icon }: {
  label: string; value: string | number; sub?: string; color: string; icon: React.ElementType
}) {
  return (
    <div className={`stat-card c-${color}`}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#a0a0a0]">{label}</p>
        <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center`}
          style={{ background: `var(--${color === 'green' ? 'green-bg' : color + '-bg'}, rgba(59,130,246,.1))` }}>
          <Icon size={15} className={color === 'green' ? 'text-[#22c55e]' : color === 'blue' ? 'text-[#3b82f6]' : color === 'amber' ? 'text-[#f59e0b]' : 'text-[#a855f7]'} />
        </div>
      </div>
      <p className="font-display text-[36px] text-[#f0f0f0] leading-none mb-1.5">{value}</p>
      {sub && <p className="text-[12px] text-[#666]">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardApi.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {[...Array(4)].map((_, i) => <div key={i} className="stat-card h-32 animate-pulse bg-[#1a1a1a]" />)}
    </div>
  )

  if (error) return (
    <div className="flex items-center gap-2 text-[#ef4444] text-sm">
      <AlertCircle size={16} /> {error}
    </div>
  )

  if (!stats) return null

  return (
    <div>
      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Bookings"    value={stats.bookings.total}     sub={`${stats.bookings.pending} pending`}       color="green"  icon={CalendarDays} />
        <StatCard label="Revenue (Paid)"    value={formatCurrency(stats.quotes.totalRevenue)} sub={`${stats.quotes.paid} quotes paid`}  color="blue"   icon={TrendingUp}   />
        <StatCard label="Active Leads"      value={stats.leads.total}        sub={`${stats.leads.byStatus.find(s=>s.status==='new')?.count ?? 0} new`} color="amber"  icon={Users2}       />
        <StatCard label="Unread Messages"   value={stats.inbox.unread}       sub="Needs attention"                           color="purple" icon={Inbox}        />
      </div>

      {/* ── TWO COL ── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Bookings breakdown */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <span className="card-title">Booking Overview</span>
            <Link href="/admin/bookings" className="text-[12px] text-[#22c55e] font-medium hover:underline">View all →</Link>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Pending',     count: stats.bookings.pending,   color: '#f59e0b' },
                { label: 'Confirmed',   count: stats.bookings.confirmed, color: '#3b82f6' },
                { label: 'Completed',   count: stats.bookings.completed, color: '#22c55e' },
                { label: 'Total',       count: stats.bookings.total,     color: '#a0a0a0' },
              ].map((s) => (
                <div key={s.label} className="bg-[#202020] rounded-[8px] p-4 text-center">
                  <p className="font-display text-2xl mb-1" style={{ color: s.color }}>{s.count}</p>
                  <p className="text-[11px] text-[#666] uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Leads funnel */}
            <div className="mt-5 pt-5 border-t border-[#2a2a2a]">
              <p className="text-[12px] font-semibold text-[#a0a0a0] uppercase tracking-wider mb-3">Leads Pipeline</p>
              <div className="space-y-2">
                {stats.leads.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center gap-3">
                    <span className="text-[12px] text-[#666] w-20 capitalize">{s.status}</span>
                    <div className="flex-1 h-1.5 bg-[#282828] rounded-full overflow-hidden">
                      <div className="h-full bg-[#22c55e] rounded-full transition-all"
                        style={{ width: `${Math.min(100, (s.count / Math.max(stats.leads.total, 1)) * 100)}%` }} />
                    </div>
                    <span className="text-[12px] text-[#a0a0a0] w-6 text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick links + team */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="card">
            <div className="card-header"><span className="card-title">Quick Actions</span></div>
            <div className="card-body space-y-2">
              {[
                { label: 'New Booking',  href: '/admin/bookings', icon: CalendarDays },
                { label: 'New Quote',    href: '/admin/quotes',   icon: FileText },
                { label: 'Add Lead',     href: '/admin/leads',    icon: Users2 },
                { label: 'Team Member',  href: '/admin/team',     icon: UsersRound },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] text-[#a0a0a0] hover:bg-[#202020] hover:text-[#f0f0f0] transition-colors">
                  <a.icon size={14} />
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Team summary */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Team</span>
              <Link href="/admin/team" className="text-[12px] text-[#22c55e] hover:underline">Manage →</Link>
            </div>
            <div className="card-body space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#a0a0a0]">Active cleaners</span>
                <span className="text-[13px] font-semibold text-[#22c55e]">{stats.team.active}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#a0a0a0]">Total team</span>
                <span className="text-[13px] font-semibold text-[#f0f0f0]">{stats.team.total}</span>
              </div>
              {stats.team.dbsExpiring > 0 && (
                <div className="flex items-center gap-2 bg-[rgba(245,158,11,.1)] border border-[rgba(245,158,11,.2)] text-[#f59e0b] text-[12px] px-3 py-2 rounded-[8px]">
                  <AlertCircle size={13} />
                  {stats.team.dbsExpiring} DBS expiring in 30 days
                </div>
              )}
            </div>
          </div>

          {/* Quote stats */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Quotes</span>
              <Link href="/admin/quotes" className="text-[12px] text-[#22c55e] hover:underline">View →</Link>
            </div>
            <div className="card-body space-y-3">
              {[
                { label: 'Awaiting response', value: stats.quotes.pending, color: '#3b82f6' },
                { label: 'Overdue',           value: stats.quotes.overdue, color: '#ef4444' },
                { label: 'Paid this period',  value: stats.quotes.paid,    color: '#22c55e' },
              ].map((q) => (
                <div key={q.label} className="flex justify-between">
                  <span className="text-[13px] text-[#a0a0a0]">{q.label}</span>
                  <span className="text-[13px] font-semibold" style={{ color: q.color }}>{q.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
