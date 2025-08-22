'use client'

import { useState } from 'react'
import { locationService, Coordinates, formatDistance } from '@/lib/location'
import LocationPicker from './LocationPicker'

interface DistanceCalculatorProps {
  className?: string
}

export default function DistanceCalculator({ className = "" }: DistanceCalculatorProps) {
  const [startLocation, setStartLocation] = useState<Coordinates | null>(null)
  const [endLocation, setEndLocation] = useState<Coordinates | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')

  const calculateDistance = () => {
    if (startLocation && endLocation) {
      const calculatedDistance = locationService.calculateDistance(startLocation, endLocation)
      setDistance(calculatedDistance)
    }
  }

  const handleStartLocationSelect = (location: any) => {
    setStartLocation(location.coordinates)
    setStartAddress(locationService.formatAddress(location.address))
    
    // Auto-calculate if both locations are set
    if (endLocation) {
      const calculatedDistance = locationService.calculateDistance(location.coordinates, endLocation)
      setDistance(calculatedDistance)
    }
  }

  const handleEndLocationSelect = (location: any) => {
    setEndLocation(location.coordinates)
    setEndAddress(locationService.formatAddress(location.address))
    
    // Auto-calculate if both locations are set
    if (startLocation) {
      const calculatedDistance = locationService.calculateDistance(startLocation, location.coordinates)
      setDistance(calculatedDistance)
    }
  }

  const clearAll = () => {
    setStartLocation(null)
    setEndLocation(null)
    setDistance(null)
    setStartAddress('')
    setEndAddress('')
  }

  const getMapCenter = (): Coordinates => {
    if (startLocation && endLocation) {
      return {
        latitude: (startLocation.latitude + endLocation.latitude) / 2,
        longitude: (startLocation.longitude + endLocation.longitude) / 2
      }
    }
    return startLocation || endLocation || { latitude: 39.8283, longitude: -98.5795 }
  }

  const getMapMarkers = () => {
    const markers = []
    
    if (startLocation) {
      markers.push({
        id: 'start',
        position: startLocation,
        title: 'Start Location',
        description: startAddress,
        icon: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#10B981" stroke="#ffffff" stroke-width="3"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">A</text>
          </svg>
        `)
      })
    }
    
    if (endLocation) {
      markers.push({
        id: 'end',
        position: endLocation,
        title: 'End Location',
        description: endAddress,
        icon: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="12" fill="#EF4444" stroke="#ffffff" stroke-width="3"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">B</text>
          </svg>
        `)
      })
    }
    
    return markers
  }

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Distance Calculator</h2>
          <p className="text-gray-600">Calculate the distance between two locations</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Start Location */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2">
                A
              </div>
              Start Location
            </h3>
            <LocationPicker
              placeholder="Enter starting address..."
              onLocationSelect={handleStartLocationSelect}
              showMap={false}
            />
          </div>

          {/* End Location */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-2">
                B
              </div>
              End Location
            </h3>
            <LocationPicker
              placeholder="Enter destination address..."
              onLocationSelect={handleEndLocationSelect}
              showMap={false}
            />
          </div>
        </div>

        {/* Distance Result */}
        {distance !== null && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Distance</h3>
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {formatDistance(distance)}
              </div>
              <p className="text-blue-800 text-sm">
                Straight-line distance between the two locations
              </p>
            </div>
            
            {/* Additional Information */}
            <div className="mt-4 pt-4 border-t border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-medium text-blue-900">Miles</div>
                  <div className="text-blue-700">{distance.toFixed(2)} mi</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">Kilometers</div>
                  <div className="text-blue-700">{(distance * 1.60934).toFixed(2)} km</div>
                </div>
                <div>
                  <div className="font-medium text-blue-900">Feet</div>
                  <div className="text-blue-700">{Math.round(distance * 5280).toLocaleString()} ft</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map */}
        {(startLocation || endLocation) && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Map View</h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="h-96">
                {/* Map would go here - using placeholder for now */}
                <div className="w-full h-full bg-gray-200 flex items-center justify-center relative">
                  <div className="text-center">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <p className="text-gray-600">Map showing route between locations</p>
                  </div>
                  
                  {/* Mock markers */}
                  {startLocation && (
                    <div className="absolute top-1/4 left-1/4 w-6 h-6 bg-green-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                      A
                    </div>
                  )}
                  {endLocation && (
                    <div className="absolute top-3/4 right-1/4 w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-xs font-bold">
                      B
                    </div>
                  )}
                  
                  {/* Mock route line */}
                  {startLocation && endLocation && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none">
                      <line
                        x1="25%"
                        y1="25%"
                        x2="75%"
                        y2="75%"
                        stroke="#3B82F6"
                        strokeWidth="3"
                        strokeDasharray="5,5"
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={calculateDistance}
            disabled={!startLocation || !endLocation}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Calculate Distance
          </button>
          
          <button
            onClick={clearAll}
            className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Clear All
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Tips:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Enter full addresses for the most accurate results</li>
            <li>• You can also click on the map to select locations</li>
            <li>• Distance shown is straight-line (as the crow flies)</li>
            <li>• Actual driving distance may be longer</li>
          </ul>
        </div>
      </div>
    </div>
  )
}