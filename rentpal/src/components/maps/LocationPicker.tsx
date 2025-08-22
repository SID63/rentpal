'use client'

import { useState, useEffect, useRef } from 'react'
import { locationService, Coordinates, Address, LocationResult } from '@/lib/location'
import MapContainer, { MapMarker } from './MapContainer'

interface LocationPickerProps {
  initialAddress?: string
  initialCoordinates?: Coordinates
  onLocationSelect: (location: LocationResult) => void
  onAddressChange?: (address: string) => void
  placeholder?: string
  showMap?: boolean
  mapHeight?: string
  className?: string
  required?: boolean
  error?: string
}

export default function LocationPicker({
  initialAddress = '',
  initialCoordinates,
  onLocationSelect,
  onAddressChange,
  placeholder = 'Enter address...',
  showMap = true,
  mapHeight = '300px',
  className = '',
  required = false,
  error
}: LocationPickerProps) {
  const [address, setAddress] = useState(initialAddress)
  const [coordinates, setCoordinates] = useState<Coordinates | null>(initialCoordinates || null)
  const [suggestions, setSuggestions] = useState<LocationResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isGeocoding, setIsGeocoding] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Handle clicks outside to close suggestions
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleAddressChange = (value: string) => {
    setAddress(value)
    setValidationError(null)
    onAddressChange?.(value)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce geocoding requests
    if (value.trim().length > 3) {
      debounceRef.current = setTimeout(() => {
        geocodeAddress(value)
      }, 500)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const geocodeAddress = async (addressQuery: string) => {
    if (!addressQuery.trim()) return

    setIsLoading(true)
    try {
      const result = await locationService.geocodeAddress(addressQuery)
      setSuggestions([result])
      setShowSuggestions(true)
    } catch (err) {
      console.error('Geocoding error:', err)
      setSuggestions([])
      setShowSuggestions(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionSelect = (suggestion: LocationResult) => {
    setAddress(locationService.formatAddress(suggestion.address))
    setCoordinates(suggestion.coordinates)
    setShowSuggestions(false)
    setValidationError(null)
    onLocationSelect(suggestion)
  }

  const handleMapClick = async (clickedCoordinates: Coordinates) => {
    setIsGeocoding(true)
    try {
      const result = await locationService.reverseGeocode(clickedCoordinates)
      setAddress(locationService.formatAddress(result.address))
      setCoordinates(clickedCoordinates)
      onLocationSelect(result)
    } catch (err) {
      console.error('Reverse geocoding error:', err)
      setValidationError('Unable to get address for this location')
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleUseCurrentLocation = async () => {
    setIsLoading(true)
    try {
      const currentCoords = await locationService.getCurrentLocation()
      const result = await locationService.reverseGeocode(currentCoords)
      
      setAddress(locationService.formatAddress(result.address))
      setCoordinates(currentCoords)
      onLocationSelect(result)
    } catch (err) {
      console.error('Current location error:', err)
      setValidationError('Unable to get your current location')
    } finally {
      setIsLoading(false)
    }
  }

  const validateAddress = () => {
    if (required && !address.trim()) {
      setValidationError('Address is required')
      return false
    }

    if (address.trim() && !coordinates) {
      setValidationError('Please select a valid address from the suggestions')
      return false
    }

    return true
  }

  const handleBlur = () => {
    // Delay validation to allow for suggestion selection
    setTimeout(() => {
      validateAddress()
    }, 200)
  }

  const mapMarkers: MapMarker[] = coordinates ? [{
    id: 'selected-location',
    position: coordinates,
    title: 'Selected Location',
    description: address
  }] : []

  return (
    <div className={className}>
      {/* Address Input */}
      <div className="relative">
        <div className="flex">
          <input
            ref={inputRef}
            type="text"
            value={address}
            onChange={(e) => handleAddressChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            onBlur={handleBlur}
            placeholder={placeholder}
            className={`flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              error || validationError ? 'border-red-300' : 'border-gray-300'
            }`}
            disabled={isLoading || isGeocoding}
          />
          
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLoading || isGeocoding}
            className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Use current location"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
        </div>

        {/* Loading indicator */}
        {(isLoading || isGeocoding) && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSuggestionSelect(suggestion)}
                className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
              >
                <div className="font-medium text-gray-900">
                  {locationService.formatAddress(suggestion.address)}
                </div>
                {suggestion.address.formatted && suggestion.address.formatted !== locationService.formatAddress(suggestion.address) && (
                  <div className="text-sm text-gray-600">
                    {suggestion.address.formatted}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error message */}
      {(error || validationError) && (
        <p className="mt-1 text-sm text-red-600">
          {error || validationError}
        </p>
      )}

      {/* Map */}
      {showMap && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Location on Map
            </label>
            {isGeocoding && (
              <span className="text-xs text-gray-500">Getting address...</span>
            )}
          </div>
          
          <MapContainer
            center={coordinates || { latitude: 39.8283, longitude: -98.5795 }} // Center of US as default
            zoom={coordinates ? 15 : 4}
            markers={mapMarkers}
            onMapClick={handleMapClick}
            height={mapHeight}
            showUserLocation={true}
            className="border border-gray-300 rounded-md"
          />
          
          <p className="mt-2 text-xs text-gray-600">
            Click on the map to select a location, or use the address field above.
          </p>
        </div>
      )}

      {/* Selected coordinates display (for debugging) */}
      {coordinates && process.env.NODE_ENV === 'development' && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Coordinates:</strong> {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
        </div>
      )}
    </div>
  )
}