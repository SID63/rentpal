import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthContext } from '@/contexts/AuthContext'
import ItemForm from '@/components/items/ItemForm'
import { profileService } from '@/lib/database'
import { Profile } from '@/types/database'

// Mock the database service
vi.mock('@/lib/database', () => ({
  profileService: {
    getProfile: vi.fn()
  },
  itemService: {
    createItem: vi.fn()
  }
}))

// Mock the router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

// Mock profile validation components
vi.mock('@/components/profile/ProfileValidationAlert', () => ({
  default: ({ validation }: { validation: { valid: boolean; error?: string } }) => (
    validation.valid ? null : (
      <div data-testid="profile-validation-alert">
        {validation.error}
      </div>
    )
  )
}))

// Mock other components to focus on profile validation
vi.mock('@/components/categories/CategorySelector', () => ({
  default: () => <div data-testid="category-selector">Category Selector</div>
}))

vi.mock('@/components/items/ImageUpload', () => ({
  default: () => <div data-testid="image-upload">Image Upload</div>
}))

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User'
  }
}

const completeProfile: Profile = {
  id: 'test-user-id',
  email: 'test@example.com',
  full_name: 'John Doe',
  avatar_url: null,
  phone: '555-123-4567',
  address: '123 Main St',
  city: 'San Francisco',
  state: 'CA',
  zip_code: '94102',
  latitude: null,
  longitude: null,
  bio: 'I love sharing my stuff!',
  verification_status: 'verified',
  rating: 4.8,
  total_reviews: 15,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
}

const incompleteProfile: Profile = {
  ...completeProfile,
  full_name: '',
  address: '',
  city: '',
  state: '',
  zip_code: ''
}

const AuthWrapper = ({ children, user = mockUser }: { children: React.ReactNode; user?: any }) => (
  <AuthContext.Provider value={{
    user,
    loading: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn()
  }}>
    {children}
  </AuthContext.Provider>
)

describe('ItemForm Profile Validation Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while fetching profile', async () => {
    // Mock a delayed profile fetch
    vi.mocked(profileService.getProfile).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(completeProfile), 100))
    )

    render(
      <AuthWrapper>
        <ItemForm />
      </AuthWrapper>
    )

    expect(screen.getByText('Loading profile information...')).toBeInTheDocument()
  })

  it('should show form when profile is complete', async () => {
    vi.mocked(profileService.getProfile).mockResolvedValue(completeProfile)

    render(
      <AuthWrapper>
        <ItemForm />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(screen.getByText('Create New Listing')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('profile-validation-alert')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create listing/i })).toBeEnabled()
  })

  it('should show validation alert when profile is incomplete', async () => {
    vi.mocked(profileService.getProfile).mockResolvedValue(incompleteProfile)

    render(
      <AuthWrapper>
        <ItemForm />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile-validation-alert')).toBeInTheDocument()
    })

    expect(screen.getByTestId('profile-validation-alert')).toHaveTextContent(
      'Please complete your profile before creating items'
    )
    expect(screen.getByRole('button', { name: /create listing/i })).toBeDisabled()
  })

  it('should show validation alert when profile is null', async () => {
    vi.mocked(profileService.getProfile).mockResolvedValue(null)

    render(
      <AuthWrapper>
        <ItemForm />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile-validation-alert')).toBeInTheDocument()
    })

    expect(screen.getByTestId('profile-validation-alert')).toHaveTextContent(
      'Profile not found'
    )
    expect(screen.getByRole('button', { name: /create listing/i })).toBeDisabled()
  })

  it('should handle profile fetch error gracefully', async () => {
    vi.mocked(profileService.getProfile).mockRejectedValue(new Error('Network error'))

    render(
      <AuthWrapper>
        <ItemForm />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile-validation-alert')).toBeInTheDocument()
    })

    expect(screen.getByTestId('profile-validation-alert')).toHaveTextContent(
      'Unable to load profile information'
    )
    expect(screen.getByRole('button', { name: /create listing/i })).toBeDisabled()
  })

  it('should not show form when user is not authenticated', async () => {
    render(
      <AuthWrapper user={null}>
        <ItemForm />
      </AuthWrapper>
    )

    await waitFor(() => {
      expect(screen.getByTestId('profile-validation-alert')).toBeInTheDocument()
    })

    expect(screen.getByTestId('profile-validation-alert')).toHaveTextContent(
      'User not authenticated'
    )
  })
})