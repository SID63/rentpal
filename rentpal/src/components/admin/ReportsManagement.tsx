'use client'

import { useState, useEffect, useCallback } from 'react'
import { reportService, moderationService, Report, AdminUser } from '@/lib/admin'

interface ReportsManagementProps {
  currentAdmin: AdminUser
  className?: string
}

export default function ReportsManagement({ currentAdmin, className = "" }: ReportsManagementProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | Report['status'],
    type: 'all' as 'all' | Report['type']
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalReports, setTotalReports] = useState(0)
  const itemsPerPage = 10

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const filterParams: Record<string, unknown> = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      }

      if (filters.status !== 'all') {
        filterParams.status = filters.status
      }

      if (filters.type !== 'all') {
        filterParams.type = filters.type
      }

      const { reports: fetchedReports, total } = await reportService.getReports(filterParams)
      setReports(fetchedReports)
      setTotalReports(total)
    } catch (err) {
      setError('Failed to load reports')
      console.error('Reports fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.type, currentPage])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleAssignReport = async (reportId: string) => {
    try {
      const success = await reportService.assignReport(reportId, currentAdmin.id)
      if (success) {
        fetchReports()
      }
    } catch (err) {
      console.error('Error assigning report:', err)
    }
  }

  const handleResolveReport = async (reportId: string, resolution: string) => {
    try {
      const success = await reportService.resolveReport(reportId, resolution)
      if (success) {
        fetchReports()
        setSelectedReport(null)
      }
    } catch (err) {
      console.error('Error resolving report:', err)
    }
  }

  const handleModerationAction = async (
    reportId: string,
    action: 'approved' | 'rejected' | 'suspended' | 'banned' | 'warning',
    reason: string,
    targetUserId?: string,
    targetItemId?: string
  ) => {
    try {
      const actionData = {
        admin_id: currentAdmin.id,
        target_user_id: targetUserId,
        target_item_id: targetItemId,
        report_id: reportId,
        action,
        reason
      }

      const success = await moderationService.createModerationAction(actionData)
      if (success) {
        await handleResolveReport(reportId, `Action taken: ${action} - ${reason}`)
      }
    } catch (err) {
      console.error('Error taking moderation action:', err)
    }
  }

  const getStatusColor = (status: Report['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'investigating':
        return 'bg-blue-100 text-blue-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'dismissed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: Report['type']) => {
    switch (type) {
      case 'inappropriate_content':
        return 'bg-red-100 text-red-800'
      case 'spam':
        return 'bg-orange-100 text-orange-800'
      case 'fraud':
        return 'bg-purple-100 text-purple-800'
      case 'harassment':
        return 'bg-pink-100 text-pink-800'
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

  const totalPages = Math.ceil(totalReports / itemsPerPage)

  if (loading && reports.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-900">Reports Management</h1>
        <p className="text-gray-600 mt-2">
          Review and handle user reports to maintain platform safety
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
                setFilters(prev => ({ ...prev, status: e.target.value as Report['status'] | 'all' }))
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={filters.type}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, type: e.target.value as Report['type'] | 'all' }))
                setCurrentPage(1)
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="inappropriate_content">Inappropriate Content</option>
              <option value="spam">Spam</option>
              <option value="fraud">Fraud</option>
              <option value="harassment">Harassment</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ status: 'all', type: 'all' })
                setCurrentPage(1)
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {error ? (
          <div className="p-6 text-center">
            <div className="text-red-600 mb-2">{error}</div>
            <button
              onClick={fetchReports}
              className="text-blue-600 hover:text-blue-800"
            >
              Try again
            </button>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No reports found matching your criteria.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Report Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reporter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target
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
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(report.type)}`}>
                              {report.type.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900">{report.reason}</p>
                          {report.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {report.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">
                            {report.reporter?.full_name || 'Unknown'}
                          </p>
                          <p className="text-gray-600">
                            {report.reporter?.email || 'No email'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          {report.reported_user_id && (
                            <div>
                              <p className="font-medium text-gray-900">User</p>
                              <p className="text-gray-600">
                                {report.reported_user?.full_name || 'Unknown'}
                              </p>
                            </div>
                          )}
                          {report.reported_item_id && (
                            <div>
                              <p className="font-medium text-gray-900">Item</p>
                              <p className="text-gray-600">
                                {report.reported_item?.title || 'Unknown'}
                              </p>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedReport(report)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            Review
                          </button>
                          {report.status === 'pending' && (
                            <button
                              onClick={() => handleAssignReport(report.id)}
                              className="text-green-600 hover:text-green-800 text-sm font-medium"
                            >
                              Assign to Me
                            </button>
                          )}
                        </div>
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
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalReports)} of {totalReports} reports
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

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Report Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeColor(selectedReport.type)}`}>
                        {selectedReport.type.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                        {selectedReport.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Submitted:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedReport.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Reason</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedReport.reason}
                  </p>
                </div>

                {selectedReport.description && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                      {selectedReport.description}
                    </p>
                  </div>
                )}

                {selectedReport.evidence_urls && selectedReport.evidence_urls.length > 0 && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Evidence</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedReport.evidence_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`Evidence ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.status === 'pending' || selectedReport.status === 'investigating' ? (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Take Action</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleModerationAction(
                          selectedReport.id,
                          'warning',
                          'Content violates community guidelines',
                          selectedReport.reported_user_id,
                          selectedReport.reported_item_id
                        )}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
                      >
                        Issue Warning
                      </button>
                      <button
                        onClick={() => handleModerationAction(
                          selectedReport.id,
                          'rejected',
                          'Content removed for policy violation',
                          selectedReport.reported_user_id,
                          selectedReport.reported_item_id
                        )}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove Content
                      </button>
                      <button
                        onClick={() => handleModerationAction(
                          selectedReport.id,
                          'suspended',
                          'Account temporarily suspended',
                          selectedReport.reported_user_id,
                          selectedReport.reported_item_id
                        )}
                        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Suspend User
                      </button>
                      <button
                        onClick={() => handleResolveReport(selectedReport.id, 'Report dismissed - no violation found')}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Dismiss Report
                      </button>
                    </div>
                  </div>
                ) : (
                  selectedReport.resolution_notes && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Resolution</h3>
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        {selectedReport.resolution_notes}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}