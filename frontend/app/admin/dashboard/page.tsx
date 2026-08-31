'use client'

import SectionCards from '@/components/section-cards'
import ChartAreaInteractive from '@/components/chart-area-interactive'
import DataTable from '@/components/data-table'

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4 p-4 sm:gap-6 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>
      <SectionCards />
      <ChartAreaInteractive />
      <DataTable />
    </div>
  )
}
