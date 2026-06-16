'use client'
import { useEffect, useState } from 'react'
import { settingsApi } from '@/lib/api/client'
import { Save, Loader2 } from 'lucide-react'

const GROUPS = [
  { key: 'business',      label: '🏢 Business' },
  { key: 'notifications', label: '🔔 Notifications' },
  { key: 'pricing',       label: '💷 Pricing' },
]

type Setting = { id: string; key: string; value: string; label: string; group: string }

export default function SettingsPage() {
  const [activeGroup, setActiveGroup] = useState('business')
  const [settings, setSettings]       = useState<Setting[]>([])
  const [dirty, setDirty]             = useState<Record<string, string>>({})
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  useEffect(() => {
    settingsApi.list().then(setSettings)
  }, [])

  const grouped = settings.filter((s) => s.group === activeGroup)

  const update = (key: string, value: string) => {
    setDirty((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const getValue = (key: string) => dirty[key] ?? settings.find((s) => s.key === key)?.value ?? ''

  const save = async () => {
    setSaving(true)
    try {
      const bulk = Object.entries(dirty).map(([key, value]) => ({
        key, value,
        label: settings.find((s) => s.key === key)?.label,
        group: settings.find((s) => s.key === key)?.group,
      }))
      if (bulk.length > 0) await settingsApi.bulk(bulk)
      setSettings((prev) => prev.map((s) => dirty[s.key] !== undefined ? { ...s, value: dirty[s.key] } : s))
      setDirty({})
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }

  const isBool = (key: string) =>
    ['notify.newBooking','notify.newLead','notify.newMessage','notify.quoteOverdue','pricing.vat'].includes(key)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] text-[#f0f0f0]">Settings</h1>
          <p className="text-[13px] text-[#666] mt-0.5">Configure your thefamgroup admin</p>
        </div>
        <button onClick={save} disabled={saving || Object.keys(dirty).length === 0}
          className="btn btn-primary disabled:opacity-50">
          {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : saved ? '✓ Saved' : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      <div className="grid grid-cols-[200px_1fr] gap-5">
        {/* Left nav */}
        <div className="card p-2 h-fit">
          {GROUPS.map((g) => (
            <button key={g.key} onClick={() => setActiveGroup(g.key)}
              className={`w-full text-left px-3.5 py-2.5 rounded-[8px] text-[13px] transition-colors mb-0.5 ${activeGroup === g.key ? 'bg-[rgba(34,197,94,.1)] text-[#22c55e]' : 'text-[#a0a0a0] hover:bg-[#202020] hover:text-[#f0f0f0]'}`}>
              {g.label}
            </button>
          ))}
        </div>

        {/* Settings panel */}
        <div className="card p-6">
          <h2 className="font-semibold text-[#f0f0f0] mb-6 pb-4 border-b border-[#2a2a2a]">
            {GROUPS.find((g) => g.key === activeGroup)?.label}
          </h2>

          <div className="space-y-5">
            {grouped.length === 0 && <p className="text-[#444] text-sm">No settings in this group.</p>}
            {grouped.map((s) => (
              <div key={s.key} className={isBool(s.key) ? 'flex items-center justify-between py-3 border-b border-[#2a2a2a]' : 'space-y-1.5'}>
                {isBool(s.key) ? (
                  <>
                    <div>
                      <p className="text-[13px] text-[#f0f0f0]">{s.label}</p>
                      <p className="text-[11px] text-[#444]">{s.key}</p>
                    </div>
                    <button
                      onClick={() => update(s.key, getValue(s.key) === 'true' ? 'false' : 'true')}
                      className={`toggle ${getValue(s.key) === 'true' ? 'on' : ''}`}
                      role="switch" aria-checked={getValue(s.key) === 'true'}
                      aria-label={s.label}
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor={s.key} className="label">{s.label}</label>
                    <input id={s.key} className="input" value={getValue(s.key)}
                      onChange={(e) => update(s.key, e.target.value)} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
