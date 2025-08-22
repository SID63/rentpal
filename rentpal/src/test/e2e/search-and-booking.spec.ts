import { test, expect } from '@playwright/test'

test.describe('Search and Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('user can search for items and complete booking', async ({ page }) => {
    // Search for items
    await page.fill('[data-testid="search-input"]', 'power drill')
    await page.click('[data-testid="search-button"]')
    
    await expect(page).toHaveURL('/search?q=power+drill')
    
    // Should show search results