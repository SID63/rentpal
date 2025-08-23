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
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible()
    
    // Click on first item
    await page.click('[data-testid="item-card"]:first-child')
    
    // Should navigate to item details
    await expect(page).toHaveURL(/\/items\/[^\/]+/)
    
    // Start booking process
    await page.click('[data-testid="book-now-button"]')
    
    // Should show booking form
    await expect(page.locator('[data-testid="booking-form"]')).toBeVisible()
    
    // Fill booking details
    await page.fill('[data-testid="start-date"]', '2024-12-01')
    await page.fill('[data-testid="end-date"]', '2024-12-03')
    
    // Submit booking
    await page.click('[data-testid="submit-booking"]')
    
    // Should show confirmation
    await expect(page.locator('[data-testid="booking-confirmation"]')).toBeVisible()
  })
})