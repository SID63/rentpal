'use client'

import { useState, useEffect, useCallback } from 'react'
import { ItemWithDetails } from '@/types/database'
import { itemService } from '@/lib/database'
import ItemCard from './ItemCard'

interface SimilarItemsProps {
  currentItem: ItemWithDetails
  limit?: number
  className?: string
}

export default function SimilarItems({ 
  currentItem, 
  limit = 4, 
  className = "" 
}: SimilarItemsProps) {
  const [similarItems, setSimilarItems] = useState<ItemWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSimilarItems = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Get items from the same category
      const categoryItems = await itemService.getItems({
        category: currentItem.category_id,
        limit: limit * 2 // Get more to filter out current item
      })

      // Filter out the current item and limit results
      const filtered = categoryItems
        .filter(item => item.id !== currentItem.id)
        .slice(0, limit)

      // If we don't have enough items from the same category, 
      // get items from the same location
      if (filtered.length < limit) {
        const locationItems = await itemService.getItems({
          location: `${currentItem.location_city}, ${currentItem.location_state}`,
          limit: limit * 2
        })

        const additionalItems = locationItems
          .filter(item => 
            item.id !== currentItem.id && 
            !filtered.some(existing => existing.id === item.id)
          )
          .slice(0, limit - filtered.length)

        filtered.push(...additionalItems)
      }

      // If still not enough, get recent items
      if (filtered.length < limit) {
        const recentItems = await itemService.getItems({
          limit: limit * 2
        })

        const additionalItems = recentItems
          .filter(item => 
            item.id !== currentItem.id && 
            !filtered.some(existing => existing.id === item.id)
          )
          .slice(0, limit - filtered.length)

        filtered.push(...additionalItems)
      }

      setSimilarItems(filtered)
    } catch {
      setError('Failed to load similar items')
    } finally {
      setLoading(false)
    }
  }, [currentItem.id, currentItem.category_id, currentItem.location_city, currentItem.location_state, limit])

  useEffect(() => {
    fetchSimilarItems()
  }, [fetchSimilarItems])

  if (loading) {
    return (
      <div className={className}>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Items</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 aspect-[4/3] rounded-lg mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error || similarItems.length === 0) {
    return (
      <div className={className}>
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Similar Items</h2>
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p className="text-gray-600 mb-4">No similar items found at the moment.</p>
          <button
            onClick={() => window.location.href = '/search'}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Browse all items
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Similar Items</h2>
        <button
          onClick={() => window.location.href = `/search?category=${currentItem.category_id}`}
          className="text-blue-600 hover:text-blue-800 font-medium text-sm"
        >
          View all in {currentItem.category?.name}
        </button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {similarItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            showOwner={false}
          />
        ))}
      </div>
    </div>
  )
}