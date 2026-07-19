'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, CheckCircle, CalendarCheck, Loader2 } from 'lucide-react'

import { leadsApi } from '@/lib/api/client'
import { formatDate } from '@/lib/utils'
import type { Lead, LeadStatus, LeadSource } from '@/lib/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: 'new', label: 'New' },
  { status: 'contacted', label: 'Contacted' },
  { status: 'quoted', label: 'Quoted' },
  { status: 'won', label: 'Won' },
  { status: 'lost', label: 'Lost' },
]

const STATUS_VARIANT: Record<LeadStatus, 'blue' | 'amber' | 'purple' | 'green' | 'red'> = {
  new: 'blue',
  contacted: 'amber',
  quoted: 'purple',
  won: 'green',
  lost: 'red',
}

const SOURCES: LeadSource[] = ['website', 'whatsapp', 'email', 'phone', 'referral']

const EMPTY_FORM = {
  name: '',
  email: '',
  phone: '',
  source: 'website' as LeadSource,
  notes: '',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const load = () => {
    leadsApi.list().then(setLeads).catch(() => setLeads([]))
  }

  useEffect(load, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  const handleMarkWon = async (id: string) => {
    setActionId(id)
    try {
      const res = await leadsApi.markWon(id)
      load()
      showToast(
        res.bookingCreated
          ? 'Lead marked as won — booking created automatically'
          : 'Lead marked as won — click "Create Booking" when payment is confirmed'
      )
    } catch {
      showToast('Failed to update lead')
    } finally {
      setActionId(null)
    }
  }

  const handleConvert = async (id: string) => {
    setActionId(id)
    try {
      await leadsApi.convertToBooking(id)
      load()
      showToast('Booking created — find it in the Bookings page to set the date and assign staff')
    } catch {
      showToast('Failed to create booking')
    } finally {
      setActionId(null)
    }
  }

  const byStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    COLUMNS.forEach((c) => (map[c.status] = []))
    leads.forEach((l) => { if (map[l.status]) map[l.status].push(l) })
    return map
  }, [leads])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await leadsApi.create(form)
      setOpen(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{leads.length} total leads</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Lead</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="lName">Name</Label>
                <Input
                  id="lName"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="lEmail">Email</Label>
                  <Input
                    id="lEmail"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lPhone">Phone</Label>
                  <Input
                    id="lPhone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v as LeadSource })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SOURCES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lNotes">Notes</Label>
                <Textarea
                  id="lNotes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Lead'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {COLUMNS.map((col) => (
          <Card key={col.status} className="flex-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>{col.label}</span>
                <Badge variant="grey">{byStatus[col.status].length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {byStatus[col.status].length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads</p>
              ) : (
                byStatus[col.status].map((lead) => (
                  <Card key={lead.id} className="bg-secondary/40">
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{lead.name}</p>
                        <Badge variant={STATUS_VARIANT[lead.status]}>{lead.status}</Badge>
                      </div>
                      {lead.phone && (
                        <p className="text-xs text-muted-foreground">{lead.phone}</p>
                      )}
                      {(lead as any).serviceInterest && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {(lead as any).serviceInterest}
                        </p>
                      )}
                      {(lead as any).estimatedValue && (
                        <p className="text-xs font-medium text-green-600">
                          £{Number((lead as any).estimatedValue).toFixed(0)}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground capitalize">{lead.source} · {formatDate(lead.createdAt)}</p>

                      {/* Action buttons based on status */}
                      {lead.status === 'quoted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-green-600 border-green-600 hover:bg-green-50 mt-1"
                          onClick={() => handleMarkWon(lead.id)}
                          disabled={actionId === lead.id}
                        >
                          {actionId === lead.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CheckCircle className="h-3 w-3" />}
                          Mark Won (Payment Received)
                        </Button>
                      )}
                      {lead.status === 'won' && (
                        <Button
                          size="sm"
                          className="w-full mt-1"
                          onClick={() => handleConvert(lead.id)}
                          disabled={actionId === lead.id}
                        >
                          {actionId === lead.id
                            ? <Loader2 className="h-3 w-3 animate-spin" />
                            : <CalendarCheck className="h-3 w-3" />}
                          Create Booking
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
