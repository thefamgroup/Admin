import { test, expect } from '@playwright/test'
import { login } from './helpers'

test.describe('Bookings', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/admin/bookings')
  })

  test('bookings page loads', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /bookings/i }),
    ).toBeVisible()
  })

  test('new booking dialog opens', async ({ page }) => {
    await page.getByRole('button', { name: /new booking/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
