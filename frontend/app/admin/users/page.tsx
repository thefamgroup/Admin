'use client'
import { useState, useEffect } from 'react'
import { authApi } from '@/lib/api/client'
import { useAuth } from '@/lib/hooks/useAuth'
import { ALL_PERMISSIONS, ROLE_PRESETS } from '@/lib/types'
import { Shield, UserPlus, Pencil, Trash2, ToggleLeft, ToggleRight, X, Check } from 'lucide-react'

const PERMISSION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inbox:     'Inbox',
  bookings:  'Bookings',
  quotes:    'Quotes & Invoices',
  leads:     'Leads',
  team:      'Team',
  settings:  'Settings',
  users:     'Manage Users',
}

function PermissionCheckboxes({ selected, onChange }: { selected: string[]; onChange: (p: string[]) => void }) {
  const toggle = (p: string) =>
    onChange(selected.includes(p) ? selected.filter(x => x !== p) : [...selected, p])
  return (
    <div className="grid grid-cols-2 gap-2 mt-1">
      {ALL_PERMISSIONS.map(p => (
        <label key={p} className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={selected.includes(p)}
            onChange={() => toggle(p)}
            className="h-4 w-4 rounded accent-green-600"
          />
          {PERMISSION_LABELS[p]}
        </label>
      ))}
    </div>
  )
}

function InviteModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', role: 'staff' })
  const [permissions, setPermissions] = useState<string[]>(ROLE_PRESETS.staff)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setPreset = (role: string) => {
    setForm(f => ({ ...f, role }))
    setPermissions([...(ROLE_PRESETS[role] ?? [])])
  }

  const submit = async () => {
    if (!form.email || !form.firstName || !form.lastName) { setError('All fields required'); return }
    setSaving(true); setError('')
    try {
      await authApi.invite({ ...form, permissions })
      onDone()
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="space-y-3 mb-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium">First name</label>
              <input className="input-base mt-0.5" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium">Last name</label>
              <input className="input-base mt-0.5" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Email address</label>
            <input type="email" className="input-base mt-0.5" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Start with preset</label>
            <div className="flex gap-2 mt-1">
              {['admin', 'manager', 'staff'].map(r => (
                <button
                  key={r}
                  onClick={() => setPreset(r)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize border transition-colors ${form.role === r ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}
                >{r}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Permissions</label>
            <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditModal({ user, onClose, onDone }: { user: any; onClose: () => void; onDone: () => void }) {
  const [permissions, setPermissions] = useState<string[]>(user.permissions ?? [])
  const [role, setRole] = useState(user.role ?? 'staff')
  const [saving, setSaving] = useState(false)

  const setPreset = (r: string) => {
    setRole(r)
    setPermissions([...(ROLE_PRESETS[r] ?? [])])
  }

  const submit = async () => {
    setSaving(true)
    try {
      await authApi.updatePermissions(user.id, permissions, role)
      onDone()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">{user.firstName} {user.lastName}</h2>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
          <button onClick={onClose}><X className="h-5 w-5 text-gray-400" /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-gray-500 font-medium">Quick preset</label>
          <div className="flex gap-2 mt-1">
            {['admin', 'manager', 'staff'].map(r => (
              <button
                key={r}
                onClick={() => setPreset(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium capitalize border transition-colors ${role === r ? 'bg-green-600 text-white border-green-600' : 'border-gray-200 text-gray-600 hover:border-green-400'}`}
              >{r}</button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <label className="text-xs text-gray-500 font-medium">Permissions</label>
          <PermissionCheckboxes selected={permissions} onChange={setPermissions} />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-outline px-4 py-2 text-sm">Cancel</button>
          <button onClick={submit} disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UsersPage() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [editing, setEditing] = useState<any | null>(null)

  const load = () => {
    setLoading(true)
    authApi.listUsers().then(setUsers).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleToggle = async (u: any) => {
    await authApi.toggleActive(u.id, !u.isActive)
    load()
  }

  const handleDelete = async (u: any) => {
    if (!confirm(`Remove ${u.firstName} ${u.lastName}? This cannot be undone.`)) return
    await authApi.deleteUser(u.id)
    load()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-green-600" />
          <div>
            <h1 className="text-xl font-bold">Users & Access</h1>
            <p className="text-sm text-gray-500">Invite team members and control what they can access</p>
          </div>
        </div>
        <button onClick={() => setInviting(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
          <UserPlus className="h-4 w-4" /> Invite User
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="rounded-xl border border-gray-100 bg-white p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-700 font-semibold text-sm flex-shrink-0">
                {u.firstName?.[0]}{u.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium capitalize bg-blue-50 text-blue-600">{u.role}</span>
                </div>
                <p className="text-xs text-gray-400">{u.email}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {(u.permissions ?? []).map((p: string) => (
                    <span key={p} className="rounded-md bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                      {PERMISSION_LABELS[p] ?? p}
                    </span>
                  ))}
                  {!(u.permissions?.length) && <span className="text-xs text-gray-400 italic">No permissions</span>}
                </div>
              </div>
              {u.id !== me?.id && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => setEditing(u)} title="Edit permissions" className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleToggle(u)} title={u.isActive ? 'Deactivate' : 'Activate'} className="p-2 text-gray-400 hover:text-amber-500 transition-colors">
                    {u.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                  </button>
                  <button onClick={() => handleDelete(u)} title="Remove user" className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              {u.id === me?.id && (
                <span className="text-xs text-gray-400 flex-shrink-0 flex items-center gap-1"><Check className="h-3 w-3 text-green-500" /> You</span>
              )}
            </div>
          ))}
        </div>
      )}

      {inviting && <InviteModal onClose={() => setInviting(false)} onDone={() => { setInviting(false); load() }} />}
      {editing  && <EditModal user={editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); load() }} />}
    </div>
  )
}
