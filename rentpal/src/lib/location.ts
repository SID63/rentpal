// Location services for RentPal
// Using browser geolocation and a geocoding service

export interface Coordinates {
  latitude: number
  longitude: number
}

export interface Address {
  street: string
  city: string
  state: string
  zipCode: string
  country?: string
  formatted?: string
}

export interface LocationResult {
  address: Address
  coordinates: Coordinates
  placeId?: string
}

export interface LocationBounds {
  northeast: Coordinates
  southwest: Coordinates
}

interface NominatimResult {
  lat: string
  lon: string
  display_name: string
  address?: {
    house_number?: string
    road?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
  }
}

export class LocationService {
  private static instance: LocationService
  private geocoder: google.maps.Geocoder | null = null
  private placesService: google.maps.places.PlacesService | null = null

  private constructor() {
    // Initialize Google Maps services when available
    if (typeof window !== 'undefined' && window.google?.maps) {
      this.initializeServices()
    }
  }

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService()
    }
    return LocationService.instance
  }

  private initializeServices() {
    if (window.google?.maps) {
      this.geocoder = new google.maps.Geocoder()
      // Create a dummy div for PlacesService (required by Google Maps API)
      const dummyDiv = document.createElement('div')
      this.placesService = new google.maps.places.PlacesService(dummyDiv)
    }
  }

  // Get user's current location
  async getCurrentLocation(): Promise<Coordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        },
        (error) => {
          reject(new Error(`Geolocation error: ${error.message}`))
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }

  // Geocode an address to get coordinates
  async geocodeAddress(address: string): Promise<LocationResult> {
    // If Google Maps is not available, use a fallback service
    if (!this.geocoder) {
      return this.fallbackGeocode(address)
    }

    return new Promise((resolve, reject) => {
      this.geocoder!.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const result = results[0]
          const location = result.geometry.location
          
          resolve({
            address: this.parseGoogleAddress(result),
            coordinates: {
              latitude: location.lat(),
              longitude: location.lng()
            },
            placeId: result.place_id
          })
        } else {
          reject(new Error(`Geocoding failed: ${status}`))
        }
      })
    })
  }

  // Reverse geocode coordinates to get address
  async reverseGeocode(coordinates: Coordinates): Promise<LocationResult> {
    if (!this.geocoder) {
      return this.fallbackReverseGeocode(coordinates)
    }

    return new Promise((resolve, reject) => {
      const latLng = new google.maps.LatLng(coordinates.latitude, coordinates.longitude)
      
      this.geocoder!.geocode({ location: latLng }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const result = results[0]
          
          resolve({
            address: this.parseGoogleAddress(result),
            coordinates,
            placeId: result.place_id
          })
        } else {
          reject(new Error(`Reverse geocoding failed: ${status}`))
        }
      })
    })
  }

  // Calculate distance between two coordinates (in miles)
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 3959 // Earth's radius in miles
    const dLat = this.toRadians(coord2.latitude - coord1.latitude)
    const dLon = this.toRadians(coord2.longitude - coord1.longitude)
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.latitude)) * 
      Math.cos(this.toRadians(coord2.latitude)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Get bounds for a given center and radius
  getBounds(center: Coordinates, radiusMiles: number): LocationBounds {
    const lat = center.latitude
    const lng = center.longitude
    
    // Approximate degrees per mile
    const latDegreePerMile = 1 / 69
    const lngDegreePerMile = 1 / (69 * Math.cos(this.toRadians(lat)))
    
    const latOffset = radiusMiles * latDegreePerMile
    const lngOffset = radiusMiles * lngDegreePerMile
    
    return {
      northeast: {
        latitude: lat + latOffset,
        longitude: lng + lngOffset
      },
      southwest: {
        latitude: lat - latOffset,
        longitude: lng - lngOffset
      }
    }
  }

  // Validate address format
  validateAddress(address: Address): boolean {
    return !!(
      address.street &&
      address.city &&
      address.state &&
      address.zipCode &&
      address.street.trim().length > 0 &&
      address.city.trim().length > 0 &&
      address.state.trim().length >= 2 &&
      /^\d{5}(-\d{4})?$/.test(address.zipCode.trim())
    )
  }

  // Format address for display
  formatAddress(address: Address): string {
    if (address.formatted) {
      return address.formatted
    }
    
    return `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`
  }

  private parseGoogleAddress(result: google.maps.GeocoderResult): Address {
    const components = result.address_components
    let street = ''
    let city = ''
    let state = ''
    let zipCode = ''
    let country = ''

    components.forEach(component => {
      const types = component.types
      
      if (types.includes('street_number')) {
        street = component.long_name + ' '
      } else if (types.includes('route')) {
        street += component.long_name
      } else if (types.includes('locality')) {
        city = component.long_name
      } else if (types.includes('administrative_area_level_1')) {
        state = component.short_name
      } else if (types.includes('postal_code')) {
        zipCode = component.long_name
      } else if (types.includes('country')) {
        country = component.long_name
      }
    })

    return {
      street: street.trim(),
      city,
      state,
      zipCode,
      country,
      formatted: result.formatted_address
    }
  }

  // Fallback geocoding using a free service (for development/testing)
  private async fallbackGeocode(address: string): Promise<LocationResult> {
    try {
      // Using Nominatim (OpenStreetMap) as fallback
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      )
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable')
      }
      
      const data = await response.json() as NominatimResult[]
      
      if (data.length === 0) {
        throw new Error('Address not found')
      }
      
      const result = data[0]
      
      return {
        address: this.parseFallbackAddress(result),
        coordinates: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        }
      }
    } catch (error) {
      throw new Error(`Fallback geocoding failed: ${error}`)
    }
  }

  private async fallbackReverseGeocode(coordinates: Coordinates): Promise<LocationResult> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}`
      )
      
      if (!response.ok) {
        throw new Error('Reverse geocoding service unavailable')
      }
      
      const data = await response.json() as NominatimResult
      
      return {
        address: this.parseFallbackAddress(data),
        coordinates
      }
    } catch (error) {
      throw new Error(`Fallback reverse geocoding failed: ${error}`)
    }
  }

  private parseFallbackAddress(result: NominatimResult): Address {
    const addr = result.address || {}
    
    return {
      street: `${addr.house_number || ''} ${addr.road || ''}`.trim(),
      city: addr.city || addr.town || addr.village || '',
      state: addr.state || '',
      zipCode: addr.postcode || '',
      country: addr.country || '',
      formatted: result.display_name
    }
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180)
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance()

// Utility functions
export const formatDistance = (miles: number): string => {
  if (miles < 1) {
    return `${(miles * 5280).toFixed(0)} ft`
  } else if (miles < 10) {
    return `${miles.toFixed(1)} mi`
  } else {
    return `${Math.round(miles)} mi`
  }
}

export const isWithinRadius = (
  center: Coordinates,
  point: Coordinates,
  radiusMiles: number
): boolean => {
  const distance = locationService.calculateDistance(center, point)
  return distance <= radiusMiles
}