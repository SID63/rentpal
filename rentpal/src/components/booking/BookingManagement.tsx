'use client'

import { useState, useEffect, useCallback } from 'react'
import { BookingWithDetails, BookingStatus } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { bookingService } from '@/lib/database'
import BookingDetails from './BookingDetails'
import Link from 'next/link'
import Image from 'next/image'

interface BookingManagementProps {
  className?: string
}

export default function BookingManagement({ className = "" }: BookingManagementProps) {
  const [activeTab, setActiveTab] = useState<'renter' | 'owner'>('renter')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [bookings, setBookings] = useState<BookingWithDetails[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([])
  const [selectedBooking, setSelectedBooking] = useState<BookingWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchBookings = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const data = await bookingService.getUserBookings(user.id, activeTab)
      const safe = Array.isArray(data) ? data : []
      if (!Array.isArray(data)) {
        console.error('getUserBookings returned non-array in BookingManagement:', data)
      }
      setBookings(safe)
    } catch {
      setError('Failed to fetch bookings')
    } finally {
      setLoading(false)
    }
  }, [user, activeTab])

  const filterBookings = useCallback(() => {
    const base = Array.isArray(bookings) ? bookings.slice() : []
    let filtered = base
    
    if (statusFilter !== 'all') {
      filtered = base.filter(booking => booking.status === statusFilter)
    }

    // Sort by created date, most recent first
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    setFilteredBookings(filtered)
  }, [bookings, statusFilter])

  useEffect(() => {
    if (user) {
      fetchBookings()
    }
  }, [user, activeTab, fetchBookings])

  useEffect(() => {
    filterBookings()
  }, [bookings, statusFilter, filterBookings])

  const handleBookingUpdate = (updatedBooking: BookingWithDetails) => {
    setBookings(prev => 
      prev.map(booking => 
        booking.id === updatedBooking.id ? updatedBooking : booking
      )
    )
    setSelectedBooking(updatedBooking)
  }

  const getStatusCounts = () => {
    const base = Array.isArray(bookings) ? bookings : []
    const counts = {
      all: base.length,
      pending: base.filter(b => b.status === 'pending').length,
      confirmed: base.filter(b => b.status === 'confirmed').length,
      active: base.filter(b => b.status === 'active').length,
      completed: base.filter(b => b.status === 'completed').length,
      cancelled: base.filter(b => b.status === 'cancelled').length
    }
    return counts
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'confirmed':
        return 'bg-blue-100 text-blue-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getActionRequiredCount = () => {
    if (activeTab === 'owner') {
      const base = Array.isArray(bookings) ? bookings : []
      return base.filter(b => 
        b.status === 'pending' || 
        b.status === 'confirmed' || 
        b.status === 'active'
      ).length
    }
    return 0
  }

  const statusCounts = getStatusCounts()
  const actionRequiredCount = getActionRequiredCount()

  if (loading) {
    return (
      <div className={className}>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (selectedBooking) {
    return (
      <div className={className}>
        <div className="mb-4">
          <button
            onClick={() => setSelectedBooking(null)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
        </div>
        <BookingDetails 
          booking={selectedBooking} 
          onBookingUpdate={handleBookingUpdate}
        />
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Management</h1>
        <p className="text-gray-600">
          Manage your rental bookings and requests
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('renter')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'renter'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            My Rentals ({statusCounts.all})
          </button>
          <button
            onClick={() => setActiveTab('owner')}
            className={`py-2 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === 'owner'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Booking Requests ({statusCounts.all})
            {actionRequiredCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {actionRequiredCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
          <button
            onClick={fetchBookings}
            className="ml-4 text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      )}

      {/* Filters and Stats */}
      {bookings.length > 0 && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Filter by status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All ({statusCounts.all})</option>
                <option value="pending">Pending ({statusCounts.pending})</option>
                <option value="confirmed">Confirmed ({statusCounts.confirmed})</option>
                <option value="active">Active ({statusCounts.active})</option>
                <option value="completed">Completed ({statusCounts.completed})</option>
                <option value="cancelled">Cancelled ({statusCounts.cancelled})</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-4 pt-4 border-t">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-lg font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600 capitalize">
                  {status === 'all' ? 'Total' : status}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-white rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedBooking(booking)}
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Item Image */}
                  <div className="flex-shrink-0">
                    {booking.item.images && booking.item.images.length > 0 ? (
                      <Image
                        src={booking.item.images[0].image_url}
                        alt={booking.item.title}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Booking Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 truncate">
                          {booking.item.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {activeTab === 'renter' 
                            ? `Hosted by ${booking.owner.full_name}` 
                            : `Requested by ${booking.renter.full_name}`
                          }
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span>{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                          <span>•</span>
                          <span>{formatPrice(booking.total_amount)}</span>
                          <span>•</span>
                          <span>#{booking.id.slice(-8).toUpperCase()}</span>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </div>
                    </div>

                    {/* Action Required Indicator */}
                    {activeTab === 'owner' && ['pending', 'confirmed', 'active'].includes(booking.status) && (
                      <div className="mt-3 flex items-center text-sm text-blue-600">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {booking.status === 'pending' && 'Action required: Review booking request'}
                        {booking.status === 'confirmed' && 'Ready to start rental'}
                        {booking.status === 'active' && 'Rental in progress'}
                      </div>
                    )}
                  </div>

                  {/* Arrow Icon */}
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-white rounded-lg border">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {statusFilter === 'all' 
              ? `No ${activeTab === 'renter' ? 'rentals' : 'booking requests'} yet`
              : `No ${statusFilter} ${activeTab === 'renter' ? 'rentals' : 'booking requests'}`
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {activeTab === 'renter' 
              ? "Start exploring items to rent from your community"
              : "Booking requests for your items will appear here"
            }
          </p>
          {activeTab === 'renter' && (
            <Link
              href="/search"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Items
            </Link>
          )}
        </div>
      )}
    </div>
  )
}