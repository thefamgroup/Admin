import type { Page } from '@playwright/test'

export const ADMIN_EMAIL = process.env.E2E_EMAIL || 'admin@thefamgroup.uk'
export const ADMIN_PASSWORD = process.env.E2E_PASSWORD || 'Admin@TFG2026!'

/** Log in through the UI and wait for the dashboard to load. */
export async function login(page: Page): Promise<void> {
  await page.goto('/auth/login')
  // exact:true avoids the "Show password" toggle button, which also matches /password/i.
  await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL)
  await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 15000 })
}
