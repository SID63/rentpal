import { test, expect } from '@playwright/test'

test.describe('Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        access_token: 'mock-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com'
        }
      }))
    })
  })

  test('user can complete full booking process', async ({ page }) => {
    // Navigate to item details
    await page.goto('/items/test-item-id')

    // Verify item details are displayed
    await expect(page.locator('[data-testid="item-title"]')).toBeVisible()
    await expect(page.locator('[data-testid="item-price"]')).toBeVisible()
    await expect(page.locator('[data-testid="item-description"]')).toBeVisible()

    // Click book now button
    await page.click('[data-testid="book-now-button"]')
    await expect(page).toHaveURL('/items/test-item-id/book')

    // Select rental dates
    await page.click('[data-testid="start-date-picker"]')
    await page.click('[data-testid="date-2024-02-15"]') // Select start date
    
    await page.click('[data-testid="end-date-picker"]')
    await page.click('[data-testid="date-2024-02-17"]') // Select end date

    // Verify pricing calculation
    await expect(page.locator('[data-testid="rental-days"]')).toContainText('2 days')
    await expect(page.locator('[data-testid="base-cost"]')).toContainText('$50.00')
    await expect(page.locator('[data-testid="service-fee"]')).toContainText('$5.00')
    await expect(page.locator('[data-testid="total-cost"]')).toContainText('$55.00')

    // Select delivery option
    await page.check('[data-testid="delivery-option"]')
    await page.fill('[data-testid="delivery-address"]', '456 Delivery St, San Francisco, CA 94105')

    // Verify updated total with delivery fee
    await expect(page.locator('[data-testid="delivery-fee"]')).toContainText('$10.00')
    await expect(page.locator('[data-testid="total-cost"]')).toContainText('$65.00')

    // Add special instructions
    await page.fill('[data-testid="special-instructions"]', 'Please call when arriving for delivery')

    // Proceed to payment
    await page.click('[data-testid="proceed-to-payment"]')

    // Fill payment information
    await page.fill('[data-testid="card-number"]', '4242424242424242')
    await page.fill('[data-testid="card-expiry"]', '12/25')
    await page.fill('[data-testid="card-cvc"]', '123')
    await page.fill('[data-testid="cardholder-name"]', 'John Doe')

    // Submit booking
    await page.click('[data-testid="confirm-booking"]')

    // Wait for booking confirmation
    await expect(page.locator('[data-testid="booking-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="booking-id"]')).toBeVisible()

    // Verify booking details
    await expect(page.locator('[data-testid="booking-dates"]')).toContainText('Feb 15 - Feb 17, 2024')
    await expect(page.locator('[data-testid="booking-total"]')).toContainText('$65.00')
    await expect(page.locator('[data-testid="delivery-address"]')).toContainText('456 Delivery St')

    // Check that user can view booking details
    await page.click('[data-testid="view-booking-details"]')
    await expect(page).toHaveURL(/\/bookings\/.*/)
    await expect(page.locator('[data-testid="booking-status"]')).toContainText('Confirmed')
  })

  test('validates booking form inputs', async ({ page }) => {
    await page.goto('/items/test-item-id/book')

    // Try to proceed without selecting dates
    await page.click('[data-testid="proceed-to-payment"]')

    await expect(page.locator('[data-testid="start-date-error"]')).toContainText('Start date is required')
    await expect(page.locator('[data-testid="end-date-error"]')).toContainText('End date is required')

    // Select invalid date range (end before start)
    await page.click('[data-testid="start-date-picker"]')
    await page.click('[data-testid="date-2024-02-17"]')
    
    await page.click('[data-testid="end-date-picker"]')
    await page.click('[data-testid="date-2024-02-15"]')

    await expect(page.locator('[data-testid="date-range-error"]')).toContainText('End date must be after start date')

    // Select dates in the past
    await page.click('[data-testid="start-date-picker"]')
    await page.click('[data-testid="date-2023-12-01"]')

    await expect(page.locator('[data-testid="past-date-error"]')).toContainText('Cannot book dates in the past')

    // Select dates that conflict with existing bookings
    await page.click('[data-testid="start-date-picker"]')
    await page.click('[data-testid="date-2024-03-15"]') // Assume this date is blocked

    await expect(page.locator('[data-testid="unavailable-date-error"]')).toContainText('Selected dates are not available')
  })

  test('handles payment processing errors', async ({ page }) => {
    await page.goto('/items/test-item-id/book')

    // Select valid dates
    await page.click('[data-testid="start-date-picker"]')
    await page.click('[data-testid="date-2024-02-15"]')
    
    await page.click('[data-testid="end-date-picker"]')
    await page.click('[data-testid="date-2024-02-17"]')

    await page.click('[data-testid="proceed-to-payment"]')

    // Use a card that will be declined
    await page.fill('[data-testid="card-number"]', '4000000000000002')
    await page.fill('[data-testid="card-expiry"]', '12/25')
    await page.fill('[data-testid="card-cvc"]', '123')
    await page.fill('[data-testid="cardholder-name"]', 'John Doe')

    await page.click('[data-testid="confirm-booking"]')

    // Should show payment error
    await expect(page.locator('[data-testid="payment-error"]')).toContainText('Your card was declined')

    // User should be able to try again
    await expect(page.locator('[data-testid="confirm-booking"]')).toBeEnabled()
  })

  test('shows booking calendar with availability', async ({ page }) => {
    await page.goto('/items/test-item-id/book')

    // Calendar should be visible
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible()

    // Available dates should be clickable
    await expect(page.locator('[data-testid="date-2024-02-15"]')).not.toHaveClass(/disabled/)

    // Blocked dates should be disabled
    await expect(page.locator('[data-testid="date-2024-03-15"]')).toHaveClass(/disabled/)

    // Past dates should be disabled
    await expect(page.locator('[data-testid="date-2024-01-15"]')).toHaveClass(/disabled/)

    // Should show legend
    await expect(page.locator('[data-testid="calendar-legend"]')).toBeVisible()
    await expect(page.locator('[data-testid="available-legend"]')).toContainText('Available')
    await expect(page.locator('[data-testid="booked-legend"]')).toContainText('Booked')
    await expect(page.locator('[data-testid="blocked-legend"]')).toContainText('Blocked')
  })

  test('calculates pricing correctly for different rental periods', async ({ page }) => {
    await page.goto('/items/test-item-id/book')

    // Test daily rate calculation
    await page.click('[data-testid="start-date-picker"]')
    await page.click('[data-testid="date-2024-02-15"]')
    
    await page.click('[data-testid="end-date-picker"]')
    await page.click('[data-testid="date-2024-02-17"]') // 2 days

    await expect(page.locator('[data-testid="rental-days"]')).toContainText('2 days')
    await expect(page.locator('[data-testid="base-cost"]')).toContainText('$50.00') // $25/day * 2 days

    // Test longer rental with potential discounts
    await page.click('[data-testid="end-date-picker"]')
    await page.click('[data-testid="date-2024-02-22"]') // 7 days

    await expect(page.locator('[data-testid="rental-days"]')).toContainText('7 days')
    // Should show weekly discount if applicable
    await expect(page.locator('[data-testid="weekly-discount"]')).toBeVisible()
  })

  test('handles item unavailability during booking', async ({ page }) => {
    await page.goto('/items/test-item-id/book')

    // Select dates
    await page.click('[data-testid="start-date-picker"]')
    await page.click('[data-testid="date-2024-02-15"]')
    
    await page.click('[data-testid="end-date-picker"]')
    await page.click('[data-testid="date-2024-02-17"]')

    // Simulate item becoming unavailable while user is booking
    await page.route('**/api/bookings', route => {
      route.fulfill({
        status: 409,
        body: JSON.stringify({
          error: 'Item is no longer available for selected dates'
        })
      })
    })

    await page.click('[data-testid="proceed-to-payment"]')
    await page.fill('[data-testid="card-number"]', '4242424242424242')
    await page.fill('[data-testid="card-expiry"]', '12/25')
    await page.fill('[data-testid="card-cvc"]', '123')
    await page.fill('[data-testid="cardholder-name"]', 'John Doe')

    await page.click('[data-testid="confirm-booking"]')

    // Should show availability error
    await expect(page.locator('[data-testid="availability-error"]')).toContainText('no longer available')

    // Should redirect back to date selection
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible()
  })

  test('allows booking cancellation within policy', async ({ page }) => {
    // Navigate to existing booking
    await page.goto('/bookings/test-booking-id')

    // Should show booking details
    await expect(page.locator('[data-testid="booking-status"]')).toContainText('Confirmed')
    await expect(page.locator('[data-testid="cancel-booking"]')).toBeVisible()

    // Click cancel booking
    await page.click('[data-testid="cancel-booking"]')

    // Should show cancellation policy
    await expect(page.locator('[data-testid="cancellation-policy"]')).toBeVisible()
    await expect(page.locator('[data-testid="refund-amount"]')).toBeVisible()

    // Confirm cancellation
    await page.fill('[data-testid="cancellation-reason"]', 'Plans changed')
    await page.click('[data-testid="confirm-cancellation"]')

    // Should show cancellation success
    await expect(page.locator('[data-testid="cancellation-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="booking-status"]')).toContainText('Cancelled')
    await expect(page.locator('[data-testid="refund-status"]')).toContainText('Processing')
  })

  test('prevents booking own items', async ({ page }) => {
    // Navigate to user's own item
    await page.goto('/items/own-item-id')

    // Book now button should not be visible
    await expect(page.locator('[data-testid="book-now-button"]')).not.toBeVisible()

    // Should show owner message
    await expect(page.locator('[data-testid="owner-message"]')).toContainText('This is your listing')

    // Should show edit/manage options instead
    await expect(page.locator('[data-testid="edit-listing"]')).toBeVisible()
    await expect(page.locator('[data-testid="manage-bookings"]')).toBeVisible()
  })
})