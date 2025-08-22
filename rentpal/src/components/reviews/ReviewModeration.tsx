'use client'

import { useState } from 'react'
import { ReviewWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import ReviewCard from './ReviewCard'

interface ReviewModerationProps {
  reviews: ReviewWithDetails[]
  onReviewAction?: (reviewId: string, action: 'approve' | 'reject' | 'report') => void
  className?: string
}

type ModerationFilter = 'all' | 'pending' | 'reported' | 'approved' | 'rejected'

export default function ReviewModeration({ 
  reviews, 
  onReviewAction,
  className = "" 
}: ReviewModerationProps) {
  const [filter, setFilter] = useState<ModerationFilter>('all')
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set())
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const { user } = useAuth()

  // Mock moderation status - in real app this would come from database
  const getReviewStatus = (reviewId: string): 'pending' | 'approved' | 'rejected' | 'reported' => {
    // This is mock data - in real implementation, this would be part of the review data
    return 'approved'
  }

  const filteredReviews = reviews.filter(review => {
    const status = getReviewStatus(review.id)
    
    switch (filter) {
      case 'pending':
        return status === 'pending'
      case 'reported':
        return status === 'reported'
      case 'approved':
        return status === 'approved'
      case 'rejected':
        return status === 'rejected'
      default:
        return true
    }
  })

  const handleReviewSelect = (reviewId: string) => {
    const newSelected = new Set(selectedReviews)
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId)
    } else {
      newSelected.add(reviewId)
    }
    setSelectedReviews(newSelected)
  }

  const handleBulkAction = (action: 'approve' | 'reject') => {
    selectedReviews.forEach(reviewId => {
      if (onReviewAction) {
        onReviewAction(reviewId, action)
      }
    })
    setSelectedReviews(new Set())
  }

  const handleReportReview = (reviewId: string) => {
    setReportingReviewId(reviewId)
    setShowReportModal(true)
  }

  const submitReport = () => {
    if (reportingReviewId && onReviewAction) {
      onReviewAction(reportingReviewId, 'report')
    }
    setShowReportModal(false)
    setReportingReviewId(null)
    setReportReason('')
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      reported: 'bg-orange-100 text-orange-800'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getFilterCounts = () => {
    return {
      all: reviews.length,
      pending: reviews.filter(r => getReviewStatus(r.id) === 'pending').length,
      reported: reviews.filter(r => getReviewStatus(r.id) === 'reported').length,
      approved: reviews.filter(r => getReviewStatus(r.id) === 'approved').length,
      rejected: reviews.filter(r => getReviewStatus(r.id) === 'rejected').length
    }
  }

  const counts = getFilterCounts()

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Moderation</h2>
        <p className="text-gray-600">Manage and moderate user reviews</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {Object.entries(counts).map(([filterKey, count]) => (
          <button
            key={filterKey}
            onClick={() => setFilter(filterKey as ModerationFilter)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterKey
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterKey.charAt(0).toUpperCase() + filterKey.slice(1)} ({count})
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedReviews.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedReviews.size} review{selectedReviews.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={() => handleBulkAction('approve')}
                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Approve
              </button>
              <button
                onClick={() => handleBulkAction('reject')}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Reject
              </button>
              <button
                onClick={() => setSelectedReviews(new Set())}
                className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {filteredReviews.length > 0 ? (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const status = getReviewStatus(review.id)
            const isSelected = selectedReviews.has(review.id)
            
            return (
              <div
                key={review.id}
                className={`relative ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                {/* Selection Checkbox */}
                <div className="absolute top-4 left-4 z-10">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleReviewSelect(review.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>

                {/* Status Badge */}
                <div className="absolute top-4 right-4 z-10">
                  {getStatusBadge(status)}
                </div>

                {/* Review Card */}
                <div className="pl-10">
                  <ReviewCard
                    review={review}
                    showReviewer={true}
                    showItem={true}
                    showActions={true}
                    onReport={handleReportReview}
                  />
                </div>

                {/* Moderation Actions */}
                <div className="bg-gray-50 border-t px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span>Review ID: {review.id.slice(-8).toUpperCase()}</span>
                    <span>•</span>
                    <span>Booking: #{review.booking.id.slice(-8).toUpperCase()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {status === 'pending' && (
                      <>
                        <button
                          onClick={() => onReviewAction?.(review.id, 'approve')}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => onReviewAction?.(review.id, 'reject')}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    
                    {status === 'reported' && (
                      <button
                        onClick={() => handleReportReview(review.id)}
                        className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
                      >
                        View Report
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No {filter !== 'all' ? filter : ''} reviews found
          </h3>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No reviews to moderate at this time.'
              : `No ${filter} reviews to display.`
            }
          </p>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Report Review</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a reason</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="spam">Spam</option>
                <option value="fake">Fake review</option>
                <option value="harassment">Harassment</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitReport}
                disabled={!reportReason}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}