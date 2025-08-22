'use client'

import { useState, useEffect } from 'react'
import { Review } from '@/types/database'
import { reviewService } from '@/lib/database'

interface ReviewsListProps {
  itemId: string
  initialReviews?: Review[]
  showAll?: boolean
  className?: string
}

export default function ReviewsList({ 
  itemId, 
  initialReviews = [], 
  showAll = false,
  className = "" 
}: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayCount, setDisplayCount] = useState(showAll ? reviews.length : 5)

  useEffect(() => {
    if (initialReviews.length === 0) {
      fetchReviews()
    }
  }, [itemId, initialReviews.length])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await reviewService.getItemReviews(itemId)
      setReviews(data)
      setDisplayCount(showAll ? data.length : 5)
    } catch {
      setError('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="border-b border-gray-200 pb-6">
              <div className="flex items-center mb-2">
                <div className="h-4 bg-gray-200 rounded w-24 mr-4"></div>
                <div className="h-3 bg-gray-200 rounded w-20"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-8 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchReviews}
            className="mt-2 text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (reviews.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-600">No reviews yet</p>
          <p className="text-sm text-gray-500 mt-1">Be the first to leave a review!</p>
        </div>
      </div>
    )
  }

  const displayedReviews = reviews.slice(0, displayCount)
  const hasMore = reviews.length > displayCount

  return (
    <div className={className}>
      <div className="space-y-6">
        {displayedReviews.map((review) => (
          <div key={review.id} className="border-b border-gray-200 pb-6 last:border-b-0">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                {renderStars(review.rating)}
                <span className="text-sm text-gray-600">
                  {formatDate(review.created_at)}
                </span>
              </div>
            </div>
            
            {review.title && (
              <h4 className="font-medium text-gray-900 mb-2">{review.title}</h4>
            )}
            
            {review.comment && (
              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            )}
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setDisplayCount(reviews.length)}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Show all {reviews.length} reviews
          </button>
        </div>
      )}

      {displayCount > 5 && reviews.length > 5 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setDisplayCount(5)}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Show fewer reviews
          </button>
        </div>
      )}
    </div>
  )
}