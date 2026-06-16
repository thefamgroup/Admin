'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import { settingsApi } from '@/lib/api/client'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Setting = {
  id: string
  key: string
  value: string
  label: string
  group: string
}

const GROUPS = [
  { key: 'business', label: 'Business' },
  { key: 'notifications', label: 'Notifications' },
  { key: 'pricing', label: 'Pricing' },
]

const BOOL_KEYS = [
  'notify.newBooking',
  'notify.newLead',
  'notify.newMessage',
  'notify.quoteOverdue',
  'pricing.vat',
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedGroup, setSavedGroup] = useState<string | null>(null)

  useEffect(() => {
    settingsApi
      .list()
      .then((s) => setSettings(s as Setting[]))
      .catch(() => setSettings([]))
  }, [])

  const getValue = (key: string) =>
    dirty[key] ?? settings.find((s) => s.key === key)?.value ?? ''

  const update = (key: string, value: string) => {
    setDirty((prev) => ({ ...prev, [key]: value }))
    setSavedGroup(null)
  }

  const isBool = (key: string) => BOOL_KEYS.includes(key)

  const save = async (group: string) => {
    setSaving(true)
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
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
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
        </TabsList>

        {GROUPS.map((g) => {
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

                  <div className="flex items-center gap-3 pt-2">
                    <Button onClick={() => save(g.key)} disabled={saving}>
                      <Save className="h-4 w-4" />
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    {savedGroup === g.key && (
                      <span className="text-sm text-green-500">Saved</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )
        })}
      </Tabs>
    </div>
  )
}
