'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  CalendarCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  GripVertical,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react'

import { leadsApi } from '@/lib/api/client'
import { formatDate } from '@/lib/utils'
import type { Lead, LeadSource, LeadStatus } from '@/lib/types'
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
} from '@/components/ui/dialog'

// ─── constants ────────────────────────────────────────────────────────────────

const COLUMNS: {
  status: LeadStatus
  label: string
  color: string
  headerBg: string
  dot: string
}[] = [
  { status: 'new',       label: 'New',       color: 'text-slate-600',  headerBg: 'bg-slate-100',  dot: 'bg-slate-400'  },
  { status: 'contacted', label: 'Contacted', color: 'text-amber-700',  headerBg: 'bg-amber-50',   dot: 'bg-amber-400'  },
  { status: 'quoted',    label: 'Quoted',    color: 'text-violet-700', headerBg: 'bg-violet-50',  dot: 'bg-violet-500' },
  { status: 'won',       label: 'Won',       color: 'text-green-700',  headerBg: 'bg-green-50',   dot: 'bg-green-500'  },
  { status: 'lost',      label: 'Lost',      color: 'text-red-600',    headerBg: 'bg-red-50',     dot: 'bg-red-400'    },
]

const STATUS_ORDER: LeadStatus[] = ['new', 'contacted', 'quoted', 'won', 'lost']

const SOURCES: LeadSource[] = ['website', 'whatsapp', 'email', 'phone', 'referral']

const SOURCE_STYLE: Record<LeadSource, string> = {
  website:  'bg-blue-100 text-blue-700',
  whatsapp: 'bg-emerald-100 text-emerald-700',
  email:    'bg-purple-100 text-purple-700',
  phone:    'bg-orange-100 text-orange-700',
  referral: 'bg-teal-100 text-teal-700',
}

