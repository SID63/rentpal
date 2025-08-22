// Custom hooks for location functionality
import { useState, useEffect, useCallback } from 'react'
import { locationService, Coordinates, LocationResult } from '@/lib/location'
import { itemService } from '@/lib/database'
import { ItemWithDetails } from '@/types/database'

export function useCurrentLocation() {
  const [location, setLocation] = useState<Coordinates | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getCurrentLocation = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const coordinates = await locationService.getCurrentLocation()
      setLocation(coordinates)
      return coordinates
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get location'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    location,
    loading,
    error,
    getCurrentLocation
  }
}

export function useGeocoding() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const geocodeAddress = useCallback(async (address: string): Promise<LocationResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const result = await locationService.geocodeAddress(address)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Geocoding failed'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const reverseGeocode = useCallback(async (coordinates: Coordinates): Promise<LocationResult | null> => {
    setLoading(true)
    setError(null)

    try {
      const result = await locationService.reverseGeocode(coordinates)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reverse geocoding failed'
      setError(errorMessage)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    geocodeAddress,
    reverseGeocode
  }
}

export function useLocationSearch() {
  const [items, setItems] = useState<(ItemWithDetails & { distance: number })[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchNearLocation = useCallback(async (
    coordinates: Coordinates,
    radius: number = 25,
    filters?: {
      category?: string
      minPrice?: number
      maxPrice?: number
      limit?: number
    }
  ) => {
    setLoading(true)
    setError(null)

    try {
      const results = await itemService.getItemsNearLocation(
        coordinates,
        radius,
        filters?.limit || 50
      )

      // Apply additional filters
      let filteredResults = results as (ItemWithDetails & { distance: number })[]

      if (filters?.category) {
        filteredResults = filteredResults.filter(item => item.category_id === filters.category)
      }

      if (filters?.minPrice) {
        filteredResults = filteredResults.filter(item => item.daily_rate >= filters.minPrice!)
      }

      if (filters?.maxPrice) {
        filteredResults = filteredResults.filter(item => item.daily_rate <= filters.maxPrice!)
      }

      setItems(filteredResults)
      return filteredResults
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Location search failed'
      setError(errorMessage)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const clearResults = useCallback(() => {
    setItems([])
    setError(null)
  }, [])

  return {
    items,
    loading,
    error,
    searchNearLocation,
    clearResults
  }
}

export function useDistanceCalculation() {
  const calculateDistance = useCallback((coord1: Coordinates, coord2: Coordinates): number => {
    return locationService.calculateDistance(coord1, coord2)
  }, [])

  const isWithinRadius = useCallback((
    center: Coordinates,
    point: Coordinates,
    radiusMiles: number
  ): boolean => {
    const distance = calculateDistance(center, point)
    return distance <= radiusMiles
  }, [calculateDistance])

  const getBounds = useCallback((center: Coordinates, radiusMiles: number) => {
    return locationService.getBounds(center, radiusMiles)
  }, [])

  return {
    calculateDistance,
    isWithinRadius,
    getBounds
  }
}

export function useAddressValidation() {
  const [isValidating, setIsValidating] = useState(false)

  const validateAddress = useCallback(async (address: string): Promise<{
    isValid: boolean
    suggestion?: LocationResult
    error?: string
  }> => {
    if (!address.trim()) {
      return { isValid: false, error: 'Address is required' }
    }

    setIsValidating(true)

    try {
      const result = await locationService.geocodeAddress(address)
      
      // Check if the geocoded result is reasonably close to the input
      const isValid = locationService.validateAddress(result.address)
      
      return {
        isValid,
        suggestion: result
      }
    } catch (err) {
      return {
        isValid: false,
        error: err instanceof Error ? err.message : 'Address validation failed'
      }
    } finally {
      setIsValidating(false)
    }
  }, [])

  return {
    isValidating,
    validateAddress
  }
}

// Hook for managing user's saved locations
export function useSavedLocations() {
  const [savedLocations, setSavedLocations] = useState<LocationResult[]>([])

  useEffect(() => {
    // Load saved locations from localStorage
    const saved = localStorage.getItem('rentpal_saved_locations')
    if (saved) {
      try {
        setSavedLocations(JSON.parse(saved))
      } catch (err) {
        console.error('Failed to load saved locations:', err)
      }
    }
  }, [])

  const saveLocation = useCallback((location: LocationResult, name?: string) => {
    const locationToSave = {
      ...location,
      name: name || locationService.formatAddress(location.address)
    }

    const updated = [...savedLocations, locationToSave]
    setSavedLocations(updated)
    localStorage.setItem('rentpal_saved_locations', JSON.stringify(updated))
  }, [savedLocations])

  const removeLocation = useCallback((index: number) => {
    const updated = savedLocations.filter((_, i) => i !== index)
    setSavedLocations(updated)
    localStorage.setItem('rentpal_saved_locations', JSON.stringify(updated))
  }, [savedLocations])

  const clearAllLocations = useCallback(() => {
    setSavedLocations([])
    localStorage.removeItem('rentpal_saved_locations')
  }, [])

  return {
    savedLocations,
    saveLocation,
    removeLocation,
    clearAllLocations
  }
}