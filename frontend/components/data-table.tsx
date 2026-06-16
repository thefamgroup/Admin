'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { bookingsApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { Booking, BookingStatus } from '@/lib/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const SERVICE_LABELS: Record<string, string> = {
  regular: 'Regular Clean',
  deep: 'Deep Clean',
  eot: 'End of Tenancy',
  move_in_out: 'Move In/Out',
  office: 'Office',
  post_construction: 'Post-Construction',
  airbnb: 'Airbnb Reset',
  industrial: 'Industrial',
}

const STATUS_VARIANT: Record<
  BookingStatus,
  'amber' | 'blue' | 'purple' | 'green' | 'red'
> = {
  pending: 'amber',
  confirmed: 'blue',
  in_progress: 'purple',
  completed: 'green',
  cancelled: 'red',
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status] ?? 'grey'}>
      {status.replace('_', ' ')}
    </Badge>
  )
}

const PAGE_SIZE = 10

export default function DataTable() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)

  useEffect(() => {
    bookingsApi
      .list()
      .then((r) => setBookings(r.items))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const matchesSearch = b.clientName
        .toLowerCase()
        .includes(search.toLowerCase())
      const matchesStatus = status === 'all' || b.status === status
      return matchesSearch && matchesStatus
    })
  }, [bookings, search, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Bookings</CardTitle>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Input
            placeholder="Search client name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="sm:max-w-xs"
          />
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v)
              setPage(1)
            }}
          >
            <SelectTrigger className="sm:w-[180px]">
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
            ) : paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No bookings found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((b) => (
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

        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            {filtered.length} booking{filtered.length === 1 ? '' : 's'} · Page{' '}
            {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
