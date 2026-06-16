'use client'

import { useEffect, useState } from 'react'
import { MailOpen, Inbox as InboxIcon } from 'lucide-react'

import { inboxApi } from '@/lib/api/client'
import { formatDateTime, initials, cn } from '@/lib/utils'
import type { Message } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

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
  }

  const markRead = async (id: string) => {
    await inboxApi.markRead(id)
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status: 'read' } : m))
    )
  }

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
            <div className="p-6 text-sm text-muted-foreground">No messages</div>
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
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {initials(m.senderName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {m.senderName}
                    </p>
                    {m.status === 'unread' && (
                      <span className="h-2 w-2 flex-shrink-0 rounded-full bg-green-500" />
                    )}
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

        {/* Detail panel */}
        <div className="flex flex-col">
          {selected ? (
            <>
              <div className="flex items-center justify-between gap-2 border-b p-4">
                <div>
                  <p className="font-semibold">{selected.senderName}</p>
                  <p className="text-xs text-muted-foreground">
                    {selected.senderEmail || selected.senderPhone || ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="grey" className="capitalize">
                    {selected.source}
                  </Badge>
                  {selected.status === 'unread' && (
                    <Button size="sm" onClick={() => markRead(selected.id)}>
                      <MailOpen className="h-3.5 w-3.5" /> Mark read
                    </Button>
                  )}
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                {selected.subject && (
                  <h2 className="mb-2 font-medium">{selected.subject}</h2>
                )}
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {selected.body}
                </p>
              </ScrollArea>
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
