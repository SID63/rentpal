'use client'

import { useState } from 'react'
import Link from 'next/link'
import { OptimizedImage } from '@/components/OptimizedImage'
import { ItemWithDetails } from '@/types/database'
import { favoriteService } from '@/lib/database'
import { useAuth } from '@/contexts/AuthContext'

interface ItemCardProps {
  item: ItemWithDetails
  onFavoriteChange?: (itemId: string, isFavorited: boolean) => void
  showOwner?: boolean
  className?: string
}

export default function ItemCard({ 
  item, 
  onFavoriteChange, 
  showOwner = true,
  className = "" 
}: ItemCardProps) {
  const [isFavorited, setIsFavorited] = useState(item.is_favorited || false)
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false)
  const { user } = useAuth()

  const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0]
  const imageUrl = primaryImage?.image_url || '/placeholder-item.jpg'

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      // Redirect to login or show login modal
      return
    }

    setIsTogglingFavorite(true)

    try {
      if (isFavorited) {
        const success = await favoriteService.removeFavorite(user.id, item.id)
        if (success) {
          setIsFavorited(false)
          onFavoriteChange?.(item.id, false)
        }
      } else {
        const success = await favoriteService.addFavorite(user.id, item.id)
        if (success) {
          setIsFavorited(true)
          onFavoriteChange?.(item.id, true)
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

  // const formatDistance = (distance?: number) => {
  //   if (!distance) return null
  //   return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}mi`
  // }

  return (
    <Link href={`/items/${item.id}`} className={`block ${className}`}>
      <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden group" itemScope itemType="https://schema.org/Product">
        {/* Image Container */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <OptimizedImage
            src={imageUrl}
            alt={item.title}
            fill
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={false}
          />
          
          {/* Favorite Button */}
          {user && user.id !== item.owner_id && (
            <button
              onClick={handleFavoriteToggle}
              disabled={isTogglingFavorite}
              className={`absolute top-3 right-3 p-2 rounded-full transition-colors ${
                isFavorited 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              } ${isTogglingFavorite ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <svg className="w-5 h-5" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          )}

          {/* Status Badge */}
          {item.status !== 'active' && (
            <div className="absolute top-3 left-3 bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium">
              {item.status === 'inactive' ? 'Unavailable' : 'Suspended'}
            </div>
          )}

          {/* Image Count */}
          {item.images && item.images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {item.images.length}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Title and Category */}
          <div className="mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1" itemProp="name">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500">
              {item.category?.name}
            </p>
          </div>

          {/* Location */}
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">
              {item.location_city}, {item.location_state}
            </span>
            {/* Distance would be calculated based on user location */}
          </div>

          {/* Rating */}
          {item.total_reviews > 0 && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="font-medium">{item.rating.toFixed(1)}</span>
                <span className="text-gray-500 ml-1">({item.total_reviews})</span>
              </div>
            </div>
          )}

          {/* Owner Info */}
          {showOwner && item.owner && (
            <div className="flex items-center text-sm text-gray-600 mb-3">
              <div className="w-6 h-6 bg-gray-200 rounded-full mr-2 flex items-center justify-center">
                {item.owner.avatar_url ? (
                  <OptimizedImage
                    src={item.owner.avatar_url}
                    alt={item.owner.full_name}
                    width={24}
                    height={24}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-medium text-gray-500">
                    {item.owner.full_name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="truncate">{item.owner.full_name}</span>
              {item.owner.rating > 0 && (
                <span className="ml-2 text-yellow-500">
                  ★ {item.owner.rating.toFixed(1)}
                </span>
              )}
            </div>
          )}

          {/* Pricing */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-bold text-gray-900" itemProp="offers" itemScope itemType="https://schema.org/Offer">
                {formatPrice(item.daily_rate)}
                <meta itemProp="priceCurrency" content="USD" />
                <meta itemProp="price" content={String(item.daily_rate)} />
              </span>
              <span className="text-sm text-gray-500 ml-1">/ day</span>
              {item.hourly_rate && (
                <div className="text-sm text-gray-600">
                  {formatPrice(item.hourly_rate)} / hour
                </div>
              )}
            </div>

            {/* Delivery Badge */}
            {item.delivery_available && (
              <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Delivery
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t">
            <span>Min: {item.min_rental_duration}h</span>
            <span>{item.views_count} views</span>
            <span>{item.favorites_count} saves</span>
          </div>
        </div>
      </div>
    </Link>
  )
}