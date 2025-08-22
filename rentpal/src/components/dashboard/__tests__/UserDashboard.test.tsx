import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { UserDashboard } from '../UserDashboard'
import { mockUser, mockProfile, mockItem, mockBooking } from '@/test/utils/test-utils'

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockUseDatabase = vi.fn()
vi.mock('@/hooks/useDatabase', () => ({
  useDatabase: () => mockUseDatabase(),
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('UserDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
    })
    mockUseDatabase.mockReturnValue({
      data: {
        listings: [mockItem],
        bookings: [mockBooking],
        earnings: {
          total: 250.00,
          thisMonth: 75.00,
          pending: 25.00,
        },
        stats: {
          totalListings: 1,
          activeBookings: 1,
          completedRentals: 5,
          averageRating: 4.8,
        },
      },
      loading: false,
      error: null,
    })
  })

  it('renders dashboard overview correctly', () => {
    render(<UserDashboard />)

    expect(screen.getByText(`Welcome back, ${mockProfile.full_name}!`)).toBeInTheDocument()
    expect(screen.getByText('Dashboard Overview')).toBeInTheDocument()
  })

  it('displays user stats cards', () => {
    render(<UserDashboard />)

    expect(screen.getByText('Total Listings')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Active Bookings')).toBeInTheDocument()
    expect(screen.getByText('Completed Rentals')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('Average Rating')).toBeInTheDocument()
    expect(screen.getByText('4.8')).toBeInTheDocument()
  })

  it('shows earnings overview', () => {
    render(<UserDashboard />)

    expect(screen.getByText('Earnings Overview')).toBeInTheDocument()
    expect(screen.getByText('$250.00')).toBeInTheDocument() // Total earnings
    expect(screen.getByText('$75.00')).toBeInTheDocument() // This month
    expect(screen.getByText('$25.00')).toBeInTheDocument() // Pending
  })

  it('displays recent listings', () => {
    render(<UserDashboard />)

    expect(screen.getByText('Your Listings')).toBeInTheDocument()
    expect(screen.getByText(mockItem.title)).toBeInTheDocument()
  })

  it('shows recent bookings', () => {
    render(<UserDashboard />)

    expect(screen.getByText('Recent Bookings')).toBeInTheDocument()
    expect(screen.getByText(/booking/i)).toBeInTheDocument()
  })

  it('handles create new listing button click', async () => {
    const user = userEvent.setup()
    render(<UserDashboard />)

    const createListingButton = screen.getByRole('button', { name: /create new listing/i })
    await user.click(createListingButton)

    expect(mockPush).toHaveBeenCalledWith('/items/create')
  })

  it('navigates to listings management', async () => {
    const user = userEvent.setup()
    render(<UserDashboard />)

    const manageListingsButton = screen.getByRole('button', { name: /manage listings/i })
    await user.click(manageListingsButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/listings')
  })

  it('navigates to bookings page', async () => {
    const user = userEvent.setup()
    render(<UserDashboard />)

    const viewBookingsButton = screen.getByRole('button', { name: /view all bookings/i })
    await user.click(viewBookingsButton)

    expect(mockPush).toHaveBeenCalledWith('/dashboard/bookings')
  })

  it('shows loading state', () => {
    mockUseDatabase.mockReturnValue({
      data: null,
      loading: true,
      error: null,
    })

    render(<UserDashboard />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('handles error state', () => {
    mockUseDatabase.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Failed to load dashboard data'),
    })

    render(<UserDashboard />)

    expect(screen.getByText(/error loading dashboard/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('shows empty state when no listings', () => {
    mockUseDatabase.mockReturnValue({
      data: {
        listings: [],
        bookings: [],
        earnings: { total: 0, thisMonth: 0, pending: 0 },
        stats: {
          totalListings: 0,
          activeBookings: 0,
          completedRentals: 0,
          averageRating: 0,
        },
      },
      loading: false,
      error: null,
    })

    render(<UserDashboard />)

    expect(screen.getByText(/no listings yet/i)).toBeInTheDocument()
    expect(screen.getByText(/create your first listing/i)).toBeInTheDocument()
  })

  it('displays notifications when available', () => {
    mockUseDatabase.mockReturnValue({
      data: {
        listings: [mockItem],
        bookings: [mockBooking],
        earnings: { total: 250.00, thisMonth: 75.00, pending: 25.00 },
        stats: {
          totalListings: 1,
          activeBookings: 1,
          completedRentals: 5,
          averageRating: 4.8,
        },
        notifications: [
          {
            id: '1',
            type: 'booking_request',
            message: 'New booking request for Test Item',
            read: false,
            created_at: '2024-01-15T00:00:00Z',
          },
        ],
      },
      loading: false,
      error: null,
    })

    render(<UserDashboard />)

    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('New booking request for Test Item')).toBeInTheDocument()
  })

  it('shows quick actions section', () => {
    render(<UserDashboard />)

    expect(screen.getByText('Quick Actions')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create new listing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manage listings/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /view messages/i })).toBeInTheDocument()
  })

  it('handles incomplete profile setup', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: { ...mockProfile, address: null, city: null },
      loading: false,
    })

    render(<UserDashboard />)

    expect(screen.getByText(/complete your profile/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument()
  })

  it('refreshes data when refresh button is clicked', async () => {
    const mockRefresh = vi.fn()
    mockUseDatabase.mockReturnValue({
      data: {
        listings: [mockItem],
        bookings: [mockBooking],
        earnings: { total: 250.00, thisMonth: 75.00, pending: 25.00 },
        stats: {
          totalListings: 1,
          activeBookings: 1,
          completedRentals: 5,
          averageRating: 4.8,
        },
      },
      loading: false,
      error: null,
      refresh: mockRefresh,
    })

    const user = userEvent.setup()
    render(<UserDashboard />)

    const refreshButton = screen.getByRole('button', { name: /refresh/i })
    await user.click(refreshButton)

    expect(mockRefresh).toHaveBeenCalled()
  })
})