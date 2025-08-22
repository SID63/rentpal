import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ItemDetails } from '../ItemDetails'
import { mockItem, mockUser, mockProfile } from '@/test/utils/test-utils'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('ItemDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
    })
  })

  it('renders item details correctly', () => {
    render(<ItemDetails item={mockItem} />)

    expect(screen.getByText(mockItem.title)).toBeInTheDocument()
    expect(screen.getByText(mockItem.description)).toBeInTheDocument()
    expect(screen.getByText(`$${mockItem.daily_rate}/day`)).toBeInTheDocument()
    expect(screen.getByText(`$${mockItem.hourly_rate}/hour`)).toBeInTheDocument()
    expect(screen.getByText(mockItem.condition)).toBeInTheDocument()
  })

  it('displays item images in gallery', () => {
    render(<ItemDetails item={mockItem} />)

    const images = screen.getAllByRole('img')
    expect(images).toHaveLength(mockItem.images.length)
    
    mockItem.images.forEach((image, index) => {
      expect(images[index]).toHaveAttribute('src', expect.stringContaining(image))
    })
  })

  it('shows availability calendar', () => {
    render(<ItemDetails item={mockItem} />)

    expect(screen.getByText(/availability/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument()
  })

  it('displays owner information', () => {
    render(<ItemDetails item={mockItem} />)

    expect(screen.getByText(/owner/i)).toBeInTheDocument()
    expect(screen.getByText(/rating/i)).toBeInTheDocument()
  })

  it('shows similar items section', () => {
    render(<ItemDetails item={mockItem} />)

    expect(screen.getByText(/similar items/i)).toBeInTheDocument()
  })

  it('handles book now button click', async () => {
    const user = userEvent.setup()
    render(<ItemDetails item={mockItem} />)

    const bookButton = screen.getByRole('button', { name: /book now/i })
    await user.click(bookButton)

    expect(mockPush).toHaveBeenCalledWith(`/items/${mockItem.id}/book`)
  })

  it('shows contact owner button for authenticated users', () => {
    render(<ItemDetails item={mockItem} />)

    expect(screen.getByRole('button', { name: /contact owner/i })).toBeInTheDocument()
  })

  it('hides booking options for item owner', () => {
    const ownerItem = { ...mockItem, owner_id: mockUser.id }
    render(<ItemDetails item={ownerItem} />)

    expect(screen.queryByRole('button', { name: /book now/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /contact owner/i })).not.toBeInTheDocument()
  })

  it('shows login prompt for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      profile: null,
      loading: false,
    })

    render(<ItemDetails item={mockItem} />)

    expect(screen.getByText(/sign in to book/i)).toBeInTheDocument()
  })

  it('displays item policies correctly', () => {
    render(<ItemDetails item={mockItem} />)

    expect(screen.getByText(/cancellation policy/i)).toBeInTheDocument()
    expect(screen.getByText(mockItem.policies.cancellation_policy)).toBeInTheDocument()
    
    if (mockItem.policies.delivery_fee) {
      expect(screen.getByText(`$${mockItem.policies.delivery_fee}`)).toBeInTheDocument()
    }
  })

  it('shows security deposit information', () => {
    render(<ItemDetails item={mockItem} />)

    if (mockItem.security_deposit) {
      expect(screen.getByText(/security deposit/i)).toBeInTheDocument()
      expect(screen.getByText(`$${mockItem.security_deposit}`)).toBeInTheDocument()
    }
  })

  it('handles favorite button toggle', async () => {
    const user = userEvent.setup()
    render(<ItemDetails item={mockItem} />)

    const favoriteButton = screen.getByRole('button', { name: /add to favorites/i })
    await user.click(favoriteButton)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /remove from favorites/i })).toBeInTheDocument()
    })
  })

  it('displays loading state while fetching data', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: true,
    })

    render(<ItemDetails item={mockItem} />)

    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})