import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { BookingForm } from '@/components/booking/BookingForm'
import { BookingConfirmation } from '@/components/booking/BookingConfirmation'
import { ItemDetails } from '@/components/items/ItemDetails'
import { mockItem, mockBooking } from '@/test/utils/test-utils'

const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()
const mockEq = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}))

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock Stripe
const mockStripe = {
  confirmPayment: vi.fn(),
  elements: vi.fn(),
}

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(mockStripe)),
}))

describe('Booking Flow Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      eq: mockEq,
      single: mockSingle,
    })
    
    mockSelect.mockReturnThis()
    mockInsert.mockReturnThis()
    mockEq.mockReturnThis()
  })

  it('completes full booking flow from item details to confirmation', async () => {
    const user = userEvent.setup()

    // Mock item details fetch
    mockSingle.mockResolvedValue({ data: mockItem, error: null })

    // Mock booking creation
    mockInsert.mockResolvedValue({ data: mockBooking, error: null })

    // Mock payment processing
    mockStripe.confirmPayment.mockResolvedValue({ error: null })

    // Start with item details page
    render(<ItemDetails itemId={mockItem.id} />)

    await waitFor(() => {
      expect(screen.getByText(mockItem.title)).toBeInTheDocument()
    })

    // Click book now button
    const bookButton = screen.getByRole('button', { name: /book now/i })
    await user.click(bookButton)

    // Should show booking form
    expect(screen.getByText(/select dates/i)).toBeInTheDocument()

    // Fill out booking form
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)

    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')

    // Verify cost calculation
    await waitFor(() => {
      expect(screen.getByText(/\$50\.00/)).toBeInTheDocument() // 2 days * $25
    })

    // Submit booking
    const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          item_id: mockItem.id,
          start_date: expect.any(String),
          end_date: expect.any(String),
          total_hours: 48, // 2 days
        })
      )
    })

    // Should proceed to payment
    expect(screen.getByText(/payment details/i)).toBeInTheDocument()

    // Complete payment
    const payButton = screen.getByRole('button', { name: /pay now/i })
    await user.click(payButton)

    await waitFor(() => {
      expect(mockStripe.confirmPayment).toHaveBeenCalled()
    })

    // Should show confirmation
    expect(screen.getByText(/booking confirmed/i)).toBeInTheDocument()
    expect(screen.getByText(mockBooking.id)).toBeInTheDocument()
  })

  it('handles booking conflicts gracefully', async () => {
    const user = userEvent.setup()

    // Mock booking conflict error
    mockInsert.mockResolvedValue({
      data: null,
      error: { message: 'Item not available for selected dates' }
    })

    render(<BookingForm item={mockItem} />)

    // Fill out form with conflicting dates
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)

    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')

    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/item not available for selected dates/i)).toBeInTheDocument()
    })

    // Should suggest alternative dates
    expect(screen.getByText(/try different dates/i)).toBeInTheDocument()
  })

  it('validates minimum rental period', async () => {
    const user = userEvent.setup()

    const itemWithMinPeriod = {
      ...mockItem,
      availability: {
        ...mockItem.availability,
        minimum_rental_period: 24 // 24 hours minimum
      }
    }

    render(<BookingForm item={itemWithMinPeriod} />)

    // Try to book for less than minimum period
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)

    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-01') // Same day

    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/minimum rental period is 24 hours/i)).toBeInTheDocument()
    })

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('handles payment failures', async () => {
    const user = userEvent.setup()

    // Mock successful booking creation
    mockInsert.mockResolvedValue({ data: mockBooking, error: null })

    // Mock payment failure
    mockStripe.confirmPayment.mockResolvedValue({
      error: { message: 'Your card was declined' }
    })

    render(<BookingForm item={mockItem} />)

    // Complete booking form
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)

    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')

    const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
    await user.click(submitButton)

    // Proceed to payment
    const payButton = screen.getByRole('button', { name: /pay now/i })
    await user.click(payButton)

    await waitFor(() => {
      expect(screen.getByText(/your card was declined/i)).toBeInTheDocument()
    })

    // Should allow retry
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('calculates pricing correctly with delivery', async () => {
    const user = userEvent.setup()

    const itemWithDelivery = {
      ...mockItem,
      policies: {
        ...mockItem.policies,
        pickup_delivery: 'both' as const,
        delivery_fee: 15
      }
    }

    render(<BookingForm item={itemWithDelivery} />)

    // Fill dates
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)

    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')

    // Select delivery option
    const deliveryOption = screen.getByLabelText(/delivery/i)
    await user.click(deliveryOption)

    await waitFor(() => {
      // Base cost: 2 days * $25 = $50
      // Delivery fee: $15
      // Service fee: 10% of base = $5
      // Security deposit: $50
      // Total: $120
      expect(screen.getByText(/\$120\.00/)).toBeInTheDocument()
    })
  })

  it('sends booking confirmation notifications', async () => {
    const user = userEvent.setup()

    // Mock successful booking and payment
    mockInsert.mockResolvedValue({ data: mockBooking, error: null })
    mockStripe.confirmPayment.mockResolvedValue({ error: null })

    const mockSendNotification = vi.fn()
    vi.mock('@/lib/notifications', () => ({
      sendBookingConfirmation: mockSendNotification,
    }))

    render(<BookingForm item={mockItem} />)

    // Complete booking flow
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)

    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')

    const submitButton = screen.getByRole('button', { name: /proceed to payment/i })
    await user.click(submitButton)

    const payButton = screen.getByRole('button', { name: /pay now/i })
    await user.click(payButton)

    await waitFor(() => {
      expect(mockSendNotification).toHaveBeenCalledWith(
        mockBooking.id,
        mockBooking.renter_id,
        mockBooking.owner_id
      )
    })
  })

  it('updates item availability after booking', async () => {
    const user = userEvent.setup()

    const mockUpdate = vi.fn()
    mockFrom.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      single: mockSingle,
    })

    mockInsert.mockResolvedValue({ data: mockBooking, error: null })
    mockUpdate.mockResolvedValue({ data: null, error: null })

    render(<BookingForm item={mockItem} />)

    // Complete booking
    const startDate = screen.getByLabelText(/start date/i)
    const endDate = screen.getByLabelText(/end date/i)

    await user.type(startDate, '2024-02-01')
    await user.type(endDate, '2024-02-03')

    const submitButton = screen.getByRole('button', { name: /book now/i })
    await user.click(submitButton)

    await waitFor(() => {
      // Should update item's blocked dates
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          availability: expect.objectContaining({
            blocked_dates: expect.arrayContaining(['2024-02-01', '2024-02-02'])
          })
        })
      )
    })
  })
})