import { test, expect } from '@playwright/test'

test.describe('Item Listing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as authenticated user
    await page.goto('/auth/login')
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user can create a new item listing', async ({ page }) => {
    // Navigate to create listing
    await page.click('text=List an Item')
    await expect(page).toHaveURL('/items/create')

    // Fill out item form
    await page.fill('[data-testid="title"]', 'Professional Power Drill')
    await page.fill('[data-testid="description"]', 'High-quality cordless drill perfect for home improvement projects. Includes battery and charger.')
    
    // Select category
    await page.selectOption('[data-testid="category"]', 'tools')
    await page.selectOption('[data-testid="subcategory"]', 'power-tools')
    
    // Set condition
    await page.selectOption('[data-testid="condition"]', 'good')
    
    // Set pricing
    await page.fill('[data-testid="daily-rate"]', '25')
    await page.fill('[data-testid="hourly-rate"]', '5')
    await page.fill('[data-testid="security-deposit"]', '100')
    
    // Upload images
    await page.setInputFiles('[data-testid="image-upload"]', [
      'src/test/fixtures/drill-1.jpg',
      'src/test/fixtures/drill-2.jpg'
    ])
    
    // Wait for images to upload
    await expect(page.locator('[data-testid="uploaded-image"]')).toHaveCount(2)
    
    // Set availability
    await page.fill('[data-testid="available-from"]', '2024-02-01')
    await page.fill('[data-testid="available-until"]', '2024-12-31')
    await page.fill('[data-testid="min-rental-hours"]', '4')
    
    // Set policies
    await page.selectOption('[data-testid="cancellation-policy"]', 'moderate')
    await page.check('[data-testid="pickup-available"]')
    await page.check('[data-testid="delivery-available"]')
    await page.fill('[data-testid="delivery-fee"]', '10')
    await page.fill('[data-testid="delivery-radius"]', '15')
    
    // Submit listing
    await page.click('[data-testid="create-listing-button"]')
    
    // Should show success message and redirect
    await expect(page.locator('text=Listing created successfully!')).toBeVisible()
    await expect(page).toHaveURL(/\/items\/[a-zA-Z0-9-]+/)
    
    // Verify listing details are displayed
    await expect(page.locator('h1:has-text("Professional Power Drill")')).toBeVisible()
    await expect(page.locator('text=$25/day')).toBeVisible()
    await expect(page.locator('text=$5/hour')).toBeVisible()
    await expect(page.locator('text=Good condition')).toBeVisible()
  })

  test('validates required fields in listing form', async ({ page }) => {
    await page.goto('/items/create')
    
    // Try to submit empty form
    await page.click('[data-testid="create-listing-button"]')
    
    // Should show validation errors
    await expect(page.locator('text=Title is required')).toBeVisible()
    await expect(page.locator('text=Description is required')).toBeVisible()
    await expect(page.locator('text=Category is required')).toBeVisible()
    await expect(page.locator('text=Daily rate is required')).toBeVisible()
    
    // Test invalid pricing
    await page.fill('[data-testid="daily-rate"]', '-10')
    await page.click('[data-testid="create-listing-button"]')
    await expect(page.locator('text=Daily rate must be positive')).toBeVisible()
    
    // Test minimum rental period validation
    await page.fill('[data-testid="daily-rate"]', '25')
    await page.fill('[data-testid="min-rental-hours"]', '0')
    await page.click('[data-testid="create-listing-button"]')
    await expect(page.locator('text=Minimum rental period must be at least 1 hour')).toBeVisible()
  })

  test('user can edit existing listing', async ({ page }) => {
    // Navigate to user's listings
    await page.goto('/dashboard')
    await page.click('text=My Listings')
    
    // Click edit on first listing
    await page.click('[data-testid="edit-listing-button"]')
    await expect(page).toHaveURL(/\/items\/[a-zA-Z0-9-]+\/edit/)
    
    // Update title and price
    await page.fill('[data-testid="title"]', 'Updated Power Drill Title')
    await page.fill('[data-testid="daily-rate"]', '30')
    
    // Add new image
    await page.setInputFiles('[data-testid="image-upload"]', 'src/test/fixtures/drill-3.jpg')
    
    // Update availability
    await page.fill('[data-testid="available-until"]', '2025-12-31')
    
    // Save changes
    await page.click('[data-testid="update-listing-button"]')
    
    // Should show success message
    await expect(page.locator('text=Listing updated successfully!')).toBeVisible()
    
    // Verify changes are reflected
    await expect(page.locator('h1:has-text("Updated Power Drill Title")')).toBeVisible()
    await expect(page.locator('text=$30/day')).toBeVisible()
  })

  test('user can manage listing availability', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=My Listings')
    
    // Click on availability calendar
    await page.click('[data-testid="manage-availability"]')
    
    // Block specific dates
    await page.click('[data-testid="calendar-date-2024-02-15"]')
    await page.click('[data-testid="calendar-date-2024-02-16"]')
    await page.click('[data-testid="block-dates-button"]')
    
    // Should show blocked dates
    await expect(page.locator('[data-testid="blocked-date-2024-02-15"]')).toBeVisible()
    await expect(page.locator('[data-testid="blocked-date-2024-02-16"]')).toBeVisible()
    
    // Unblock a date
    await page.click('[data-testid="blocked-date-2024-02-15"]')
    await page.click('[data-testid="unblock-date-button"]')
    
    // Date should be available again
    await expect(page.locator('[data-testid="blocked-date-2024-02-15"]')).not.toBeVisible()
  })

  test('user can deactivate and reactivate listing', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('text=My Listings')
    
    // Deactivate listing
    await page.click('[data-testid="listing-menu-button"]')
    await page.click('text=Deactivate')
    
    // Confirm deactivation
    await page.click('[data-testid="confirm-deactivate"]')
    
    // Should show inactive status
    await expect(page.locator('text=Inactive')).toBeVisible()
    await expect(page.locator('[data-testid="listing-card"]')).toHaveClass(/inactive/)
    
    // Reactivate listing
    await page.click('[data-testid="listing-menu-button"]')
    await page.click('text=Reactivate')
    
    // Should show active status
    await expect(page.locator('text=Active')).toBeVisible()
    await expect(page.locator('[data-testid="listing-card"]')).not.toHaveClass(/inactive/)
  })

  test('handles image upload errors gracefully', async ({ page }) => {
    await page.goto('/items/create')
    
    // Try to upload invalid file type
    await page.setInputFiles('[data-testid="image-upload"]', 'src/test/fixtures/document.pdf')
    
    // Should show error message
    await expect(page.locator('text=Only image files are allowed')).toBeVisible()
    
    // Try to upload file that's too large (mock large file)
    await page.setInputFiles('[data-testid="image-upload"]', 'src/test/fixtures/large-image.jpg')
    
    // Should show size error
    await expect(page.locator('text=File size must be less than 5MB')).toBeVisible()
  })

  test('shows listing preview before publishing', async ({ page }) => {
    await page.goto('/items/create')
    
    // Fill out form
    await page.fill('[data-testid="title"]', 'Test Item')
    await page.fill('[data-testid="description"]', 'Test description')
    await page.selectOption('[data-testid="category"]', 'tools')
    await page.fill('[data-testid="daily-rate"]', '25')
    
    // Click preview button
    await page.click('[data-testid="preview-button"]')
    
    // Should show preview modal
    await expect(page.locator('[data-testid="listing-preview"]')).toBeVisible()
    await expect(page.locator('text=Test Item')).toBeVisible()
    await expect(page.locator('text=Test description')).toBeVisible()
    await expect(page.locator('text=$25/day')).toBeVisible()
    
    // Can publish from preview
    await page.click('[data-testid="publish-from-preview"]')
    
    // Should create listing
    await expect(page.locator('text=Listing created successfully!')).toBeVisible()
  })

  test('auto-saves draft while editing', async ({ page }) => {
    await page.goto('/items/create')
    
    // Start filling form
    await page.fill('[data-testid="title"]', 'Draft Item')
    await page.fill('[data-testid="description"]', 'This is a draft')
    
    // Wait for auto-save
    await expect(page.locator('text=Draft saved')).toBeVisible()
    
    // Refresh page
    await page.reload()
    
    // Form should be restored from draft
    await expect(page.locator('[data-testid="title"]')).toHaveValue('Draft Item')
    await expect(page.locator('[data-testid="description"]')).toHaveValue('This is a draft')
    
    // Should show draft indicator
    await expect(page.locator('text=Restored from draft')).toBeVisible()
  })
})