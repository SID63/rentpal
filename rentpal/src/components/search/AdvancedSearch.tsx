'use client'

import { useState, useEffect } from 'react'
import { useCategories } from '@/hooks/useDatabase'
import { itemService } from '@/lib/database'
import { ItemWithDetails } from '@/types/database'
import { locationService, Coordinates } from '@/lib/location'
import Link from 'next/link'

interface SearchFilters {
  query: string
  category: string
  location: string
  coordinates: Coordinates | null
  radius: number
  minPrice: number
  maxPrice: number
  minRating: number
  availability: 'all' | 'available' | 'unavailable'
  deliveryAvailable: boolean
  sortBy: 'relevance' | 'price_low' | 'price_high' | 'rating' | 'distance' | 'newest' | 'popular' | 'trending'
  itemCondition: 'all' | 'new' | 'like_new' | 'good' | 'fair'
  rentalDuration: 'all' | 'hourly' | 'daily' | 'weekly'
  minDuration: number
  maxDuration: number
  instantBook: boolean
  verifiedOwners: boolean
  recentlyViewed: boolean
}

interface AdvancedSearchProps {
  initialFilters?: Partial<SearchFilters>
  onFiltersChange?: (filters: SearchFilters) => void
  className?: string
}

export default function AdvancedSearch({
  initialFilters = {},
  onFiltersChange,
  className = ""
}: AdvancedSearchProps) {
  const { categories } = useCategories()
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: '',
    location: '',
    coordinates: null,
    radius: 25,
    minPrice: 0,
    maxPrice: 1000,
    minRating: 0,
    availability: 'all',
    deliveryAvailable: false,
    sortBy: 'relevance',
    itemCondition: 'all',
    rentalDuration: 'all',
    minDuration: 1,
    maxDuration: 30,
    instantBook: false,
    verifiedOwners: false,
    recentlyViewed: false,
    ...initialFilters
  })
  
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [priceRange, setPriceRange] = useState([filters.minPrice, filters.maxPrice])

  useEffect(() => {
    onFiltersChange?.(filters)
    searchItems()
  }, [filters])

  const searchItems = async () => {
    setLoading(true)
    setError(null)

    try {
      // Build search parameters
      const searchParams: any = {
        limit: 50
      }

      if (filters.category) {
        searchParams.category = filters.category
      }

      if (filters.minPrice > 0) {
        searchParams.minPrice = filters.minPrice
      }

      if (filters.maxPrice < 1000) {
        searchParams.maxPrice = filters.maxPrice
      }

      if (filters.location) {
        searchParams.location = filters.location
      }

      if (filters.coordinates && filters.radius) {
        searchParams.coordinates = filters.coordinates
        searchParams.radius = filters.radius
      }

      // Get items from database service
      const searchResults = await itemService.getItems(searchParams)
      
      // Apply additional client-side filters
      let filteredItems = searchResults.filter(item => {
        // Text search
        if (filters.query) {
          const searchText = filters.query.toLowerCase()
          const matchesTitle = item.title.toLowerCase().includes(searchText)
          const matchesDescription = item.description.toLowerCase().includes(searchText)
          const matchesCategory = item.category?.name.toLowerCase().includes(searchText)
          
          if (!matchesTitle && !matchesDescription && !matchesCategory) {
            return false
          }
        }

        // Rating filter
        if (filters.minRating > 0 && item.rating < filters.minRating) {
          return false
        }

        // Availability filter
        if (filters.availability === 'available' && item.status !== 'active') {
          return false
        }
        if (filters.availability === 'unavailable' && item.status === 'active') {
          return false
        }

        // Delivery filter
        if (filters.deliveryAvailable && !item.delivery_available) {
          return false
        }

        // Rental duration filter
        if (filters.rentalDuration === 'hourly' && !item.hourly_rate) {
          return false
        }
        if (filters.rentalDuration === 'daily' && item.hourly_rate && !item.daily_rate) {
          return false
        }

        // Duration range filter
        if (item.min_rental_duration > filters.maxDuration) {
          return false
        }
        if (item.max_rental_duration && item.max_rental_duration < filters.minDuration) {
          return false
        }

        // Verified owners filter
        if (filters.verifiedOwners && item.owner.verification_status !== 'verified') {
          return false
        }

        // Instant book filter (items with quick response)
        if (filters.instantBook && item.owner.rating < 4.5) {
          return false
        }

        return true
      })

      // Apply sorting
      filteredItems = sortItems(filteredItems)

      setItems(filteredItems)
    } catch (err) {
      setError('Failed to search items')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const sortItems = (items: ItemWithDetails[]) => {
    return items.sort((a, b) => {
      switch (filters.sortBy) {
        case 'price_low':
          return a.daily_rate - b.daily_rate
        case 'price_high':
          return b.daily_rate - a.daily_rate
        case 'rating':
          // Secondary sort by number of reviews
          if (b.rating === a.rating) {
            return b.total_reviews - a.total_reviews
          }
          return b.rating - a.rating
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'popular':
          // Sort by combination of views, favorites, and bookings
          const aPopularity = a.views_count * 0.1 + a.favorites_count * 0.5 + a.total_reviews * 0.4
          const bPopularity = b.views_count * 0.1 + b.favorites_count * 0.5 + b.total_reviews * 0.4
          return bPopularity - aPopularity
        case 'trending':
          // Items with recent activity (views, favorites, bookings)
          const now = Date.now()
          const aRecency = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24) // days
          const bRecency = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60 * 24)
          
          // Trending score: recent activity weighted by recency
          const aTrending = (a.views_count + a.favorites_count * 2) / Math.max(aRecency, 1)
          const bTrending = (b.views_count + b.favorites_count * 2) / Math.max(bRecency, 1)
          return bTrending - aTrending
        case 'distance':
          if (filters.coordinates) {
            const aDistance = calculateDistance(filters.coordinates, {
              lat: a.location_latitude || 0,
              lng: a.location_longitude || 0
            })
            const bDistance = calculateDistance(filters.coordinates, {
              lat: b.location_latitude || 0,
              lng: b.location_longitude || 0
            })
            return aDistance - bDistance
          }
          return 0
        case 'relevance':
        default:
          // Enhanced relevance scoring
          const aRelevance = calculateRelevanceScore(a, filters.query)
          const bRelevance = calculateRelevanceScore(b, filters.query)
          return bRelevance - aRelevance
      }
    })
  }

  const calculateDistance = (point1: { lat: number; lng: number }, point2: { lat: number; lng: number }) => {
    const R = 3959 // Earth's radius in miles
    const dLat = (point2.lat - point1.lat) * Math.PI / 180
    const dLon = (point2.lng - point1.lng) * Math.PI / 180
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(point1.lat * Math.PI / 180) * 
      Math.cos(point2.lat * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  const calculateRelevanceScore = (item: ItemWithDetails, query: string) => {
    let score = 0
    const lowerQuery = query.toLowerCase()
    
    // Title match (highest weight)
    if (item.title.toLowerCase().includes(lowerQuery)) {
      score += 10
      // Exact match bonus
      if (item.title.toLowerCase() === lowerQuery) {
        score += 5
      }
      // Start of title bonus
      if (item.title.toLowerCase().startsWith(lowerQuery)) {
        score += 3
      }
    }
    
    // Category match
    if (item.category?.name.toLowerCase().includes(lowerQuery)) {
      score += 5
    }
    
    // Description match
    if (item.description.toLowerCase().includes(lowerQuery)) {
      score += 2
    }
    
    // Quality indicators
    score += item.rating * 1.5
    score += Math.min(item.total_reviews * 0.1, 2)
    score += Math.min(item.views_count * 0.001, 1)
    
    // Recency bonus
    const daysSinceCreated = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated < 30) {
      score += 1
    }
    
    return score
  }

  const handleLocationSearch = async (locationQuery: string) => {
    if (!locationQuery.trim()) {
      setFilters(prev => ({ ...prev, location: '', coordinates: null }))
      return
    }

    try {
      const result = await locationService.geocodeAddress(locationQuery)
      setFilters(prev => ({
        ...prev,
        location: locationQuery,
        coordinates: result.coordinates
      }))
    } catch (err) {
      console.error('Location search failed:', err)
    }
  }

  const handlePriceRangeChange = (newRange: number[]) => {
    setPriceRange(newRange)
    setFilters(prev => ({
      ...prev,
      minPrice: newRange[0],
      maxPrice: newRange[1]
    }))
  }

  const clearFilters = () => {
    const clearedFilters: SearchFilters = {
      query: '',
      category: '',
      location: '',
      coordinates: null,
      radius: 25,
      minPrice: 0,
      maxPrice: 1000,
      minRating: 0,
      availability: 'all',
      deliveryAvailable: false,
      sortBy: 'relevance',
      itemCondition: 'all',
      rentalDuration: 'all',
      minDuration: 1,
      maxDuration: 30,
      instantBook: false,
      verifiedOwners: false,
      recentlyViewed: false
    }
    setFilters(clearedFilters)
    setPriceRange([0, 1000])
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  const getActiveFilterCount = () => {
    let count = 0
    if (filters.query) count++
    if (filters.category) count++
    if (filters.location) count++
    if (filters.minPrice > 0) count++
    if (filters.maxPrice < 1000) count++
    if (filters.minRating > 0) count++
    if (filters.availability !== 'all') count++
    if (filters.deliveryAvailable) count++
    if (filters.itemCondition !== 'all') count++
    if (filters.rentalDuration !== 'all') count++
    if (filters.minDuration > 1) count++
    if (filters.maxDuration < 30) count++
    if (filters.verifiedOwners) count++
    if (filters.instantBook) count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <div className={className}>
      {/* Search Header */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6">
          {/* Main Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Search for items..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                  showAdvanced || activeFilterCount > 0
                    ? 'bg-blue-100 border-blue-300 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showAdvanced && (
            <div className="border-t pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={filters.location}
                      onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                      onBlur={(e) => handleLocationSearch(e.target.value)}
                      placeholder="City, state, or zip code"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {filters.coordinates && (
                      <select
                        value={filters.radius}
                        onChange={(e) => setFilters(prev => ({ ...prev, radius: Number(e.target.value) }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value={5}>Within 5 miles</option>
                        <option value={10}>Within 10 miles</option>
                        <option value={25}>Within 25 miles</option>
                        <option value={50}>Within 50 miles</option>
                        <option value={100}>Within 100 miles</option>
                      </select>
                    )}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range (per day)
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={filters.minPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, minPrice: Number(e.target.value) }))}
                        placeholder="Min"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-500">to</span>
                      <input
                        type="number"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                        placeholder="Max"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="text-xs text-gray-600">
                      {formatPrice(filters.minPrice)} - {formatPrice(filters.maxPrice)}
                    </div>
                  </div>
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Rating
                  </label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0}>Any Rating</option>
                    <option value={1}>1+ Stars</option>
                    <option value={2}>2+ Stars</option>
                    <option value={3}>3+ Stars</option>
                    <option value={4}>4+ Stars</option>
                    <option value={5}>5 Stars Only</option>
                  </select>
                </div>

                {/* Availability */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Availability
                  </label>
                  <select
                    value={filters.availability}
                    onChange={(e) => setFilters(prev => ({ ...prev, availability: e.target.value as SearchFilters['availability'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Items</option>
                    <option value="available">Available Now</option>
                    <option value="unavailable">Currently Unavailable</option>
                  </select>
                </div>

                {/* Rental Duration */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rental Duration
                  </label>
                  <select
                    value={filters.rentalDuration}
                    onChange={(e) => setFilters(prev => ({ ...prev, rentalDuration: e.target.value as SearchFilters['rentalDuration'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Any Duration</option>
                    <option value="hourly">Hourly Rentals</option>
                    <option value="daily">Daily Rentals</option>
                    <option value="weekly">Weekly Rentals</option>
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as SearchFilters['sortBy'] }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="popular">Most Popular</option>
                    <option value="trending">Trending</option>
                    <option value="newest">Newest First</option>
                    {filters.coordinates && <option value="distance">Distance</option>}
                  </select>
                </div>
              </div>

              {/* Duration Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rental Duration (days)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={filters.minDuration}
                      onChange={(e) => setFilters(prev => ({ ...prev, minDuration: Number(e.target.value) }))}
                      placeholder="Min"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="number"
                      value={filters.maxDuration}
                      onChange={(e) => setFilters(prev => ({ ...prev, maxDuration: Number(e.target.value) }))}
                      placeholder="Max"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Options */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.deliveryAvailable}
                    onChange={(e) => setFilters(prev => ({ ...prev, deliveryAvailable: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Delivery Available</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.verifiedOwners}
                    onChange={(e) => setFilters(prev => ({ ...prev, verifiedOwners: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified Owners Only</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filters.instantBook}
                    onChange={(e) => setFilters(prev => ({ ...prev, instantBook: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Highly Rated Owners (4.5+)</span>
                </label>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-600">
                  {activeFilterCount > 0 && `${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''} applied`}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={clearFilters}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Clear All
                  </button>
                  <button
                    onClick={() => setShowAdvanced(false)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
                <div className="h-48 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 bg-red-50 rounded-lg">
            <p className="text-red-600 mb-2">{error}</p>
            <button
              onClick={searchItems}
              className="text-red-600 hover:text-red-800 font-medium"
            >
              Try again
            </button>
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-gray-900">
                {items.length} item{items.length !== 1 ? 's' : ''} found
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/items/${item.id}`}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="relative">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0].image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-medium text-gray-900 mb-2 truncate">
                      {item.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{item.category?.name}</p>
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {item.description}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          {formatPrice(item.daily_rate)}
                        </span>
                        <span className="text-sm text-gray-600">/day</span>
                      </div>
                      
                      {item.rating > 0 && (
                        <div className="flex items-center">
                          <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm text-gray-600">{item.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600 mb-4">
              Try adjusting your search criteria or browse all available items.
            </p>
            <button
              onClick={clearFilters}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  )
}