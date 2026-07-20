'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Users, CalendarDays, List, ChevronLeft, ChevronRight } from 'lucide-react'

import { bookingsApi, teamApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { Booking, ServiceType, TeamMember } from '@/lib/types'
import { StatusBadge } from '@/components/data-table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const SERVICE_OPTIONS: { value: ServiceType; label: string }[] = [
  { value: 'regular', label: 'Regular Clean' },
  { value: 'deep', label: 'Deep Clean' },
  { value: 'eot', label: 'End of Tenancy' },
  { value: 'move_in_out', label: 'Move In/Out' },
  { value: 'office', label: 'Office' },
  { value: 'post_construction', label: 'Post-Construction' },
  { value: 'airbnb', label: 'Airbnb Reset' },
  { value: 'industrial', label: 'Industrial' },
]
const SERVICE_LABELS = Object.fromEntries(
  SERVICE_OPTIONS.map((s) => [s.value, s.label])
)

const EMPTY_FORM = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  address: '',
  serviceType: 'regular' as ServiceType,
  scheduledAt: '',
  notes: '',
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [team, setTeam] = useState<TeamMember[]>([])
  const [assignOpen, setAssignOpen] = useState<string | null>(null)
  const [assigning, setAssigning] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [calYear, setCalYear] = useState(() => new Date().getFullYear())
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth() + 1)
  const [calBookings, setCalBookings] = useState<Booking[]>([])

  const loadCalendar = (y: number, m: number) => {
    bookingsApi.calendar(y, m).then(setCalBookings).catch(() => setCalBookings([]))
  }

  const prevMonth = () => {
    const m = calMonth === 1 ? 12 : calMonth - 1
    const y = calMonth === 1 ? calYear - 1 : calYear
    setCalMonth(m); setCalYear(y); loadCalendar(y, m)
  }
  const nextMonth = () => {
    const m = calMonth === 12 ? 1 : calMonth + 1
    const y = calMonth === 12 ? calYear + 1 : calYear
    setCalMonth(m); setCalYear(y); loadCalendar(y, m)
  }

  const load = () => {
    setLoading(true)
    bookingsApi
      .list()
      .then((r) => setBookings(r.items))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    teamApi.list().then(setTeam).catch(() => {})
  }, [])

  const toggleEmployee = async (bookingId: string, employeeId: string, current: string[]) => {
    setAssigning(true)
    const isAdding = !current.includes(employeeId)
    const next = isAdding
      ? [...current, employeeId]
      : current.filter((id) => id !== employeeId)
    const names = next.map((id) => {
      const m = team.find((t) => t.id === id)
      return m ? `${m.firstName} ${m.lastName}` : id
    })
    await bookingsApi.update(bookingId, {
      assignedEmployeeIds: next,
      assignedTo: names.join(', '),
    } as any).catch(() => {})
    // Auto-dispatch WhatsApp notification when adding an employee
    if (isAdding) {
      await bookingsApi.dispatch(bookingId, employeeId).catch(() => {})
    }
    setAssigning(false)
    load()
  }

  const filtered = useMemo(
    () =>
      bookings.filter((b) => {
        const matchesSearch = b.clientName.toLowerCase().includes(search.toLowerCase())
        const matchesStatus = status === 'all' || b.status === status
        const bDate = new Date(b.scheduledAt)
        const matchesFrom = !dateFrom || bDate >= new Date(dateFrom)
        const matchesTo   = !dateTo   || bDate <= new Date(dateTo + 'T23:59:59')
        return matchesSearch && matchesStatus && matchesFrom && matchesTo
      }),
    [bookings, search, status, dateFrom, dateTo]
  )

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await bookingsApi.create({
        ...form,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
      })
      setOpen(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">{bookings.length} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-foreground text-background' : 'hover:bg-accent'}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => { setView('calendar'); loadCalendar(calYear, calMonth) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l ${view === 'calendar' ? 'bg-foreground text-background' : 'hover:bg-accent'}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> New Booking
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Booking</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={form.clientName}
                  onChange={(e) =>
                    setForm({ ...form, clientName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) =>
                      setForm({ ...form, clientEmail: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="clientPhone">Phone</Label>
                  <Input
                    id="clientPhone"
                    value={form.clientPhone}
                    onChange={(e) =>
                      setForm({ ...form, clientPhone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Service Type</Label>
                  <Select
                    value={form.serviceType}
                    onValueChange={(v) =>
                      setForm({ ...form, serviceType: v as ServiceType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="scheduledAt">Scheduled Date</Label>
                  <Input
                    id="scheduledAt"
                    type="date"
                    value={form.scheduledAt}
                    onChange={(e) =>
                      setForm({ ...form, scheduledAt: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create Booking'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ── Calendar view ─────────────────────────────────────────────── */}
      {view === 'calendar' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {new Date(calYear, calMonth - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="sm" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const daysInMonth = new Date(calYear, calMonth, 0).getDate()
              const firstDay = (new Date(calYear, calMonth - 1, 1).getDay() + 6) % 7 // Mon=0
              const cells: React.ReactNode[] = []
              for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} />)
              for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const dayBookings = calBookings.filter(b => b.scheduledAt?.startsWith(dateStr))
                const isToday = dateStr === new Date().toISOString().slice(0,10)
                cells.push(
                  <div key={d} className={`min-h-[80px] rounded-lg border p-1.5 ${isToday ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border'}`}>
                    <p className={`text-xs font-semibold mb-1 ${isToday ? 'text-green-600' : 'text-muted-foreground'}`}>{d}</p>
                    {dayBookings.map(b => (
                      <div key={b.id} className="mb-0.5 truncate rounded bg-green-100 dark:bg-green-900/40 px-1 py-0.5 text-[10px] font-medium text-green-800 dark:text-green-200">
                        {b.clientName}
                      </div>
                    ))}
                  </div>
                )
              }
              return (
                <div>
                  <div className="mb-1 grid grid-cols-7 gap-1 text-center">
                    {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                      <p key={d} className="text-xs font-medium text-muted-foreground py-1">{d}</p>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">{cells}</div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {view === 'list' && <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            <Input
              placeholder="Search client name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-48"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 text-xs" />
            </div>
            <div className="flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 text-xs" />
            </div>
            {(dateFrom || dateTo) && (
              <Button variant="ghost" size="sm" onClick={() => { setDateFrom(''); setDateTo('') }}>
                Clear dates
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Scheduled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Assigned To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No bookings found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">{b.clientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {b.clientPhone}
                      </div>
                    </TableCell>
                    <TableCell>
                      {SERVICE_LABELS[b.serviceType] ?? b.serviceType}
                    </TableCell>
                    <TableCell>
                      {b.scheduledAt
                        ? new Date(b.scheduledAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : <span className="text-muted-foreground text-xs">TBC</span>}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>
                      {b.price ? formatCurrency(Number(b.price)) : '—'}
                    </TableCell>
                    <TableCell>
                      {/* Multi-employee assignment */}
                      <div className="flex flex-col gap-1">
                        {assignOpen === b.id ? (
                          <div className="rounded-md border bg-popover p-2 shadow-md min-w-[180px]">
                            <p className="text-xs font-medium mb-1.5 text-muted-foreground">Assign staff</p>
                            {team.map((m) => {
                              const ids: string[] = (b as any).assignedEmployeeIds ?? []
                              const checked = ids.includes(m.id)
                              return (
                                <label key={m.id} className="flex items-center gap-2 py-1 cursor-pointer hover:text-foreground text-sm">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={assigning}
                                    onChange={() => toggleEmployee(b.id, m.id, ids)}
                                    className="accent-green-600"
                                  />
                                  {m.firstName} {m.lastName}
                                </label>
                              )
                            })}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="mt-1 h-6 text-xs w-full"
                              onClick={() => setAssignOpen(null)}
                            >Done</Button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAssignOpen(b.id)}
                            className="flex items-center gap-1 text-xs text-left hover:text-foreground text-muted-foreground"
                          >
                            <Users className="h-3 w-3" />
                            {b.assignedTo || 'Assign staff'}
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>}
    </div>
  )
}
