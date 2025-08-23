'use client'

import React, { useState, useEffect } from 'react'
import { trackEvent } from '@/lib/analytics'
import { memoryCache, itemCache, userCache } from '@/lib/cache'
import { WebVitalsMetric, ErrorInfo } from '@/types/monitoring'

interface MetricCard {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'stable'
  color?: 'green' | 'red' | 'blue' | 'yellow'
}

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  responseTime: number
  errorRate: number
  memoryUsage: number
  cacheHitRate: number
}

export const MonitoringDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: 0,
    responseTime: 0,
    errorRate: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
  })

  const [metrics, setMetrics] = useState<MetricCard[]>([])
  const [webVitals, setWebVitals] = useState<WebVitalsMetric[]>([])
  const [errors, setErrors] = useState<ErrorInfo[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch system metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Simulate API call to get system metrics
        const response = await fetch('/api/admin/metrics')
        const data = await response.json()
        
        setSystemHealth(data.systemHealth)
        setMetrics(data.metrics)
        setWebVitals(data.webVitals)
        setErrors(data.errors)
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  // Monitor client-side performance
  useEffect(() => {
    const monitorPerformance = () => {
      // Memory usage
      if ('memory' in performance) {
        const memory = (performance as Performance & { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
        const memoryUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
        
        setSystemHealth(prev => ({
          ...prev,
          memoryUsage: Math.round(memoryUsage),
        }))
      }

      // Cache statistics
      const cacheHitRate = 85 // This would be calculated from actual cache hits/misses
      
      setSystemHealth(prev => ({
        ...prev,
        cacheHitRate,
      }))
    }

    monitorPerformance()
    const interval = setInterval(monitorPerformance, 10000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-9.2 9.2M7 7v10h10" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemHealth.status)}`}>
          {systemHealth.status.toUpperCase()}
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(systemHealth.uptime / 3600)}h {Math.floor((systemHealth.uptime % 3600) / 60)}m
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">{systemHealth.responseTime}ms</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-gray-900">{systemHealth.errorRate}%</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cache Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900">{systemHealth.cacheHitRate}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{metric.title}</p>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                {metric.change && (
                  <p className={`text-sm flex items-center ${
                    metric.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {getTrendIcon(metric.trend)}
                    <span className="ml-1">{Math.abs(metric.change)}%</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Web Vitals */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Web Vitals</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {webVitals.map((vital, index) => (
            <div key={index} className="text-center">
              <div className={`text-3xl font-bold ${
                vital.rating === 'good' ? 'text-green-600' :
                vital.rating === 'needs-improvement' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {vital.value}
              </div>
              <div className="text-sm text-gray-600">{vital.name}</div>
              <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                vital.rating === 'good' ? 'bg-green-100 text-green-800' :
                vital.rating === 'needs-improvement' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
              }`}>
                {vital.rating}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Errors</h2>
        {errors.length > 0 ? (
          <div className="space-y-3">
            {errors.slice(0, 5).map((error, index) => (
              <div key={index} className="border-l-4 border-red-400 bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800 font-medium">{error.message}</p>
                    <p className="text-xs text-red-600 mt-1">{error.timestamp}</p>
                    {error.stack && (
                      <details className="mt-2">
                        <summary className="text-xs text-red-600 cursor-pointer">Stack trace</summary>
                        <pre className="text-xs text-red-600 mt-1 overflow-auto">{error.stack}</pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No recent errors</p>
        )}
      </div>

      {/* Cache Statistics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cache Statistics</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{memoryCache.size()}</div>
            <div className="text-sm text-gray-600">Memory Cache</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{itemCache.size()}</div>
            <div className="text-sm text-gray-600">Item Cache</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{userCache.size()}</div>
            <div className="text-sm text-gray-600">User Cache</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex space-x-4">
        <button
          onClick={() => {
            memoryCache.clear()
            itemCache.clear()
            userCache.clear()
            trackEvent.click('clear_cache', '/admin/monitoring')
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Clear All Caches
        </button>
        <button
          onClick={() => {
            window.location.reload()
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Refresh Dashboard
        </button>
        <button
          onClick={() => {
            // Export metrics as JSON
            const data = {
              systemHealth,
              metrics,
              webVitals,
              errors,
              timestamp: new Date().toISOString(),
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `monitoring-report-${Date.now()}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Export Report
        </button>
      </div>
    </div>
  )
}