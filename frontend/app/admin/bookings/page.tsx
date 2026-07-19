'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'

import { bookingsApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { Booking, ServiceType } from '@/lib/types'
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

  const load = () => {
    setLoading(true)
    bookingsApi
      .list()
      .then((r) => setBookings(r.items))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

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

      <Card>
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
                      {new Date(b.scheduledAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={b.status} />
                    </TableCell>
                    <TableCell>
                      {b.price ? formatCurrency(Number(b.price)) : '—'}
                    </TableCell>
                    <TableCell>
                      {b.assignedTo ?? (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
