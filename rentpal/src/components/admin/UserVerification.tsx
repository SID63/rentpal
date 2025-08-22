'use client'

import { useState, useEffect } from 'react'
import { verificationService, VerificationRequest, AdminUser } from '@/lib/admin'

interface UserVerificationProps {
  currentAdmin: AdminUser
  className?: string
}

export default function UserVerification({ currentAdmin, className = "" }: UserVerificationProps) {
  const [requests, setRequests] = useState<VerificationRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<VerificationRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | VerificationRequest['status']
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRequests, setTotalRequests] = useState(0)
  const itemsPerPage = 10

  useEffect(() => {
    fetchVerificationRequests()
  }, [filters, currentPage])

  const fetchVerificationRequests = async () => {
    try {
      setLoading(true)
      const filterParams: any = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      }

      if (filters.status !== 'all') {
        filterParams.status = filters.status
      }

      const { requests: fetchedRequests, total } = await verificationService.getVerificationRequests(filterParams)
      setRequests(fetchedRequests)
      setTotalRequests(total)
    } catch (err) {
      setError('Failed to load verification requests')
      console.error('Verification requests fetch error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewRequest = async (requestId: string, status: 'verified' | 'rejected') => {
    try {
      const success = await verificationService.reviewVerificationRequest(requestId, status, reviewNotes)
      if (success) {
        fetchVerificationRequests()
        setSelectedRequest(null)
        setReviewNotes('')
      }
    } catch (err) {
      console.error('Error reviewing verification request:', err)
    }
  }

  const getStatusColor = (status: VerificationRequest['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'verified':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
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

  const totalPages = Math.ceil(totalRequests / itemsPerPage)

  if (loading && requests.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-900">User Verification</h1>
        <p className="text-gray-600 mt-2">
          Review and approve user identity verification requests
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value as any }))
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ status: 'all' })
                setCurrentPage(1)
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Verification Requests List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={fetchVerificationRequests}
              className="text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : requests.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No verification requests found matching your criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Document Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {request.user?.avatar_url ? (
                            <img
                              src={request.user.avatar_url}
                              alt={request.user.full_name}
                              className="w-10 h-10 rounded-full mr-3"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {request.user?.full_name || 'Unknown User'}
                            </p>
                            <p className="text-sm text-gray-600">
                              {request.user?.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-900 capitalize">
                          {request.document_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                          {request.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(request.submitted_at)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedRequest(request)}
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalRequests)} of {totalRequests} requests
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

      {/* Verification Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Verification Request Review</h2>
                <button
                  onClick={() => {
                    setSelectedRequest(null)
                    setReviewNotes('')
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User Information */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">User Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex items-center">
                      {selectedRequest.user?.avatar_url ? (
                        <img
                          src={selectedRequest.user.avatar_url}
                          alt={selectedRequest.user.full_name}
                          className="w-12 h-12 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedRequest.user?.full_name || 'Unknown User'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedRequest.user?.email || 'No email'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Document Type:</span>
                        <p className="font-medium capitalize">
                          {selectedRequest.document_type.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ml-2 ${getStatusColor(selectedRequest.status)}`}>
                          {selectedRequest.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Submitted:</span>
                        <p className="font-medium">
                          {formatDate(selectedRequest.submitted_at)}
                        </p>
                      </div>
                      {selectedRequest.reviewed_at && (
                        <div>
                          <span className="text-gray-600">Reviewed:</span>
                          <p className="font-medium">
                            {formatDate(selectedRequest.reviewed_at)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRequest.review_notes && (
                    <div className="mt-4">
                      <h4 className="font-medium text-gray-900 mb-2">Previous Review Notes</h4>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {selectedRequest.review_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Document Images */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-4">Submitted Documents</h3>
                  <div className="space-y-4">
                    {selectedRequest.document_urls.map((url, index) => (
                      <div key={index} className="border rounded-lg overflow-hidden">
                        <img
                          src={url}
                          alt={`Document ${index + 1}`}
                          className="w-full h-64 object-contain bg-gray-50"
                        />
                        <div className="p-2 bg-gray-50 text-center">
                          <span className="text-sm text-gray-600">Document {index + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Review Actions */}
              {selectedRequest.status === 'pending' && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="font-medium text-gray-900 mb-4">Review Decision</h3>
                  
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Review Notes (optional)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add any notes about your decision..."
                    />
                  </div>

                  <div className="flex space-x-4">
                    <button
                      onClick={() => handleReviewRequest(selectedRequest.id, 'verified')}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      Approve Verification
                    </button>
                    <button
                      onClick={() => handleReviewRequest(selectedRequest.id, 'rejected')}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      Reject Verification
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}