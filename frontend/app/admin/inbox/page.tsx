'use client'
import { useEffect, useState } from 'react'
import { inboxApi } from '@/lib/api/client'
import { formatDateTime, cn } from '@/lib/utils'
import type { Message, MessageSource } from '@/lib/types'
import { MessageCircle, Mail, Globe, Send } from 'lucide-react'

const SOURCE_ICON: Record<MessageSource, React.ElementType> = {
  whatsapp: MessageCircle, email: Mail, web: Globe,
}
const SOURCE_COLOR: Record<MessageSource, string> = {
  whatsapp: 'text-[#25D366] bg-[rgba(37,211,102,.15)]',
  email:    'text-[#3b82f6] bg-[rgba(59,130,246,.1)]',
  web:      'text-[#f59e0b] bg-[rgba(245,158,11,.1)]',
}

export default function InboxPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selected, setSelected] = useState<Message | null>(null)
  const [reply, setReply]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'all'|'unread'>('all')

  useEffect(() => {
    inboxApi.list().then((m) => { setMessages(m); if (m.length > 0) setSelected(m[0]) }).finally(() => setLoading(false))
  }, [])

  const select = async (msg: Message) => {
    setSelected(msg)
    if (msg.status === 'unread') {
      await inboxApi.markRead(msg.id)
      setMessages((prev) => prev.map((m) => m.id === msg.id ? { ...m, status: 'read' } : m))
    }
  }

  const sendReply = () => {
    if (!reply.trim() || !selected) return
    // In production: call inboxApi to save reply
    setReply('')
  }

  const filtered = filter === 'unread' ? messages.filter((m) => m.status === 'unread') : messages

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] text-[#f0f0f0]">Inbox</h1>
          <p className="text-[13px] text-[#666] mt-0.5">{messages.filter(m => m.status === 'unread').length} unread</p>
        </div>
        <div className="flex gap-1 bg-[#202020] border border-[#333] rounded-[8px] p-0.5">
          {(['all','unread'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-[6px] text-[12px] font-medium capitalize transition-colors', filter === f ? 'bg-[#282828] text-[#f0f0f0]' : 'text-[#666] hover:text-[#a0a0a0]')}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="card flex overflow-hidden" style={{ height: '620px' }}>
        {/* ── Message list ── */}
        <div className="w-[280px] border-r border-[#2a2a2a] flex flex-col flex-shrink-0">
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              [...Array(5)].map((_, i) => <div key={i} className="p-4 border-b border-[#2a2a2a]"><div className="h-3 bg-[#202020] rounded animate-pulse mb-2" /><div className="h-2 bg-[#202020] rounded animate-pulse w-2/3" /></div>)
            ) : filtered.length === 0 ? (
              <p className="text-center text-[#444] text-sm py-12">No messages</p>
            ) : filtered.map((msg) => {
              const Icon   = SOURCE_ICON[msg.source]
              const srcCls = SOURCE_COLOR[msg.source]
              return (
                <div key={msg.id} onClick={() => select(msg)}
                  className={cn('px-4 py-3.5 border-b border-[#2a2a2a] cursor-pointer transition-colors hover:bg-[#202020]', selected?.id === msg.id && 'bg-[rgba(34,197,94,.05)] border-l-2 border-l-[#22c55e]')}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={cn('w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px]', srcCls)}>
                      <Icon size={10} />
                    </div>
                    <span className={cn('text-[13px] truncate', msg.status === 'unread' ? 'font-bold text-[#f0f0f0]' : 'font-medium text-[#a0a0a0]')}>
                      {msg.senderName}
                    </span>
                    <span className="text-[10px] text-[#444] ml-auto flex-shrink-0">{formatDateTime(msg.createdAt).split(',')[1]?.trim()}</span>
                  </div>
                  <p className="text-[11px] text-[#444] truncate pl-7">{msg.subject || msg.body}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Thread / Message detail ── */}
        {selected ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <div>
                <p className="font-semibold text-[#f0f0f0]">{selected.senderName}</p>
                <p className="text-[12px] text-[#444]">{selected.senderEmail || selected.senderPhone} · {selected.source}</p>
              </div>
              <div className="flex gap-2">
                {selected.senderPhone && (
                  <a href={`https://wa.me/44${selected.senderPhone.replace(/\D/,'')}?text=${encodeURIComponent('Hi! Following up on your enquiry with thefamgroup.')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-wa btn-sm"><MessageCircle size={12} /> WhatsApp</a>
                )}
                {selected.senderEmail && (
                  <a href={`mailto:${selected.senderEmail}`} className="btn btn-ghost btn-sm"><Mail size={12} /> Email</a>
                )}
              </div>
            </div>

            {/* Message body */}
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
              <div className="max-w-[70%] bg-[#202020] border border-[#333] rounded-[4px_12px_12px_12px] px-4 py-3">
                {selected.subject && <p className="text-[11px] font-semibold text-[#666] mb-1 uppercase tracking-wider">{selected.subject}</p>}
                <p className="text-[13px] text-[#f0f0f0] leading-relaxed">{selected.body}</p>
                <p className="text-[10px] text-[#444] mt-2">{formatDateTime(selected.createdAt)}</p>
              </div>
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-[#2a2a2a] flex gap-3">
              <input value={reply} onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendReply()}
                className="input flex-1" placeholder="Type a reply…" />
              <button onClick={sendReply} className="btn btn-primary" disabled={!reply.trim()}>
                <Send size={14} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-[#333] text-sm">
            Select a message to view
          </div>
        )}
      </div>
    </div>
  )
}
