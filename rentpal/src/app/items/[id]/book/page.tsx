'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { itemService } from '@/lib/database'
import { ItemWithDetails } from '@/types/database'
import BookingForm from '@/components/booking/BookingForm'
import AuthGuard from '@/components/auth/AuthGuard'
import { useAuth } from '@/contexts/AuthContext'

export default function BookItemPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const [item, setItem] = useState<ItemWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const itemId = params.id as string

  useEffect(() => {
    if (itemId && user) {
      fetchItem()
    }
  }, [itemId, user])

  const fetchItem = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const itemData = await itemService.getItemById(itemId, user?.id)
      
      if (!itemData) {
        setError('Item not found')
        return
      }

      // Check if item is available for booking
      if (itemData.status !== 'active') {
        setError('This item is not available for booking')
        return
      }

      // Check if user is trying to book their own item
      if (itemData.owner_id === user?.id) {
        setError('You cannot book your own item')
        return
      }

      setItem(itemData)
    } catch {
      setError('Failed to load item details')
    } finally {
      setLoading(false)
    }
  }

  const handleBookingComplete = (bookingId: string) => {
    router.push(`/bookings/${bookingId}`)
  }

  const handleCancel = () => {
    router.back()
  }

  if (loading) {
    return (
      <AuthGuard requireAuth={true}>
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="space-y-4">
                  <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-10 bg-gray-200 rounded"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div className="h-32 bg-gray-200 rounded"></div>
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
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
            <div className="mt-4 space-x-4">
              <button
                onClick={() => router.back()}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                ← Go back
              </button>
              <button
                onClick={() => router.push('/search')}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Browse Items
              </button>
            </div>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (!item) {
    return null
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto mb-8">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <button
              onClick={() => router.push('/search')}
              className="hover:text-gray-900 transition-colors"
            >
              Search
            </button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <button
              onClick={() => router.push(`/items/${item.id}`)}
              className="hover:text-gray-900 transition-colors truncate"
            >
              {item.title}
            </button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 font-medium">Book Item</span>
          </nav>
        </div>

        {/* Booking Form */}
        <div className="max-w-4xl mx-auto">
          <BookingForm
            item={item}
            onBookingComplete={handleBookingComplete}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </AuthGuard>
  )
}