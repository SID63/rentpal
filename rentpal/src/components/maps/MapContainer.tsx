'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Coordinates } from '@/lib/location'

export interface MapMarker {
  id: string
  position: Coordinates
  title: string
  description?: string
  icon?: string
  onClick?: () => void
}

interface MapContainerProps {
  center: Coordinates
  zoom?: number
  markers?: MapMarker[]
  onMapClick?: (coordinates: Coordinates) => void
  onMarkerClick?: (marker: MapMarker) => void
  height?: string
  width?: string
  className?: string
  showUserLocation?: boolean
  interactive?: boolean
}

export default function MapContainer({
  center,
  zoom = 12,
  markers = [],
  onMapClick,
  onMarkerClick,
  height = '400px',
  width = '100%',
  className = '',
  showUserLocation = false,
  interactive = true
}: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [mapMarkers, setMapMarkers] = useState<google.maps.Marker[]>([])
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.Marker | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize map when Google Maps is loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.maps && mapRef.current) {
      initializeMap()
    } else {
      // Load Google Maps script if not available
      loadGoogleMapsScript()
    }
  }, [initializeMap])

  // Update map center when center prop changes
  useEffect(() => {
    if (map) {
      map.setCenter(center)
    }
  }, [map, center])

  // Update markers when markers prop changes
  useEffect(() => {
    if (map) {
      updateMarkers()
    }
  }, [map, updateMarkers])

  // Show user location if requested
  useEffect(() => {
    if (map && showUserLocation) {
      showCurrentLocation()
    }
  }, [map, showUserLocation, showCurrentLocation])

  const loadGoogleMapsScript = () => {
    // For development, we'll use a fallback map
    // In production, you would load the actual Google Maps script
    console.log('Google Maps not available, using fallback')
    setError('Google Maps not available. Using fallback map.')
    setIsLoaded(true)
  }

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return

    try {
      const mapOptions: google.maps.MapOptions = {
        center,
        zoom,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: !interactive,
        gestureHandling: interactive ? 'auto' : 'none',
        zoomControl: interactive,
        mapTypeControl: false,
        scaleControl: true,
        streetViewControl: interactive,
        rotateControl: false,
        fullscreenControl: interactive
      }

      const newMap = new google.maps.Map(mapRef.current, mapOptions)

      if (onMapClick) {
        newMap.addListener('click', (event: google.maps.MapMouseEvent) => {
          if (event.latLng) {
            onMapClick({
              latitude: event.latLng.lat(),
              longitude: event.latLng.lng()
            })
          }
        })
      }

      setMap(newMap)
      setIsLoaded(true)
    } catch (err) {
      setError('Failed to initialize map')
      console.error('Map initialization error:', err)
    }
  }, [center, zoom, interactive, onMapClick])

  const updateMarkers = useCallback(() => {
    if (!map) return

    // Clear existing markers
    mapMarkers.forEach(marker => marker.setMap(null))
    setMapMarkers([])

    // Add new markers
    const newMarkers = markers.map(markerData => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        icon: markerData.icon
      })

      // Add click listener
      marker.addListener('click', () => {
        if (onMarkerClick) {
          onMarkerClick(markerData)
        }
        if (markerData.onClick) {
          markerData.onClick()
        }
      })

      // Add info window if description exists
      if (markerData.description) {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${markerData.title}</h3>
              <p style="margin: 0; font-size: 12px; color: #666;">${markerData.description}</p>
            </div>
          `
        })

        marker.addListener('click', () => {
          infoWindow.open(map, marker)
        })
      }

      return marker
    })

    setMapMarkers(newMarkers)
  }, [map, markers, onMarkerClick])

  const showCurrentLocation = useCallback(async () => {
    if (!map) return

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject)
      })

      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      }

      // Remove existing user location marker
      if (userLocationMarker) {
        userLocationMarker.setMap(null)
      }

      // Add user location marker
      const marker = new google.maps.Marker({
        position: userLocation,
        map,
        title: 'Your Location',
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="8" fill="#4285F4" stroke="#ffffff" stroke-width="2"/>
              <circle cx="12" cy="12" r="3" fill="#ffffff"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(24, 24),
          anchor: new google.maps.Point(12, 12)
        }
      })

      setUserLocationMarker(marker)
    } catch (err) {
      console.error('Failed to get user location:', err)
    }
  }, [map])

  // Fallback map component when Google Maps is not available
  const FallbackMap = () => (
    <div 
      className="bg-gray-200 flex items-center justify-center text-gray-600 relative overflow-hidden"
      style={{ height, width }}
    >
      {/* Simple grid pattern to simulate a map */}
      <div className="absolute inset-0 opacity-20">
        <svg width="100%" height="100%" className="text-gray-400">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Center marker */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg"></div>
      </div>
      
      {/* Marker indicators */}
      {markers.slice(0, 5).map((marker, index) => (
        <div
          key={marker.id}
          className="absolute w-4 h-4 bg-blue-500 rounded-full border border-white shadow cursor-pointer"
          style={{
            top: `${30 + (index * 10)}%`,
            left: `${40 + (index * 15)}%`
          }}
          onClick={() => onMarkerClick?.(marker)}
          title={marker.title}
        />
      ))}
      
      <div className="text-center">
        <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">Map View</p>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>
    </div>
  )

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && !error && (
        <div 
          className="bg-gray-100 flex items-center justify-center"
          style={{ height, width }}
        >
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map...</p>
          </div>
        </div>
      )}
      
      {error || !window.google?.maps ? (
        <FallbackMap />
      ) : (
        <div
          ref={mapRef}
          style={{ height, width }}
          className="rounded-lg overflow-hidden"
        />
      )}
      
      {/* Map controls overlay */}
      {interactive && (
        <div className="absolute top-2 right-2 flex flex-col space-y-2">
          {showUserLocation && (
            <button
              onClick={showCurrentLocation}
              className="bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors"
              title="Show my location"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  )
}