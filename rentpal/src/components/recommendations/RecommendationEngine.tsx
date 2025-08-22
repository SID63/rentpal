'use client'

import { useState, useEffect } from 'react'
import { ItemWithDetails } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'
import { itemService, bookingService, favoriteService } from '@/lib/database'
import Link from 'next/link'

interface RecommendationEngineProps {
  currentItem?: ItemWithDetails
  userId?: string
  maxRecommendations?: number
  className?: string
}

interface RecommendationScore {
  item: ItemWithDetails
  score: number
  reasons: string[]
}

export default function RecommendationEngine({
  currentItem,
  userId,
  maxRecommendations = 6,
  className = ""
}: RecommendationEngineProps) {
  const { user } = useAuth()
  const [recommendations, setRecommendations] = useState<RecommendationScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const targetUserId = userId || user?.id

  useEffect(() => {
    if (targetUserId) {
      generateRecommendations()
    } else {
      generateGuestRecommendations()
    }
  }, [targetUserId, currentItem])

  const generateRecommendations = async () => {
    if (!targetUserId) return

    setLoading(true)
    setError(null)

    try {
      // Get user's interaction data
      const [userBookings, userFavorites, allItems] = await Promise.all([
        bookingService.getUserBookings(targetUserId, 'renter'),
        favoriteService.getUserFavorites(targetUserId),
        itemService.getItems({ limit: 100 })
      ])

      // Filter out current item and user's own items
      const candidateItems = allItems.filter(item => 
        item.id !== currentItem?.id && 
        item.owner_id !== targetUserId &&
        item.status === 'active'
      )

      // Calculate recommendation scores
      const scoredItems = candidateItems.map(item => 
        calculateRecommendationScore(item, {
          userBookings,
          userFavorites,
          currentItem
        })
      ).filter(scored => scored.score > 0)

      // Sort by score and take top recommendations
      const topRecommendations = scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecommendations)

      setRecommendations(topRecommendations)
    } catch (err) {
      setError('Failed to generate recommendations')
      console.error('Recommendation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateGuestRecommendations = async () => {
    setLoading(true)
    setError(null)

    try {
      // For guests, show popular and highly-rated items
      const allItems = await itemService.getItems({ limit: 50 })
      
      const candidateItems = allItems.filter(item => 
        item.id !== currentItem?.id && 
        item.status === 'active'
      )

      // Simple scoring for guests based on rating and popularity
      const scoredItems = candidateItems.map(item => ({
        item,
        score: (item.rating * 0.7) + (item.views_count * 0.0001) + (item.total_reviews * 0.3),
        reasons: getGuestRecommendationReasons(item)
      })).filter(scored => scored.score > 0)

      const topRecommendations = scoredItems
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecommendations)

      setRecommendations(topRecommendations)
    } catch (err) {
      setError('Failed to generate recommendations')
      console.error('Recommendation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateRecommendationScore = (
    item: ItemWithDetails,
    context: {
      userBookings: any[]
      userFavorites: ItemWithDetails[]
      currentItem?: ItemWithDetails
    }
  ): RecommendationScore => {
    let score = 0
    const reasons: string[] = []

    // Base score from item quality (weighted more heavily)
    score += item.rating * 3
    score += Math.min(item.total_reviews * 0.15, 3)

    // Popularity boost based on views and favorites
    score += Math.min(item.views_count * 0.001, 2)
    score += Math.min(item.favorites_count * 0.1, 2)

    // Category similarity with enhanced scoring
    if (context.currentItem && item.category_id === context.currentItem.category_id) {
      score += 6
      reasons.push(`Similar to ${context.currentItem.title}`)
    }

    // Enhanced user booking history analysis
    const userCategories = context.userBookings.map(booking => booking.item.category_id)
    const categoryFrequency = userCategories.reduce((acc, catId) => {
      acc[catId] = (acc[catId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    if (categoryFrequency[item.category_id]) {
      const frequency = categoryFrequency[item.category_id]
      score += frequency * 2.5 // Increased weight for frequently rented categories
      reasons.push(`You've rented ${item.category?.name} items ${frequency} time${frequency > 1 ? 's' : ''}`)
    }

    // Enhanced price similarity analysis
    if (context.userBookings.length > 0) {
      const userPrices = context.userBookings.map(booking => booking.daily_rate)
      const avgUserPrice = userPrices.reduce((sum, price) => sum + price, 0) / userPrices.length
      const priceStdDev = Math.sqrt(
        userPrices.reduce((sum, price) => sum + Math.pow(price - avgUserPrice, 2), 0) / userPrices.length
      )
      
      const priceDiff = Math.abs(item.daily_rate - avgUserPrice)
      const normalizedDiff = priceStdDev > 0 ? priceDiff / priceStdDev : priceDiff / avgUserPrice
      
      if (normalizedDiff < 1) { // Within 1 standard deviation or 100% of average
        score += 4 - normalizedDiff // Higher score for closer prices
        reasons.push('In your typical price range')
      }
    }

    // Enhanced favorites similarity
    const favoriteCategories = context.userFavorites.map(fav => fav.category_id)
    const favoriteCategoryCount = favoriteCategories.filter(catId => catId === item.category_id).length
    
    if (favoriteCategoryCount > 0) {
      score += favoriteCategoryCount * 3 // More weight for frequently favorited categories
      reasons.push('Similar to your favorites')
    }

    // Collaborative filtering - users who liked similar items
    const similarUserBonus = context.userFavorites.length > 0 ? 1 : 0
    score += similarUserBonus

    // Location proximity with enhanced scoring
    if (context.currentItem && 
        context.currentItem.location_latitude && 
        context.currentItem.location_longitude &&
        item.location_latitude && 
        item.location_longitude) {
      
      const distance = calculateDistance(
        { lat: context.currentItem.location_latitude, lng: context.currentItem.location_longitude },
        { lat: item.location_latitude, lng: item.location_longitude }
      )
      
      if (distance < 5) {
        score += 4
        reasons.push('Very close to current item')
      } else if (distance < 15) {
        score += 2
        reasons.push('Near current item')
      } else if (distance < 30) {
        score += 1
        reasons.push('In your area')
      }
    }

    // Enhanced delivery and convenience features
    if (item.delivery_available) {
      score += 2
      reasons.push('Delivery available')
    }

    if (item.hourly_rate) {
      score += 1
      reasons.push('Flexible hourly rental')
    }

    // Availability and responsiveness bonus
    if (item.status === 'active') {
      score += 1
    }

    // Recency bonus with decay
    const daysSinceCreated = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated < 7) {
      score += 2
      reasons.push('New listing')
    } else if (daysSinceCreated < 30) {
      score += 1
      reasons.push('Recently listed')
    }

    // Seasonal and trending boost (could be enhanced with actual trending data)
    const currentMonth = new Date().getMonth()
    const itemCreatedMonth = new Date(item.created_at).getMonth()
    if (Math.abs(currentMonth - itemCreatedMonth) <= 1) {
      score += 0.5
    }

    // Ensure minimum reasons with better defaults
    if (reasons.length === 0) {
      if (item.rating >= 4.5) reasons.push('Highly rated')
      else if (item.rating >= 4) reasons.push('Well rated')
      
      if (item.total_reviews >= 10) reasons.push('Popular choice')
      else if (item.total_reviews >= 5) reasons.push('Well reviewed')
      
      if (item.delivery_available) reasons.push('Delivery available')
      if (item.favorites_count > 5) reasons.push('Frequently favorited')
      
      if (reasons.length === 0) reasons.push('Recommended for you')
    }

    return { item, score, reasons }
  }

  const getGuestRecommendationReasons = (item: ItemWithDetails): string[] => {
    const reasons: string[] = []
    
    if (item.rating >= 4.5) reasons.push('Highly rated')
    if (item.total_reviews >= 10) reasons.push('Popular choice')
    if (item.delivery_available) reasons.push('Delivery available')
    
    const daysSinceCreated = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCreated < 7) reasons.push('New listing')
    
    if (reasons.length === 0) {
      reasons.push('Recommended for you')
    }
    
    return reasons
  }

  const calculateDistance = (
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number }
  ): number => {
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price)
  }

  if (loading) {
    return (
      <div className={className}>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recommended for You</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: maxRecommendations }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg shadow">
              <div className="h-48 bg-gray-200 rounded-t-lg"></div>
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-8 bg-red-50 rounded-lg">
          <p className="text-red-600 mb-2">{error}</p>
          <button
            onClick={() => targetUserId ? generateRecommendations() : generateGuestRecommendations()}
            className="text-red-600 hover:text-red-800 font-medium"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations available</h3>
          <p className="text-gray-600">
            Browse more items to get personalized recommendations.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          {targetUserId ? 'Recommended for You' : 'Popular Items'}
        </h2>
        <p className="text-gray-600">
          Items you might be interested in based on your activity
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.map(({ item, reasons }) => (
          <Link
            key={item.id}
            href={`/items/${item.id}`}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden group"
          >
            <div className="relative">
              {item.images && item.images.length > 0 ? (
                <img
                  src={item.images[0].image_url}
                  alt={item.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              
              {/* Recommendation badge */}
              <div className="absolute top-2 left-2">
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Recommended
                </span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {item.title}
              </h3>
              
              <p className="text-sm text-gray-600 mb-2">{item.category?.name}</p>
              
              {/* Recommendation reasons */}
              <div className="mb-3">
                {reasons.slice(0, 2).map((reason, index) => (
                  <span
                    key={index}
                    className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                  >
                    {reason}
                  </span>
                ))}
              </div>

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
                    <span className="text-sm text-gray-600">
                      {item.rating.toFixed(1)} ({item.total_reviews})
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View More Link */}
      <div className="text-center mt-8">
        <Link
          href="/search"
          className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
        >
          View More Items
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}