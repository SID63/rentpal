import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useReviews } from '../useReviews'
import { mockUser, mockProfile } from '@/test/utils/test-utils'

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
}

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockUseAuth = vi.fn()
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

const mockReviews = [
  {
    id: 'review-1',
    booking_id: 'booking-1',
    reviewer_id: 'user-1',
    reviewee_id: 'user-2',
    item_id: 'item-1',
    rating: 5,
    comment: 'Great item and owner!',
    review_type: 'renter_to_owner',
    created_at: '2024-01-15T00:00:00Z',
    reviewer: {
      full_name: 'John Doe',
      avatar_url: null,
    },
    item: {
      title: 'Test Item',
    },
  },
  {
    id: 'review-2',
    booking_id: 'booking-2',
    reviewer_id: 'user-2',
    reviewee_id: 'user-1',
    item_id: 'item-1',
    rating: 4,
    comment: 'Good renter, took care of the item.',
    review_type: 'owner_to_renter',
    created_at: '2024-01-10T00:00:00Z',
    reviewer: {
      full_name: 'Jane Smith',
      avatar_url: null,
    },
    item: {
      title: 'Test Item',
    },
  },
]

describe('useReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({
      user: mockUser,
      profile: mockProfile,
      loading: false,
    })
  })

  describe('fetchReviews', () => {
    it('fetches reviews for a user successfully', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockReviews,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const reviews = await result.current.fetchReviews('user-2')

      expect(reviews).toEqual(mockReviews)
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews')
      expect(mockQuery.eq).toHaveBeenCalledWith('reviewee_id', 'user-2')
    })

    it('handles fetch error', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      await expect(result.current.fetchReviews('user-2')).rejects.toThrow('Database error')
    })
  })

  describe('submitReview', () => {
    it('submits a new review successfully', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockReviews[0],
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      const reviewData = {
        booking_id: 'booking-1',
        reviewee_id: 'user-2',
        item_id: 'item-1',
        rating: 5,
        comment: 'Great item and owner!',
        review_type: 'renter_to_owner' as const,
      }

      const review = await result.current.submitReview(reviewData)

      expect(review).toEqual(mockReviews[0])
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews')
      expect(mockQuery.insert).toHaveBeenCalledWith({
        ...reviewData,
        reviewer_id: mockUser.id,
      })
    })

    it('handles submit error', async () => {
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insert failed' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      const reviewData = {
        booking_id: 'booking-1',
        reviewee_id: 'user-2',
        item_id: 'item-1',
        rating: 5,
        comment: 'Great item and owner!',
        review_type: 'renter_to_owner' as const,
      }

      await expect(result.current.submitReview(reviewData)).rejects.toThrow('Insert failed')
    })

    it('requires authentication', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
      })

      const { result } = renderHook(() => useReviews())

      const reviewData = {
        booking_id: 'booking-1',
        reviewee_id: 'user-2',
        item_id: 'item-1',
        rating: 5,
        comment: 'Great item and owner!',
        review_type: 'renter_to_owner' as const,
      }

      await expect(result.current.submitReview(reviewData)).rejects.toThrow('Authentication required')
    })
  })

  describe('updateReview', () => {
    it('updates an existing review successfully', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { ...mockReviews[0], rating: 4, comment: 'Updated comment' },
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      const updatedReview = await result.current.updateReview('review-1', {
        rating: 4,
        comment: 'Updated comment',
      })

      expect(updatedReview.rating).toBe(4)
      expect(updatedReview.comment).toBe('Updated comment')
      expect(mockQuery.update).toHaveBeenCalledWith({
        rating: 4,
        comment: 'Updated comment',
      })
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'review-1')
    })

    it('handles update error', async () => {
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Update failed' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      await expect(result.current.updateReview('review-1', { rating: 4 })).rejects.toThrow('Update failed')
    })
  })

  describe('deleteReview', () => {
    it('deletes a review successfully', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      await result.current.deleteReview('review-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('reviews')
      expect(mockQuery.delete).toHaveBeenCalled()
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'review-1')
    })

    it('handles delete error', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Delete failed' },
        }),
      }

      mockSupabase.from.mockReturnValue(mockQuery)

      const { result } = renderHook(() => useReviews())

      await expect(result.current.deleteReview('review-1')).rejects.toThrow('Delete failed')
    })
  })

  describe('calculateAverageRating', () => {
    it('calculates average rating correctly', () => {
      const { result } = renderHook(() => useReviews())

      const average = result.current.calculateAverageRating(mockReviews)

      expect(average).toBe(4.5) // (5 + 4) / 2
    })

    it('returns 0 for empty reviews array', () => {
      const { result } = renderHook(() => useReviews())

      const average = result.current.calculateAverageRating([])

      expect(average).toBe(0)
    })
  })

  describe('canUserReview', () => {
    it('returns true when user can review', () => {
      const { result } = renderHook(() => useReviews())

      const canReview = result.current.canUserReview('booking-1', 'user-2')

      expect(canReview).toBe(true)
    })

    it('returns false when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        profile: null,
        loading: false,
      })

      const { result } = renderHook(() => useReviews())

      const canReview = result.current.canUserReview('booking-1', 'user-2')

      expect(canReview).toBe(false)
    })

    it('returns false when trying to review themselves', () => {
      const { result } = renderHook(() => useReviews())

      const canReview = result.current.canUserReview('booking-1', mockUser.id)

      expect(canReview).toBe(false)
    })
  })

  describe('getReviewStats', () => {
    it('calculates review statistics correctly', () => {
      const { result } = renderHook(() => useReviews())

      const stats = result.current.getReviewStats(mockReviews)

      expect(stats).toEqual({
        totalReviews: 2,
        averageRating: 4.5,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 1,
          5: 1,
        },
      })
    })

    it('handles empty reviews array', () => {
      const { result } = renderHook(() => useReviews())

      const stats = result.current.getReviewStats([])

      expect(stats).toEqual({
        totalReviews: 0,
        averageRating: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      })
    })
  })
})