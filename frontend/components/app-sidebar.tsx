'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  CalendarCheck,
  FileText,
  Users2,
  MessageSquare,
  UserCog,
  Settings2,
  LogOut,
} from 'lucide-react'

import { useAuth } from '@/lib/hooks/useAuth'
import { initials } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard' },
  { href: '/admin/bookings', label: 'Bookings',   icon: CalendarCheck,   permission: 'bookings' },
  { href: '/admin/quotes',   label: 'Quotes & Invoices', icon: FileText, permission: 'quotes' },
  { href: '/admin/leads',    label: 'Leads',      icon: Users2,          permission: 'leads' },
  { href: '/admin/inbox',    label: 'Inbox',      icon: MessageSquare,   permission: 'inbox' },
  { href: '/admin/team',     label: 'Team',       icon: UserCog,         permission: 'team' },
  { href: '/admin/settings', label: 'Settings',   icon: Settings2,       permission: 'settings' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { user, logout, can } = useAuth()

  return (
    <Sidebar>
      <SidebarHeader>
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 px-2 py-3 font-display text-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500 font-bold text-white">
            F
          </span>
          <span>
            the<span className="text-green-500">fam</span>group
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.filter(item => can(item.permission)).map((item) => {
                const active = pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-green-600 text-xs font-semibold text-white">
                  {user ? initials(`${user.firstName} ${user.lastName}`) : '?'}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user ? `${user.firstName} ${user.lastName}` : '—'}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email ?? ''}
                </p>
              </div>
              <button
                onClick={logout}
                aria-label="Sign out"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default AppSidebar
