'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BookingWithDetails, ReviewInsert } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { reviewService } from '@/lib/database'
import { notificationService } from '@/lib/notifications'

const reviewFormSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5, 'Rating must be between 1 and 5'),
  title: z.string().optional(),
  comment: z.string().min(10, 'Please provide at least 10 characters in your review').max(1000, 'Review must be less than 1000 characters'),
  isPublic: z.boolean().default(true)
})

type ReviewFormData = z.infer<typeof reviewFormSchema>

interface ReviewFormProps {
  booking: BookingWithDetails
  reviewType: 'item' | 'user'
  onReviewSubmitted?: (reviewId: string) => void
  onCancel?: () => void
  className?: string
}

export default function ReviewForm({ 
  booking, 
  reviewType,
  onReviewSubmitted, 
  onCancel,
  className = "" 
}: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hoveredRating, setHoveredRating] = useState(0)
  const { user } = useAuth()

  const isRenter = user?.id === booking.renter_id
  const revieweeId = reviewType === 'item' ? booking.item.owner_id : (isRenter ? booking.owner_id : booking.renter_id)
  const revieweeName = reviewType === 'item' ? booking.item.title : (isRenter ? booking.owner.full_name : booking.renter.full_name)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      isPublic: true
    }
  })

  const watchedRating = watch('rating')

  const onSubmit = async (data: ReviewFormData) => {
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      const reviewData: ReviewInsert = {
        booking_id: booking.id,
        reviewer_id: user.id,
        reviewee_id: revieweeId,
        item_id: booking.item_id,
        rating: data.rating,
        title: data.title || null,
        comment: data.comment,
        is_public: data.isPublic
      }

      const review = await reviewService.createReview(reviewData)

      if (!review) {
        throw new Error('Failed to create review')
      }

      // Send notification to the reviewee
      if (reviewType === 'item') {
        await notificationService.createReviewNotification(
          revieweeId,
          user.full_name,
          booking.item.title,
          data.rating,
          review.id
        )
      } else {
        await notificationService.createNotification({
          userId: revieweeId,
          type: 'review',
          title: 'New Review Received',
          message: `${user.full_name} left you a ${data.rating}-star review.`,
          relatedId: review.id
        })
      }

      if (onReviewSubmitted) {
        onReviewSubmitted(review.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRatingClick = (rating: number) => {
    setValue('rating', rating)
  }

  const renderStars = (interactive = false) => {
    const currentRating = interactive ? (hoveredRating || watchedRating) : watchedRating

    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => interactive && handleRatingClick(star)}
            onMouseEnter={() => interactive && setHoveredRating(star)}
            onMouseLeave={() => interactive && setHoveredRating(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            disabled={!interactive}
          >
            <svg
              className={`w-8 h-8 ${
                star <= currentRating ? 'text-yellow-400' : 'text-gray-300'
              } ${interactive ? 'hover:text-yellow-400' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
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
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Write a Review
        </h2>
        <p className="text-gray-600">
          {reviewType === 'item' 
            ? `Share your experience with "${revieweeName}"`
            : `Rate your experience with ${revieweeName}`
          }
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Rating *
          </label>
          <div className="flex items-center space-x-4">
            {renderStars(true)}
            {watchedRating > 0 && (
              <span className="text-sm font-medium text-gray-700">
                {getRatingText(watchedRating)}
              </span>
            )}
          </div>
          {errors.rating && (
            <p className="text-red-500 text-sm mt-1">{errors.rating.message}</p>
          )}
        </div>

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Review Title (Optional)
          </label>
          <input
            {...register('title')}
            type="text"
            id="title"
            placeholder="Summarize your experience"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.title && (
            <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>
          )}
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
            Your Review *
          </label>
          <textarea
            {...register('comment')}
            id="comment"
            rows={5}
            placeholder={
              reviewType === 'item' 
                ? "Tell others about your experience with this item. Was it as described? How was the condition? Would you rent it again?"
                : "Share your experience working with this person. Were they communicative, reliable, and respectful?"
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          {errors.comment && (
            <p className="text-red-500 text-sm mt-1">{errors.comment.message}</p>
          )}
        </div>

        {/* Privacy */}
        <div className="flex items-center">
          <input
            {...register('isPublic')}
            type="checkbox"
            id="isPublic"
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="isPublic" className="ml-2 block text-sm text-gray-700">
            Make this review public (visible to other users)
          </label>
        </div>

        {/* Booking Context */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p><span className="font-medium">Item:</span> {booking.item.title}</p>
            <p><span className="font-medium">Rental Period:</span> {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}</p>
            <p><span className="font-medium">Booking ID:</span> #{booking.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !watchedRating}
            className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </form>

      {/* Guidelines */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="font-medium text-gray-900 mb-2">Review Guidelines</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Be honest and constructive in your feedback</li>
          <li>• Focus on your experience with the {reviewType === 'item' ? 'item' : 'person'}</li>
          <li>• Avoid personal attacks or inappropriate language</li>
          <li>• Reviews cannot be edited once submitted</li>
        </ul>
      </div>
    </div>
  )
}