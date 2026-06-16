'use client'

import { useEffect, useState } from 'react'
import { CalendarCheck, TrendingUp, Users2, MessageSquare } from 'lucide-react'

import { dashboardApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import type { DashboardStats } from '@/lib/types'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
}: {
  title: string
  value: string | number
  sub: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-green-500" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  )
}

export default function SectionCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    dashboardApi
      .getStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  const dash = loading ? '—' : '0'
  const newLeads =
    stats?.leads.byStatus.find((s) => s.status === 'new')?.count ?? 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Bookings"
        value={stats?.bookings.total ?? dash}
        sub={`${stats?.bookings.pending ?? 0} pending`}
        icon={CalendarCheck}
      />
      <StatCard
        title="Revenue Collected"
        value={stats ? formatCurrency(stats.quotes.totalRevenue) : dash}
        sub={`${stats?.quotes.paid ?? 0} quotes paid`}
        icon={TrendingUp}
      />
      <StatCard
        title="Active Leads"
        value={stats?.leads.total ?? dash}
        sub={`${newLeads} new this week`}
        icon={Users2}
      />
      <StatCard
        title="Unread Messages"
        value={stats?.inbox.unread ?? dash}
        sub="from inbox"
        icon={MessageSquare}
      />
    </div>
  )
}
