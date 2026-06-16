import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = process.env.E2E_EMAIL || 'admin@thefamgroup.uk'
const ADMIN_PASSWORD = process.env.E2E_PASSWORD || 'Admin@TFG2026!'

test.describe('Authentication', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/auth/login')
    // Brand wordmark is split across <span>s, so match the back-office tagline.
    await expect(page.getByText(/admin back-office/i)).toBeVisible()
    await expect(page.getByLabel('Email', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email', { exact: true }).fill('wrong@example.com')
    await page.getByLabel('Password', { exact: true }).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // The destructive Alert renders with role="alert".
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 })
  })

  test('valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/login')
    await page.getByLabel('Email', { exact: true }).fill(ADMIN_EMAIL)
    await page.getByLabel('Password', { exact: true }).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/admin\/dashboard/, { timeout: 15000 })
  })
})
