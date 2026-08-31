'use client'

import { useEffect, useState } from 'react'
import {
  Save, Plus, Trash2, Shield, UserCheck, UserX, Mail, Users2, Pencil,
} from 'lucide-react'

import { settingsApi, authApi } from '@/lib/api/client'
import { useAuth } from '@/lib/hooks/useAuth'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Setting = {
  id: string
  key: string
  value: string
  label: string
  group: string
}

type AdminUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  permissions: string[]
  isActive: boolean
  createdAt: string
}

const GROUPS = [
  { key: 'business', label: 'Business' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'bookings', label: 'Bookings' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'calculator', label: 'Calculator' },
]

const BOOL_KEYS = [
  'notify.newBooking',
  'notify.newLead',
  'notify.newMessage',
  'notify.quoteOverdue',
  'pricing.vat',
  'booking.auto_convert',
]

const CALCULATOR_SECTIONS = [
  {
    label: 'Base Prices (£)',
    description: 'Starting price before size, frequency, or condition adjustments.',
    prefix: 'calculator.base.',
  },
  {
    label: 'Property Size Multipliers',
    description: 'Multiply the base price by this factor for each bedroom count.',
    prefix: 'calculator.size.',
  },
  {
    label: 'Frequency Multipliers',
    description: 'Discount applied for recurring bookings (1 = no discount).',
    prefix: 'calculator.freq.',
  },
  {
    label: 'Condition Multipliers',
    description: 'Premium for dirtier properties (1 = standard condition).',
    prefix: 'calculator.cond.',
  },
  {
    label: 'Add-On Prices (£)',
    description: 'Fixed price for each optional add-on service.',
    prefix: 'calculator.addon.',
  },
]

const ALL_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inbox',     label: 'Inbox' },
  { key: 'bookings',  label: 'Bookings' },
  { key: 'quotes',    label: 'Quotes & Invoices' },
  { key: 'leads',     label: 'Leads' },
  { key: 'team',      label: 'Team' },
  { key: 'settings',  label: 'Settings' },
  { key: 'users',     label: 'Users & Access' },
]

const ROLE_PRESETS: Record<string, string[]> = {
  admin:   ALL_PERMISSIONS.map(p => p.key),
  manager: ['dashboard', 'inbox', 'bookings', 'quotes', 'leads', 'team'],
  staff:   ['dashboard', 'inbox', 'bookings'],
}

const ROLE_BADGE: Record<string, string> = {
  admin:   'bg-green-500/15 text-green-400',
  manager: 'bg-blue-500/15 text-blue-400',
  staff:   'bg-secondary text-muted-foreground',
}

// ── Invite dialog ─────────────────────────────────────────────────────────────

