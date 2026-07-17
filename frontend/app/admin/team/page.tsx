'use client'

import { useEffect, useState } from 'react'
import { Plus, AlertTriangle, MessageCircle } from 'lucide-react'

import { teamApi } from '@/lib/api/client'
import { formatCurrency, formatDate, initials } from '@/lib/utils'
import type { TeamMember, MemberRole, MemberStatus } from '@/lib/types'
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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

const ROLES: MemberRole[] = ['cleaner', 'supervisor', 'driver']

const STATUS_VARIANT: Record<MemberStatus, 'green' | 'red' | 'amber'> = {
  active: 'green',
  inactive: 'red',
  on_leave: 'amber',
}

const MIN_WAGE = 11.44
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000

const dbsExpiringSoon = (dbs?: string) =>
  dbs ? new Date(dbs) < new Date(Date.now() + THIRTY_DAYS) : false

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'cleaner' as MemberRole,
  hourlyRate: '',
  dbsExpiry: '',
  whatsappPhone: '',
}

export default function TeamPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = () => {
    teamApi
      .list()
      .then(setTeam)
      .catch(() => setTeam([]))
  }

  useEffect(load, [])

  const lowWage = form.hourlyRate !== '' && Number(form.hourlyRate) < MIN_WAGE

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await teamApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        role: form.role,
        hourlyRate: Number(form.hourlyRate) || 0,
        ...(form.dbsExpiry ? { dbsExpiry: new Date(form.dbsExpiry).toISOString() } : {}),
        ...(form.whatsappPhone ? { whatsappPhone: form.whatsappPhone.replace(/\s/g, '') } : {}),
      })
      setOpen(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add member')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">{team.length} team members</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tEmail">Email</Label>
                <Input
                  id="tEmail"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select
                    value={form.role}
                    onValueChange={(v) =>
                      setForm({ ...form, role: v as MemberRole })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hourlyRate">Hourly Rate (£)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={form.hourlyRate}
                    onChange={(e) =>
                      setForm({ ...form, hourlyRate: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              {lowWage && (
                <p className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Below National Minimum Wage (£{MIN_WAGE})
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="dbsExpiry">DBS Expiry</Label>
                <Input
                  id="dbsExpiry"
                  type="date"
                  value={form.dbsExpiry}
                  onChange={(e) => setForm({ ...form, dbsExpiry: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="whatsappPhone">
                  WhatsApp Number
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (E.164 format — e.g. 447769240184)
                  </span>
                </Label>
                <Input
                  id="whatsappPhone"
                  type="tel"
                  placeholder="447769240184"
                  value={form.whatsappPhone}
                  onChange={(e) => setForm({ ...form, whatsappPhone: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground">
                  Required to send job dispatch messages via WhatsApp. Country code, no + or spaces.
                </p>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Add Member'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {team.length === 0 ? (
          <p className="text-sm text-muted-foreground">No team members yet</p>
        ) : (
          team.map((m) => {
            const expiring = dbsExpiringSoon(m.dbsExpiry)
            return (
              <Card key={m.id}>
                <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-600 text-sm font-semibold text-white">
                      {initials(`${m.firstName} ${m.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {m.firstName} {m.lastName}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {m.role}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[m.status] ?? 'grey'}>
                    {m.status.replace('_', ' ')}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hourly rate</span>
                    <span className="font-medium">{formatCurrency(Number(m.hourlyRate))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">DBS expiry</span>
                    <span className={expiring ? 'font-medium text-red-400' : 'font-medium'}>
                      {m.dbsExpiry ? formatDate(m.dbsExpiry) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-muted-foreground">Jobs</span>
                    <span className="font-medium text-xs">
                      {m.totalJobsSent ?? 0} sent · {m.totalJobsCompleted} done · {m.totalJobsCancelled ?? 0} cancelled
                    </span>
                  </div>
                  {m.whatsappPhone ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <MessageCircle className="h-3 w-3" />
                      WhatsApp enabled
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MessageCircle className="h-3 w-3" />
                      No WhatsApp set
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
