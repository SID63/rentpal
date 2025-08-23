import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { BookingForm } from '../BookingForm'
import { mockItem } from '@/test/utils/test-utils'

const mockInsert = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}))

// Mock date picker
vi.mock('react-datepicker', () => ({
  default: ({ onChange, selected, ...props }: { onChange: (date: Date) => void; selected?: Date; [key: string]: unknown }) => (
    <input
      type="date"
      value={selected ? selected.toISOString().split('T')[0] : ''}
      onChange={(e) => onChange(new Date(e.target.value))}
      {...props}
    />
  ),
}))

describe('BookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders booking form with date selection', () => {
    render(<BookingForm item={mockItem} />)
    
    expect(screen.getByText(/book this item/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument()
  })

  it('displays item pricing information', () => {
    render(<BookingForm item={mockItem} />)
    
    expect(screen.getByText(`$${mockItem.daily_rate}/day`)).toBeInTheDocument()
    if (mockItem.security_deposit) {
      expect(screen.getByText(`$${mockItem.security_deposit} security deposit`)).toBeInTheDocument()
    }
  })

  it('calculates total cost based on selected dates', async () => {
    const user = userEvent.setup()
    render(<BookingForm item={mockItem} />)
    
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)
    
    // Select 2-day rental
    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')
    
    await waitFor(() => {
      // 2 days * $25/day = $50 base cost
      expect(screen.getByText(/\$50\.00/)).toBeInTheDocument()
    })
  })

  it('validates date selection', async () => {
    const user = userEvent.setup()
    render(<BookingForm item={mockItem} />)
    
    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/start date is required/i)).toBeInTheDocument()
      expect(screen.getByText(/end date is required/i)).toBeInTheDocument()
    })
  })

  it('prevents booking past dates', async () => {
    const user = userEvent.setup()
    render(<BookingForm item={mockItem} />)
    
    const startDate = screen.getByLabelText(/start date/i)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    await user.type(startDate, yesterday.toISOString().split('T')[0])
    
    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/start date cannot be in the past/i)).toBeInTheDocument()
    })
  })

  it('prevents end date before start date', async () => {
    const user = userEvent.setup()
    render(<BookingForm item={mockItem} />)
    
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)
    
    await user.type(startDate, '2024-02-05')
    await user.type(endDate, '2024-02-03')
    
    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/end date must be after start date/i)).toBeInTheDocument()
    })
  })

  it('respects minimum rental period', async () => {
    const user = userEvent.setup()
    const itemWithMinPeriod = {
      ...mockItem,
      availability: {
        ...mockItem.availability,
        minimum_rental_period: 24 // 24 hours minimum
      }
    }
    
    render(<BookingForm item={itemWithMinPeriod} />)
    
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)
    
    // Try to book for less than minimum period
    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-01') // Same day
    
    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/minimum rental period is 24 hours/i)).toBeInTheDocument()
    })
  })

  it('shows delivery options when available', () => {
    const itemWithDelivery = {
      ...mockItem,
      policies: {
        ...mockItem.policies,
        pickup_delivery: 'both' as const,
        delivery_fee: 15
      }
    }
    
    render(<BookingForm item={itemWithDelivery} />)
    
    expect(screen.getByText(/pickup or delivery/i)).toBeInTheDocument()
    expect(screen.getByText(/\$15 delivery fee/i)).toBeInTheDocument()
  })

  it('submits booking with valid data', async () => {
    const user = userEvent.setup()
    mockInsert.mockResolvedValue({ data: { id: 'booking-123' }, error: null })
    
    render(<BookingForm item={mockItem} />)
    
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)
    
    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')
    
    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          item_id: mockItem.id,
          start_date: expect.any(String),
          end_date: expect.any(String),
          total_hours: expect.any(Number),
        })
      )
    })
  })

  it('shows loading state during booking submission', async () => {
    const user = userEvent.setup()
    mockInsert.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<BookingForm item={mockItem} />)
    
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)
    
    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')
    
    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/processing booking/i)).toBeInTheDocument()
    expect(submitButton).toBeDisabled()
  })

  it('displays error message on booking failure', async () => {
    const user = userEvent.setup()
    mockInsert.mockResolvedValue({ 
      data: null, 
      error: { message: 'Item not available for selected dates' } 
    })
    
    render(<BookingForm item={mockItem} />)
    
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)
    
    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')
    
    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/item not available for selected dates/i)).toBeInTheDocument()
    })
  })
})