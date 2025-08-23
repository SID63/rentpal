'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { bookingService } from '@/lib/database'
import { BookingWithDetails } from '@/types/database'
import BookingDetails from '@/components/booking/BookingDetails'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/contexts/AuthContext'

export default function BookingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [booking, setBooking] = useState<BookingWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const bookingId = params.id as string

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const bookingData = await bookingService.getBooking(bookingId)
      
      if (!bookingData) {
        setError('Booking not found')
        return
      }

      // Check if user has access to this booking
      if (bookingData.renter_id !== user?.id && bookingData.owner_id !== user?.id) {
        setError('You do not have permission to view this booking')
        return
      }

      setBooking(bookingData)
    } catch {
      setError('Failed to load booking details')
    } finally {
      setLoading(false)
    }
  }, [bookingId, user])

  useEffect(() => {
    if (bookingId && user) {
      fetchBooking()
    }
  }, [bookingId, user, fetchBooking])

  const handleBookingUpdate = (updatedBooking: BookingWithDetails) => {
    setBooking(updatedBooking)
  }

  if (loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="animate-pulse">
              {/* Breadcrumb skeleton */}
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-8"></div>
              
              {/* Booking details skeleton */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                
                <div className="p-6 space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Booking Not Found</h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-x-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Go Back
              </button>
              <button
                onClick={() => router.push('/bookings')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                View All Bookings
              </button>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!booking) {
    return null
  }

  const isRenter = user?.id === booking.renter_id

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb */}
        <div className="bg-white border-b">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <nav className="flex items-center space-x-2 text-sm text-gray-600">
              <button
                onClick={() => router.push('/bookings')}
                className="hover:text-gray-900 transition-colors"
              >
                {isRenter ? 'My Rentals' : 'My Bookings'}
              </button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-gray-900 font-medium">
                Booking #{booking.id.slice(-8).toUpperCase()}
              </span>
            </nav>
          </div>
        </div>

        {/* Booking Details */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BookingDetails 
            booking={booking} 
            onBookingUpdate={handleBookingUpdate}
          />
        </div>
      </div>
    </AuthGuard>
  )
}