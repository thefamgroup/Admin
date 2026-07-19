'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import { settingsApi } from '@/lib/api/client'
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

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [dirty, setDirty] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [savedGroup, setSavedGroup] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

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

  const calcSettings = settings.filter((s) => s.group === 'calculator')

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
                      <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
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
                <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  Error: {saveError}
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
