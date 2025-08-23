import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import UserAvatar from '../UserAvatar'
import { profileImageService } from '@/lib/profile-image-service'

// Mock the profile image service
vi.mock('@/lib/profile-image-service', () => ({
  profileImageService: {
    getDefaultAvatarUrl: vi.fn()
  }
}))

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, onError, ...props }: any) => (
    <img
      src={src}
      alt={alt}
      onError={onError}
      {...props}
      data-testid="avatar-image"
    />
  )
}))

describe('UserAvatar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(profileImageService.getDefaultAvatarUrl).mockReturnValue(
      'https://ui-avatars.com/api/?name=JD&size=200&background=3B82F6&color=ffffff&bold=true'
    )
  })

  it('renders with provided avatar URL', () => {
    render(
      <UserAvatar
        userId="user-123"
        avatarUrl="https://example.com/avatar.jpg"
        fullName="John Doe"
      />
    )

    const image = screen.getByTestId('avatar-image')
    expect(image).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    expect(image).toHaveAttribute('alt', "John Doe's profile picture")
  })

  it('falls back to default avatar when no URL provided', () => {
    render(
      <UserAvatar
        userId="user-123"
        fullName="John Doe"
      />
    )

    const image = screen.getByTestId('avatar-image')
    expect(image).toHaveAttribute('src', expect.stringContaining('ui-avatars.com'))
    expect(profileImageService.getDefaultAvatarUrl).toHaveBeenCalledWith('user-123', 'John Doe')
  })

  it('handles image load error by switching to default avatar', () => {
    render(
      <UserAvatar
        userId="user-123"
        avatarUrl="https://example.com/broken-avatar.jpg"
        fullName="John Doe"
      />
    )

    const image = screen.getByTestId('avatar-image')
    
    // Initially shows the provided URL
    expect(image).toHaveAttribute('src', 'https://example.com/broken-avatar.jpg')
    
    // Simulate image error
    fireEvent.error(image)
    
    // Should switch to default avatar
    expect(image).toHaveAttribute('src', expect.stringContaining('ui-avatars.com'))
  })

  it('applies correct size classes', () => {
    const { rerender } = render(
      <UserAvatar
        userId="user-123"
        size="sm"
      />
    )

    expect(screen.getByTestId('avatar-image').parentElement).toHaveClass('w-8 h-8')

    rerender(
      <UserAvatar
        userId="user-123"
        size="lg"
      />
    )

    expect(screen.getByTestId('avatar-image').parentElement).toHaveClass('w-12 h-12')
  })

  it('shows online status indicator when enabled', () => {
    render(
      <UserAvatar
        userId="user-123"
        showOnlineStatus={true}
        isOnline={true}
      />
    )

    const statusIndicator = screen.getByTestId('avatar-image').parentElement?.parentElement?.querySelector('.bg-green-400')
    expect(statusIndicator).toBeInTheDocument()
  })

  it('shows offline status indicator', () => {
    render(
      <UserAvatar
        userId="user-123"
        showOnlineStatus={true}
        isOnline={false}
      />
    )

    const statusIndicator = screen.getByTestId('avatar-image').parentElement?.parentElement?.querySelector('.bg-gray-400')
    expect(statusIndicator).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(
      <UserAvatar
        userId="user-123"
        className="custom-class"
      />
    )

    const container = screen.getByTestId('avatar-image').parentElement?.parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('uses custom alt text when provided', () => {
    render(
      <UserAvatar
        userId="user-123"
        alt="Custom alt text"
      />
    )

    const image = screen.getByTestId('avatar-image')
    expect(image).toHaveAttribute('alt', 'Custom alt text')
  })

  it('generates appropriate alt text from full name', () => {
    render(
      <UserAvatar
        userId="user-123"
        fullName="Jane Smith"
      />
    )

    const image = screen.getByTestId('avatar-image')
    expect(image).toHaveAttribute('alt', "Jane Smith's profile picture")
  })

  it('uses fallback alt text when no name provided', () => {
    render(
      <UserAvatar
        userId="user-123"
      />
    )

    const image = screen.getByTestId('avatar-image')
    expect(image).toHaveAttribute('alt', "User's profile picture")
  })

  it('sets unoptimized prop for external avatar service', () => {
    render(
      <UserAvatar
        userId="user-123"
        fullName="John Doe"
      />
    )

    const image = screen.getByTestId('avatar-image')
    expect(image).toHaveAttribute('unoptimized')
  })

  it('does not set unoptimized prop for regular images', () => {
    render(
      <UserAvatar
        userId="user-123"
        avatarUrl="https://example.com/avatar.jpg"
      />
    )

    const image = screen.getByTestId('avatar-image')
    expect(image).not.toHaveAttribute('unoptimized')
  })
})