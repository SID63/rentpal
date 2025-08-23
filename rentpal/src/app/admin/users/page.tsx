'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminService, trustSafetyService, AdminUser, TrustScore } from '@/lib/admin'
import AdminLayout from '@/components/admin/AdminLayout'

export default function AdminUsersPage() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const [trustScores, setTrustScores] = useState<TrustScore[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    min_score: 0,
    max_score: 100
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    loadCurrentAdmin()
  }, [loadCurrentAdmin])

  const loadCurrentAdmin = useCallback(async () => {
    try {
      const admin = await adminService.getCurrentAdmin()
      setCurrentAdmin(admin)
    } catch (error) {
      console.error('Failed to load admin:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadTrustScores = useCallback(async () => {
    try {
      const { scores, total } = await trustSafetyService.getTrustScores({
        min_score: filters.min_score,
        max_score: filters.max_score,
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      })
      setTrustScores(scores)
      setTotalUsers(total)
    } catch (error) {
      console.error('Failed to load trust scores:', error)
    }
  }, [filters.min_score, filters.max_score, currentPage])

  useEffect(() => {
    loadCurrentAdmin()
  }, [loadCurrentAdmin])

  useEffect(() => {
    if (currentAdmin) {
      loadTrustScores()
    }
  }, [currentAdmin, loadTrustScores])

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    if (score >= 40) return 'bg-orange-100 text-orange-800'
    return 'bg-red-100 text-red-800'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const totalPages = Math.ceil(totalUsers / itemsPerPage)

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!currentAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to access this page.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">
            Monitor user trust scores and platform activity
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Trust Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.min_score}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, min_score: Number(e.target.value) }))
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum Trust Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={filters.max_score}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, max_score: Number(e.target.value) }))
                  setCurrentPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ min_score: 0, max_score: 100 })
                  setCurrentPage(1)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {trustScores.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No users found matching your criteria.
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
                        Trust Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Verification Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Issues
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {trustScores.map((score) => (
                      <tr key={score.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {score.user?.avatar_url ? (
                              <img
                                src={score.user.avatar_url}
                                alt={score.user.full_name}
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
                                {score.user?.full_name || 'Unknown User'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {score.user?.email || 'No email'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getTrustScoreColor(score.overall_score)}`}>
                            {Math.round(score.overall_score)}/100
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col space-y-1">
                            <div className="flex items-center text-xs">
                              <span className={`w-2 h-2 rounded-full mr-2 ${score.identity_verified ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                              Identity {score.identity_verified ? 'Verified' : 'Unverified'}
                            </div>
                            <div className="flex items-center text-xs">
                              <span className={`w-2 h-2 rounded-full mr-2 ${score.phone_verified ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                              Phone {score.phone_verified ? 'Verified' : 'Unverified'}
                            </div>
                            <div className="flex items-center text-xs">
                              <span className={`w-2 h-2 rounded-full mr-2 ${score.email_verified ? 'bg-green-400' : 'bg-gray-300'}`}></span>
                              Email {score.email_verified ? 'Verified' : 'Unverified'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            <div>Transactions: {score.successful_transactions}</div>
                            <div>Connections: {score.social_connections}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="space-y-1">
                            <div className={score.dispute_count > 0 ? 'text-red-600' : 'text-gray-600'}>
                              Disputes: {score.dispute_count}
                            </div>
                            <div className={score.report_count > 0 ? 'text-red-600' : 'text-gray-600'}>
                              Reports: {score.report_count}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(score.last_calculated)}
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
                    Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalUsers)} of {totalUsers} users
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
      </div>
    </AdminLayout>
  )
}