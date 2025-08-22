import { test, expect } from '@playwright/test'

test.describe('User Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('user can register and complete profile setup', async ({ page }) => {
    // Navigate to registration
    await page.click('text=Sign Up')
    await expect(page).toHaveURL('/auth/register')

    // Fill registration form
    await page.fill('[data-testid="full-name"]', 'John Doe')
    await page.fill('[data-testid="email"]', 'john.doe@example.com')
    await page.fill('[data-testid="password"]', 'SecurePassword123!')
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123!')

    // Accept terms
    await page.check('[data-testid="terms-checkbox"]')

    // Submit registration
    await page.click('[data-testid="register-button"]')

    // Should show email verification message
    await expect(page.locator('text=Check your email')).toBeVisible()

    // Simulate email verification (in real test, would check email)
    // For now, navigate directly to profile setup
    await page.goto('/profile/setup')

    // Complete profile setup
    await page.fill('[data-testid="phone"]', '+1234567890')
    await page.fill('[data-testid="address"]', '123 Main St')
    await page.fill('[data-testid="city"]', 'San Francisco')
    await page.selectOption('[data-testid="state"]', 'CA')
    await page.fill('[data-testid="zip-code"]', '94105')
    await page.fill('[data-testid="bio"]', 'I love renting and sharing items with my community!')

    // Upload profile picture
    await page.setInputFiles('[data-testid="avatar-upload"]', 'src/test/fixtures/profile-pic.jpg')

    // Submit profile
    await page.click('[data-testid="complete-profile-button"]')

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('text=Welcome, John!')).toBeVisible()
  })

  test('validates registration form fields', async ({ page }) => {
    await page.click('text=Sign Up')

    // Try to submit empty form
    await page.click('[data-testid="register-button"]')

    // Should show validation errors
    await expect(page.locator('text=Full name is required')).toBeVisible()
    await expect(page.locator('text=Email is required')).toBeVisible()
    await expect(page.locator('text=Password is required')).toBeVisible()

    // Test invalid email
    await page.fill('[data-testid="email"]', 'invalid-email')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('text=Invalid email format')).toBeVisible()

    // Test password mismatch
    await page.fill('[data-testid="email"]', 'test@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.fill('[data-testid="confirm-password"]', 'different-password')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('text=Passwords do not match')).toBeVisible()

    // Test weak password
    await page.fill('[data-testid="password"]', '123')
    await page.fill('[data-testid="confirm-password"]', '123')
    await page.click('[data-testid="register-button"]')
    await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible()
  })

  test('handles registration errors gracefully', async ({ page }) => {
    await page.click('text=Sign Up')

    // Fill form with existing email (mock server should return error)
    await page.fill('[data-testid="full-name"]', 'Jane Doe')
    await page.fill('[data-testid="email"]', 'existing@example.com')
    await page.fill('[data-testid="password"]', 'SecurePassword123!')
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123!')
    await page.check('[data-testid="terms-checkbox"]')

    await page.click('[data-testid="register-button"]')

    // Should show error message
    await expect(page.locator('text=Email already registered')).toBeVisible()

    // Form should remain filled (except passwords)
    await expect(page.locator('[data-testid="full-name"]')).toHaveValue('Jane Doe')
    await expect(page.locator('[data-testid="email"]')).toHaveValue('existing@example.com')
    await expect(page.locator('[data-testid="password"]')).toHaveValue('')
    await expect(page.locator('[data-testid="confirm-password"]')).toHaveValue('')
  })

  test('user can navigate between auth pages', async ({ page }) => {
    // Start on login page
    await page.click('text=Sign In')
    await expect(page).toHaveURL('/auth/login')

    // Navigate to registration
    await page.click('text=Create an account')
    await expect(page).toHaveURL('/auth/register')

    // Navigate back to login
    await page.click('text=Already have an account?')
    await expect(page).toHaveURL('/auth/login')

    // Navigate to forgot password
    await page.click('text=Forgot password?')
    await expect(page).toHaveURL('/auth/forgot-password')

    // Navigate back to login
    await page.click('text=Back to login')
    await expect(page).toHaveURL('/auth/login')
  })

  test('profile setup is required after registration', async ({ page }) => {
    // Simulate logged in user without complete profile
    await page.goto('/dashboard')

    // Should redirect to profile setup
    await expect(page).toHaveURL('/profile/setup')
    await expect(page.locator('text=Complete your profile')).toBeVisible()

    // Try to navigate to other pages
    await page.goto('/items/create')
    await expect(page).toHaveURL('/profile/setup')

    await page.goto('/search')
    await expect(page).toHaveURL('/profile/setup')

    // Complete profile setup
    await page.fill('[data-testid="address"]', '123 Main St')
    await page.fill('[data-testid="city"]', 'San Francisco')
    await page.selectOption('[data-testid="state"]', 'CA')
    await page.fill('[data-testid="zip-code"]', '94105')

    await page.click('[data-testid="complete-profile-button"]')

    // Now should be able to access other pages
    await expect(page).toHaveURL('/dashboard')
  })

  test('shows loading states during registration', async ({ page }) => {
    await page.click('text=Sign Up')

    await page.fill('[data-testid="full-name"]', 'John Doe')
    await page.fill('[data-testid="email"]', 'john@example.com')
    await page.fill('[data-testid="password"]', 'SecurePassword123!')
    await page.fill('[data-testid="confirm-password"]', 'SecurePassword123!')
    await page.check('[data-testid="terms-checkbox"]')

    // Click register and immediately check for loading state
    await page.click('[data-testid="register-button"]')
    
    // Should show loading state
    await expect(page.locator('text=Creating account...')).toBeVisible()
    await expect(page.locator('[data-testid="register-button"]')).toBeDisabled()

    // Wait for completion
    await expect(page.locator('text=Check your email')).toBeVisible()
  })
})