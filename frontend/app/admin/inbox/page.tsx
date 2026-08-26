'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MailOpen, Inbox as InboxIcon, Send, MessageCircle,
  UserCheck, BookOpen, RefreshCw, PhoneOff,
} from 'lucide-react'

import { inboxApi, contextApi, teamApi, whatsappApi } from '@/lib/api/client'
import { formatDateTime, initials, cn } from '@/lib/utils'
import type { Message, TeamMember, Lead, Booking } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const SOURCE_COLOURS: Record<string, 'green' | 'grey' | 'amber'> = {
  whatsapp: 'green', web: 'grey', email: 'amber',
}

// ── Notification sound (Web Audio API — no package needed) ────────────────────
function playNotificationSound() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.setValueAtTime(880, ctx.currentTime)
    o.frequency.setValueAtTime(660, ctx.currentTime + 0.1)
    g.gain.setValueAtTime(0.3, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4)
    o.start(ctx.currentTime)
    o.stop(ctx.currentTime + 0.4)
  } catch { /* AudioContext blocked before user gesture — silent fail */ }
}

export default function InboxPage() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [replyText, setReplyText]     = useState('')
  const [sending, setSending]         = useState(false)
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [endingChat, setEndingChat]   = useState(false)
  const [team, setTeam]               = useState<TeamMember[]>([])
  const [ctxLeads, setCtxLeads]       = useState<Lead[]>([])
  const [ctxBookings, setCtxBookings] = useState<Booking[]>([])
  const prevUnread = useRef(0)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  // ── Load messages ──────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    try {
      const data = await inboxApi.list()
      const unread = data.filter((m) => m.status === 'unread').length
      if (!silent && unread > prevUnread.current) playNotificationSound()
      prevUnread.current = unread
      setMessages(data)
    } catch { /* ignore */ }
  }, [])

  // Initial load + team
  useEffect(() => {
    load()
    teamApi.list().then(setTeam).catch(() => {})
  }, [load])

  // Auto-refresh every 2 seconds
  useEffect(() => {
    const id = setInterval(() => load(true), 2000)
    return () => clearInterval(id)
  }, [load])

  const selected = messages.find((m) => m.id === selectedId) ?? null

  // ── Customer context panel ─────────────────────────────────────────────────
  useEffect(() => {
    setCtxLeads([])
    setCtxBookings([])
    if (!selected) return
    const phone = (selected as any).waFrom || selected.senderPhone
    if (!phone) return
    contextApi.leadsByPhone(phone).then(setCtxLeads).catch(() => {})
    contextApi.bookingsByPhone(phone).then(setCtxBookings).catch(() => {})
  }, [selected?.id])

  // ── Select message ─────────────────────────────────────────────────────────
  const select = (m: Message) => {
    setSelectedId(m.id)
    setReplyText('')
    setReplyStatus('idle')
    if (m.status === 'unread') markRead(m.id)
  }

  const markRead = async (id: string) => {
    await inboxApi.markRead(id).catch(() => {})
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m)))
  }

  // ── Reply ──────────────────────────────────────────────────────────────────
  const sendReply = async () => {
    if (!selected || !replyText.trim()) return
    setSending(true); setReplyStatus('idle')
    try {
      const res = await inboxApi.reply(selected.id, replyText.trim())
      if (res.sent) { setReplyStatus('sent'); setReplyText(''); load(true) }
      else setReplyStatus('failed')
    } catch { setReplyStatus('failed') }
    finally { setSending(false) }
  }

  // ── End Live Chat ──────────────────────────────────────────────────────────
  const endLiveChat = async () => {
    if (!selected) return
    const phone = (selected as any).waFrom
    if (!phone) return
    if (!confirm(`End live chat with ${selected.senderName}? They'll be returned to the bot and notified.`)) return
    setEndingChat(true)
    try {
      await whatsappApi.endLiveChat(phone)
      load(true)
    } catch { /* ignore — session may already be ended */ }
    finally { setEndingChat(false) }
  }

  // ── Assign ─────────────────────────────────────────────────────────────────
  const assign = async (memberId: string) => {
    if (!selected) return
    const member = team.find((t) => t.id === memberId)
    await inboxApi.assign(selected.id, member ? `${member.firstName} ${member.lastName}` : memberId)
    load(true)
  }

  const isWhatsApp = selected?.source === 'whatsapp' && (selected as any).waFrom
  const unreadCount = messages.filter((m) => m.status === 'unread').length

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Inbox
            {unreadCount > 0 && (
              <Badge variant="blue" className="text-xs">{unreadCount} unread</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">{messages.length} messages · auto-refreshes every 2s</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load()}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* 3-column layout: list | chat | context */}
      <div className="grid h-[calc(100vh-200px)] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[280px_1fr_260px]">

        {/* ── Col 1: Message list ──────────────────────────────────────── */}
        <ScrollArea className="border-b md:border-b-0 md:border-r">
          {messages.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No messages yet</div>
          ) : (
            messages.map((m) => (
              <button
                key={m.id}
                onClick={() => select(m)}
                className={cn(
                  'flex w-full items-start gap-3 border-b p-3 text-left transition-colors hover:bg-accent',
                  selectedId === m.id && 'bg-accent'
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">{initials(m.senderName)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="truncate text-sm font-medium">{m.senderName}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {m.source === 'whatsapp' && <MessageCircle className="h-3 w-3 text-green-500" />}
                      {m.status === 'unread' && <span className="h-2 w-2 rounded-full bg-green-500" />}
                    </div>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{m.subject || m.body}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                  {m.assignedTo && (
                    <p className="text-[10px] text-blue-500">→ {m.assignedTo}</p>
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>

        {/* ── Col 2: Chat / detail ─────────────────────────────────────── */}
        <div className="flex flex-col overflow-hidden border-r">
          {selected ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b p-3 flex-shrink-0">
                <div>
                  <p className="font-semibold">{selected.senderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.senderEmail || selected.senderPhone || (selected as any).waFrom || ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={SOURCE_COLOURS[selected.source] ?? 'grey'} className="capitalize">
                    {selected.source}
                  </Badge>
                  {isWhatsApp && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={endLiveChat}
                      disabled={endingChat}
                      title="End live chat — returns customer to bot"
                    >
                      <PhoneOff className="h-3.5 w-3.5" />
                      {endingChat ? 'Ending…' : 'End Chat'}
                    </Button>
                  )}
                  {selected.status === 'unread' && (
                    <Button size="sm" variant="outline" onClick={() => markRead(selected.id)}>
                      <MailOpen className="h-3.5 w-3.5" /> Read
                    </Button>
                  )}
                </div>
              </div>

              {/* Assign to team member */}
              <div className="border-b px-3 py-2 flex-shrink-0 bg-muted/20">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    value={selected.assignedTo || ''}
                    onValueChange={assign}
                  >
                    <SelectTrigger className="h-7 text-xs w-[180px]">
                      <SelectValue placeholder="Assign to team member…" />
                    </SelectTrigger>
                    <SelectContent>
                      {team.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs">
                          {t.firstName} {t.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected.assignedTo && (
                    <span className="text-xs text-muted-foreground">→ {selected.assignedTo}</span>
                  )}
                </div>
              </div>

              {/* Body */}
              <ScrollArea className="flex-1 p-4">
                {selected.subject && <h2 className="mb-2 font-medium">{selected.subject}</h2>}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{selected.body}</p>
                {replyText.trim() && (
                  <div className="mt-4 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 rounded-2xl bg-brand-500 px-3 py-2 text-xs text-white shadow-sm">
                      <span className="font-medium">You</span>
                      <span className="flex gap-0.5">
                        <span className="animate-bounce" style={{ animationDelay: '0ms' }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: '150ms' }}>·</span>
                        <span className="animate-bounce" style={{ animationDelay: '300ms' }}>·</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">typing…</span>
                  </div>
                )}
              </ScrollArea>

              {/* Reply box */}
              <div className="border-t p-3 flex-shrink-0 bg-muted/30">
                {isWhatsApp && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Reply via WhatsApp to {(selected as any).waFrom}
                  </p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={isWhatsApp ? 'Type a WhatsApp reply…' : 'Type a note…'}
                    className="min-h-[60px] resize-none text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
                  />
                  <Button onClick={sendReply} disabled={sending || !replyText.trim()} className="self-end">
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
                {replyStatus === 'sent' && (
                  <p className="mt-1 text-xs text-green-600">
                    {isWhatsApp ? '✓ WhatsApp message sent' : '✓ Note saved'}
                  </p>
                )}
                {replyStatus === 'failed' && (
                  <p className="mt-1 text-xs text-red-500">Failed to send — check WhatsApp credentials</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
              <InboxIcon className="mb-3 h-10 w-10" />
              <p className="text-sm">Select a message to read</p>
            </div>
          )}
        </div>

        {/* ── Col 3: Customer context panel ────────────────────────────── */}
        <div className="flex flex-col overflow-hidden bg-muted/10">
          {selected ? (
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer History
                </p>

                {/* Leads */}
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium">
                    <UserCheck className="h-3.5 w-3.5 text-blue-500" /> Leads
                  </p>
                  {ctxLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No leads found</p>
                  ) : ctxLeads.map((l) => (
                    <div key={l.id} className="mb-2 rounded-md border bg-background p-2">
                      <p className="text-xs font-medium">{l.serviceInterest || 'General'}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{l.status} · {l.source}</p>
                      {l.estimatedValue && (
                        <p className="text-[11px] text-green-600">£{l.estimatedValue}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Bookings */}
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium">
                    <BookOpen className="h-3.5 w-3.5 text-purple-500" /> Bookings
                  </p>
                  {ctxBookings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No bookings found</p>
                  ) : ctxBookings.map((b) => (
                    <div key={b.id} className="mb-2 rounded-md border bg-background p-2">
                      <p className="text-xs font-medium capitalize">{b.serviceType?.replace(/_/g, ' ')}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(b.scheduledAt).toLocaleDateString('en-GB')}
                      </p>
                      <p className="text-[11px] capitalize text-muted-foreground">{b.status}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-1 items-center justify-center p-4">
              <p className="text-center text-xs text-muted-foreground">
                Select a message to see customer history
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
