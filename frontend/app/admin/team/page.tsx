'use client'
import { useEffect, useState } from 'react'
import { teamApi } from '@/lib/api/client'
import { statusColor, formatDate, initials } from '@/lib/utils'
import type { TeamMember } from '@/lib/types'
import { Plus, AlertCircle, Phone, Mail } from 'lucide-react'

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter]   = useState<'all'|'active'|'inactive'>('all')

  useEffect(() => {
    teamApi.list().then(setMembers).finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? members : members.filter((m) => m.status === filter)

  const dbsExpiringSoon = (expiry?: string) => {
    if (!expiry) return false
    const days = (new Date(expiry).getTime() - Date.now()) / 86400000
    return days < 30
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-[26px] text-[#f0f0f0]">Team</h1>
          <p className="text-[13px] text-[#666] mt-0.5">{members.filter(m => m.status === 'active').length} active cleaners</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-[#202020] border border-[#333] rounded-[8px] p-0.5">
            {(['all','active','inactive'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-[6px] text-[12px] font-medium capitalize transition-colors ${filter === f ? 'bg-[#282828] text-[#f0f0f0]' : 'text-[#666] hover:text-[#a0a0a0]'}`}>
                {f}
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Add Member</button>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-52 bg-[#181818] rounded-[10px] animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-[#444] py-16">No team members found</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => (
            <div key={m.id} className="card p-6 text-center hover:border-[#333] transition-colors">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-[#16a34a] flex items-center justify-center text-white text-xl font-bold mx-auto mb-3">
                {initials(`${m.firstName} ${m.lastName}`)}
              </div>

              <h3 className="font-semibold text-[#f0f0f0] mb-0.5">{m.firstName} {m.lastName}</h3>
              <p className="text-[12px] text-[#444] capitalize mb-3">{m.role}</p>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#202020] rounded-[8px] p-3">
                  <p className="text-xl font-bold text-[#22c55e]">{m.totalJobsCompleted}</p>
                  <p className="text-[10px] text-[#444]">Jobs done</p>
                </div>
                <div className="bg-[#202020] rounded-[8px] p-3">
                  <p className="text-xl font-bold text-[#22c55e]">£{Number(m.hourlyRate).toFixed(2)}</p>
                  <p className="text-[10px] text-[#444]">Per hour</p>
                </div>
              </div>

              {/* Status + DBS */}
              <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
                <span className={`badge ${statusColor[m.status] || 'badge-grey'}`}>{m.status.replace('_', ' ')}</span>
                {m.dbsChecked
                  ? <span className="badge badge-green">DBS ✓</span>
                  : <span className="badge badge-red">No DBS</span>}
                {dbsExpiringSoon(m.dbsExpiry) && (
                  <span className="badge badge-amber flex items-center gap-1"><AlertCircle size={10} /> Expiring</span>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-center">
                {m.phone && (
                  <a href={`tel:${m.phone}`} className="btn btn-ghost btn-sm"><Phone size={12} /></a>
                )}
                <a href={`mailto:${m.email}`} className="btn btn-ghost btn-sm"><Mail size={12} /></a>
                <button className="btn btn-ghost btn-sm flex-1">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
