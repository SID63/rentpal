'use client'

import { useState } from 'react'
import { BookingWithDetails } from '@/types/database'
import { bookingService } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

interface BookingDetailsProps {
  booking: BookingWithDetails
  onBookingUpdate?: (updatedBooking: BookingWithDetails) => void
  className?: string
}

export default function BookingDetails({ 
  booking, 
  onBookingUpdate,
  className = "" 
}: BookingDetailsProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const isOwner = user?.id === booking.owner_id
  const isRenter = user?.id === booking.renter_id

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(price)
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
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
        return 'Pending Approval'
      case 'confirmed':
        return 'Confirmed'
      case 'active':
        return 'Active Rental'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return 'Cancelled'
      default:
        return status
    }
  }

  const handleStatusUpdate = async (newStatus: string) => {
    setIsUpdating(true)
    setError(null)

    try {
      const updatedBooking = await bookingService.updateBooking(booking.id, {
        status: newStatus as any,
        updated_at: new Date().toISOString()
      })

      if (updatedBooking && onBookingUpdate) {
        // We need to fetch the full booking details since updateBooking returns limited data
        const fullBooking = await bookingService.getBooking(booking.id)
        if (fullBooking) {
          onBookingUpdate(fullBooking)
        }
      }
    } catch {
      setError('Failed to update booking status')
    } finally {
      setIsUpdating(false)
    }
  }

  const canConfirm = isOwner && booking.status === 'pending'
  const canCancel = (isOwner || isRenter) && ['pending', 'confirmed'].includes(booking.status)
  const canMarkActive = isOwner && booking.status === 'confirmed'
  const canMarkComplete = isOwner && booking.status === 'active'

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Booking #{booking.id.slice(-8).toUpperCase()}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Created on {new Date(booking.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
            {getStatusText(booking.status)}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Item Information */}
        <div className="flex items-start space-x-4">
          {booking.item.images && booking.item.images.length > 0 && (
            <img
              src={booking.item.images[0].image_url}
              alt={booking.item.title}
              className="w-20 h-20 rounded-lg object-cover"
            />
          )}
          <div className="flex-1">
            <Link 
              href={`/items/${booking.item.id}`}
              className="text-lg font-medium text-gray-900 hover:text-blue-600"
            >
              {booking.item.title}
            </Link>
            <p className="text-sm text-gray-600 mt-1">{booking.item.category?.name}</p>
            <p className="text-sm text-gray-600">
              {booking.item.location_city}, {booking.item.location_state}
            </p>
          </div>
        </div>

        {/* Rental Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Rental Period</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Start:</span>
                <span className="ml-2 text-gray-900">{formatDateTime(booking.start_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">End:</span>
                <span className="ml-2 text-gray-900">{formatDateTime(booking.end_date)}</span>
              </div>
              <div>
                <span className="text-gray-600">Duration:</span>
                <span className="ml-2 text-gray-900">{formatDuration(booking.total_hours)}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Participants</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">Renter:</span>
                <span className="ml-2 text-gray-900">{booking.renter.full_name}</span>
              </div>
              <div>
                <span className="text-gray-600">Owner:</span>
                <span className="ml-2 text-gray-900">{booking.owner.full_name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location Details */}
        {(booking.pickup_location || booking.return_location) && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Locations</h3>
            <div className="space-y-2 text-sm">
              {booking.pickup_location && (
                <div>
                  <span className="text-gray-600">Pickup:</span>
                  <span className="ml-2 text-gray-900">{booking.pickup_location}</span>
                </div>
              )}
              {booking.return_location && (
                <div>
                  <span className="text-gray-600">Return:</span>
                  <span className="ml-2 text-gray-900">{booking.return_location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        {booking.special_instructions && (
          <div>
            <h3 className="font-medium text-gray-900 mb-3">Special Instructions</h3>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {booking.special_instructions}
            </p>
          </div>
        )}

        {/* Pricing Breakdown */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Pricing</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">
                  {booking.hourly_rate && booking.total_hours < 24 
                    ? `${booking.total_hours} hours × ${formatPrice(booking.hourly_rate)}`
                    : `${Math.ceil(booking.total_hours / 24)} days × ${formatPrice(booking.daily_rate)}`
                  }
                </span>
                <span className="text-gray-900">{formatPrice(booking.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service fee</span>
                <span className="text-gray-900">{formatPrice(booking.service_fee)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Security deposit</span>
                <span className="text-gray-900">{formatPrice(booking.security_deposit)}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{formatPrice(booking.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {(canConfirm || canCancel || canMarkActive || canMarkComplete) && (
          <div className="border-t pt-6">
            <div className="flex flex-wrap gap-3">
              {canConfirm && (
                <button
                  onClick={() => handleStatusUpdate('confirmed')}
                  disabled={isUpdating}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Confirm Booking'}
                </button>
              )}
              
              {canMarkActive && (
                <button
                  onClick={() => handleStatusUpdate('active')}
                  disabled={isUpdating}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Mark as Active'}
                </button>
              )}
              
              {canMarkComplete && (
                <button
                  onClick={() => handleStatusUpdate('completed')}
                  disabled={isUpdating}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Mark as Complete'}
                </button>
              )}
              
              {canCancel && (
                <button
                  onClick={() => handleStatusUpdate('cancelled')}
                  disabled={isUpdating}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isUpdating ? 'Updating...' : 'Cancel Booking'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Contact Information */}
        <div className="border-t pt-6">
          <h3 className="font-medium text-gray-900 mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="font-medium text-gray-900 mb-1">
                {isRenter ? 'Item Owner' : 'Renter'}
              </div>
              <div className="text-gray-700">
                {isRenter ? booking.owner.full_name : booking.renter.full_name}
              </div>
              {/* Contact details would be shown here for active bookings */}
              {booking.status === 'active' && (
                <div className="text-xs text-gray-500 mt-1">
                  Contact details available for active rentals
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}