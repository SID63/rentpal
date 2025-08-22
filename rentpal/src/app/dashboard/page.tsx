'use client'

import { useAuth } from '@/contexts/AuthContext'
import AuthGuard from '@/components/auth/AuthGuard'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">RentPal Dashboard</h1>
              </div>
              <div className="flex items-center space-x-4">
                <Link 
                  href="/profile/edit"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  Welcome to RentPal, {user?.user_metadata?.full_name || user?.email}!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your dashboard is ready. This is where you&apos;ll manage your listings, bookings, and profile.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-900 mb-2">My Listings</h3>
                    <p className="text-blue-700">Manage your rental items</p>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-blue-900">0</span>
                      <span className="text-blue-700 ml-2">Active listings</span>
                    </div>
                  </div>

                  <Link href="/bookings" className="bg-green-50 p-6 rounded-lg hover:bg-green-100 transition-colors">
                    <h3 className="text-lg font-medium text-green-900 mb-2">My Bookings</h3>
                    <p className="text-green-700">Track your rentals</p>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-green-900">0</span>
                      <span className="text-green-700 ml-2">Active bookings</span>
                    </div>
                  </Link>

                  <div className="bg-purple-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-purple-900 mb-2">Earnings</h3>
                    <p className="text-purple-700">Your rental income</p>
                    <div className="mt-4">
                      <span className="text-2xl font-bold text-purple-900">$0</span>
                      <span className="text-purple-700 ml-2">Total earned</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    <Link 
                      href="/items/create"
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Add New Listing
                    </Link>
                    <Link 
                      href="/search"
                      className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                    >
                      Search Items
                    </Link>
                    <Link 
                      href="/profile/edit"
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                    >
                      Update Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}