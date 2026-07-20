'use client'

import { useEffect, useState } from 'react'
import { Plus, Send, Check, BadgePoundSterling, MessageCircle, Loader2, Download } from 'lucide-react'

import { quotesApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { Quote, QuoteStatus } from '@/lib/types'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

const TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'paid', label: 'Paid' },
  { value: 'declined', label: 'Declined' },
  { value: 'overdue', label: 'Overdue' },
]

const STATUS_VARIANT: Record<QuoteStatus, 'grey' | 'blue' | 'green' | 'red'> = {
  draft: 'grey',
  sent: 'blue',
  accepted: 'green',
  paid: 'green',
  declined: 'red',
  overdue: 'red',
}

const EMPTY_FORM = {
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  serviceType: '',
  propertySize: '',
  subtotal: '',
}

export default function QuotesPage() {
  const [tab, setTab] = useState('all')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  const downloadPdf = async (id: string, clientName: string) => {
    setDownloading(id)
    try {
      const url = quotesApi.downloadPdf(id)
      const token = document.cookie.match(/tfg_token=([^;]+)/)?.[1] ?? ''
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `TFG-Quote-${clientName.replace(/\s+/g, '-')}.pdf`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      alert('Failed to download PDF')
    } finally {
      setDownloading(null)
    }
  }

  const load = (status: string) => {
    setLoading(true)
    quotesApi
      .list(status === 'all' ? undefined : status)
      .then(setQuotes)
      .catch(() => setQuotes([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(tab)
  }, [tab])

  const act = async (id: string, status: QuoteStatus) => {
    await quotesApi.update(id, { status })
    load(tab)
  }

  const sendWA = async (id: string) => {
    setSending(id)
    try {
      const res = await quotesApi.sendWhatsApp(id)
      if (res.sent) load(tab)
      else alert('Failed to send — check WhatsApp credentials in Render env vars')
    } catch {
      alert('Error sending quote via WhatsApp')
    } finally {
      setSending(null)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const subtotal = Number(form.subtotal) || 0
      await quotesApi.create({
        clientName: form.clientName,
        clientEmail: form.clientEmail,
        clientPhone: form.clientPhone,
        serviceType: form.serviceType,
        propertySize: form.propertySize,
        subtotal,
        addonsTotal: 0,
        total: subtotal,
      })
      setOpen(false)
      setForm(EMPTY_FORM)
      load(tab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quotes &amp; Invoices</h1>
          <p className="text-muted-foreground">Manage and track quotes</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> New Quote
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Quote</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="space-y-1.5">
                <Label htmlFor="qName">Client Name</Label>
                <Input
                  id="qName"
                  value={form.clientName}
                  onChange={(e) =>
                    setForm({ ...form, clientName: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qEmail">Email</Label>
                  <Input
                    id="qEmail"
                    type="email"
                    value={form.clientEmail}
                    onChange={(e) =>
                      setForm({ ...form, clientEmail: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qPhone">Phone</Label>
                  <Input
                    id="qPhone"
                    value={form.clientPhone}
                    onChange={(e) =>
                      setForm({ ...form, clientPhone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="qService">Service Type</Label>
                  <Input
                    id="qService"
                    value={form.serviceType}
                    onChange={(e) =>
                      setForm({ ...form, serviceType: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="qSize">Property Size</Label>
                  <Input
                    id="qSize"
                    value={form.propertySize}
                    onChange={(e) =>
                      setForm({ ...form, propertySize: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="qSubtotal">Amount (£)</Label>
                <Input
                  id="qSubtotal"
                  type="number"
                  step="0.01"
                  value={form.subtotal}
                  onChange={(e) =>
                    setForm({ ...form, subtotal: e.target.value })
                  }
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create Quote'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{tab} Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No quotes found
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>
                      <div className="font-medium">{q.clientName}</div>
                      <div className="text-xs text-muted-foreground">
                        {q.clientEmail}
                      </div>
                    </TableCell>
                    <TableCell>{q.serviceType}</TableCell>
                    <TableCell>{formatCurrency(Number(q.total))}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[q.status] ?? 'grey'}>
                        {q.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadPdf(q.id, q.clientName)}
                          disabled={downloading === q.id}
                          title="Download PDF"
                        >
                          {downloading === q.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Download className="h-3.5 w-3.5" />}
                          PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-green-600 border-green-600 hover:bg-green-50"
                          onClick={() => sendWA(q.id)}
                          disabled={sending === q.id}
                          title="Send PDF quote via WhatsApp"
                        >
                          {sending === q.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <MessageCircle className="h-3.5 w-3.5" />}
                          WhatsApp
                        </Button>
                        {q.status === 'draft' && (
                          <Button size="sm" variant="outline" onClick={() => act(q.id, 'sent')}>
                            <Send className="h-3.5 w-3.5" /> Send
                          </Button>
                        )}
                        {q.status === 'sent' && (
                          <Button size="sm" variant="outline" onClick={() => act(q.id, 'accepted')}>
                            <Check className="h-3.5 w-3.5" /> Accept
                          </Button>
                        )}
                        {(q.status === 'accepted' || q.status === 'sent') && (
                          <Button size="sm" onClick={() => act(q.id, 'paid')}>
                            <BadgePoundSterling className="h-3.5 w-3.5" /> Mark Paid
                          </Button>
                        )}
                      </div>
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
