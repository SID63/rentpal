// Custom hooks for review operations
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { reviewService } from '@/lib/database'
import { Review, ReviewWithDetails, ReviewInsert } from '@/types/database'

export function useItemReviews(itemId: string) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: {} as { [key: number]: number }
  })

  useEffect(() => {
    if (itemId) {
      fetchReviews()
      fetchStats()
    }
  }, [itemId])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const data = await reviewService.getItemReviews(itemId)
      setReviews(data)
    } catch {
      setError('Failed to fetch reviews')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await reviewService.getReviewStats(itemId)
      setStats(data)
    } catch {
      console.error('Failed to fetch review stats')
    }
  }

  const refresh = useCallback(() => {
    fetchReviews()
    fetchStats()
  }, [itemId])

  return { reviews, loading, error, stats, refresh }
}

export function useUserReviews(userId: string, type: 'received' | 'given' = 'received') {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userId) {
      fetchReviews()
    }
  }, [userId, type])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const data = type === 'received' 
        ? await reviewService.getUserReviews(userId)
        : await reviewService.getReviewsByReviewer(userId)
      setReviews(data)
    } catch {
      setError('Failed to fetch reviews')
    } finally {
      setLoading(false)
    }
  }

  const refresh = useCallback(() => {
    fetchReviews()
  }, [userId, type])

  return { reviews, loading, error, refresh }
}

export function useReviewForm(bookingId: string) {
  const [canReview, setCanReview] = useState(false)
  const [existingReview, setExistingReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (user && bookingId) {
      checkReviewEligibility()
    }
  }, [user, bookingId])

  const checkReviewEligibility = async () => {
    if (!user) return

    try {
      setLoading(true)
      const canUserReview = await reviewService.canUserReview(bookingId, user.id)
      const existing = await reviewService.getBookingReview(bookingId, user.id)
      
      setCanReview(canUserReview)
      setExistingReview(existing)
    } catch {
      setError('Failed to check review eligibility')
    } finally {
      setLoading(false)
    }
  }

  const submitReview = async (reviewData: ReviewInsert): Promise<Review | null> => {
    if (!user) return null

    try {
      setSubmitting(true)
      setError(null)
      
      const review = await reviewService.createReview(reviewData)
      
      if (review) {
        setExistingReview(review)
        setCanReview(false)
      }
      
      return review
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
      return null
    } finally {
      setSubmitting(false)
    }
  }

  return {
    canReview,
    existingReview,
    loading,
    submitting,
    error,
    submitReview,
    refresh: checkReviewEligibility
  }
}

export function useReviewStats(itemId?: string, userId?: string) {
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0,
    ratingBreakdown: {} as { [key: number]: number }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (itemId || userId) {
      fetchStats()
    }
  }, [itemId, userId])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await reviewService.getReviewStats(itemId, userId)
      setStats(data)
    } catch {
      setError('Failed to fetch review statistics')
    } finally {
      setLoading(false)
    }
  }

  const refresh = useCallback(() => {
    fetchStats()
  }, [itemId, userId])

  return { stats, loading, error, refresh }
}

export function useReviewActions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reportReview = async (reviewId: string, reason: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      
      const success = await reviewService.reportReview(reviewId, 'current-user-id', reason)
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to report review')
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateReview = async (reviewId: string, updates: Partial<Review>): Promise<Review | null> => {
    try {
      setLoading(true)
      setError(null)
      
      const review = await reviewService.updateReview(reviewId, updates)
      return review
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update review')
      return null
    } finally {
      setLoading(false)
    }
  }

  const deleteReview = async (reviewId: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)
      
      const success = await reviewService.deleteReview(reviewId)
      return success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete review')
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    error,
    reportReview,
    updateReview,
    deleteReview
  }
}