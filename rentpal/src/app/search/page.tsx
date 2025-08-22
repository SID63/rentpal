'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { itemService } from '@/lib/database'
import { ItemWithDetails } from '@/types/database'
import AdvancedSearch from '@/components/search/AdvancedSearch'
import RecommendationEngine from '@/components/recommendations/RecommendationEngine'
import { useAuth } from '@/contexts/AuthContext'

const ITEMS_PER_PAGE = 12

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()
  
  // State
  const [showRecommendations, setShowRecommendations] = useState(true)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')

  // Get initial filters from URL
  const getInitialFilters = () => ({
    query: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    location: searchParams.get('location') || '',
    minPrice: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : 0,
    maxPrice: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : 1000,
    deliveryAvailable: searchParams.get('delivery') === 'true',
    sortBy: (searchParams.get('sort') as 'relevance' | 'price_low' | 'price_high' | 'rating' | 'distance' | 'newest' | 'popular' | 'trending') || 'relevance'
  })

  // Handle search query changes
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    if (query.trim()) {
      setShowRecommendations(false)
    } else {
      setShowRecommendations(true)
    }
  }

  // Handle filters change
  const handleFiltersChange = (filters: Record<string, any>) => {
    // Update URL with new filters
    const params = new URLSearchParams()
    
    if (filters.query) params.set('q', filters.query)
    if (filters.category) params.set('category', filters.category)
    if (filters.location) params.set('location', filters.location)
    if (filters.minPrice > 0) params.set('minPrice', filters.minPrice.toString())
    if (filters.maxPrice < 1000) params.set('maxPrice', filters.maxPrice.toString())
    if (filters.deliveryAvailable) params.set('delivery', 'true')
    if (filters.sortBy !== 'relevance') params.set('sort', filters.sortBy)

    const newURL = `/search${params.toString() ? `?${params.toString()}` : ''}`
    router.push(newURL, { scroll: false })
    
    // Hide recommendations when actively searching
    if (filters.query || filters.category || filters.location) {
      setShowRecommendations(false)
    } else {
      setShowRecommendations(true)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {showRecommendations ? 'Discover Items to Rent' : 'Search Results'}
              </h1>
              <p className="text-gray-600 mt-2">
                {showRecommendations 
                  ? 'Find the perfect items for your needs' 
                  : 'Items matching your search criteria'
                }
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowRecommendations(!showRecommendations)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showRecommendations
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showRecommendations ? 'Hide Recommendations' : 'Show Recommendations'}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Search Component */}
        <AdvancedSearch
          initialFilters={getInitialFilters()}
          onFiltersChange={handleFiltersChange}
          className="mb-8"
        />

        {/* Recommendations Section */}
        {showRecommendations && (
          <div className="mb-12">
            <RecommendationEngine
              userId={user?.id}
              maxRecommendations={12}
              className="bg-white rounded-lg shadow p-6"
            />
          </div>
        )}

        {/* Popular Categories */}
        {showRecommendations && (
          <div className="mb-12">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Popular Categories</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { name: 'Cameras', icon: '📷', slug: 'cameras' },
                  { name: 'Tools', icon: '🔧', slug: 'tools' },
                  { name: 'Sports', icon: '⚽', slug: 'sports' },
                  { name: 'Electronics', icon: '💻', slug: 'electronics' },
                  { name: 'Vehicles', icon: '🚗', slug: 'vehicles' },
                  { name: 'Outdoor', icon: '🏕️', slug: 'outdoor' }
                ].map((category) => (
                  <button
                    key={category.slug}
                    onClick={() => {
                      const params = new URLSearchParams()
                      params.set('category', category.slug)
                      router.push(`/search?${params.toString()}`)
                    }}
                    className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-2xl mb-2">{category.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{category.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Search Tips */}
        {showRecommendations && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Search Tips</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Find exactly what you need:</h4>
                <ul className="space-y-1">
                  <li>• Use specific keywords like "DSLR camera" or "power drill"</li>
                  <li>• Filter by location to find items nearby</li>
                  <li>• Set price ranges to match your budget</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-gray-800 mb-1">Get the best deals:</h4>
                <ul className="space-y-1">
                  <li>• Sort by price to find the most affordable options</li>
                  <li>• Look for verified owners for peace of mind</li>
                  <li>• Check delivery options to save time</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}