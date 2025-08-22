'use client'

import { useState, useEffect } from 'react'
import { ReviewWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { reviewService } from '@/lib/database'
import ReviewCard from './ReviewCard'
import ReviewSummary from './ReviewSummary'

interface UserReviewsProps {
  userId?: string
  type: 'received' | 'given'
  className?: string
}

export default function UserReviews({ 
  userId, 
  type,
  className = "" 
}: UserReviewsProps) {
  const [reviews, setReviews] = useState<ReviewWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'items' | 'users'>('all')
  const { user } = useAuth()

  const targetUserId = userId || user?.id

  useEffect(() => {
    if (targetUserId) {
      fetchReviews()
    }
  }, [targetUserId, type])

  const fetchReviews = async () => {
    if (!targetUserId) return

    try {
      setLoading(true)
      setError(null)
      
      if (type === 'received') {
        const data = await reviewService.getUserReviews(targetUserId)
        setReviews(data as ReviewWithDetails[])
      } else {
        // For 'given' reviews, we need to fetch reviews where the user is the reviewer
        // This would require a new service method
        const data = await fetchGivenReviews(targetUserId)
        setReviews(data)
      }
    } catch {
      setError('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  // Mock function - in real app this would be a proper service method
  const fetchGivenReviews = async (userId: string): Promise<ReviewWithDetails[]> => {
    // This would be implemented in the reviewService
    console.log('Fetching given reviews for user:', userId)
    return []
  }

  const filteredReviews = reviews.filter(review => {
    switch (filter) {
      case 'items':
        return review.item_id !== null
      case 'users':
        return review.reviewee_id !== review.item.owner_id // User review, not item review
      default:
        return true
    }
  })

  const isOwnProfile = user?.id === targetUserId

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-6">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-8 bg-red-50 rounded-lg">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={fetchReviews}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {type === 'received' 
            ? (isOwnProfile ? 'Reviews About You' : 'Reviews') 
            : (isOwnProfile ? 'Reviews You\'ve Written' : 'Reviews Given')
          }
        </h2>
        <p className="text-gray-600">
          {type === 'received'
            ? 'See what others are saying about your items and service'
            : 'Reviews you\'ve left for items and other users'
          }
        </p>
      </div>

      {/* Summary for received reviews */}
      {type === 'received' && reviews.length > 0 && (
        <div className="mb-8">
          <ReviewSummary reviews={reviews} />
        </div>
      )}

      {/* Filters */}
      {reviews.length > 0 && (
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-sm font-medium text-gray-700">Filter by:</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({reviews.length})
            </button>
            <button
              onClick={() => setFilter('items')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === 'items'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Items ({reviews.filter(r => r.item_id !== null).length})
            </button>
            <button
              onClick={() => setFilter('users')}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                filter === 'users'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Personal ({reviews.filter(r => r.reviewee_id !== r.item.owner_id).length})
            </button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-6">
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              showReviewer={type === 'received'}
              showItem={true}
              showActions={false}
            />
          ))}
        </div>
      ) : reviews.length > 0 ? (
        /* Filtered empty state */
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {filter} reviews found
          </h3>
          <p className="text-gray-600">
            Try adjusting your filter to see more reviews.
          </p>
        </div>
      ) : (
        /* Complete empty state */
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {type === 'received' 
              ? (isOwnProfile ? 'No reviews yet' : 'No reviews found')
              : (isOwnProfile ? 'You haven\'t written any reviews' : 'No reviews given')
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {type === 'received'
              ? (isOwnProfile 
                  ? 'Complete some rentals to start receiving reviews from other users.'
                  : 'This user hasn\'t received any reviews yet.'
                )
              : (isOwnProfile
                  ? 'Start renting items to leave reviews and help the community.'
                  : 'This user hasn\'t written any reviews yet.'
                )
            }
          </p>
          
          {isOwnProfile && type === 'given' && (
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Browse Items to Rent
            </button>
          )}
        </div>
      )}

      {/* Stats Footer */}
      {reviews.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {reviews.length}
              </div>
              <div className="text-sm text-gray-600">
                Total Reviews {type === 'received' ? 'Received' : 'Given'}
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {reviews.length > 0 
                  ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <div className="text-sm text-gray-600">
                Average Rating
              </div>
            </div>
            
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {reviews.filter(r => r.rating >= 4).length}
              </div>
              <div className="text-sm text-gray-600">
                Positive Reviews
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}