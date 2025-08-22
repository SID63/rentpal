'use client'

import { useState } from 'react'
import { ItemWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { favoriteService } from '@/lib/database'
import AvailabilityCalendar from './AvailabilityCalendar'
import SimilarItems from './SimilarItems'
import ReviewsList from '@/components/reviews/ReviewsList'
import Link from 'next/link'
import { OptimizedImage } from '@/components/OptimizedImage'

interface ItemDetailsProps {
  item: ItemWithDetails
  onFavoriteChange?: (isFavorited: boolean) => void
}

export default function ItemDetails({ item, onFavoriteChange }: ItemDetailsProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isFavorited, setIsFavorited] = useState(item.is_favorited || false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const [showAllImages, setShowAllImages] = useState(false)
  const { user } = useAuth()

  const images = item.images || []
  const primaryImage = images.find(img => img.is_primary) || images[0]
  const displayImages = images.length > 0 ? images : [{ image_url: '/placeholder-item.jpg', alt_text: item.title }]

  const handleFavoriteToggle = async () => {
    if (!user) {
      // Redirect to login
      window.location.href = '/auth/login'
      return
    }

    setIsTogglingFavorite(true)

    try {
      if (isFavorited) {
        const success = await favoriteService.removeFavorite(user.id, item.id)
        if (success) {
          setIsFavorited(false)
          onFavoriteChange?.(false)
        }
      } else {
        const success = await favoriteService.addFavorite(user.id, item.id)
        if (success) {
          setIsFavorited(true)
          onFavoriteChange?.(true)
        }
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    } finally {
      setIsTogglingFavorite(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price)
  }

  const formatDuration = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) {
      return `${days} day${days !== 1 ? 's' : ''}`
    }
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="lg:grid lg:grid-cols-2 lg:gap-8">
        {/* Image Gallery */}
        <div className="mb-8 lg:mb-0">
          {/* Main Image */}
          <div className="relative aspect-[4/3] mb-4 rounded-lg overflow-hidden bg-gray-100">
            <OptimizedImage
              src={displayImages[selectedImageIndex]?.image_url || '/placeholder-item.jpg'}
              alt={displayImages[selectedImageIndex]?.alt_text || item.title}
              fill
              className="w-full h-full object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={selectedImageIndex === 0}
            />
            
            {/* Image Navigation */}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev === 0 ? displayImages.length - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedImageIndex(prev => prev === displayImages.length - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            {/* Image Counter */}
            {displayImages.length > 1 && (
              <div className="absolute bottom-4 right-4 bg-black bg-opacity-60 text-white px-3 py-1 rounded text-sm">
                {selectedImageIndex + 1} / {displayImages.length}
              </div>
            )}
          </div>

          {/* Thumbnail Grid */}
          {displayImages.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {displayImages.slice(0, showAllImages ? displayImages.length : 4).map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <OptimizedImage
                    src={image.image_url}
                    alt={image.alt_text || `${item.title} ${index + 1}`}
                    fill
                    className="w-full h-full object-cover"
                    sizes="128px"
                  />
                </button>
              ))}
              
              {/* Show More Button */}
              {displayImages.length > 4 && !showAllImages && (
                <button
                  onClick={() => setShowAllImages(true)}
                  className="aspect-square rounded-lg border-2 border-gray-200 hover:border-gray-300 flex items-center justify-center bg-gray-50 text-gray-600 text-sm font-medium"
                >
                  +{displayImages.length - 4}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Item Information */}
        <div className="space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{item.title}</h1>
              {user && user.id !== item.owner_id && (
                <button
                  onClick={handleFavoriteToggle}
                  disabled={isTogglingFavorite}
                  className={`p-3 rounded-full transition-colors ${
                    isFavorited 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } ${isTogglingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="w-6 h-6" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{item.category?.name}</span>
              <span>•</span>
              <span>{item.location_city}, {item.location_state}</span>
              {item.total_reviews > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="font-medium">{item.rating.toFixed(1)}</span>
                    <span className="text-gray-500 ml-1">({item.total_reviews} reviews)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-baseline space-x-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatPrice(item.daily_rate)}
              </span>
              <span className="text-lg text-gray-600">/ day</span>
            </div>
            
            {item.hourly_rate && (
              <div className="flex items-baseline space-x-2 mb-4">
                <span className="text-xl font-semibold text-gray-700">
                  {formatPrice(item.hourly_rate)}
                </span>
                <span className="text-gray-600">/ hour</span>
              </div>
            )}

            {item.security_deposit > 0 && (
              <div className="text-sm text-gray-600 mb-4">
                Security deposit: {formatPrice(item.security_deposit)}
              </div>
            )}

            <div className="space-y-2 text-sm text-gray-600">
              <div>Minimum rental: {formatDuration(item.min_rental_duration)}</div>
              {item.max_rental_duration && (
                <div>Maximum rental: {formatDuration(item.max_rental_duration)}</div>
              )}
            </div>

            {/* Book Now Button */}
            {user && user.id !== item.owner_id ? (
              <Link
                href={`/items/${item.id}/book`}
                className="block w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
              >
                Book Now
              </Link>
            ) : user?.id === item.owner_id ? (
              <Link
                href={`/items/${item.id}/edit`}
                className="block w-full mt-6 bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 text-center"
              >
                Edit Listing
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className="block w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-center"
              >
                Sign In to Book
              </Link>
            )}
          </div>

          {/* Delivery Information */}
          {item.delivery_available && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="font-medium text-green-800">Delivery Available</span>
              </div>
              <div className="text-sm text-green-700">
                <div>Delivery fee: {formatPrice(item.delivery_fee)}</div>
                <div>Delivery radius: {item.delivery_radius} miles</div>
              </div>
            </div>
          )}

          {/* Owner Information */}
          {item.owner && (
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Hosted by {item.owner.full_name}</h3>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  {item.owner.avatar_url ? (
                    <OptimizedImage
                      src={item.owner.avatar_url}
                      alt={item.owner.full_name}
                      width={48}
                      height={48}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-medium text-gray-500">
                      {item.owner.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{item.owner.full_name}</div>
                  {item.owner.rating > 0 && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>{item.owner.rating.toFixed(1)} ({item.owner.total_reviews} reviews)</span>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Member since {new Date(item.owner.created_at).getFullYear()}
                  </div>
                </div>
              </div>
              {item.owner.bio && (
                <p className="mt-3 text-sm text-gray-600">{item.owner.bio}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Description</h2>
        <div className="prose max-w-none">
          <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
        </div>
      </div>

      {/* Pickup Instructions */}
      {item.pickup_instructions && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Pickup Instructions</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 whitespace-pre-wrap">{item.pickup_instructions}</p>
          </div>
        </div>
      )}

      {/* Availability Calendar */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Availability</h2>
        <AvailabilityCalendar itemId={item.id} readOnly={true} />
      </div>

      {/* Reviews Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Reviews {item.total_reviews > 0 && `(${item.total_reviews})`}
        </h2>
        <ReviewsList 
          itemId={item.id} 
          initialReviews={item.reviews || []}
        />
      </div>

      {/* Similar Items */}
      <SimilarItems currentItem={item} className="mt-12" />
    </div>
  )
}