const INVITE_EMPTY = {
  email: '', firstName: '', lastName: '', role: 'staff', permissions: ['dashboard', 'inbox', 'bookings'],
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState(INVITE_EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setRole = (role: string) => {
    setForm(f => ({ ...f, role, permissions: ROLE_PRESETS[role] ?? [] }))
  }

  const togglePerm = (key: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter(p => p !== key)
        : [...f.permissions, key],
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.email || !form.firstName || !form.lastName) {
      setError('All fields are required'); return
    }
    setSaving(true); setError('')
    try {
      await authApi.invite(form as { email: string; firstName: string; lastName: string; role: string; permissions: string[] })
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invite')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First Name</Label>
              <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name</Label>
              <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.permissions.includes(p.key)}
                    onChange={() => togglePerm(p.key)}
                    className="accent-green-500"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              <Mail className="h-4 w-4" />
              {saving ? 'Sending invite…' : 'Send Invite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Edit permissions dialog ───────────────────────────────────────────────────

function EditPermissionsDialog({
  user, onClose, onDone,
}: { user: AdminUser; onClose: () => void; onDone: () => void }) {
  const [permissions, setPermissions] = useState<string[]>(user.permissions ?? [])
  const [role, setRole] = useState(user.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setRolePreset = (r: string) => {
    setRole(r)
    setPermissions(ROLE_PRESETS[r] ?? [])
  }

  const togglePerm = (key: string) => {
    setPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    )
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError('')
    try {
      await authApi.updatePermissions(user.id, permissions, role)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permissions')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit — {user.firstName} {user.lastName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRolePreset}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Permissions</Label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_PERMISSIONS.map(p => (
                <label key={p.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={permissions.includes(p.key)}
                    onChange={() => togglePerm(p.key)}
                    className="accent-green-500"
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              <Shield className="h-4 w-4" />
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { can } = useAuth()

  const [settings, setSettings] = useState<Setting[]>([])
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedGroup, setSavedGroup] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Users state
  const [users, setUsers]             = useState<AdminUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [inviting, setInviting]       = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [togglingId, setTogglingId]   = useState<string | null>(null)
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const { user: me } = useAuth()

  useEffect(() => {
    settingsApi
      .list()
      .then((s) => setSettings(s as Setting[]))
      .catch(() => setSettings([]))
  }, [])

  const loadUsers = async () => {
    if (!can('users')) return
    setUsersLoading(true)
    try { setUsers(await authApi.listUsers()) }
    catch { /* ignore */ }
    finally { setUsersLoading(false) }
  }

  useEffect(() => { loadUsers() }, [])

  const getValue = (key: string) =>
    dirty[key] ?? settings.find((s) => s.key === key)?.value ?? ''

  const update = (key: string, value: string) => {
    setDirty((prev) => ({ ...prev, [key]: value }))
    setSavedGroup(null)
  }

  const isBool = (key: string) => BOOL_KEYS.includes(key)

  const save = async (group: string) => {
    setSaving(true)
    setSaveError(null)
    try {
      const groupKeys = settings
        .filter((s) => s.group === group)
        .map((s) => s.key)
      const bulk = Object.entries(dirty)
        .filter(([key]) => groupKeys.includes(key))
        .map(([key, value]) => {
          const s = settings.find((x) => x.key === key)
          return { key, value, label: s?.label, group: s?.group }
        })
      if (bulk.length > 0) await settingsApi.bulk(bulk)
      setSettings((prev) =>
        prev.map((s) =>
          dirty[s.key] !== undefined ? { ...s, value: dirty[s.key] } : s
        )
      )
      setDirty((prev) => {
        const next = { ...prev }
        groupKeys.forEach((k) => delete next[k])
        return next
      })
      setSavedGroup(group)
      setTimeout(() => setSavedGroup(null), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed — please try again')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user: AdminUser) => {
    setTogglingId(user.id)
    try {
      await authApi.toggleActive(user.id, !user.isActive)
      await loadUsers()
    } catch { /* ignore */ }
    finally { setTogglingId(null) }
  }

  const deleteUser = async (user: AdminUser) => {
    if (!confirm(`Delete ${user.firstName} ${user.lastName}? This cannot be undone.`)) return
    setDeletingId(user.id)
    try {
      await authApi.deleteUser(user.id)
      await loadUsers()
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  const calcSettings = settings.filter((s) => s.group === 'calculator')

  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your thefamgroup admin</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          {GROUPS.map((g) => (
            <TabsTrigger key={g.key} value={g.key}>
              {g.label}
            </TabsTrigger>
          ))}
          {can('users') && (
            <TabsTrigger value="users">
              <Users2 className="mr-1.5 h-3.5 w-3.5" />
              Users & Access
            </TabsTrigger>
          )}
        </TabsList>

        {/* Business / Notifications / Pricing tabs — generic renderer */}
        {GROUPS.filter((g) => g.key !== 'calculator').map((g) => {
          const groupSettings = settings.filter((s) => s.group === g.key)
          return (
            <TabsContent key={g.key} value={g.key}>
              <Card>
                <CardHeader>
                  <CardTitle>{g.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  {groupSettings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No settings in this group.
                    </p>
                  ) : (
                    groupSettings.map((s) =>
                      isBool(s.key) ? (
                        <div
                          key={s.key}
                          className="flex items-center justify-between border-b pb-4"
                        >
                          <div>
                            <p className="text-sm">{s.label}</p>
                            <p className="text-xs text-muted-foreground">
                              {s.key}
                            </p>
                          </div>
                          <Switch
                            checked={getValue(s.key) === 'true'}
                            onCheckedChange={(checked) =>
                              update(s.key, checked ? 'true' : 'false')
                            }
                            aria-label={s.label}
                          />
                        </div>
                      ) : (
                        <div key={s.key} className="space-y-1.5">
                          <Label htmlFor={s.key}>{s.label}</Label>
                          <Input
                            id={s.key}
                            value={getValue(s.key)}
                            onChange={(e) => update(s.key, e.target.value)}
                          />
                        </div>
                      )
                    )
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex items-center gap-3">
                      <Button onClick={() => save(g.key)} disabled={saving}>
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Save'}
                      </Button>
                      {savedGroup === g.key && (
                        <span className="text-sm text-green-500">Saved ✓</span>
                      )}
                    </div>
                    {saveError && (
                      <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                        Error: {saveError}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}

        {/* Calculator tab — structured by section */}
        <TabsContent value="calculator">
          <div className="space-y-6">
            {CALCULATOR_SECTIONS.map((section) => {
              const sectionSettings = calcSettings.filter((s) =>
                s.key.startsWith(section.prefix)
              )
              return (
                <Card key={section.prefix}>
                  <CardHeader>
                    <CardTitle className="text-base">{section.label}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {sectionSettings.map((s) => (
                        <div key={s.key} className="space-y-1.5">
                          <Label htmlFor={s.key} className="text-xs">
                            {s.label}
                          </Label>
                          <Input
                            id={s.key}
                            type="number"
                            step="0.01"
                            min="0"
                            value={getValue(s.key)}
                            onChange={(e) => update(s.key, e.target.value)}
                            className="h-9 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Button onClick={() => save('calculator')} disabled={saving}>
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving…' : 'Save Pricing'}
                </Button>
                {savedGroup === 'calculator' && (
                  <span className="text-sm text-green-500">Saved ✓ — website calculator updated</span>
                )}
              </div>
              {saveError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
                  Error: {saveError}
                </p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Users & Access tab */}
        {can('users') && (
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">Users & Access</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage who can access the admin panel and what they can do.
                  </p>
                </div>
                <Button onClick={() => setInviting(true)}>
                  <Plus className="h-4 w-4" /> Invite User
                </Button>
              </div>

              {usersLoading ? (
                <p className="text-sm text-muted-foreground">Loading users…</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No users found.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((u) => (
                    <Card key={u.id} className={u.id === me?.id ? 'ring-1 ring-green-500/40' : ''}>
                      <CardContent className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {u.firstName} {u.lastName}
                              {u.id === me?.id && (
                                <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                              )}
                            </p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${ROLE_BADGE[u.role] ?? ROLE_BADGE.staff}`}>
                              {u.role}
                            </span>
                            {!u.isActive && (
                              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">
                                Pending
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {(u.permissions ?? []).map(p => {
                              const label = ALL_PERMISSIONS.find(x => x.key === p)?.label ?? p
                              return (
                                <span
                                  key={p}
                                  className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground"
                                >
                                  {label}
                                </span>
                              )
                            })}
                          </div>
                        </div>
                        {u.id !== me?.id && (
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingUser(u)}
                              title="Edit permissions"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleActive(u)}
                              disabled={togglingId === u.id}
                              title={u.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {u.isActive
                                ? <UserX className="h-3.5 w-3.5 text-amber-400" />
                                : <UserCheck className="h-3.5 w-3.5 text-green-400" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => deleteUser(u)}
                              disabled={deletingId === u.id}
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        )}
      </Tabs>

      {inviting && (
        <InviteDialog
          onClose={() => setInviting(false)}
          onDone={() => { setInviting(false); loadUsers() }}
        />
      )}
      {editingUser && (
        <EditPermissionsDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onDone={() => { setEditingUser(null); loadUsers() }}
        />
      )}
    </div>
  )
}
