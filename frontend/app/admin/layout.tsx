'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, CalendarDays, FileText, Users2,
  Inbox, UsersRound, Settings, LogOut, Bell, Search,
} from 'lucide-react'

const NAV = [
  { label: 'Main', items: [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/bookings',  icon: CalendarDays,   label: 'Bookings' },
    { href: '/admin/quotes',    icon: FileText,        label: 'Quotes & Invoices' },
    { href: '/admin/leads',     icon: Users2,          label: 'Leads', badge: 'new' },
    { href: '/admin/inbox',     icon: Inbox,           label: 'Inbox', badge: 'unread' },
  ]},
  { label: 'Operations', items: [
    { href: '/admin/team',      icon: UsersRound,  label: 'Team' },
  ]},
  { label: 'System', items: [
    { href: '/admin/settings',  icon: Settings,    label: 'Settings' },
  ]},
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth()
  const router   = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login')
  }, [user, loading, router])

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
      <div className="text-[#666] text-sm animate-pulse">Loading…</div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[#0f0f0f]">
      {/* ── SIDEBAR ─────────────────────────────────────────── */}
      <aside className="w-[220px] bg-[#181818] border-r border-[#2a2a2a] flex flex-col fixed top-0 bottom-0 left-0 z-40">
        {/* Logo */}
        <div className="px-4 py-5 border-b border-[#2a2a2a] flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#22c55e] rounded-[8px] flex items-center justify-center text-white font-bold text-base flex-shrink-0">F</div>
          <span className="font-display text-[18px] text-[#f0f0f0]">the<span className="text-[#22c55e]">fam</span></span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
          {NAV.map((group) => (
            <div key={group.label}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[#444] px-2.5 py-1 mb-1">{group.label}</p>
              {group.items.map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <Link key={item.href} href={item.href}
                    className={cn('nav-item mb-0.5', active && 'active')}>
                    <item.icon size={16} className="flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-2 border-t border-[#2a2a2a]">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[8px] hover:bg-[#202020] cursor-pointer group">
            <div className="w-8 h-8 rounded-full bg-[#16a34a] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.firstName[0]}{user.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#f0f0f0] truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[11px] text-[#444] capitalize">{user.role}</p>
            </div>
            <button onClick={logout} className="text-[#444] hover:text-[#ef4444] transition-colors opacity-0 group-hover:opacity-100" aria-label="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────── */}
      <div className="flex-1 ml-[220px] flex flex-col min-h-screen">
        {/* Topbar */}
        <header className="h-[60px] bg-[#181818] border-b border-[#2a2a2a] sticky top-0 z-30 flex items-center justify-between px-7">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-[22px] text-[#f0f0f0] capitalize">
              {pathname.split('/').pop()?.replace('-', ' ')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#444]" />
              <input className="bg-[#202020] border border-[#333] rounded-[8px] pl-8 pr-3 py-1.5 text-[13px] text-[#f0f0f0] placeholder-[#444] outline-none focus:border-[#22c55e] w-52 transition-all focus:w-64"
                placeholder="Search…" />
            </div>
            <button className="relative w-9 h-9 rounded-[8px] bg-[#202020] border border-[#333] flex items-center justify-center text-[#a0a0a0] hover:bg-[#282828]" aria-label="Notifications">
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ef4444] rounded-full border-2 border-[#181818]" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-7">
          {children}
        </main>
      </div>
    </div>
  )
}
