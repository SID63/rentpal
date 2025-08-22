import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateDistance,
  geocodeAddress,
  reverseGeocode,
  formatAddress,
  validateZipCode,
  getLocationFromCoordinates,
  isWithinRadius,
} from '../location'

// Mock the Google Maps API
const mockGeocoder = {
  geocode: vi.fn(),
}

const mockMaps = {
  Geocoder: vi.fn(() => mockGeocoder),
  GeocoderStatus: {
    OK: 'OK',
    ZERO_RESULTS: 'ZERO_RESULTS',
    OVER_QUERY_LIMIT: 'OVER_QUERY_LIMIT',
    REQUEST_DENIED: 'REQUEST_DENIED',
    INVALID_REQUEST: 'INVALID_REQUEST',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  },
}

// Mock global google object
global.google = {
  maps: mockMaps,
} as any

describe('Location Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateDistance', () => {
    it('calculates distance between two points correctly', () => {
      const point1 = { lat: 40.7128, lng: -74.0060 } // New York
      const point2 = { lat: 34.0522, lng: -118.2437 } // Los Angeles
      
      const distance = calculateDistance(point1, point2)
      
      // Distance between NYC and LA is approximately 2445 miles
      expect(distance).toBeCloseTo(2445, -1) // Within 10 miles
    })

    it('returns 0 for same coordinates', () => {
      const point = { lat: 40.7128, lng: -74.0060 }
      
      const distance = calculateDistance(point, point)
      
      expect(distance).toBe(0)
    })

    it('handles negative coordinates', () => {
      const point1 = { lat: -33.8688, lng: 151.2093 } // Sydney
      const point2 = { lat: 51.5074, lng: -0.1278 } // London
      
      const distance = calculateDistance(point1, point2)
      
      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeCloseTo(10562, -2) // Approximately 10,562 miles
    })
  })

  describe('geocodeAddress', () => {
    it('successfully geocodes a valid address', async () => {
      const mockResults = [
        {
          geometry: {
            location: {
              lat: () => 40.7128,
              lng: () => -74.0060,
            },
          },
          formatted_address: '123 Main St, New York, NY 10001, USA',
          address_components: [
            { types: ['street_number'], long_name: '123' },
            { types: ['route'], long_name: 'Main St' },
            { types: ['locality'], long_name: 'New York' },
            { types: ['administrative_area_level_1'], short_name: 'NY' },
            { types: ['postal_code'], long_name: '10001' },
          ],
        },
      ]

      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(mockResults, mockMaps.GeocoderStatus.OK)
      })

      const result = await geocodeAddress('123 Main St, New York, NY')

      expect(result).toEqual({
        lat: 40.7128,
        lng: -74.0060,
        formatted_address: '123 Main St, New York, NY 10001, USA',
        address_components: mockResults[0].address_components,
      })
    })

    it('handles geocoding failure', async () => {
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback([], mockMaps.GeocoderStatus.ZERO_RESULTS)
      })

      await expect(geocodeAddress('Invalid Address')).rejects.toThrow('No results found')
    })

    it('handles API errors', async () => {
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(null, mockMaps.GeocoderStatus.REQUEST_DENIED)
      })

      await expect(geocodeAddress('123 Main St')).rejects.toThrow('Geocoding failed')
    })
  })

  describe('reverseGeocode', () => {
    it('successfully reverse geocodes coordinates', async () => {
      const mockResults = [
        {
          formatted_address: '123 Main St, New York, NY 10001, USA',
          address_components: [
            { types: ['street_number'], long_name: '123' },
            { types: ['route'], long_name: 'Main St' },
            { types: ['locality'], long_name: 'New York' },
            { types: ['administrative_area_level_1'], short_name: 'NY' },
            { types: ['postal_code'], long_name: '10001' },
          ],
        },
      ]

      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback(mockResults, mockMaps.GeocoderStatus.OK)
      })

      const result = await reverseGeocode(40.7128, -74.0060)

      expect(result).toEqual({
        formatted_address: '123 Main St, New York, NY 10001, USA',
        address_components: mockResults[0].address_components,
      })
    })

    it('handles reverse geocoding failure', async () => {
      mockGeocoder.geocode.mockImplementation((request, callback) => {
        callback([], mockMaps.GeocoderStatus.ZERO_RESULTS)
      })

      await expect(reverseGeocode(0, 0)).rejects.toThrow('No address found')
    })
  })

  describe('formatAddress', () => {
    it('formats address components correctly', () => {
      const addressComponents = [
        { types: ['street_number'], long_name: '123' },
        { types: ['route'], long_name: 'Main St' },
        { types: ['locality'], long_name: 'New York' },
        { types: ['administrative_area_level_1'], short_name: 'NY' },
        { types: ['postal_code'], long_name: '10001' },
      ]

      const formatted = formatAddress(addressComponents)

      expect(formatted).toEqual({
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zipCode: '10001',
        fullAddress: '123 Main St, New York, NY 10001',
      })
    })

    it('handles missing components gracefully', () => {
      const addressComponents = [
        { types: ['locality'], long_name: 'New York' },
        { types: ['administrative_area_level_1'], short_name: 'NY' },
      ]

      const formatted = formatAddress(addressComponents)

      expect(formatted).toEqual({
        street: '',
        city: 'New York',
        state: 'NY',
        zipCode: '',
        fullAddress: 'New York, NY',
      })
    })
  })

  describe('validateZipCode', () => {
    it('validates US zip codes correctly', () => {
      expect(validateZipCode('12345')).toBe(true)
      expect(validateZipCode('12345-6789')).toBe(true)
      expect(validateZipCode('1234')).toBe(false)
      expect(validateZipCode('123456')).toBe(false)
      expect(validateZipCode('abcde')).toBe(false)
    })

    it('validates Canadian postal codes', () => {
      expect(validateZipCode('K1A 0A6', 'CA')).toBe(true)
      expect(validateZipCode('K1A0A6', 'CA')).toBe(true)
      expect(validateZipCode('12345', 'CA')).toBe(false)
    })
  })

  describe('getLocationFromCoordinates', () => {
    it('gets location from browser geolocation', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success) => {
          success({
            coords: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 10,
            },
          })
        }),
      }

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      })

      const location = await getLocationFromCoordinates()

      expect(location).toEqual({
        lat: 40.7128,
        lng: -74.0060,
        accuracy: 10,
      })
    })

    it('handles geolocation errors', async () => {
      const mockGeolocation = {
        getCurrentPosition: vi.fn((success, error) => {
          error({
            code: 1,
            message: 'User denied geolocation',
          })
        }),
      }

      Object.defineProperty(global.navigator, 'geolocation', {
        value: mockGeolocation,
        writable: true,
      })

      await expect(getLocationFromCoordinates()).rejects.toThrow('User denied geolocation')
    })
  })

  describe('isWithinRadius', () => {
    it('returns true when point is within radius', () => {
      const center = { lat: 40.7128, lng: -74.0060 }
      const point = { lat: 40.7589, lng: -73.9851 } // About 5 miles away
      
      expect(isWithinRadius(center, point, 10)).toBe(true)
      expect(isWithinRadius(center, point, 3)).toBe(false)
    })

    it('returns true for same coordinates', () => {
      const point = { lat: 40.7128, lng: -74.0060 }
      
      expect(isWithinRadius(point, point, 1)).toBe(true)
    })

    it('handles edge cases', () => {
      const center = { lat: 0, lng: 0 }
      const point = { lat: 0, lng: 0 }
      
      expect(isWithinRadius(center, point, 0)).toBe(true)
    })
  })
})