'use client'

import { useEffect, useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

import { quotesApi } from '@/lib/api/client'
import { formatCurrency } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface MonthBucket {
  month: string
  revenue: number
}

function getLast6Months(): MonthBucket[] {
  const out: MonthBucket[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({ month: d.toLocaleString('default', { month: 'short' }), revenue: 0 })
  }
  return out
}

export default function ChartAreaInteractive() {
  const [data, setData] = useState<MonthBucket[]>(getLast6Months())

  useEffect(() => {
    quotesApi
      .list('paid')
      .then((quotes) => {
        const months = getLast6Months()
        quotes.forEach((q) => {
          const month = new Date(q.createdAt).toLocaleString('default', {
            month: 'short',
          })
          const found = months.find((m) => m.month === month)
          if (found) found.revenue += q.total || 0
        })
        setData(months)
      })
      .catch(() => setData(getLast6Months()))
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `£${v}`}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 'var(--radius)',
                color: 'hsl(var(--popover-foreground))',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Revenue']}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.1}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
