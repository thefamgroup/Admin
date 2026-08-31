'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MailOpen, Inbox as InboxIcon, Send, MessageCircle,
  UserCheck, BookOpen, RefreshCw, PhoneOff, ArrowLeft, Bell,
} from 'lucide-react'
import { io } from 'socket.io-client'

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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
const WS_BASE = API_URL.replace(/\/api\/?$/, '')

type Tab = 'all' | 'unread' | 'assigned' | 'unassigned'

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
  } catch { /* blocked before gesture — silent */ }
}

function urlB64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr.buffer as ArrayBuffer
}

async function enablePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
  try {
    const keyRes = await fetch(`${API_URL}/inbox/push-public-key`)
    if (!keyRes.ok) return
    const { publicKey } = await keyRes.json()
    if (!publicKey) return
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(publicKey),
    })
    const token = document.cookie.match(/tfg_token=([^;]+)/)?.[1] ?? ''
    await fetch(`${API_URL}/inbox/push-subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(sub.toJSON()),
    })
  } catch (err) {
    console.error('[Push] subscribe failed:', err)
  }
}

export default function InboxPage() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState<Tab>('all')
  const [replyText, setReplyText]     = useState('')
  const [sending, setSending]         = useState(false)
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sent' | 'failed'>('idle')
  const [endingChat, setEndingChat]   = useState(false)
  const [team, setTeam]               = useState<TeamMember[]>([])
  const [ctxLeads, setCtxLeads]       = useState<Lead[]>([])
  const [ctxBookings, setCtxBookings] = useState<Booking[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [notifPerm, setNotifPerm]     = useState<NotificationPermission>('default')
  const prevUnread = useRef(0)
  const replyRef = useRef<HTMLTextAreaElement>(null)

  // ── Load ────────────────────────────────────────────────────────────────────
  const load = useCallback(async (silent = false) => {
    try {
      const data = await inboxApi.list()
      const unread = data.filter((m) => m.status === 'unread').length
      if (!silent && unread > prevUnread.current) {
        playNotificationSound()
        if (Notification.permission === 'granted') {
          new Notification('thefamgroup Inbox', {
            body: `${unread} unread message${unread > 1 ? 's' : ''}`,
            icon: '/favicon.ico',
            tag: 'inbox-unread',
          })
        }
      }
      prevUnread.current = unread
      setMessages(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    load()
    teamApi.list().then(setTeam).catch(() => {})
    if ('Notification' in window) setNotifPerm(Notification.permission)
  }, [load])

  // ── WebSocket ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = io(WS_BASE, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    socket.on('connect', () => setWsConnected(true))
    socket.on('disconnect', () => setWsConnected(false))
    socket.on('inbox:ping', () => load(false))
    return () => { socket.disconnect() }
  }, [load])

  // ── Keyboard: keep input above soft keyboard on mobile ────────────────────
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const onResize = () => {
      if (document.activeElement === replyRef.current) {
        replyRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
    vv.addEventListener('resize', onResize)
    return () => vv.removeEventListener('resize', onResize)
  }, [])

  // ── Tab filtering ────────────────────────────────────────────────────────────
  const tabMessages = messages.filter((m) => {
    if (activeTab === 'unread')    return m.status === 'unread'
    if (activeTab === 'assigned')  return !!m.assignedTo
    if (activeTab === 'unassigned') return !m.assignedTo
    return true
  })

  const counts: Record<Tab, number> = {
    all:        messages.length,
    unread:     messages.filter((m) => m.status === 'unread').length,
    assigned:   messages.filter((m) => !!m.assignedTo).length,
    unassigned: messages.filter((m) => !m.assignedTo).length,
  }

  const selected = messages.find((m) => m.id === selectedId) ?? null

  // ── Customer context ─────────────────────────────────────────────────────────
  useEffect(() => {
    setCtxLeads([])
    setCtxBookings([])
    if (!selected) return
    const phone = (selected as any).waFrom || selected.senderPhone
    if (!phone) return
    contextApi.leadsByPhone(phone).then(setCtxLeads).catch(() => {})
    contextApi.bookingsByPhone(phone).then(setCtxBookings).catch(() => {})
  }, [selected?.id])

  // ── Actions ──────────────────────────────────────────────────────────────────
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

  const endLiveChat = async () => {
    if (!selected) return
    const phone = (selected as any).waFrom
    if (!phone) return
    if (!confirm(`End live chat with ${selected.senderName}? They'll be returned to the bot.`)) return
    setEndingChat(true)
    try { await whatsappApi.endLiveChat(phone); load(true) }
    catch { /* already ended */ }
    finally { setEndingChat(false) }
  }

  const assign = async (memberId: string) => {
    if (!selected) return
    const member = team.find((t) => t.id === memberId)
    const name = member ? `${member.firstName} ${member.lastName}` : memberId
    await inboxApi.assign(selected.id, name)
    setMessages((prev) =>
      prev.map((m) => (m.id === selected.id ? { ...m, assignedTo: name } : m))
    )
  }

  const handleEnableNotifications = async () => {
    const perm = await Notification.requestPermission()
    setNotifPerm(perm)
    if (perm === 'granted') await enablePushNotifications()
  }

  const isWhatsApp = selected?.source === 'whatsapp' && (selected as any).waFrom
  const unreadCount = counts.unread

  // ── Tab button component ─────────────────────────────────────────────────────
  const TabBtn = ({ tab, label }: { tab: Tab; label: string }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={cn(
        'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
        activeTab === tab
          ? 'bg-foreground text-background'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {label}
      {counts[tab] > 0 && (
        <span className={cn(
          'rounded-full px-1.5 py-0.5 text-[10px] leading-none',
          activeTab === tab ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
        )}>
          {counts[tab]}
        </span>
      )}
    </button>
  )

  return (
    // Full-height column: header (h-14) taken by the admin layout wrapper
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100svh - 3.5rem)' }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-between gap-2 px-4 pt-4 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          {selectedId && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden -ml-1 h-8 w-8 flex-shrink-0 p-0"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
              Inbox
              {unreadCount > 0 && (
                <Badge variant="blue" className="text-xs">{unreadCount}</Badge>
              )}
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={cn(
                'inline-flex h-1.5 w-1.5 rounded-full',
                wsConnected ? 'bg-green-500' : 'bg-amber-400 animate-pulse'
              )} />
              {wsConnected ? 'live' : 'reconnecting…'}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-1.5">
          {'Notification' in window && notifPerm !== 'granted' && (
            <Button variant="outline" size="sm" onClick={handleEnableNotifications}>
              <Bell className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:ml-1 sm:text-xs">Notify</span>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => load()}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:ml-1 sm:text-xs">Refresh</span>
          </Button>
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────────────────── */}
      <div className="flex flex-shrink-0 items-center gap-1 overflow-x-auto px-4 pb-2">
        <TabBtn tab="all"        label="All" />
        <TabBtn tab="unread"     label="Unread" />
        <TabBtn tab="assigned"   label="Assigned" />
        <TabBtn tab="unassigned" label="Unassigned" />
      </div>

      {/* ── 3-column panel grid ─────────────────────────────────────────────── */}
      <div className="mx-4 mb-4 flex-1 min-h-0 overflow-hidden rounded-lg border grid grid-cols-1 md:grid-cols-[280px_1fr_260px]">

        {/* ── Col 1: Thread list ────────────────────────────────────────────── */}
        <ScrollArea className={cn(
          'border-b md:border-b-0 md:border-r',
          selectedId ? 'hidden md:block' : 'block'
        )}>
          {tabMessages.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              {activeTab === 'all' ? 'No messages yet' : `No ${activeTab} messages`}
            </div>
          ) : (
            tabMessages.map((m) => (
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
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {m.source === 'whatsapp' && <MessageCircle className="h-3 w-3 text-green-500" />}
                      {m.status === 'unread' && <span className="h-2 w-2 rounded-full bg-green-500" />}
                    </div>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{m.subject || m.body}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTime(m.createdAt)}</p>
                  {m.assignedTo && (
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-blue-500">
                      <UserCheck className="h-2.5 w-2.5" />
                      {m.assignedTo}
                    </p>
                  )}
                </div>
              </button>
            ))
          )}
        </ScrollArea>

        {/* ── Col 2: Conversation ───────────────────────────────────────────── */}
        <div className={cn(
          'flex flex-col overflow-hidden border-r',
          !selectedId ? 'hidden md:flex' : 'flex'
        )}>
          {selected ? (
            <>
              {/* Header */}
              <div className="flex flex-shrink-0 items-center justify-between gap-2 border-b p-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{selected.senderName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selected.senderEmail || selected.senderPhone || (selected as any).waFrom || ''}
                  </p>
                </div>
                <div className="flex flex-shrink-0 items-center gap-1.5">
                  <Badge variant={SOURCE_COLOURS[selected.source] ?? 'grey'} className="capitalize">
                    {selected.source}
                  </Badge>
                  {isWhatsApp && (
                    <Button size="sm" variant="destructive" onClick={endLiveChat} disabled={endingChat}>
                      <PhoneOff className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline ml-1">{endingChat ? 'Ending…' : 'End Chat'}</span>
                    </Button>
                  )}
                  {selected.status === 'unread' && (
                    <Button size="sm" variant="outline" onClick={() => markRead(selected.id)}>
                      <MailOpen className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Assignment row */}
              <div className="flex flex-shrink-0 items-center gap-2 border-b bg-muted/20 px-3 py-2">
                <UserCheck className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                <Select value={selected.assignedTo || ''} onValueChange={assign}>
                  <SelectTrigger className="h-7 w-[180px] text-xs">
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
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 dark:bg-blue-950 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    <UserCheck className="h-3 w-3" />
                    {selected.assignedTo}
                  </span>
                )}
              </div>

              {/* Message body */}
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

              {/* Reply box — sticky above keyboard */}
              <div className="flex-shrink-0 border-t bg-muted/30 p-3">
                {isWhatsApp && (
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-green-600">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Reply via WhatsApp · {(selected as any).waFrom}
                  </p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onFocus={() => {
                      setTimeout(() => {
                        replyRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
                      }, 300)
                    }}
                    placeholder={isWhatsApp ? 'Type a WhatsApp reply…' : 'Type a note…'}
                    className="min-h-[56px] resize-none text-sm"
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply() }}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                    <span className="ml-1 hidden sm:inline">{sending ? 'Sending…' : 'Send'}</span>
                  </Button>
                </div>
                {replyStatus === 'sent' && (
                  <p className="mt-1 text-xs text-green-600">
                    {isWhatsApp ? '✓ Sent via WhatsApp' : '✓ Note saved'}
                  </p>
                )}
                {replyStatus === 'failed' && (
                  <p className="mt-1 text-xs text-red-500">Failed — check WhatsApp credentials</p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
              <InboxIcon className="h-10 w-10" />
              <p className="text-sm">Select a message to read</p>
            </div>
          )}
        </div>

        {/* ── Col 3: Customer context (desktop only) ────────────────────────── */}
        <div className="hidden md:flex flex-col overflow-hidden bg-muted/10">
          {selected ? (
            <ScrollArea className="flex-1">
              <div className="space-y-4 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Customer History
                </p>
                <div>
                  <p className="mb-1.5 flex items-center gap-1 text-xs font-medium">
                    <UserCheck className="h-3.5 w-3.5 text-blue-500" /> Leads
                  </p>
                  {ctxLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No leads found</p>
                  ) : ctxLeads.map((l) => (
                    <div key={l.id} className="mb-2 rounded-md border bg-background p-2">
                      <p className="text-xs font-medium">{l.serviceInterest || 'General'}</p>
                      <p className="text-[11px] capitalize text-muted-foreground">{l.status} · {l.source}</p>
                      {l.estimatedValue && <p className="text-[11px] text-green-600">£{l.estimatedValue}</p>}
                    </div>
                  ))}
                </div>
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
