'use client'

import { useState, useEffect } from 'react'
import { locationService, Coordinates, formatDistance } from '@/lib/location'
import { ItemWithDetails } from '@/types/database'
import { itemService } from '@/lib/database'
import MapContainer, { MapMarker } from './MapContainer'
import Link from 'next/link'

interface LocationSearchProps {
  initialLocation?: Coordinates
  initialRadius?: number
  onLocationChange?: (location: Coordinates, radius: number) => void
  className?: string
}

interface SearchFilters {
  location: Coordinates | null
  radius: number // in miles
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy: 'distance' | 'price' | 'rating' | 'newest'
}

export default function LocationSearch({
  initialLocation,
  initialRadius = 10,
  onLocationChange,
  className = ""
}: LocationSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    location: initialLocation || null,
    radius: initialRadius,
    sortBy: 'distance'
  })
  const [items, setItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [selectedItem, setSelectedItem] = useState<ItemWithDetails | null>(null)
  const [locationQuery, setLocationQuery] = useState('')

  useEffect(() => {
    if (filters.location) {
      searchItems()
    }
  }, [filters])

  const searchItems = async () => {
    if (!filters.location) return

    setLoading(true)
    setError(null)

    try {
      // Get all items (in a real app, you'd have location-based filtering in the backend)
      const allItems = await itemService.getItems({
        category: filters.category,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice
      })

      // Filter by location and calculate distances
      const itemsWithDistance = allItems
        .map(item => {
          if (!item.location_latitude || !item.location_longitude) {
            return null
          }

          const distance = locationService.calculateDistance(
            filters.location!,
            {
              latitude: item.location_latitude,
              longitude: item.location_longitude
            }
          )

          return {
            ...item,
            distance
          }
        })
        .filter((item): item is ItemWithDetails & { distance: number } => 
          item !== null && item.distance <= filters.radius
        )

      // Sort items
      const sortedItems = itemsWithDistance.sort((a, b) => {
        switch (filters.sortBy) {
          case 'distance':
            return a.distance - b.distance
          case 'price':
            return a.daily_rate - b.daily_rate
          case 'rating':
            return b.rating - a.rating
          case 'newest':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          default:
            return 0
        }
      })

      setItems(sortedItems)
    } catch (err) {
      setError('Failed to search items')
      console.error('Search error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLocationSearch = async (query: string) => {
    if (!query.trim()) return

    try {
      const result = await locationService.geocodeAddress(query)
      setFilters(prev => ({ ...prev, location: result.coordinates }))
      onLocationChange?.(result.coordinates, filters.radius)
    } catch (err) {
      setError('Location not found')
    }
  }

  const handleCurrentLocation = async () => {
    try {
      const coordinates = await locationService.getCurrentLocation()
      setFilters(prev => ({ ...prev, location: coordinates }))
      onLocationChange?.(coordinates, filters.radius)
    } catch (err) {
      setError('Unable to get your location')
    }
  }

  const handleMapClick = (coordinates: Coordinates) => {
    setFilters(prev => ({ ...prev, location: coordinates }))
    onLocationChange?.(coordinates, filters.radius)
  }

  const handleRadiusChange = (radius: number) => {
    setFilters(prev => ({ ...prev, radius }))
    if (filters.location) {
      onLocationChange?.(filters.location, radius)
    }
  }

  const getMapMarkers = (): MapMarker[] => {
    const markers: MapMarker[] = []

    // Add center location marker
    if (filters.location) {
      markers.push({
        id: 'center',
        position: filters.location,
        title: 'Search Center',
        icon: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#3B82F6" stroke="#ffffff" stroke-width="3"/>
            <circle cx="16" cy="16" r="4" fill="#ffffff"/>
          </svg>
        `)
      })
    }

    // Add item markers
    items.forEach(item => {
      if (item.location_latitude && item.location_longitude) {
        markers.push({
          id: item.id,
          position: {
            latitude: item.location_latitude,
            longitude: item.location_longitude
          },
          title: item.title,
          description: `$${item.daily_rate}/day • ${formatDistance((item as any).distance)}`,
          onClick: () => setSelectedItem(item)
        })
      }
    })

    return markers
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  return (
    <div className={className}>
      {/* Search Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Find Items Near You</h2>
        
        {/* Location Input */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="flex">
              <input
                type="text"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch(locationQuery)}
                placeholder="Enter city, address, or zip code"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => handleLocationSearch(locationQuery)}
                className="px-4 py-2 bg-blue-600 text-white border border-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Search
              </button>
              <button
                onClick={handleCurrentLocation}
                className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Use current location"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Radius:</label>
            <select
              value={filters.radius}
              onChange={(e) => handleRadiusChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5 miles</option>
              <option value={10}>10 miles</option>
              <option value={25}>25 miles</option>
              <option value={50}>50 miles</option>
              <option value={100}>100 miles</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="distance">Distance</option>
              <option value="price">Price</option>
              <option value="rating">Rating</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          <button
            onClick={() => setShowMap(!showMap)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Map */}
      {showMap && filters.location && (
        <div className="mb-6">
          <MapContainer
            center={filters.location}
            zoom={12}
            markers={getMapMarkers()}
            onMapClick={handleMapClick}
            height="400px"
            showUserLocation={true}
            className="rounded-lg border border-gray-300"
          />
        </div>
      )}

      {/* Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-lg shadow p-6">
                  <div className="flex space-x-4">
                    <div className="w-24 h-24 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {items.length} item{items.length !== 1 ? 's' : ''} found
                </h3>
                {filters.location && (
                  <p className="text-sm text-gray-600">
                    Within {filters.radius} miles
                  </p>
                )}
              </div>

              {items.map((item) => (
                <div
                  key={item.id}
                  className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 cursor-pointer ${
                    selectedItem?.id === item.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <div className="flex space-x-4">
                    <div className="flex-shrink-0">
                      {item.images && item.images.length > 0 ? (
                        <img
                          src={item.images[0].image_url}
                          alt={item.title}
                          className="w-24 h-24 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-medium text-gray-900 truncate">
                            {item.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {item.category?.name}
                          </p>
                          <div className="flex items-center mt-2 space-x-4 text-sm text-gray-600">
                            <span>{formatDistance((item as any).distance)}</span>
                            <span>•</span>
                            <span>{item.location_city}, {item.location_state}</span>
                            {item.rating > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex items-center">
                                  <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span>{item.rating.toFixed(1)}</span>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {formatPrice(item.daily_rate)}
                          </div>
                          <div className="text-sm text-gray-600">per day</div>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <Link
                          href={`/items/${item.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                        >
                          View Details →
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filters.location ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">
                Try expanding your search radius or searching in a different area.
              </p>
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Search for items near you</h3>
              <p className="text-gray-600">
                Enter a location above to find rental items in your area.
              </p>
            </div>
          )}
        </div>

        {/* Selected Item Details */}
        {selectedItem && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Selected Item</h3>
              
              {selectedItem.images && selectedItem.images.length > 0 && (
                <img
                  src={selectedItem.images[0].image_url}
                  alt={selectedItem.title}
                  className="w-full h-48 rounded-lg object-cover mb-4"
                />
              )}
              
              <h4 className="font-medium text-gray-900 mb-2">{selectedItem.title}</h4>
              <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                {selectedItem.description}
              </p>
              
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Distance:</span>
                  <span>{formatDistance((selectedItem as any).distance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Daily Rate:</span>
                  <span className="font-medium">{formatPrice(selectedItem.daily_rate)}</span>
                </div>
                {selectedItem.hourly_rate && (
                  <div className="flex justify-between">
                    <span>Hourly Rate:</span>
                    <span className="font-medium">{formatPrice(selectedItem.hourly_rate)}</span>
                  </div>
                )}
              </div>
              
              <Link
                href={`/items/${selectedItem.id}`}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-center block"
              >
                View Full Details
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}