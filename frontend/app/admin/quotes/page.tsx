'use client'
import { useEffect, useState } from 'react'
import { quotesApi } from '@/lib/api/client'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'
import type { Quote, QuoteStatus } from '@/lib/types'
import { Plus, Send, CheckCircle } from 'lucide-react'

const TABS: { label: string; value: QuoteStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Sent', value: 'sent' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
]

export default function QuotesPage() {
  const [quotes, setQuotes]   = useState<Quote[]>([])
  const [tab, setTab]         = useState<QuoteStatus | ''>('')
  const [loading, setLoading] = useState(true)

  const load = (status: QuoteStatus | '') => {
    setLoading(true)
    quotesApi.list(status || undefined)
      .then(setQuotes).finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  const markPaid = async (id: string) => {
    await quotesApi.update(id, { status: 'paid' })
    load(tab)
  }

  const sendQuote = async (id: string) => {
    await quotesApi.update(id, { status: 'sent' })
    load(tab)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] text-[#f0f0f0]">Quotes & Invoices</h1>
          <p className="text-[13px] text-[#666] mt-0.5">{quotes.length} records</p>
        </div>
        <button className="btn btn-primary btn-sm"><Plus size={14} /> New Quote</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-[#181818] border border-[#2a2a2a] rounded-[10px] p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.value} onClick={() => setTab(t.value)}
            className={`px-4 py-1.5 rounded-[7px] text-[12px] font-semibold transition-all ${tab === t.value ? 'bg-[#282828] text-[#f0f0f0]' : 'text-[#666] hover:text-[#a0a0a0]'}`}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr><th>Client</th><th>Service</th><th>Total</th><th>Status</th><th>Due</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="h-4 bg-[#202020] rounded animate-pulse" /></td></tr>
                ))
              ) : quotes.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-[#444] py-10">No quotes found</td></tr>
              ) : quotes.map((q) => (
                <tr key={q.id}>
                  <td>
                    <p className="td-main">{q.clientName}</p>
                    <p className="text-[11px] text-[#444] mt-0.5">{q.clientEmail}</p>
                  </td>
                  <td>
                    <p className="text-[#a0a0a0]">{q.serviceType}</p>
                    <p className="text-[11px] text-[#444]">{q.propertySize}</p>
                  </td>
                  <td className="font-semibold text-[#22c55e]">{formatCurrency(Number(q.total))}</td>
                  <td><span className={`badge ${statusColor[q.status] || 'badge-grey'}`}>{q.status}</span></td>
                  <td className="text-[#a0a0a0]">{q.dueDate ? formatDate(q.dueDate) : '—'}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      {q.status === 'draft' && (
                        <button onClick={() => sendQuote(q.id)} className="btn btn-ghost btn-sm" title="Send to client">
                          <Send size={12} /> Send
                        </button>
                      )}
                      {(q.status === 'sent' || q.status === 'overdue') && (
                        <button onClick={() => markPaid(q.id)} className="btn btn-primary btn-sm" title="Mark paid">
                          <CheckCircle size={12} /> Mark Paid
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
