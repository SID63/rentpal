'use client'

import { useState } from 'react'
import { ReviewWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import Image from 'next/image'

interface ReviewCardProps {
  review: ReviewWithDetails
  showItem?: boolean
  showReviewer?: boolean
  showActions?: boolean
  onReport?: (reviewId: string) => void
  className?: string
}

export default function ReviewCard({ 
  review, 
  showItem = false,
  showReviewer = true,
  showActions = false,
  onReport,
  className = "" 
}: ReviewCardProps) {
  const [showFullComment, setShowFullComment] = useState(false)
  const { user } = useAuth()

  const isOwnReview = user?.id === review.reviewer_id
  const commentPreview = review.comment && review.comment.length > 200 
    ? review.comment.substring(0, 200) + '...'
    : review.comment

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays === 0) {
      return 'Today'
    } else if (diffInDays === 1) {
      return 'Yesterday'
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7)
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30)
      return `${months} month${months > 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  }

  const renderStars = (rating: number, size: 'sm' | 'md' = 'sm') => {
    const starSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${starSize} ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {rating}/5
        </span>
      </div>
    )
  }

  const getRatingText = (rating: number) => {
    switch (rating) {
      case 1: return 'Poor'
      case 2: return 'Fair'
      case 3: return 'Good'
      case 4: return 'Very Good'
      case 5: return 'Excellent'
      default: return ''
    }
  }

  return (
    <div className={`bg-white rounded-lg border p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4">
          {/* Reviewer Avatar */}
          {showReviewer && (
            <div className="flex-shrink-0">
              {review.reviewer.avatar_url ? (
                <Image
                  src={review.reviewer.avatar_url}
                  alt={review.reviewer.full_name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-medium text-sm">
                    {review.reviewer.full_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Review Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              {renderStars(review.rating)}
              <span className="text-sm font-medium text-gray-700">
                {getRatingText(review.rating)}
              </span>
            </div>
            
            {showReviewer && (
              <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                <span className="font-medium">{review.reviewer.full_name}</span>
                <span>•</span>
                <span>{formatDate(review.created_at)}</span>
                {isOwnReview && (
                  <>
                    <span>•</span>
                    <span className="text-blue-600">Your review</span>
                  </>
                )}
              </div>
            )}

            {showItem && (
              <div className="text-sm text-gray-600 mb-2">
                <span className="font-medium">About:</span> {review.item.title}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex items-center space-x-2">
            {!isOwnReview && onReport && (
              <button
                onClick={() => onReport(review.id)}
                className="text-gray-400 hover:text-red-600 p-1"
                title="Report review"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Review Content */}
      <div className="space-y-3">
        {/* Title */}
        {review.title && (
          <h4 className="font-medium text-gray-900 text-lg">
            {review.title}
          </h4>
        )}

        {/* Comment */}
        {review.comment && (
          <div className="text-gray-700 leading-relaxed">
            <p>
              {showFullComment || !commentPreview || review.comment.length <= 200 
                ? review.comment 
                : commentPreview
              }
            </p>
            
            {review.comment.length > 200 && (
              <button
                onClick={() => setShowFullComment(!showFullComment)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium mt-2"
              >
                {showFullComment ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Booking Context */}
      {review.booking && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            <span className="font-medium">Booking:</span> #{review.booking.id.slice(-8).toUpperCase()} • 
            <span className="ml-1">
              {new Date(review.booking.start_date).toLocaleDateString()} - {new Date(review.booking.end_date).toLocaleDateString()}
            </span>
          </div>
        </div>
      )}

      {/* Helpful Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span>Helpful</span>
          </button>
        </div>

        {!review.is_public && (
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Private
          </span>
        )}
      </div>
    </div>
  )
}