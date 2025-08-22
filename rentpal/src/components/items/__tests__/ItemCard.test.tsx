import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { ItemCard } from '../ItemCard'
import { mockItem } from '@/test/utils/test-utils'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('ItemCard', () => {
  it('renders item information correctly', () => {
    render(<ItemCard item={mockItem} />)
    
    expect(screen.getByText(mockItem.title)).toBeInTheDocument()
    expect(screen.getByText(mockItem.description)).toBeInTheDocument()
    expect(screen.getByText(`$${mockItem.daily_rate}/day`)).toBeInTheDocument()
    expect(screen.getByText(mockItem.location.city)).toBeInTheDocument()
  })

  it('displays item images', () => {
    render(<ItemCard item={mockItem} />)
    
    const image = screen.getByAltText(mockItem.title)
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', expect.stringContaining(mockItem.images[0]))
  })

  it('shows condition badge', () => {
    render(<ItemCard item={mockItem} />)
    
    expect(screen.getByText(mockItem.condition)).toBeInTheDocument()
  })

  it('navigates to item details on click', async () => {
    const user = userEvent.setup()
    render(<ItemCard item={mockItem} />)
    
    const card = screen.getByRole('article')
    await user.click(card)
    
    expect(mockPush).toHaveBeenCalledWith(`/items/${mockItem.id}`)
  })

  it('shows favorite button when user is authenticated', () => {
    // Mock authenticated user
    vi.mock('@/contexts/AuthContext', () => ({
      useAuth: () => ({
        user: { id: 'user-123' },
        loading: false,
      }),
    }))

    render(<ItemCard item={mockItem} showFavorite />)
    
    expect(screen.getByRole('button', { name: /add to favorites/i })).toBeInTheDocument()
  })

  it('displays unavailable state correctly', () => {
    const unavailableItem = {
      ...mockItem,
      status: 'rented' as const
    }
    
    render(<ItemCard item={unavailableItem} />)
    
    expect(screen.getByText(/currently rented/i)).toBeInTheDocument()
  })

  it('shows distance when provided', () => {
    render(<ItemCard item={mockItem} distance={2.5} />)
    
    expect(screen.getByText('2.5 miles away')).toBeInTheDocument()
  })

  it('displays rating when available', () => {
    const itemWithRating = {
      ...mockItem,
      rating: 4.5,
      review_count: 12
    }
    
    render(<ItemCard item={itemWithRating} />)
    
    expect(screen.getByText('4.5')).toBeInTheDocument()
    expect(screen.getByText('(12 reviews)')).toBeInTheDocument()
  })

  it('handles missing images gracefully', () => {
    const itemWithoutImages = {
      ...mockItem,
      images: []
    }
    
    render(<ItemCard item={itemWithoutImages} />)
    
    const placeholder = screen.getByText(/no image available/i)
    expect(placeholder).toBeInTheDocument()
  })
})