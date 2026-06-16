import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  const pages = [
    { name: /^bookings$/i, url: /\/admin\/bookings/ },
    { name: /quotes/i, url: /\/admin\/quotes/ },
    { name: /^leads$/i, url: /\/admin\/leads/ },
    { name: /inbox/i, url: /\/admin\/inbox/ },
    { name: /^team$/i, url: /\/admin\/team/ },
    { name: /settings/i, url: /\/admin\/settings/ },
  ]

  for (const p of pages) {
    test(`navigates to ${p.url}`, async ({ page }) => {
      await page.getByRole('link', { name: p.name }).click()
      await expect(page).toHaveURL(p.url, { timeout: 8000 })
    })
  }
})