const EMPTY_FORM = {
  name: '', email: '', phone: '', address: '', serviceInterest: '',
  propertyType: '', source: 'website' as LeadSource, estimatedValue: '',
  assignedTo: '', notes: '', followUpAt: '',
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name.split(' ').map(n => n[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function colPipelineValue(leads: Lead[]) {
  const total = leads.reduce((s, l) => s + (Number(l.estimatedValue) || 0), 0)
  return total > 0 ? `£${total.toFixed(0)}` : null
}

// ─── drag overlay preview ─────────────────────────────────────────────────────

function CardPreview({ lead }: { lead: Lead }) {
  return (
    <div className="w-64 rotate-1 rounded-xl border border-gray-200 bg-white p-3 shadow-2xl">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
          {getInitials(lead.name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{lead.name}</p>
          {lead.phone && <p className="text-xs text-gray-400">{lead.phone}</p>}
        </div>
      </div>
      {lead.estimatedValue && (
        <p className="mt-1.5 text-xs font-semibold text-green-600">
          £{Number(lead.estimatedValue).toFixed(0)}
        </p>
      )}
    </div>
  )
}

// ─── draggable card ───────────────────────────────────────────────────────────

interface CardProps {
  lead: Lead
  actionId: string | null
  onStatusChange: (id: string, status: LeadStatus) => void
  onMarkWon: (id: string) => void
  onConvert: (id: string) => void
  onEdit: (lead: Lead) => void
  onDelete: (lead: Lead) => void
}

function DraggableCard({
  lead, actionId, onStatusChange, onMarkWon, onConvert, onEdit, onDelete,
}: CardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { status: lead.status },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0 : 1,
  }

  const idx = STATUS_ORDER.indexOf(lead.status)
  const prevStatus = idx > 0 ? STATUS_ORDER[idx - 1] : null
  const isBusy = actionId === lead.id

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      {/* drag handle + edit/delete */}
      <div className="flex items-center justify-between px-3 pt-2.5">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab rounded p-0.5 text-gray-300 hover:text-gray-400 active:cursor-grabbing"
          title="Drag to move between columns"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(lead)}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Edit lead"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(lead)}
            className="rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
            title="Delete lead"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="space-y-2 px-3 pb-3 pt-1">
        {/* avatar + name + source */}
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700">
            {getInitials(lead.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight">{lead.name}</p>
            <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-xs font-medium capitalize ${SOURCE_STYLE[lead.source]}`}>
              {lead.source}
            </span>
          </div>
        </div>

        {/* contact info */}
        {lead.phone && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Phone className="h-3 w-3 flex-shrink-0" />
            <span>{lead.phone}</span>
          </div>
        )}
        {lead.email && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Mail className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.address && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="h-3 w-3 flex-shrink-0" />
            <span className="line-clamp-1">{lead.address}</span>
          </div>
        )}

        {/* service + estimated value */}
        {(lead.serviceInterest || lead.estimatedValue) && (
          <div className="flex items-center justify-between gap-2">
            {lead.serviceInterest && (
              <span className="truncate rounded-md bg-gray-100 px-1.5 py-0.5 text-xs capitalize text-gray-600">
                {lead.serviceInterest}
              </span>
            )}
            {lead.estimatedValue && (
              <span className="flex-shrink-0 text-xs font-semibold text-green-600">
                £{Number(lead.estimatedValue).toFixed(0)}
              </span>
            )}
          </div>
        )}

        {lead.notes && (
          <p className="line-clamp-2 text-xs italic text-gray-400">{lead.notes}</p>
        )}

        <p className="text-xs text-gray-400">{formatDate(lead.createdAt)}</p>

        {/* primary CTAs */}
        <div className="space-y-1.5 pt-0.5">
          {lead.status === 'new' && (
            <button
              onClick={() => onStatusChange(lead.id, 'contacted')}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
            >
              <Phone className="h-3 w-3" /> Mark as Contacted
            </button>
          )}
          {(lead.status === 'new' || lead.status === 'contacted') && (
            <button
              onClick={() => onStatusChange(lead.id, 'quoted')}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-2 py-1.5 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100"
            >
              <FileText className="h-3 w-3" /> Send Quote
            </button>
          )}
          {lead.status === 'quoted' && (
            <button
              onClick={() => onMarkWon(lead.id)}
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-green-300 bg-green-50 px-2 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 disabled:opacity-60"
            >
              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              Mark Won (Payment Received)
            </button>
          )}
          {lead.status === 'won' && (
            <button
              onClick={() => onConvert(lead.id)}
              disabled={isBusy}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-60"
            >
              {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarCheck className="h-3 w-3" />}
              Create Booking
            </button>
          )}
          {lead.status === 'lost' && (
            <button
              onClick={() => onStatusChange(lead.id, 'new')}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100"
            >
              <RotateCcw className="h-3 w-3" /> Re-activate
            </button>
          )}
        </div>

        {/* back + mark lost secondary buttons */}
        <div className="flex gap-1.5">
          {prevStatus && lead.status !== 'won' && lead.status !== 'lost' && (
            <button
              onClick={() => onStatusChange(lead.id, prevStatus)}
              className="flex flex-1 items-center justify-center gap-0.5 rounded-lg border border-gray-200 py-1 text-xs text-gray-400 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600"
              title={`Move back to ${prevStatus}`}
            >
              <ChevronLeft className="h-3 w-3" /> Back
            </button>
          )}
          {(lead.status === 'new' || lead.status === 'contacted' || lead.status === 'quoted') && (
            <button
              onClick={() => onStatusChange(lead.id, 'lost')}
              className="flex flex-1 items-center justify-center gap-0.5 rounded-lg border border-red-100 py-1 text-xs text-red-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              Mark Lost <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── droppable column ─────────────────────────────────────────────────────────

function DroppableColumn({
  col,
  leads,
  isOver,
  children,
}: {
  col: (typeof COLUMNS)[number]
  leads: Lead[]
  isOver: boolean
  children: React.ReactNode
}) {
  const { setNodeRef } = useDroppable({ id: col.status })
  const pipelineValue = colPipelineValue(leads)

  return (
    <div className="flex w-64 flex-shrink-0 flex-col lg:min-w-[200px] lg:flex-1">
      {/* column header */}
      <div className={`mb-3 flex items-center justify-between rounded-xl px-3 py-2 ${col.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${col.dot}`} />
          <span className={`text-sm font-semibold ${col.color}`}>{col.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {pipelineValue && (
            <span className="text-xs font-medium text-green-600">{pipelineValue}</span>
          )}
          <span className={`rounded-full border border-current/20 px-2 py-0.5 text-xs font-semibold ${col.color}`}>
            {leads.length}
          </span>
        </div>
      </div>

      {/* droppable area */}
      <div
        ref={setNodeRef}
        className={`min-h-32 flex-1 space-y-2.5 rounded-xl p-2 transition-colors ${
          isOver
            ? 'bg-green-50/60 outline-dashed outline-2 outline-green-300'
            : 'bg-gray-50/50'
        }`}
      >
        {leads.length === 0 && !isOver && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-xs text-gray-400">Drop here</p>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// ─── shared form fields ───────────────────────────────────────────────────────

type FormData = typeof EMPTY_FORM

function LeadFormFields({ form, onChange }: { form: FormData; onChange: (f: FormData) => void }) {
  const set = (key: keyof FormData, val: string) => onChange({ ...form, [key]: val })
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="lf-name">Name *</Label>
        <Input id="lf-name" value={form.name} onChange={e => set('name', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lf-email">Email</Label>
          <Input id="lf-email" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-phone">Phone</Label>
          <Input id="lf-phone" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lf-address">Address</Label>
        <Input id="lf-address" value={form.address} onChange={e => set('address', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lf-service">Service Interest</Label>
          <Input id="lf-service" placeholder="e.g. Deep clean" value={form.serviceInterest} onChange={e => set('serviceInterest', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-property">Property Type</Label>
          <Input id="lf-property" placeholder="e.g. 3-bed house" value={form.propertyType} onChange={e => set('propertyType', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Source</Label>
          <Select value={form.source} onValueChange={v => set('source', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOURCES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-value">Est. Value (£)</Label>
          <Input id="lf-value" type="number" min="0" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="lf-assigned">Assigned To</Label>
          <Input id="lf-assigned" placeholder="Team member" value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lf-followup">Follow-up Date</Label>
          <Input id="lf-followup" type="date" value={form.followUpAt} onChange={e => set('followUpAt', e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lf-notes">Notes</Label>
        <Textarea id="lf-notes" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
      </div>
    </div>
  )
}

// ─── add lead modal ───────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      await leadsApi.create({
        ...form,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        followUpAt: form.followUpAt || undefined,
      } as Partial<Lead>)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add lead')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Add Lead</DialogTitle></DialogHeader>
        <form onSubmit={submit}>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <LeadFormFields form={form} onChange={setForm} />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {saving ? 'Adding…' : 'Add Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── edit lead modal ──────────────────────────────────────────────────────────

function EditLeadModal({ lead, onClose, onDone }: { lead: Lead; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState<FormData>({
    name:            lead.name ?? '',
    email:           lead.email ?? '',
    phone:           lead.phone ?? '',
    address:         lead.address ?? '',
    serviceInterest: lead.serviceInterest ?? '',
    propertyType:    lead.propertyType ?? '',
    source:          lead.source ?? 'website',
    estimatedValue:  lead.estimatedValue != null ? String(lead.estimatedValue) : '',
    assignedTo:      lead.assignedTo ?? '',
    notes:           lead.notes ?? '',
    followUpAt:      lead.followUpAt ? lead.followUpAt.slice(0, 10) : '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required'); return }
    setSaving(true); setError('')
    try {
      await leadsApi.update(lead.id, {
        ...form,
        estimatedValue: form.estimatedValue ? Number(form.estimatedValue) : undefined,
        followUpAt: form.followUpAt || undefined,
      } as Partial<Lead>)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Edit — {lead.name}</DialogTitle></DialogHeader>
        <form onSubmit={submit}>
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
          <LeadFormFields form={form} onChange={setForm} />
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads]       = useState<Lead[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId]     = useState<string | null>(null)
  const [actionId, setActionId] = useState<string | null>(null)
  const [adding, setAdding]     = useState(false)
  const [editing, setEditing]   = useState<Lead | null>(null)
  const [toast, setToast]       = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const load = useCallback(() => {
    leadsApi.list().then(setLeads).catch(() => setLeads([]))
  }, [])

  useEffect(() => { load() }, [load])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 4500)
  }

  const byStatus = useMemo(() => {
    const map: Record<string, Lead[]> = {}
    COLUMNS.forEach(c => (map[c.status] = []))
    leads.forEach(l => { if (map[l.status]) map[l.status].push(l) })
    return map
  }, [leads])

  const activeLead = leads.find(l => l.id === activeId) ?? null

  const handleStatusChange = useCallback(async (id: string, status: LeadStatus) => {
    const prev = leads.find(l => l.id === id)
    if (!prev || prev.status === status) return
    // optimistic update
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l))
    try {
      await leadsApi.update(id, { status } as Partial<Lead>)
      const col = COLUMNS.find(c => c.status === status)
      showToast(`Moved to ${col?.label ?? status}`)
    } catch {
      setLeads(ls => ls.map(l => l.id === id ? { ...l, status: prev.status } : l))
      showToast('Failed to update status')
    }
  }, [leads])

  const handleMarkWon = async (id: string) => {
    setActionId(id)
    try {
      const res = await leadsApi.markWon(id)
      load()
      showToast(
        res.bookingCreated
          ? 'Lead won — booking created automatically'
          : 'Lead won — click "Create Booking" when payment confirmed',
      )
    } catch { showToast('Failed to mark lead as won') }
    finally { setActionId(null) }
  }

  const handleConvert = async (id: string) => {
    setActionId(id)
    try {
      await leadsApi.convertToBooking(id)
      load()
      showToast('Booking created — find it in Bookings to set a date and assign staff')
    } catch { showToast('Failed to create booking') }
    finally { setActionId(null) }
  }

  const handleDelete = async (lead: Lead) => {
    if (!confirm(`Remove ${lead.name}? This cannot be undone.`)) return
    setLeads(ls => ls.filter(l => l.id !== lead.id))
    try {
      await leadsApi.remove(lead.id)
      showToast('Lead removed')
    } catch {
      load()
      showToast('Failed to remove lead')
    }
  }

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string)
  }

  const handleDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null)
    setOverId(null)
    if (!over) return
    const targetStatus = over.id as LeadStatus
    if (!STATUS_ORDER.includes(targetStatus)) return
    await handleStatusChange(active.id as string, targetStatus)
  }

  const totalPipeline = leads
    .filter(l => l.status !== 'lost')
    .reduce((s, l) => s + (Number(l.estimatedValue) || 0), 0)

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:p-6">
      {/* toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground">
            {leads.length} lead{leads.length !== 1 ? 's' : ''}
            {totalPipeline > 0 && ` · £${totalPipeline.toFixed(0)} pipeline`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-gray-400 sm:block">
            Drag cards between columns or use the buttons to update status
          </p>
          <Button onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add Lead
          </Button>
        </div>
      </div>

      {/* kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={({ over }) => setOverId(over ? (over.id as string) : null)}
        onDragEnd={handleDragEnd}
        onDragCancel={() => { setActiveId(null); setOverId(null) }}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <DroppableColumn
              key={col.status}
              col={col}
              leads={byStatus[col.status]}
              isOver={overId === col.status}
            >
              {byStatus[col.status].map(lead => (
                <DraggableCard
                  key={lead.id}
                  lead={lead}
                  actionId={actionId}
                  onStatusChange={handleStatusChange}
                  onMarkWon={handleMarkWon}
                  onConvert={handleConvert}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                />
              ))}
            </DroppableColumn>
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease' }}>
          {activeLead ? <CardPreview lead={activeLead} /> : null}
        </DragOverlay>
      </DndContext>

      {adding && (
        <AddLeadModal
          onClose={() => setAdding(false)}
          onDone={() => { setAdding(false); load() }}
        />
      )}
      {editing && (
        <EditLeadModal
          lead={editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); load() }}
        />
      )}
    </div>
  )
}
