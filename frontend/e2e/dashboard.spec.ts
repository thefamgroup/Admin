import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows dashboard heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /dashboard/i }),
    ).toBeVisible()
  })

  test('shows stat cards', async ({ page }) => {
    // Match exact stat-card titles — /revenue/i alone also hits the chart title + tooltip.
    await expect(page.getByText('Total Bookings')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Revenue Collected')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Active Leads')).toBeVisible({ timeout: 10000 })
  })

  test('sidebar navigation links are visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /bookings/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /quotes/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /leads/i })).toBeVisible()
  })
})
