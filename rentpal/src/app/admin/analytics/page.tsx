'use client'

import { useState, useEffect, useCallback } from 'react'
import { adminService, analyticsService, AdminUser, PlatformAnalytics } from '@/lib/admin'
import AdminLayout from '@/components/admin/AdminLayout'

export default function AdminAnalyticsPage() {
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null)
  const [analytics, setAnalytics] = useState<PlatformAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  })

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

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await analyticsService.getPlatformAnalytics({
        start_date: dateRange.start,
        end_date: dateRange.end
      })
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to load analytics:', error)
    }
  }, [dateRange.start, dateRange.end])

  useEffect(() => {
    loadCurrentAdmin()
  }, [loadCurrentAdmin])

  useEffect(() => {
    if (currentAdmin) {
      loadAnalytics()
    }
  }, [currentAdmin, loadAnalytics])

  const groupAnalyticsByMetric = (analytics: PlatformAnalytics[]) => {
    return analytics.reduce((acc, item) => {
      if (!acc[item.metric_name]) {
        acc[item.metric_name] = []
      }
      acc[item.metric_name].push(item)
      return acc
    }, {} as Record<string, PlatformAnalytics[]>)
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

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

  const groupedAnalytics = groupAnalyticsByMetric(analytics)

  return (
    <AdminLayout>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Platform performance metrics and insights
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(groupedAnalytics).map(([metricName, data]) => {
            const latestValue = data[0]?.metric_value || 0
            const previousValue = data[1]?.metric_value || 0
            const change = previousValue > 0 ? ((latestValue - previousValue) / previousValue) * 100 : 0
            const isPositive = change >= 0

            return (
              <div key={metricName} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 capitalize">
                    {metricName.replace(/_/g, ' ')}
                  </h3>
                  <div className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {isPositive ? (
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17l9.2-9.2M17 17V7H7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 7l-9.2 9.2M7 7v10h10" />
                      </svg>
                    )}
                    {Math.abs(change).toFixed(1)}%
                  </div>
                </div>
                
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {metricName.includes('revenue') || metricName.includes('earnings') 
                    ? formatCurrency(latestValue)
                    : formatNumber(latestValue)
                  }
                </div>
                
                <p className="text-sm text-gray-600">
                  {data.length > 1 ? `vs ${formatNumber(previousValue)} previous period` : 'Current value'}
                </p>
              </div>
            )
          })}
        </div>

        {/* Detailed Analytics Table */}
        {analytics.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Detailed Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metric
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Metadata
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analytics.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(item.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {item.metric_name.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.metric_name.includes('revenue') || item.metric_name.includes('earnings')
                          ? formatCurrency(item.metric_value)
                          : formatNumber(item.metric_value)
                        }
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {Object.keys(item.metadata).length > 0 ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:text-blue-800">
                              View metadata
                            </summary>
                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                              {JSON.stringify(item.metadata, null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-gray-400">No metadata</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {analytics.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Analytics Data</h3>
            <p className="text-gray-600">
              No analytics data available for the selected date range.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}