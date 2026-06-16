'use client'
import { useEffect, useState } from 'react'
import { leadsApi } from '@/lib/api/client'
import { formatCurrency, statusColor } from '@/lib/utils'
import type { Lead } from '@/lib/types'
import { Plus, MessageCircle } from 'lucide-react'
import { CONTACT } from '@/lib/constants'

const COLUMNS: { status: string; label: string; color: string }[] = [
  { status: 'new',       label: 'New',       color: '#3b82f6' },
  { status: 'contacted', label: 'Contacted', color: '#f59e0b' },
  { status: 'quoted',    label: 'Quoted',    color: '#a855f7' },
  { status: 'won',       label: 'Won',       color: '#22c55e' },
  { status: 'lost',      label: 'Lost',      color: '#ef4444' },
]

export default function LeadsPage() {
  const [kanban, setKanban] = useState<{ status: string; leads: Lead[] }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    leadsApi.kanban().then(setKanban).finally(() => setLoading(false))
  }, [])

  const moveStatus = async (lead: Lead, newStatus: Lead['status']) => {
    await leadsApi.update(lead.id, { status: newStatus })
    leadsApi.kanban().then(setKanban)
  }

  const waUrl = (phone: string, name: string) =>
    `https://wa.me/44${phone.replace(/\D/g,'')}?text=${encodeURIComponent(`Hi ${name}, following up on your cleaning enquiry with thefamgroup.`)}`

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] text-[#f0f0f0]">Leads Pipeline</h1>
          <p className="text-[13px] text-[#666] mt-0.5">Kanban board — drag or update status to move leads</p>
        </div>
        <button className="btn btn-primary btn-sm"><Plus size={14} /> Add Lead</button>
      </div>

      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-48 bg-[#181818] rounded-[10px] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 items-start">
          {COLUMNS.map((col) => {
            const colData = kanban.find((k) => k.status === col.status)
            const leads   = colData?.leads || []
            return (
              <div key={col.status} className="bg-[#202020] rounded-[10px] p-3">
                {/* Column header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#a0a0a0]">{col.label}</span>
                  </div>
                  <span className="text-[11px] bg-[#282828] text-[#666] px-2 py-0.5 rounded-full">{leads.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2.5">
                  {leads.length === 0 && (
                    <p className="text-center text-[11px] text-[#333] py-6">Empty</p>
                  )}
                  {leads.map((lead) => (
                    <div key={lead.id} className="bg-[#181818] border border-[#2a2a2a] rounded-[8px] p-3 hover:border-[#333] hover:-translate-y-0.5 transition-all cursor-pointer">
                      <p className="text-[13px] font-semibold text-[#f0f0f0] mb-1">{lead.name}</p>
                      <p className="text-[11px] text-[#444] mb-2">{lead.serviceInterest || 'General enquiry'}</p>
                      <div className="flex items-center justify-between">
                        {lead.estimatedValue
                          ? <span className="text-[13px] font-semibold text-[#22c55e]">{formatCurrency(Number(lead.estimatedValue))}</span>
                          : <span />}
                        {lead.phone && (
                          <a href={waUrl(lead.phone, lead.name)} target="_blank" rel="noopener noreferrer"
                            className="w-6 h-6 bg-[rgba(37,211,102,.15)] border border-[rgba(37,211,102,.25)] rounded-full flex items-center justify-center text-[#25D366] hover:bg-[rgba(37,211,102,.25)] transition-colors"
                            title="WhatsApp">
                            <MessageCircle size={11} />
                          </a>
                        )}
                      </div>
                      {/* Status move buttons */}
                      {col.status !== 'won' && col.status !== 'lost' && (
                        <div className="flex gap-1 mt-2 pt-2 border-t border-[#2a2a2a]">
                          {col.status !== 'won' && (
                            <button onClick={() => moveStatus(lead, 'won')}
                              className="flex-1 text-[10px] py-1 rounded-[5px] bg-[rgba(34,197,94,.1)] text-[#22c55e] hover:bg-[rgba(34,197,94,.2)] transition-colors">
                              Won
                            </button>
                          )}
                          {col.status !== 'contacted' && col.status !== 'quoted' && (
                            <button onClick={() => moveStatus(lead, 'contacted')}
                              className="flex-1 text-[10px] py-1 rounded-[5px] bg-[rgba(245,158,11,.1)] text-[#f59e0b] hover:bg-[rgba(245,158,11,.2)] transition-colors">
                              Contact
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
