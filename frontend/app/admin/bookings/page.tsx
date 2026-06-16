'use client'
import { useEffect, useState } from 'react'
import { bookingsApi } from '@/lib/api/client'
import { formatDateTime, formatCurrency, statusColor, cn } from '@/lib/utils'
import type { Booking } from '@/lib/types'
import { Plus, Calendar, List, ChevronLeft, ChevronRight } from 'lucide-react'

const SERVICE_LABELS: Record<string, string> = {
  regular:'Regular Clean', deep:'Deep Clean', eot:'End of Tenancy',
  move_in_out:'Move In/Out', office:'Office', post_construction:'Post-Construction',
  airbnb:'Airbnb Reset', industrial:'Industrial',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [view, setView]         = useState<'list'|'calendar'>('list')
  const [loading, setLoading]   = useState(true)
  const [month, setMonth]       = useState(new Date())
  const [calJobs, setCalJobs]   = useState<Booking[]>([])

  useEffect(() => {
    bookingsApi.list()
      .then((r) => setBookings(r.items))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (view === 'calendar') {
      bookingsApi.calendar(month.getFullYear(), month.getMonth() + 1)
        .then(setCalJobs)
    }
  }, [view, month])

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1))
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1))

  const getDayJobs = (day: number) =>
    calJobs.filter((j) => new Date(j.scheduledAt).getDate() === day)

  const daysInMonth  = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const firstWeekday = new Date(month.getFullYear(), month.getMonth(), 1).getDay()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] text-[#f0f0f0]">Bookings</h1>
          <p className="text-[13px] text-[#666] mt-0.5">{bookings.length} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex bg-[#202020] border border-[#333] rounded-[8px] p-0.5">
            <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors', view === 'list' ? 'bg-[#282828] text-[#f0f0f0]' : 'text-[#666] hover:text-[#a0a0a0]')}>
              <List size={13} /> List
            </button>
            <button onClick={() => setView('calendar')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-[12px] font-medium transition-colors', view === 'calendar' ? 'bg-[#282828] text-[#f0f0f0]' : 'text-[#666] hover:text-[#a0a0a0]')}>
              <Calendar size={13} /> Calendar
            </button>
          </div>
          <button className="btn btn-primary btn-sm"><Plus size={14} /> New Booking</button>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Client</th><th>Service</th><th>Scheduled</th>
                  <th>Status</th><th>Price</th><th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={6}><div className="h-4 bg-[#202020] rounded animate-pulse" /></td></tr>
                  ))
                ) : bookings.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-[#444] py-10">No bookings yet</td></tr>
                ) : bookings.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <p className="td-main">{b.clientName}</p>
                      <p className="text-[11px] text-[#444] mt-0.5">{b.clientPhone}</p>
                    </td>
                    <td>{SERVICE_LABELS[b.serviceType] || b.serviceType}</td>
                    <td>{formatDateTime(b.scheduledAt)}</td>
                    <td><span className={`badge ${statusColor[b.status] || 'badge-grey'}`}>{b.status.replace('_', ' ')}</span></td>
                    <td className="font-semibold text-[#22c55e]">{b.price ? formatCurrency(Number(b.price)) : '—'}</td>
                    <td>{b.assignedTo || <span className="text-[#444]">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CALENDAR VIEW ── */}
      {view === 'calendar' && (
        <div className="card">
          <div className="card-header">
            <button onClick={prevMonth} className="btn btn-ghost btn-sm"><ChevronLeft size={14} /></button>
            <span className="font-display text-lg text-[#f0f0f0]">
              {month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
            </span>
            <button onClick={nextMonth} className="btn btn-ghost btn-sm"><ChevronRight size={14} /></button>
          </div>
          <div className="p-4">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
                <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wider text-[#444] py-2">{d}</div>
              ))}
            </div>
            {/* Calendar cells */}
            <div className="grid grid-cols-7 gap-2">
              {[...Array(firstWeekday)].map((_, i) => <div key={`blank-${i}`} />)}
              {[...Array(daysInMonth)].map((_, i) => {
                const day     = i + 1
                const isToday = new Date().getDate() === day && new Date().getMonth() === month.getMonth() && new Date().getFullYear() === month.getFullYear()
                const jobs    = getDayJobs(day)
                return (
                  <div key={day} className={cn('bg-[#202020] border rounded-[8px] p-2 min-h-[80px] cursor-pointer hover:border-[#22c55e] transition-colors', isToday ? 'border-[#22c55e] bg-[rgba(34,197,94,.05)]' : 'border-[#2a2a2a]')}>
                    <p className={cn('text-[13px] font-semibold mb-1', isToday ? 'text-[#22c55e]' : 'text-[#a0a0a0]')}>{day}</p>
                    {jobs.map((j) => (
                      <div key={j.id} className={cn('text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate text-white', j.serviceType === 'office' || j.serviceType === 'industrial' ? 'bg-[#2563eb]' : j.serviceType === 'eot' ? 'bg-[#7c3aed]' : 'bg-[#16a34a]')}>
                        {j.clientName}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
