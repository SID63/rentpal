'use client'

import { useState, useEffect } from 'react'
import { trustSafetyService, FlaggedContent, AdminUser } from '@/lib/admin'

interface ContentModerationProps {
  currentAdmin: AdminUser
  className?: string
}

export default function ContentModeration({ currentAdmin, className = "" }: ContentModerationProps) {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedContent, setSelectedContent] = useState<FlaggedContent | null>(null)
  const [filters, setFilters] = useState({
    content_type: 'all' as 'all' | string,
    reviewed: 'all' as 'all' | 'true' | 'false'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalContent, setTotalContent] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    fetchFlaggedContent()
  }, [filters, currentPage])

  const fetchFlaggedContent = async () => {
    try {
      setLoading(true)
      const filterParams: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      }

      if (filters.content_type !== 'all') {
        filterParams.content_type = filters.content_type
      }

      if (filters.reviewed !== 'all') {
        filterParams.reviewed = filters.reviewed === 'true'
      }

      const { content: fetchedContent, total } = await trustSafetyService.getFlaggedContent(filterParams)
      setFlaggedContent(fetchedContent)
      setTotalContent(total)
    } catch (err) {
      setError('Failed to load flagged content')
      console.error('Flagged content fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewContent = async (contentId: string, decision: 'approved' | 'rejected' | 'needs_human_review') => {
    try {
      const success = await trustSafetyService.reviewFlaggedContent(contentId, decision)
      if (success) {
        fetchFlaggedContent()
        setSelectedContent(null)
      }
    } catch (err) {
      console.error('Error reviewing flagged content:', err)
    }
  }

  const getContentTypeColor = (type: string) => {
    switch (type) {
      case 'item':
        return 'bg-blue-100 text-blue-800'
      case 'review':
        return 'bg-green-100 text-green-800'
      case 'message':
        return 'bg-purple-100 text-purple-800'
      case 'profile':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-red-100 text-red-800'
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const totalPages = Math.ceil(totalContent / itemsPerPage)

  if (loading && flaggedContent.length === 0) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Content Moderation</h1>
        <p className="text-gray-600 mt-2">
          Review automatically flagged content for policy violations
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type
            </label>
            <select
              value={filters.content_type}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, content_type: e.target.value }))
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="item">Items</option>
              <option value="review">Reviews</option>
              <option value="message">Messages</option>
              <option value="profile">Profiles</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review Status
            </label>
            <select
              value={filters.reviewed}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, reviewed: e.target.value as any }))
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Content</option>
              <option value="false">Pending Review</option>
              <option value="true">Reviewed</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ content_type: 'all', reviewed: 'all' })
                setCurrentPage(1)
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Flagged Content List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={fetchFlaggedContent}
              className="text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : flaggedContent.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No flagged content found matching your criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Content
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Flag Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {flaggedContent.map((content) => (
                    <tr key={content.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getContentTypeColor(content.content_type)}`}>
                            {content.content_type}
                          </span>
                          <p className="text-sm text-gray-900 mt-1">
                            ID: {content.content_id.substring(0, 8)}...
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {content.user?.full_name || 'Unknown'}
                          </p>
                          <p className="text-gray-600">
                            {content.user?.email || 'No email'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-900">{content.flag_reason}</p>
                        {content.auto_action_taken && (
                          <p className="text-xs text-gray-600 mt-1">
                            Auto action: {content.auto_action_taken}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(content.confidence_score)}`}>
                          {Math.round(content.confidence_score * 100)}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {content.reviewed ? (
                          <div>
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Reviewed
                            </span>
                            {content.review_decision && (
                              <p className="text-xs text-gray-600 mt-1">
                                {content.review_decision}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(content.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedContent(content)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalContent)} of {totalContent} items
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Content Review Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Content Review</h2>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Content Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getContentTypeColor(selectedContent.content_type)}`}>
                        {selectedContent.content_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Content ID:</span>
                      <span className="text-sm text-gray-900 font-mono">
                        {selectedContent.content_id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">User:</span>
                      <span className="text-sm text-gray-900">
                        {selectedContent.user?.full_name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Flagged:</span>
                      <span className="text-sm text-gray-900">
                        {formatDate(selectedContent.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Flag Details</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reason:</span>
                      <span className="text-sm text-gray-900">{selectedContent.flag_reason}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Confidence:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(selectedContent.confidence_score)}`}>
                        {Math.round(selectedContent.confidence_score * 100)}%
                      </span>
                    </div>
                    {selectedContent.auto_action_taken && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Auto Action:</span>
                        <span className="text-sm text-gray-900">{selectedContent.auto_action_taken}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedContent.reviewed ? (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Review Decision</h3>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-green-800">
                        This content has been reviewed and marked as: <strong>{selectedContent.review_decision}</strong>
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Take Action</h3>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        onClick={() => handleReviewContent(selectedContent.id, 'approved')}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Approve Content
                      </button>
                      <button
                        onClick={() => handleReviewContent(selectedContent.id, 'rejected')}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove Content
                      </button>
                      <button
                        onClick={() => handleReviewContent(selectedContent.id, 'needs_human_review')}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Needs Further Review
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}