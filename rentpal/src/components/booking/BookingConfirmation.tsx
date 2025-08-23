'use client'

import { useState } from 'react'
import { BookingWithDetails } from '@/types/database'
import Link from 'next/link'
import Image from 'next/image'

interface BookingConfirmationProps {
  booking: BookingWithDetails
  onClose?: () => void
  className?: string
}

export default function BookingConfirmation({ 
  booking, 
  onClose,
  className = "" 
}: BookingConfirmationProps) {
  const [showDetails, setShowDetails] = useState(false)

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

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Success Header */}
      <div className="bg-green-50 border-b border-green-200 px-6 py-8 text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-green-900 mb-2">Booking Request Submitted!</h2>
        <p className="text-green-700">
          Your booking request has been sent to the item owner for approval.
        </p>
      </div>

      <div className="p-6">
        {/* Booking Summary */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Summary</h3>
          
          <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
            {booking.item.images && booking.item.images.length > 0 && (
              <Image
                src={booking.item.images[0].image_url}
                alt={booking.item.title}
                width={64}
                height={64}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">{booking.item.title}</h4>
              <p className="text-sm text-gray-600 mt-1">
                Hosted by {booking.owner.full_name}
              </p>
              <p className="text-sm text-gray-600">
                {booking.item.location_city}, {booking.item.location_state}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">
                {formatPrice(booking.total_amount)}
              </p>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </div>
        </div>

        {/* Key Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Rental Period</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Start:</span> {formatDateTime(booking.start_date)}</p>
              <p><span className="font-medium">End:</span> {formatDateTime(booking.end_date)}</p>
              <p><span className="font-medium">Duration:</span> {formatDuration(booking.total_hours)}</p>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">Booking Details</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Booking ID:</span> #{booking.id.slice(-8).toUpperCase()}</p>
              <p><span className="font-medium">Status:</span> 
                <span className="ml-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                  Pending Approval
                </span>
              </p>
              <p><span className="font-medium">Created:</span> {new Date(booking.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Expandable Details */}
        <div className="border-t pt-6">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900">
              {showDetails ? 'Hide' : 'Show'} Full Details
            </h4>
            <svg 
              className={`w-5 h-5 text-gray-400 transition-transform ${showDetails ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showDetails && (
            <div className="mt-4 space-y-4">
              {/* Pricing Breakdown */}
              <div>
                <h5 className="font-medium text-gray-900 mb-2">Pricing Breakdown</h5>
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
                      <span className="text-gray-600">Security deposit (refundable)</span>
                      <span className="text-gray-900">{formatPrice(booking.security_deposit)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between font-medium">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">{formatPrice(booking.total_amount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Details */}
              {(booking.pickup_location || booking.return_location) && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Pickup & Return</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    {booking.pickup_location && (
                      <p><span className="font-medium">Pickup:</span> {booking.pickup_location}</p>
                    )}
                    {booking.return_location && (
                      <p><span className="font-medium">Return:</span> {booking.return_location}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Special Instructions */}
              {booking.special_instructions && (
                <div>
                  <h5 className="font-medium text-gray-900 mb-2">Special Instructions</h5>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                    {booking.special_instructions}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="border-t pt-6 mt-6">
          <h4 className="font-medium text-gray-900 mb-3">What happens next?</h4>
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                1
              </div>
              <p>The item owner will review your booking request and respond within 24 hours.</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                2
              </div>
              <p>If approved, you&apos;ll receive a confirmation email with pickup/delivery details.</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                3
              </div>
              <p>Payment will be processed once the booking is confirmed.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t mt-6">
          <Link
            href={`/bookings/${booking.id}`}
            className="flex-1 bg-blue-600 text-white text-center py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            View Booking Details
          </Link>
          <Link
            href="/bookings"
            className="flex-1 bg-gray-100 text-gray-700 text-center py-3 px-4 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            View All Bookings
          </Link>
          {onClose && (
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            >
              Continue Browsing
            </button>
          )}
        </div>

        {/* Contact Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="text-blue-900 font-medium mb-1">Need help?</p>
              <p className="text-blue-800">
                You can message the item owner directly through your booking page, or contact our support team if you have any questions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}