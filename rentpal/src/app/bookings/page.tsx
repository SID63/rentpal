'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import BookingsList from '@/components/booking/BookingsList'
import AuthGuard from '@/components/auth/AuthGuard'

function BookingsPageContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'renter' | 'owner'>(
    (searchParams.get('type') as 'renter' | 'owner') || 'renter'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            My Bookings
          </h1>
          <p className="text-gray-600">
            Manage your rental bookings and track their status
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('renter')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'renter'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Rentals
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  Items I'm renting
                </span>
              </button>
              <button
                onClick={() => setActiveTab('owner')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'owner'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Booking Requests
                <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  My items being rented
                </span>
              </button>
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="tab-content">
          {activeTab === 'renter' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Items You're Renting
                </h2>
                <p className="text-gray-600">
                  Track your rental bookings and manage pickup/return details
                </p>
              </div>
              <BookingsList type="renter" />
            </div>
          )}

          {activeTab === 'owner' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Booking Requests for Your Items
                </h2>
                <p className="text-gray-600">
                  Review and manage rental requests for your listed items
                </p>
              </div>
              <BookingsList type="owner" />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BookingsPage() {
  return (
    <AuthGuard requireAuth={true}>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      }>
        <BookingsPageContent />
      </Suspense>
    </AuthGuard>
  )
}