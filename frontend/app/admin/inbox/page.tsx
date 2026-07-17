'use client'

import { useEffect, useRef, useState } from 'react'
import { MailOpen, Inbox as InboxIcon, Send, MessageCircle } from 'lucide-react'

import { inboxApi } from '@/lib/api/client'
import { formatDateTime, initials, cn } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

const SOURCE_COLOURS: Record<string, 'green' | 'grey' | 'amber'> = {
  whatsapp: 'green',
  web:      'grey',
  email:    'amber',
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const [replyStatus, setReplyStatus] = useState<'idle' | 'sent' | 'failed'>('idle')
  const replyRef = useRef<HTMLTextAreaElement>(null)

  const load = () => {
    inboxApi
      .list()
      .then(setMessages)
      .catch(() => setMessages([]))
  }

  useEffect(load, [])

  const selected = messages.find((m) => m.id === selectedId) ?? null

  const select = (m: Message) => {
    setSelectedId(m.id)
    setReplyText('')
    setReplyStatus('idle')
    if (m.status === 'unread') markRead(m.id)
  }

  const markRead = async (id: string) => {
    await inboxApi.markRead(id).catch(() => {})
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m))
    )
  }

  const sendReply = async () => {
    if (!selected || !replyText.trim()) return
    setSending(true)
    setReplyStatus('idle')
    try {
      const res = await inboxApi.reply(selected.id, replyText.trim())
      if (res.sent) {
        setReplyStatus('sent')
        setReplyText('')
        // Refresh the thread body to show appended reply
        load()
      } else {
        setReplyStatus('failed')
      }
    } catch {
      setReplyStatus('failed')
    } finally {
      setSending(false)
    }
  }

  const isWhatsApp = selected?.source === 'whatsapp' && (selected as any).waFrom

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Inbox</h1>
        <p className="text-muted-foreground">{messages.length} messages</p>
      </div>

      <div className="grid h-[calc(100vh-220px)] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[300px_1fr]">
        {/* Message list */}
        <ScrollArea className="border-b md:border-b-0 md:border-r">
          {messages.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No messages yet</div>
          ) : (
            messages.map((m) => (
              <button
                key={m.id}
                onClick={() => select(m)}
                className={cn(
                  'flex w-full items-start gap-3 border-b p-4 text-left transition-colors hover:bg-accent',
                  selectedId === m.id && 'bg-accent'
                )}
              >
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs">
                    {initials(m.senderName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{m.senderName}</p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {m.source === 'whatsapp' && (
                        <MessageCircle className="h-3 w-3 text-green-500" />
                      )}
                      {m.status === 'unread' && (
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.subject || m.body}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(m.createdAt)}
                  </p>
                </div>
              </button>
            ))
          )}
        </ScrollArea>

        {/* Detail + reply panel */}
        <div className="flex flex-col overflow-hidden">
          {selected ? (
            <>
              {/* Header */}
              <div className="flex items-center justify-between gap-2 border-b p-4 flex-shrink-0">
                <div>
                  <p className="font-semibold">{selected.senderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.senderEmail || selected.senderPhone || ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={SOURCE_COLOURS[selected.source] ?? 'grey'}
                    className="capitalize"
                  >
                    {selected.source}
                  </Badge>
                  {selected.status === 'unread' && (
                    <Button size="sm" onClick={() => markRead(selected.id)}>
                      <MailOpen className="h-3.5 w-3.5" /> Mark read
                    </Button>
                  )}
                </div>
              </div>

              {/* Body */}
              <ScrollArea className="flex-1 p-4">
                {selected.subject && (
                  <h2 className="mb-2 font-medium">{selected.subject}</h2>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selected.body}
                </p>
              </ScrollArea>

              {/* Reply box — shown for all messages, sends via WhatsApp if waFrom exists */}
              <div className="border-t p-4 flex-shrink-0 bg-muted/30">
                {isWhatsApp && (
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-green-600 font-medium">
                    <MessageCircle className="h-3.5 w-3.5" />
                    Reply will be sent via WhatsApp to {(selected as any).waFrom}
                  </p>
                )}
                <div className="flex gap-2">
                  <Textarea
                    ref={replyRef}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={
                      isWhatsApp
                        ? 'Type a WhatsApp reply…'
                        : 'Type a reply note… (internal only)'
                    }
                    className="min-h-[70px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply()
                    }}
                  />
                  <Button
                    onClick={sendReply}
                    disabled={sending || !replyText.trim()}
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                    {sending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
                {replyStatus === 'sent' && (
                  <p className="mt-1.5 text-xs text-green-600">
                    {isWhatsApp ? '✓ WhatsApp message sent' : '✓ Note saved'}
                  </p>
                )}
                {replyStatus === 'failed' && (
                  <p className="mt-1.5 text-xs text-red-500">
                    {isWhatsApp
                      ? 'Failed to send — check WhatsApp credentials in Render env vars'
                      : 'Failed to save note'}
                  </p>
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
      </div>
    </div>
  )
}
