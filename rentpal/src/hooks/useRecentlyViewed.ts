import { useState, useEffect } from 'react'
import { ItemWithDetails } from '@/types/database'

const STORAGE_KEY = 'rentpal_recently_viewed'
const MAX_ITEMS = 10

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<ItemWithDetails[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const items = JSON.parse(stored)
          setRecentlyViewed(items)
        }
      } catch (error) {
        console.error('Failed to load recently viewed items:', error)
      }
    }
  }, [])

  // Add item to recently viewed
  const addToRecentlyViewed = (item: ItemWithDetails) => {
    setRecentlyViewed(prev => {
      // Remove item if it already exists
      const filtered = prev.filter(existing => existing.id !== item.id)
      
      // Add to beginning of array
      const updated = [item, ...filtered].slice(0, MAX_ITEMS)
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch (error) {
          console.error('Failed to save recently viewed items:', error)
        }
      }
      
      return updated
    })
  }

  // Remove item from recently viewed
  const removeFromRecentlyViewed = (itemId: string) => {
    setRecentlyViewed(prev => {
      const updated = prev.filter(item => item.id !== itemId)
      
      // Save to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch (error) {
          console.error('Failed to save recently viewed items:', error)
        }
      }
      
      return updated
    })
  }

  // Clear all recently viewed items
  const clearRecentlyViewed = () => {
    setRecentlyViewed([])
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY)
      } catch (error) {
        console.error('Failed to clear recently viewed items:', error)
      }
    }
  }

  return {
    recentlyViewed,
    addToRecentlyViewed,
    removeFromRecentlyViewed,
    clearRecentlyViewed
  }
}

// Hook for tracking item views
export function useItemView() {
  const { addToRecentlyViewed } = useRecentlyViewed()

  const trackItemView = (item: ItemWithDetails) => {
    // Add to recently viewed
    addToRecentlyViewed(item)
    
    // Could also send analytics event here
    if (typeof window !== 'undefined' && 'gtag' in window) {
      // @ts-expect-error - gtag is loaded externally
      window.gtag('event', 'view_item', {
        item_id: item.id,
        item_name: item.title,
        item_category: item.category?.name,
        value: item.daily_rate
      })
    }
  }

  return { trackItemView }
}