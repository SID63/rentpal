'use client'

import { useState, useEffect } from 'react'
import { BookingWithDetails } from '@/types/database'
import { useBookings } from '@/hooks/useDatabase'
import Link from 'next/link'

interface BookingsListProps {
  type: 'renter' | 'owner'
  limit?: number
  showFilters?: boolean
  className?: string
}

export default function BookingsList({ 
  type, 
  limit,
  showFilters = true,
  className = "" 
}: BookingsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const { bookings, loading, error, refresh } = useBookings(type)
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([])

  useEffect(() => {
    let filtered = bookings
    
    if (statusFilter !== 'all') {
      filtered = bookings.filter(booking => booking.status === statusFilter)
    }

    if (limit) {
      filtered = filtered.slice(0, limit)
    }

    setFilteredBookings(filtered)
  }, [bookings, statusFilter, limit])

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

  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending'
      case 'confirmed':
        return 'Confirmed'
      case 'active':
        return 'Active'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="animate-pulse bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-8 bg-red-50 rounded-lg">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={refresh}
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
      {/* Filters */}
      {showFilters && bookings.length > 0 && (
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Filter by status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Bookings</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          
          <div className="text-sm text-gray-600">
            {filteredBookings.length} of {bookings.length} bookings
          </div>
        </div>
      )}

      {/* Bookings List */}
      {filteredBookings.length > 0 ? (
        <div className="space-y-4">
          {filteredBookings.map((booking) => (
            <Link
              key={booking.id}
              href={`/bookings/${booking.id}`}
              className="block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6"
            >
              <div className="flex items-start space-x-4">
                {/* Item Image */}
                <div className="flex-shrink-0">
                  {booking.item.images && booking.item.images.length > 0 ? (
                    <img
                      src={booking.item.images[0].image_url}
                      alt={booking.item.title}
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

                {/* Booking Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {booking.item.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {type === 'renter' ? `Hosted by ${booking.owner.full_name}` : `Rented by ${booking.renter.full_name}`}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>{formatDate(booking.start_date)} - {formatDate(booking.end_date)}</span>
                        <span>•</span>
                        <span>{formatPrice(booking.total_amount)}</span>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {getStatusText(booking.status)}
                    </div>
                  </div>

                  {/* Action Required Indicator */}
                  {((type === 'owner' && booking.status === 'pending') || 
                    (type === 'owner' && booking.status === 'confirmed') ||
                    (type === 'owner' && booking.status === 'active')) && (
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
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {statusFilter === 'all' 
              ? `No ${type === 'renter' ? 'rentals' : 'bookings'} yet`
              : `No ${statusFilter} ${type === 'renter' ? 'rentals' : 'bookings'}`
            }
          </h3>
          <p className="text-gray-600 mb-6">
            {type === 'renter' 
              ? "Start exploring items to rent from your community"
              : "Your rental requests will appear here"
            }
          </p>
          {type === 'renter' && (
            <Link
              href="/search"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Browse Items
            </Link>
          )}
        </div>
      )}

      {/* Show More Link */}
      {limit && bookings.length > limit && (
        <div className="text-center mt-6">
          <Link
            href={`/bookings?type=${type}`}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View all {bookings.length} {type === 'renter' ? 'rentals' : 'bookings'}
          </Link>
        </div>
      )}
    </div>
  )
}