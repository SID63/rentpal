'use client'

import { useState, useEffect } from 'react'
import { BookingWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { useBookings } from '@/hooks/useDatabase'

interface EarningsData {
  totalEarnings: number
  thisMonthEarnings: number
  pendingPayouts: number
  completedBookings: number
  averageBookingValue: number
  monthlyBreakdown: Array<{
    month: string
    earnings: number
    bookings: number
  }>
  recentTransactions: Array<{
    id: string
    bookingId: string
    itemTitle: string
    amount: number
    date: string
    status: 'completed' | 'pending' | 'processing'
    renterName: string
  }>
}

interface EarningsOverviewProps {
  className?: string
}

export default function EarningsOverview({ className = "" }: EarningsOverviewProps) {
  const { user } = useAuth()
  const { bookings, loading, error } = useBookings('owner')
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    pendingPayouts: 0,
    completedBookings: 0,
    averageBookingValue: 0,
    monthlyBreakdown: [],
    recentTransactions: []
  })
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    if (bookings.length > 0) {
      calculateEarnings()
    }
  }, [bookings, selectedPeriod])

  const calculateEarnings = () => {
    const now = new Date()
    const completedBookings = bookings.filter(booking => booking.status === 'completed')
    const pendingBookings = bookings.filter(booking => ['confirmed', 'active'].includes(booking.status))

    // Calculate total earnings
    const totalEarnings = completedBookings.reduce((sum, booking) => sum + booking.total_amount, 0)

    // Calculate this month's earnings
    const thisMonth = now.getMonth()
    const thisYear = now.getFullYear()
    const thisMonthEarnings = completedBookings
      .filter(booking => {
        const bookingDate = new Date(booking.end_date)
        return bookingDate.getMonth() === thisMonth && bookingDate.getFullYear() === thisYear
      })
      .reduce((sum, booking) => sum + booking.total_amount, 0)

    // Calculate pending payouts
    const pendingPayouts = pendingBookings.reduce((sum, booking) => sum + booking.total_amount, 0)

    // Calculate average booking value
    const averageBookingValue = completedBookings.length > 0 
      ? totalEarnings / completedBookings.length 
      : 0

    // Generate monthly breakdown
    const monthlyBreakdown = generateMonthlyBreakdown(completedBookings)

    // Generate recent transactions
    const recentTransactions = generateRecentTransactions(completedBookings)

    setEarningsData({
      totalEarnings,
      thisMonthEarnings,
      pendingPayouts,
      completedBookings: completedBookings.length,
      averageBookingValue,
      monthlyBreakdown,
      recentTransactions
    })
  }

  const generateMonthlyBreakdown = (completedBookings: BookingWithDetails[]) => {
    const monthlyData: { [key: string]: { earnings: number; bookings: number } } = {}
    
    // Get last 12 months
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
      monthlyData[monthKey] = { earnings: 0, bookings: 0 }
    }

    // Aggregate bookings by month
    completedBookings.forEach(booking => {
      const monthKey = booking.end_date.slice(0, 7)
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].earnings += booking.total_amount
        monthlyData[monthKey].bookings += 1
      }
    })

    return Object.entries(monthlyData).map(([month, data]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      earnings: data.earnings,
      bookings: data.bookings
    }))
  }

  const generateRecentTransactions = (completedBookings: BookingWithDetails[]) => {
    return completedBookings
      .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
      .slice(0, 10)
      .map(booking => ({
        id: booking.id,
        bookingId: booking.id,
        itemTitle: booking.item.title,
        amount: booking.total_amount,
        date: booking.end_date,
        status: 'completed' as const,
        renterName: booking.renter.full_name
      }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800'
    }

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
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
            onClick={() => window.location.reload()}
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Earnings Overview</h1>
            <p className="text-gray-600">Track your rental income and payouts</p>
          </div>
          <div className="flex space-x-2">
            {(['7d', '30d', '90d', '1y'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  selectedPeriod === period
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period === '7d' ? '7 Days' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(earningsData.totalEarnings)}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">From {earningsData.completedBookings} completed bookings</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(earningsData.thisMonthEarnings)}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">
              {earningsData.thisMonthEarnings > 0 ? '+' : ''}{((earningsData.thisMonthEarnings / (earningsData.totalEarnings || 1)) * 100).toFixed(1)}% of total
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(earningsData.pendingPayouts)}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">From active bookings</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg. Booking Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(earningsData.averageBookingValue)}</p>
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">Per completed booking</p>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Breakdown Chart */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Monthly Earnings</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {earningsData.monthlyBreakdown.slice(-6).map((month, index) => (
                <div key={month.month} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-900">{month.month}</div>
                    <div className="text-xs text-gray-500">({month.bookings} bookings)</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (month.earnings / Math.max(...earningsData.monthlyBreakdown.map(m => m.earnings))) * 100)}%`
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-900 w-20 text-right">
                      {formatCurrency(month.earnings)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Transactions</h2>
          </div>
          <div className="p-6">
            {earningsData.recentTransactions.length > 0 ? (
              <div className="space-y-4">
                {earningsData.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {transaction.itemTitle}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-gray-600">
                          {transaction.renterName} • {formatDate(transaction.date)}
                        </p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No transactions yet</h3>
                <p className="text-xs text-gray-600">Complete some bookings to see your earnings here.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payout Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Payout Information</h3>
            <p className="text-sm text-blue-800">
              Earnings are automatically transferred to your connected bank account within 2-3 business days after each completed booking. 
              Pending payouts will be processed once the rental period ends and any security deposit holds are released.
            </p>
            <button className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-800">
              Manage payout settings →
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}