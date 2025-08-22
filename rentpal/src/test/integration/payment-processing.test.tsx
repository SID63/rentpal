import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { PaymentProcessor } from '@/components/booking/PaymentProcessor'
import { mockUser, mockProfile, mockBooking } from '@/test/utils/test-utils'

// Mock Stripe
const mockStripe = {
  confirmCardPayment: vi.fn(),
  createPaymentMethod: vi.fn(),
  retrievePaymentIntent: vi.fn(),
}

const mockElements = {
  create: vi.fn(() => ({
    mount: vi.fn(),
    unmount: vi.fn(),
    on: vi.fn(),
    update: vi.fn(),
  })),
}

vi.mock('@stripe/stripe-js', () => ({
  loadStripe: vi.fn(() => Promise.resolve(mockStripe)),
}))

vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) => children,
  useStripe: () => mockStripe,
  useElements: () => mockElements,
  CardElement: () => <div data-testid="card-element">Card Element</div>,
}))

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
  functions: {
    invoke: vi.fn(),
  },
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

describe('Payment Processing Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
    })
  })

  describe('Payment Intent Creation', () => {
    it('creates payment intent successfully', async () => {
      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 6500, // $65.00
        currency: 'usd',
        status: 'requires_payment_method',
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { paymentIntent: mockPaymentIntent },
        error: null,
      })

      render(
        <PaymentProcessor
          booking={mockBooking}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('create-payment-intent', {
          body: {
            amount: mockBooking.pricing.total_amount * 100, // Convert to cents
            currency: 'usd',
            booking_id: mockBooking.id,
            customer_id: mockUser.id,
          },
        })
      })

      expect(screen.getByText('$65.00')).toBeInTheDocument()
      expect(screen.getByTestId('card-element')).toBeInTheDocument()
    })

    it('handles payment intent creation error', async () => {
      mockSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'Failed to create payment intent' },
      })

      const mockOnError = vi.fn()

      render(
        <PaymentProcessor
          booking={mockBooking}
          onSuccess={vi.fn()}
          onError={mockOnError}
        />
      )

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Failed to create payment intent')
      })
    })
  })

  describe('Payment Confirmation', () => {
    it('processes payment successfully', async () => {
      const user = userEvent.setup()

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 6500,
        currency: 'usd',
        status: 'requires_payment_method',
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { paymentIntent: mockPaymentIntent },
        error: null,
      })

      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: {
          ...mockPaymentIntent,
          status: 'succeeded',
        },
        error: null,
      })

      // Mock booking update
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockBooking, payment_status: 'paid' },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const mockOnSuccess = vi.fn()

      render(
        <PaymentProcessor
          booking={mockBooking}
          onSuccess={mockOnSuccess}
          onError={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('card-element')).toBeInTheDocument()
      })

      // Submit payment
      const payButton = screen.getByRole('button', { name: /pay now/i })
      await user.click(payButton)

      await waitFor(() => {
        expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
          mockPaymentIntent.client_secret,
          expect.objectContaining({
            payment_method: expect.any(Object),
          })
        )
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          ...mockBooking,
          payment_status: 'paid',
        })
      })
    })

    it('handles payment failure', async () => {
      const user = userEvent.setup()

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 6500,
        currency: 'usd',
        status: 'requires_payment_method',
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { paymentIntent: mockPaymentIntent },
        error: null,
      })

      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: null,
        error: {
          type: 'card_error',
          code: 'card_declined',
          message: 'Your card was declined.',
        },
      })

      const mockOnError = vi.fn()

      render(
        <PaymentProcessor
          booking={mockBooking}
          onSuccess={vi.fn()}
          onError={mockOnError}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('card-element')).toBeInTheDocument()
      })

      const payButton = screen.getByRole('button', { name: /pay now/i })
      await user.click(payButton)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Your card was declined.')
      })

      // Should show error message
      expect(screen.getByText('Your card was declined.')).toBeInTheDocument()
    })

    it('handles network errors during payment', async () => {
      const user = userEvent.setup()

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 6500,
        currency: 'usd',
        status: 'requires_payment_method',
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { paymentIntent: mockPaymentIntent },
        error: null,
      })

      mockStripe.confirmCardPayment.mockRejectedValue(
        new Error('Network error')
      )

      const mockOnError = vi.fn()

      render(
        <PaymentProcessor
          booking={mockBooking}
          onSuccess={vi.fn()}
          onError={mockOnError}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('card-element')).toBeInTheDocument()
      })

      const payButton = screen.getByRole('button', { name: /pay now/i })
      await user.click(payButton)

      await waitFor(() => {
        expect(mockOnError).toHaveBeenCalledWith('Network error')
      })
    })
  })

  describe('Payment Methods', () => {
    it('saves payment method for future use', async () => {
      const user = userEvent.setup()

      const mockPaymentIntent = {
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 6500,
        currency: 'usd',
        status: 'requires_payment_method',
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { paymentIntent: mockPaymentIntent },
        error: null,
      })

      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: {
          ...mockPaymentIntent,
          status: 'succeeded',
          payment_method: {
            id: 'pm_test_123',
            card: {
              brand: 'visa',
              last4: '4242',
            },
          },
        },
        error: null,
      })

      render(
        <PaymentProcessor
          booking={mockBooking}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByTestId('card-element')).toBeInTheDocument()
      })

      // Check save payment method option
      const savePaymentCheckbox = screen.getByRole('checkbox', { 
        name: /save payment method/i 
      })
      await user.click(savePaymentCheckbox)

      const payButton = screen.getByRole('button', { name: /pay now/i })
      await user.click(payButton)

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('save-payment-method', {
          body: {
            payment_method_id: 'pm_test_123',
            customer_id: mockUser.id,
          },
        })
      })
    })

    it('uses saved payment method', async () => {
      const user = userEvent.setup()

      const savedPaymentMethod = {
        id: 'pm_saved_123',
        card: {
          brand: 'visa',
          last4: '4242',
          exp_month: 12,
          exp_year: 2025,
        },
      }

      // Mock fetching saved payment methods
      mockSupabase.functions.invoke
        .mockResolvedValueOnce({
          data: { paymentMethods: [savedPaymentMethod] },
          error: null,
        })
        .mockResolvedValueOnce({
          data: { 
            paymentIntent: {
              id: 'pi_test_123',
              client_secret: 'pi_test_123_secret',
              amount: 6500,
              currency: 'usd',
              status: 'requires_payment_method',
            }
          },
          error: null,
        })

      mockStripe.confirmCardPayment.mockResolvedValue({
        paymentIntent: {
          id: 'pi_test_123',
          status: 'succeeded',
        },
        error: null,
      })

      render(
        <PaymentProcessor
          booking={mockBooking}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Visa ending in 4242')).toBeInTheDocument()
      })

      // Select saved payment method
      const savedMethodRadio = screen.getByRole('radio', { 
        name: /visa ending in 4242/i 
      })
      await user.click(savedMethodRadio)

      const payButton = screen.getByRole('button', { name: /pay now/i })
      await user.click(payButton)

      await waitFor(() => {
        expect(mockStripe.confirmCardPayment).toHaveBeenCalledWith(
          'pi_test_123_secret',
          {
            payment_method: 'pm_saved_123',
          }
        )
      })
    })
  })

  describe('Refund Processing', () => {
    it('processes refund successfully', async () => {
      const paidBooking = {
        ...mockBooking,
        payment_status: 'paid' as const,
        status: 'cancelled' as const,
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { 
          refund: {
            id: 're_test_123',
            amount: 6500,
            status: 'succeeded',
          }
        },
        error: null,
      })

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...paidBooking, payment_status: 'refunded' },
          error: null,
        }),
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const mockOnSuccess = vi.fn()

      render(
        <PaymentProcessor
          booking={paidBooking}
          onSuccess={mockOnSuccess}
          onError={vi.fn()}
          mode="refund"
        />
      )

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-refund', {
          body: {
            booking_id: paidBooking.id,
            amount: paidBooking.pricing.total_amount * 100,
            reason: 'requested_by_customer',
          },
        })
      })

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith({
          ...paidBooking,
          payment_status: 'refunded',
        })
      })
    })

    it('handles partial refunds based on cancellation policy', async () => {
      const paidBooking = {
        ...mockBooking,
        payment_status: 'paid' as const,
        status: 'cancelled' as const,
      }

      // Mock cancellation policy calculation
      const refundAmount = Math.floor(paidBooking.pricing.total_amount * 0.8 * 100) // 80% refund

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { 
          refund: {
            id: 're_test_123',
            amount: refundAmount,
            status: 'succeeded',
          }
        },
        error: null,
      })

      render(
        <PaymentProcessor
          booking={paidBooking}
          onSuccess={vi.fn()}
          onError={vi.fn()}
          mode="refund"
          refundAmount={refundAmount / 100}
        />
      )

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('process-refund', {
          body: {
            booking_id: paidBooking.id,
            amount: refundAmount,
            reason: 'requested_by_customer',
          },
        })
      })

      expect(screen.getByText(`$${(refundAmount / 100).toFixed(2)}`)).toBeInTheDocument()
    })
  })

  describe('Security Deposit Handling', () => {
    it('processes security deposit hold', async () => {
      const bookingWithDeposit = {
        ...mockBooking,
        pricing: {
          ...mockBooking.pricing,
          security_deposit: 50.00,
        },
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { 
          paymentIntent: {
            id: 'pi_test_123',
            client_secret: 'pi_test_123_secret',
            amount: (bookingWithDeposit.pricing.total_amount + bookingWithDeposit.pricing.security_deposit) * 100,
            currency: 'usd',
            status: 'requires_payment_method',
          }
        },
        error: null,
      })

      render(
        <PaymentProcessor
          booking={bookingWithDeposit}
          onSuccess={vi.fn()}
          onError={vi.fn()}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Security Deposit: $50.00')).toBeInTheDocument()
        expect(screen.getByText('Total: $115.00')).toBeInTheDocument() // $65 + $50
      })
    })

    it('releases security deposit after rental completion', async () => {
      const completedBooking = {
        ...mockBooking,
        status: 'completed' as const,
        payment_status: 'paid' as const,
      }

      mockSupabase.functions.invoke.mockResolvedValue({
        data: { 
          refund: {
            id: 're_deposit_123',
            amount: 5000, // $50.00 security deposit
            status: 'succeeded',
          }
        },
        error: null,
      })

      render(
        <PaymentProcessor
          booking={completedBooking}
          onSuccess={vi.fn()}
          onError={vi.fn()}
          mode="release-deposit"
        />
      )

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('release-security-deposit', {
          body: {
            booking_id: completedBooking.id,
          },
        })
      })
    })
  })
})