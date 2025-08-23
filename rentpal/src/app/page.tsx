'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Link from 'next/link'
import RecommendationEngine from '@/components/recommendations/RecommendationEngine'
import RecentlyViewed from '@/components/items/RecentlyViewed'
import { WebsiteSEO, OrganizationSEO } from '@/components/SEO'

export default function Home() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-center min-h-screen py-12">
          <WebsiteSEO />
          <OrganizationSEO />
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              Welcome to <span className="text-blue-600">RentPal</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              The peer-to-peer rental marketplace where you can rent out your items or find what you need from your community.
            </p>

            {/* Search Bar */}
            <div className="mt-8 max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for cameras, tools, bikes, and more..."
                  className="w-full px-4 py-4 pl-12 pr-20 text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const query = (e.target as HTMLInputElement).value
                      window.location.href = `/search?q=${encodeURIComponent(query)}`
                    }
                  }}
                />
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement
                    const query = input?.value || ''
                    window.location.href = `/search?q=${encodeURIComponent(query)}`
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  <span className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 text-base font-medium">
                    Search
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-8 max-w-md mx-auto sm:flex sm:justify-center">
              <div className="rounded-md shadow">
                <Link
                  href="/auth/register"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
                >
                  Get Started
                </Link>
              </div>
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                <Link
                  href="/search"
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
                >
                  Browse Items
                </Link>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="mt-16">
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white mx-auto">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">Earn Money</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Rent out your unused items and turn them into income.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white mx-auto">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">Smart Search</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Advanced filters and AI-powered recommendations to find exactly what you need.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white mx-auto">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900 text-center">Mobile App</h3>
                <p className="mt-2 text-base text-gray-500 text-center">
                  Install our PWA for offline access and native app experience.
                </p>
              </div>
            </div>
          </div>

          {/* Recently Viewed Section */}
          <div className="mt-16">
            <RecentlyViewed maxItems={6} />
          </div>

          {/* Recommendations Section */}
          <div className="mt-16">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <RecommendationEngine maxRecommendations={6} />
            </div>
          </div>

          {/* Advanced Features Showcase */}
          <div className="mt-16">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">Advanced Features</h2>
                <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
                  RentPal offers cutting-edge features to enhance your rental experience
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-3 mx-auto w-16 h-16 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold mb-2">Smart Favorites</h3>
                    <p className="text-sm text-blue-100">Save items with intelligent organization and recommendations</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-3 mx-auto w-16 h-16 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold mb-2">Advanced Filters</h3>
                    <p className="text-sm text-blue-100">Powerful search with location, price, and availability filters</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-3 mx-auto w-16 h-16 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold mb-2">AI Recommendations</h3>
                    <p className="text-sm text-blue-100">Personalized suggestions based on your preferences and history</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="bg-white bg-opacity-20 rounded-lg p-4 mb-3 mx-auto w-16 h-16 flex items-center justify-center">
                      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold mb-2">Offline Access</h3>
                    <p className="text-sm text-blue-100">Browse favorites and cached content even without internet</p>
                  </div>
                </div>
                
                <div className="mt-8">
                  <Link
                    href="/search"
                    className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
                  >
                    Try Advanced Search
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
